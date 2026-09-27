# Feedback: Create videos from command line instructions

**Status:** First increment implemented; see [CLI video generation](CLI_VIDEO_GENERATION.md)

**Date:** 2026-09-24

## Suggestion

Allow someone to create and export a video without opening the editor. A command should accept a JSON job file for the full design, with flags for common values such as output path, text, duration, and preset. This would make repeatable videos and batch creation practical while keeping the visual editor available for fine tuning.

## Current state

- V2 has a serializable `Project` model (`src/core/schema.ts`) and a design manager that downloads and uploads project JSON (`src/core/configs.ts`, `src/editor/ConfigManager.tsx`).
- Rendering is frame based (`src/render/engine.ts`), and the MP4 export function lives in `src/export/encoder.ts`.
- There is no CLI command in `v2/package.json`. Export currently starts from the browser dialog and relies on browser facilities including `OffscreenCanvas`, WebCodecs, DOM media elements, and browser loaded audio.
- Project JSON alone is not a portable render job: image, video, and audio references are asset IDs, while the media is held separately in browser memory or IndexedDB. JSON import currently parses without validating the project shape.

## Proposed interface

Use a **versioned JSON job file as the main input**. Keep CLI flags small and useful for overrides; avoid a separate flag for every layer or effect property. A job should identify a template or project, supply media file paths, set any supported values, select an export preset, and name the output file. Relative media paths should resolve from the job file's directory.

Illustrative syntax, **not currently implemented**:

```sh
video-studio render --job ./jobs/friday-lineup.json --output ./out/friday-lineup.mp4
video-studio render --job ./jobs/friday-lineup.json --set "Title.text=FRIDAY LINE-UP" --output ./out/saturday-lineup.mp4
video-studio validate --job ./jobs/friday-lineup.json
```

Illustrative job shape, subject to design and validation:

```json
{
  "jobVersion": 1,
  "template": "dj-lineup",
  "settings": { "durationMs": 16000, "fps": 30, "seed": 42 },
  "text": { "Title": "FRIDAY LINE-UP", "Venue": "VENUE — CITY" },
  "assets": { "Logo": "../assets/logo.png", "audio": "../assets/track.mp3" },
  "export": { "preset": "Instagram Reel", "output": "../out/friday-lineup.mp4" }
}
```

The `text` and `assets` keys above are a suggested user friendly layer mapping, not fields of the existing `Project` type. Layer IDs or another stable key should be used internally so duplicate layer names cannot make a job ambiguous. A second input mode could accept a complete exported `Project` JSON plus an explicit asset manifest.

## Implementation notes

1. Define and validate a job schema, including its version, paths, supported overrides, duration, dimensions, frame rate, and output format. Show actionable errors and use a nonzero exit code for invalid jobs or failed exports.
2. Convert the job into the existing `Project` model, then resolve and preload every referenced image, video, font, and audio file before rendering. Make missing assets fail clearly rather than silently rendering blank layers.
3. Reuse the frame renderer and export behavior where possible. The current encoder needs browser APIs, so choose and document a supported command line rendering environment or extract an export path that can run outside the editor. Confirm audio and video layer handling in that environment.
4. Make seeded output reproducible. Report progress to stderr and write the requested video to disk only after a successful export.
5. Document the command, job schema, an example job, and how to start from a JSON design exported by the editor.

## Acceptance criteria

- A user can run one command with a JSON job and receive a playable MP4 at the specified path, without clicking through the editor.
- A user can override at least the output path and one text value from flags.
- A job can use local image and audio files; missing or unsupported files produce a clear error before export.
- Invalid JSON, unsupported job versions, and unknown layer targets fail with useful messages and nonzero exit codes.
- Repeating a job with the same assets and seed produces the same visual frames.
- The CLI and editor use the same project interpretation so an exported design can be rendered without unexpected changes.

## Suggested first increment

Start with one built in template, text and image overrides, a JSON job, and MP4 export. Add audio, video layers, full project import, and batch jobs after the basic headless path is verified. This limits the first implementation to a testable end to end workflow.
