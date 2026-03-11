import { useEffect, useRef, useState } from 'react'

const INTERESTS = [
  { label: 'Cricket 🏏', count: 2840 },
  { label: 'Music 🎵',   count: 3210 },
  { label: 'Movies 🎬',  count: 2970 },
  { label: 'Tech 💻',    count: 1850 },
  { label: 'Food 🍛',    count: 2200 },
  { label: 'Tamil 🗣️',  count: 4100 },
  { label: 'Dance 💃',   count: 1640 },
  { label: 'Gaming 🎮',  count: 1320 },
  { label: 'Travel ✈️',  count: 1080 },
  { label: 'Art 🎨',     count: 900  },
  { label: 'Fitness 🏋️', count: 1150 },
  { label: 'Study 📚',   count: 780  },
]

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

export default function InterestConstellation({ onTagHover }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const tagsRef = useRef([])
  const rafRef = useRef(null)
  const [hoveredTag, setHoveredTag] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      init()
    }

    const init = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      tagsRef.current = INTERESTS.map((tag, i) => {
        const angle = (i / INTERESTS.length) * Math.PI * 2
        const radius = randomBetween(W * 0.18, W * 0.42)
        const cx = W / 2
        const cy = H / 2
        return {
          ...tag,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: randomBetween(-0.25, 0.25),
          vy: randomBetween(-0.25, 0.25),
          baseX: cx + Math.cos(angle) * radius,
          baseY: cy + Math.sin(angle) * radius,
          fontSize: randomBetween(11, 15),
          alpha: randomBetween(0.55, 0.85),
          hovered: false,
          pulseT: Math.random() * Math.PI * 2,
          w: 0,
          h: 0,
        }
      })
    }

    const getTextWidth = (tag) => {
      ctx.font = `${tag.fontSize}px sans-serif`
      return ctx.measureText(tag.label).width
    }

    const draw = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Update tag sizes
      tagsRef.current.forEach(tag => {
        const tw = getTextWidth(tag)
        tag.w = tw + 20
        tag.h = tag.fontSize + 14
      })

      // Check hover
      let newHovered = null
      tagsRef.current.forEach(tag => {
        tag.hovered = mx >= tag.x - tag.w / 2 &&
          mx <= tag.x + tag.w / 2 &&
          my >= tag.y - tag.h / 2 &&
          my <= tag.y + tag.h / 2
        if (tag.hovered) newHovered = tag
      })
      setHoveredTag(prev => {
        if (newHovered?.label !== prev?.label) {
          onTagHover?.(newHovered)
          return newHovered
        }
        return prev
      })

      // Drift tags gently back toward baseX/baseY
      tagsRef.current.forEach(tag => {
        tag.pulseT += 0.014
        tag.x += tag.vx + (tag.baseX - tag.x) * 0.003
        tag.y += tag.vy + (tag.baseY - tag.y) * 0.003

        // Slight mouse repulsion
        const dx = tag.x - mx
        const dy = tag.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100 && dist > 0) {
          const force = (100 - dist) / 100 * 0.4
          tag.x += (dx / dist) * force
          tag.y += (dy / dist) * force
        }
      })

      // Draw connection lines between nearby tags
      const tags = tagsRef.current
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const dx = tags[i].x - tags[j].x
          const dy = tags[i].y - tags[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.18 *
              (tags[i].hovered || tags[j].hovered ? 5 : 1)
            ctx.beginPath()
            ctx.moveTo(tags[i].x, tags[i].y)
            ctx.lineTo(tags[j].x, tags[j].y)
            ctx.strokeStyle = `rgba(14,165,233,${Math.min(alpha, 0.9)})`
            ctx.lineWidth = tags[i].hovered || tags[j].hovered ? 1.2 : 0.5
            ctx.stroke()
          }
        }
      }

      // Draw tags
      tags.forEach(tag => {
        const scale = tag.hovered ? 1.25 : 1 + Math.sin(tag.pulseT) * 0.03
        const alpha = tag.hovered ? 1 : tag.alpha
        const fs = tag.fontSize * scale
        const tw = getTextWidth({ ...tag, fontSize: fs })
        const pw = tw + 20
        const ph = fs + 14

        ctx.save()
        ctx.translate(tag.x, tag.y)

        // Pill background
        const bgAlpha = tag.hovered ? 0.35 : 0.12
        ctx.fillStyle = `rgba(14,165,233,${bgAlpha})`
        ctx.beginPath()
        ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2)
        ctx.fill()

        // Border
        ctx.strokeStyle = tag.hovered
          ? `rgba(6,182,212,0.9)`
          : `rgba(14,165,233,${alpha * 0.5})`
        ctx.lineWidth = tag.hovered ? 1.5 : 0.8
        ctx.stroke()

        // Glow on hover
        if (tag.hovered) {
          ctx.shadowColor = 'rgba(6,182,212,0.6)'
          ctx.shadowBlur = 12
        }

        // Text
        ctx.font = `${tag.hovered ? 'bold ' : ''}${fs}px sans-serif`
        ctx.fillStyle = tag.hovered ? '#22D3EE' : `rgba(148,210,255,${alpha})`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(tag.label, 0, 0)

        ctx.restore()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    resize()
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleMouseLeave = () => {
    mouseRef.current = { x: -9999, y: -9999 }
    setHoveredTag(null)
    onTagHover?.(null)
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: hoveredTag ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {/* Central label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-[rgba(3,15,30,0.85)] border border-[rgba(14,165,233,0.2)] rounded-full w-20 h-20 flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-400">hover a</span>
          <span className="text-xs font-bold text-[#38BDF8]">interest</span>
        </div>
      </div>
    </div>
  )
}
