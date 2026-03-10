import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Edit3, Save, X, MapPin, Languages as LangIcon, MessageSquare, Sparkles, Plus, UserCheck, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
  'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
  'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar',
]

export default function Profile() {
  const { getToken, user: firebaseUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDistrict, setEditDistrict] = useState('')
  const [editLanguage, setEditLanguage] = useState('')
  const [editGender, setEditGender] = useState('')
  const [localInterests, setLocalInterests] = useState([])
  const [savingInterests, setSavingInterests] = useState(false)

  // Follows
  const [follows, setFollows] = useState([])
  const [followsLoading, setFollowsLoading] = useState(false)
  const [showFollows, setShowFollows] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.user)
        setLocalInterests(data.user.interests || [])
      }
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchFollows = async () => {
    setFollowsLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/follows`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFollows(data.follows || [])
      }
    } catch {
      toast.error('Failed to load following list')
    } finally {
      setFollowsLoading(false)
    }
  }

  const toggleFollowsPanel = () => {
    const next = !showFollows
    setShowFollows(next)
    if (next && follows.length === 0) fetchFollows()
  }

  const startEditing = () => {
    setEditName(profile.displayName)
    setEditDistrict(profile.district)
    setEditLanguage(profile.language)
    setEditGender(profile.gender || '')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: editName.trim(),
          district: editDistrict,
          language: editLanguage,
          gender: editGender,
          interests: localInterests,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setProfile(data.user)
      setLocalInterests(data.user.interests || [])
      setEditing(false)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleInterest = (label) => {
    setLocalInterests((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const saveInterests = async () => {
    setSavingInterests(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: profile.displayName,
          district: profile.district,
          language: profile.language,
          interests: localInterests,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setProfile(data.user)
      setLocalInterests(data.user.interests || [])
      toast.success('Interests saved!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingInterests(false)
    }
  }

  const interestsDirty =
    profile &&
    JSON.stringify([...localInterests].sort()) !==
      JSON.stringify([...(profile.interests || [])].sort())

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.1)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-slate-400">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Profile header card */}
        <div className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-5 sm:p-6">
          {/* top row: avatar + name + edit button */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-2xl font-bold text-white shrink-0">
              {(editing ? editName : profile.displayName)?.[0]?.toUpperCase() || 'U'}
            </div>

            {/* Name + email + badges + button */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {editing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value.slice(0, 30))}
                      className="w-full bg-[rgba(14,165,233,0.06)] border border-[rgba(14,165,233,0.3)] rounded-lg px-3 py-1.5 text-white text-base font-semibold focus:outline-none focus:border-[#0EA5E9]"
                    />
                  ) : (
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">{profile.displayName}</h2>
                  )}
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">{firebaseUser?.email}</p>
                </div>

                {/* Action buttons — always visible, wrap on mobile */}
                {!editing ? (
                  <button
                    onClick={startEditing}
                    className="shrink-0 px-3 py-1.5 rounded-xl border border-[rgba(14,165,233,0.3)] text-[#38BDF8] text-xs sm:text-sm font-medium hover:bg-[rgba(14,165,233,0.1)] transition-all flex items-center gap-1.5"
                  >
                    <Edit3 size={13} /> Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white text-xs sm:text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1.5 rounded-xl border border-[rgba(14,165,233,0.15)] text-slate-400 text-xs sm:text-sm hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <X size={13} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* District + language badges */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(14,165,233,0.12)] text-[#38BDF8] border border-[rgba(14,165,233,0.3)] flex items-center gap-1">
                  <MapPin size={10} /> {profile.district}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(6,182,212,0.12)] text-[#22D3EE] border border-[rgba(6,182,212,0.3)]">
                  {profile.language}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-5 text-center">
            <MessageSquare size={22} className="text-[#0EA5E9] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.chatCount || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">Chats Started</p>
          </div>
          <div className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-5 text-center">
            <Sparkles size={22} className="text-[#06B6D4] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{localInterests.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Interests</p>
          </div>
          <button
            onClick={toggleFollowsPanel}
            className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-5 text-center hover:border-[rgba(14,165,233,0.35)] transition-colors"
          >
            <Users size={22} className="text-[#38BDF8] mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{profile.follows?.length || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">Following</p>
          </button>
        </div>

        {/* Following panel */}
        {showFollows && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <UserCheck size={16} className="text-[#38BDF8]" />
              <h3 className="text-sm font-semibold text-white">People I Follow</h3>
            </div>
            {followsLoading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-12 bg-[rgba(14,165,233,0.05)] rounded-xl animate-pulse" />)}
              </div>
            ) : follows.length === 0 ? (
              <p className="text-slate-500 text-sm">You haven't followed anyone yet. Follow people during a chat!</p>
            ) : (
              <div className="space-y-2">
                {follows.map((f) => (
                  <div key={f.uid} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(14,165,233,0.04)] border border-[rgba(14,165,233,0.1)]">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {f.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{f.displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{f.district} · {f.language}</p>
                    </div>
                    {f.gender && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(14,165,233,0.1)] text-[#38BDF8] border border-[rgba(14,165,233,0.2)] shrink-0">
                        {f.gender}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Details card — only shown when editing name/district/language */}
        {editing && (
          <div className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-6 space-y-6">
            {/* District */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-1.5">
                <MapPin size={14} className="text-[#0EA5E9]" /> District
              </label>
              <select
                value={editDistrict}
                onChange={(e) => setEditDistrict(e.target.value)}
                className="w-full bg-[rgba(14,165,233,0.04)] border border-[rgba(14,165,233,0.15)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0EA5E9] appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d} className="bg-[#030F1E]">{d}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-1.5">
                <LangIcon size={14} className="text-[#06B6D4]" /> Language
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'Tamil', label: '🇮🇳 Tamil' },
                  { value: 'English', label: '🌐 English' },
                  { value: 'Both', label: '🔄 Both' },
                ].map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setEditLanguage(lang.value)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      editLanguage === lang.value
                        ? 'bg-gradient-to-r from-[rgba(14,165,233,0.15)] to-[rgba(6,182,212,0.15)] border-[rgba(14,165,233,0.4)] text-[#38BDF8]'
                        : 'border-[rgba(14,165,233,0.1)] text-slate-400 hover:border-[rgba(14,165,233,0.25)]'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Gender</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'Male',   label: '👨 Male' },
                  { value: 'Female', label: '👩 Female' },
                  { value: 'Other',  label: '🧑 Other' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setEditGender(g.value)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      editGender === g.value
                        ? 'bg-gradient-to-r from-[rgba(14,165,233,0.15)] to-[rgba(6,182,212,0.15)] border-[rgba(14,165,233,0.4)] text-[#38BDF8]'
                        : 'border-[rgba(14,165,233,0.1)] text-slate-400 hover:border-[rgba(14,165,233,0.25)]'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Interests Card — always visible, inline editable */}
        <div className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#06B6D4]" />
              <h3 className="text-sm font-semibold text-white">Your Interests</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(14,165,233,0.15)] text-[#38BDF8] font-medium">
                {localInterests.length}
              </span>
            </div>
            {interestsDirty && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={saveInterests}
                disabled={savingInterests}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-[rgba(14,165,233,0.3)]"
              >
                <Save size={12} /> {savingInterests ? 'Saving...' : 'Save interests'}
              </motion.button>
            )}
          </div>

          {/* Selected interest chips */}
          {localInterests.length === 0 ? (
            <p className="text-slate-500 text-sm italic mb-5">No interests yet — explore topics below!</p>
          ) : (
            <div className="flex flex-wrap gap-2.5 mb-5">
              {['Music','Movies','Gaming','Cricket','Cooking','Travel','Tech','Memes','Politics','Education']
                .filter((l) => localInterests.includes(l))
                .map((label, idx) => {
                  const emojis = { Music:'🎵', Movies:'🎬', Gaming:'🎮', Cricket:'🏏', Cooking:'🍳', Travel:'✈️', Tech:'💻', Memes:'😂', Politics:'🏛️', Education:'📚' }
                  return (
                    <motion.button
                      key={label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => toggleInterest(label)}
                      className="group px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white border border-[#0EA5E9] shadow-md shadow-[rgba(14,165,233,0.25)] flex items-center gap-1.5 hover:shadow-lg hover:shadow-[rgba(14,165,233,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>{emojis[label]}</span>
                      <span>{label}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white/70 text-xs leading-none ml-0.5">✕</span>
                    </motion.button>
                  )
                })}
            </div>
          )}

          {/* Explore more topics */}
          {['Music','Movies','Gaming','Cricket','Cooking','Travel','Tech','Memes','Politics','Education']
            .filter((l) => !localInterests.includes(l)).length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-[rgba(14,165,233,0.1)]" />
                <span className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
                  <Plus size={10} /> Explore more topics
                </span>
                <div className="h-px flex-1 bg-[rgba(14,165,233,0.1)]" />
              </div>
              <div className="flex flex-wrap gap-2.5">
                {['Music','Movies','Gaming','Cricket','Cooking','Travel','Tech','Memes','Politics','Education']
                  .filter((l) => !localInterests.includes(l))
                  .map((label, idx) => {
                    const emojis = { Music:'🎵', Movies:'🎬', Gaming:'🎮', Cricket:'🏏', Cooking:'🍳', Travel:'✈️', Tech:'💻', Memes:'😂', Politics:'🏛️', Education:'📚' }
                    return (
                      <motion.button
                        key={label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => toggleInterest(label)}
                        className="group px-4 py-2 rounded-full text-sm font-medium bg-[rgba(14,165,233,0.06)] text-slate-400 border border-[rgba(14,165,233,0.15)] flex items-center gap-1.5 hover:border-[rgba(14,165,233,0.4)] hover:text-[#38BDF8] hover:bg-[rgba(14,165,233,0.12)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <span className="text-[#0EA5E9] opacity-50 group-hover:opacity-100 transition-opacity text-xs">+</span>
                        <span>{emojis[label]}</span>
                        <span>{label}</span>
                      </motion.button>
                    )
                  })}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#0EA5E9] text-center mt-1">🎉 You've added all topics!</p>
          )}
        </div>

        {/* Member since */}
        {profile.createdAt && (
          <p className="text-center text-sm text-slate-500">
            Member since {new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        )}
      </motion.div>
    </div>
  )
}
