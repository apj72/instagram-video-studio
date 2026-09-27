# VERSION 1 - Animated Logo

For AI assisted, command line post video generation in V2, see [the JSON video guide](v2/docs/CLI_VIDEO_GENERATION.md).

Animated logo visuals for the **VERSION 1** DJ collective, designed for Instagram portrait format (1080x1920).

## Features

- Full 1080x1920 portrait canvas, scaled to fit any viewport
- Scrolling background logos at various sizes, speeds, and opacities
- Spectrum analyser EQ bars (green/amber/red segments)
- Spectrum-reactive cyan waveform
- Kick-synced pulsing ghost logo at configurable BPM
- Parallax logo entrance and exit
- Customisable red-bordered text box (matching the logo's "1" chip style)
- DJ names text with fade-in
- Glitch effects, scanlines, RGB split, light sweeps, corner accents, vignette
- Seamless looping — all elements fade/slide in and out symmetrically
- Video recording (MP4/WebM) for direct Instagram upload

## Files

| File | Description |
|------|-------------|
| `version1_animation_v5.html` | Current animation — config-driven, supports live updates via postMessage |
| `version1_editor.html` | Visual editor — adjust all parameters, live preview, record video, download standalone HTML |
| `logo.png` | VERSION 1 logo image |
| `archive/` | Previous animation versions (v1–v4) kept for reference |

## Usage

1. Open `version1_editor.html` in a browser
2. The animation plays in the preview panel on the right
3. Adjust parameters in the left sidebar (positions, timing, text, effects)
4. Click **Update Preview** to apply changes
5. Click **Record Video** to capture an MP4/WebM for Instagram
6. Click **Download HTML** to save a standalone animation file with your settings baked in

### Recording Video

- Set the **Loop Duration** in the Global section to control how long one cycle is
- Set the **Loops** count next to the Record button to capture multiple cycles
- Safari outputs MP4 directly; Chrome/Firefox output WebM (convert to MP4 with [CloudConvert](https://cloudconvert.com) or [HandBrake](https://handbrake.fr) for Instagram)

### Standalone Use

Open `version1_animation_v5.html` directly in a browser to view the animation without the editor. Edit the `CONFIG` object at the top of the file to change parameters.

## Configurable Parameters

| Element | Parameters |
|---------|------------|
| **Global** | Loop duration, BPM |
| **Main Logo** | Y position, size, fade in/out times, parallax toggle/start/duration |
| **Pulsing Logo** | Enabled, Y position, start time, opacity, max scale |
| **DJ Text** | Text content, Y position, font size, fade-in time |
| **Text Box** | Enabled, text content, Y position, font size, border width, corner radius, fade-in time |
| **Spectrum EQ** | Height, bottom offset, bar count |
| **Waveform** | Y centre, height, line width |
| **Effects** | Glitch, scanlines, grid, light sweeps, corner accents, vignette (all toggleable) |

## Tech

Pure HTML5 Canvas + vanilla JavaScript. No build tools, no dependencies, no frameworks. Just open the HTML files in a browser.

## License

Private project for the VERSION 1 DJ collective.
