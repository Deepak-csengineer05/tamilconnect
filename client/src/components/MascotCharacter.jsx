import { useEffect, useRef, useState } from 'react'

// Cursor-tracking face character with blinking eyes and wave animation
export default function MascotCharacter({ excited = false }) {
  const containerRef = useRef(null)
  const [look, setLook] = useState({ dx: 0, dy: 0 })
  const [blink, setBlink] = useState(false)
  const [waving, setWaving] = useState(false)

  // Track mouse to rotate eyes / head tilt
  useEffect(() => {
    const handleMove = (e) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const mag = Math.sqrt(dx * dx + dy * dy) || 1
      const clamp = Math.min(mag, 80) / 80
      setLook({ dx: (dx / mag) * clamp * 4, dy: (dy / mag) * clamp * 4 })
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  // Random blink every 2–5 seconds
  useEffect(() => {
    const schedule = () => {
      const delay = 2000 + Math.random() * 3000
      return setTimeout(() => {
        setBlink(true)
        setTimeout(() => setBlink(false), 130)
        blinkTimer = schedule()
      }, delay)
    }
    let blinkTimer = schedule()
    return () => clearTimeout(blinkTimer)
  }, [])

  // Wave when excited
  useEffect(() => {
    if (excited) {
      setWaving(true)
      const t = setTimeout(() => setWaving(false), 2000)
      return () => clearTimeout(t)
    }
  }, [excited])

  const pupilX = look.dx
  const pupilY = look.dy

  return (
    <div ref={containerRef} className="relative flex items-center justify-center select-none">
      <svg
        viewBox="0 0 120 140"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 8px 32px rgba(14,165,233,0.25))' }}
      >
        {/* Body glow */}
        <defs>
          <radialGradient id="body-grad" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#1e4060" />
            <stop offset="100%" stopColor="#030F1E" />
          </radialGradient>
          <radialGradient id="cheek-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(14,165,233,0.35)" />
            <stop offset="100%" stopColor="rgba(14,165,233,0)" />
          </radialGradient>
        </defs>

        {/* Waving arm (right) */}
        <g
          style={{
            transformOrigin: '90px 78px',
            transform: waving ? undefined : 'rotate(0deg)',
            animation: waving ? 'wave 0.4s ease-in-out 4 alternate' : 'none',
          }}
        >
          <style>{`
            @keyframes wave {
              from { transform: rotate(0deg); }
              to   { transform: rotate(-28deg); }
            }
          `}</style>
          <rect x="88" y="72" width="10" height="26" rx="5" fill="url(#body-grad)" stroke="rgba(14,165,233,0.35)" strokeWidth="1" />
          {/* Hand */}
          <circle cx="93" cy="100" r="5.5" fill="url(#body-grad)" stroke="rgba(14,165,233,0.35)" strokeWidth="1" />
        </g>

        {/* Left arm */}
        <rect x="22" y="72" width="10" height="22" rx="5" fill="url(#body-grad)" stroke="rgba(14,165,233,0.35)" strokeWidth="1" />
        <circle cx="27" cy="96" r="5.5" fill="url(#body-grad)" stroke="rgba(14,165,233,0.35)" strokeWidth="1" />

        {/* Body */}
        <rect x="32" y="70" width="56" height="50" rx="14" fill="url(#body-grad)" stroke="rgba(14,165,233,0.3)" strokeWidth="1.2" />

        {/* Chest badge */}
        <rect x="46" y="82" width="28" height="16" rx="5"
          fill="rgba(14,165,233,0.12)" stroke="rgba(14,165,233,0.3)" strokeWidth="0.8" />
        <text x="60" y="92" textAnchor="middle" dominantBaseline="middle"
          fontSize="6.5" fill="#38BDF8" fontWeight="bold">TC</text>

        {/* Neck */}
        <rect x="52" y="58" width="16" height="14" rx="4" fill="url(#body-grad)" stroke="rgba(14,165,233,0.2)" strokeWidth="1" />

        {/* Head */}
        <ellipse cx="60" cy="44" rx="28" ry="26" fill="url(#body-grad)" stroke="rgba(14,165,233,0.4)" strokeWidth="1.2" />

        {/* Head glow ring */}
        <ellipse cx="60" cy="44" rx="28" ry="26" fill="none" stroke="rgba(14,165,233,0.08)" strokeWidth="4" />

        {/* Cheeks */}
        <ellipse cx="36" cy="50" rx="7" ry="5" fill="url(#cheek-grad)" />
        <ellipse cx="84" cy="50" rx="7" ry="5" fill="url(#cheek-grad)" />

        {/* Left eye white */}
        <ellipse cx="48" cy="42" rx="7" ry={blink ? 0.8 : 7} fill="white" style={{ transition: 'ry 0.06s' }} />
        {/* Left pupil */}
        {!blink && (
          <ellipse cx={48 + pupilX} cy={42 + pupilY} rx="3.2" ry="3.8"
            fill="#030F1E" style={{ transition: 'cx 0.12s, cy 0.12s' }} />
        )}
        {/* Left eye shine */}
        {!blink && <circle cx={49 + pupilX} cy={40 + pupilY} r="1.2" fill="white" opacity="0.9" />}

        {/* Right eye white */}
        <ellipse cx="72" cy="42" rx="7" ry={blink ? 0.8 : 7} fill="white" style={{ transition: 'ry 0.06s' }} />
        {/* Right pupil */}
        {!blink && (
          <ellipse cx={72 + pupilX} cy={42 + pupilY} rx="3.2" ry="3.8"
            fill="#030F1E" style={{ transition: 'cx 0.12s, cy 0.12s' }} />
        )}
        {/* Right eye shine */}
        {!blink && <circle cx={73 + pupilX} cy={40 + pupilY} r="1.2" fill="white" opacity="0.9" />}

        {/* Mouth — smile or excited */}
        {excited ? (
          // Big open excited mouth
          <path d="M 48 54 Q 60 64 72 54" stroke="#38BDF8" strokeWidth="2" fill="rgba(3,15,30,0.5)"
            strokeLinecap="round" />
        ) : (
          // Gentle smile
          <path d="M 50 54 Q 60 60 70 54" stroke="#38BDF8" strokeWidth="1.5" fill="none"
            strokeLinecap="round" />
        )}

        {/* Antenna */}
        <line x1="60" y1="18" x2="60" y2="28" stroke="rgba(14,165,233,0.5)" strokeWidth="1.5" />
        <circle cx="60" cy="16" r="3" fill="#0EA5E9" opacity="0.8" />

        {/* Legs */}
        <rect x="44" y="118" width="12" height="18" rx="5" fill="url(#body-grad)" stroke="rgba(14,165,233,0.3)" strokeWidth="1" />
        <rect x="64" y="118" width="12" height="18" rx="5" fill="url(#body-grad)" stroke="rgba(14,165,233,0.3)" strokeWidth="1" />
      </svg>
    </div>
  )
}
