import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, SkipForward } from 'lucide-react'

/**
 * IntroSplash — plays /intro.mp4 once per browser session.
 * After the video ends (or user skips), calls onDone() to unmount.
 */
export default function IntroSplash({ onDone }) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(0)

  // Try autoplay; browsers require muted for autoplay
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => {})

    const onEnd = () => handleDone()
    const onTime = () => {
      if (v.duration) setProgress(v.currentTime / v.duration)
    }

    v.addEventListener('ended', onEnd)
    v.addEventListener('timeupdate', onTime)
    return () => {
      v.removeEventListener('ended', onEnd)
      v.removeEventListener('timeupdate', onTime)
    }
  }, [])

  const handleDone = () => {
    setVisible(false)
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="intro-splash"
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Video */}
          <video
            ref={videoRef}
            src="/intro.mp4"
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Subtle dark vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />

          {/* Logo watermark centre */}
          <motion.div
            className="relative z-10 flex flex-col items-center select-none pointer-events-none"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 0.9, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            <img
              src="/logo.png"
              alt="TamilConnect"
              className="w-24 h-24 object-contain drop-shadow-2xl"
            />
            <p className="mt-3 text-white text-xl font-bold tracking-wide drop-shadow-lg">
              <span className="gradient-text">Tamil</span>Connect
            </p>
          </motion.div>

          {/* Controls – bottom row */}
          <div className="absolute bottom-6 left-0 right-0 px-6 z-10 flex items-center gap-4">
            {/* Progress bar */}
            <div className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] rounded-full origin-left"
                style={{ scaleX: progress }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Skip */}
            <button
              onClick={handleDone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 text-white text-xs font-medium hover:bg-black/60 transition-colors"
            >
              <SkipForward size={13} />
              Skip
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
