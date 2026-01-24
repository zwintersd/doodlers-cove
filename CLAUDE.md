# CLAUDE.md - AI Assistant Guide for Doodler's Cove

## Project Overview

**Doodler's Cove** is a magical incremental clicker game built with React 19, TypeScript, and Vite. Players gather magical resources by doodling on a canvas, befriend creatures, purchase upgrades, and explore enchanted areas. The aesthetic is soft pastel, retro web (1990s-2000s internet charm) inspired by Care Bears, Dragon Tales, and Stardew Valley.

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Start development server (hot reload)
npm run build      # Type-check + production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

## Tech Stack

- **React 19.2** - UI framework with hooks
- **TypeScript 5.9** - Strict mode enabled
- **Vite 7.2** - Build tool and dev server
- **ESLint 9** - Linting (flat config format)
- **localStorage** - Game state persistence

## Project Structure

```
src/
├── components/           # React UI components
│   ├── ClickerArea.tsx   # Canvas-based doodling interaction
│   ├── ResourceDisplay.tsx
│   ├── UpgradeShop.tsx
│   ├── CreatureShop.tsx
│   ├── AreaSelector.tsx
│   ├── MilestoneDisplay.tsx
│   └── StatsPanel.tsx
├── hooks/
│   └── useGameState.ts   # Central game state & logic (main hook)
├── types/
│   └── game.ts           # TypeScript type definitions
├── data/
│   └── gameData.ts       # Game content (resources, upgrades, creatures, etc.)
├── App.tsx               # Root component
├── main.tsx              # Entry point
├── index.css             # Global styles + CSS variables
└── *.css                 # Component-specific styles

public/
└── assets/               # Game visual assets (see ASSETS_MANIFEST.md)
```

## Architecture

### State Management
- Central state lives in `useGameState()` custom hook (`src/hooks/useGameState.ts`)
- No external state library - pure React hooks (useState, useEffect, useCallback, useMemo)
- All game logic (tick loop, purchases, resource calculations) is in useGameState
- Props flow down from App to child components

### Key Files
| File | Purpose |
|------|---------|
| `src/hooks/useGameState.ts` | All game state and logic (~600 lines) |
| `src/types/game.ts` | Type definitions for all game entities |
| `src/data/gameData.ts` | Game content data (resources, upgrades, creatures, milestones, areas) |
| `src/App.tsx` | Layout and component composition |
| `src/index.css` | Global styles, CSS variables, utility classes |

### Game Loop
- **Tick Rate**: 100ms (10 ticks/second)
- **Auto-save**: Every 30 seconds + on page unload
- **Storage Key**: `'doodlers-cove-save'`

## Code Conventions

### TypeScript
- Strict mode enabled - no implicit any, unused locals, or parameters
- Use explicit types for function parameters and return values
- Props interfaces defined at top of component files
- Central type definitions in `src/types/game.ts`

```typescript
// Resource types are union strings
export type ResourceType = 'stardust' | 'rainbowDrops' | 'dreamSeeds' | ...

// Always type component props
interface ComponentProps {
  resources: Record<ResourceType, Resource>;
  onPurchase: (id: string) => void;
}
```

### React Patterns
- **Functional components only** (no class components)
- **useCallback** for event handlers passed to children
- **useMemo** for expensive calculations (multipliers, filtered lists)
- **useRef** for canvas elements and mutable values that don't trigger re-renders

```typescript
// State updates use functional form to avoid stale closures
setState((prev) => ({
  ...prev,
  resources: newResources,
}));
```

### CSS Conventions
- CSS variables in `:root` for theming (defined in `index.css`)
- Component-specific CSS files (e.g., `ClickerArea.css`)
- Utility classes: `.doodle-panel`, `.doodle-border`
- No CSS frameworks - pure CSS with flexbox/grid
- Responsive breakpoints at 900px and 600px

### Color Palette
```css
--pastel-lavender: #E8D5F2;  /* Primary / Stardust */
--pastel-pink: #FFD5E5;       /* Rainbow Drops */
--pastel-mint: #D5F5E3;       /* Dream Seeds */
--pastel-cream: #FFF8E1;      /* Moonbeams */
--pastel-rose: #FFE5E5;       /* Heart Gems */
--pastel-sky: #E5F3FF;        /* Cloud Fluff */
--pastel-peach: #FFE8D5;      /* Wish Petals */
```

### Naming Conventions
- Components: PascalCase (`ClickerArea.tsx`)
- Hooks: camelCase with `use` prefix (`useGameState.ts`)
- Types/Interfaces: PascalCase (`GameState`, `ResourceType`)
- CSS files: Match component name (`ClickerArea.css`)

## Game Data

### Resources (7 types)
Primary: Stardust | Secondary: Rainbow Drops, Dream Seeds, Moonbeams, Heart Gems, Cloud Fluff, Wish Petals

### Content Counts
- **Upgrades**: 26 (5 tiers)
- **Creatures**: 16 (5 tiers)
- **Milestones**: 24
- **Areas**: 4 (Starlight Meadow, Rainbow Falls, Dream Garden, Heart Crystal Cave)

### Game Mechanics
- Click multipliers stack multiplicatively
- Creature costs scale exponentially: `baseCost * Math.pow(costMultiplier, owned)`
- Upgrades have tiered unlock thresholds based on resources
- Areas unlock by spending resources

## Common Tasks

### Adding a New Upgrade
1. Add type to `src/types/game.ts` if needed
2. Add upgrade data to `src/data/gameData.ts` in `initialUpgrades` array
3. Ensure `effect` field matches expected calculation in `useGameState.ts`

### Adding a New Creature
1. Add creature data to `src/data/gameData.ts` in `initialCreatures` array
2. Specify `produces` resource type and `productionRate`
3. Set appropriate `tier` and `costMultiplier`

### Adding a New Resource
1. Add to `ResourceType` union in `src/types/game.ts`
2. Add to `initialResources` in `src/data/gameData.ts`
3. Add color variable in `src/index.css`
4. Update `ResourceDisplay.tsx` if special display needed

### Modifying Game Balance
- Upgrade effects: `src/data/gameData.ts` - `effect` field
- Creature production: `src/data/gameData.ts` - `productionRate` field
- Cost scaling: Modify `costMultiplier` fields
- Milestone thresholds: `src/data/gameData.ts` - `requirement` field

## Testing

No formal testing framework is configured. Verification is done via:
- TypeScript strict mode (catches type errors)
- ESLint (code quality)
- Manual testing in browser
- Check localStorage persistence works correctly

## Build & Deploy

```bash
npm run build     # Creates optimized /dist folder
npm run preview   # Test production build locally
```

The build output is a static site that can be deployed to any static hosting (Netlify, Vercel, GitHub Pages, etc.).

## Visual Style Guidelines

- **Soft pastels** - No saturated colors
- **Flat design** - No gradients or glow effects
- **Minimal animation** - Subtle, gentle movements only
- **Retro web aesthetic** - Doodle-style borders, organic shapes
- **Fonts**: VT323 (headings, retro), Patrick Hand (body, friendly)

See `ASSETS_MANIFEST.md` for detailed asset specifications.

## Important Notes

1. **State immutability**: Always create new objects when updating state
2. **Save compatibility**: When changing GameState structure, update the load function to handle migration
3. **Performance**: The tick loop runs every 100ms - keep calculations efficient
4. **Canvas drawing**: ClickerArea uses HTML5 Canvas - drawing state is local, not in GameState
5. **No external API calls**: Game is entirely client-side

## File Reference Summary

| What you need | Where to find it |
|---------------|------------------|
| Game logic & state | `src/hooks/useGameState.ts` |
| Type definitions | `src/types/game.ts` |
| Game content data | `src/data/gameData.ts` |
| Global styles/variables | `src/index.css` |
| App layout | `src/App.tsx` |
| Asset requirements | `ASSETS_MANIFEST.md` |
