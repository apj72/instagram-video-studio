# Generate post videos from JSON

The `video` command turns a JSON job into an MP4 without opening the editor. An AI assistant can write or modify a job file, validate it, and run the renderer. The command uses Node.js and FFmpeg; it makes no network requests. FFmpeg must include the `drawtext`, `overlay`, `libx264`, and AAC features. Set `FFMPEG_PATH` if the executable on `PATH` is unavailable.

From `v2/`:

```sh
npm run video -- validate --job examples/friday-lineup.json
npm run video -- render --job examples/friday-lineup.json
npm run video -- render --job examples/friday-lineup.json --set 'title.text=SATURDAY LINE-UP' --output out/saturday.mp4
```

The example job writes `v2/out/friday-lineup.mp4`. Use `--overwrite` to replace an existing file. The command exits with a nonzero status on invalid input or render failure. Job asset and output paths resolve relative to the job file. `--output` paths resolve relative to the current working directory.

## Job format

Use [friday-lineup.json](../examples/friday-lineup.json) as a starting point. The required top level fields are:

| Field | Meaning |
| --- | --- |
| `jobVersion` | Must be `1`. |
| `name` | Human readable job name. |
| `canvas` | `width`, `height`, `fps`, `durationMs`, and `backgroundColor`. Width and height must be even. Color uses `#RRGGBB`. |
| `layers` | Nonempty ordered list of text and image layers. Later layers draw above earlier layers. |
| `output` | Local `.mp4` destination. |
| `audio` | Optional `{ "path": "../assets/music.mp3", "volume": 0.8, "startMs": 0 }`. |

Each layer needs a unique `id`, a `type`, and an `x` and `y` center position in canvas pixels. Text layers use `text`, `fontSize`, and `color`; `fontFile` is optional and defaults to the bundled Bungee font. Put `\n` in text for multiple lines. Image layers use `path`, `width`, and `height`; images fit within that box without stretching. Transparent PNGs work well for logos.

Layers may have `startMs`, `endMs`, `fadeInMs`, and `fadeOutMs`. Times are in milliseconds. Omitted start/end values mean the whole video; omitted fades mean no fade. Audio may start later with `startMs` and is padded with silence to cover the full video. The output is H.264 video in an MP4 container, with AAC audio when supplied.

`--set ID.text=VALUE` overrides a text layer by its ID. Repeat `--set` for several text layers. Quotes around the value keep spaces together in a shell. For more extensive changes, have the AI edit the JSON job directly.

## Instructions to give an AI assistant

> Create an Instagram Reel job using `v2/docs/CLI_VIDEO_GENERATION.md` and `v2/examples/friday-lineup.json`. Use my supplied event details and local images. Keep text within the central safe area, use an 8 second 1080×1920 canvas, validate the JSON, render the MP4, and report its path. Do not invent dates, times, or venue details.

The AI needs the actual event text and local asset paths. It can render several variants by changing the job or passing different `--set` values and output paths.

## View generated posts in the editor

Put each post in `v2/posts/<post-name>/job.json` with its referenced images beside it. Rendering that job creates `thumbnail.jpg` in the same folder. In V2, click **Posts** in the top toolbar to view the thumbnail and JSON. Click **Open in Visual Editor** to load its image and text layers on the canvas. You can adjust them with the editor controls and export from there. The visual preview uses the Canvas renderer, so image and text placement may differ slightly from the command line MP4. Audio and custom font paths from the CLI job are not loaded into the visual editor.

The Posts dialog can also open a JSON file from disk for inspection. To load image layers onto the canvas, place the job and its images under `v2/posts/` and refresh the app so Vite can bundle them. If you download edited JSON, save it back in the post folder to preserve relative image paths.

## Current scope

This is a command line composition format for text, still images, fades, and one audio track. It uses FFmpeg rather than the editor's Canvas renderer, so existing editor project JSON, effects, video layers, and keyframes are not accepted by this command. Those require an adapter or a browser based render path. The JSON job format is intentionally small so an AI can generate it reliably.
