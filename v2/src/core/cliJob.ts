import { createDefaultProject, SCHEMA_VERSION } from './schema.ts';
import type { AnimatedProperty, ImageLayer, Layer, Project, TextLayer } from './schema.ts';

interface CliLayerBase {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  startMs?: number;
  endMs?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
}

interface CliTextLayer extends CliLayerBase {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
}

interface CliImageLayer extends CliLayerBase {
  type: 'image';
  path: string;
  width: number;
  height: number;
}

export interface CliJob {
  jobVersion: 1;
  name: string;
  canvas: { width: number; height: number; fps: number; durationMs: number; backgroundColor: string };
  layers: (CliTextLayer | CliImageLayer)[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseCliJob(value: unknown): CliJob {
  if (!isRecord(value) || value.jobVersion !== 1 || typeof value.name !== 'string' || !isRecord(value.canvas) || !Array.isArray(value.layers)) {
    throw new Error('Expected a version 1 video job with a name, canvas, and layers.');
  }
  const canvas = value.canvas;
  for (const key of ['width', 'height', 'fps', 'durationMs']) {
    if (typeof canvas[key] !== 'number' || !Number.isFinite(canvas[key]) || canvas[key] <= 0) {
      throw new Error(`Invalid canvas.${key}`);
    }
  }
  if (typeof canvas.backgroundColor !== 'string') throw new Error('Invalid canvas.backgroundColor');
  const ids = new Set<string>();
  for (const [index, item] of value.layers.entries()) {
    if (!isRecord(item) || (item.type !== 'text' && item.type !== 'image') || typeof item.id !== 'string' || !item.id) {
      throw new Error(`Invalid layer ${index}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate layer ID: ${item.id}`);
    ids.add(item.id);
    if (typeof item.x !== 'number' || typeof item.y !== 'number') throw new Error(`Invalid position in layer ${item.id}`);
    if (item.type === 'text' && (typeof item.text !== 'string' || typeof item.fontSize !== 'number' || typeof item.color !== 'string')) {
      throw new Error(`Invalid text layer ${item.id}`);
    }
    if (item.type === 'image' && (typeof item.path !== 'string' || typeof item.width !== 'number' || typeof item.height !== 'number')) {
      throw new Error(`Invalid image layer ${item.id}`);
    }
  }
  return value as unknown as CliJob;
}

function staticValue(value: number): AnimatedProperty {
  return { keyframes: [{ time: 0, value, easing: 'linear' }] };
}

function opacity(layer: CliLayerBase, duration: number): AnimatedProperty {
  const start = layer.startMs ?? 0;
  const end = layer.endMs ?? duration;
  const fadeIn = layer.fadeInMs ?? 0;
  const fadeOut = layer.fadeOutMs ?? 0;
  const keyframes: AnimatedProperty['keyframes'] = [];
  if (fadeIn > 0) keyframes.push({ time: start, value: 0, easing: 'linear' });
  keyframes.push({ time: start + fadeIn, value: 1, easing: 'linear' });
  if (fadeOut > 0) {
    keyframes.push({ time: end - fadeOut, value: 1, easing: 'linear' });
    keyframes.push({ time: end, value: 0, easing: 'linear' });
  }
  return { keyframes };
}

function baseLayer(layer: CliLayerBase, job: CliJob) {
  return {
    id: `post_${layer.id}`,
    name: layer.id,
    visible: true,
    locked: false,
    opacity: opacity(layer, job.canvas.durationMs),
    position: { x: staticValue(layer.x / job.canvas.width), y: staticValue(layer.y / job.canvas.height) },
    scale: { x: staticValue(1), y: staticValue(1) },
    rotation: staticValue(0),
    inTime: layer.startMs ?? 0,
    outTime: layer.endMs ?? job.canvas.durationMs,
    blendMode: 'source-over',
  };
}

export function cliJobToProject(job: CliJob, imageSizes: Record<string, { width: number; height: number }> = {}): Project {
  const project = createDefaultProject();
  const layers: Layer[] = job.layers.map(layer => {
    const base = baseLayer(layer, job);
    if (layer.type === 'image') {
      const image = imageSizes[layer.id];
      const displayWidth = image ? Math.min(layer.width, layer.height * image.width / image.height) : layer.width;
      return {
        ...base,
        type: 'image',
        assetId: `post_asset_${layer.id}`,
        size: { width: layer.width, height: layer.height },
        scale: { x: staticValue(displayWidth / job.canvas.width), y: staticValue(displayWidth / job.canvas.width) },
        parallax: false,
        parallaxStartY: 0,
        parallaxDuration: 0,
      } satisfies ImageLayer;
    }
    return {
      ...base,
      type: 'text',
      text: layer.text.replace(/\n/g, '\\n'),
      fontFamily: 'Bungee',
      fontSize: staticValue(layer.fontSize),
      fontWeight: 'normal',
      textColor: layer.color,
      textAlign: 'center',
      lineHeight: 1.25,
      letterSpacing: 0,
      stroke: { enabled: false, color: '#000000', width: 0 },
      shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
      background: { enabled: false, color: '#000000', opacity: 0, paddingX: 0, paddingY: 0, cornerRadius: 0 },
      border: { enabled: false, color: '#000000', width: 0, cornerRadius: 0, paddingX: 0, paddingY: 0 },
    } satisfies TextLayer;
  });
  const now = new Date().toISOString();
  return {
    ...project,
    metadata: { name: job.name, createdAt: now, modifiedAt: now, schemaVersion: SCHEMA_VERSION },
    settings: {
      ...project.settings,
      width: job.canvas.width,
      height: job.canvas.height,
      fps: job.canvas.fps,
      duration: job.canvas.durationMs,
      backgroundColor: job.canvas.backgroundColor,
    },
    layers,
  };
}
