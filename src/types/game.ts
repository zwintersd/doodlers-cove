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
  type: 'clickMultiplier' | 'autoGather' | 'unlockResource' | 'bonusChance'
  resourceAffected: ResourceType
  value: number
}

export interface Creature {
  id: string
  name: string
  description: string
  unlocked: boolean
  produces: { resource: ResourceType; amount: number }
  cost: { resource: ResourceType; amount: number }[]
  icon: string
}

export interface GameState {
  resources: Record<ResourceType, Resource>
  upgrades: Upgrade[]
  creatures: Creature[]
  totalClicks: number
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
