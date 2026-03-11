import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import Peer from 'peerjs'
import { MessageCircle, Users, Video, VideoOff, Mic, MicOff, LogOut, Send, Plus, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Rooms() {
  const { user, getToken } = useAuth()
  const [profile, setProfile] = useState(null)
  const [rooms, setRooms] = useState([])           // loaded from API
  const [roomCounts, setRoomCounts] = useState({})
  const [activeRoom, setActiveRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [remoteStreams, setRemoteStreams] = useState({})
  const [joining, setJoining] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)  // Bug 1: mobile chat toggle
  const [showCreate, setShowCreate] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', emoji: '💬', desc: '' })
  const [creating, setCreating] = useState(false)

  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const peerIdRef = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  // Callback ref so local video re-attaches when the DOM element remounts (lobby → grid transition)
  const setLocalVideoRef = useCallback(el => {
    localVideoRef.current = el
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current
      el.play().catch(() => {})
    }
  }, [])
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

  // ── Rooms fetch from API ─────────────────────────────────────────────────
  const fetchRooms = async () => {
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms)
      }
    } catch {}
  }

  useEffect(() => {
    fetchRooms()
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

    socket.on('rooms-updated', () => {
      fetchRooms()
    })

    // Bug 1/3: if admin deletes the room the user is currently in
    socket.on('room-deleted', ({ roomKey }) => {
      toast.error(`Room "${roomKey}" was removed by admin`)
      leaveRoom()
    })

    socket.on('room-state', ({ participants: ps }) => {
      setParticipants(ps)
      ps.forEach(p => {
        // Skip if: no peerId, it's ourselves, no stream, no peer, or already calling this peer
        if (p.peerId && p.peerId !== peerIdRef.current && localStreamRef.current && peerRef.current && !remoteCallsRef.current[p.peerId]) {
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
      // The joiner calls existing members via room-state.
      // Existing members only answer — no counter-call here to avoid WebRTC offer glare.
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

    // Answer incoming calls from room joiners
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
    // Stop any leftover tracks first
    stopMedia()
    // Wait up to 8 s for PeerJS to get a peer ID before joining
    if (!peerIdRef.current) {
      await new Promise(resolve => {
        let waited = 0
        const t = setInterval(() => {
          waited += 100
          if (peerIdRef.current || waited >= 8000) { clearInterval(t); resolve() }
        }, 100)
      })
    }
    let stream = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      })
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (err) {
        const msg = err?.name === 'NotAllowedError'
          ? 'Camera/mic permission was denied.'
          : err?.name === 'NotReadableError'
          ? 'Camera is in use by another app. Close it and try again.'
          : err?.name === 'NotFoundError'
          ? 'No camera/mic found on this device.'
          : `Camera error: ${err?.name || 'unknown'}`
        toast.error(msg)
        setJoining(null)
        return
      }
    }
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
    setJoining(null)
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
    setChatOpen(false)
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

  // Bug 3: Create room
  const createRoom = async () => {
    if (!newRoom.name.trim() || newRoom.name.trim().length < 3) {
      toast.error('Room name must be at least 3 characters')
      return
    }
    setCreating(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newRoom),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Room created!')
        setShowCreate(false)
        setNewRoom({ name: '', emoji: '💬', desc: '' })
        fetchRooms()
      } else {
        toast.error(data.error || 'Failed to create room')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setCreating(false)
    }
  }

  // Bug 3: Delete own room
  const deleteRoom = async (room, e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${room.name}"? All members will be kicked.`)) return
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/rooms/${room._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Room deleted')
        fetchRooms()
      } else {
        toast.error(data.error || 'Failed to delete room')
      }
    } catch {
      toast.error('Network error')
    }
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
            {rooms.map(room => {
              const count = roomCounts[room.key] || 0
              const full = count >= (room.maxSize || 6)
              const isOwner = room.createdBy === user?.uid
              return (
                <motion.div
                  key={room._id || room.key}
                  whileHover={full ? {} : { scale: 1.01 }}
                  className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-5 flex items-center gap-4"
                >
                  <div className="text-4xl shrink-0">{room.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{room.name}</p>
                      {!room.isDefault && <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1">custom</span>}
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{room.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users size={13} /> {count}/{room.maxSize || 6}
                    </span>
                    {isOwner && (
                      <button
                        onClick={e => deleteRoom(room, e)}
                        className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all"
                        title="Delete room"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
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

          {/* Create Room Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgba(14,165,233,0.1)] border border-[rgba(14,165,233,0.25)] text-[#38BDF8] text-sm font-medium hover:bg-[rgba(14,165,233,0.18)] transition-all"
            >
              <Plus size={16} /> Create Room
            </button>
          </div>
        </motion.div>

        {/* Create Room Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-[#030F1E] border border-[rgba(14,165,233,0.2)] rounded-2xl p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-bold text-lg">Create Room</h2>
                  <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-20">
                      <label className="text-xs text-slate-400 block mb-1">Emoji</label>
                      <input
                        value={newRoom.emoji}
                        onChange={e => setNewRoom(r => ({ ...r, emoji: e.target.value }))}
                        className="w-full bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-2 text-white text-center text-xl focus:outline-none focus:border-[#0EA5E9]"
                        maxLength={4}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">Room Name *</label>
                      <input
                        value={newRoom.name}
                        onChange={e => setNewRoom(r => ({ ...r, name: e.target.value }))}
                        placeholder="e.g. Tamil Movies"
                        className="w-full bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#0EA5E9]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Description</label>
                    <input
                      value={newRoom.desc}
                      onChange={e => setNewRoom(r => ({ ...r, desc: e.target.value }))}
                      placeholder="What's this room about?"
                      className="w-full bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#0EA5E9]"
                    />
                  </div>
                  <button
                    onClick={createRoom}
                    disabled={creating}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold hover:shadow-lg hover:shadow-[rgba(14,165,233,0.25)] transition-all disabled:opacity-60"
                  >
                    {creating ? 'Creating…' : 'Create Room'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* ── LOBBY: alone in room ── */}
      {participants.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          {/* Local preview */}
          <div className="relative w-56 h-40 sm:w-72 sm:h-52 rounded-2xl overflow-hidden border-2 border-[rgba(14,165,233,0.4)] shadow-xl shadow-[rgba(14,165,233,0.1)]">
            <video
              ref={setLocalVideoRef}
              autoPlay playsInline muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white">
              {profile?.displayName || 'You'} (You)
            </div>
          </div>

          {/* Waiting text */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">{activeRoom.emoji}</span>
              <h2 className="text-white font-bold text-lg">{activeRoom.name}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-1">You&apos;re the first one here!</p>
            <p className="text-slate-500 text-xs">Waiting for others to join…</p>
          </div>

          {/* Pulsing dots */}
          <div className="flex gap-2">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Chat panel still available while waiting */}
          <div className="w-full max-w-sm bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(14,165,233,0.1)]">
              <MessageCircle size={14} className="text-[#0EA5E9]" />
              <span className="text-xs font-medium text-white">Room Chat</span>
              <span className="text-xs text-slate-600">(visible to everyone who joins)</span>
            </div>
            <div className="h-24 overflow-y-auto p-3 space-y-1">
              {messages.length === 0 && <p className="text-slate-600 text-xs italic">No messages yet…</p>}
              {messages.map((msg, i) => (
                <div key={i} className="text-xs">
                  <span className="text-[#38BDF8] font-medium">{msg.senderName}: </span>
                  <span className="text-slate-300">{msg.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t border-[rgba(14,165,233,0.1)] flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Say hi when they arrive…"
                className="flex-1 bg-transparent border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0EA5E9]"
              />
              <button onClick={sendMessage} className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white flex items-center justify-center shrink-0">
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
      /* ── ACTIVE: other participants present ── */
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* Mobile chat FAB — hidden when chat panel is open */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="md:hidden fixed bottom-6 right-4 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[rgba(14,165,233,0.3)]"
          >
            <MessageCircle size={20} className="text-white" />
          </button>
        )}

        {/* Video grid — Bug 2: dynamic columns based on participant count */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {/* gridCols: 1 alone → 1col, 2 total → 2col, 3-4 → 2col, 5-6 → 3col */}
          {(() => {
            const total = participants.length + 1
            const cols = total === 1 ? 'grid-cols-1 max-w-xs mx-auto'
                       : total <= 2  ? 'grid-cols-2'
                       : total <= 4  ? 'grid-cols-2'
                       :               'grid-cols-3'
            return (
          <div className={`grid ${cols} gap-2`}>

            {/* Local video */}
            <div className="relative aspect-video bg-[#020B18] rounded-xl overflow-hidden border border-[rgba(14,165,233,0.35)]">
              <video
                ref={setLocalVideoRef}
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
                    muted
                    onPlaying={e => { e.currentTarget.muted = false }}
                    className="w-full h-full object-cover"
                    ref={el => {
                      if (el && remoteStreams[p.peerId] && el.srcObject !== remoteStreams[p.peerId]) {
                        el.srcObject = remoteStreams[p.peerId]
                        el.load()
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
            )
          })()}
        </div>

        {/* Chat panel — Bug 1: hideable on mobile via chatOpen state */}
        <AnimatePresence>
          {(chatOpen || true) && (
        <div className={`${chatOpen ? 'flex' : 'hidden'} md:flex h-60 md:h-auto md:w-72 flex-col border-t md:border-t-0 md:border-l border-[rgba(14,165,233,0.15)]`}>
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[rgba(14,165,233,0.1)] shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle size={15} className="text-[#0EA5E9]" />
              <span className="text-sm font-medium text-white">Room Chat</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="md:hidden p-1 rounded text-slate-400 hover:text-[#0EA5E9]">
              <X size={16} />
            </button>
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
          )}
        </AnimatePresence>

      </div>
      )}
    </div>
  )
}
