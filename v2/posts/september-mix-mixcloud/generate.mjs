import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { TONY_TEMPLATES } from '../../src/templates/tonyBrand.ts';

const here = dirname(fileURLToPath(import.meta.url));
const duration = 10000;
const base = TONY_TEMPLATES.find(template => template.id === 'tony-september-mix-motion').factory();
const original = base.layers;
const source = name => original.find(layer => layer.type === 'text' && layer.name === name);
const label = source('Lime Label');
const headline = source('Headline');
const marker = source('Marker Tag');
const detail = source('Featured Artists');

function animatedText(prototype, name, text, x, y, size, from, start, exitStart, options = {}) {
  const layer = structuredClone(prototype);
  const outside = direction => ({
    x: direction === 'left' ? -1 : direction === 'right' ? 1.5 : x,
    y: direction === 'top' ? -0.25 : direction === 'bottom' ? 1.25 : y,
  });
  const initial = outside(from);
  const final = outside(from);
  const enterEnd = start + (options.enterMs ?? 560);
  const leaveEnd = Math.min(duration, exitStart + 400);
  const axis = (fromValue, target, finalValue) => ({ keyframes: [
    { time: 0, value: fromValue, easing: 'linear' },
    { time: start, value: fromValue, easing: 'linear' },
    { time: enterEnd, value: target, easing: 'ease-out-cubic' },
    { time: exitStart, value: target, easing: 'linear' },
    { time: leaveEnd, value: finalValue, easing: 'ease-in' },
  ] });
  layer.id = randomUUID();
  layer.name = name;
  layer.text = text;
  layer.position = { x: axis(initial.x, x, final.x), y: axis(initial.y, y, final.y) };
  layer.fontSize = { keyframes: [{ time: 0, value: size, easing: 'linear' }] };
  layer.opacity = { keyframes: [
    { time: 0, value: 0, easing: 'linear' },
    { time: start, value: 0, easing: 'linear' },
    { time: start + 220, value: 1, easing: 'ease-out' },
    { time: exitStart, value: 1, easing: 'linear' },
    { time: Math.min(duration, exitStart + 240), value: 0, easing: 'ease-in' },
  ] };
  layer.inTime = 0;
  layer.outTime = duration;
  if (options.color) layer.textColor = options.color;
  if (options.align) layer.textAlign = options.align;
  return layer;
}

const scene = [];
const add = (prototype, name, text, x, y, size, from, start, exit, options) =>
  scene.push(animatedText(prototype, name, text, x, y, size, from, start, exit, options));

// Opening: the release title arrives in two beats.
add(label, 'Opening label', 'NEW MIX · @TONYT.DJ', 0.27, 0.12, 27, 'top', 100, 2450);
add(headline, 'September headline', 'SEPTEMBER', 0.08, 0.40, 130, 'left', 330, 2500);
add(headline, 'Mix headline', 'MIX', 0.08, 0.57, 205, 'right', 720, 2550);
add(marker, 'Artist tag', 'DJ TONY T', 0.08, 0.75, 68, 'bottom', 1050, 2600);
add(detail, 'Opening detail', 'HOUSE · DISCO · LATE NIGHT', 0.08, 0.88, 28, 'left', 1300, 2650);

// Mood: a short, readable version of the supplied description.
add(label, 'Vibe label', 'THE VIBE', 0.16, 0.12, 27, 'top', 2750, 5050);
add(marker, 'House ride', 'A HOUSE-FILLED RIDE', 0.08, 0.40, 58, 'left', 2970, 5100);
add(detail, 'Disco grooves', 'DISCO GROOVES · BIG VOCALS', 0.08, 0.55, 35, 'right', 3300, 5150);
add(detail, 'Classic hooks', 'CLASSIC HOOKS', 0.08, 0.63, 38, 'left', 3550, 5200);
add(detail, 'Late night', 'LATE-NIGHT ENERGY', 0.08, 0.71, 38, 'right', 3800, 5250);

// Line-up: every named artist appears on screen.
add(label, 'Featuring label', 'FEATURING', 0.18, 0.12, 27, 'top', 5350, 7700);
add(headline, 'Featuring headline', 'FEATURING', 0.08, 0.38, 120, 'left', 5550, 7750);
add(detail, 'Artists 1', 'MK & BECKY HILL · KATY B', 0.08, 0.53, 32, 'right', 5750, 7800);
add(detail, 'Artists 2', 'KASKADE & DEADMAU5', 0.08, 0.60, 34, 'left', 5950, 7850);
add(detail, 'Artists 3', 'GREEN VELVET · MEDUZA', 0.08, 0.67, 34, 'right', 6150, 7900);
add(detail, 'Artists 4', 'KID CUDI VS. CROOKERS + MORE', 0.08, 0.74, 28, 'left', 6350, 7950);

// Close: display the listening destination, with the complete link in the caption.
add(label, 'Listen label', 'LISTEN HERE', 0.19, 0.12, 27, 'top', 8050, 9670);
add(headline, 'Out now headline', 'OUT NOW', 0.08, 0.43, 160, 'left', 8250, 9700);
add(marker, 'Mixcloud tag', 'MIXCLOUD', 0.08, 0.62, 78, 'right', 8450, 9730);
add(detail, 'Mixcloud URL 1', 'https://www.mixcloud.com/tonyt_dj/', 0.08, 0.79, 24, 'left', 8600, 9750);
add(detail, 'Mixcloud URL 2', 'dj-tony-t-house-mix-23rd-september-26/', 0.08, 0.85, 22, 'right', 8750, 9780);

const decorative = original.filter(layer => layer.type !== 'text').map(layer => {
  const copy = structuredClone(layer);
  copy.outTime = duration;
  if (copy.name.startsWith('Spectrum ')) {
    copy.opacity.keyframes = copy.opacity.keyframes.map(frame => ({
      ...frame,
      time: frame.time === 12000 ? duration : Math.min(frame.time, duration),
    }));
  }
  return copy;
});

const project = {
  ...base,
  metadata: { ...base.metadata, name: 'September Mix — DJ Tony T · Mixcloud', modifiedAt: new Date().toISOString() },
  settings: { ...base.settings, duration },
  layers: [...decorative, ...scene],
};

const caption = `September Mix — DJ Tony T
A house-filled ride through disco grooves, big vocals, classic hooks and late-night energy.
Featuring MK & Becky Hill, Katy B, Kaskade & deadmau5, Green Velvet, MEDUZA, Kid Cudi vs. Crookers and more.
Listen here:
https://www.mixcloud.com/tonyt_dj/dj-tony-t-house-mix-23rd-september-26/
`;

await writeFile(join(here, 'project.json'), JSON.stringify(project, null, 2) + '\n');
await writeFile(join(here, 'caption.txt'), caption);
console.log(`Created ${join(here, 'project.json')}`);
