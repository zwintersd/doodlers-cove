import { useState, useRef, useEffect, useCallback } from 'react'
import type { Area, AreaType } from '../types/game'
import './ClickerArea.css'

interface ClickerAreaProps {
  area: Area
  currentArea: AreaType
  clickAmount: number
  onAreaClick: () => void
}

interface Point {
  x: number
  y: number
  pressure: number
}

export function ClickerArea({ area, clickAmount, onAreaClick }: ClickerAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPoint = useRef<Point | null>(null)
  const scribbleLength = useRef(0)
  const [accumulatedGathers, setAccumulatedGathers] = useState(0)

  // Clear canvas periodically or on area change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    scribbleLength.current = 0
  }, [area.id])

  const startDrawing = (e: React.PointerEvent) => {
    setIsDrawing(true)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    lastPoint.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    }
  }

  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !lastPoint.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const currentPoint: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    }

    // Calculate distance for gathering logic
    const dist = Math.sqrt(
      Math.pow(currentPoint.x - lastPoint.current.x, 2) +
      Math.pow(currentPoint.y - lastPoint.current.y, 2)
    )
    scribbleLength.current += dist

    // If they've "doodled" enough, trigger a gather
    // 50 units of distance = 1 gather
    if (scribbleLength.current >= 50) {
      onAreaClick()
      scribbleLength.current -= 50
      setAccumulatedGathers(prev => prev + 1)
    }

    // Draw the line
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(currentPoint.x, currentPoint.y)

    // Line style
    ctx.strokeStyle = area.color || '#D5C4E8'
    ctx.lineWidth = (2 + currentPoint.pressure * 10) // Pressure sensitivity!
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.stroke()
    lastPoint.current = currentPoint

    // Fade effect logic - slowly clear the canvas so it doesn't get too messy
    if (Math.random() < 0.05) {
      ctx.fillStyle = 'rgba(255, 254, 245, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [isDrawing, onAreaClick, area.color])

  const stopDrawing = () => {
    setIsDrawing(false)
    lastPoint.current = null
  }

  return (
    <div className="clicker-area doodle-panel" style={{ '--area-bg': getAreaBg(area.id) } as React.CSSProperties}>
      <div className="area-title">.: {area.name} :.</div>
      <div className="area-description">{area.description}</div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={500}
          height={300}
          className="doodle-canvas"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          style={{ touchAction: 'none' }} // Critical for tablet/touch
        />
        <div className="canvas-overlay">
          {area.primaryResource === 'stardust' && (
            <img src="/assets/resources/stardust.png" alt="Stardust" className="primary-resource-img floating" />
          )}
          <div className="doodle-prompt">[ Doodle with your pen/mouse! ]</div>
          <div className="doodle-stats">
            +{clickAmount} per doodle | Doodles: {accumulatedGathers}
          </div>
        </div>
      </div>
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
