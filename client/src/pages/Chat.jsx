import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import Peer from 'peerjs'
import {
  Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff, Flag, Search,
} from 'lucide-react'
import VideoBox from '../components/VideoBox'
import TextChat from '../components/TextChat'
import ReportModal from '../components/ReportModal'
import toast from 'react-hot-toast'

export default function Chat() {
  const { user, getToken } = useAuth()

  // Connection states
  const [status, setStatus] = useState('idle') // idle | searching | connected
  const [profile, setProfile] = useState(null)
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [partnerUid, setPartnerUid] = useState(null)
  const [roomId, setRoomId] = useState(null)

  // Media states
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [reportOpen, setReportOpen] = useState(false)

  // Refs
  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)
  const currentCallRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerIdRef = useRef(null)

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken()
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setProfile(data.user)
        }
      } catch {
        // Profile fetch failed silently
      }
    }
    fetchProfile()
  }, [getToken])

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
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ],
      },
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

  // Cleanup media on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks()
    }
  }, [])

  const safePlay = (videoEl) => {
    if (!videoEl) return
    const p = videoEl.play()
    if (p !== undefined) {
      p.catch(() => {})
    }
  }

  const stopMediaTracks = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
  }

  const resetToIdle = useCallback(() => {
    setStatus('idle')
    setPartnerInfo(null)
    setPartnerUid(null)
    setRoomId(null)
    setMessages([])
    currentCallRef.current?.close()
    currentCallRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }, [])

  const startSearching = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        safePlay(localVideoRef.current)
      }

      setStatus('searching')

      if (socketRef.current && peerIdRef.current) {
        socketRef.current.emit('join-queue', {
          peerId: peerIdRef.current,
          uid: user.uid,
          language: profile?.language || 'Both',
          interests: profile?.interests || [],
        })
      }
    } catch {
      toast.error('Camera/mic permission is required')
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
    setStatus('searching')

    // Re-join queue
    if (socketRef.current && peerIdRef.current) {
      socketRef.current.emit('join-queue', {
        peerId: peerIdRef.current,
        uid: user.uid,
        language: profile?.language || 'Both',
        interests: profile?.interests || [],
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

  const handleReported = () => {
    skipPartner()
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
            <div className="flex-1 relative">
              {/* Connected badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-[rgba(3,15,30,0.8)] backdrop-blur-sm rounded-full px-3 py-1.5 border border-[rgba(34,197,94,0.3)]">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium text-green-300">Connected</span>
              </div>

              {/* Remote video */}
              <VideoBox
                ref={remoteVideoRef}
                label={partnerInfo?.displayName}
                language={partnerInfo?.language}
                interests={partnerInfo?.interests}
                muted={false}
              />

              {/* Local PIP */}
              <VideoBox
                ref={localVideoRef}
                isLocal
                muted
              />

              {/* Controls bar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[rgba(3,15,30,0.85)] backdrop-blur-xl border border-[rgba(14,165,233,0.15)] rounded-2xl px-4 py-3">
                <button
                  onClick={toggleMic}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    micOn
                      ? 'bg-[rgba(14,165,233,0.15)] text-[#0EA5E9] border border-[rgba(14,165,233,0.3)]'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                </button>

                <button
                  onClick={toggleCam}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    camOn
                      ? 'bg-[rgba(14,165,233,0.15)] text-[#0EA5E9] border border-[rgba(14,165,233,0.3)]'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {camOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>

                <button
                  onClick={skipPartner}
                  className="w-11 h-11 rounded-xl bg-[rgba(14,165,233,0.15)] text-[#0EA5E9] border border-[rgba(14,165,233,0.3)] flex items-center justify-center hover:bg-[rgba(14,165,233,0.25)] transition-all"
                >
                  <SkipForward size={18} />
                </button>

                <button
                  onClick={() => setReportOpen(true)}
                  className="w-11 h-11 rounded-xl bg-[rgba(14,165,233,0.15)] text-amber-400 border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/15 transition-all"
                >
                  <Flag size={18} />
                </button>

                <div className="w-px h-7 bg-[rgba(14,165,233,0.15)] mx-1" />

                <button
                  onClick={endCall}
                  className="w-11 h-11 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-red-500/25 transition-all"
                >
                  <PhoneOff size={18} />
                </button>
              </div>
            </div>

            {/* Desktop text chat */}
            <div className="hidden md:block">
              <TextChat
                messages={messages}
                onSendMessage={sendMessage}
                isOpen={true}
              />
            </div>

            {/* Mobile text chat */}
            <div className="md:hidden">
              <TextChat
                messages={messages}
                onSendMessage={sendMessage}
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
