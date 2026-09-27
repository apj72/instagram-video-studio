# Editor layout review and wireframe

The September Mix post exposes three linked problems in the old editor: the layer list and its properties shared one long scroll column; the selection outline used viewport coordinates for a canvas element; and the timeline displayed keyframes without a clear way to navigate to them. A full-frame effect such as Laser Beams had a selection rectangle even though it has no draggable position.

## Desktop wireframe

```text
┌────────────────────────────────────── Toolbar ──────────────────────────────────────┐
│ Layers & tools       │               Visual canvas               │ Properties       │
│ ▸ Add layers         │  ┌──────────────────────────────────────┐ │ Selected layer   │
│ ▸ Project            │  │                                      │ │ ▾ Timing/position│
│ ▸ Audio              │  │         September Mix preview        │ │ ▾ Text/effect    │
│ ▸ Presets            │  │                                      │ │   settings       │
│ ▸ Motion presets     │  └──────────────────────────────────────┘ │                  │
│ ▾ Layers             │       Play · time · scrubber              │                  │
│   Laser Beams        │                                            │                  │
│   September headline │                                            │                  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Timeline   Click a keyframe to jump · drag to retime              [Beats] [Zoom]      │
│ Selected layer events [Prev] [Next] [0.33s Move] [0.55s Fade] [0.89s Move] …          │
│ Layer rows and duration bars; only the selected row shows keyframe diamonds          │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## Interaction changes

| Before | New behaviour |
| --- | --- |
| Properties followed the layer list in one scroll column. | Layers stay in a left list; selected properties live in a separate right inspector with its own scroll. |
| Project, audio, presets, motion, and add controls made the left column very long. | Each tool section has a roll up/down button. The layer list remains independently scrollable. |
| The blue outline could be offset from the canvas. | Selection geometry includes the canvas position within the viewport and uses measured text bounds. |
| Laser Beams showed a draggable-looking box. | Full-frame effects show a clear notice instead of a selection rectangle; edit them in Properties. |
| Dragging animated text replaced its motion keyframes. | Dragging moves the complete motion path; Auto-Key creates a keyframe at the playhead. |
| Keyframe diamonds were obscure and did not jump to their time. | Only the selected row shows brighter keyframes. Click one to seek, drag it to retime, or use the named event buttons and Prev/Next controls. |
| Every layer bar stretched across the whole video, even for a short text scene. | Bars show each layer's visible interval; diamonds stay at their exact keyframe times. Text, effects, shapes, and images have distinct bar colours. |
| Beat markers appeared without explanation. | The Beats grid starts hidden and has a labelled switch. |

The effect layer's position values remain in older project JSON for compatibility, but its editor controls now focus on settings that affect the rendered frame. The visual canvas is intended for selecting and moving content layers such as text, images, and shapes.

The September Mix project appears in **Posts** with its thumbnail. Open it in the visual editor to inspect the redesigned layout and its scene-length timeline bars.
