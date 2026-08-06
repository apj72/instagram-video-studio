# VERSION 1 Studio — Product Spec

## Target Users

DJ collective "VERSION 1" members creating Instagram Reels, Stories, and feed posts to promote events, track releases, and lineups. Non-commercial, personal creative use.

## Core Workflow

1. Open studio, start from blank or template
2. Import brand assets (logos, fonts, colors) or use built-in VERSION 1 kit
3. Add layers: images, text, effects, video clips
4. Load audio track, detect BPM, sync effects to beat
5. Preview in real-time on 1080x1920 canvas
6. Adjust timing via timeline with keyframes
7. Export as MP4 (H.264 + AAC) ready for Instagram upload

## Acceptance Criteria

- [ ] Renders 1080x1920 canvas at 30fps
- [ ] All V1 effects reproduced (glitch, scanlines, grid, sweep, vignette, corner accents, spectrum, waveform, pulsing logo, scrolling background logos)
- [ ] V1 config import produces identical visual output
- [ ] Timeline with keyframe editing
- [ ] Real audio analysis (FFT spectrum, waveform, BPM detection)
- [ ] MP4 export via WebCodecs + Mediabunny (H.264, AAC, fast-start)
- [ ] Undo/redo for all edits
- [ ] Project save/load via IndexedDB
- [ ] Works in Chrome 94+, Safari 26+, Firefox 130+

## Instagram Requirements (July 2026)

| Property | Value |
|----------|-------|
| Resolution | 1080x1920 (9:16) |
| Format | MP4, H.264 + AAC |
| Frame rate | 30fps |
| Bitrate | 5-8 Mbps |
| Color | sRGB |
| Max duration | 3min (in-app), 15min (upload) |
| Safe zones | ~250px top/bottom obscured by UI |

## Non-Goals

- No backend, accounts, or cloud storage
- No multi-user collaboration
- No mobile editing (desktop browser only)
- No paid services or telemetry
