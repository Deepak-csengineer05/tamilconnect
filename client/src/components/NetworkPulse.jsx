import { useEffect, useRef } from 'react'

export default function NetworkPulse({ className }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef(null)
  const nodesRef = useRef([])
  const flashesRef = useRef([])

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
      const count = Math.min(60, Math.floor((W * H) / 14000))
      nodesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.4 + 0.2,
        pulseT: Math.random() * Math.PI * 2,
      }))
    }

    // Randomly fire a "match flash" between two nodes
    const maybeFlash = () => {
      const nodes = nodesRef.current
      if (nodes.length < 2) return
      const i = Math.floor(Math.random() * nodes.length)
      let j = Math.floor(Math.random() * nodes.length)
      while (j === i) j = Math.floor(Math.random() * nodes.length)
      flashesRef.current.push({ i, j, t: 1.0 })
    }
    const flashInterval = setInterval(maybeFlash, 800)

    const draw = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      const nodes = nodesRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Move nodes
      nodes.forEach(n => {
        n.pulseT += 0.02
        n.x += n.vx
        n.y += n.vy

        // Bounce off walls
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
        n.x = Math.max(0, Math.min(W, n.x))
        n.y = Math.max(0, Math.min(H, n.y))

        // Gentle mouse repulsion
        const dx = n.x - mx
        const dy = n.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 80 && dist > 0) {
          const f = (80 - dist) / 80 * 0.6
          n.x += (dx / dist) * f
          n.y += (dy / dist) * f
        }
      })

      // Draw static connection lines between close nodes
      const MAX_DIST = 100
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.12
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(14,165,233,${alpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // Draw animated "match flash" lines
      flashesRef.current = flashesRef.current.filter(f => f.t > 0)
      flashesRef.current.forEach(f => {
        const a = nodes[f.i]
        const b = nodes[f.j]
        if (!a || !b) return
        const alpha = f.t * 0.85
        const grd = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
        grd.addColorStop(0, `rgba(6,182,212,${alpha})`)
        grd.addColorStop(0.5, `rgba(34,211,238,${alpha})`)
        grd.addColorStop(1, `rgba(6,182,212,${alpha})`)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = grd
        ctx.lineWidth = f.t * 2
        ctx.stroke()

        // Glow halos at endpoints
        ctx.beginPath()
        ctx.arc(a.x, a.y, 3 + f.t * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(6,182,212,${alpha * 0.5})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(b.x, b.y, 3 + f.t * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(6,182,212,${alpha * 0.5})`
        ctx.fill()

        f.t -= 0.018
      })

      // Draw nodes
      nodes.forEach(n => {
        const pulse = 1 + Math.sin(n.pulseT) * 0.25
        const r = n.r * pulse
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(14,165,233,${n.alpha})`
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    resize()
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
      clearInterval(flashInterval)
    }
  }, [])

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseLeave = () => {
    mouseRef.current = { x: -9999, y: -9999 }
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  )
}
