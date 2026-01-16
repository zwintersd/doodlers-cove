import type { Creature, Resource, ResourceType } from '../types/game'
import './CreatureShop.css'

interface CreatureShopProps {
  creatures: Creature[]
  resources: Record<ResourceType, Resource>
  getCreatureCost: (creature: Creature) => { resource: ResourceType; amount: number }[]
  onPurchase: (creatureId: string) => void
}

// ASCII art for creatures (placeholders)
const creatureArt: Record<string, string> = {
  'sparkle-bunny': '(\\(\\',
  'glimmer-mouse': '<:3',
  'starlight-fox': '^.^',
  'cloud-sheep': '@@',
  'fluff-kitten': '=^.^=',
  'rainbow-bird': '>v',
  'prism-butterfly': '}:{',
  'dream-fawn': '()>',
  'slumber-owl': '{O,O}',
  'moon-moth': '}{',
  'lunar-rabbit': '(\\_/)',
  'heart-bear': '(^_^)',
  'love-dove': '<3v',
  'wish-dragon': '~:>',
  'hope-phoenix': '~<>~',
  'celestial-unicorn': '>^<',
  'aurora-serpent': '~S~',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export function CreatureShop({ creatures, resources, getCreatureCost, onPurchase }: CreatureShopProps) {
  return (
    <div className="creature-shop doodle-panel">
      <div className="shop-header">~ Friends ~</div>
      <div className="creature-list">
        {creatures.map((creature) => {
          const cost = getCreatureCost(creature)
          const canAfford = cost.every((c) => resources[c.resource].amount >= c.amount)
          const hasAny = creature.count > 0

          return (
            <button
              key={creature.id}
              className={`creature-item doodle-border ${canAfford ? 'affordable' : ''} ${hasAny ? 'owned' : ''}`}
              onClick={() => canAfford && onPurchase(creature.id)}
              disabled={!canAfford}
            >
              <div className="creature-art">
                {creature.id === 'sparkle-bunny' ? (
                  <img src="/assets/creatures/sparkle-bunny.png" alt="Sparkle Bunny" className="creature-img" />
                ) : (
                  creatureArt[creature.id] || '??'
                )}
              </div>
              <div className="creature-info">
                <div className="creature-header">
                  <span className="creature-name">{creature.name}</span>
                  {creature.count > 0 && (
                    <span className="creature-count">x{creature.count}</span>
                  )}
                </div>
                <div className="creature-description">{creature.description}</div>
                <div className="creature-produces">
                  +{creature.produces.amount}/s {resources[creature.produces.resource].name}
                  {creature.count > 0 && (
                    <span className="creature-total">
                      {' '}(total: +{(creature.produces.amount * creature.count).toFixed(1)}/s)
                    </span>
                  )}
                </div>
                <div className="creature-cost">
                  {cost.map((c, i) => (
                    <span
                      key={c.resource}
                      className={
                        resources[c.resource].amount >= c.amount ? 'can-afford' : 'cannot-afford'
                      }
                    >
                      {i > 0 && ', '}
                      {formatNumber(c.amount)} {resources[c.resource].name}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
