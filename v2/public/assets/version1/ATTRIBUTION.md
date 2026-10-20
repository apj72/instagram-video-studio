# Version1 asset sources

| File | Source | Licence |
| --- | --- | --- |
| `logo.svg` | Supplied by Version1 with the brand guide | Version1's own mark |
| `lasers.jpg` | Supplied by Version1 in the 14 November A4 poster | Version1's own photograph |
| `red-lasers.mp4` | [Abstract Laser Light Show in Dark Venue](https://www.pexels.com/video/abstract-laser-light-show-in-dark-venue-36216099/), Pexels | [Pexels licence](https://www.pexels.com/license/) — free for commercial use, no attribution required |
| `red-lasers-poster.jpg` | Frame from `red-lasers.mp4` | As above |

## How `red-lasers.mp4` was made

The source is real footage of a laser rig in a dark venue, shot vertically in 4K. It was graded to the brand's Signal Red, cropped to the Reel canvas and turned into a seamless 15-second loop:

```sh
ffmpeg -i source.mp4 -filter_complex "\
[0:v]trim=0:7.5,setpts=PTS-STARTPTS,crop=1685:2995:237:0,scale=1080:1920:flags=lanczos,\
hue=s=0,eq=contrast=1.42:brightness=-0.085,colorchannelmixer=rr=1.42:gg=0.33:bb=0.33,format=yuv420p,split[a][b];\
[b]reverse[r];[a][r]concat=n=2:v=1[out]" \
-map "[out]" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -an -movflags +faststart red-lasers.mp4
```

`hue=s=0` drops the original lavender cast, then `colorchannelmixer` tints the luminance so midtones land on Signal Red (#FF3B3B) and the hottest beam cores run brighter. The first 7.5 seconds are played forward then in reverse, which makes 15.000 seconds that loop without a visible join — useful because Reels loop.

**This is a stock clip, not a Version1 night.** Replacing it with the collective's own footage is a single swap: put a 1080 × 1920 file here as `red-lasers.mp4` and nothing else needs to change. Running the grade above over your own clip will keep it on brand.
