import { motion } from 'framer-motion'

const INTERESTS = [
  { label: 'Music', emoji: '🎵' },
  { label: 'Movies', emoji: '🎬' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Cricket', emoji: '🏏' },
  { label: 'Cooking', emoji: '🍳' },
  { label: 'Travel', emoji: '✈️' },
  { label: 'Tech', emoji: '💻' },
  { label: 'Memes', emoji: '😂' },
  { label: 'Politics', emoji: '🏛️' },
  { label: 'Education', emoji: '📚' },
]

export default function InterestTags({ selected = [], onChange, readonly = false }) {
  const toggle = (label) => {
    if (readonly) return
    if (selected.includes(label)) {
      onChange(selected.filter((s) => s !== label))
    } else {
      onChange([...selected, label])
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {INTERESTS.map((item, i) => {
        const isSelected = selected.includes(item.label)
        return (
          <motion.button
            key={item.label}
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => toggle(item.label)}
            disabled={readonly}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              isSelected
                ? 'bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white border border-[#0EA5E9] shadow-md shadow-[rgba(14,165,233,0.3)]'
                : 'bg-[rgba(14,165,233,0.07)] text-slate-300 border border-[rgba(14,165,233,0.18)] hover:border-[rgba(14,165,233,0.4)] hover:text-[#38BDF8] hover:bg-[rgba(14,165,233,0.13)]'
            } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span>{item.emoji}</span>
            <span>{item.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
