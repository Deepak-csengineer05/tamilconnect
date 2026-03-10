import { useTheme } from '../context/ThemeContext'
import './ThemeToggle.css'

export default function ThemeToggle() {
  const { isTeal, toggleTheme } = useTheme()

  return (
    <label
      className="tc-switch"
      title={isTeal ? 'Switch to Dark theme' : 'Switch to Teal theme'}
    >
      <input type="checkbox" checked={isTeal} onChange={toggleTheme} />
      <div className="tc-btn">
        <div className="tc-light" />
        <div className="tc-dots" />
        <div className="tc-chars" />
        <div className="tc-shine" />
        <div className="tc-shadow" />
      </div>
    </label>
  )
}
