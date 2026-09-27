import { createDefaultProject, EXPORT_PRESETS, generateId } from '../core/schema.ts';
import type { AnimatedProperty, EffectLayer, Layer, Project, ShapeLayer, TextLayer } from '../core/schema.ts';
import type { Template } from './index.ts';
import { DEFAULT_LASER_COLORS, DEFAULT_LASER_SPEED, DEFAULT_LASER_SWEEP, getDefaultLaserAngle } from '../render/laserMotion.ts';

const C = {
  ink: '#0B0714', pink: '#FF2E93', orange: '#FF7A1A', yellow: '#FFD400',
  lime: '#B6FF00', cyan: '#22D3EE', blue: '#2F6BFF', purple: '#8B3DFF', white: '#FFFFFF',
};

export const TONY_BRAND_ASSETS = [
  { id: 'tony-brand-wild', url: '/assets/tony-brand/wild.jpg' },
  { id: 'tony-brand-crowd', url: '/assets/tony-brand/crowd.jpg' },
  { id: 'tony-brand-tiedye', url: '/assets/tony-brand/tiedye.jpg' },
] as const;

function value(number: number): AnimatedProperty {
  return { keyframes: [{ time: 0, value: number, easing: 'linear' }] };
}

function reveal(start: number, duration: number): AnimatedProperty {
  return { keyframes: [
    { time: start, value: 0, easing: 'linear' },
    { time: start + 450, value: 1, easing: 'ease-out' },
    { time: duration - 500, value: 1, easing: 'linear' },
    { time: duration, value: 0, easing: 'linear' },
  ] };
}

function base(name: string, duration: number, x: number, y: number) {
  return {
    id: generateId(), name, visible: true, locked: false,
    opacity: value(1), position: { x: value(x), y: value(y) },
    scale: { x: value(1), y: value(1) }, rotation: value(0),
    inTime: 0, outTime: duration, blendMode: 'source-over',
  };
}

function text(name: string, content: string, duration: number, x: number, y: number, size: number,
  color: string, font = 'Bungee', align: TextLayer['textAlign'] = 'left'): TextLayer {
  return {
    ...base(name, duration, x, y), type: 'text', text: content, fontFamily: font,
    fontSize: value(size), fontWeight: font === 'Space Mono' ? 'bold' : '400',
    textColor: color, textAlign: align, lineHeight: font === 'Bungee' ? 0.98 : 1.2,
    letterSpacing: font === 'Space Mono' ? 2 : 0,
    stroke: { enabled: false, color: C.ink, width: 0 },
    shadow: { enabled: false, color: C.ink, blur: 0, offsetX: 0, offsetY: 0 },
    background: { enabled: false, color: C.ink, opacity: 0, paddingX: 0, paddingY: 0, cornerRadius: 0 },
    border: { enabled: false, color: C.ink, width: 0, cornerRadius: 0, paddingX: 0, paddingY: 0 },
  };
}

function label(content: string, duration: number, x: number, y: number): TextLayer {
  return {
    ...text('Lime Label', content, duration, x, y, 27, C.ink, 'Space Mono'),
    textAlign: 'center',
    background: { enabled: true, color: C.lime, opacity: 1, paddingX: 20, paddingY: 10, cornerRadius: 22 },
    border: { enabled: true, color: C.ink, width: 4, cornerRadius: 22, paddingX: 20, paddingY: 10 },
    opacity: reveal(0, duration),
  };
}

function headline(content: string, duration: number, x: number, y: number, size: number, fill = C.white): TextLayer {
  return {
    ...text('Headline', content, duration, x, y, size, fill),
    headlineEffect: { mode: 'stacked', outlineColor: '#000000', outlineWidth: 12,
      offset: 7, midColor: fill === C.ink ? C.white : C.orange, backColor: C.pink },
    opacity: reveal(250, duration),
  };
}

function marker(content: string, duration: number, x: number, y: number, size = 70): TextLayer {
  return {
    ...text('Marker Tag', content, duration, x, y, size, C.yellow, 'Permanent Marker'),
    rotation: value(-0.012),
    shadow: { enabled: true, color: C.ink, blur: 0, offsetX: 5, offsetY: 5 },
    opacity: reveal(650, duration),
  };
}

function detail(name: string, content: string, duration: number, x: number, y: number, size = 26, color = C.white): TextLayer {
  return { ...text(name, content, duration, x, y, size, color, 'Space Mono'), opacity: reveal(850, duration) };
}

function shape(name: string, duration: number, width: number, height: number, x: number, y: number,
  color: string, opacity = 1): ShapeLayer {
  return {
    ...base(name, duration, x, y), type: 'shape', shapeType: 'rect', size: { width, height },
    fill: { enabled: true, color }, stroke: { enabled: false, color: C.ink, width: 0 },
    cornerRadius: 0, opacity: value(opacity),
  };
}

function lasers(duration: number, count: number): EffectLayer {
  return { ...base('Laser Beams', duration, 0.5, 0.5), type: 'effect', effectType: 'laser-beams',
    config: { count, glow: 26, speed: DEFAULT_LASER_SPEED, sweep: DEFAULT_LASER_SWEEP,
      colors: [...DEFAULT_LASER_COLORS], angles: Array.from({ length: count }, (_, index) => getDefaultLaserAngle(index, count)) } };
}

function spectrum(duration: number, width: number, height: number): ShapeLayer[] {
  const colors = [C.pink, C.orange, C.yellow, C.lime, C.cyan, C.blue, C.purple];
  const total = width - 140;
  const barWidth = total / colors.length;
  return colors.map((color, index) => shape(`Spectrum ${index + 1}`, duration, barWidth, Math.max(8, width * 0.012),
    (70 + barWidth * (index + 0.5)) / width, (height - 70) / height, color));
}

function makeProject(name: string, width: number, height: number, duration: number, backgroundId: string, layers: Layer[]): Project {
  const project = createDefaultProject();
  const now = new Date().toISOString();
  const preset = height === 1920 ? EXPORT_PRESETS[1] : height === 1350 ? EXPORT_PRESETS[2] : EXPORT_PRESETS[3];
  return {
    ...project,
    metadata: { ...project.metadata, name, createdAt: now, modifiedAt: now },
    settings: { ...project.settings, width, height, duration, fps: 30, seed: 42,
      backgroundColor: C.ink, backgroundImageAssetId: backgroundId,
      border: { enabled: true, thickness: height === width ? 20 : 8, color: C.ink, cornerRadius: 0, inset: 0, outerBlur: 0 } },
    layers,
    exportPreset: preset,
  };
}

function mixDrop(): Project {
  const w = 1080, h = 1350, d = 12000;
  return makeProject('Tony T · Mix Drop', w, h, d, 'tony-brand-wild', [
    shape('Photo Dark Fade', d, w, h, 0.5, 0.5, C.ink, 0.52),
    lasers(d, 2),
    label('NEW MIX · HOUSE', d, 0.22, 0.10),
    headline('HOUSE\\nMIX', d, 0.08, 0.57, 205),
    marker('YOUR DATE', d, 0.08, 0.76),
    detail('Details', 'DJ TONY T · SOUNDCLOUD', d, 0.08, 0.87),
    detail('Handle', '@TONYT.DJ · A VERSION1 SELECTOR', d, 0.08, 0.92, 22, C.lime),
    ...spectrum(d, w, h),
  ]);
}

function septemberMix(): Project {
  const project = mixDrop();
  const layers = project.layers.map(layer => {
    if (layer.type !== 'text') return layer;
    if (layer.name === 'Lime Label') return { ...layer, text: 'NEW MIX · SEPTEMBER' };
    if (layer.name === 'Headline') return { ...layer, text: 'SEPTEMBER\\nMIX', fontSize: value(130) };
    if (layer.name === 'Marker Tag') return { ...layer, text: 'OUT NOW' };
    if (layer.name === 'Details') return { ...layer, text: 'MK · KATY B · MEDUZA + MORE' };
    if (layer.name === 'Handle') return { ...layer, text: '@TONYT.DJ · SOUNDCLOUD' };
    return layer;
  });
  return { ...project, metadata: { ...project.metadata, name: 'Tony T · September Mix' }, layers };
}

function gigStory(): Project {
  const w = 1080, h = 1920, d = 12000;
  return makeProject('Tony T · Gig Story', w, h, d, 'tony-brand-crowd', [
    shape('Photo Dark Fade', d, w, h, 0.5, 0.5, C.ink, 0.58),
    lasers(d, 3),
    label('TONIGHT', d, 0.20, 0.13),
    headline('LIVE\\nTONIGHT', d, 0.08, 0.61, 165),
    marker('DOORS 9PM', d, 0.08, 0.76),
    detail('Venue', 'YOUR VENUE · YOUR CITY', d, 0.08, 0.86),
    detail('Date', 'YOUR DATE · @TONYT.DJ', d, 0.08, 0.91, 24, C.lime),
    ...spectrum(d, w, h),
  ]);
}

function squareCover(): Project {
  const w = 1080, h = 1080, d = 10000;
  return makeProject('Tony T · Square Cover', w, h, d, 'tony-brand-tiedye', [
    label('DJ TONY T', d, 0.5, 0.19),
    headline('MIX\\n001', d, 0.5, 0.48, 235, C.ink),
    marker('HOUSE · DISCO', d, 0.5, 0.74, 62),
    detail('Handle', '@TONYT.DJ', d, 0.5, 0.90, 28, C.ink),
    ...spectrum(d, w, h),
  ].map(layer => layer.type === 'text' ? { ...layer, textAlign: 'center' as const } : layer));
}

type Direction = 'top' | 'left' | 'right' | 'bottom';

function movingText(layer: TextLayer, from: Direction, start: number, enterMs: number,
  exitTo: Direction, exitStart: number): TextLayer {
  const duration = layer.outTime;
  const targetX = layer.position.x.keyframes[0].value;
  const targetY = layer.position.y.keyframes[0].value;
  const outside = (direction: Direction) => ({
    x: direction === 'left' ? -1 : direction === 'right' ? 1.45 : targetX,
    y: direction === 'top' ? -0.25 : direction === 'bottom' ? 1.25 : targetY,
  });
  const entrance = outside(from);
  const exit = outside(exitTo);
  const axis = (initial: number, target: number, final: number): AnimatedProperty => ({ keyframes: [
    { time: 0, value: initial, easing: 'linear' },
    { time: start, value: initial, easing: 'linear' },
    { time: start + enterMs, value: target, easing: 'ease-out-cubic' },
    { time: exitStart, value: target, easing: 'linear' },
    { time: Math.min(duration, exitStart + 600), value: final, easing: 'ease-in' },
  ] });
  return {
    ...layer,
    position: {
      x: axis(entrance.x, targetX, exit.x),
      y: axis(entrance.y, targetY, exit.y),
    },
    opacity: { keyframes: [
      { time: 0, value: 0, easing: 'linear' },
      { time: start, value: 0, easing: 'linear' },
      { time: start + 250, value: 1, easing: 'ease-out' },
      { time: exitStart, value: 1, easing: 'linear' },
      { time: Math.min(duration, exitStart + 220), value: 0, easing: 'ease-in' },
    ] },
  };
}

function kineticSpectrum(duration: number, width: number, height: number): ShapeLayer[] {
  return spectrum(duration, width, height).map((bar, index) => ({
    ...bar,
    opacity: { keyframes: [
      { time: 0, value: 0.12, easing: 'linear' },
      { time: 700 + index * 120, value: 1, easing: 'ease-out' },
      { time: 9000, value: 1, easing: 'linear' },
      { time: duration, value: 0.12, easing: 'ease-in' },
    ] },
  }));
}

function septemberMixMotion(): Project {
  const w = 1080, h = 1350, d = 12000;
  return makeProject('Tony T · September Mix Motion', w, h, d, 'tony-brand-wild', [
    shape('Photo Dark Fade', d, w, h, 0.5, 0.5, C.ink, 0.56),
    lasers(d, 2),
    movingText(label('NEW MIX · SEPTEMBER', d, 0.24, 0.12), 'top', 120, 750, 'top', 10600),
    movingText(headline('SEPTEMBER', d, 0.08, 0.41, 130), 'left', 650, 900, 'left', 10200),
    movingText(headline('MIX', d, 0.08, 0.58, 205), 'right', 1450, 850, 'right', 10350),
    movingText(marker('OUT NOW', d, 0.08, 0.75), 'bottom', 2350, 750, 'bottom', 10450),
    movingText(detail('Featured Artists', 'MK · KATY B · MEDUZA + MORE', d, 0.08, 0.87), 'left', 3150, 650, 'left', 10500),
    movingText(detail('Handle', '@TONYT.DJ · SOUNDCLOUD', d, 0.08, 0.92, 22, C.lime), 'right', 3650, 650, 'right', 10550),
    ...kineticSpectrum(d, w, h),
  ]);
}

function gigStoryMotion(): Project {
  const w = 1080, h = 1920, d = 12000;
  return makeProject('Tony T · Gig Story Motion', w, h, d, 'tony-brand-crowd', [
    shape('Photo Dark Fade', d, w, h, 0.5, 0.5, C.ink, 0.62),
    lasers(d, 3),
    movingText(label('TONIGHT · DJ TONY T', d, 0.27, 0.14), 'top', 150, 700, 'top', 10600),
    movingText(headline('LIVE', d, 0.08, 0.43, 175), 'left', 700, 900, 'left', 10100),
    movingText(headline('TONIGHT', d, 0.08, 0.55, 155), 'right', 1500, 950, 'right', 10250),
    movingText(marker('DOORS 9PM', d, 0.08, 0.73, 75), 'bottom', 2600, 700, 'bottom', 10400),
    movingText(detail('Venue', 'YOUR VENUE · YOUR CITY', d, 0.08, 0.85), 'right', 3350, 650, 'right', 10500),
    movingText(detail('Date', 'YOUR DATE · @TONYT.DJ', d, 0.08, 0.91, 24, C.lime), 'left', 3900, 650, 'left', 10550),
    ...kineticSpectrum(d, w, h),
  ]);
}

function squareCoverMotion(): Project {
  const w = 1080, h = 1080, d = 12000;
  const centered = (layer: TextLayer) => ({ ...layer, textAlign: 'center' as const });
  return makeProject('Tony T · Square Cover Motion', w, h, d, 'tony-brand-tiedye', [
    movingText(centered(label('DJ TONY T', d, 0.5, 0.17)), 'top', 120, 700, 'top', 10600),
    movingText(centered(headline('MIX', d, 0.5, 0.36, 235, C.ink)), 'left', 700, 900, 'left', 10100),
    movingText(centered(headline('001', d, 0.5, 0.58, 235, C.ink)), 'right', 1500, 900, 'right', 10250),
    movingText(centered(marker('HOUSE · DISCO', d, 0.5, 0.76, 62)), 'bottom', 2550, 800, 'bottom', 10400),
    movingText(centered(detail('Handle', '@TONYT.DJ', d, 0.5, 0.90, 28, C.ink)), 'top', 3400, 700, 'top', 10500),
    ...kineticSpectrum(d, w, h),
  ]);
}

export const TONY_TEMPLATES: Template[] = [
  { id: 'tony-september-mix', name: 'Tony T · September Mix', description: 'Your September release, ready to edit · 4:5', category: 'DJ Tony T', factory: septemberMix, preview: '/assets/tony-brand/wild.jpg' },
  { id: 'tony-mix-drop', name: 'Tony T · Mix Drop', description: 'Mural photo, lime label, stacked headline and marker date · 4:5', category: 'DJ Tony T', factory: mixDrop, preview: '/assets/tony-brand/wild.jpg' },
  { id: 'tony-gig-story', name: 'Tony T · Gig Story', description: 'Crowd photo, three lasers and bold headline · 9:16', category: 'DJ Tony T', factory: gigStory, preview: '/assets/tony-brand/crowd.jpg' },
  { id: 'tony-square-cover', name: 'Tony T · Square Cover', description: 'Tie-dye colour blast and outlined type · 1:1', category: 'DJ Tony T', factory: squareCover, preview: '/assets/tony-brand/tiedye.jpg' },
  { id: 'tony-september-mix-motion', name: 'Tony T · September Mix Motion', description: 'Staggered September release with text sliding from four sides · 4:5', category: 'DJ Tony T · Motion', factory: septemberMixMotion, preview: '/assets/tony-brand/wild.jpg' },
  { id: 'tony-gig-story-motion', name: 'Tony T · Gig Story Motion', description: 'Live announcement with directional headline entrances · 9:16', category: 'DJ Tony T · Motion', factory: gigStoryMotion, preview: '/assets/tony-brand/crowd.jpg' },
  { id: 'tony-square-cover-motion', name: 'Tony T · Square Cover Motion', description: 'Kinetic mix number and tag · 1:1', category: 'DJ Tony T · Motion', factory: squareCoverMotion, preview: '/assets/tony-brand/tiedye.jpg' },
];
