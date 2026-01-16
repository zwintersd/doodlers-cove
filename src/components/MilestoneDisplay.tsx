import type { Milestone } from '../types/game'
import './MilestoneDisplay.css'

interface MilestoneDisplayProps {
  milestones: Milestone[]
}

export function MilestoneDisplay({ milestones }: MilestoneDisplayProps) {
  const achieved = milestones.filter((m) => m.achieved)
  const upcoming = milestones.filter((m) => !m.achieved).slice(0, 3)

  return (
    <div className="milestone-display">
      <div className="milestone-header">
        ~ Milestones ~
        <span className="milestone-count">
          {achieved.length}/{milestones.length}
        </span>
      </div>

      {upcoming.length > 0 && (
        <div className="milestone-section">
          <div className="section-label">Next Goals:</div>
          {upcoming.map((m) => (
            <div key={m.id} className="milestone-item upcoming">
              <span className="milestone-icon">[?]</span>
              <div className="milestone-info">
                <span className="milestone-name">{m.name}</span>
                <span className="milestone-desc">{m.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {achieved.length > 0 && (
        <div className="milestone-section">
          <div className="section-label">Achieved:</div>
          <div className="achieved-list">
            {achieved.slice(-5).reverse().map((m) => (
              <div key={m.id} className="milestone-item achieved">
                <span className="milestone-icon">[*]</span>
                <div className="milestone-info">
                  <span className="milestone-name">{m.name}</span>
                  <span className="milestone-reward">
                    {formatReward(m)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatReward(m: Milestone): string {
  switch (m.reward.type) {
    case 'globalMultiplier':
      return `x${m.reward.value} all production`
    case 'clickBonus':
      return `+${m.reward.value} per click`
    case 'productionBonus':
      return `x${m.reward.value} ${m.reward.resourceAffected}`
    default:
      return 'Bonus unlocked'
  }
}
