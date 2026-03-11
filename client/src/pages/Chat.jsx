import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import Peer from 'peerjs'
import {
  Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff, Flag, Search, MessageCircle,
  UserPlus, UserCheck, Users, MapPin,
} from 'lucide-react'
import VideoBox from '../components/VideoBox'
import TextChat from '../components/TextChat'
import ReportModal from '../components/ReportModal'
import toast from 'react-hot-toast'
import { ICE_SERVERS } from '../lib/constants'

const VIBES = [
  { key: 'fun',     emoji: '😂', label: 'Just Fun' },
  { key: 'deep',    emoji: '🗣️', label: 'Deep Talk' },
  { key: 'music',   emoji: '🎵', label: 'Music' },
  { key: 'study',   emoji: '📚', label: 'Study' },
  { key: 'cricket', emoji: '🏏', label: 'Cricket' },
]

export default function Chat() {
  const { user, getToken, dbProfile } = useAuth()

  // Connection states
  const [status, setStatus] = useState('idle') // idle | searching | connected
  // Use the profile already fetched by AuthContext; fall back to local state for mid-session updates
  const [profile, setProfile] = useState(null)
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [partnerUid, setPartnerUid] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [onlineCount, setOnlineCount] = useState(0)

  // Media states
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPanelOpen, setChatPanelOpen] = useState(true)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [messages, setMessages] = useState([])
  const [reportOpen, setReportOpen] = useState(false)
  const [remoteHasStream, setRemoteHasStream] = useState(false)

  // Follow states
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // Vibe + matchmaking preferences
  const [vibe, setVibe] = useState(null)
  const [sameDistrictMode, setSameDistrictMode] = useState(false)

  // Mask — blur partner's face until user taps Reveal
  const [partnerBlurred, setPartnerBlurred] = useState(true)
  const blurTimerRef = useRef(null)

  // Auto-reveal partner's face after 4 seconds
  useEffect(() => {
    if (partnerBlurred) {
      blurTimerRef.current = setTimeout(() => setPartnerBlurred(false), 4000)
    }
    return () => clearTimeout(blurTimerRef.current)
  }, [partnerBlurred])

  // Refs
  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)  // holds remote stream until DOM element mounts
  const currentCallRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerIdRef = useRef(null)

  // Callback ref — assigns srcObject the moment the video element mounts (connected state)
  const setLocalVideoRef = useCallback(el => {
    localVideoRef.current = el
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current
      safePlay(el, true)  // local video stays muted
    }
  }, [])

  // Sync profile from AuthContext (already fetched on login — avoids a duplicate API call)
  useEffect(() => {
    if (dbProfile) setProfile(dbProfile)
  }, [dbProfile])

  // Initialize socket
  useEffect(() => {
    const socket = io(import.meta.env.VITE_BACKEND_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('matched', (data) => {
      setStatus('connected')
      setPartnerInfo(data.partner)
      setPartnerUid(data.partnerUid)
      setRoomId(data.roomId)
      setMessages([])
      setPartnerBlurred(true)

      if (data.matchType === 'smart') {
        toast.success('Matched by shared interests!')
      } else if (data.matchType === 'relaxed') {
        toast.success('Language match found!')
      } else {
        toast('Connected with a random person!', { icon: '🎲' })
      }

      // Call the peer
      if (localStreamRef.current && peerRef.current) {
        const call = peerRef.current.call(data.peerId, localStreamRef.current)
        currentCallRef.current = call
        if (call) {
          call.on('stream', (remoteStream) => {
            // Store in ref so the useEffect can attach it once the DOM node is ready
            remoteStreamRef.current = remoteStream
            setRemoteHasStream(true)
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream
              safePlay(remoteVideoRef.current)
            }
          })
        }
      }
    })

    socket.on('receive-message', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          message: data.message,
          senderName: data.senderName,
          isOwn: data.senderId === socket.id,
          timestamp: data.timestamp,
        },
      ])
    })

    socket.on('partner-skipped', () => {
      toast('Your partner skipped', { icon: '⏭️' })
      resetToIdle()
    })

    socket.on('partner-disconnected', () => {
      toast('Partner disconnected', { icon: '👋' })
      resetToIdle()
    })

    socket.on('call-ended', () => {
      toast('Call ended', { icon: '📞' })
      resetToIdle()
    })

    socket.on('partner-typing', (data) => {
      setPartnerTyping(data.isTyping)
    })

    socket.on('online-count', (count) => {
      setOnlineCount(count)
    })

    socket.on('server-full', () => {
      toast.error('Server is at capacity. Please try again in a few minutes.')
    })

    socket.on('banned', () => {
      toast.error('Your account has been banned. Contact support if you believe this is a mistake.')
      stopMediaTracks()
      setStatus('idle')
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Initialize PeerJS
  useEffect(() => {
    const peer = new Peer(undefined, {
      host: import.meta.env.VITE_PEERJS_HOST || '0.peerjs.com',
      port: Number(import.meta.env.VITE_PEERJS_PORT) || 443,
      path: import.meta.env.VITE_PEERJS_PATH || '/',
      secure: true,
      config: { iceServers: ICE_SERVERS },
    })

    peer.on('open', (id) => {
      peerIdRef.current = id
    })

    // Answer incoming calls
    peer.on('call', (call) => {
      if (localStreamRef.current) {
        call.answer(localStreamRef.current)
        currentCallRef.current = call
        call.on('stream', (remoteStream) => {
          remoteStreamRef.current = remoteStream
          setRemoteHasStream(true)
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream
            safePlay(remoteVideoRef.current)
          }
        })
      }
    })

    peerRef.current = peer

    return () => {
      peer.destroy()
    }
  }, [])

  // Re-attach streams when connected state renders — refs are null before this state
  useEffect(() => {
    if (status === 'connected') {
      if (localVideoRef.current && localStreamRef.current && !localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject = localStreamRef.current
        safePlay(localVideoRef.current, true)
      }
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
        safePlay(remoteVideoRef.current, false)
      }
    }
  }, [status])

  // Cleanup media on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks()
    }
  }, [])

  // muted=true before play() is required for Chrome autoplay policy (checks JS property at call time).
  // keepMuted=true for local (always silent), false for remote (restore audio after play starts).
  const safePlay = (videoEl, keepMuted = false) => {
    if (!videoEl) return
    videoEl.muted = true
    const p = videoEl.play()
    if (p !== undefined) {
      p.then(() => { if (!keepMuted) videoEl.muted = false }).catch(() => {})
    }
  }

  const stopMediaTracks = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
  }

  // Waits up to 5 s for PeerJS to get an ID, then resolves (null on timeout)
  const waitForPeerId = () => new Promise((resolve) => {
    if (peerIdRef.current) { resolve(peerIdRef.current); return }
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += 100
      if (peerIdRef.current) { clearInterval(timer); resolve(peerIdRef.current) }
      else if (elapsed >= 5000) { clearInterval(timer); resolve(null) }
    }, 100)
  })

  const resetToIdle = useCallback(() => {
    setStatus('idle')
    setPartnerInfo(null)
    setPartnerUid(null)
    setRoomId(null)
    setMessages([])
    setRemoteHasStream(false)
    setIsFollowing(false)
    setFollowLoading(false)
    setPartnerBlurred(true)
    remoteStreamRef.current = null
    currentCallRef.current?.close()
    currentCallRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }, [])

  const startSearching = async () => {
    // Stop any leftover tracks from a previous session before requesting new ones
    stopMediaTracks()

    let stream = null
    try {
      // First try with ideal front-camera constraints (important for mobile)
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      })
    } catch (err1) {
      // OverconstrainedError or NotReadableError on desktop — fall back to plain request
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (err2) {
        const msg = err2?.name === 'NotAllowedError'
          ? 'Camera/mic permission was denied. Please allow access in your browser settings.'
          : err2?.name === 'NotFoundError'
          ? 'No camera or microphone found on this device.'
          : err2?.name === 'NotReadableError'
          ? 'Camera is already in use by another app. Close it and try again.'
          : `Could not access camera/mic (${err2?.name || 'unknown error'})`
        toast.error(msg)
        return
      }
    }

    localStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      safePlay(localVideoRef.current)
    }

    setStatus('searching')

    const peerId = await waitForPeerId()
    if (!peerId) {
      toast.error('Connection not ready yet — please try again')
      stopMediaTracks()
      setStatus('idle')
      return
    }

    if (socketRef.current) {
      socketRef.current.emit('join-queue', {
        peerId,
        uid: user.uid,
        language: profile?.language || 'Both',
        interests: profile?.interests || [],
        vibe,
        district: profile?.district || null,
        sameDistrict: sameDistrictMode,
      })
    }
  }

  const cancelSearch = () => {
    socketRef.current?.emit('leave-queue')
    stopMediaTracks()
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    setStatus('idle')
  }

  const skipPartner = () => {
    socketRef.current?.emit('skip-partner')
    currentCallRef.current?.close()
    currentCallRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setPartnerInfo(null)
    setPartnerUid(null)
    setRoomId(null)
    setMessages([])
    setRemoteHasStream(false)
    setIsFollowing(false)
    setStatus('searching')

    // Re-join queue
    if (socketRef.current && peerIdRef.current) {
      socketRef.current.emit('join-queue', {
        peerId: peerIdRef.current,
        uid: user.uid,
        language: profile?.language || 'Both',
        interests: profile?.interests || [],
        vibe,
        district: profile?.district || null,
        sameDistrict: sameDistrictMode,
      })
    }
  }

  const endCall = () => {
    socketRef.current?.emit('end-call')
    resetToIdle()
    stopMediaTracks()
    if (localVideoRef.current) localVideoRef.current.srcObject = null
  }

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setMicOn(audioTrack.enabled)
    }
  }

  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setCamOn(videoTrack.enabled)
    }
  }

  const sendMessage = (message) => {
    if (!roomId || !socketRef.current) return
    socketRef.current.emit('send-message', {
      roomId,
      message,
      senderName: profile?.displayName || 'You',
    })
  }

  const handleTyping = (isTyping) => {
    if (!roomId || !socketRef.current) return
    socketRef.current.emit('typing', { roomId, isTyping })
  }

  const handleReported = () => {
    skipPartner()
  }

  const followPartner = async () => {
    if (!partnerUid || followLoading || isFollowing) return
    setFollowLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/follow/${partnerUid}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        setIsFollowing(true)
        toast.success(`Now following ${partnerInfo?.displayName || 'this person'}!`)
      } else {
        toast.error('Could not follow. Try again.')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-16">
      <AnimatePresence mode="wait">
        {/* IDLE STATE */}
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4"
          >
            {/* Pulsing icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[rgba(14,165,233,0.1)] to-[rgba(6,182,212,0.05)] flex items-center justify-center border border-[rgba(14,165,233,0.2)]">
                <Video size={36} className="text-[#0EA5E9]" />
              </div>
              <div className="absolute inset-0 rounded-full border border-[rgba(14,165,233,0.15)] animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute -inset-3 rounded-full border border-[rgba(6,182,212,0.08)] animate-ping" style={{ animationDuration: '4s' }} />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Chat?</h2>

            {/* Online count pill */}
            <div className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-300 font-medium flex items-center gap-1.5">
                <Users size={13} />
                {onlineCount > 0 ? `${onlineCount} online now` : 'Connecting...'}
              </span>
              <span className="text-xs text-green-600">· free tier · max 50</span>
            </div>

            {profile && (
              <div className="flex items-center gap-3 mb-6 flex-wrap justify-center">
                <span className="text-sm text-slate-400">{profile.displayName}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[rgba(14,165,233,0.1)] text-[#38BDF8] border border-[rgba(14,165,233,0.2)]">
                  {profile.language}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[rgba(6,182,212,0.1)] text-[#22D3EE] border border-[rgba(6,182,212,0.2)]">
                  {profile.district}
                </span>
              </div>
            )}

            {/* Vibe picker */}
            <div className="mb-4 w-full max-w-sm px-4">
              <p className="text-xs text-slate-500 text-center mb-2">Your vibe right now <span className="opacity-50">(optional)</span></p>
              <div className="flex gap-2 justify-center flex-wrap">
                {VIBES.map(v => (
                  <button
                    key={v.key}
                    onClick={() => setVibe(vibe === v.key ? null : v.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1 ${
                      vibe === v.key
                        ? 'bg-[rgba(14,165,233,0.2)] border-[rgba(14,165,233,0.5)] text-[#38BDF8]'
                        : 'border-[rgba(14,165,233,0.1)] text-slate-500 hover:border-[rgba(14,165,233,0.3)] hover:text-slate-300'
                    }`}
                  >
                    <span>{v.emoji}</span><span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Same district toggle */}
            {profile?.district && (
              <button
                onClick={() => setSameDistrictMode(!sameDistrictMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all mb-5 ${
                  sameDistrictMode
                    ? 'bg-[rgba(14,165,233,0.12)] border-[rgba(14,165,233,0.4)] text-[#38BDF8]'
                    : 'border-[rgba(14,165,233,0.1)] text-slate-500 hover:border-[rgba(14,165,233,0.3)] hover:text-slate-300'
                }`}
              >
                <MapPin size={14} />
                {sameDistrictMode ? `${profile.district} only` : 'Any district'}
              </button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startSearching}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold text-lg hover:shadow-xl hover:shadow-[rgba(14,165,233,0.25)] transition-shadow"
            >
              Find Someone
            </motion.button>
          </motion.div>
        )}

        {/* SEARCHING STATE */}
        {status === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4"
          >
            {/* Spinning rings */}
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(14,165,233,0.3)] animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-3 rounded-full border-2 border-[rgba(6,182,212,0.2)] animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
              <div className="absolute inset-6 rounded-full border-2 border-[rgba(14,165,233,0.15)] animate-spin" style={{ animationDuration: '5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search size={28} className="text-[#0EA5E9]" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">Finding your match...</h2>
            <p className="text-sm text-slate-400 mb-8">Looking for someone who vibes with you</p>

            {/* Skeleton cards */}
            <div className="flex gap-3 mb-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-20 h-24 rounded-xl bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.1)] animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>

            <button
              onClick={cancelSearch}
              className="px-6 py-2.5 rounded-xl border border-[rgba(14,165,233,0.2)] text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* CONNECTED STATE */}
        {status === 'connected' && (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-[calc(100vh-4rem)]"
          >
            {/* Video area */}
            <div className="flex-1 flex flex-col relative min-h-0">

              {/* Remote video — flex-[3] on mobile, full-area on desktop */}
              <div className="flex-[3] min-h-0 relative overflow-hidden md:absolute md:inset-0">
                {/* Badges */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[rgba(3,15,30,0.8)] backdrop-blur-sm rounded-full px-3 py-1.5 border border-[rgba(34,197,94,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-medium text-green-300">Connected</span>
                  </div>
                  <button
                    onClick={followPartner}
                    disabled={followLoading || isFollowing}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm border transition-all ${
                      isFollowing
                        ? 'bg-[rgba(14,165,233,0.25)] border-[rgba(14,165,233,0.5)] text-[#38BDF8]'
                        : 'bg-[rgba(3,15,30,0.8)] border-[rgba(14,165,233,0.3)] text-slate-300 hover:text-[#38BDF8] hover:border-[rgba(14,165,233,0.5)]'
                    } disabled:opacity-60`}
                  >
                    {isFollowing ? <><UserCheck size={12} /> Following</> : followLoading ? 'Following...' : <><UserPlus size={12} /> Follow</>}
                  </button>
                </div>

                {/* Blur wrapper */}
                <div
                  className="w-full h-full"
                  style={{ filter: partnerBlurred ? 'blur(18px) saturate(0.4)' : 'none', transition: 'filter 0.4s ease' }}
                >
                  <VideoBox
                    ref={remoteVideoRef}
                    label={partnerInfo?.displayName}
                    language={partnerInfo?.language}
                    interests={partnerInfo?.interests}
                    muted={false}
                    hasStream={remoteHasStream}
                  />
                </div>

                {/* Reveal overlay */}
                {partnerBlurred && (
                  <div className="absolute inset-0 z-[15] flex items-center justify-center">
                    <div className="bg-[rgba(3,15,30,0.88)] backdrop-blur-sm rounded-2xl p-5 text-center border border-[rgba(14,165,233,0.2)]">
                      <div className="text-4xl mb-2">👻</div>
                      <p className="text-white text-sm font-semibold mb-1">Face masked</p>
                      <p className="text-slate-400 text-xs mb-3">Auto-revealing in a moment…</p>
                      <button
                        onClick={() => { clearTimeout(blurTimerRef.current); setPartnerBlurred(false) }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white text-xs font-semibold hover:shadow-lg hover:shadow-[rgba(14,165,233,0.3)] transition-all"
                      >
                        ✨ Reveal Face
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls — full-width dock on mobile (between videos), floating pill on desktop */}
              <div className="shrink-0 flex items-center justify-evenly px-4 py-3 bg-[#020B18] border-t border-b border-[rgba(14,165,233,0.1)] md:absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:z-[25] md:flex md:items-center md:justify-center md:gap-2 md:px-4 md:py-2.5 md:bg-[rgba(3,15,30,0.88)] md:backdrop-blur-xl md:border md:border-[rgba(14,165,233,0.15)] md:rounded-2xl md:w-auto">
                <button
                  onClick={toggleMic}
                  className={`w-12 h-12 md:w-10 md:h-10 rounded-2xl md:rounded-xl flex items-center justify-center transition-all ${
                    micOn
                      ? 'bg-[rgba(14,165,233,0.15)] text-[#0EA5E9] border border-[rgba(14,165,233,0.3)]'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>

                <button
                  onClick={toggleCam}
                  className={`w-12 h-12 md:w-10 md:h-10 rounded-2xl md:rounded-xl flex items-center justify-center transition-all ${
                    camOn
                      ? 'bg-[rgba(14,165,233,0.15)] text-[#0EA5E9] border border-[rgba(14,165,233,0.3)]'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {camOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>

                <button
                  onClick={skipPartner}
                  className="w-12 h-12 md:w-10 md:h-10 rounded-2xl md:rounded-xl bg-[rgba(14,165,233,0.15)] text-[#0EA5E9] border border-[rgba(14,165,233,0.3)] flex items-center justify-center hover:bg-[rgba(14,165,233,0.25)] transition-all"
                >
                  <SkipForward size={20} />
                </button>

                <button
                  onClick={() => setReportOpen(true)}
                  className="w-12 h-12 md:w-10 md:h-10 rounded-2xl md:rounded-xl bg-[rgba(14,165,233,0.15)] text-amber-400 border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/15 transition-all"
                >
                  <Flag size={20} />
                </button>

                <div className="w-px h-7 bg-[rgba(14,165,233,0.15)]" />

                <button
                  onClick={endCall}
                  className="w-12 h-12 md:w-10 md:h-10 rounded-2xl md:rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-red-500/25 transition-all"
                >
                  <PhoneOff size={20} />
                </button>
              </div>

              {/* Local video — flex-[2] on mobile, PIP above controls on desktop */}
              <div className="flex-[2] min-h-0 relative overflow-hidden border-t border-[rgba(14,165,233,0.15)] md:border-0 md:absolute md:bottom-20 md:right-4 md:w-52 md:h-[7.5rem] md:z-30 md:rounded-xl md:border-2 md:border-[rgba(14,165,233,0.4)] md:shadow-lg md:shadow-black/40">
                <video
                  ref={setLocalVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                  <span className="text-xs font-medium text-white/90">You</span>
                </div>
              </div>
            </div>

            {/* Desktop text chat */}
            <div className="hidden md:flex">
              {chatPanelOpen ? (
                <TextChat
                  messages={messages}
                  onSendMessage={sendMessage}
                  onTyping={handleTyping}
                  partnerTyping={partnerTyping}
                  partnerName={partnerInfo?.displayName}
                  isOpen={true}
                  onToggle={() => setChatPanelOpen(false)}
                />
              ) : (
                <button
                  onClick={() => setChatPanelOpen(true)}
                  className="w-12 h-full flex flex-col items-center justify-center gap-2 bg-[rgba(3,15,30,0.8)] border-l border-[rgba(14,165,233,0.15)] text-slate-400 hover:text-[#0EA5E9] transition-colors"
                >
                  <MessageCircle size={20} />
                  {messages.filter((m) => !m.isOwn).length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {messages.filter((m) => !m.isOwn).length > 9 ? '9+' : messages.filter((m) => !m.isOwn).length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Mobile text chat */}
            <div className="md:hidden">
              <TextChat
                messages={messages}
                onSendMessage={sendMessage}
                onTyping={handleTyping}
                partnerTyping={partnerTyping}
                partnerName={partnerInfo?.displayName}
                isOpen={chatOpen}
                onToggle={() => setChatOpen(!chatOpen)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report modal */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUid={partnerUid}
        onReported={handleReported}
      />
    </div>
  )
}
