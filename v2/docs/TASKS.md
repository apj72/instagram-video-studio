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
- [x] First commit on v2-development branch

## Phase 2: Core Rendering

- [x] Port all V1 effects with deterministic rendering
- [x] Video layer rendering
- [x] Shape layer rendering
- [x] Letter spacing in text rendering
- [x] Master alpha + instrument alpha envelopes
- [x] Spectrum smoothing with peak hold
- [x] V1-matching waveform (256 points, fill, 18px glow)
- [x] V1-matching audio simulation (layered harmonics)
- [x] Noise rectangles in glitch effect
- [x] Particle system
- [ ] Typography engine with FontFace API (advanced)
- [ ] Group layer support

## Phase 3: Timeline & Audio

- [x] Web Audio API analyser with AnalyserNode
- [x] BPM detection (onset energy autocorrelation)
- [x] Audio file loading and playback sync
- [x] Timeline UI with zoom slider
- [x] Beat markers and downbeat emphasis
- [x] Audio panel (volume, mute, BPM, beat offset)
- [ ] Keyframe editing in timeline
- [ ] Track clip dragging and reordering
- [ ] Snap to beat grid

## Phase 4: Canvas Interaction

- [ ] Click-to-select layers on canvas
- [ ] Transform handles (move, resize, rotate)
- [ ] Snapping and alignment guides
- [ ] Instagram safe area overlays

## Phase 5: State Management & Persistence

- [x] Command pattern undo/redo with Cmd+Z/Cmd+Shift+Z
- [x] IndexedDB project storage
- [x] Autosave every 30 seconds
- [ ] Preset system
- [ ] Brand kit

## Phase 6: Export Pipeline

- [x] WebCodecs H.264 encoder via Mediabunny CanvasSource
- [x] Mediabunny MP4 muxer with fast-start (in-memory)
- [x] Export dialog with format presets and progress
- [x] MediaRecorder fallback (WebM)
- [ ] AAC audio encoding
- [ ] Export validation (codec/dimensions check)

## Phase 7: Templates & Polish

- [ ] Motion presets (entrance/exit animations)
- [ ] Starter templates
- [ ] Brand kit system
- [ ] Keyboard shortcuts (beyond undo/redo)

## Phase 8: Testing & Quality

- [ ] Unit tests (schema, commands, migration, interpolation)
- [ ] Render determinism tests
- [ ] Export probe tests
- [ ] Accessibility audit
