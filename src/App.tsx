import { useGameState } from './hooks/useGameState'
import {
  ResourceDisplay,
  ClickerArea,
  UpgradeShop,
  CreatureShop,
  AreaSelector,
  MilestoneDisplay,
} from './components'
import './App.css'

function App() {
  const {
    state,
    handleClick,
    purchaseUpgrade,
    purchaseCreature,
    unlockArea,
    changeArea,
    resetGame,
    getClickAmount,
    getCreatureCost,
    totalCreatureCount,
    areas,
  } = useGameState()

  const currentArea = areas[state.currentArea]
  const clickAmount = getClickAmount(currentArea.primaryResource)

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">~ Doodler's Cove ~</h1>
        <p className="app-subtitle">A Magical Clicker Adventure</p>
      </header>

      <AreaSelector
        areas={areas}
        currentArea={state.currentArea}
        unlockedAreas={state.unlockedAreas}
        resources={state.resources}
        onAreaChange={changeArea}
        onAreaUnlock={unlockArea}
      />

      <main className="app-main">
        <aside className="sidebar sidebar-left">
          <ResourceDisplay resources={state.resources} />
          <MilestoneDisplay milestones={state.milestones} />
        </aside>

        <section className="game-center">
          <ClickerArea
            area={currentArea}
            currentArea={state.currentArea}
            clickAmount={clickAmount}
            onAreaClick={handleClick}
          />
          <div className="stats-bar">
            <span>Clicks: {state.totalClicks.toLocaleString()}</span>
            <span className="stat-separator">|</span>
            <span>Friends: {totalCreatureCount}</span>
            <span className="stat-separator">|</span>
            <span>Multiplier: x{state.globalMultiplier.toFixed(2)}</span>
          </div>
        </section>

        <aside className="sidebar sidebar-right">
          <UpgradeShop
            upgrades={state.upgrades}
            resources={state.resources}
            onPurchase={purchaseUpgrade}
          />
          <CreatureShop
            creatures={state.creatures}
            resources={state.resources}
            getCreatureCost={getCreatureCost}
            onPurchase={purchaseCreature}
          />
        </aside>
      </main>

      <footer className="app-footer">
        <span className="footer-text">.: made with love and stardust :.</span>
        <button className="reset-button" onClick={() => {
          if (window.confirm('Are you sure you want to reset all progress?')) {
            resetGame()
          }
        }}>
          [Reset Game]
        </button>
      </footer>
    </div>
  )
}

export default App
