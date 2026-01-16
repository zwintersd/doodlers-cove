import { useState, useEffect, useCallback, useMemo } from 'react'
import type { GameState, ResourceType, Upgrade, Creature, AreaType, Milestone } from '../types/game'
import { initialResources, initialUpgrades, initialCreatures, initialMilestones, areas } from '../data/gameData'

const SAVE_KEY = 'doodlers-cove-save'
const TICK_RATE = 100 // ms between ticks

function createInitialTotals(): Record<ResourceType, number> {
  return {
    stardust: 0,
    rainbowDrops: 0,
    dreamSeeds: 0,
    moonbeams: 0,
    heartGems: 0,
    cloudFluff: 0,
    wishPetals: 0,
  }
}

function createInitialState(): GameState {
  return {
    resources: JSON.parse(JSON.stringify(initialResources)),
    upgrades: JSON.parse(JSON.stringify(initialUpgrades)),
    creatures: JSON.parse(JSON.stringify(initialCreatures)),
    milestones: JSON.parse(JSON.stringify(initialMilestones)),
    totalClicks: 0,
    totalResourcesGathered: createInitialTotals(),
    globalMultiplier: 1,
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
      const state = createInitialState()

      // Merge resources
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

      // Merge upgrades
      if (parsed.upgrades) {
        state.upgrades = state.upgrades.map((u) => {
          const savedUpgrade = parsed.upgrades.find((s: Upgrade) => s.id === u.id)
          return savedUpgrade ? { ...u, ...savedUpgrade } : u
        })
      }

      // Merge creatures
      if (parsed.creatures) {
        state.creatures = state.creatures.map((c) => {
          const savedCreature = parsed.creatures.find((s: Creature) => s.id === c.id)
          return savedCreature ? { ...c, ...savedCreature } : c
        })
      }

      // Merge milestones
      if (parsed.milestones) {
        state.milestones = state.milestones.map((m) => {
          const savedMilestone = parsed.milestones.find((s: Milestone) => s.id === m.id)
          return savedMilestone ? { ...m, ...savedMilestone } : m
        })
      }

      state.totalClicks = parsed.totalClicks || 0
      state.totalResourcesGathered = parsed.totalResourcesGathered || createInitialTotals()
      state.globalMultiplier = parsed.globalMultiplier || 1
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

  // Calculate total creature count
  const totalCreatureCount = useMemo(() => {
    return state.creatures.reduce((sum, c) => sum + c.count, 0)
  }, [state.creatures])

  // Calculate milestone bonuses
  const milestoneMultipliers = useMemo(() => {
    let global = 1
    let click = 0
    const production: Partial<Record<ResourceType, number>> = {}

    state.milestones
      .filter((m) => m.achieved)
      .forEach((m) => {
        if (m.reward.type === 'globalMultiplier') {
          global *= m.reward.value
        } else if (m.reward.type === 'clickBonus') {
          click += m.reward.value
        } else if (m.reward.type === 'productionBonus' && m.reward.resourceAffected) {
          production[m.reward.resourceAffected] =
            (production[m.reward.resourceAffected] || 1) * m.reward.value
        }
      })

    return { global, click, production }
  }, [state.milestones])

  // Calculate creature boost from upgrades
  const getCreatureBoost = useCallback(
    (resource: ResourceType): number => {
      let boost = 1
      state.upgrades
        .filter((u) => u.purchased > 0 && u.effect.type === 'creatureBoost')
        .forEach((u) => {
          if (u.effect.resourceAffected === resource || u.effect.resourceAffected === 'stardust') {
            boost += u.effect.value * u.purchased
          }
        })
      return boost
    },
    [state.upgrades]
  )

  // Calculate click amount for a resource
  const getClickAmount = useCallback(
    (resource: ResourceType): number => {
      const base = state.resources[resource].perClick
      if (base === 0) return 0

      let multiplier = 1

      // Click multiplier upgrades
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

      // Global multiplier upgrades
      state.upgrades
        .filter(
          (u) =>
            u.purchased > 0 &&
            u.effect.type === 'globalMultiplier' &&
            u.effect.resourceAffected === resource
        )
        .forEach((u) => {
          multiplier *= u.effect.value
        })

      // Apply milestone bonuses
      multiplier *= milestoneMultipliers.global
      multiplier += milestoneMultipliers.click
      if (milestoneMultipliers.production[resource]) {
        multiplier *= milestoneMultipliers.production[resource]!
      }

      // Apply global state multiplier
      multiplier *= state.globalMultiplier

      return Math.floor(base * multiplier)
    },
    [state.resources, state.upgrades, state.globalMultiplier, milestoneMultipliers]
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

  // Calculate creature cost
  const getCreatureCost = useCallback(
    (creature: Creature): { resource: ResourceType; amount: number }[] => {
      return creature.baseCost.map((cost) => ({
        resource: cost.resource,
        amount: Math.floor(cost.amount * Math.pow(creature.costMultiplier, creature.count)),
      }))
    },
    []
  )

  // Main click handler
  const handleClick = useCallback(() => {
    setState((prev) => {
      const newResources = { ...prev.resources }
      const newTotals = { ...prev.totalResourcesGathered }
      const area = areas[prev.currentArea]

      // Add primary resource
      const clickAmount = getClickAmount(area.primaryResource)
      if (clickAmount > 0) {
        newResources[area.primaryResource] = {
          ...newResources[area.primaryResource],
          amount: newResources[area.primaryResource].amount + clickAmount,
        }
        newTotals[area.primaryResource] += clickAmount
      }

      // Check for bonus resources
      const bonuses = getBonusChances()
      for (const bonus of bonuses) {
        if (Math.random() < bonus.chance) {
          newResources[bonus.resource] = {
            ...newResources[bonus.resource],
            amount: newResources[bonus.resource].amount + 1,
          }
          newTotals[bonus.resource] += 1
        }
      }

      return {
        ...prev,
        resources: newResources,
        totalResourcesGathered: newTotals,
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
        return u
      })

      // Handle unlock effects
      if (upgrade.effect.type === 'unlockResource' && upgrade.purchased === 0) {
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
  const purchaseCreature = useCallback(
    (creatureId: string) => {
      setState((prev) => {
        const creatureIndex = prev.creatures.findIndex((c) => c.id === creatureId)
        if (creatureIndex === -1) return prev

        const creature = prev.creatures[creatureIndex]
        const cost = getCreatureCost(creature)

        // Check if can afford
        for (const c of cost) {
          if (prev.resources[c.resource].amount < c.amount) return prev
        }

        const newResources = { ...prev.resources }
        for (const c of cost) {
          newResources[c.resource] = {
            ...newResources[c.resource],
            amount: newResources[c.resource].amount - c.amount,
          }
        }

        // Update creature count
        const newCreatures = [...prev.creatures]
        newCreatures[creatureIndex] = {
          ...creature,
          count: creature.count + 1,
        }

        return {
          ...prev,
          resources: newResources,
          creatures: newCreatures,
        }
      })
    },
    [getCreatureCost]
  )

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

  // Auto-gather and production tick
  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const newResources = { ...prev.resources }
        const newTotals = { ...prev.totalResourcesGathered }
        let changed = false

        // Auto-gather from upgrades
        prev.upgrades
          .filter((u) => u.purchased > 0 && u.effect.type === 'autoGather')
          .forEach((u) => {
            const baseAmount = (u.effect.value * u.purchased * TICK_RATE) / 1000
            const multiplier =
              prev.globalMultiplier *
              milestoneMultipliers.global *
              (milestoneMultipliers.production[u.effect.resourceAffected] || 1)
            const amount = baseAmount * multiplier

            newResources[u.effect.resourceAffected] = {
              ...newResources[u.effect.resourceAffected],
              amount: newResources[u.effect.resourceAffected].amount + amount,
            }
            newTotals[u.effect.resourceAffected] += amount
            changed = true
          })

        // Production from creatures
        prev.creatures
          .filter((c) => c.count > 0)
          .forEach((creature) => {
            const resource = creature.produces.resource
            const baseProduction = creature.produces.amount * creature.count
            const creatureBoost = getCreatureBoost(resource)
            const multiplier =
              creatureBoost *
              prev.globalMultiplier *
              milestoneMultipliers.global *
              (milestoneMultipliers.production[resource] || 1)
            const amount = (baseProduction * multiplier * TICK_RATE) / 1000

            newResources[resource] = {
              ...newResources[resource],
              amount: newResources[resource].amount + amount,
            }
            newTotals[resource] += amount
            changed = true
          })

        // Unlock upgrades based on resources
        const newUpgrades = prev.upgrades.map((u) => {
          if (u.unlocked) return u

          // Unlock based on resource type availability
          const resourceAmount = prev.resources[u.resourceType].amount
          const resourceTotal = prev.totalResourcesGathered[u.resourceType]

          if (u.resourceType === 'stardust') {
            // Stardust upgrades unlock at certain thresholds
            if (u.id === 'starlight-blessing' && resourceTotal >= 200) return { ...u, unlocked: true }
            if (u.id === 'celestial-convergence' && resourceTotal >= 5000) return { ...u, unlocked: true }
          }
          if (u.resourceType === 'rainbowDrops' && resourceAmount >= 1) return { ...u, unlocked: true }
          if (u.resourceType === 'cloudFluff' && resourceAmount >= 5) return { ...u, unlocked: true }
          if (u.resourceType === 'dreamSeeds' && resourceAmount >= 1) return { ...u, unlocked: true }
          if (u.resourceType === 'moonbeams' && resourceAmount >= 1) return { ...u, unlocked: true }
          if (u.resourceType === 'heartGems' && resourceAmount >= 1) return { ...u, unlocked: true }
          if (u.resourceType === 'wishPetals' && resourceAmount >= 1) return { ...u, unlocked: true }

          return u
        })

        // Check milestones
        const newMilestones = prev.milestones.map((m) => {
          if (m.achieved) return m

          let achieved = false
          const req = m.requirement

          switch (req.type) {
            case 'totalClicks':
              achieved = prev.totalClicks >= req.amount
              break
            case 'totalResource':
              if (req.resource) {
                achieved = newTotals[req.resource] >= req.amount
              }
              break
            case 'creatureCount':
              achieved = prev.creatures.reduce((sum, c) => sum + c.count, 0) >= req.amount
              break
            case 'areaUnlock':
              achieved = prev.unlockedAreas.length >= req.amount
              break
          }

          return achieved ? { ...m, achieved: true } : m
        })

        // Calculate new global multiplier from newly achieved milestones
        let newGlobalMultiplier = prev.globalMultiplier
        newMilestones.forEach((m, i) => {
          if (m.achieved && !prev.milestones[i].achieved) {
            if (m.reward.type === 'globalMultiplier') {
              newGlobalMultiplier *= m.reward.value
            }
          }
        })

        if (!changed && newUpgrades === prev.upgrades && newMilestones === prev.milestones) {
          return prev
        }

        return {
          ...prev,
          resources: newResources,
          totalResourcesGathered: newTotals,
          upgrades: newUpgrades,
          milestones: newMilestones,
          globalMultiplier: newGlobalMultiplier,
        }
      })
    }

    const interval = setInterval(tick, TICK_RATE)
    return () => clearInterval(interval)
  }, [getCreatureBoost, milestoneMultipliers])

  // Auto-save
  useEffect(() => {
    const save = () => {
      setState((prev) => {
        const saveState = { ...prev, lastSaveTime: Date.now() }
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveState))
        return saveState
      })
    }

    const interval = setInterval(save, 30000)
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
    getCreatureCost,
    totalCreatureCount,
    areas,
  }
}
