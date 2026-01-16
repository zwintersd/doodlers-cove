import type { Creature, Resource, ResourceType } from '../types/game'
import './CreatureShop.css'

interface CreatureShopProps {
  creatures: Creature[]
  resources: Record<ResourceType, Resource>
  onPurchase: (creatureId: string) => void
}

// ASCII art for creatures (placeholders)
const creatureArt: Record<string, string> = {
  'sparkle-bunny': '(\\(\\',
  'cloud-sheep': '@@',
  'rainbow-bird': '>v',
  'moon-moth': '}{',
  'heart-bear': '(^_^)',
  'wish-dragon': '~:>',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export function CreatureShop({ creatures, resources, onPurchase }: CreatureShopProps) {
  return (
    <div className="creature-shop">
      <div className="shop-header">~ Friends ~</div>
      <div className="creature-list">
        {creatures.map((creature) => {
          const canAfford = creature.cost.every(
            (c) => resources[c.resource].amount >= c.amount
          )
          const owned = creature.unlocked

          return (
            <button
              key={creature.id}
              className={`creature-item ${canAfford && !owned ? 'affordable' : ''} ${owned ? 'owned' : ''}`}
              onClick={() => canAfford && !owned && onPurchase(creature.id)}
              disabled={!canAfford || owned}
            >
              <div className="creature-art">{creatureArt[creature.id] || '??'}</div>
              <div className="creature-info">
                <div className="creature-name">{creature.name}</div>
                <div className="creature-description">{creature.description}</div>
                <div className="creature-produces">
                  Produces: +{creature.produces.amount}/s{' '}
                  {resources[creature.produces.resource].name}
                </div>
                <div className="creature-cost">
                  {owned ? (
                    <span className="owned-text">~ Friend ~</span>
                  ) : (
                    creature.cost.map((c, i) => (
                      <span
                        key={c.resource}
                        className={
                          resources[c.resource].amount >= c.amount ? 'can-afford' : 'cannot-afford'
                        }
                      >
                        {i > 0 && ', '}
                        {formatNumber(c.amount)} {resources[c.resource].name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
