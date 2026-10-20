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

## 2026-10-20: Text background boxes follow the text's alignment

**Decision**: `renderTextLayer` places a text layer's background or border box with `textBoxLeft`, the same helper `getLayerBounds` uses, instead of always centring it on the anchor.

**Why**: The renderer centred every box while the editor's selection bounds placed it against the alignment, so a left-aligned label with a background drew its box in one place and showed handles in another. Nothing shipped relied on the old behaviour — every text layer in the demo, Tony T and built-in templates was centre-aligned. The fix also lets a template get an auto-sized box that lines up with a left text column, which the Version1 handle plate and red tag need.

**Trade-off**: Any saved project with a left or right-aligned text layer that has a background will see the box move. None exist in the bundled templates.

## 2026-10-20: Version1 event templates run on a 128 BPM grid

**Decision**: The Version1 event series is 128 BPM, eight bars, exactly 15.000 seconds, with scenes cutting on the bar and the scrim, beams and camera pulsing every half bar.

**Why**: 128 BPM makes a bar 1875 ms, so eight bars land exactly on the 15-second Reel length the brand guide asks for. Choreographing to that grid means a house excerpt dropped in afterwards lands on the existing cuts without moving a keyframe, and the energy comes from light and camera rather than from the glitch and spin effects the guide rules out.

**Trade-off**: Changing a template's duration requires whole bars (1.875 s) or the cuts drift off the beat.

## 2026-10-21: Video layers are driven from the timeline

**Decision**: `src/render/videoSync.ts` moves `<video>` elements to match the playhead. `exportMp4` awaits `seekVideoAssets` before every frame; the editor's preview calls `followVideoAssets`.

**Why**: The renderer draws whatever frame a video element happens to be showing, and nothing was moving it. On export that froze the background, because 450 frames render far faster than a clip plays, and on the preview it meant scrubbing showed the wrong frame. Real footage behind the Version1 templates is only possible with this.

**Trade-off**: Export is roughly four times slower for a project with a video layer, because each frame waits on a decoder seek. Projects without one are unaffected.

## 2026-10-21: Bungee is measured per glyph, not averaged

**Decision**: `version1Events.ts` carries a table of Bungee advances measured from the bundled font, and `measureLine` uses it to cap type sizes.

**Why**: The templates want the biggest type that fits the safe column. A single average advance is wrong by up to 8% either way — M is 0.85 em and a space is 0.23 — so it either overflowed the column or left the headline needlessly small. The table matches the renderer's own `measureText` to about a pixel.

**Trade-off**: The table has to be remeasured if the bundled Bungee file is ever replaced. `render.py --check` measures against the real canvas and will catch it.
