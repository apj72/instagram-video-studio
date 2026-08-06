# VERSION 1 Studio — Decisions

## 2026-07-30: Preact over React

**Decision**: Use Preact (3KB) with @preact/signals for reactive state.

**Why**: Sufficient component model for this editor. Signals avoid prop-drilling and re-render overhead. 10x smaller than React.

**Trade-off**: Smaller ecosystem, some React libraries need compat shim. Acceptable for this project scope.

## 2026-07-30: Mediabunny for MP4 muxing

**Decision**: Use Mediabunny (successor to mp4-muxer) for H.264+AAC MP4 container.

**Why**: Tree-shakable, MPL-2.0 licensed, supports fast-start (moov atom at front), actively maintained. WebCodecs provides encoding, Mediabunny provides the container format.

**Trade-off**: Additional dependency. Alternative was raw WebCodecs output (WebM only) requiring post-conversion.

## 2026-07-30: Deterministic clock for render

**Decision**: Frame-based clock (`getTime(frameNumber)`) instead of wall-clock in render path.

**Why**: Export must produce identical frames to preview. Wall-clock variation causes non-determinism. Seeded PRNG (Mulberry32) ensures effects like glitch and particles are reproducible.

**Trade-off**: Slightly more complex clock management. Preview clock wraps rAF; export clock steps sequentially.

## 2026-07-30: No backend

**Decision**: Fully local-first. IndexedDB for persistence, File System Access API where available.

**Why**: Privacy by default, no accounts needed, no hosting costs. Target users are a small DJ collective making content for personal Instagram use.

**Trade-off**: No cloud backup, no collaboration, no cross-device sync.

## 2026-07-30: V2 in separate directory

**Decision**: Build V2 in `/v2` directory, V1 files read-only.

**Why**: V1 is actively used for production content. Breaking V1 during V2 development is unacceptable. Separate directory allows independent iteration.

**Trade-off**: Code duplication during transition period. V1 assets copied (not shared).
