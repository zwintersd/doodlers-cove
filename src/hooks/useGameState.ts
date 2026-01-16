import { useState, useEffect, useCallback } from 'react'
import type { GameState, ResourceType, Upgrade, Creature, AreaType } from '../types/game'
import { initialResources, initialUpgrades, initialCreatures, areas } from '../data/gameData'

const SAVE_KEY = 'doodlers-cove-save'
const TICK_RATE = 100 // ms between ticks

function createInitialState(): GameState {
  return {
    resources: JSON.parse(JSON.stringify(initialResources)),
    upgrades: JSON.parse(JSON.stringify(initialUpgrades)),
    creatures: JSON.parse(JSON.stringify(initialCreatures)),
    totalClicks: 0,
    currentArea: 'meadow',
    unlockedAreas: ['meadow'],
    lastSaveTime: Date.now(),
  }
}

function loadGame(): GameState {
  try {
    const saved = localStorage.getItem(SAVE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with initial state to handle new resources/upgrades
      const state = createInitialState()
      if (parsed.resources) {
        for (const key of Object.keys(parsed.resources)) {
          if (state.resources[key as ResourceType]) {
            state.resources[key as ResourceType] = {
              ...state.resources[key as ResourceType],
              ...parsed.resources[key],
            }
          }
        }
      }
      if (parsed.upgrades) {
        state.upgrades = state.upgrades.map((u) => {
          const saved = parsed.upgrades.find((s: Upgrade) => s.id === u.id)
          return saved ? { ...u, ...saved } : u
        })
      }
      if (parsed.creatures) {
        state.creatures = state.creatures.map((c) => {
          const saved = parsed.creatures.find((s: Creature) => s.id === c.id)
          return saved ? { ...c, ...saved } : c
        })
      }
      state.totalClicks = parsed.totalClicks || 0
      state.currentArea = parsed.currentArea || 'meadow'
      state.unlockedAreas = parsed.unlockedAreas || ['meadow']
      state.lastSaveTime = parsed.lastSaveTime || Date.now()
      return state
    }
  } catch (e) {
    console.error('Failed to load save:', e)
  }
  return createInitialState()
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadGame)

  // Calculate click multipliers from upgrades
  const getClickAmount = useCallback(
    (resource: ResourceType): number => {
      const base = state.resources[resource].perClick
      let multiplier = 1

      state.upgrades
        .filter(
          (u) =>
            u.purchased > 0 &&
            u.effect.type === 'clickMultiplier' &&
            u.effect.resourceAffected === resource
        )
        .forEach((u) => {
          multiplier += u.effect.value * u.purchased
        })

      return base * multiplier
    },
    [state.resources, state.upgrades]
  )

  // Calculate bonus resources from clicking
  const getBonusChances = useCallback((): { resource: ResourceType; chance: number }[] => {
    const bonuses: { resource: ResourceType; chance: number }[] = []

    state.upgrades
      .filter((u) => u.purchased > 0 && u.effect.type === 'bonusChance')
      .forEach((u) => {
        bonuses.push({
          resource: u.effect.resourceAffected,
          chance: u.effect.value * u.purchased,
        })
      })

    return bonuses
  }, [state.upgrades])

  // Main click handler
  const handleClick = useCallback(() => {
    setState((prev) => {
      const newResources = { ...prev.resources }
      const area = areas[prev.currentArea]

      // Add primary resource
      const clickAmount = getClickAmount(area.primaryResource)
      newResources[area.primaryResource] = {
        ...newResources[area.primaryResource],
        amount: newResources[area.primaryResource].amount + clickAmount,
      }

      // Check for bonus resources
      const bonuses = getBonusChances()
      for (const bonus of bonuses) {
        if (Math.random() < bonus.chance) {
          newResources[bonus.resource] = {
            ...newResources[bonus.resource],
            amount: newResources[bonus.resource].amount + 1,
          }
        }
      }

      return {
        ...prev,
        resources: newResources,
        totalClicks: prev.totalClicks + 1,
      }
    })
  }, [getClickAmount, getBonusChances])

  // Purchase upgrade
  const purchaseUpgrade = useCallback((upgradeId: string) => {
    setState((prev) => {
      const upgrade = prev.upgrades.find((u) => u.id === upgradeId)
      if (!upgrade || !upgrade.unlocked) return prev
      if (upgrade.maxPurchases !== null && upgrade.purchased >= upgrade.maxPurchases) return prev

      const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.purchased))
      if (prev.resources[upgrade.resourceType].amount < cost) return prev

      const newResources = { ...prev.resources }
      newResources[upgrade.resourceType] = {
        ...newResources[upgrade.resourceType],
        amount: newResources[upgrade.resourceType].amount - cost,
      }

      const newUpgrades = prev.upgrades.map((u) => {
        if (u.id === upgradeId) {
          return { ...u, purchased: u.purchased + 1 }
        }
        // Unlock dependent upgrades
        if (upgrade.effect.type === 'unlockResource') {
          // Enable clicking for unlocked resource
          if (u.resourceType === upgrade.effect.resourceAffected && !u.unlocked) {
            return { ...u, unlocked: true }
          }
        }
        return u
      })

      // Handle unlock effects
      if (upgrade.effect.type === 'unlockResource') {
        newResources[upgrade.effect.resourceAffected] = {
          ...newResources[upgrade.effect.resourceAffected],
          perClick: 1,
        }
      }

      return {
        ...prev,
        resources: newResources,
        upgrades: newUpgrades,
      }
    })
  }, [])

  // Purchase creature
  const purchaseCreature = useCallback((creatureId: string) => {
    setState((prev) => {
      const creature = prev.creatures.find((c) => c.id === creatureId)
      if (!creature) return prev

      // Check if can afford
      for (const cost of creature.cost) {
        if (prev.resources[cost.resource].amount < cost.amount) return prev
      }

      const newResources = { ...prev.resources }
      for (const cost of creature.cost) {
        newResources[cost.resource] = {
          ...newResources[cost.resource],
          amount: newResources[cost.resource].amount - cost.amount,
        }
      }

      // Add creature production to per-second
      newResources[creature.produces.resource] = {
        ...newResources[creature.produces.resource],
        perSecond: newResources[creature.produces.resource].perSecond + creature.produces.amount,
      }

      const newCreatures = prev.creatures.map((c) =>
        c.id === creatureId ? { ...c, unlocked: true } : c
      )

      return {
        ...prev,
        resources: newResources,
        creatures: newCreatures,
      }
    })
  }, [])

  // Unlock area
  const unlockArea = useCallback((areaId: AreaType) => {
    setState((prev) => {
      const area = areas[areaId]
      if (!area.unlockCost || prev.unlockedAreas.includes(areaId)) return prev

      // Check if can afford
      for (const cost of area.unlockCost) {
        if (prev.resources[cost.resource].amount < cost.amount) return prev
      }

      const newResources = { ...prev.resources }
      for (const cost of area.unlockCost) {
        newResources[cost.resource] = {
          ...newResources[cost.resource],
          amount: newResources[cost.resource].amount - cost.amount,
        }
      }

      // Enable clicking in new area
      newResources[area.primaryResource] = {
        ...newResources[area.primaryResource],
        perClick: newResources[area.primaryResource].perClick || 1,
      }

      return {
        ...prev,
        resources: newResources,
        unlockedAreas: [...prev.unlockedAreas, areaId],
      }
    })
  }, [])

  // Change current area
  const changeArea = useCallback((areaId: AreaType) => {
    setState((prev) => {
      if (!prev.unlockedAreas.includes(areaId)) return prev
      return { ...prev, currentArea: areaId }
    })
  }, [])

  // Auto-gather tick
  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const newResources = { ...prev.resources }
        let changed = false

        // Auto-gather from upgrades
        prev.upgrades
          .filter((u) => u.purchased > 0 && u.effect.type === 'autoGather')
          .forEach((u) => {
            const amount = (u.effect.value * u.purchased * TICK_RATE) / 1000
            newResources[u.effect.resourceAffected] = {
              ...newResources[u.effect.resourceAffected],
              amount: newResources[u.effect.resourceAffected].amount + amount,
            }
            changed = true
          })

        // Production from creatures
        for (const resource of Object.keys(newResources) as ResourceType[]) {
          if (newResources[resource].perSecond > 0) {
            newResources[resource] = {
              ...newResources[resource],
              amount:
                newResources[resource].amount +
                (newResources[resource].perSecond * TICK_RATE) / 1000,
            }
            changed = true
          }
        }

        // Unlock upgrades based on resources
        const newUpgrades = prev.upgrades.map((u) => {
          if (u.unlocked) return u
          // Unlock rainbow drops upgrades when you have rainbow drops
          if (u.resourceType === 'rainbowDrops' && prev.resources.rainbowDrops.amount >= 1) {
            return { ...u, unlocked: true }
          }
          // Unlock heart gem upgrades when you have heart gems
          if (u.resourceType === 'heartGems' && prev.resources.heartGems.amount >= 1) {
            return { ...u, unlocked: true }
          }
          return u
        })

        if (!changed && newUpgrades === prev.upgrades) return prev
        return { ...prev, resources: newResources, upgrades: newUpgrades }
      })
    }

    const interval = setInterval(tick, TICK_RATE)
    return () => clearInterval(interval)
  }, [])

  // Auto-save
  useEffect(() => {
    const save = () => {
      setState((prev) => {
        const saveState = { ...prev, lastSaveTime: Date.now() }
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveState))
        return saveState
      })
    }

    const interval = setInterval(save, 30000) // Save every 30 seconds
    window.addEventListener('beforeunload', save)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', save)
      save()
    }
  }, [])

  // Reset game
  const resetGame = useCallback(() => {
    localStorage.removeItem(SAVE_KEY)
    setState(createInitialState())
  }, [])

  return {
    state,
    handleClick,
    purchaseUpgrade,
    purchaseCreature,
    unlockArea,
    changeArea,
    resetGame,
    getClickAmount,
    areas,
  }
}
