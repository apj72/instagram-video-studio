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
- [x] Keyframe editing in timeline (diamonds, drag, easing, delete)
- [x] Property selector for keyframe editing
- [ ] Track clip dragging and reordering
- [ ] Snap to beat grid

## Phase 4: Canvas Interaction

- [x] Click-to-select layers on canvas
- [x] Drag-to-move layers on canvas
- [x] Arrow key nudging (0.002 step, 0.01 with Shift)
- [x] Instagram safe area overlays (Reel, Feed 4:5, Grid 1:1)
- [x] Selection bounds with corner handles
- [x] Delete/Backspace to remove selected layer
- [x] Project settings panel (duration, FPS, BG color, seed, safe areas)
- [x] Add layer panel (all layer and effect types)
- [ ] Resize handles (corner/edge)
- [ ] Rotation handles
- [ ] Snapping and alignment guides

## Phase 5: State Management & Persistence

- [x] Command pattern undo/redo with Cmd+Z/Cmd+Shift+Z
- [x] IndexedDB project storage
- [x] Autosave every 30 seconds
- [ ] Brand kit
- [ ] .v2proj file export/import

## Phase 6: Export Pipeline

- [x] WebCodecs H.264 encoder via Mediabunny CanvasSource
- [x] Mediabunny MP4 muxer with fast-start (in-memory)
- [x] Export dialog with format presets and progress
- [x] MediaRecorder fallback (WebM)
- [x] AAC audio encoding via Mediabunny AudioBufferSource
- [x] Audio trim, volume, offset applied during export
- [ ] Export validation (codec/dimensions check)

## Phase 7: Templates & Polish

- [x] Motion presets (14 presets: entrance/exit/emphasis)
- [x] Motion panel in sidebar
- [x] 5 Starter templates (DJ Line-Up, Event Promo, Track Release, Countdown, Logo Sting)
- [x] Template browser dialog
- [ ] Brand kit system
- [ ] Additional keyboard shortcuts

## Phase 8: Testing & Quality

- [ ] Unit tests (schema, commands, migration, interpolation)
- [ ] Render determinism tests
- [ ] Export probe tests
- [ ] Accessibility audit
