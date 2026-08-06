# VERSION 1 Studio — Task Backlog

## Phase 1: Foundation

- [x] Scaffold Vite + Preact + TS project
- [x] Install dependencies (mediabunny, @preact/signals)
- [x] Copy brand assets
- [x] Project schema with versioning (`core/schema.ts`)
- [x] V1 config importer (`core/migration.ts`)
- [x] Deterministic clock (`core/clock.ts`)
- [x] Seeded PRNG (`core/random.ts`)
- [x] Keyframe interpolation (`timeline/interpolation.ts`)
- [x] Basic render engine (`render/engine.ts`)
- [x] Reactive state with signals (`core/state.ts`)
- [x] Editor shell: Toolbar, Sidebar, Timeline, Canvas viewport
- [x] Living documents
- [ ] First commit on v2-development branch

## Phase 2: Core Rendering

- [ ] Port all V1 effects with deterministic rendering
- [ ] Typography engine with FontFace API
- [ ] Video layer rendering
- [ ] Shape layer rendering
- [ ] Group layer support

## Phase 3: Timeline & Audio

- [ ] Timeline data model (tracks, clips, keyframes)
- [ ] Timeline UI with scrubbing and zoom
- [ ] Web Audio API analyser
- [ ] BPM detection
- [ ] Beat grid overlay and snapping

## Phase 4: Canvas Interaction

- [ ] Click-to-select layers on canvas
- [ ] Transform handles (move, resize, rotate)
- [ ] Snapping and alignment guides
- [ ] Instagram safe area overlays

## Phase 5: State Management & Persistence

- [ ] Command pattern undo/redo
- [ ] IndexedDB project storage
- [ ] Autosave and crash recovery
- [ ] Preset system

## Phase 6: Export Pipeline

- [ ] WebCodecs H.264 encoder
- [ ] AAC audio encoding
- [ ] Mediabunny MP4 muxer with fast-start
- [ ] Export presets (Reel, Story, Feed)
- [ ] MediaRecorder fallback

## Phase 7: Templates & Polish

- [ ] Motion presets (entrance/exit animations)
- [ ] Starter templates
- [ ] Brand kit system
- [ ] Keyboard shortcuts

## Phase 8: Testing & Quality

- [ ] Unit tests (schema, commands, migration, interpolation)
- [ ] Render determinism tests
- [ ] Export probe tests
- [ ] Accessibility audit
