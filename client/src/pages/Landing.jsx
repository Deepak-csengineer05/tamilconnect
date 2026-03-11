import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Video, Shield, Languages, Zap, Heart, Users } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import TNMap from '../components/TNMap'
import MascotCharacter from '../components/MascotCharacter'
import InterestConstellation from '../components/InterestConstellation'
import MatchVisualizer from '../components/MatchVisualizer'
import NetworkPulse from '../components/NetworkPulse'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
}

const FEATURES = [
  { icon: Sparkles, title: 'Smart Matchmaking',  desc: 'Our algorithm pairs you by district, language, and shared interests.' },
  { icon: Video,    title: 'HD Video Chat',       desc: 'Crystal-clear WebRTC video — no downloads, straight from your browser.' },
  { icon: Shield,   title: 'Safe Community',      desc: 'Report system, auto-flagging, and admin moderation built in.' },
  { icon: Languages,title: 'Tamil & English',     desc: 'Chat in Tamil, English, or both — you choose.' },
  { icon: Zap,      title: 'Instant Connect',     desc: 'Skip, end, or rematch in one click. Zero friction.' },
  { icon: Heart,    title: 'Interest Based',      desc: 'Cricket, music, tech, food — meet people who vibe the same.' },
]

// District name → pretty label map for the CTA pill
const DISTRICT_LABELS = {
  chennai: 'Chennai', coimbatore: 'Coimbatore', madurai: 'Madurai',
  tiruchirappalli: 'Trichy', salem: 'Salem', tirunelveli: 'Tirunelveli',
  vellore: 'Vellore', erode: 'Erode', tiruppur: 'Tiruppur',
  thoothukudi: 'Thoothukudi', kanyakumari: 'Kanyakumari',
}

export default function Landing() {
  const { isTeal } = useTheme()
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [hoveredTag, setHoveredTag] = useState(null)
  const [mascotExcited, setMascotExcited] = useState(false)

  const handleDistrictSelect = (id) => {
    setSelectedDistrict(id)
    if (id) setMascotExcited(true)
  }

  const registerHref = selectedDistrict
    ? `/register?district=${selectedDistrict}`
    : '/register'

  const accentDot = isTeal ? 'rgba(45,212,191,0.4)' : 'rgba(14,165,233,0.4)'

  return (
    <div className="pt-16 overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Network Pulse full-bleed background */}
        <NetworkPulse className="absolute inset-0 w-full h-full pointer-events-none opacity-70" />

        {/* Static gradient blobs on top of canvas */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[rgba(14,165,233,0.05)] rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[rgba(6,182,212,0.04)] rounded-full blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `radial-gradient(${accentDot} 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-10 lg:gap-8 items-center py-24">

          {/* ── LEFT: copy + mascot ───────────────────────────────────────── */}
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 bg-[rgba(14,165,233,0.08)] border border-[rgba(14,165,233,0.2)] rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
              <span className="text-sm text-[#38BDF8] font-medium">Tamil Nadu's Own Video Chat</span>
            </motion.div>

            <motion.p variants={fadeUp} custom={1} className="font-tamil text-[#06B6D4] text-lg">
              உங்கள் மக்களோடு பேசுங்கள்
            </motion.p>

            <motion.h1 variants={fadeUp} custom={2} className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Connect with{' '}
              <span className="gradient-text">Tamil Nadu</span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={3} className="text-slate-400 text-lg max-w-lg">
              Meet people from all 38 districts, chat in Tamil or English, and make real connections based on shared interests.
            </motion.p>

            {/* Mascot + CTA row */}
            <motion.div variants={fadeUp} custom={4} className="flex items-end gap-6 pt-2">
              {/* Mascot character — cursor-following eyes */}
              <div
                className="w-28 h-36 shrink-0"
                onMouseEnter={() => setMascotExcited(true)}
                onMouseLeave={() => setMascotExcited(false)}
              >
                <MascotCharacter excited={mascotExcited} />
              </div>

              <div className="flex flex-col gap-3">
                <AnimatePresence mode="wait">
                  {selectedDistrict ? (
                    <motion.div
                      key="district-selected"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2 text-sm text-[#22D3EE] bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.3)] rounded-xl px-3 py-1.5"
                    >
                      <span className="text-base">📍</span>
                      <span>
                        Starting from <strong>{DISTRICT_LABELS[selectedDistrict] || selectedDistrict}</strong>
                      </span>
                      <button
                        onClick={() => setSelectedDistrict(null)}
                        className="ml-1 text-slate-500 hover:text-white transition-colors"
                      >✕</button>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="pick-hint"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-slate-500"
                    >
                      👉 Click your district on the map →
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to={registerHref}
                    onMouseEnter={() => setMascotExcited(true)}
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold text-base hover:shadow-xl hover:shadow-[rgba(14,165,233,0.3)] transition-all hover:-translate-y-0.5"
                  >
                    Start Chatting Free
                  </Link>
                  <Link
                    to="/login"
                    className="px-7 py-3 rounded-xl border border-[rgba(14,165,233,0.3)] text-[#38BDF8] font-semibold text-base hover:bg-[rgba(14,165,233,0.08)] transition-all"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── RIGHT: Tamil Nadu Interactive Map ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="relative hidden lg:flex flex-col items-center"
          >
            <div className="relative w-full" style={{ height: '520px' }}>
              <TNMap onDistrictSelect={handleDistrictSelect} selectedDistrict={selectedDistrict} />

              {/* Floating label above map */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[rgba(3,15,30,0.9)] border border-[rgba(14,165,233,0.2)] rounded-full px-4 py-1.5 whitespace-nowrap"
              >
                <Users size={13} className="text-[#0EA5E9]" />
                <span className="text-xs text-slate-300 font-medium">Live activity across Tamil Nadu</span>
              </motion.div>

              {/* Total online pill */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-4 right-6 bg-[rgba(3,15,30,0.95)] border border-[rgba(34,197,94,0.3)] rounded-full px-3 py-1.5 shadow-lg"
              >
                <span className="text-xs font-medium text-green-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  1,240+ online now
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30"
        >
          <div className="w-[1px] h-8 bg-gradient-to-b from-transparent to-[#0EA5E9]" />
          <span className="text-[10px] text-slate-500 tracking-widest uppercase">scroll</span>
        </motion.div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section className="py-8 border-y border-[rgba(14,165,233,0.1)] bg-[rgba(3,15,30,0.4)]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🗺️', label: '38 Districts' },
            { icon: '🗣️', label: '2 Languages' },
            { icon: '✨', label: '10+ Interests' },
            { icon: '⚡', label: '0ms Delay' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-center gap-3 bg-[rgba(3,15,30,0.7)] border border-[rgba(14,165,233,0.15)] rounded-xl px-4 py-4 hover:border-[rgba(14,165,233,0.3)] transition-colors"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm font-semibold text-slate-200">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── INTEREST CONSTELLATION ────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              What do you <span className="gradient-text">vibe with</span>?
            </h2>
            <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm">
              Hover any interest to see how many TamilConnect users share it. Our algorithm uses this to find your best match.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Constellation canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="h-80 lg:h-96 rounded-2xl bg-[rgba(3,15,30,0.6)] border border-[rgba(14,165,233,0.12)] overflow-hidden relative"
            >
              <InterestConstellation onTagHover={setHoveredTag} />
            </motion.div>

            {/* Info panel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              <AnimatePresence mode="wait">
                {hoveredTag ? (
                  <motion.div
                    key={hoveredTag.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[rgba(3,15,30,0.85)] border border-[rgba(14,165,233,0.3)] rounded-2xl p-5"
                  >
                    <p className="text-2xl mb-1">{hoveredTag.label}</p>
                    <p className="text-3xl font-bold text-[#38BDF8]">{hoveredTag.count.toLocaleString()}</p>
                    <p className="text-slate-400 text-sm mt-0.5">users share this interest</p>
                    <div className="mt-3 h-1.5 bg-[rgba(14,165,233,0.1)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(hoveredTag.count / 4100) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] rounded-full"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-[rgba(3,15,30,0.5)] border border-[rgba(14,165,233,0.1)] rounded-2xl p-5 text-center"
                  >
                    <p className="text-slate-500 text-sm">← Hover any tag to see its popularity</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-[rgba(3,15,30,0.6)] border border-[rgba(14,165,233,0.1)] rounded-2xl p-5 space-y-3">
                <p className="text-white font-semibold">How matching works</p>
                <div className="space-y-2">
                  {[
                    { step: '1', text: 'You pick your interests in setup' },
                    { step: '2', text: 'Algorithm scores compatibility instantly' },
                    { step: '3', text: 'You\'re matched in under a second' },
                  ].map(s => (
                    <div key={s.step} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {s.step}
                      </div>
                      <p className="text-slate-400 text-sm">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SCROLL MATCH VISUALIZER ───────────────────────────────────────── */}
      <section className="py-10 bg-[rgba(14,165,233,0.02)] border-y border-[rgba(14,165,233,0.07)]">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-4"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Watch a <span className="gradient-text">Match Happen</span>
            </h2>
            <p className="text-slate-400 mt-3 text-sm max-w-md mx-auto">Scroll through to see the matchmaking algorithm connect two people in real time.</p>
          </motion.div>
          <MatchVisualizer />
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Why <span className="gradient-text">TamilConnect</span>?
            </h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">Built for our community with features that matter.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group bg-[rgba(3,15,30,0.7)] border border-[rgba(14,165,233,0.1)] rounded-2xl p-6 hover:border-[rgba(14,165,233,0.35)] transition-all duration-300 relative overflow-hidden cursor-default"
              >
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(14,165,233,0.03)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[rgba(14,165,233,0.15)] to-[rgba(6,182,212,0.08)] border border-[rgba(14,165,233,0.2)] flex items-center justify-center mb-4 group-hover:shadow-md group-hover:shadow-[rgba(14,165,233,0.2)] transition-shadow">
                  <f.icon size={22} className="text-[#0EA5E9]" />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        {/* Soft background pulse */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(14,165,233,0.05)] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Mascot in CTA */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-28"
                onMouseEnter={() => setMascotExcited(true)}
                onMouseLeave={() => setMascotExcited(false)}
              >
                <MascotCharacter excited={mascotExcited} />
              </div>
            </div>

            <p className="font-tamil text-[#06B6D4] text-lg mb-3">இணைவோம், பேசுவோம்</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to connect?</h2>
            <p className="text-slate-400 mb-8">
              Join thousands of Tamil Nadu people already connecting every day.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/register"
                onMouseEnter={() => setMascotExcited(true)}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold text-lg hover:shadow-2xl hover:shadow-[rgba(14,165,233,0.3)] transition-all hover:-translate-y-0.5"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="px-8 py-3.5 rounded-xl border border-[rgba(14,165,233,0.3)] text-[#38BDF8] font-semibold text-lg hover:bg-[rgba(14,165,233,0.08)] transition-all"
              >
                Already a member?
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[rgba(14,165,233,0.1)] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
          © 2026 TamilConnect. Made with ❤️ for Tamil Nadu.
        </div>
      </footer>
    </div>
  )
}
