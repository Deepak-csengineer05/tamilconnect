import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const REASONS = [
  { value: 'Inappropriate content', icon: '🚫', desc: 'Nudity or inappropriate behavior' },
  { value: 'Harassment', icon: '😡', desc: 'Verbal abuse or bullying' },
  { value: 'Spam', icon: '📧', desc: 'Advertising or spam content' },
  { value: 'Underage', icon: '👶', desc: 'User appears to be underage' },
]

export default function ReportModal({ isOpen, onClose, reportedUid, onReported }) {
  const { getToken } = useAuth()
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selected) {
      toast.error('Please select a reason')
      return
    }
    setSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reportedId: reportedUid, reason: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to report')
      toast.success('Report submitted. Thank you for keeping the community safe.')
      onClose()
      onReported?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[rgba(3,15,30,0.98)] border border-[rgba(14,165,233,0.2)] rounded-2xl p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Report User</h3>
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            {/* Reasons */}
            <div className="space-y-2.5 mb-5">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelected(r.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-start gap-3 ${
                    selected === r.value
                      ? 'bg-[rgba(6,182,212,0.1)] border-[rgba(6,182,212,0.4)] text-white'
                      : 'bg-transparent border-[rgba(14,165,233,0.1)] text-slate-400 hover:border-[rgba(14,165,233,0.25)]'
                  }`}
                >
                  <span className="text-xl">{r.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{r.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
              <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/80">
                False reports may result in your own account being flagged. Only report genuine violations.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[rgba(14,165,233,0.15)] text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
