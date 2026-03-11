import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar'
import IntroSplash from './components/IntroSplash'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Setup from './pages/Setup'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import Rooms from './pages/Rooms'
import Admin from './pages/Admin'

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
}

function PageWrapper({ children }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/chat" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/chat" replace /> : children
}

export default function App() {
  const { loading } = useAuth()
  const location = useLocation()

  // Show intro video once per browser session
  const [showIntro, setShowIntro] = useState(
    () => !sessionStorage.getItem('tc_intro_seen')
  )
  const handleIntroDone = () => {
    sessionStorage.setItem('tc_intro_seen', '1')
    setShowIntro(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020B18]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[rgba(14,165,233,0.3)] border-t-[#0EA5E9] animate-spin" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showIntro && <IntroSplash onDone={handleIntroDone} />}
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageWrapper>
                <Landing />
              </PageWrapper>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <PageWrapper>
                  <Login />
                </PageWrapper>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <PageWrapper>
                  <Register />
                </PageWrapper>
              </PublicRoute>
            }
          />
          <Route
            path="/setup"
            element={
              <PrivateRoute>
                <PageWrapper>
                  <Setup />
                </PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <PageWrapper>
                  <Chat />
                </PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <PageWrapper>
                  <Profile />
                </PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <PrivateRoute>
                <PageWrapper>
                  <Rooms />
                </PageWrapper>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <PageWrapper>
                  <Admin />
                </PageWrapper>
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
