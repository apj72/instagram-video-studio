import { createDefaultProject, EXPORT_PRESETS, generateId } from '../core/schema.ts';
import type { AnimatedProperty, ImageLayer, Keyframe, Layer, Project, ShapeLayer, TextLayer, VideoLayer } from '../core/schema.ts';
import type { EffectLayer } from '../core/schema.ts';
import type { Template } from './index.ts';

/**
 * Version1 event posts, built to the collective's brand guide.
 *
 * Every template follows the same shape. The logo spirals onto a black screen, slides up to its
 * place at the top and stays there; the laser footage slides in behind it; then four sections
 * assemble piece by piece, hold, and come apart again in the same order. Everything sits on a
 * 128 BPM grid, so a mix dropped in afterwards lands on the cuts.
 */

// --- Brand ---

const RED = '#FF3B3B';
const WHITE = '#FFFFFF';
const BLACK = '#050505';
const GREY = '#9A9A9A';
/** Bungee for everything that shouts; a clean sans for the few supporting lines, as the guide asks. */
const DISPLAY = 'Bungee';
const SUPPORT = 'Inter, system-ui, sans-serif';

// --- Canvas and safe zones (brand guide, Instagram video) ---

const W = 1080;
const H = 1920;
/** Text column. The guide's minimum is 64px; 88 gives the poster's more confident margin. */
const COL = 88;
const RIGHT = 960;
const SAFE_TOP = 250;
const SAFE_BOTTOM = 1520;

// --- Beat grid ---

const BPM = 128;
const BEAT = 60000 / BPM;
const BAR = BEAT * 4;
/** Eight bars at 128 BPM is exactly 15 seconds. */
const DURATION = BAR * 8;

const bars = (count: number) => count * BAR;

/** One bar to arrive, four sections of a bar and a half, one bar alone with the logo. */
const INTRO = bars(1);
const OUTRO = bars(7);
const SECTION_COUNT = 4;
const SECTION = (OUTRO - INTRO) / SECTION_COUNT;
const sectionStart = (index: number) => INTRO + index * SECTION;

/** Each piece arrives after the one before it, so the screen builds in a visible order. */
const ENTER_MS = 440;
const ENTER_STEP = 115;
const EXIT_MS = 330;
const EXIT_STEP = 85;

export const VERSION1_ASSETS = [
  { id: 'version1-logo', url: '/assets/version1/logo.svg', kind: 'image' },
  { id: 'version1-lasers', url: '/assets/version1/lasers.jpg', kind: 'image' },
  { id: 'version1-laser-video', url: '/assets/version1/red-lasers.mp4', kind: 'video' },
] as const;

// --- Event copy ---

export interface Version1Event {
  /** Shown in the template list and the project name. */
  name: string;
  /** Two-line hook: the first line is white, the second carries the red accent. */
  headline: string;
  highlight: string;
  day: string;
  date: string;
  venue: string;
  city: string;
  address: string;
  time: string;
  entry: string;
  selectors: string[];
  genre: string;
  platform: string;
  site: string;
}

export const GENERIC_EVENT: Version1Event = {
  name: 'Your next night',
  headline: 'HOUSE', highlight: 'MUSIC',
  day: 'SATURDAY', date: '00 MON',
  venue: 'VENUE NAME', city: 'YOUR CITY', address: 'STREET, TOWN, POSTCODE',
  time: '9PM TILL LATE', entry: 'FREE ENTRY',
  selectors: ['SELECTOR ONE', 'SELECTOR TWO', 'SELECTOR THREE'],
  genre: 'HOUSE · DISCO', platform: 'LISTEN ON MIXCLOUD', site: 'VERSION1DJS.COM',
};

export const NOVEMBER_EVENT: Version1Event = {
  name: '14 November · The Crescent York',
  headline: 'HOUSE', highlight: 'MUSIC',
  day: 'SATURDAY', date: '14 NOV',
  venue: 'THE CRESCENT', city: 'YORK', address: '8 THE CRESCENT, YORK YO24 1AW',
  time: '8PM TILL LATE', entry: 'FREE ENTRY',
  selectors: ['TONYT', 'MOSS_B', 'SMILEY JACK'],
  genre: 'HOUSE', platform: 'VERSION1DJS.COM', site: 'VERSION1DJS.COM',
};

// --- Keyframe helpers ---

type Easing = Keyframe['easing'];

const value = (number: number): AnimatedProperty => ({ keyframes: [{ time: 0, value: number, easing: 'linear' }] });

function track(...points: [number, number, Easing?][]): AnimatedProperty {
  return { keyframes: points.map(([time, number, easing]) => ({ time, value: number, easing: easing ?? 'linear' })) };
}

/** A property that snaps on every step and settles back: the room breathing with the kick. */
function pulse(rest: number, hit: number, from = 0, step = BEAT * 2, until = DURATION): AnimatedProperty {
  const keyframes: Keyframe[] = [];
  for (let time = from; time <= until; time += step) {
    keyframes.push({ time, value: hit, easing: 'ease-out-expo' });
    const settle = Math.min(until, time + step * 0.42);
    if (settle > time) keyframes.push({ time: settle, value: rest, easing: 'ease-out-cubic' });
  }
  return { keyframes };
}

// --- Layer helpers ---

function base(name: string, x: number, y: number, inTime: number, outTime: number) {
  return {
    id: generateId(), name, visible: true, locked: false,
    opacity: value(1), position: { x: value(x / W), y: value(y / H) },
    scale: { x: value(1), y: value(1) }, rotation: value(0),
    inTime, outTime, blendMode: 'source-over',
  };
}

function rect(name: string, x: number, y: number, width: number, height: number, color: string,
  inTime = 0, outTime = DURATION): ShapeLayer {
  return {
    ...base(name, x, y, inTime, outTime), type: 'shape', shapeType: 'rect',
    size: { width, height }, fill: { enabled: true, color },
    stroke: { enabled: false, color, width: 0 }, cornerRadius: 0,
  };
}

function picture(name: string, assetId: string, x: number, y: number, scale: number,
  inTime = 0, outTime = DURATION): ImageLayer {
  return {
    ...base(name, x, y, inTime, outTime), type: 'image', assetId,
    size: { width: W, height: H }, scale: { x: value(scale), y: value(scale) },
    parallax: false, parallaxStartY: 0, parallaxDuration: 0,
  };
}

/**
 * Bungee advance per character, as a fraction of the font size, measured from the bundled
 * Bungee-Regular.ttf. A flat average is not good enough here: the templates want the biggest type
 * that fits, and M is twice the width of a space.
 */
const BUNGEE: Record<string, number> = {
  A: 0.730, B: 0.725, C: 0.628, D: 0.746, E: 0.654, F: 0.618, G: 0.708, H: 0.759, I: 0.605,
  J: 0.688, K: 0.746, L: 0.695, M: 0.849, N: 0.753, O: 0.737, P: 0.682, Q: 0.737, R: 0.743,
  S: 0.650, T: 0.656, U: 0.746, V: 0.730, W: 0.831, X: 0.737, Y: 0.705, Z: 0.660,
  0: 0.727, 1: 0.601, 2: 0.639, 3: 0.637, 4: 0.709, 5: 0.647, 6: 0.693, 7: 0.627, 8: 0.711, 9: 0.693,
  ' ': 0.225, '.': 0.384, ',': 0.384, ':': 0.384, "'": 0.356, '·': 0.364, '&': 0.766, '!': 0.424,
  '?': 0.656, '-': 0.420, _: 0.734, '/': 0.347, '@': 0.867, '#': 0.750, '(': 0.429, ')': 0.429,
};
/** An unmeasured glyph is assumed to be a wide one. */
const BUNGEE_WIDEST = 0.87;
/** The supporting sans is only used for short lines, so one average is enough. */
const SANS_ADVANCE = 0.55;

/** Width of a single line at a given size, matching what the renderer will measure. */
export function measureLine(content: string, size: number, spacing: number, font: string): number {
  const advance = font === DISPLAY
    ? [...content].reduce((total, character) => total + (BUNGEE[character] ?? BUNGEE_WIDEST), 0)
    : content.length * SANS_ADVANCE;
  // Chromium adds letter spacing after every character, including the last.
  return advance * size + content.length * spacing;
}

/** Caps a size so event copy cannot push a line past the safe column. */
function fit(content: string, preferred: number, maxWidth = RIGHT - COL, spacing = 0, font = DISPLAY): number {
  if (!content.length || !Number.isFinite(maxWidth)) return preferred;
  const perUnit = measureLine(content, 1, 0, font);
  const available = maxWidth * 0.99 - content.length * spacing;
  if (perUnit <= 0 || available <= 0) return preferred;
  return Math.max(22, Math.min(preferred, available / perUnit));
}

/** How much of the safe column a line starting (or centred) at `x` may use. */
function room(x: number, align: TextLayer['textAlign']): number {
  if (align === 'center') return Math.max(120, 2 * Math.min(x - COL, RIGHT - x));
  if (align === 'right') return Math.max(120, x - COL);
  return Math.max(120, RIGHT - x);
}

interface TextOptions {
  color?: string;
  align?: TextLayer['textAlign'];
  font?: string;
  spacing?: number;
  lineHeight?: number;
  /** Overrides the room worked out from the layer's position; used by the padded tag box. */
  maxWidth?: number;
  /** Black text behind, offset down and right. On by default: it is what keeps type legible over footage. */
  shadow?: boolean;
}

function words(name: string, content: string, x: number, y: number, size: number,
  inTime = 0, outTime = DURATION, options: TextOptions = {}): TextLayer {
  const font = options.font ?? DISPLAY;
  const align = options.align ?? 'left';
  const spacing = options.spacing ?? 0;
  // Every line fits by construction, so editing event copy in the studio cannot break the column.
  const fitted = fit(content, size, options.maxWidth ?? room(x, align), spacing, font);
  const drop = Math.max(3, Math.round(fitted * 0.07));
  return {
    ...base(name, x, y, inTime, outTime), type: 'text', text: content,
    fontFamily: font, fontSize: value(fitted), fontWeight: '400',
    textColor: options.color ?? WHITE, textAlign: align,
    lineHeight: options.lineHeight ?? 1, letterSpacing: spacing,
    stroke: { enabled: false, color: BLACK, width: 0 },
    shadow: options.shadow === false
      ? { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 }
      : { enabled: true, color: '#000000', blur: 0, offsetX: Math.round(drop * 0.9), offsetY: drop },
    background: { enabled: false, color: BLACK, opacity: 1, paddingX: 0, paddingY: 0, cornerRadius: 0 },
    border: { enabled: false, color: BLACK, width: 0, cornerRadius: 0, paddingX: 0, paddingY: 0 },
  };
}

/** The guide's micro-label: small Bungee, widely tracked, grey. */
function label(content: string, y: number, x = COL, align: TextLayer['textAlign'] = 'left'): TextLayer {
  return words('Scene label', content, x, y, 28, 0, 0, { color: GREY, spacing: 9, align });
}

const TAG_PAD_X = 28;

/**
 * Black text on Signal Red, as on the poster's FREE ENTRY tag. The box sizes itself to the words,
 * so `x` is the left edge of the box and the red lines up with the column above it.
 */
function tag(content: string, x: number, y: number, size = 56,
  align: TextLayer['textAlign'] = 'left'): TextLayer {
  return {
    ...words('Red tag', content, align === 'left' ? x + TAG_PAD_X : x, y, size, 0, 0,
      { color: BLACK, spacing: 4, align, maxWidth: RIGHT - COL - TAG_PAD_X * 2, shadow: false }),
    background: { enabled: true, color: RED, opacity: 1, paddingX: TAG_PAD_X, paddingY: 20, cornerRadius: 0 },
  };
}

/** The poster's red rule. */
function rule(y: number, width = 150, x = COL): ShapeLayer {
  return rect('Red rule', x + width / 2, y, width, 7, RED, 0, 0);
}

// --- Staging ---

type Edge = 'left' | 'right' | 'top' | 'bottom';

type Movable = TextLayer | ShapeLayer | ImageLayer;

interface Stage {
  enterAt: number;
  exitAt: number;
  from: Edge;
  to?: Edge;
  travel?: number;
}

/**
 * Slides a layer in, holds it, then takes it back out the way it came. `ease-out-expo` on the way
 * in and `ease-in` on the way out make each piece look placed rather than floated into position.
 */
function staged<T extends Movable>(layer: T, stage: Stage): T {
  const { enterAt, exitAt, from, to = from, travel = 150 } = stage;
  const targetX = layer.position.x.keyframes[0].value;
  const targetY = layer.position.y.keyframes[0].value;
  const offset = (edge: Edge, amount: number) => ({
    x: edge === 'left' ? -amount / W : edge === 'right' ? amount / W : 0,
    y: edge === 'top' ? -amount / H : edge === 'bottom' ? amount / H : 0,
  });
  const entry = offset(from, travel);
  const exit = offset(to, travel * 0.8);
  const settled = enterAt + ENTER_MS;
  const leaves = Math.max(settled, exitAt);
  const gone = leaves + EXIT_MS;
  const axis = (target: number, inward: number, outward: number): AnimatedProperty =>
    track([enterAt, target + inward], [settled, target, 'ease-out-expo'], [leaves, target], [gone, target + outward, 'ease-in']);
  return {
    ...layer,
    inTime: enterAt,
    outTime: gone,
    position: { x: axis(targetX, entry.x, exit.x), y: axis(targetY, entry.y, exit.y) },
    opacity: track([enterAt, 0], [enterAt + 200, 1, 'ease-out'], [leaves, 1], [gone, 0, 'ease-in']),
  };
}

interface Piece {
  layer: Movable;
  from: Edge;
  to?: Edge;
  travel?: number;
}

const from = (layer: Movable, edge: Edge, travel?: number): Piece => ({ layer, from: edge, travel });

/**
 * One section: the pieces arrive in order, the whole thing holds, then it comes apart in the
 * same order. Nothing from one section is still leaving when the next starts arriving.
 */
function section(index: number, pieces: Piece[]): Layer[] {
  const at = sectionStart(index);
  const until = at + SECTION;
  const exitStart = until - EXIT_MS - (pieces.length - 1) * EXIT_STEP;
  return pieces.map((piece, order) => staged(piece.layer, {
    enterAt: at + order * ENTER_STEP,
    exitAt: exitStart + order * EXIT_STEP,
    from: piece.from,
    to: piece.to,
    travel: piece.travel,
  }));
}

// --- The room ---

/**
 * Real footage of a laser rig in a dark venue, graded to Signal Red. It slides up from the bottom
 * once the logo has taken its place, and runs to the end. The scrim is light, because the point
 * is to see the room; the type stays legible on its own drop shadow.
 */
function room1(): Layer[] {
  const arrives = 1000;
  const lasers: VideoLayer = {
    ...base('Red lasers · footage', W / 2, H / 2, arrives, DURATION),
    type: 'video', assetId: 'version1-laser-video',
    orientation: 'vertical', thickness: W, videoPan: 0,
    fadeInTime: 0, fadeOutTime: 0, fadeDuration: 0,
    slideIn: 'bottom', slideOut: 'none',
    slideInTime: arrives, slideInDuration: 760,
    slideOutTime: 0, slideOutDuration: 0,
  };
  const scrim = rect('Readability scrim', W / 2, H / 2, W, H, '#000000', arrives, DURATION);
  scrim.opacity = pulse(0.38, 0.30, arrives);
  return [
    lasers,
    scrim,
    {
      ...base('Room depth', W / 2, H / 2, arrives, DURATION), type: 'effect', effectType: 'vignette',
      config: { strength: 0.78, innerRadius: 0.26, outerRadius: 0.82, color: '0,0,0' },
    } satisfies EffectLayer,
  ];
}

// --- The constant ---

const LOGO_REST = 0.52;
const LOGO_Y = 322;
const LOGO_X = (COL + (W * LOGO_REST) / 2) / W;
const SPIRAL_ENDS = 860;
const LOGO_LANDED = 1680;

/**
 * The one thing that never leaves. It spirals out of nothing onto a black screen, holds big in the
 * middle for a beat, then slides up to the top at a readable size and stays there for the rest.
 */
function brandMark(): ImageLayer {
  const logo = picture('Version1 · supplied logo', 'version1-logo', COL, LOGO_Y, LOGO_REST);
  logo.scale = {
    x: track([0, 0.04], [SPIRAL_ENDS, 0.88, 'ease-out-expo'], [1040, 0.88], [LOGO_LANDED, LOGO_REST, 'ease-out-cubic']),
    y: value(1),
  };
  logo.rotation = track([0, -1.35], [SPIRAL_ENDS, 0, 'ease-out-expo'], [DURATION, 0]);
  logo.position = {
    x: track([0, 0.5], [1040, 0.5], [LOGO_LANDED, LOGO_X, 'ease-out-cubic']),
    y: track([0, 0.44], [1040, 0.44], [LOGO_LANDED, LOGO_Y / H, 'ease-out-cubic']),
  };
  logo.opacity = track([0, 0], [240, 1, 'ease-out'], [DURATION, 1]);
  return logo;
}

/** The strapline under the logo, and the website on the last bar once everything else has gone. */
function constants(event: Version1Event): Layer[] {
  return [
    staged(words('Collective line', 'Independent selectors. One frequency.', COL, 432, 30, 0, 0,
      { color: GREY, font: SUPPORT, spacing: 1 }),
    { enterAt: LOGO_LANDED, exitAt: DURATION - EXIT_MS, from: 'left', travel: 80 }),
    staged(words('Sign-off', event.site, COL, 980, 64, 0, 0, { spacing: 8 }),
      { enterAt: OUTRO + 260, exitAt: DURATION - EXIT_MS, from: 'bottom', travel: 140 }),
    staged(words('Sign-off line', 'Independent selectors. One frequency.', COL, 1066, 30, 0, 0,
      { color: GREY, font: SUPPORT }),
    { enterAt: OUTRO + 420, exitAt: DURATION - EXIT_MS, from: 'bottom', travel: 100 }),
  ];
}

function toProject(name: string, layers: Layer[]): Project {
  const project = createDefaultProject();
  const now = new Date().toISOString();
  return {
    ...project,
    metadata: { ...project.metadata, name, createdAt: now, modifiedAt: now },
    settings: {
      ...project.settings,
      width: W, height: H, duration: DURATION, fps: 30, bpm: BPM, beatOffset: 0,
      backgroundColor: '#000000', backgroundImageAssetId: null, seed: 1411,
      masterFadeMs: 260,
      border: { enabled: false, thickness: 4, color: RED, cornerRadius: 0, inset: 40, outerBlur: 0 },
    },
    layers,
    exportPreset: { ...EXPORT_PRESETS[0], bitrate: 9_000_000 },
    safeAreas: [{ name: 'Version1 · Reel safe zone', top: SAFE_TOP, right: W - RIGHT, bottom: H - SAFE_BOTTOM, left: COL }],
  };
}

function build(name: string, event: Version1Event, sections: Piece[][]): Project {
  return toProject(name, [
    ...room1(),
    ...sections.flatMap((pieces, index) => section(index, pieces)),
    brandMark(),
    ...constants(event),
  ]);
}

// --- Section content ---

const HEADLINE = 200;
const HERO = 190;
const NAME = 112;

/** House, then music: the hook, in the two biggest lines in the set. */
function soundSection(event: Version1Event): Piece[] {
  return [
    from(label('A NIGHT WITH VERSION1', 690), 'top', 110),
    from(rule(748), 'left', 170),
    from(words('Headline', event.headline, COL, 912, HEADLINE), 'left', 300),
    from(words('Highlight', event.highlight, COL, 1104, HEADLINE, 0, 0, { color: RED }), 'right', 300),
    from(words('Opening date', `${event.day} ${event.date}`, COL, 1292, 58, 0, 0, { spacing: 5 }), 'bottom', 150),
  ];
}

function selectorSection(event: Version1Event, heading = 'LIVE ON THE DECKS'): Piece[] {
  const names = event.selectors.slice(0, 3);
  const edges: Edge[] = ['left', 'right', 'left'];
  return [
    from(label(heading, 690), 'top', 110),
    from(rule(748), 'left', 170),
    ...names.map((dj, index) =>
      from(words(`Selector ${index + 1}`, dj, COL, 908 + index * 148, NAME), edges[index], 260)),
  ];
}

function dateSection(event: Version1Event): Piece[] {
  return [
    from(label(event.day, 690), 'top', 110),
    from(rule(748), 'left', 170),
    from(words('Event date', event.date, COL, 908, HERO), 'left', 300),
    from(words('Venue', event.venue, COL, 1086, 80, 0, 0, { spacing: 2 }), 'right', 220),
    from(words('City', event.city, COL, 1188, 60, 0, 0, { color: RED, spacing: 3 }), 'right', 180),
    from(words('Doors', event.time, COL, 1304, 54, 0, 0, { spacing: 4 }), 'bottom', 150),
  ];
}

function entrySection(event: Version1Event): Piece[] {
  return [
    from(label('ON THE DOOR', 690), 'top', 110),
    from(tag(event.entry, COL, 866), 'left', 260),
    from(words('Closing doors', event.time, COL, 1028, 86, 0, 0, { spacing: 3 }), 'right', 240),
    from(words('Closing venue', `${event.venue} · ${event.city}`, COL, 1144, 56, 0, 0, { spacing: 2 }), 'left', 180),
    from(words('Closing address', event.address, COL, 1232, 28, 0, 0,
      { color: GREY, font: SUPPORT, spacing: 2 }), 'bottom', 120),
  ];
}

// --- Templates ---

/** The order the collective asked for: the sound, the selectors, the date and room, then the way in. */
function nightAnnouncement(event: Version1Event): Project {
  return build(`Version1 · Night Announcement · ${event.name}`, event, [
    soundSection(event),
    selectorSection(event),
    dateSection(event),
    entrySection(event),
  ]);
}

/** Date-led, for the reminder post once the night is already known. */
function saveTheDate(event: Version1Event): Project {
  return build(`Version1 · Save the Date · ${event.name}`, event, [
    [
      from(label('SAVE THE DATE', 690), 'top', 110),
      from(words('Day', event.day, COL, 770, 58, 0, 0, { color: RED, spacing: 10 }), 'left', 180),
      from(words('Event date', event.date, COL, 958, 220), 'right', 320),
      from(rule(1064), 'left', 170),
    ],
    [
      from(label('THE ROOM', 690), 'top', 110),
      from(words('Venue', event.venue, COL, 888, HERO), 'left', 300),
      from(words('City', event.city, COL, 1056, 90, 0, 0, { color: RED, spacing: 3 }), 'right', 220),
      from(words('Address', event.address, COL, 1158, 28, 0, 0,
        { color: GREY, font: SUPPORT, spacing: 2 }), 'bottom', 120),
    ],
    selectorSection(event, 'ON THE DECKS'),
    entrySection(event),
  ]);
}

/** One selector per section, so each gets a screen of their own. */
function theSelectors(event: Version1Event): Project {
  const names = event.selectors.slice(0, 3);
  const edges: Edge[] = ['left', 'right', 'left'];
  return build(`Version1 · The Selectors · ${event.name}`, event, [
    ...names.map((dj, index) => [
      from(label(`0${index + 1} · ON THE DECKS`, 690), 'top', 110),
      from(rule(748), edges[index], 170),
      from(words(`Selector ${index + 1}`, dj, COL, 946, HEADLINE), edges[index], 320),
      from(words(`Selector ${index + 1} night`, `${event.day} ${event.date}`, COL, 1136, 54, 0, 0,
        { color: RED, spacing: 5 }), 'bottom', 150),
    ] as Piece[]),
    [
      from(label('ALL THREE, ONE NIGHT', 690), 'top', 110),
      from(words('Venue', event.venue, COL, 888, HERO), 'left', 300),
      from(words('City', event.city, COL, 1058, 80, 0, 0, { color: RED, spacing: 3 }), 'right', 220),
      from(tag(event.entry, COL, 1150), 'bottom', 200),
    ],
  ]);
}

/** A release rather than a night: the guide's music pillar. */
function mixDrop(event: Version1Event): Project {
  return build(`Version1 · Mix Drop · ${event.name}`, event, [
    [
      from(tag('NEW MIX', COL, 640), 'top', 180),
      from(words('Mix title', event.headline, COL, 926, HEADLINE), 'left', 300),
      from(words('Mix title highlight', event.highlight, COL, 1118, HEADLINE, 0, 0, { color: RED }), 'right', 300),
    ],
    selectorSection(event, 'IN THE MIX'),
    [
      from(label('THE SOUND', 690), 'top', 110),
      from(rule(748), 'left', 170),
      from(words('Genre', event.genre, COL, 926, HERO), 'left', 300),
    ],
    [
      from(label('HEAR IT NOW', 690), 'top', 110),
      from(rule(748), 'right', 170),
      from(words('Platform', event.platform, COL, 926, 92, 0, 0, { spacing: 3 }), 'left', 260),
      from(words('Platform note', 'Link in bio.', COL, 1046, 32, 0, 0,
        { color: GREY, font: SUPPORT }), 'bottom', 120),
    ],
  ]);
}

/** The morning of the night itself: fewest words, biggest type. */
function lastCall(event: Version1Event): Project {
  return build(`Version1 · Last Call · ${event.name}`, event, [
    [
      from(label(event.day, 690), 'top', 110),
      from(rule(748), 'left', 170),
      from(words('Headline', 'TONIGHT', COL, 928, HEADLINE), 'left', 320),
      from(words('Headline detail', event.date, COL, 1118, 72, 0, 0, { color: RED, spacing: 6 }), 'right', 200),
    ],
    [
      from(label('DOORS', 690), 'top', 110),
      from(rule(748), 'right', 170),
      from(words('Doors', event.time, COL, 918, 118), 'left', 280),
      from(tag(event.entry, COL, 1024), 'right', 240),
    ],
    selectorSection(event, 'ON THE DECKS'),
    [
      from(label('WE START AT', 690), 'top', 110),
      from(words('Venue', event.venue, COL, 898, HERO), 'left', 300),
      from(words('City', event.city, COL, 1068, 80, 0, 0, { color: RED, spacing: 3 }), 'right', 220),
      from(words('Address', event.address, COL, 1170, 28, 0, 0,
        { color: GREY, font: SUPPORT, spacing: 2 }), 'bottom', 120),
    ],
  ]);
}

export type EventStyle = 'announcement' | 'save-the-date' | 'selectors' | 'mix-drop' | 'last-call';

const BUILDERS: Record<EventStyle, (event: Version1Event) => Project> = {
  'announcement': nightAnnouncement,
  'save-the-date': saveTheDate,
  'selectors': theSelectors,
  'mix-drop': mixDrop,
  'last-call': lastCall,
};

export function createVersion1Event(style: EventStyle = 'announcement', event: Version1Event = GENERIC_EVENT): Project {
  return BUILDERS[style](event);
}

const CATEGORY = 'Version1 Events';

export const VERSION1_TEMPLATES: Template[] = [
  {
    id: 'version1-announcement', name: 'Version1 · Night Announcement',
    description: '15s · The sound, the selectors, the date and room, then the way in.',
    category: CATEGORY, factory: () => createVersion1Event('announcement'),
    preview: '/assets/version1/preview-announcement.jpg',
  },
  {
    id: 'version1-save-the-date', name: 'Version1 · Save the Date',
    description: '15s · Date-led, for the reminder once the night is already known.',
    category: CATEGORY, factory: () => createVersion1Event('save-the-date'),
    preview: '/assets/version1/preview-save-the-date.jpg',
  },
  {
    id: 'version1-selectors', name: 'Version1 · The Selectors',
    description: '15s · One selector per section, each with a screen of their own.',
    category: CATEGORY, factory: () => createVersion1Event('selectors'),
    preview: '/assets/version1/preview-selectors.jpg',
  },
  {
    id: 'version1-mix-drop', name: 'Version1 · Mix Drop',
    description: '15s · A release rather than a night: the mix, its sound and where to hear it.',
    category: CATEGORY, factory: () => createVersion1Event('mix-drop'),
    preview: '/assets/version1/preview-mix-drop.jpg',
  },
  {
    id: 'version1-last-call', name: 'Version1 · Last Call',
    description: '15s · The morning of the night: fewest words, biggest type.',
    category: CATEGORY, factory: () => createVersion1Event('last-call'),
    preview: '/assets/version1/preview-last-call.jpg',
  },
  {
    id: 'version1-november14', name: 'Version1 · 14 November',
    description: 'The Crescent York · Saturday 14 November · 8pm till late · free entry.',
    category: CATEGORY, factory: () => createVersion1Event('announcement', NOVEMBER_EVENT),
    preview: '/assets/version1/preview-november14.jpg',
  },
];
