import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Video, Shield, Languages, Zap, Heart, Users, MapPin, MessageSquare } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
}

const STATS = [
  { label: '38 Districts', icon: '🗺️' },
  { label: '2 Languages', icon: '🗣️' },
  { label: '10+ Interests', icon: '✨' },
  { label: '0ms Delay', icon: '⚡' },
]

const FEATURES = [
  { icon: Sparkles, title: 'Smart Matchmaking', desc: 'Our algorithm pairs you with people who share your district, language, and interests for the best conversations.' },
  { icon: Video, title: 'HD Video Chat', desc: 'Crystal-clear video powered by WebRTC — no downloads required. Just open your browser and start talking.' },
  { icon: Shield, title: 'Safe Community', desc: 'Report system, auto-flagging, and moderation to keep TamilConnect a safe, respectful space for everyone.' },
  { icon: Languages, title: 'Tamil & English', desc: 'Chat in Tamil, English, or both. We match you with people who speak your preferred language.' },
  { icon: Zap, title: 'Instant Connect', desc: "Jump in and out of conversations instantly. Skip, end call, or find a new match — it's all one click away." },
  { icon: Heart, title: 'Interest Based', desc: 'Tag your hobbies — cricket, music, tech, movies — and meet people who vibe with the same things.' },
]

const STEPS = [
  { num: '01', title: 'Create Your Profile', desc: 'Pick your district, language preference, and interests. It takes less than a minute.' },
  { num: '02', title: 'Get Matched', desc: 'Our smart algorithm finds the best match for you from thousands of active Tamil Nadu users.' },
  { num: '03', title: 'Start Talking!', desc: 'Video chat, text, share interests — make new friends across the 38 districts of Tamil Nadu.' },
]

export default function Landing() {
  const { isTeal } = useTheme()
  const accentDot = isTeal ? 'rgba(45,212,191,0.4)' : 'rgba(14,165,233,0.4)'
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* BG effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[rgba(14,165,233,0.08)] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[rgba(6,182,212,0.06)] rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(${accentDot} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center py-20">
          {/* Left */}
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-[rgba(14,165,233,0.08)] border border-[rgba(14,165,233,0.2)] rounded-full px-4 py-1.5">
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
              Meet people from all 38 districts, chat in Tamil or English, and make real connections based on shared interests. Free, instant, and built for our community.
            </motion.p>

            <motion.div variants={fadeUp} custom={4} className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/register"
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold text-base hover:shadow-xl hover:shadow-[rgba(14,165,233,0.25)] transition-all hover:-translate-y-0.5"
              >
                Start Chatting Free
              </Link>
              <Link
                to="/login"
                className="px-7 py-3 rounded-xl border border-[rgba(14,165,233,0.3)] text-[#38BDF8] font-semibold text-base hover:bg-[rgba(14,165,233,0.08)] transition-all"
              >
                I have an account
              </Link>
            </motion.div>
          </motion.div>

          {/* Right — floating preview card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative hidden lg:flex justify-center items-center"
          >
            <div className="animate-float relative">
              <div className="w-80 h-[420px] rounded-2xl bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.2)] shadow-2xl shadow-[rgba(14,165,233,0.1)] overflow-hidden">
                {/* Mock video area */}
                <div className="h-60 bg-gradient-to-br from-[rgba(14,165,233,0.1)] to-[rgba(6,182,212,0.05)] flex items-center justify-center relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-3xl font-bold text-white">
                    P
                  </div>
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-green-300">Connected</span>
                  </div>
                  {/* Local PIP mock */}
                  <div className="absolute bottom-3 right-3 w-16 h-20 rounded-lg bg-[rgba(14,165,233,0.15)] border border-[rgba(14,165,233,0.3)] flex items-center justify-center">
                    <span className="text-xs text-slate-400">You</span>
                  </div>
                </div>
                {/* Mock profile */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white text-sm">Priya K.</p>
                      <p className="text-xs text-slate-500">Chennai</p>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[rgba(14,165,233,0.15)] text-[#38BDF8] border border-[rgba(14,165,233,0.3)]">Tamil</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['Music 🎵', 'Movies 🎬', 'Cricket 🏏'].map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(6,182,212,0.1)] text-[#22D3EE] border border-[rgba(6,182,212,0.2)]">{t}</span>
                    ))}
                  </div>
                  {/* Mock chat */}
                  <div className="bg-[rgba(14,165,233,0.06)] rounded-lg p-2.5 space-y-1.5">
                    <p className="text-xs text-[#38BDF8]">Priya: <span className="text-slate-300">Hey! You like AR Rahman too? 🎶</span></p>
                    <p className="text-xs text-[#22D3EE]">You: <span className="text-slate-300">Yes! Favourite album?</span></p>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatType: 'loop' }}
                className="absolute -top-4 -right-6 bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.3)] rounded-full px-3 py-1.5 shadow-lg"
              >
                <span className="text-xs font-medium text-[#38BDF8]">✨ New Match!</span>
              </motion.div>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatType: 'loop', delay: 0.5 }}
                className="absolute -bottom-3 -left-6 bg-[rgba(3,15,30,0.95)] border border-[rgba(6,182,212,0.3)] rounded-full px-3 py-1.5 shadow-lg"
              >
                <span className="text-xs font-medium text-[#22D3EE]">1,200+ Online</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8 border-y border-[rgba(14,165,233,0.1)]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-center gap-3 bg-[rgba(3,15,30,0.7)] border border-[rgba(14,165,233,0.15)] rounded-xl px-4 py-4"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm font-semibold text-slate-200">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
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
                className="group bg-[rgba(3,15,30,0.7)] border border-[rgba(14,165,233,0.1)] rounded-2xl p-6 hover:border-[rgba(14,165,233,0.3)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[rgba(14,165,233,0.15)] to-[rgba(6,182,212,0.1)] border border-[rgba(14,165,233,0.2)] flex items-center justify-center mb-4 group-hover:shadow-md group-hover:shadow-[rgba(14,165,233,0.15)] transition-shadow">
                  <f.icon size={22} className="text-[#0EA5E9]" />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[rgba(14,165,233,0.02)]">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              How It <span className="gradient-text">Works</span>
            </h2>
          </motion.div>

          <div className="space-y-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex items-start gap-6 bg-[rgba(3,15,30,0.7)] border border-[rgba(14,165,233,0.1)] rounded-2xl p-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center text-xl font-bold text-white shrink-0">
                  {s.num}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{s.title}</h3>
                  <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="font-tamil text-[#06B6D4] text-lg mb-3">இணைவோம், பேசுவோம்</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to connect?</h2>
            <Link
              to="/register"
              className="inline-block px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold text-lg hover:shadow-xl hover:shadow-[rgba(14,165,233,0.25)] transition-all hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(14,165,233,0.1)] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
          © 2026 TamilConnect. Made with ❤️ for Tamil Nadu.
        </div>
      </footer>
    </div>
  )
}