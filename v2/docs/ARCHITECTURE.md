# VERSION 1 Studio — Architecture

## Subsystems

```
┌─────────────────────────────────────────────┐
│                  Editor UI                   │
│  Toolbar │ Sidebar │ Canvas │ Timeline       │
├──────────┴────────┬┴────────┴────────────────┤
│    State (signals) │   Commands (undo/redo)  │
├───────────────────┬┴────────────────────────┤
│   Render Engine   │   Audio System          │
│   (Canvas 2D)     │   (Web Audio API)       │
├───────────────────┴─────────────────────────┤
│              Export Pipeline                  │
│   WebCodecs H.264 → Mediabunny MP4 muxer    │
├─────────────────────────────────────────────┤
│              Persistence                     │
│   IndexedDB projects + File System Access   │
└─────────────────────────────────────────────┘
```

## Key Interfaces

### Project Schema (`core/schema.ts`)
Versioned JSON schema. All project state serializable. Layers, audio, export settings, metadata.

### Deterministic Clock (`core/clock.ts`)
Frame-based time. `getTime(frameNumber)` returns milliseconds. No wall-clock dependency in render path. Preview uses rAF-driven clock; export uses sequential frame stepping.

### Seeded PRNG (`core/random.ts`)
Mulberry32. Same seed + frame = same output. Used by glitch, particles, noise effects.

### Render Engine (`render/engine.ts`)
`renderFrame(project, ctx, timeMs, frameNumber, assets, audioData)` — pure function, draws one frame to a canvas context. Iterates layers in z-order.

### State (`core/state.ts`)
Preact signals for reactive UI updates. `project`, `selectedLayerId`, `currentTime`, `isPlaying`. Computed signals for derived state.

### Keyframe Evaluation (`timeline/interpolation.ts`)
`evaluateProperty(prop, timeMs)` — finds bracketing keyframes, interpolates with easing.

## V1 Migration (`core/migration.ts`)
`importV1Config(v1Config)` maps V1 config format to V2 Project schema. Extracts embedded data URLs into separate asset references. Never modifies V1 files.

## Directory Layout

```
v2/src/
  core/      — schema, state, clock, random, migration, commands, assets
  render/    — engine, layer renderers, effects, typography
  audio/     — analyser, BPM detection, playback
  export/    — WebCodecs encoder, Mediabunny muxer, presets
  timeline/  — interpolation, beat grid, data model
  editor/    — Preact components (App, Shell, Toolbar, Sidebar, Timeline)
  styles/    — global CSS, design tokens
```

## Constraints

- Fully local — no backend, no network calls (except asset loading)
- V1 files are read-only reference material
- Deterministic rendering for export parity
- Tree-shakable — only ship what's used
