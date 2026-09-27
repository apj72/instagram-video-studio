# Claude prompt: turn VERSION 1 into an AAA Instagram video studio

You are the principal product engineer, creative director, motion-design director, rendering engineer, QA lead, and multi-agent orchestrator for this repository:

`https://github.com/apj72/version1`

Your mission is to transform the existing VERSION 1 prototype into the best professional Instagram video-creation tool that can realistically be built in this environment. The quality bar is not “good for a demo” or “feature complete.” It is a polished, coherent, dependable product that a professional DJ, promoter, designer, or social-media team would willingly use for paid campaigns.

The existing repository is the starting point, not a specification and not disposable. It currently contains a dependency-free HTML5 Canvas/vanilla-JavaScript editor and animation engine for 1080×1920 content, including configurable logos, text, background images, scrolling layers, BPM-synchronised simulated spectrum/waveform effects, glitch/scanline/grid/sweep effects, layer ordering, video slices, local presets, still capture, standalone-HTML download, and browser MediaRecorder export. V1 is permanently preserved as the stable reference application. V2 may reproduce and improve its behaviour, but completing a V2 replacement never grants permission to remove or modify V1. Preserve the VERSION 1 brand assets and make migration of existing `default_config.json` projects possible.

## Version and repository rules

Work in this existing repository, but build the new application as V2.

- Before making changes, verify that the working tree is understood, preserve any existing user changes, and create and work on a new Git branch named `v2-development`. If that branch already exists, inspect it and continue safely rather than overwriting it.
- Treat all current V1 application files as read-only reference material. Do not modify, rename, move, regenerate, or delete any V1 file unless the user explicitly approves that exact change.
- Create V2 in a new top-level `/v2` directory.
- Keep all V2 source code, tests, fixtures, configuration, documentation, generated reports, and build output inside `/v2`, except for intentionally shared root-level project metadata approved by the user.
- Copy assets required at V2 runtime into `/v2/public/assets`. V2 must not depend on V1-relative runtime paths, and copying an asset does not authorise modifying or deleting its V1 original.
- Preserve asset provenance and licences. Avoid unnecessary asset duplication where it would create licensing or maintenance problems; document any deliberate shared asset instead.
- Provide a tested, versioned importer for V1 `default_config.json` projects and relevant V1 presets.
- Never overwrite a V1 configuration or project during import. Import into a newly created V2 project and retain the original unchanged.
- Put V2 setup, development, testing, migration, and export instructions in `/v2/README.md`.
- The root `README.md` is also considered a protected V1/root file. Do not edit it without explicit user approval. Instead, prepare a proposed minimal patch that links to `/v2/README.md` and present it for approval near completion.
- Make small, coherent commits at verified milestones. Do not commit secrets, generated media, large temporary assets, dependency caches, or unrelated changes.
- Do not merge into `main`, push branches, open pull requests, publish packages, deploy, create a release, or alter remote repository settings without the user’s explicit approval.
- The existing V1 application must continue to open and function exactly as it did before V2 work began. Run a V1 regression smoke test at major milestones and before declaring completion.
- V2 may use a new architecture and justified dependencies, but it must remain independently installable, runnable, testable, and removable without breaking V1.
- If a necessary change appears to require touching a protected V1 or root file, stop that change, document the reason and proposed diff, and continue with other safe V2 work while awaiting approval.

## Operating mandate

Do not merely write a plan. Inspect the repository, run the current product, create a rigorous plan, and then implement it. Continue through research, architecture, implementation, visual evaluation, testing, performance work, accessibility, documentation, and release preparation. Do not stop after scaffolding, a redesign mock-up, a list of suggestions, or one successful happy-path demo.

Use sub-agents aggressively for independent research, audits, implementation work, test design, and criticism, but do not let them make uncoordinated changes to coupled systems. First establish architecture, contracts, ownership, fixtures, and quality gates. Parallelise genuinely independent work; handle coupled work sequentially under one integration owner. Every agent must inspect the current repository and relevant contracts before changing anything.

Maintain these living project documents:

- `PRODUCT_SPEC.md`: target users, jobs to be done, scope, non-goals, workflows, acceptance criteria, and product decisions.
- `ARCHITECTURE.md`: subsystem boundaries, rendering clock, project schema, asset lifecycle, command/undo model, export pipeline, interfaces, ownership, and dependency rules.
- `DESIGN_SYSTEM.md`: visual language, spacing, typography, colour, controls, motion principles, accessibility, and responsive behaviour.
- `QUALITY_SCORECARD.md`: measurable gates, benchmark results, known defects, screenshots, export checks, and critic scores.
- `DECISIONS.md`: dated architecture/product decisions and trade-offs.
- `TASKS.md`: prioritised backlog with owner, dependency, status, evidence, and validation result.

Commit small, coherent milestones. Never overwrite or delete user work, brand assets, or existing configurations without a migration and an explicit recorded reason. Do not introduce paid services, secret keys, proprietary assets, unclear licences, telemetry, accounts, uploads, or a backend unless they are genuinely required and documented. Prefer local-first operation and privacy by default.

## Phase 1 — forensic audit and benchmark

Before redesigning anything:

1. Run the existing editor and exercise every documented feature.
2. Inspect `README.md`, `USERGUIDE.md`, `default_config.json`, `version1_editor.html`, `version1_animation_v5.html`, the archive, fonts, and images.
3. Catalogue bugs, architectural risks, browser limitations, visual weaknesses, performance costs, accessibility failures, data-loss risks, and export incompatibilities.
4. Produce deterministic reference projects that cover text, logos, images, video, every effect, layer ordering, custom fonts, BPM behaviour, preset persistence, still capture, and video export.
5. Capture baseline screenshots and videos at fixed timestamps. Record browser, viewport, DPR, frame count, codec, duration, dimensions, file size, and render time.
6. Research current Instagram requirements from primary Meta documentation. Record supported aspect ratios, resolutions, safe areas, duration limits, frame rates, codecs, audio formats, file-size constraints, and thumbnail behaviour with citations and the date checked. Do not rely on remembered limits.
7. Study a deliberately selected reference set of excellent motion-graphics tools, professional club/event promos, typography-led reels, and high-performing Instagram creative. Use them for principles and comparison only—do not copy protected designs or assets.
8. Interview the repository itself: distinguish working features from claims, and identify where simulated audio, real audio, preview time, and export time differ.

Spawn independent audit agents for product/UX, motion design, render/export engineering, code architecture, accessibility, and QA/security. Have an integration agent reconcile their findings into one prioritised plan. Conflicting recommendations must be resolved explicitly in `DECISIONS.md`.

## Phase 2 — define the product before building it

Create a concise product strategy and validate the key workflow:

`Choose format/template → add media/audio/brand → compose and animate → synchronise to music → preview → validate safe areas → export an Instagram-ready file → reopen and revise`

The application must feel like one intentional product, not a collection of effects. Define a professional information architecture and a progressive editing model that is approachable for a first-time user but gives experts precise control.

At minimum, design and scope:

- Instagram Reel/Story 9:16 and feed portrait/square/landscape presets, plus custom dimensions.
- Visible safe-area overlays for Instagram UI and crop previews for each destination.
- A real timeline with playhead, time ruler, zoom, snapping, trimming, layer tracks, in/out points, keyframes, easing, copy/paste, duplicate, lock, hide, reorder, and multi-select where appropriate.
- Direct manipulation on the canvas: select, move, resize, rotate, align, distribute, snap, crop, fit/fill, keyboard nudging, and clear selection bounds.
- A coherent layer model for text, shapes, images, logos, video, audio, groups, masks, backgrounds, and effects.
- Non-destructive editing, undo/redo across meaningful actions, autosave, crash recovery, named projects, duplicate/version flow, import/export of a versioned project file, and migration of the existing configuration.
- Brand kits with logos, fonts, colours, reusable text styles, and templates.
- Excellent text controls: font loading, hierarchy presets, alignment, tracking, leading, wrapping, auto-fit, stroke, shadow, background, contrast warnings, and legible animation.
- Audio import and playback with a waveform generated from the actual audio, BPM/beat-grid assistance, manual BPM and offset correction, markers, beat snapping, level controls, fades, mute/solo, and visual effects driven by analysed audio rather than only simulated values.
- High-quality motion presets built from editable primitives: entrances/exits, scale, position, opacity, rotation, blur where technically appropriate, masks/reveals, rhythm-aware cuts, controlled glitch, light, grain, and colour treatments.
- Curated, genuinely strong starter templates for DJ line-ups, event announcements, track releases, countdowns, venue promos, and logo stings. Each template must remain fully editable and demonstrate hierarchy rather than visual clutter.
- Fast preview at sensible quality settings and a deterministic final-render mode.
- Export presets that produce directly uploadable Instagram files where the local platform permits it; clear fallback instructions only where a browser cannot encode the required format.

Do not assume every feature belongs in version one. Rank work by user value, creative quality, technical feasibility, and risk. A smaller complete workflow beats a broad but fragile editor. However, do not defer fundamentals such as reliable save/reopen, undo, deterministic output, audio sync, or upload-compatible export.

## Phase 3 — architecture and migration

Choose the architecture only after the audit. The current pair of very large HTML files is not a sustainable final structure. Propose the smallest justified toolchain and modular architecture, then have a hostile architecture reviewer challenge it before implementation.

The architecture must provide:

- A single versioned project schema with validation, defaults, migrations, and fixtures.
- Separation between document state, editor UI state, asset storage, preview rendering, and export rendering.
- A deterministic project clock. Rendering frame `n` at frame rate `fps` must depend on project time `n / fps`, never wall-clock timing or prior preview history.
- Seeded randomness for particles, noise, and glitches so the same project, seed, time, and settings reproduce the same frame.
- A render graph/layer contract with explicit compositing, masks, blend modes, and effect bounds.
- An asset manager that safely handles image/video/audio/font decoding, object-URL cleanup, missing assets, metadata, memory limits, and portable project packaging.
- A command-based editing model suitable for undo/redo and testable transformations.
- Preview/export parity: shared rendering logic with deliberate, documented quality differences only.
- An export abstraction that can support browser capabilities and, if justified, a local FFmpeg-based route without requiring cloud upload.
- Clear capability detection and honest user messages for Safari, Chromium, and Firefox.
- Automated tests at unit, integration, visual, timeline, migration, and export levels.

Preserve old projects through an importer. Create migration fixtures and prove that importing `default_config.json` retains its intent. Keep a compatibility route until replacement functionality passes the agreed gates.

## Phase 4 — multi-agent implementation protocol

Create a dependency graph and assign agents narrow, testable ownership. Suggested workstreams are:

1. Project schema, migration, persistence, undo/redo, and asset packaging.
2. Deterministic render engine, composition/layers, typography, and effect primitives.
3. Timeline, keyframes, easing, beat grid, audio analysis, and playback synchronisation.
4. Export/encoding, frame scheduling, audio muxing, progress/cancellation, and compatibility.
5. Editor shell, canvas interaction, inspector, asset library, keyboard model, responsive layout, and accessibility.
6. Templates, brand kit, motion language, and sample projects.
7. Test harness, deterministic capture, visual diffs, export probing, performance telemetry, and release checks.

Before parallel implementation, freeze shared types and interfaces in `ARCHITECTURE.md`. Give each file or module one active owner. Agents work in isolated branches/worktrees where supported. Each returns a focused commit, tests, screenshots or exports, measured results, trade-offs, and remaining risks. The integration owner reviews and merges sequentially, reruns the full suite, resolves design inconsistencies, and reverts regressions.

Do not accept an agent’s self-assessment. Every material change requires independent verification. Do not allow agents to optimise isolated modules by violating cross-system timing, schema, visual, or UX contracts.

## Phase 5 — the quality loop

After each coherent milestone, execute this loop:

1. Build and run all automated tests.
2. Render every canonical project from a clean state at predetermined frames and produce complete videos.
3. Test save → close → reopen → render; old-schema import; missing assets; long text; unusual fonts; large media; unsupported codec; cancellation; and low-memory behaviour.
4. Measure frame pacing, interaction latency, memory, startup, decode time, render speed, output size, duration drift, A/V drift, dropped/duplicated frames, and browser compatibility.
5. Have independent visual critics—who did not implement the feature—score the output blind against the selected professional references.
6. Have independent UX, motion, typography, export, accessibility, and reliability critics identify the highest-impact defects. They must cite exact screen, timestamp, layer, workflow step, and evidence; “make it pop” is not actionable.
7. Cluster the findings by root cause. Fix root causes in priority order under a single owner for coupled areas.
8. Rerun the same fixtures and compare against the baseline. Reject changes that merely move defects elsewhere.
9. Update `QUALITY_SCORECARD.md` with evidence and repeat.

Use `/loop` or the available recurring-agent mechanism to rerun this evaluation-and-repair cycle, but never use an unbounded subjective loop as a substitute for engineering. Stop only when the exit gates below are supported by evidence, or when a genuine environment limitation is documented with the best achievable fallback and a reproducible proof.

## Mandatory visual review protocol

Build a deterministic capture harness. Each canonical project must have named frames and a full export. Isolate captures so animation state, random state, decoded media state, and previous frames cannot leak into another test unless the test explicitly covers temporal accumulation.

Critics must review outputs at actual phone size and enlarged desktop size. They must check:

- composition, focal hierarchy, rhythm, typography, spacing, alignment, contrast, colour, restraint, brand consistency, and legibility;
- motion arcs, easing, anticipation, overshoot, temporal hierarchy, beat alignment, loop seam, cuts, and whether effects support meaning;
- compression artefacts, banding, aliasing, dropped frames, font substitution, crop/safe-area failures, black frames, and A/V drift;
- whether the result looks like a coherent paid campaign rather than a generic template or effects demo.

Run blind comparisons where meaningful, but never claim superiority based only on agents being “wowed.” Record scores and specific evidence. Require median scores of at least 9/10 for polish, motion, typography, usability, and export reliability across the canonical set, with no unresolved critical defect. If scores plateau, investigate the systemic ceiling instead of repeatedly changing surface styling.

## Technical acceptance gates

The final product must demonstrate all of the following:

- Existing default configuration imports successfully through a tested migration.
- Project save/reopen is lossless for supported assets and settings.
- Undo/redo behaves predictably for all core editing operations.
- The first rendered frame and any requested frame are reproducible from a clean run.
- Seeded effects are deterministic; capture order cannot change their output.
- Preview and export agree at named timestamps within the documented tolerance.
- User-entered BPM, beat offset, and timeline markers remain aligned for the full export.
- Exported dimensions, pixel aspect, frame rate, duration, codecs, colour handling, and audio properties are probed from the produced file and match the selected preset.
- A/V drift at the end of the longest canonical export is no greater than one output frame or the strictest practical browser limit, which must be measured and disclosed.
- The first/last-frame seam of designated loops passes automated pixel and perceptual-difference thresholds.
- No silent data loss, uncaught errors, broken controls, missing-font surprises, or indefinite spinners occur in the canonical workflows.
- Keyboard navigation, visible focus, labels, contrast, reduced-motion behaviour, and screen-reader basics pass the documented accessibility audit.
- The editor remains usable at common laptop widths and does not obscure the preview or essential controls.
- Performance budgets are defined from a measured baseline and met on the available reference hardware. Optimisation must preserve visual output unless an intentional change is approved.
- Production build, tests, lint/type checks, deterministic captures, sample exports, and documentation all succeed from a clean checkout with documented commands.

## Product-quality constraints

- Do not imitate Instagram’s interface; optimise for creating content destined for Instagram.
- Do not equate “AAA” with excessive glow, glitch, particles, or controls. Quality means strong art direction, excellent defaults, purposeful motion, precision, reliability, speed, and coherence.
- Default projects must look excellent before adjustment. Avoid randomised designs that cannot be reproduced.
- Never use fake spectrum data when real audio is loaded. Make simulated mode explicit when no audio exists.
- Never claim MP4 or Instagram compatibility merely because a filename ends in `.mp4`; inspect the actual container, video codec, audio codec, frame rate, dimensions, duration, and playback.
- Do not add AI generation merely for novelty. If an AI-assisted feature is proposed, it must be optional, transparent, editable, privacy-conscious, and must not block the core local workflow.
- Use only assets and fonts whose licences permit redistribution; record provenance.
- Avoid vendor lock-in. A user must be able to export their project and final media without an account.
- Do not hide platform limitations. Present a precise fallback with the minimum user effort.
- Treat errors, empty states, progress, cancellation, destructive actions, and recovery as first-class product surfaces.

## Definition of done

You may finish only when:

1. A new user can create a polished, music-synchronised Instagram Reel from supplied assets, understand the interface without developer guidance, export it, upload the resulting file without conversion on at least one fully supported path, reopen the project, and revise it.
2. The canonical project suite covers the main creative styles and passes all technical gates.
3. Independent critics have completed at least three full adversarial review rounds after feature completion, and all critical/high defects are fixed or explicitly proven to be unavoidable platform constraints.
4. The final visual review meets the recorded score thresholds without sacrificing reliability, accessibility, or performance.
5. The repository includes clean setup/run/test/export instructions, architecture and product documentation, a migration guide, sample projects, and an honest limitations section.
6. The final report lists what changed, commands run, test results, measured export properties, performance results, browser support, critic score history, remaining limitations, and exact locations of sample projects and exports.

Begin now. First inspect and run the repository, then create the audit, architecture, scorecard, task graph, fixtures, and baseline evidence. Fan out the independent audit work. Reconcile it into one product plan, implement by dependency order, and repeatedly render, criticise, measure, repair, and verify. Do not stop at plans or promises; finish with a working, tested, visually exceptional product and evidence for every claim.
