# VERSION 1 Studio — Design System

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0d0d0d` | Main background |
| `--bg-secondary` | `#161616` | Panels, sidebar |
| `--bg-tertiary` | `#1e1e1e` | Inputs, ruler |
| `--bg-elevated` | `#252525` | Buttons, badges |
| `--border` | `#2a2a2a` | Borders, dividers |
| `--border-hover` | `#3a3a3a` | Hover state |
| `--text-primary` | `#e0e0e0` | Body text |
| `--text-secondary` | `#888` | Labels, muted |
| `--text-muted` | `#555` | Disabled, hints |
| `--accent` | `#E8423F` | VERSION 1 brand red |
| `--accent-hover` | `#ff5a57` | Hover state |
| `--accent-dim` | `rgba(232,66,63,0.15)` | Selection highlight |
| `--cyan` | `#00FFFF` | Waveform, highlights |
| `--green` | `#00CC00` | Spectrum low |
| `--amber` | `#FFA500` | Spectrum mid |

## Typography

- **Sans**: Inter, Segoe UI, system-ui
- **Mono**: JetBrains Mono, Fira Code, SF Mono
- **Brand**: Bungee (logo, headings)
- **Base size**: 13px, line-height 1.4

## Spacing

| Token | Value |
|-------|-------|
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| `--radius-lg` | 8px |

## Layout

| Token | Value |
|-------|-------|
| `--sidebar-width` | 320px |
| `--toolbar-height` | 48px |
| `--timeline-height` | 200px |

## Components

- **Buttons**: `bg-elevated` background, `radius-sm`, 12px font, hover to `border-hover`
- **Primary buttons**: `accent` background, white text
- **Inputs**: `bg-tertiary` background, `border` border, focus to `accent`
- **Range sliders**: 4px track, 14px accent thumb
- **Scrollbars**: 6px, `border` thumb
