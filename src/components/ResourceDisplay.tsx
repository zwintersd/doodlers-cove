import type { Resource, ResourceType } from '../types/game'
import './ResourceDisplay.css'

interface ResourceDisplayProps {
  resources: Record<ResourceType, Resource>
}

// Simple emoji placeholders for resources (will be replaced by assets)
const resourceEmoji: Record<ResourceType, string> = {
  stardust: '*',
  rainbowDrops: '~',
  dreamSeeds: 'o',
  moonbeams: ')',
  heartGems: '<3',
  cloudFluff: '.',
  wishPetals: '%',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K'
  return Math.floor(n).toString()
}

export function ResourceDisplay({ resources }: ResourceDisplayProps) {
  const visibleResources = Object.values(resources).filter(
    (r) => r.amount > 0 || r.perClick > 0 || r.perSecond > 0
  )

  return (
    <div className="resource-display">
      <div className="resource-header">~ Resources ~</div>
      <div className="resource-list">
        {visibleResources.map((resource) => (
          <div
            key={resource.id}
            className="resource-item"
            style={{ '--resource-color': resource.color } as React.CSSProperties}
          >
            <span className="resource-icon">{resourceEmoji[resource.id]}</span>
            <span className="resource-name">{resource.name}</span>
            <span className="resource-amount">{formatNumber(resource.amount)}</span>
            {resource.perSecond > 0 && (
              <span className="resource-rate">(+{resource.perSecond.toFixed(1)}/s)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
