# Version1 event video series

Five reusable 15-second Reel templates and a populated version for Saturday 14 November 2026 at The Crescent, York. Built from the supplied brand guide and the A4 event poster. All videos are 1080 × 1920, 30 fps, H.264, exactly 15.000 seconds.

Open `index.html` to watch them side by side, or choose **Templates → Version1 Events** in the video studio.

| Design | Use it for | Its four sections |
| --- | --- | --- |
| Night Announcement | The full reveal | Sound, selectors, date and room, way in |
| Save the Date | The reminder, once the night is known | Date, room, selectors, way in |
| The Selectors | Introducing the line-up | One selector per section, then the night |
| Mix Drop | A release rather than a night | Title, who is in it, the sound, where to hear it |
| Last Call | The morning of the night itself | Tonight, doors, decks, venue |
| 14 November | The populated announcement for York | As the announcement |

Rotate the designs so the feed keeps moving. A run-up to a night might be Night Announcement three weeks out, The Selectors two weeks out, Save the Date in the final week, and Last Call on the day, with a Mix Drop in between. These are suggestions for use, not publishing automation.

## How each one is put together

1. The **logo spirals in** out of nothing on a black screen, turning as it grows to nearly the full width.
2. It **slides up to the top** and settles at its resting size, where it stays. It is the only thing that never leaves.
3. The **laser footage slides up** from the bottom behind it.
4. **Four sections** assemble a piece at a time — from the top, bottom, left and right, each a moment after the last — hold for a beat or two, then come apart in the same order. In the announcement, HOUSE arrives from the left and MUSIC from the right.
5. The **last bar** is the logo on its own with the website.

## The beat grid

Everything runs at **128 BPM**, where a bar is 1875 ms and eight bars are exactly 15 seconds: one bar to arrive, four sections of a bar and a half, one bar to sign off. Drop a 15-second house excerpt in the Audio panel and it lands on the existing choreography without moving a keyframe.

If you change the duration, change it in whole bars (1.875 s) or the sections will drift off the beat.

## Editing

1. Choose a Version1 Events template in the studio.
2. Edit the named text layers. Repeated fields — the date appears in more than one section — have separate layers, so update every occurrence. The layer names say which section they belong to.
3. Type sizes cap themselves against the safe column, so a long venue name shrinks rather than running off the frame. Check the result: a very long name may shrink further than you want, in which case shorten the copy.
4. Keep content inside the Version1 safe overlay: top 250 px, bottom 400 px, left 64 px, right 120 px. The templates already sit inside it.
5. Add your own mix excerpt through Audio. The supplied exports are silent; no music was provided.
6. Save As to keep a reusable template or an event post, then export MP4.

Each design's `project.json` is the native, editable studio project. `poster.jpg` is the frame used as the template thumbnail and `contact-sheet.jpg` tiles sixteen frames across the 15 seconds for review.

Rendering the MP4s takes a few minutes: every frame waits for the footage to seek, which is what stops the background freezing. `november-event.json` records the populated event fields.

For changes in code, `src/templates/version1Events.ts` defines `createVersion1Event(style, event)`, the shared club background, the staging helpers and the five generic factories.

## Artwork

The background is **real video** of a laser rig in a dark venue, graded to Signal Red and looped seamlessly: `public/assets/version1/red-lasers.mp4`. The scrim over it is light, because the point is to see the room; what keeps the type legible is its drop shadow — solid black, offset down and to the right — rather than a heavy overlay.

**It is a stock clip, not a Version1 night.** Swapping in the collective's own footage is one step: put a 1080 × 1920 file in `public/assets/version1/` as `red-lasers.mp4`. Nothing in the templates needs to change. `public/assets/version1/ATTRIBUTION.md` has the source, the licence and the exact grade, so you can run the same grade over your own clip and keep it on brand.

The logo is the supplied SVG, used without redrawing or recolouring.

There is no handle plate on these: an Instagram post already shows the account name.

## Captions

`caption.txt` holds the caption for the 14 November post, including the full street address, which deliberately stays off the video where it would be too small to read on a phone. Confirm the venue's Instagram handle before tagging it; none was supplied.

## Re-render

Run `npm run dev -- --host 127.0.0.1` in one terminal, then from `v2/`:

```sh
python3 posts/version1-events/render.py --check     # safe-zone report, exits nonzero on a problem
python3 posts/version1-events/render.py --frames    # projects, posters and contact sheets
python3 posts/version1-events/render.py             # the above, plus the six MP4s
```

Pass `--origin http://127.0.0.1:PORT` if Vite picked a different port. The script drives the studio's own Canvas renderer and MP4 encoder through headless Chromium, so what it writes is what the editor exports. It needs Python Playwright with Chromium installed.
