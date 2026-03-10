import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Smile, X } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'

export default function TextChat({ messages, onSendMessage, isOpen, onToggle }) {
  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput('')
    setShowEmoji(false)
  }

  const onEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji)
    inputRef.current?.focus()
  }

  const unreadCount = messages.filter((m) => !m.isOwn).length

  return (
    <>
      {/* Mobile FAB */}
      <button
        onClick={onToggle}
        className="md:hidden fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[rgba(14,165,233,0.3)]"
      >
        <MessageCircle size={22} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat sidebar */}
      <AnimatePresence>
        {(isOpen || typeof isOpen === 'undefined') && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed md:relative right-0 top-0 md:top-auto h-full w-80 sm:w-96 md:w-80 lg:w-96 bg-[rgba(3,15,30,0.95)] border-l border-[rgba(14,165,233,0.15)] flex flex-col z-40 md:z-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(14,165,233,0.1)]">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <MessageCircle size={16} className="text-[#0EA5E9]" />
                Text Chat
              </h3>
              <button onClick={onToggle} className="p-1 rounded text-slate-400 hover:text-[#0EA5E9] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageCircle size={36} className="mb-2 opacity-40" />
                  <p className="text-sm">Say hello! 👋</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      msg.isOwn
                        ? 'bg-[rgba(14,165,233,0.15)] text-white rounded-br-md border border-[rgba(14,165,233,0.2)]'
                        : 'bg-[rgba(3,15,30,0.8)] text-slate-200 rounded-bl-md border border-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {!msg.isOwn && (
                      <p className="text-[11px] font-medium text-[#38BDF8] mb-0.5">{msg.senderName}</p>
                    )}
                    <p className="break-words">{msg.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Emoji picker */}
            {showEmoji && (
              <div className="px-2 pb-1">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme="dark"
                  width="100%"
                  height={300}
                  searchDisabled
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="px-3 py-3 border-t border-[rgba(14,165,233,0.1)] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-2 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[rgba(14,165,233,0.1)] transition-colors"
              >
                <Smile size={18} />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-[rgba(14,165,233,0.06)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white disabled:opacity-30 transition-opacity"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
