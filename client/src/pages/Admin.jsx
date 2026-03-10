import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, BarChart3, MessageSquare, Layers, Shield, Ban, Flag,
  Trash2, CheckCircle, Plus, X, Search, ChevronLeft, ChevronRight,
  AlertTriangle, UserCheck, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'stats',   label: 'Overview',  icon: BarChart3 },
  { id: 'users',   label: 'Users',     icon: Users },
  { id: 'rooms',   label: 'Rooms',     icon: Layers },
  { id: 'reports', label: 'Reports',   icon: MessageSquare },
]

const EMOJI_OPTIONS = ['💬','🎮','🎵','🎬','📚','🍛','🏏','💻','🌍','✈️','🤝','💡']

export default function Admin() {
  const { getToken } = useAuth()
  const [tab, setTab] = useState('stats')

  // ── stats
  const [stats, setStats] = useState(null)

  // ── users
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)

  // ── rooms
  const [rooms, setRooms] = useState([])
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [roomForm, setRoomForm] = useState({ name: '', emoji: '💬', desc: '', maxSize: 6 })
  const [savingRoom, setSavingRoom] = useState(false)

  // ── reports
  const [reports, setReports] = useState([])
  const [reportFilter, setReportFilter] = useState('false') // 'false' = unresolved
  const [reportPage, setReportPage] = useState(1)
  const [reportTotal, setReportTotal] = useState(0)

  const [loading, setLoading] = useState(false)

  const api = useCallback(async (path, opts = {}) => {
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    })
    return res
  }, [getToken])

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api('/stats')
      if (res.ok) setStats(await res.json())
    } catch { toast.error('Failed to load stats') }
  }, [api])

  const fetchUsers = useCallback(async (search = userSearch, page = userPage) => {
    setLoading(true)
    try {
      const res = await api(`/users?search=${encodeURIComponent(search)}&page=${page}&limit=15`)
      if (res.ok) {
        const d = await res.json()
        setUsers(d.users)
        setUserTotal(d.total)
      }
    } catch { toast.error('Failed to load users') } finally { setLoading(false) }
  }, [api, userSearch, userPage])

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api('/rooms')
      if (res.ok) setRooms((await res.json()).rooms)
    } catch { toast.error('Failed to load rooms') }
  }, [api])

  const fetchReports = useCallback(async (filter = reportFilter, page = reportPage) => {
    setLoading(true)
    try {
      const res = await api(`/reports?resolved=${filter}&page=${page}&limit=15`)
      if (res.ok) {
        const d = await res.json()
        setReports(d.reports)
        setReportTotal(d.total)
      }
    } catch { toast.error('Failed to load reports') } finally { setLoading(false) }
  }, [api, reportFilter, reportPage])

  // Initial load per tab
  useEffect(() => {
    if (tab === 'stats') fetchStats()
    if (tab === 'users') fetchUsers()
    if (tab === 'rooms') fetchRooms()
    if (tab === 'reports') fetchReports()
  }, [tab]) // eslint-disable-line

  // ── User actions ──────────────────────────────────────────────────────────
  const toggleBan = async (uid) => {
    try {
      const res = await api(`/users/${uid}/ban`, { method: 'PATCH' })
      const d = await res.json()
      if (res.ok) {
        toast.success(d.message)
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, banned: d.banned } : u))
      } else { toast.error(d.error) }
    } catch { toast.error('Network error') }
  }

  const toggleFlag = async (uid) => {
    try {
      const res = await api(`/users/${uid}/flag`, { method: 'PATCH' })
      const d = await res.json()
      if (res.ok) {
        toast.success(d.message)
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, flagged: d.flagged } : u))
      } else { toast.error(d.error) }
    } catch { toast.error('Network error') }
  }

  const deleteUser = async (uid, name) => {
    if (!confirm(`Delete user "${name}"? This is permanent.`)) return
    try {
      const res = await api(`/users/${uid}`, { method: 'DELETE' })
      const d = await res.json()
      if (res.ok) { toast.success('User deleted'); setUsers(prev => prev.filter(u => u.uid !== uid)) }
      else toast.error(d.error)
    } catch { toast.error('Network error') }
  }

  // ── Room actions ──────────────────────────────────────────────────────────
  const openCreateRoom = () => {
    setEditRoom(null)
    setRoomForm({ name: '', emoji: '💬', desc: '', maxSize: 6 })
    setShowRoomModal(true)
  }

  const openEditRoom = (room) => {
    setEditRoom(room)
    setRoomForm({ name: room.name, emoji: room.emoji, desc: room.desc, maxSize: room.maxSize || 6 })
    setShowRoomModal(true)
  }

  const saveRoom = async () => {
    if (!roomForm.name.trim()) { toast.error('Room name is required'); return }
    setSavingRoom(true)
    try {
      const method = editRoom ? 'PUT' : 'POST'
      const path = editRoom ? `/rooms/${editRoom._id}` : '/rooms'
      const res = await api(path, { method, body: JSON.stringify(roomForm) })
      const d = await res.json()
      if (res.ok) {
        toast.success(editRoom ? 'Room updated' : 'Room created')
        setShowRoomModal(false)
        fetchRooms()
      } else { toast.error(d.error) }
    } catch { toast.error('Network error') } finally { setSavingRoom(false) }
  }

  const deleteRoom = async (room) => {
    if (room.isDefault) { toast.error('Cannot delete default rooms'); return }
    if (!confirm(`Delete room "${room.name}"? All members will be kicked.`)) return
    try {
      const res = await api(`/rooms/${room._id}`, { method: 'DELETE' })
      const d = await res.json()
      if (res.ok) { toast.success('Room deleted'); fetchRooms() }
      else toast.error(d.error)
    } catch { toast.error('Network error') }
  }

  // ── Report actions ────────────────────────────────────────────────────────
  const resolveReport = async (id) => {
    try {
      const res = await api(`/reports/${id}/resolve`, { method: 'PATCH' })
      const d = await res.json()
      if (res.ok) { toast.success('Report resolved'); fetchReports() }
      else toast.error(d.error)
    } catch { toast.error('Network error') }
  }

  const deleteReport = async (id) => {
    if (!confirm('Delete this report?')) return
    try {
      const res = await api(`/reports/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Report deleted'); fetchReports() }
    } catch { toast.error('Network error') }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-16 flex bg-[#020B18]">

      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-[rgba(3,15,30,0.95)] border-r border-[rgba(14,165,233,0.12)] pt-6 px-3 hidden sm:flex flex-col gap-1">
        <div className="flex items-center gap-2 px-3 mb-5">
          <Shield size={18} className="text-[#0EA5E9]" />
          <span className="text-white font-bold text-sm">Admin Panel</span>
        </div>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-[rgba(14,165,233,0.15)] text-[#38BDF8] border border-[rgba(14,165,233,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </aside>

      {/* Mobile tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[rgba(3,15,30,0.98)] border-t border-[rgba(14,165,233,0.12)] flex z-40">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs transition-all ${tab === t.id ? 'text-[#38BDF8]' : 'text-slate-500'}`}>
            <t.icon size={18} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 pb-20 sm:pb-6">

        {/* ── OVERVIEW ── */}
        {tab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Overview</h1>
              <button onClick={fetchStats} className="p-2 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[rgba(14,165,233,0.1)] transition-all">
                <RefreshCw size={16} />
              </button>
            </div>
            {stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',      value: stats.totalUsers,        color: 'from-[#0EA5E9] to-[#06B6D4]',  icon: Users },
                  { label: 'Total Rooms',      value: stats.totalRooms,        color: 'from-purple-500 to-purple-700', icon: Layers },
                  { label: 'Total Reports',    value: stats.totalReports,      color: 'from-orange-500 to-orange-700', icon: MessageSquare },
                  { label: 'Banned Users',     value: stats.bannedUsers,       color: 'from-red-500 to-red-700',       icon: Ban },
                  { label: 'Flagged Users',    value: stats.flaggedUsers,      color: 'from-yellow-500 to-yellow-700', icon: Flag },
                  { label: 'Open Reports',     value: stats.unresolvedReports, color: 'from-pink-500 to-pink-700',     icon: AlertTriangle },
                  { label: 'New (7 days)',      value: stats.newUsersThisWeek,  color: 'from-green-500 to-green-700',   icon: UserCheck },
                ].map(item => (
                  <div key={item.label} className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.12)] rounded-2xl p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                      <item.icon size={18} className="text-white" />
                    </div>
                    <p className="text-3xl font-bold text-white">{item.value ?? '—'}</p>
                    <p className="text-slate-400 text-xs mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-500">Loading stats…</div>
            )}
          </motion.div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold text-white">Users</h1>
              <span className="text-slate-400 text-sm">{userTotal} total</span>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
                onKeyDown={e => e.key === 'Enter' && fetchUsers(userSearch, 1)}
                placeholder="Search by name or email…"
                className="w-full bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0EA5E9]"
              />
              <button onClick={() => fetchUsers(userSearch, 1)} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[rgba(14,165,233,0.1)] text-[#38BDF8] text-xs hover:bg-[rgba(14,165,233,0.2)] transition-all">
                Search
              </button>
            </div>

            {/* Table */}
            <div className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.12)] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(14,165,233,0.1)]">
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">User</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">District</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">Chats</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-500">Loading…</td></tr>
                    )}
                    {!loading && users.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-500">No users found</td></tr>
                    )}
                    {users.map(u => (
                      <tr key={u.uid} className="border-b border-[rgba(14,165,233,0.06)] hover:bg-[rgba(14,165,233,0.03)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.displayName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-white font-medium truncate">{u.displayName}</p>
                                {u.isAdmin && <span className="text-[10px] bg-[rgba(14,165,233,0.2)] text-[#38BDF8] px-1.5 py-0.5 rounded font-medium shrink-0">admin</span>}
                              </div>
                              <p className="text-slate-500 text-xs truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{u.district || '—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{u.chatCount || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {u.banned && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">Banned</span>}
                            {u.flagged && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded">Flagged</span>}
                            {!u.banned && !u.flagged && <span className="text-[10px] text-slate-600">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleBan(u.uid)}
                              disabled={u.isAdmin}
                              title={u.banned ? 'Unban' : 'Ban'}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                u.banned ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              }`}
                            >
                              {u.banned ? <UserCheck size={14} /> : <Ban size={14} />}
                            </button>
                            <button
                              onClick={() => toggleFlag(u.uid)}
                              title={u.flagged ? 'Unflag' : 'Flag'}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                u.flagged ? 'bg-[rgba(14,165,233,0.1)] text-[#38BDF8] hover:bg-[rgba(14,165,233,0.2)]' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                              }`}
                            >
                              <Flag size={14} />
                            </button>
                            <button
                              onClick={() => deleteUser(u.uid, u.displayName)}
                              disabled={u.isAdmin}
                              title="Delete user"
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(14,165,233,0.08)]">
                <span className="text-xs text-slate-500">Page {userPage} · {Math.ceil(userTotal / 15)} pages</span>
                <div className="flex gap-2">
                  <button disabled={userPage <= 1} onClick={() => { const p = userPage - 1; setUserPage(p); fetchUsers(userSearch, p) }} className="w-8 h-8 rounded-lg bg-[rgba(14,165,233,0.05)] text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center">
                    <ChevronLeft size={14} />
                  </button>
                  <button disabled={userPage >= Math.ceil(userTotal / 15)} onClick={() => { const p = userPage + 1; setUserPage(p); fetchUsers(userSearch, p) }} className="w-8 h-8 rounded-lg bg-[rgba(14,165,233,0.05)] text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ROOMS ── */}
        {tab === 'rooms' && (
          <motion.div key="rooms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold text-white">Rooms</h1>
              <button
                onClick={openCreateRoom}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[rgba(14,165,233,0.25)] transition-all"
              >
                <Plus size={15} /> New Room
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map(room => (
                <div key={room._id} className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.12)] rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{room.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm truncate">{room.name}</p>
                        {room.isDefault && <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1 shrink-0">default</span>}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{room.desc || 'No description'}</p>
                      <p className="text-slate-600 text-xs mt-1">Max: {room.maxSize || 6} · Key: {room.key}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openEditRoom(room)}
                      className="flex-1 py-1.5 rounded-lg bg-[rgba(14,165,233,0.08)] text-[#38BDF8] text-xs font-medium hover:bg-[rgba(14,165,233,0.15)] transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRoom(room)}
                      disabled={room.isDefault}
                      className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold text-white">Reports</h1>
              <div className="flex gap-2">
                {[['false', 'Open'], ['true', 'Resolved'], ['', 'All']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setReportFilter(val); setReportPage(1); fetchReports(val, 1) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      reportFilter === val ? 'bg-[rgba(14,165,233,0.2)] text-[#38BDF8] border border-[rgba(14,165,233,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {loading && <div className="text-center py-10 text-slate-500">Loading…</div>}
              {!loading && reports.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                  <CheckCircle size={36} className="mx-auto mb-3 opacity-30" />
                  <p>No reports in this category</p>
                </div>
              )}
              {reports.map(report => (
                <div key={report._id} className={`bg-[rgba(3,15,30,0.95)] border rounded-2xl p-4 ${report.resolved ? 'border-[rgba(14,165,233,0.08)] opacity-60' : 'border-[rgba(14,165,233,0.15)]'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">{report.reason}</span>
                        {report.resolved && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">Resolved</span>}
                      </div>
                      <p className="text-slate-300 text-sm">
                        <span className="text-[#38BDF8]">{report.reporter?.displayName || 'Unknown'}</span>
                        <span className="text-slate-500 mx-1.5">reported</span>
                        <span className="text-white font-medium">{report.reported?.displayName || 'Unknown'}</span>
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {new Date(report.createdAt).toLocaleDateString()} · {report.reported?.email || ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!report.resolved && (
                        <button
                          onClick={() => resolveReport(report._id)}
                          className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-all"
                          title="Resolve"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteReport(report._id)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {reportTotal > 15 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-500">Page {reportPage} · {Math.ceil(reportTotal / 15)} pages</span>
                <div className="flex gap-2">
                  <button disabled={reportPage <= 1} onClick={() => { const p = reportPage - 1; setReportPage(p); fetchReports(reportFilter, p) }} className="w-8 h-8 rounded-lg bg-[rgba(14,165,233,0.05)] text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center">
                    <ChevronLeft size={14} />
                  </button>
                  <button disabled={reportPage >= Math.ceil(reportTotal / 15)} onClick={() => { const p = reportPage + 1; setReportPage(p); fetchReports(reportFilter, p) }} className="w-8 h-8 rounded-lg bg-[rgba(14,165,233,0.05)] text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* ── Room Create/Edit Modal ── */}
      <AnimatePresence>
        {showRoomModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowRoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#030F1E] border border-[rgba(14,165,233,0.2)] rounded-2xl p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">{editRoom ? 'Edit Room' : 'Create Room'}</h2>
                <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                {/* Emoji picker row */}
                <div>
                  <label className="text-xs text-slate-400 block mb-2">Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map(e => (
                      <button
                        key={e}
                        onClick={() => setRoomForm(f => ({ ...f, emoji: e }))}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                          roomForm.emoji === e ? 'bg-[rgba(14,165,233,0.25)] border border-[rgba(14,165,233,0.5)]' : 'bg-[rgba(14,165,233,0.05)] hover:bg-[rgba(14,165,233,0.12)]'
                        }`}
                      >{e}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Room Name *</label>
                  <input
                    value={roomForm.name}
                    onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Tamil Movies"
                    className="w-full bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Description</label>
                  <input
                    value={roomForm.desc}
                    onChange={e => setRoomForm(f => ({ ...f, desc: e.target.value }))}
                    placeholder="What's this room about?"
                    className="w-full bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Size (2–12)</label>
                  <input
                    type="number" min={2} max={12}
                    value={roomForm.maxSize}
                    onChange={e => setRoomForm(f => ({ ...f, maxSize: Number(e.target.value) }))}
                    className="w-24 bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#0EA5E9]"
                  />
                </div>

                <button
                  onClick={saveRoom}
                  disabled={savingRoom}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold hover:shadow-lg hover:shadow-[rgba(14,165,233,0.25)] transition-all disabled:opacity-60"
                >
                  {savingRoom ? 'Saving…' : editRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
