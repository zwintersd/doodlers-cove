// Magical resources inspired by Stardew Valley but more whimsical
export type ResourceType =
  | 'stardust'      // Primary currency - from clicking
  | 'rainbowDrops'  // Secondary currency - rare from clicks
  | 'dreamSeeds'    // For growing magical plants
  | 'moonbeams'     // Nighttime energy
  | 'heartGems'     // Care Bear inspired - from spreading joy
  | 'cloudFluff'    // For crafting and building
  | 'wishPetals'    // Dragon Tales inspired - from wishes

export interface Resource {
  id: ResourceType
  name: string
  description: string
  amount: number
  perClick: number
  perSecond: number
  icon: string // placeholder for asset reference
  color: string // pastel color for UI
}

export interface Upgrade {
  id: string
  name: string
  description: string
  resourceType: ResourceType
  cost: number
  costMultiplier: number // How much cost increases per purchase
  purchased: number
  maxPurchases: number | null // null = unlimited
  effect: UpgradeEffect
  unlocked: boolean
  icon: string
}

export interface UpgradeEffect {
  type: 'clickMultiplier' | 'autoGather' | 'unlockResource' | 'bonusChance' | 'globalMultiplier' | 'creatureBoost' | 'synergyBonus'
  resourceAffected: ResourceType
  value: number
  secondaryResource?: ResourceType // For synergy bonuses
}

export interface Creature {
  id: string
  name: string
  description: string
  count: number // How many of this creature you own
  baseCost: { resource: ResourceType; amount: number }[]
  costMultiplier: number // How much cost increases per purchase
  produces: { resource: ResourceType; amount: number }
  icon: string
}

export interface Milestone {
  id: string
  name: string
  description: string
  requirement: MilestoneRequirement
  reward: MilestoneReward
  achieved: boolean
  icon: string
}

export interface MilestoneRequirement {
  type: 'totalResource' | 'totalClicks' | 'creatureCount' | 'upgradeCount' | 'areaUnlock'
  resource?: ResourceType
  creatureId?: string
  amount: number
}

export interface MilestoneReward {
  type: 'globalMultiplier' | 'clickBonus' | 'productionBonus' | 'unlockCreature' | 'unlockUpgrade'
  value: number
  resourceAffected?: ResourceType
  targetId?: string // For unlocking specific creatures/upgrades
}

export interface GameState {
  resources: Record<ResourceType, Resource>
  upgrades: Upgrade[]
  creatures: Creature[]
  milestones: Milestone[]
  totalClicks: number
  totalResourcesGathered: Record<ResourceType, number> // Lifetime totals for milestones
  globalMultiplier: number // Bonus from milestones
  currentArea: AreaType
  unlockedAreas: AreaType[]
  lastSaveTime: number
}

export type AreaType =
  | 'meadow'        // Starting area - stardust & cloud fluff
  | 'rainbow-falls' // Unlockable - rainbow drops & moonbeams
  | 'dream-garden'  // Unlockable - dream seeds & wish petals
  | 'heart-cave'    // Unlockable - heart gems

export interface Area {
  id: AreaType
  name: string
  description: string
  primaryResource: ResourceType
  secondaryResource: ResourceType
  unlockCost: { resource: ResourceType; amount: number }[] | null
  background: string // asset reference
}
