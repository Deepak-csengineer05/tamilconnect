import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Video, User, LogOut } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { isTeal } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out')
      navigate('/')
    } catch {
      toast.error('Failed to logout')
    }
  }

  // Theme-sensitive inline styles
  const accentLineStyle = {
    backgroundImage: isTeal
      ? 'linear-gradient(to right, #2DD4BF, #14B8A6, #2DD4BF)'
      : 'linear-gradient(to right, #0EA5E9, #06B6D4, #0EA5E9)',
  }
  const navStyle = {
    background: 'var(--nav-bg)',
    borderBottomColor: 'var(--nav-border)',
  }
  const mobileBorderStyle = {
    borderTopColor: isTeal ? 'rgba(45,212,191,0.1)' : 'rgba(14,165,233,0.1)',
  }

  const linkClass = (path) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? isTeal
          ? 'bg-[rgba(45,212,191,0.15)] text-[#5EEAD4] border border-[rgba(45,212,191,0.3)]'
          : 'bg-[rgba(14,165,233,0.15)] text-[#38BDF8] border border-[rgba(14,165,233,0.3)]'
        : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Top accent line — themed */}
      <div className="h-[2px]" style={accentLineStyle} />

      <div className="backdrop-blur-xl border-b" style={navStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to={user ? '/chat' : '/'} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center font-bold text-white text-lg">
                T
              </div>
              <span className="text-lg font-bold">
                <span className="gradient-text">Tamil</span>
                <span className="text-white">Connect</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <Link to="/chat" className={linkClass('/chat')}>
                    <span className="flex items-center gap-1.5">
                      <Video size={16} /> Chat
                    </span>
                  </Link>
                  <Link to="/profile" className={linkClass('/profile')}>
                    <span className="flex items-center gap-1.5">
                      <User size={16} /> Profile
                    </span>
                  </Link>
                  <div className="w-px h-6 bg-[rgba(14,165,233,0.2)] mx-1" />
                  <ThemeToggle />
                  <div className="w-px h-6 bg-[rgba(14,165,233,0.2)] mx-1" />
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-white text-sm font-semibold">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm flex items-center gap-1.5"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/" className={linkClass('/')}>Home</Link>
                  <Link to="/login" className={linkClass('/login')}>Login</Link>
                  <ThemeToggle />
                  <Link
                    to="/register"
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[rgba(14,165,233,0.3)] transition-all"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: toggle + hamburger */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg text-slate-300 hover:bg-white/5"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t"
              style={mobileBorderStyle}
            >
              <div className="px-4 py-3 space-y-1">
                {user ? (
                  <>
                    <Link to="/chat" onClick={() => setMenuOpen(false)} className={`block ${linkClass('/chat')}`}>Chat</Link>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className={`block ${linkClass('/profile')}`}>Profile</Link>
                    <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="w-full text-left px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 text-sm">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/" onClick={() => setMenuOpen(false)} className={`block ${linkClass('/')}`}>Home</Link>
                    <Link to="/login" onClick={() => setMenuOpen(false)} className={`block ${linkClass('/login')}`}>Login</Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-2 rounded-lg bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white text-sm font-semibold text-center">Sign Up</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
