import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { io } from 'socket.io-client'
import Peer from 'peerjs'
import { MessageCircle, Users, Video, VideoOff, Mic, MicOff, LogOut, Send } from 'lucide-react'
import toast from 'react-hot-toast'

const PUBLIC_ROOMS = [
  { key: 'csk-fans',   name: 'CSK Fan Room',        emoji: '🏏', desc: 'Talk cricket, IPL and CSK!' },
  { key: 'kollywood',  name: 'Kollywood Discussion', emoji: '🎬', desc: 'Movies, gossip and new releases' },
  { key: 'food-tn',    name: 'Food Lovers TN',       emoji: '🍛', desc: 'Recipes, restaurants & food' },
  { key: 'tech-tamil', name: 'Tech Tamil',            emoji: '💻', desc: 'Coding, startups & gadgets' },
  { key: 'music-jam',  name: 'Music Jam',             emoji: '🎵', desc: 'Tamil music, artists & more' },
]

export default function Rooms() {
  const { user, getToken } = useAuth()
  const [profile, setProfile] = useState(null)
  const [roomCounts, setRoomCounts] = useState({})
  const [activeRoom, setActiveRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [remoteStreams, setRemoteStreams] = useState({})
  const [joining, setJoining] = useState(null) // roomKey being joined, or null

  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const peerIdRef = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const messagesEndRef = useRef(null)
  const remoteCallsRef = useRef({})

  // ── Profile fetch ────────────────────────────────────────────────────────
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
      } catch {}
    }
    fetchProfile()
  }, [getToken])

  // ── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(import.meta.env.VITE_BACKEND_URL, {
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('get-room-counts')
    })

    socket.on('room-counts', counts => {
      setRoomCounts(counts)
    })

    socket.on('room-state', ({ participants: ps }) => {
      setParticipants(ps)
      ps.forEach(p => {
        if (p.peerId && p.peerId !== peerIdRef.current && localStreamRef.current && peerRef.current) {
          const call = peerRef.current.call(p.peerId, localStreamRef.current)
          if (!call) return
          remoteCallsRef.current[p.peerId] = call
          call.on('stream', stream => {
            setRemoteStreams(prev => ({ ...prev, [p.peerId]: stream }))
          })
          call.on('close', () => {
            setRemoteStreams(prev => { const n = { ...prev }; delete n[p.peerId]; return n })
          })
        }
      })
    })

    socket.on('room-peer-joined', ({ participant }) => {
      setParticipants(prev => {
        if (prev.find(p => p.socketId === participant.socketId)) return prev
        return [...prev, participant]
      })
      toast(`${participant.displayName} joined!`, { icon: '👋', duration: 2000 })
    })

    socket.on('room-peer-left', ({ peerId, displayName }) => {
      setParticipants(prev => prev.filter(p => p.peerId !== peerId))
      if (remoteCallsRef.current[peerId]) {
        remoteCallsRef.current[peerId].close()
        delete remoteCallsRef.current[peerId]
      }
      setRemoteStreams(prev => { const n = { ...prev }; delete n[peerId]; return n })
      toast(`${displayName} left`, { icon: '🚶', duration: 2000 })
    })

    socket.on('room-message', msg => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('room-full', () => {
      toast.error('This room is full (max 6 people)')
      setJoining(false)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // ── PeerJS ───────────────────────────────────────────────────────────────
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
        ],
      },
    })

    peer.on('open', id => {
      peerIdRef.current = id
    })

    // Answer incoming calls from other room members
    peer.on('call', call => {
      if (localStreamRef.current) {
        call.answer(localStreamRef.current)
        call.on('stream', stream => {
          setRemoteStreams(prev => ({ ...prev, [call.peer]: stream }))
        })
        call.on('close', () => {
          setRemoteStreams(prev => { const n = { ...prev }; delete n[call.peer]; return n })
        })
        remoteCallsRef.current[call.peer] = call
      }
    })

    peerRef.current = peer
    return () => peer.destroy()
  }, [])

  // ── Scroll messages ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Local video when room active ─────────────────────────────────────────
  useEffect(() => {
    if (activeRoom && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
      localVideoRef.current.play().catch(() => {})
    }
  }, [activeRoom])

  // ── Cleanup media on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => stopMedia()
  }, [])

  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    Object.values(remoteCallsRef.current).forEach(c => c.close())
    remoteCallsRef.current = {}
  }

  const joinRoom = async room => {
    if (joining) return
    setJoining(room.key)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      })
      localStreamRef.current = stream
      setActiveRoom(room)
      setMessages([])
      setRemoteStreams({})
      socketRef.current?.emit('join-public-room', {
        roomKey: room.key,
        peerId: peerIdRef.current,
        uid: user.uid,
        displayName: profile?.displayName || 'Anonymous',
      })
    } catch {
      toast.error('Camera & mic permission is required to join a room')
    } finally {
      setJoining(null)
    }
  }

  const leaveRoom = () => {
    socketRef.current?.emit('leave-public-room')
    stopMedia()
    setActiveRoom(null)
    setParticipants([])
    setMessages([])
    setRemoteStreams({})
    setMicOn(true)
    setCamOn(true)
  }

  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return
    socketRef.current?.emit('room-message', {
      roomKey: activeRoom.key,
      message: input.trim(),
      senderName: profile?.displayName || 'You',
    })
    setInput('')
  }

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled) }
  }

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled) }
  }

  // ── Room List ─────────────────────────────────────────────────────────────
  if (!activeRoom) {
    return (
      <div className="min-h-screen pt-20 pb-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Public Rooms</h1>
            <p className="text-slate-400 text-sm">Join a topic room — video + chat with up to 6 people</p>
          </div>

          <div className="space-y-3">
            {PUBLIC_ROOMS.map(room => {
              const count = roomCounts[room.key] || 0
              const full = count >= 6
              return (
                <motion.div
                  key={room.key}
                  whileHover={full ? {} : { scale: 1.01 }}
                  className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-5 flex items-center gap-4"
                >
                  <div className="text-4xl shrink-0">{room.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{room.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{room.desc}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users size={13} /> {count}/6
                    </span>
                    <button
                      onClick={() => !full && joinRoom(room)}
                      disabled={full || joining === room.key}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        full
                          ? 'bg-[rgba(14,165,233,0.05)] text-slate-600 border border-[rgba(14,165,233,0.1)] cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white hover:shadow-lg hover:shadow-[rgba(14,165,233,0.25)]'
                      }`}
                    >
                      {full ? 'Full' : joining === room.key ? 'Joining…' : 'Join'}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Active Room ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen pt-16 flex flex-col bg-[#030F1E]">

      {/* Room header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(14,165,233,0.15)] shrink-0">
        <span className="text-2xl">{activeRoom.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{activeRoom.name}</p>
          <p className="text-slate-400 text-xs">{participants.length + 1} / 6 in room</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMic}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
              micOn
                ? 'bg-[rgba(14,165,233,0.12)] text-[#0EA5E9] border-[rgba(14,165,233,0.3)]'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}
          >
            {micOn ? <Mic size={15} /> : <MicOff size={15} />}
          </button>
          <button
            onClick={toggleCam}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
              camOn
                ? 'bg-[rgba(14,165,233,0.12)] text-[#0EA5E9] border-[rgba(14,165,233,0.3)]'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}
          >
            {camOn ? <Video size={15} /> : <VideoOff size={15} />}
          </button>
          <button
            onClick={leaveRoom}
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* Video grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">

            {/* Local video */}
            <div className="relative aspect-video bg-[#020B18] rounded-xl overflow-hidden border border-[rgba(14,165,233,0.35)]">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-xs font-medium text-white">
                {profile?.displayName || 'You'} (You)
              </div>
            </div>

            {/* Remote videos */}
            {participants.map(p => (
              <div
                key={p.peerId || p.socketId}
                className="relative aspect-video bg-[#020B18] rounded-xl overflow-hidden border border-[rgba(14,165,233,0.2)]"
              >
                {remoteStreams[p.peerId] ? (
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={el => {
                      if (el && remoteStreams[p.peerId] && el.srcObject !== remoteStreams[p.peerId]) {
                        el.srcObject = remoteStreams[p.peerId]
                        el.play().catch(() => {})
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-xl font-bold text-white">
                      {p.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-xs font-medium text-white">
                  {p.displayName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="h-60 md:h-auto md:w-72 flex flex-col border-t md:border-t-0 md:border-l border-[rgba(14,165,233,0.15)]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(14,165,233,0.1)] shrink-0">
            <MessageCircle size={15} className="text-[#0EA5E9]" />
            <span className="text-sm font-medium text-white">Room Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {messages.length === 0 && (
              <p className="text-slate-600 text-xs italic text-center mt-4">No messages yet. Say hi!</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="text-xs">
                <span className="text-[#38BDF8] font-medium">{msg.senderName}: </span>
                <span className="text-slate-300">{msg.message}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-[rgba(14,165,233,0.1)] flex gap-2 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0EA5E9]"
            />
            <button
              onClick={sendMessage}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white flex items-center justify-center shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
