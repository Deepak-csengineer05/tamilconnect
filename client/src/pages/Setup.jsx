import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, Languages, Sparkles, ChevronRight, ChevronLeft, Check, Search, X, Smile } from 'lucide-react'
import InterestTags from '../components/InterestTags'
import toast from 'react-hot-toast'

const DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
  'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
  'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar',
]

const STEP_ICONS = [User, Smile, MapPin, Languages, Sparkles]
const STEP_LABELS = ['Name', 'Gender', 'Location', 'Language', 'Interests']

export default function Setup() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState('')
  const [district, setDistrict] = useState('')
  const [language, setLanguage] = useState('')
  const [interests, setInterests] = useState([])
  const [districtModalOpen, setDistrictModalOpen] = useState(false)
  const [districtSearch, setDistrictSearch] = useState('')

  const canProceed = () => {
    if (step === 0) return displayName.trim().length > 0
    if (step === 1) return gender !== ''
    if (step === 2) return district !== ''
    if (step === 3) return language !== ''
    if (step === 4) return interests.length > 0
    return false
  }

  const handleNext = () => {
    if (!canProceed()) {
      toast.error('Please complete this step')
      return
    }
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!canProceed()) {
      toast.error('Please select at least one interest')
      return
    }
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: displayName.trim(), gender, district, language, interests }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      setLoading(false)
      toast.success("Profile created! Let's start chatting.")
      window.location.href = '/chat'
    } catch (err) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  const progressWidth = `${((step + 1) / 5) * 100}%`

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-[rgba(3,15,30,0.95)] border border-[rgba(14,165,233,0.15)] rounded-2xl overflow-hidden shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4]" />

          <div className="p-8">
            <h2 className="text-2xl font-bold text-white text-center mb-1">Set Up Your Profile</h2>
            <p className="text-slate-400 text-sm text-center mb-8">Step {step + 1} of 5</p>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {STEP_ICONS.map((Icon, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    i < step
                      ? 'bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] text-white'
                      : i === step
                      ? 'border-2 border-[#0EA5E9] text-[#0EA5E9]'
                      : 'border border-[rgba(14,165,233,0.15)] text-slate-600'
                  }`}
                >
                  {i < step ? <Check size={16} /> : <Icon size={16} />}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-[rgba(14,165,233,0.1)] rounded-full mb-8 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] rounded-full"
                animate={{ width: progressWidth }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-300">What should we call you?</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
                      placeholder="Enter your name"
                      className="w-full bg-[rgba(14,165,233,0.04)] border border-[rgba(14,165,233,0.15)] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] transition-colors"
                    />
                    <p className="text-xs text-slate-500 text-right">{displayName.length}/30</p>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-300">How do you identify?</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'Male',              label: '♂ Male' },
                        { value: 'Female',            label: '♀ Female' },
                        { value: 'Non-binary',        label: '⚧ Non-binary' },
                        { value: 'Prefer not to say', label: '🤐 Prefer not to say' },
                      ].map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setGender(g.value)}
                          className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                            gender === g.value
                              ? 'bg-gradient-to-r from-[rgba(14,165,233,0.15)] to-[rgba(6,182,212,0.15)] border-[rgba(14,165,233,0.4)] text-[#38BDF8]'
                              : 'border-[rgba(14,165,233,0.1)] text-slate-400 hover:border-[rgba(14,165,233,0.25)]'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-300">Which district are you from?</label>

                    {/* Trigger button */}
                    <button
                      type="button"
                      onClick={() => { setDistrictSearch(''); setDistrictModalOpen(true) }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                        district
                          ? 'border-[#0EA5E9] bg-[rgba(14,165,233,0.08)] text-white'
                          : 'border-[rgba(14,165,233,0.15)] bg-[rgba(14,165,233,0.04)] text-slate-400 hover:border-[rgba(14,165,233,0.35)]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin size={15} className={district ? 'text-[#0EA5E9]' : 'text-slate-500'} />
                        {district || 'Tap to choose your district'}
                      </span>
                      <ChevronRight size={14} className="text-slate-500" />
                    </button>

                    {district && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-[#38BDF8] flex items-center gap-1"
                      >
                        <Check size={11} /> {district} selected
                      </motion.p>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-300">Preferred chat language</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'Tamil', label: '🇮🇳 Tamil' },
                        { value: 'English', label: '🌐 English' },
                        { value: 'Both', label: '🔄 Both' },
                      ].map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => setLanguage(lang.value)}
                          className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                            language === lang.value
                              ? 'bg-gradient-to-r from-[rgba(14,165,233,0.15)] to-[rgba(6,182,212,0.15)] border-[rgba(14,165,233,0.4)] text-[#38BDF8]'
                              : 'border-[rgba(14,165,233,0.1)] text-slate-400 hover:border-[rgba(14,165,233,0.25)]'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-300">Pick your interests</label>
                    <InterestTags selected={interests} onChange={setInterests} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 rounded-xl border border-[rgba(14,165,233,0.15)] text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              {step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-1"
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed() || loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white font-semibold text-sm disabled:opacity-40 transition-all"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* District Picker Modal */}
      <AnimatePresence>
        {districtModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDistrictModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />

            {/* Modal panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg"
            >
              <div className="bg-[#020B18] border border-[rgba(14,165,233,0.25)] rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[rgba(14,165,233,0.1)]">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <MapPin size={16} className="text-[#0EA5E9]" /> Choose Your District
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tamil Nadu — {DISTRICTS.length} districts</p>
                  </div>
                  <button
                    onClick={() => setDistrictModalOpen(false)}
                    className="w-8 h-8 rounded-full border border-[rgba(14,165,233,0.2)] flex items-center justify-center text-slate-400 hover:text-white hover:border-[rgba(14,165,233,0.5)] transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-[rgba(14,165,233,0.08)]">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      placeholder="Search district..."
                      className="w-full pl-9 pr-4 py-2.5 bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] transition-colors"
                    />
                    {districtSearch && (
                      <button onClick={() => setDistrictSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chips grid */}
                <div className="px-5 py-4 max-h-64 overflow-y-auto flex flex-wrap gap-2.5">
                  {DISTRICTS.filter((d) =>
                    d.toLowerCase().includes(districtSearch.toLowerCase())
                  ).map((d) => {
                    const isSelected = district === d
                    return (
                      <motion.button
                        key={d}
                        type="button"
                        whileTap={{ scale: 0.93 }}
                        onClick={() => {
                          setDistrict(d)
                          setDistrictModalOpen(false)
                          setDistrictSearch('')
                        }}
                        className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white border-[#0EA5E9] shadow-md shadow-[rgba(14,165,233,0.35)]'
                            : 'bg-[rgba(14,165,233,0.05)] text-slate-300 border-[rgba(14,165,233,0.15)] hover:border-[rgba(14,165,233,0.45)] hover:text-[#38BDF8] hover:bg-[rgba(14,165,233,0.12)]'
                        }`}
                      >
                        {isSelected && <Check size={11} className="inline mr-1" />}
                        {d}
                      </motion.button>
                    )
                  })}
                  {DISTRICTS.filter((d) =>
                    d.toLowerCase().includes(districtSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-sm text-slate-500 py-4 w-full text-center">No districts match "{districtSearch}"</p>
                  )}
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
