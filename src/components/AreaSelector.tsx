import type { Area, AreaType, Resource, ResourceType } from '../types/game'
import './AreaSelector.css'

interface AreaSelectorProps {
  areas: Record<AreaType, Area>
  currentArea: AreaType
  unlockedAreas: AreaType[]
  resources: Record<ResourceType, Resource>
  onAreaChange: (areaId: AreaType) => void
  onAreaUnlock: (areaId: AreaType) => void
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

const areaOrder: AreaType[] = ['meadow', 'rainbow-falls', 'dream-garden', 'heart-cave']

export function AreaSelector({
  areas,
  currentArea,
  unlockedAreas,
  resources,
  onAreaChange,
  onAreaUnlock,
}: AreaSelectorProps) {
  return (
    <div className="area-selector">
      <div className="area-header">~ Areas ~</div>
      <div className="area-list">
        {areaOrder.map((areaId) => {
          const area = areas[areaId]
          const isUnlocked = unlockedAreas.includes(areaId)
          const isCurrent = currentArea === areaId

          if (isUnlocked) {
            return (
              <button
                key={areaId}
                className={`area-tab ${isCurrent ? 'current' : ''}`}
                onClick={() => onAreaChange(areaId)}
              >
                {area.name}
              </button>
            )
          }

          // Locked area
          const canAfford =
            area.unlockCost?.every((c) => resources[c.resource].amount >= c.amount) ?? false

          return (
            <button
              key={areaId}
              className={`area-tab locked ${canAfford ? 'affordable' : ''}`}
              onClick={() => canAfford && onAreaUnlock(areaId)}
              disabled={!canAfford}
              title={
                area.unlockCost
                  ? `Unlock: ${area.unlockCost.map((c) => `${formatNumber(c.amount)} ${resources[c.resource].name}`).join(', ')}`
                  : ''
              }
            >
              <span className="lock-icon">[?]</span> {area.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
