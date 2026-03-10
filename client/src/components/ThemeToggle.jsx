import { useTheme } from '../context/ThemeContext'
import './ThemeToggle.css'

export default function ThemeToggle() {
  const { isTeal, toggleTheme } = useTheme()

  return (
    <div
      className="tc-container"
      title={isTeal ? 'Switch to Dark theme' : 'Switch to Teal theme'}
    >
      <label className="tc-switch">
        <input className="tc-togglesw" type="checkbox" checked={isTeal} onChange={toggleTheme} />
        <div className="tc-indicator tc-left"></div>
        <div className="tc-indicator tc-right"></div>
        <div className="tc-btn"></div>
      </label>
    </div>
  )
}
