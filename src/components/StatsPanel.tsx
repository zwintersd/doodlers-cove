import { useMemo, useState } from 'react'
import type { GameState, ResourceType, Creature } from '../types/game'
import type { Area, AreaType } from '../types/game'
import './StatsPanel.css'

interface StatsPanelProps {
  state: GameState
  getClickAmount: (resource: ResourceType) => number
  getCreatureCost: (creature: Creature) => { resource: ResourceType; amount: number }[]
  areas: Record<AreaType, Area>
}

const resourceOrder: ResourceType[] = [
  'stardust', 'cloudFluff', 'rainbowDrops', 'moonbeams', 'dreamSeeds', 'heartGems', 'wishPetals'
]

export function StatsPanel({ state, getClickAmount, getCreatureCost, areas }: StatsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'creatures' | 'upgrades' | 'milestones'>('overview')

  // Calculate all the detailed stats
  const stats = useMemo(() => {
    // Production breakdown per resource
    const production: Record<ResourceType, {
      fromCreatures: number
      fromUpgrades: number
      total: number
      creatureBreakdown: { name: string; count: number; baseRate: number; boostedRate: number }[]
    }> = {} as any

    // Creature boost calculation
    const getCreatureBoost = (resource: ResourceType): number => {
      let boost = 1
      state.upgrades
        .filter((u) => u.purchased > 0 && u.effect.type === 'creatureBoost')
        .forEach((u) => {
          if (u.effect.resourceAffected === resource || u.effect.resourceAffected === 'stardust') {
            boost += u.effect.value * u.purchased
          }
        })
      return boost
    }

    // Milestone multipliers
    let milestoneGlobal = 1
    let milestoneClick = 0
    const milestoneProduction: Partial<Record<ResourceType, number>> = {}
    state.milestones.filter(m => m.achieved).forEach(m => {
      if (m.reward.type === 'globalMultiplier') milestoneGlobal *= m.reward.value
      if (m.reward.type === 'clickBonus') milestoneClick += m.reward.value
      if (m.reward.type === 'productionBonus' && m.reward.resourceAffected) {
        milestoneProduction[m.reward.resourceAffected] =
          (milestoneProduction[m.reward.resourceAffected] || 1) * m.reward.value
      }
    })

    for (const resource of resourceOrder) {
      const creatureBoost = getCreatureBoost(resource)
      const prodMultiplier = state.globalMultiplier * milestoneGlobal * (milestoneProduction[resource] || 1)

      // Creature production
      const creatureBreakdown: { name: string; count: number; baseRate: number; boostedRate: number }[] = []
      let fromCreatures = 0
      state.creatures.filter(c => c.count > 0 && c.produces.resource === resource).forEach(c => {
        const baseRate = c.produces.amount * c.count
        const boostedRate = baseRate * creatureBoost * prodMultiplier
        fromCreatures += boostedRate
        creatureBreakdown.push({
          name: c.name,
          count: c.count,
          baseRate,
          boostedRate
        })
      })

      // Auto-gather production
      let fromUpgrades = 0
      state.upgrades.filter(u => u.purchased > 0 && u.effect.type === 'autoGather' && u.effect.resourceAffected === resource)
        .forEach(u => {
          fromUpgrades += u.effect.value * u.purchased * prodMultiplier
        })

      production[resource] = {
        fromCreatures,
        fromUpgrades,
        total: fromCreatures + fromUpgrades,
        creatureBreakdown
      }
    }

    // Click analysis
    const currentArea = areas[state.currentArea]
    const baseClick = state.resources[currentArea.primaryResource].perClick
    const clickAmount = getClickAmount(currentArea.primaryResource)
    const clickMultiplier = baseClick > 0 ? clickAmount / baseClick : 0

    // Bonus chances
    const bonusChances: { resource: ResourceType; chance: number; expectedPerClick: number }[] = []
    state.upgrades.filter(u => u.purchased > 0 && u.effect.type === 'bonusChance').forEach(u => {
      const chance = u.effect.value * u.purchased
      bonusChances.push({
        resource: u.effect.resourceAffected,
        chance,
        expectedPerClick: chance
      })
    })

    // Upgrade effects summary
    const upgradeEffects = {
      clickMultipliers: state.upgrades.filter(u => u.purchased > 0 && u.effect.type === 'clickMultiplier')
        .map(u => ({ name: u.name, count: u.purchased, totalBonus: u.effect.value * u.purchased })),
      autoGathers: state.upgrades.filter(u => u.purchased > 0 && u.effect.type === 'autoGather')
        .map(u => ({ name: u.name, count: u.purchased, rate: u.effect.value * u.purchased, resource: u.effect.resourceAffected })),
      globalMultipliers: state.upgrades.filter(u => u.purchased > 0 && u.effect.type === 'globalMultiplier')
        .map(u => ({ name: u.name, count: u.purchased, multiplier: Math.pow(u.effect.value, u.purchased) })),
      creatureBoosts: state.upgrades.filter(u => u.purchased > 0 && u.effect.type === 'creatureBoost')
        .map(u => ({ name: u.name, count: u.purchased, boost: u.effect.value * u.purchased })),
    }

    // Creature costs analysis
    const creatureCosts = state.creatures.map(c => {
      const cost = getCreatureCost(c)
      const efficiency = c.count > 0
        ? (c.produces.amount * c.count) / cost.reduce((sum, co) => sum + co.amount, 0)
        : c.produces.amount / c.baseCost.reduce((sum, co) => sum + co.amount, 0)
      return {
        ...c,
        currentCost: cost,
        efficiency,
        totalProduction: c.produces.amount * c.count,
        costIncreasePercent: (c.costMultiplier - 1) * 100
      }
    })

    // Lifetime stats
    const lifetimeStats = {
      totalClicks: state.totalClicks,
      totalResourcesGathered: state.totalResourcesGathered,
      avgResourcePerClick: state.totalClicks > 0
        ? state.totalResourcesGathered.stardust / state.totalClicks
        : 0,
      totalCreatures: state.creatures.reduce((sum, c) => sum + c.count, 0),
      totalUpgradesPurchased: state.upgrades.reduce((sum, u) => sum + u.purchased, 0),
      milestonesAchieved: state.milestones.filter(m => m.achieved).length,
      milestonesTotal: state.milestones.length,
      areasUnlocked: state.unlockedAreas.length,
      areasTotal: Object.keys(areas).length
    }

    // Multiplier breakdown
    const multiplierBreakdown = {
      fromUpgrades: state.upgrades.filter(u => u.purchased > 0 && u.effect.type === 'globalMultiplier')
        .reduce((mult, u) => mult * Math.pow(u.effect.value, u.purchased), 1),
      fromMilestones: milestoneGlobal,
      fromState: state.globalMultiplier,
      clickBonus: milestoneClick,
      creatureBoosts: {} as Record<ResourceType, number>
    }
    for (const resource of resourceOrder) {
      multiplierBreakdown.creatureBoosts[resource] = getCreatureBoost(resource)
    }

    // Time to next milestone
    const nextMilestones = state.milestones.filter(m => !m.achieved).map(m => {
      let current = 0
      let target = m.requirement.amount
      let rate = 0

      if (m.requirement.type === 'totalClicks') {
        current = state.totalClicks
        rate = 0 // Manual
      } else if (m.requirement.type === 'totalResource' && m.requirement.resource) {
        current = state.totalResourcesGathered[m.requirement.resource]
        rate = production[m.requirement.resource]?.total || 0
      } else if (m.requirement.type === 'creatureCount') {
        current = lifetimeStats.totalCreatures
      } else if (m.requirement.type === 'areaUnlock') {
        current = state.unlockedAreas.length
      }

      const remaining = target - current
      const timeToComplete = rate > 0 ? remaining / rate : null

      return {
        ...m,
        current,
        target,
        progress: (current / target) * 100,
        remaining,
        rate,
        timeToComplete
      }
    }).slice(0, 5)

    return {
      production,
      clickAmount,
      clickMultiplier,
      baseClick,
      bonusChances,
      upgradeEffects,
      creatureCosts,
      lifetimeStats,
      multiplierBreakdown,
      nextMilestones,
      milestoneGlobal,
      milestoneClick,
      milestoneProduction
    }
  }, [state, getClickAmount, getCreatureCost, areas])

  const formatNumber = (n: number, decimals = 2): string => {
    if (n >= 1000000000) return (n / 1000000000).toFixed(decimals) + 'B'
    if (n >= 1000000) return (n / 1000000).toFixed(decimals) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(decimals) + 'K'
    if (n < 0.01 && n > 0) return n.toExponential(2)
    return n.toFixed(decimals)
  }

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return 'N/A'
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
    return `${(seconds / 86400).toFixed(1)}d`
  }

  if (!isOpen) {
    return (
      <button className="stats-toggle closed" onClick={() => setIsOpen(true)}>
        [+] Detailed Stats
      </button>
    )
  }

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <span className="stats-title">~ Detailed Statistics ~</span>
        <button className="stats-close" onClick={() => setIsOpen(false)}>[x]</button>
      </div>

      <div className="stats-tabs">
        {(['overview', 'production', 'creatures', 'upgrades', 'milestones'] as const).map(tab => (
          <button
            key={tab}
            className={`stats-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="stats-content">
        {activeTab === 'overview' && (
          <div className="stats-section">
            <div className="stat-group">
              <div className="stat-group-title">:: Lifetime Statistics ::</div>
              <div className="stat-row">
                <span className="stat-label">Total Clicks</span>
                <span className="stat-value">{stats.lifetimeStats.totalClicks.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Avg Stardust/Click</span>
                <span className="stat-value">{formatNumber(stats.lifetimeStats.avgResourcePerClick)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total Creatures</span>
                <span className="stat-value">{stats.lifetimeStats.totalCreatures}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total Upgrades</span>
                <span className="stat-value">{stats.lifetimeStats.totalUpgradesPurchased}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Milestones</span>
                <span className="stat-value">{stats.lifetimeStats.milestonesAchieved}/{stats.lifetimeStats.milestonesTotal}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Areas Unlocked</span>
                <span className="stat-value">{stats.lifetimeStats.areasUnlocked}/{stats.lifetimeStats.areasTotal}</span>
              </div>
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Multiplier Breakdown ::</div>
              <div className="stat-row">
                <span className="stat-label">Global (State)</span>
                <span className="stat-value">x{formatNumber(stats.multiplierBreakdown.fromState)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">From Milestones</span>
                <span className="stat-value">x{formatNumber(stats.milestoneGlobal)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Click Bonus</span>
                <span className="stat-value">+{stats.milestoneClick}</span>
              </div>
              <div className="stat-row highlight">
                <span className="stat-label">Effective Click</span>
                <span className="stat-value">x{formatNumber(stats.clickMultiplier)} ({stats.clickAmount}/click)</span>
              </div>
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Lifetime Resources ::</div>
              {resourceOrder.map(r => {
                const total = stats.lifetimeStats.totalResourcesGathered[r]
                if (total === 0) return null
                return (
                  <div key={r} className="stat-row">
                    <span className="stat-label">{state.resources[r].name}</span>
                    <span className="stat-value">{formatNumber(total)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'production' && (
          <div className="stats-section">
            <div className="stat-group">
              <div className="stat-group-title">:: Production Rates (per second) ::</div>
              {resourceOrder.map(r => {
                const prod = stats.production[r]
                if (prod.total === 0 && state.resources[r].perClick === 0) return null
                return (
                  <div key={r} className="production-block">
                    <div className="stat-row resource-header">
                      <span className="stat-label">{state.resources[r].name}</span>
                      <span className="stat-value total">+{formatNumber(prod.total)}/s</span>
                    </div>
                    {prod.fromCreatures > 0 && (
                      <div className="stat-row indent">
                        <span className="stat-label">From Creatures</span>
                        <span className="stat-value">+{formatNumber(prod.fromCreatures)}/s</span>
                      </div>
                    )}
                    {prod.fromUpgrades > 0 && (
                      <div className="stat-row indent">
                        <span className="stat-label">From Upgrades</span>
                        <span className="stat-value">+{formatNumber(prod.fromUpgrades)}/s</span>
                      </div>
                    )}
                    {prod.creatureBreakdown.length > 0 && (
                      <div className="creature-breakdown">
                        {prod.creatureBreakdown.map(c => (
                          <div key={c.name} className="stat-row indent-2">
                            <span className="stat-label">{c.name} x{c.count}</span>
                            <span className="stat-value dim">
                              {formatNumber(c.baseRate)} → {formatNumber(c.boostedRate)}/s
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Bonus Drop Chances ::</div>
              {stats.bonusChances.length === 0 ? (
                <div className="stat-row dim">No bonus chances yet</div>
              ) : (
                stats.bonusChances.map(b => (
                  <div key={b.resource} className="stat-row">
                    <span className="stat-label">{state.resources[b.resource].name}</span>
                    <span className="stat-value">{(b.chance * 100).toFixed(1)}% per click</span>
                  </div>
                ))
              )}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Resource Production Bonuses ::</div>
              {Object.entries(stats.milestoneProduction).map(([r, mult]) => (
                <div key={r} className="stat-row">
                  <span className="stat-label">{state.resources[r as ResourceType].name}</span>
                  <span className="stat-value">x{formatNumber(mult as number)}</span>
                </div>
              ))}
              {Object.keys(stats.milestoneProduction).length === 0 && (
                <div className="stat-row dim">No resource-specific bonuses yet</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'creatures' && (
          <div className="stats-section">
            <div className="stat-group">
              <div className="stat-group-title">:: Creature Efficiency Analysis ::</div>
              {stats.creatureCosts.filter(c => c.count > 0 || stats.lifetimeStats.totalCreatures < 10).map(c => (
                <div key={c.id} className="creature-stats">
                  <div className="stat-row creature-name-row">
                    <span className="stat-label">{c.name}</span>
                    <span className="stat-value">{c.count > 0 ? `x${c.count}` : '(not owned)'}</span>
                  </div>
                  <div className="stat-row indent">
                    <span className="stat-label">Base Production</span>
                    <span className="stat-value">+{c.produces.amount}/s {state.resources[c.produces.resource].name}</span>
                  </div>
                  {c.count > 0 && (
                    <div className="stat-row indent">
                      <span className="stat-label">Total Production</span>
                      <span className="stat-value">+{formatNumber(c.totalProduction)}/s</span>
                    </div>
                  )}
                  <div className="stat-row indent">
                    <span className="stat-label">Next Cost</span>
                    <span className="stat-value">
                      {c.currentCost.map(co => `${formatNumber(co.amount)} ${state.resources[co.resource].name}`).join(', ')}
                    </span>
                  </div>
                  <div className="stat-row indent">
                    <span className="stat-label">Cost Scaling</span>
                    <span className="stat-value">+{c.costIncreasePercent.toFixed(0)}% per purchase</span>
                  </div>
                  <div className="stat-row indent">
                    <span className="stat-label">Efficiency</span>
                    <span className="stat-value">{formatNumber(c.efficiency * 1000, 3)} prod/1K cost</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Creature Boosts (from upgrades) ::</div>
              {resourceOrder.map(r => {
                const boost = stats.multiplierBreakdown.creatureBoosts[r]
                if (boost === 1) return null
                return (
                  <div key={r} className="stat-row">
                    <span className="stat-label">{state.resources[r].name} creatures</span>
                    <span className="stat-value">x{formatNumber(boost)}</span>
                  </div>
                )
              })}
              {Object.values(stats.multiplierBreakdown.creatureBoosts).every(b => b === 1) && (
                <div className="stat-row dim">No creature boosts yet</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'upgrades' && (
          <div className="stats-section">
            <div className="stat-group">
              <div className="stat-group-title">:: Click Multipliers ::</div>
              {stats.upgradeEffects.clickMultipliers.length === 0 ? (
                <div className="stat-row dim">None purchased</div>
              ) : (
                stats.upgradeEffects.clickMultipliers.map(u => (
                  <div key={u.name} className="stat-row">
                    <span className="stat-label">{u.name} x{u.count}</span>
                    <span className="stat-value">+{formatNumber(u.totalBonus)} click power</span>
                  </div>
                ))
              )}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Auto-Gatherers ::</div>
              {stats.upgradeEffects.autoGathers.length === 0 ? (
                <div className="stat-row dim">None purchased</div>
              ) : (
                stats.upgradeEffects.autoGathers.map(u => (
                  <div key={u.name} className="stat-row">
                    <span className="stat-label">{u.name} x{u.count}</span>
                    <span className="stat-value">+{formatNumber(u.rate)}/s {state.resources[u.resource].name}</span>
                  </div>
                ))
              )}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Global Multipliers ::</div>
              {stats.upgradeEffects.globalMultipliers.length === 0 ? (
                <div className="stat-row dim">None purchased</div>
              ) : (
                stats.upgradeEffects.globalMultipliers.map(u => (
                  <div key={u.name} className="stat-row">
                    <span className="stat-label">{u.name} x{u.count}</span>
                    <span className="stat-value">x{formatNumber(u.multiplier)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Creature Boosts ::</div>
              {stats.upgradeEffects.creatureBoosts.length === 0 ? (
                <div className="stat-row dim">None purchased</div>
              ) : (
                stats.upgradeEffects.creatureBoosts.map(u => (
                  <div key={u.name} className="stat-row">
                    <span className="stat-label">{u.name} x{u.count}</span>
                    <span className="stat-value">+{formatNumber(u.boost * 100)}% creature output</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="stats-section">
            <div className="stat-group">
              <div className="stat-group-title">:: Next Milestones (ETA) ::</div>
              {stats.nextMilestones.map(m => (
                <div key={m.id} className="milestone-eta">
                  <div className="stat-row">
                    <span className="stat-label">{m.name}</span>
                    <span className="stat-value">{m.progress.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(m.progress, 100)}%` }} />
                  </div>
                  <div className="stat-row indent dim">
                    <span className="stat-label">{formatNumber(m.current)} / {formatNumber(m.target)}</span>
                    <span className="stat-value">ETA: {formatTime(m.timeToComplete)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Active Milestone Bonuses ::</div>
              <div className="stat-row">
                <span className="stat-label">Global Multiplier</span>
                <span className="stat-value">x{formatNumber(stats.milestoneGlobal)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Click Bonus</span>
                <span className="stat-value">+{stats.milestoneClick}</span>
              </div>
              {Object.entries(stats.milestoneProduction).map(([r, mult]) => (
                <div key={r} className="stat-row">
                  <span className="stat-label">{state.resources[r as ResourceType].name} Production</span>
                  <span className="stat-value">x{formatNumber(mult as number)}</span>
                </div>
              ))}
            </div>

            <div className="stat-group">
              <div className="stat-group-title">:: Milestone Completion ::</div>
              <div className="stat-row">
                <span className="stat-label">Click Milestones</span>
                <span className="stat-value">
                  {state.milestones.filter(m => m.requirement.type === 'totalClicks' && m.achieved).length}/
                  {state.milestones.filter(m => m.requirement.type === 'totalClicks').length}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Resource Milestones</span>
                <span className="stat-value">
                  {state.milestones.filter(m => m.requirement.type === 'totalResource' && m.achieved).length}/
                  {state.milestones.filter(m => m.requirement.type === 'totalResource').length}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Creature Milestones</span>
                <span className="stat-value">
                  {state.milestones.filter(m => m.requirement.type === 'creatureCount' && m.achieved).length}/
                  {state.milestones.filter(m => m.requirement.type === 'creatureCount').length}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Area Milestones</span>
                <span className="stat-value">
                  {state.milestones.filter(m => m.requirement.type === 'areaUnlock' && m.achieved).length}/
                  {state.milestones.filter(m => m.requirement.type === 'areaUnlock').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stats-footer">
        <span className="stats-footer-text">
          Last save: {new Date(state.lastSaveTime).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}
