# Version1 event templates

`src/templates/version1Events.ts` turns the Version1 brand guide and the supplied A4 event poster into editable studio projects. Open **New from Template** and choose **Version1 Events**.

| Template | Use it for | Sections |
| --- | --- | --- |
| Night Announcement | The full reveal | Sound, selectors, date and room, way in |
| Save the Date | The reminder | Date, room, selectors, way in |
| The Selectors | Introducing the line-up | One selector per section, then the night |
| Mix Drop | A release rather than a night | Title, who is in it, the sound, where to hear it |
| Last Call | The day of the night | Tonight, doors, decks, venue |
| 14 November | The Crescent, York | Night Announcement with real event copy |

Every project is 1080 × 1920, 30 fps and exactly 15.000 seconds.

## The shape every template follows

1. **The logo spirals in** out of nothing, on a black screen, turning a bar and a third as it grows to almost the full width of the frame.
2. **It slides up to the top** and shrinks to its resting size, where it stays for the rest of the video. It is the only thing that never leaves.
3. **The footage slides up from the bottom** behind it.
4. **Four sections** assemble a piece at a time from the top, bottom, left and right, hold, then come apart in the same order. In the announcement, HOUSE arrives from the left and MUSIC from the right.
5. **The last bar** is the logo alone with the website.

## The beat grid

128 BPM, because a bar is then 1875 ms and eight bars are exactly 15 seconds. One bar to arrive, four sections of a bar and a half, one bar to sign off. Each piece inside a section enters `ENTER_STEP` after the one before it, which is what makes the screen look deliberately built rather than faded up.

Drop a 15-second excerpt into the Audio panel and it lands on the existing cuts. If you change the duration, change it in whole bars or the sections drift.

## Composition

- **`section(index, pieces)`** places a section on the grid: staggered entrances, a hold, then staggered exits, all finishing before the next section starts.
- **`staged(layer, stage)`** is one piece arriving and leaving — `ease-out-expo` in, `ease-in` out.
- **`words()`** caps every font size against the room left in the safe column, so long event copy shrinks instead of running off the frame. It also gives every line the brand's drop shadow: solid black, no blur, offset down and to the right, scaled to the type size.
- **`measureLine()`** does the fitting with a per-glyph table of Bungee advances measured from the bundled font. A flat average is not good enough when the templates want the biggest type that fits — M is nearly four times the width of a space.
- **`tag()`** is the poster's red FREE ENTRY tag; its `x` is the left edge of the box, not the text, so the red lines up with the column.
- **`brandMark()`** is the spiral, the travel and the rest position, in one layer.

## Footage

The background is **real video**: `public/assets/version1/red-lasers.mp4`, a 1080 × 1920 seamless 15-second loop of a laser rig in a dark venue, graded to Signal Red. See `public/assets/version1/ATTRIBUTION.md` for the source, the licence and the exact grade.

It is a stock clip. To use the collective's own footage, drop a 1080 × 1920 file in as `red-lasers.mp4` and nothing else changes.

The scrim over it is deliberately light — the point is to see the room — which is why the type carries its own drop shadow rather than relying on a heavy overlay.

### Driving video from the timeline

`src/render/videoSync.ts` exists because the renderer draws whatever frame a `<video>` element happens to be showing, and nothing was moving it:

- **`seekVideoAssets`** parks every video layer on its exact frame and waits for the decoder. The exporter calls it before each frame. Without it, exports froze the background, because 450 frames render far faster than a clip plays. It roughly quadruples export time, which is the price of a correct background.
- **`followVideoAssets`** keeps the preview honest without seeking every frame: while the clock runs the element plays and is only nudged back when it drifts; when it stops, the element is put exactly on the playhead so scrubbing shows the right frame.
- **`videoSourceTime`** is the pure part — timeline time to source time, starting when the layer appears and looping to fill.

A video layer that should fill the frame uses `orientation: 'vertical'` with `thickness` set to the canvas width; `slideIn` then moves the whole thing as a block.

## Safe zones

The guide's Reel safe zone is top 250 px, bottom 400 px, left 64 px, right 120 px. The templates use a left column at 88 px and a right limit of 960 px. `tests/unit/version1Events.test.ts` checks every line's settled box, and `posts/version1-events/render.py --check` repeats the check against the real renderer with real font metrics.

## Type

Bungee for everything that shouts, `Inter, system-ui, sans-serif` for the few supporting lines — the guide's recommendation with its stated fallback. Inter is not bundled, so a machine without it renders the system sans.

There is no handle plate: these are Instagram posts, so the account name is already on screen.
