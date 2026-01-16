import type { Upgrade, Resource, ResourceType } from '../types/game'
import './UpgradeShop.css'

interface UpgradeShopProps {
  upgrades: Upgrade[]
  resources: Record<ResourceType, Resource>
  onPurchase: (upgradeId: string) => void
}

function formatCost(cost: number): string {
  if (cost >= 1000000) return (cost / 1000000).toFixed(1) + 'M'
  if (cost >= 1000) return (cost / 1000).toFixed(1) + 'K'
  return Math.floor(cost).toString()
}

export function UpgradeShop({ upgrades, resources, onPurchase }: UpgradeShopProps) {
  const visibleUpgrades = upgrades.filter((u) => u.unlocked)

  if (visibleUpgrades.length === 0) {
    return (
      <div className="upgrade-shop doodle-panel">
        <div className="shop-header">~ Upgrades ~</div>
        <div className="shop-empty">No upgrades available yet...</div>
      </div>
    )
  }

  return (
    <div className="upgrade-shop">
      <div className="shop-header">~ Upgrades ~</div>
      <div className="upgrade-list">
        {visibleUpgrades.map((upgrade) => {
          const cost = Math.floor(
            upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.purchased)
          )
          const canAfford = resources[upgrade.resourceType].amount >= cost
          const maxed =
            upgrade.maxPurchases !== null && upgrade.purchased >= upgrade.maxPurchases

          return (
            <button
              key={upgrade.id}
              className={`upgrade-item doodle-border ${canAfford && !maxed ? 'affordable' : ''} ${maxed ? 'maxed' : ''}`}
              onClick={() => canAfford && !maxed && onPurchase(upgrade.id)}
              disabled={!canAfford || maxed}
              style={{ '--upgrade-color': resources[upgrade.resourceType].color } as React.CSSProperties}
            >
              <div className="upgrade-header">
                <span className="upgrade-name">{upgrade.name}</span>
                {upgrade.maxPurchases !== null && (
                  <span className="upgrade-count">
                    [{upgrade.purchased}/{upgrade.maxPurchases}]
                  </span>
                )}
                {upgrade.maxPurchases === null && upgrade.purchased > 0 && (
                  <span className="upgrade-count">[x{upgrade.purchased}]</span>
                )}
              </div>
              <div className="upgrade-description">{upgrade.description}</div>
              <div className="upgrade-cost">
                {maxed ? (
                  'MAXED'
                ) : (
                  <>
                    Cost: {formatCost(cost)} {resources[upgrade.resourceType].name}
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
