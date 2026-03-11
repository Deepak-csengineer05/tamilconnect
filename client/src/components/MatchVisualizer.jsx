import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const INTERESTS = ['Cricket 🏏', 'Music 🎵', 'Movies 🎬', 'Tech 💻', 'Food 🍛']

export default function MatchVisualizer() {
  const containerRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  // Stage 0→0.3: avatars slide in from sides
  const leftX    = useTransform(scrollYProgress, [0, 0.25], [-120, 0])
  const rightX   = useTransform(scrollYProgress, [0, 0.25], [120, 0])
  const avatarOp = useTransform(scrollYProgress, [0, 0.2], [0, 1])

  // Stage 0.25→0.55: tags float in from top between avatars
  const tagsOp  = useTransform(scrollYProgress, [0.22, 0.45], [0, 1])
  const tagsY   = useTransform(scrollYProgress, [0.22, 0.45], [-20, 0])

  // Stage 0.45→0.7: score bar fills, line draws
  const scoreW  = useTransform(scrollYProgress, [0.42, 0.68], ['0%', '100%'])
  const lineOp  = useTransform(scrollYProgress, [0.5, 0.72], [0, 1])
  const lineW   = useTransform(scrollYProgress, [0.5, 0.72], ['0%', '100%'])

  // Stage 0.65→0.85: MATCH! badge appears with avatars glowing
  const matchOp   = useTransform(scrollYProgress, [0.65, 0.82], [0, 1])
  const matchScale = useTransform(scrollYProgress, [0.65, 0.82], [0.6, 1])
  const glowOp    = useTransform(scrollYProgress, [0.65, 0.85], [0, 1])

  return (
    <div ref={containerRef} className="relative w-full min-h-[500px] flex items-center justify-center py-16 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(rgba(14,165,233,0.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative w-full max-w-3xl px-4">

        {/* Avatars row */}
        <div className="relative flex items-center justify-between mb-8">

          {/* Left avatar — User A */}
          <motion.div style={{ x: leftX, opacity: avatarOp }} className="flex flex-col items-center gap-2 w-28">
            <motion.div
              style={{ boxShadow: useTransform(glowOp, v => `0 0 ${v * 32}px rgba(14,165,233,${v * 0.6})`) }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[rgba(14,165,233,0.2)] to-[rgba(6,182,212,0.1)] border border-[rgba(14,165,233,0.35)] flex items-center justify-center text-3xl"
            >
              🧑
            </motion.div>
            <div className="text-center">
              <p className="text-white text-xs font-semibold">Arjun</p>
              <p className="text-slate-500 text-[10px]">Chennai</p>
            </div>
            <div className="flex flex-col gap-1 w-full">
              {['Cricket 🏏', 'Music 🎵', 'Tech 💻'].map(t => (
                <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(14,165,233,0.1)] border border-[rgba(14,165,233,0.2)] text-[#38BDF8] text-center">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Center — tags + score bar + match line */}
          <div className="flex-1 flex flex-col items-center gap-3 px-4">

            {/* Floating shared interest tags */}
            <motion.div style={{ opacity: tagsOp, y: tagsY }} className="flex flex-wrap gap-1.5 justify-center">
              {INTERESTS.map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={false}
                  style={{ opacity: tagsOp }}
                  transition={{ delay: i * 0.06 }}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-[rgba(6,182,212,0.15)] border border-[rgba(6,182,212,0.4)] text-[#22D3EE] font-medium"
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>

            {/* Match score bar */}
            <motion.div style={{ opacity: tagsOp }} className="w-full">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500">Match Score</span>
                <span className="text-[10px] text-[#38BDF8] font-bold">98%</span>
              </div>
              <div className="h-1.5 w-full bg-[rgba(14,165,233,0.1)] rounded-full overflow-hidden border border-[rgba(14,165,233,0.15)]">
                <motion.div
                  style={{ width: scoreW }}
                  className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] rounded-full"
                />
              </div>
            </motion.div>

            {/* Connection line */}
            <motion.div style={{ opacity: lineOp }} className="w-full flex items-center gap-1">
              <div className="relative w-full h-[2px] bg-[rgba(14,165,233,0.1)] rounded-full overflow-hidden">
                <motion.div
                  style={{ width: lineW }}
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#0EA5E9] to-[#22D3EE] rounded-full"
                />
              </div>
            </motion.div>

            {/* MATCHED badge */}
            <motion.div
              style={{ opacity: matchOp, scale: matchScale }}
              className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[rgba(14,165,233,0.25)] to-[rgba(6,182,212,0.2)] border border-[rgba(6,182,212,0.5)] shadow-lg shadow-[rgba(14,165,233,0.2)]"
            >
              <p className="text-sm font-bold text-[#22D3EE] tracking-wide">✨ MATCHED!</p>
            </motion.div>
          </div>

          {/* Right avatar — User B */}
          <motion.div style={{ x: rightX, opacity: avatarOp }} className="flex flex-col items-center gap-2 w-28">
            <motion.div
              style={{ boxShadow: useTransform(glowOp, v => `0 0 ${v * 32}px rgba(6,182,212,${v * 0.6})`) }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[rgba(6,182,212,0.2)] to-[rgba(14,165,233,0.1)] border border-[rgba(6,182,212,0.35)] flex items-center justify-center text-3xl"
            >
              👩
            </motion.div>
            <div className="text-center">
              <p className="text-white text-xs font-semibold">Priya</p>
              <p className="text-slate-500 text-[10px]">Madurai</p>
            </div>
            <div className="flex flex-col gap-1 w-full">
              {['Cricket 🏏', 'Movies 🎬', 'Music 🎵'].map(t => (
                <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.2)] text-[#22D3EE] text-center">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Caption */}
        <motion.p
          style={{ opacity: matchOp }}
          className="text-center text-sm text-slate-400 mt-4"
        >
          Arjun and Priya share <span className="text-[#38BDF8] font-semibold">3 interests</span> — our algorithm connected them in under a second.
        </motion.p>
      </div>
    </div>
  )
}
