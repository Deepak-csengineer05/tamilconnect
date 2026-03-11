import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Simplified SVG path data for Tamil Nadu's 38 districts
// Coordinates are normalized to a ~400x500 viewBox
const DISTRICTS = [
  { id: 'chennai',         name: 'Chennai',         d: 'M 262 52 L 278 50 L 282 62 L 274 70 L 260 66 Z',                                        cx: 271, cy: 60  },
  { id: 'tiruvallur',      name: 'Tiruvallur',      d: 'M 230 40 L 262 52 L 260 66 L 240 78 L 218 68 L 212 50 Z',                               cx: 240, cy: 58  },
  { id: 'kanchipuram',     name: 'Kanchipuram',     d: 'M 218 68 L 240 78 L 244 96 L 228 106 L 208 96 L 204 78 Z',                              cx: 224, cy: 87  },
  { id: 'chengalpattu',    name: 'Chengalpattu',    d: 'M 240 78 L 274 70 L 282 88 L 268 104 L 244 96 Z',                                       cx: 261, cy: 89  },
  { id: 'villupuram',      name: 'Villupuram',      d: 'M 228 106 L 244 96 L 268 104 L 272 124 L 256 136 L 232 128 L 220 114 Z',               cx: 246, cy: 116 },
  { id: 'cuddalore',       name: 'Cuddalore',       d: 'M 268 104 L 292 100 L 300 118 L 288 134 L 272 124 Z',                                   cx: 284, cy: 117 },
  { id: 'kallakurichi',    name: 'Kallakurichi',    d: 'M 232 128 L 256 136 L 252 154 L 234 158 L 218 146 Z',                                   cx: 237, cy: 143 },
  { id: 'salem',           name: 'Salem',           d: 'M 174 114 L 204 110 L 220 114 L 232 128 L 218 146 L 198 152 L 176 140 L 164 126 Z',    cx: 197, cy: 131 },
  { id: 'dharmapuri',      name: 'Dharmapuri',      d: 'M 148 90 L 178 86 L 204 110 L 174 114 L 164 126 L 140 116 L 132 100 Z',                cx: 168, cy: 103 },
  { id: 'krishnagiri',     name: 'Krishnagiri',     d: 'M 178 86 L 212 80 L 208 96 L 204 110 L 178 86 Z',                                      cx: 198, cy: 93  },
  { id: 'vellore',         name: 'Vellore',         d: 'M 164 68 L 196 62 L 212 80 L 178 86 L 148 90 L 148 74 Z',                              cx: 178, cy: 77  },
  { id: 'ranipet',         name: 'Ranipet',         d: 'M 196 62 L 212 50 L 218 68 L 208 96 L 212 80 L 196 62 Z',                              cx: 207, cy: 72  },
  { id: 'tirupattur',      name: 'Tirupattur',      d: 'M 196 62 L 212 80 L 178 86 L 164 68 Z',                                                cx: 188, cy: 74  },
  { id: 'tiruvannamalai',  name: 'Tiruvannamalai',  d: 'M 204 110 L 228 106 L 220 114 L 204 110 Z M 178 86 L 204 110 L 174 114 Z',            cx: 200, cy: 105 },
  { id: 'namakkal',        name: 'Namakkal',        d: 'M 164 126 L 176 140 L 162 152 L 148 140 L 148 122 Z',                                  cx: 160, cy: 137 },
  { id: 'erode',           name: 'Erode',           d: 'M 132 100 L 164 100 L 164 126 L 148 122 L 124 114 Z',                                  cx: 146, cy: 112 },
  { id: 'tiruppur',        name: 'Tiruppur',        d: 'M 124 114 L 148 122 L 148 140 L 136 152 L 112 148 L 104 132 Z',                        cx: 128, cy: 133 },
  { id: 'coimbatore',      name: 'Coimbatore',      d: 'M 88 108 L 124 100 L 132 100 L 124 114 L 104 132 L 84 122 Z',                          cx: 108, cy: 115 },
  { id: 'nilgiris',        name: 'Nilgiris',        d: 'M 88 86 L 116 80 L 124 100 L 88 108 Z',                                                cx: 103, cy: 94  },
  { id: 'karur',           name: 'Karur',           d: 'M 148 140 L 162 152 L 158 166 L 144 170 L 132 160 L 136 152 Z',                        cx: 147, cy: 157 },
  { id: 'tiruchirappalli', name: 'Tiruchirappalli', d: 'M 162 152 L 176 140 L 198 152 L 210 164 L 200 178 L 180 178 L 164 168 L 158 166 Z',   cx: 183, cy: 165 },
  { id: 'perambalur',      name: 'Perambalur',      d: 'M 198 152 L 218 146 L 234 158 L 224 168 L 210 164 Z',                                  cx: 216, cy: 160 },
  { id: 'ariyalur',        name: 'Ariyalur',        d: 'M 234 158 L 252 154 L 258 170 L 248 182 L 224 168 Z',                                  cx: 242, cy: 168 },
  { id: 'mayiladuthurai',  name: 'Mayiladuthurai',  d: 'M 252 154 L 272 150 L 280 166 L 268 178 L 248 182 L 258 170 Z',                        cx: 263, cy: 167 },
  { id: 'nagapattinam',    name: 'Nagapattinam',    d: 'M 272 150 L 292 148 L 296 166 L 280 174 L 280 166 Z',                                  cx: 284, cy: 161 },
  { id: 'tiruvarur',       name: 'Tiruvarur',       d: 'M 248 182 L 268 178 L 280 174 L 284 192 L 268 200 L 248 192 Z',                        cx: 265, cy: 188 },
  { id: 'thanjavur',       name: 'Thanjavur',       d: 'M 210 164 L 224 168 L 248 182 L 248 192 L 228 196 L 208 182 L 200 178 Z',              cx: 224, cy: 181 },
  { id: 'pudukottai',      name: 'Pudukkottai',     d: 'M 180 178 L 200 178 L 208 182 L 228 196 L 220 212 L 200 218 L 180 206 L 172 192 Z',   cx: 200, cy: 197 },
  { id: 'sivaganga',       name: 'Sivaganga',       d: 'M 200 218 L 220 212 L 238 220 L 234 238 L 214 244 L 198 234 Z',                        cx: 217, cy: 228 },
  { id: 'ramanathapuram',  name: 'Ramanathapuram',  d: 'M 214 244 L 234 238 L 250 248 L 244 268 L 224 272 L 208 260 Z',                        cx: 228, cy: 256 },
  { id: 'virudhunagar',    name: 'Virudhunagar',    d: 'M 172 222 L 198 218 L 198 234 L 214 244 L 208 260 L 186 256 L 164 240 L 168 228 Z',   cx: 186, cy: 239 },
  { id: 'madurai',         name: 'Madurai',         d: 'M 152 196 L 172 192 L 180 206 L 180 224 L 172 222 L 168 228 L 148 218 L 144 200 Z',   cx: 163, cy: 210 },
  { id: 'theni',           name: 'Theni',           d: 'M 128 198 L 152 196 L 144 200 L 148 218 L 136 222 L 120 210 Z',                        cx: 136, cy: 210 },
  { id: 'dindigul',        name: 'Dindigul',        d: 'M 132 160 L 144 170 L 164 168 L 172 192 L 152 196 L 128 198 L 112 186 L 112 168 L 124 160 Z', cx: 140, cy: 180 },
  { id: 'tenkasi',         name: 'Tenkasi',         d: 'M 136 222 L 148 218 L 164 240 L 160 256 L 144 258 L 128 240 Z',                        cx: 146, cy: 240 },
  { id: 'tirunelveli',     name: 'Tirunelveli',     d: 'M 144 258 L 160 256 L 186 256 L 188 276 L 172 286 L 152 278 L 138 268 Z',              cx: 163, cy: 270 },
  { id: 'thoothukudi',     name: 'Thoothukudi',     d: 'M 186 256 L 208 260 L 214 278 L 200 290 L 188 284 L 172 286 L 188 276 Z',             cx: 194, cy: 272 },
  { id: 'kanyakumari',     name: 'Kanyakumari',     d: 'M 152 278 L 172 286 L 188 284 L 182 300 L 162 308 L 148 296 Z',                        cx: 165, cy: 292 },
]

// Simulated online counts per district for the tooltip
const ONLINE_COUNTS = {
  chennai: 142, tiruvallur: 38, kanchipuram: 55, chengalpattu: 67,
  villupuram: 29, cuddalore: 31, kallakurichi: 18, salem: 88,
  dharmapuri: 22, krishnagiri: 26, vellore: 44, ranipet: 19,
  tirupattur: 15, tiruvannamalai: 33, namakkal: 41, erode: 63,
  tiruppur: 71, coimbatore: 104, nilgiris: 24, karur: 36,
  tiruchirappalli: 92, perambalur: 14, ariyalur: 11, mayiladuthurai: 23,
  nagapattinam: 27, tiruvarur: 18, thanjavur: 58, pudukottai: 21,
  sivaganga: 17, ramanathapuram: 25, virudhunagar: 34, madurai: 78,
  theni: 32, dindigul: 45, tenkasi: 19, tirunelveli: 53,
  thoothukudi: 48, kanyakumari: 39,
}

function getIntensity(count) {
  if (count >= 100) return 'high'
  if (count >= 50) return 'medium'
  return 'low'
}

export default function TNMap({ onDistrictSelect, selectedDistrict }) {
  const [hovered, setHovered] = useState(null)
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false })
  const svgRef = useRef(null)

  const getColor = (id) => {
    const intensity = getIntensity(ONLINE_COUNTS[id] || 0)
    if (id === selectedDistrict) return 'rgba(6,182,212,0.7)'
    if (id === hovered) return 'rgba(14,165,233,0.55)'
    if (intensity === 'high')   return 'rgba(14,165,233,0.22)'
    if (intensity === 'medium') return 'rgba(14,165,233,0.14)'
    return 'rgba(14,165,233,0.07)'
  }

  const getStroke = (id) => {
    if (id === selectedDistrict) return 'rgba(6,182,212,0.9)'
    if (id === hovered) return 'rgba(14,165,233,0.8)'
    return 'rgba(14,165,233,0.25)'
  }

  const handleMouseMove = (e, id) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 12, visible: true })
    setHovered(id)
  }

  const handleMouseLeave = () => {
    setHovered(null)
    setTooltip(t => ({ ...t, visible: false }))
  }

  const handleClick = (id) => {
    onDistrictSelect?.(id === selectedDistrict ? null : id)
  }

  const hoveredDistrict = DISTRICTS.find(d => d.id === hovered)

  return (
    <div className="relative w-full h-full select-none">
      <svg
        ref={svgRef}
        viewBox="80 36 230 285"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 24px rgba(14,165,233,0.12))' }}
      >
        {/* Glow defs */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hover-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="selected-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(6,182,212,0.8)" />
            <stop offset="100%" stopColor="rgba(14,165,233,0.5)" />
          </radialGradient>
        </defs>

        {/* Pulse rings on high-activity districts */}
        {DISTRICTS.filter(d => getIntensity(ONLINE_COUNTS[d.id]) === 'high').map(d => (
          <circle
            key={`pulse-${d.id}`}
            cx={d.cx} cy={d.cy} r="8"
            fill="none"
            stroke="rgba(6,182,212,0.3)"
            strokeWidth="1"
            className="animate-ping"
            style={{ animationDuration: '3s', animationDelay: `${d.cx % 2}s` }}
          />
        ))}

        {/* District paths */}
        {DISTRICTS.map(d => (
          <path
            key={d.id}
            d={d.d}
            fill={getColor(d.id)}
            stroke={getStroke(d.id)}
            strokeWidth={d.id === hovered || d.id === selectedDistrict ? 1.5 : 0.8}
            style={{
              cursor: 'pointer',
              transition: 'fill 0.2s, stroke 0.2s',
              filter: d.id === hovered || d.id === selectedDistrict ? 'url(#hover-glow)' : 'url(#glow)',
            }}
            onMouseMove={e => handleMouseMove(e, d.id)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(d.id)}
          />
        ))}

        {/* Activity dots on medium+ districts */}
        {DISTRICTS.filter(d => ONLINE_COUNTS[d.id] >= 30).map(d => (
          <circle
            key={`dot-${d.id}`}
            cx={d.cx} cy={d.cy} r="1.8"
            fill={d.id === selectedDistrict ? '#22D3EE' : 'rgba(14,165,233,0.6)'}
            style={{ pointerEvents: 'none' }}
          />
        ))}

        {/* Selected checkmark */}
        {selectedDistrict && (() => {
          const sel = DISTRICTS.find(d => d.id === selectedDistrict)
          return sel ? (
            <text
              x={sel.cx} y={sel.cy + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="5" fill="white"
              style={{ pointerEvents: 'none', fontWeight: 'bold' }}
            >✓</text>
          ) : null
        })()}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.visible && hoveredDistrict && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.12 }}
            className="absolute pointer-events-none z-20 bg-[rgba(3,15,30,0.96)] border border-[rgba(14,165,233,0.35)] rounded-xl px-3 py-2 shadow-xl shadow-[rgba(14,165,233,0.15)] min-w-[130px]"
            style={{ left: tooltip.x + 12, top: tooltip.y - 24 }}
          >
            <p className="text-white font-semibold text-xs">{hoveredDistrict.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 text-[10px] font-medium">
                {ONLINE_COUNTS[hoveredDistrict.id] || 0} online now
              </span>
            </div>
            {hoveredDistrict.id === selectedDistrict
              ? <p className="text-[#38BDF8] text-[10px] mt-0.5">Click to deselect</p>
              : <p className="text-slate-500 text-[10px] mt-0.5">Click to filter</p>
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-col gap-1 pointer-events-none">
        {[
          { color: 'rgba(14,165,233,0.22)', label: '100+ online' },
          { color: 'rgba(14,165,233,0.14)', label: '50–99 online' },
          { color: 'rgba(14,165,233,0.07)', label: '<50 online' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm border border-[rgba(14,165,233,0.3)]" style={{ background: l.color }} />
            <span className="text-[9px] text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
