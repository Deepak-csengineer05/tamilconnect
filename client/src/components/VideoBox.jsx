import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Video } from 'lucide-react'

const VideoBox = forwardRef(function VideoBox(
  { label, language, interests, isLocal, muted, className },
  ref
) {
  if (isLocal) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`absolute bottom-4 right-4 w-36 h-48 sm:w-40 sm:h-52 rounded-xl overflow-hidden border-2 border-[rgba(14,165,233,0.4)] shadow-lg shadow-black/40 z-20 ${className || ''}`}
      >
        <video
          ref={ref}
          playsInline
          muted={muted}
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
          <span className="text-xs font-medium text-white/90">You</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative w-full h-full rounded-2xl overflow-hidden border border-[rgba(14,165,233,0.2)] bg-[#030F1E] ${className || ''}`}
    >
      <video
        ref={ref}
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />

      {/* LIVE badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 border border-[rgba(6,182,212,0.3)]">
        <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
        <span className="text-xs font-semibold text-[#22D3EE]">LIVE</span>
      </div>

      {/* Bottom overlay with partner info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
        {label && (
          <p className="text-white font-semibold text-lg">{label}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {language && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(14,165,233,0.2)] text-[#38BDF8] border border-[rgba(14,165,233,0.3)]">
              {language}
            </span>
          )}
          {interests &&
            interests.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-[rgba(6,182,212,0.15)] text-[#22D3EE] border border-[rgba(6,182,212,0.2)]"
              >
                {tag}
              </span>
            ))}
        </div>
      </div>

      {/* No video fallback */}
      {!ref?.current?.srcObject && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#030F1E]">
          <Video size={48} className="text-slate-600" />
        </div>
      )}
    </motion.div>
  )
})

export default VideoBox
