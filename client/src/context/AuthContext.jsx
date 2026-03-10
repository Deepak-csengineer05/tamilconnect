import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dbProfile, setDbProfile] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setDbProfile(data.user)
            setIsAdmin(data.user?.isAdmin || false)
          }
        } catch {
          // profile fetch failed; non-critical
        }
      } else {
        setDbProfile(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }

  const registerWithEmail = async (email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }

  const logout = async () => {
    await signOut(auth)
  }

  const getToken = async () => {
    if (!user) return null
    return await user.getIdToken()
  }

  const value = {
    user,
    loading,
    isAdmin,
    dbProfile,
    loginWithEmail,
    loginWithGoogle,
    registerWithEmail,
    logout,
    getToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
