import { useState } from 'react'
import type { Area, AreaType } from '../types/game'
import './ClickerArea.css'

interface ClickerAreaProps {
  area: Area
  currentArea: AreaType
  clickAmount: number
  onAreaClick: () => void
}

// Area decorations (ASCII art placeholders)
const areaDecorations: Record<AreaType, string> = {
  meadow: `
    *  .  *
  .    *    .
    .  *  .
  *    .    *
`,
  'rainbow-falls': `
    ~ ~ ~ ~
   ~  ~ ~  ~
    ~ ~ ~ ~
   ~~~~~~~~
`,
  'dream-garden': `
    @ o @ o
   o  @  o  @
    @ o @ o
   o  @  o  @
`,
  'heart-cave': `
    <3  <>
   <>  <3  <>
    <>  <3
   <3  <>  <3
`,
}

export function ClickerArea({ area, clickAmount, onAreaClick }: ClickerAreaProps) {
  const [clickEffect, setClickEffect] = useState<{ x: number; y: number; id: number }[]>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setClickEffect((prev) => [...prev.slice(-5), { x, y, id }])
    setTimeout(() => {
      setClickEffect((prev) => prev.filter((effect) => effect.id !== id))
    }, 600)

    onAreaClick()
  }

  return (
    <div className="clicker-area" style={{ '--area-bg': getAreaBg(area.id) } as React.CSSProperties}>
      <div className="area-title">.: {area.name} :.</div>
      <div className="area-description">{area.description}</div>

      <button className="clicker-button" onClick={handleClick}>
        <pre className="area-decoration">{areaDecorations[area.id]}</pre>
        <div className="click-prompt">[ Click to Gather ]</div>
        <div className="click-amount">+{clickAmount} per click</div>

        {clickEffect.map((effect) => (
          <span
            key={effect.id}
            className="click-effect"
            style={{ left: effect.x, top: effect.y }}
          >
            +{clickAmount}
          </span>
        ))}
      </button>
    </div>
  )
}

function getAreaBg(areaId: AreaType): string {
  switch (areaId) {
    case 'meadow':
      return '#E8F5E9'
    case 'rainbow-falls':
      return '#E3F2FD'
    case 'dream-garden':
      return '#FFF3E0'
    case 'heart-cave':
      return '#FCE4EC'
    default:
      return '#F5F5F5'
  }
}
