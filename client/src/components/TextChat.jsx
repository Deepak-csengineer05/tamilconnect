import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Smile, X, ChevronDown } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'

export default function TextChat({ messages, onSendMessage, onTyping, partnerTyping, partnerName, isOpen, onToggle }) {
  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimerRef = useRef(null)

  useEffect(() => {
    if (atBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewMsgCount(0)
    } else {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && !lastMsg.isOwn) setNewMsgCount((c) => c + 1)
    }
  }, [messages])

  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setAtBottom(isBottom)
    if (isBottom) setNewMsgCount(0)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAtBottom(true)
    setNewMsgCount(0)
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput('')
    setShowEmoji(false)
    clearTimeout(typingTimerRef.current)
    onTyping?.(false)
    setAtBottom(true)
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    onTyping?.(true)
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => onTyping?.(false), 2000)
  }

  const onEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji)
    inputRef.current?.focus()
  }

  // Group consecutive messages from same sender
  const groupedMessages = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].isOwn !== msg.isOwn,
    isLast: i === messages.length - 1 || messages[i + 1].isOwn !== msg.isOwn,
  }))

  const unreadCount = messages.filter((m) => !m.isOwn).length

  return (
    <>
      {/* Mobile FAB */}
      <button
        onClick={onToggle}
        className="md:hidden fixed bottom-6 right-4 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-[rgba(14,165,233,0.3)]"
      >
        <MessageCircle size={20} className="text-white" />
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
            className="fixed md:relative right-0 top-0 md:top-auto h-full w-80 sm:w-96 md:w-80 lg:w-96 bg-[rgba(2,11,24,0.98)] border-l border-[rgba(14,165,233,0.15)] flex flex-col z-40 md:z-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(14,165,233,0.1)] shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-[#0EA5E9]" />
                <span className="font-semibold text-white text-sm">Text Chat</span>
                <AnimatePresence>
                  {partnerTyping && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="text-[11px] text-[#22D3EE] italic"
                    >
                      typing...
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={onToggle} className="p-1 rounded text-slate-400 hover:text-[#0EA5E9] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 py-3 min-h-0"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                  <MessageCircle size={36} className="opacity-25" />
                  <p className="text-sm text-center">
                    Say hi to <span className="text-[#38BDF8]">{partnerName || 'your match'}</span>! 👋
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {groupedMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex flex-col ${
                        msg.isOwn ? 'items-end' : 'items-start'
                      } ${msg.isFirst ? 'mt-3' : 'mt-0.5'}`}
                    >
                      {!msg.isOwn && msg.isFirst && (
                        <span className="text-[11px] font-medium text-[#38BDF8] mb-1 ml-1">
                          {msg.senderName}
                        </span>
                      )}
                      <div
                        className={`max-w-[82%] px-3.5 py-2 text-sm leading-relaxed ${
                          msg.isOwn
                            ? `bg-gradient-to-br from-[rgba(14,165,233,0.22)] to-[rgba(6,182,212,0.14)] text-white border border-[rgba(14,165,233,0.22)] ${
                                msg.isFirst && msg.isLast ? 'rounded-2xl rounded-tr-sm'
                                : msg.isFirst ? 'rounded-t-2xl rounded-tr-sm rounded-bl-2xl rounded-br-lg'
                                : msg.isLast ? 'rounded-b-2xl rounded-br-sm rounded-tl-2xl rounded-tr-lg'
                                : 'rounded-l-2xl rounded-r-lg'
                              }`
                            : `bg-[rgba(255,255,255,0.05)] text-slate-200 border border-[rgba(255,255,255,0.07)] ${
                                msg.isFirst && msg.isLast ? 'rounded-2xl rounded-tl-sm'
                                : msg.isFirst ? 'rounded-t-2xl rounded-tl-sm rounded-br-2xl rounded-bl-lg'
                                : msg.isLast ? 'rounded-b-2xl rounded-bl-sm rounded-tr-2xl rounded-tl-lg'
                                : 'rounded-r-2xl rounded-l-lg'
                              }`
                        }`}
                      >
                        <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                        {msg.isLast && (
                          <p className="text-[10px] text-slate-500 mt-1 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {partnerTyping && (
                      <motion.div
                        key="typing"
                        initial={{ opacity: 0, y: 6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        className="flex items-start mt-3"
                      >
                        <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-bounce" style={{ animationDelay: '160ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-bounce" style={{ animationDelay: '320ms' }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {!atBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-[72px] right-4 z-10 w-8 h-8 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shadow-lg shadow-[rgba(14,165,233,0.4)]"
                >
                  <ChevronDown size={16} />
                  {newMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center">
                      {newMsgCount}
                    </span>
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Emoji picker */}
            {showEmoji && (
              <div className="px-2 pb-1 shrink-0">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme="dark"
                  width="100%"
                  height={260}
                  searchDisabled
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="px-3 py-3 border-t border-[rgba(14,165,233,0.1)] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className={`p-2 rounded-lg transition-colors shrink-0 ${
                  showEmoji
                    ? 'text-[#0EA5E9] bg-[rgba(14,165,233,0.12)]'
                    : 'text-slate-400 hover:text-[#0EA5E9] hover:bg-[rgba(14,165,233,0.08)]'
                }`}
              >
                <Smile size={18} />
              </button>

              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleSend(e)
                  }}
                  placeholder="Type a message..."
                  maxLength={500}
                  className="w-full bg-[rgba(14,165,233,0.06)] border border-[rgba(14,165,233,0.15)] rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] transition-colors"
                />
                {input.length > 400 && (
                  <span
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none ${
                      input.length >= 500 ? 'text-red-400' : 'text-slate-500'
                    }`}
                  >
                    {500 - input.length}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white disabled:opacity-30 transition-all hover:shadow-md hover:shadow-[rgba(14,165,233,0.3)] shrink-0"
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
