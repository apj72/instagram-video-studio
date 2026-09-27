#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const defaultFont = resolve(here, '../public/assets/fonts/Bungee-Regular.ttf');
const maxDurationMs = 180_000;

function fail(message) { throw new Error(message); }
function object(value, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${where} must be an object`);
  return value;
}
function keys(value, allowed, where) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${where}: unknown field "${key}"`);
}
function number(value, where, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(`${where} must be a number from ${min} to ${max}`);
  }
  return value;
}
function string(value, where) {
  if (typeof value !== 'string' || !value.trim()) fail(`${where} must be a nonempty string`);
  return value;
}
function color(value, where) {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) fail(`${where} must be a #RRGGBB color`);
  return value;
}
function localPath(value, base, where) {
  const path = string(value, where);
  if (/^[a-z]+:\/\//i.test(path)) fail(`${where} must be a local file path`);
  return resolve(base, path);
}

export function validateJob(raw, base) {
  const job = object(raw, 'job');
  keys(job, ['jobVersion', 'name', 'canvas', 'layers', 'audio', 'output'], 'job');
  if (job.jobVersion !== 1) fail('jobVersion must be 1');
  string(job.name, 'name');
  const canvas = object(job.canvas, 'canvas');
  keys(canvas, ['width', 'height', 'fps', 'durationMs', 'backgroundColor'], 'canvas');
  const width = number(canvas.width, 'canvas.width', 64, 4096);
  const height = number(canvas.height, 'canvas.height', 64, 4096);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width % 2 || height % 2) fail('canvas width and height must be even integers');
  const fps = number(canvas.fps, 'canvas.fps', 1, 60);
  if (!Number.isInteger(fps)) fail('canvas.fps must be an integer');
  const durationMs = number(canvas.durationMs, 'canvas.durationMs', 100, maxDurationMs);
  color(canvas.backgroundColor, 'canvas.backgroundColor');
  if (!Array.isArray(job.layers) || job.layers.length === 0) fail('layers must be a nonempty array');
  const ids = new Set();
  const layers = job.layers.map((item, index) => {
    const where = `layers[${index}]`;
    const layer = object(item, where);
    const id = string(layer.id, `${where}.id`);
    if (ids.has(id)) fail(`duplicate layer id "${id}"`);
    ids.add(id);
    if (layer.type !== 'text' && layer.type !== 'image') fail(`${where}.type must be text or image`);
    keys(layer, layer.type === 'text'
      ? ['id', 'type', 'text', 'x', 'y', 'fontSize', 'color', 'fontFile', 'startMs', 'endMs', 'fadeInMs', 'fadeOutMs']
      : ['id', 'type', 'path', 'x', 'y', 'width', 'height', 'startMs', 'endMs', 'fadeInMs', 'fadeOutMs'], where);
    const x = number(layer.x, `${where}.x`, 0, width);
    const y = number(layer.y, `${where}.y`, 0, height);
    const startMs = number(layer.startMs ?? 0, `${where}.startMs`, 0, durationMs);
    const endMs = number(layer.endMs ?? durationMs, `${where}.endMs`, 0, durationMs);
    if (endMs <= startMs) fail(`${where}.endMs must exceed startMs`);
    const fadeInMs = number(layer.fadeInMs ?? 0, `${where}.fadeInMs`, 0, endMs - startMs);
    const fadeOutMs = number(layer.fadeOutMs ?? 0, `${where}.fadeOutMs`, 0, endMs - startMs);
    if (fadeInMs + fadeOutMs > endMs - startMs) fail(`${where}: fades exceed layer duration`);
    if (layer.type === 'text') {
      const text = string(layer.text, `${where}.text`);
      const fontSize = number(layer.fontSize, `${where}.fontSize`, 8, 500);
      color(layer.color, `${where}.color`);
      return { ...layer, id, text, x, y, fontSize, startMs, endMs, fadeInMs, fadeOutMs,
        fontFile: layer.fontFile ? localPath(layer.fontFile, base, `${where}.fontFile`) : defaultFont };
    }
    const imageWidth = number(layer.width, `${where}.width`, 1, width);
    const imageHeight = number(layer.height, `${where}.height`, 1, height);
    if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight)) fail(`${where} image dimensions must be integers`);
    return { ...layer, id, x, y, width: imageWidth, height: imageHeight, startMs, endMs, fadeInMs, fadeOutMs,
      path: localPath(layer.path, base, `${where}.path`) };
  });
  let audio;
  if (job.audio !== undefined) {
    const item = object(job.audio, 'audio');
    keys(item, ['path', 'volume', 'startMs'], 'audio');
    audio = { path: localPath(item.path, base, 'audio.path'),
      volume: number(item.volume ?? 1, 'audio.volume', 0, 2),
      startMs: number(item.startMs ?? 0, 'audio.startMs', 0, durationMs) };
  }
  return { ...job, canvas: { ...canvas, width, height, fps, durationMs }, layers, audio,
    output: localPath(job.output, base, 'output') };
}

async function checkInputs(job) {
  const files = [
    ...job.layers.filter(l => l.type === 'image').map(l => l.path),
    ...job.layers.filter(l => l.type === 'text').map(l => l.fontFile),
    ...(job.audio ? [job.audio.path] : []),
  ];
  for (const file of new Set(files)) {
    let info;
    try { info = await stat(file); } catch { fail(`missing input file: ${file}`); }
    if (!info.isFile()) fail(`input is not a file: ${file}`);
  }
  if (extname(job.output).toLowerCase() !== '.mp4') fail('output must end in .mp4');
}

function ffPath(path) { return path.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'").replaceAll(',', '\\,'); }
function seconds(ms) { return (ms / 1000).toFixed(3); }
function timeEnable(layer) { return `between(t,${seconds(layer.startMs)},${seconds(layer.endMs)})`; }

function textAlpha(layer) {
  const start = layer.startMs / 1000;
  const end = layer.endMs / 1000;
  const enter = layer.fadeInMs / 1000;
  const exit = layer.fadeOutMs / 1000;
  if (!enter && !exit) return '1';
  const parts = ['1'];
  if (enter) parts.push(`min(1,max(0,(t-${start})/${enter}))`);
  if (exit) parts.push(`min(1,max(0,(${end}-t)/${exit}))`);
  return parts.join('*');
}

export async function makeFilterGraph(job, scratch) {
  const { width, height, fps, durationMs, backgroundColor } = job.canvas;
  const duration = seconds(durationMs);
  const filters = [`color=c=${backgroundColor}:s=${width}x${height}:r=${fps}:d=${duration},format=rgba[v0]`];
  let current = 'v0';
  let imageInput = 0;
  for (let i = 0; i < job.layers.length; i++) {
    const layer = job.layers[i];
    const next = `v${i + 1}`;
    if (layer.type === 'text') {
      const textFile = join(scratch, `text-${i}.txt`);
      await writeFile(textFile, layer.text, 'utf8');
      const alpha = textAlpha(layer).replaceAll(',', '\\,');
      filters.push(`[${current}]drawtext=fontfile='${ffPath(layer.fontFile)}':textfile='${ffPath(textFile)}':fontsize=${layer.fontSize}:fontcolor=${layer.color}:x=${layer.x}-text_w/2:y=${layer.y}-text_h/2:alpha='${alpha}':enable='${timeEnable(layer)}'[${next}]`);
    } else {
      const scaled = `img${i}`;
      const fadeIn = layer.fadeInMs ? `,fade=t=in:st=${seconds(layer.startMs)}:d=${seconds(layer.fadeInMs)}:alpha=1` : '';
      const fadeOut = layer.fadeOutMs ? `,fade=t=out:st=${seconds(layer.endMs - layer.fadeOutMs)}:d=${seconds(layer.fadeOutMs)}:alpha=1` : '';
      filters.push(`[${imageInput}:v]format=rgba,scale=${layer.width}:${layer.height}:force_original_aspect_ratio=decrease,pad=${layer.width}:${layer.height}:(ow-iw)/2:(oh-ih)/2:color=black@0${fadeIn}${fadeOut}[${scaled}]`);
      filters.push(`[${current}][${scaled}]overlay=x=${layer.x}-overlay_w/2:y=${layer.y}-overlay_h/2:enable='${timeEnable(layer)}':shortest=1[${next}]`);
      imageInput++;
    }
    current = next;
  }
  filters.push(`[${current}]format=yuv420p[vout]`);
  return filters.join(';\n');
}

function findFfmpeg() {
  const candidates = [process.env.FFMPEG_PATH, 'ffmpeg', '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['-version'], { stdio: 'ignore' });
    if (result.status === 0) return candidate;
  }
  fail('FFmpeg is unavailable. Install FFmpeg or set FFMPEG_PATH to a working executable.');
}

export async function renderJob(job, options = {}) {
  await checkInputs(job);
  if (existsSync(job.output) && !options.overwrite) fail(`output already exists: ${job.output} (use --overwrite)`);
  const ffmpeg = findFfmpeg();
  const scratch = await mkdtemp(join(tmpdir(), 'video-studio-'));
  await mkdir(dirname(job.output), { recursive: true });
  const staged = join(dirname(job.output), `.${basename(job.output)}.${randomUUID()}.tmp.mp4`);
  try {
    const graph = await makeFilterGraph(job, scratch);
    const { fps, durationMs } = job.canvas;
    const args = ['-hide_banner', '-loglevel', 'error', '-stats'];
    for (const layer of job.layers) if (layer.type === 'image') {
      args.push('-loop', '1', '-framerate', String(fps), '-i', layer.path);
    }
    if (job.audio) args.push('-i', job.audio.path);
    args.push('-filter_complex', graph, '-map', '[vout]');
    if (job.audio) {
      const audioIndex = job.layers.filter(l => l.type === 'image').length;
      args.push('-map', `${audioIndex}:a:0`, '-af', `volume=${job.audio.volume},adelay=${job.audio.startMs}:all=1,apad`, '-c:a', 'aac', '-b:a', '128k');
    } else args.push('-an');
    args.push('-t', seconds(durationMs), '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', staged);
    await new Promise((done, reject) => {
      const child = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let errors = '';
      child.stderr.on('data', chunk => {
        const line = chunk.toString();
        errors = (errors + line).slice(-12_000);
        if (options.progress) process.stderr.write(line);
      });
      child.on('error', reject);
      child.on('close', code => code === 0 ? done() : reject(new Error(`FFmpeg failed (${code}): ${errors.trim()}`)));
    });
    if (options.overwrite) await rm(job.output, { force: true });
    await rename(staged, job.output);
    return job.output;
  } finally {
    await rm(staged, { force: true });
    await rm(scratch, { recursive: true, force: true });
  }
}

function createThumbnail(videoPath, thumbnailPath, durationMs) {
  const frameTime = seconds(Math.min(2000, durationMs / 2));
  const result = spawnSync(findFfmpeg(), ['-hide_banner', '-loglevel', 'error', '-ss', frameTime, '-i', videoPath,
    '-frames:v', '1', '-q:v', '3', '-y', thumbnailPath], { encoding: 'utf8' });
  if (result.status !== 0) fail(`video created, but thumbnail failed: ${result.stderr?.trim() || result.error?.message || 'unknown FFmpeg error'}`);
}

function usage() {
  return `Usage: npm run video -- <validate|render> --job FILE [--output FILE] [--set ID.text=VALUE] [--overwrite]\n\nJSON paths are relative to the job file. --set may be repeated for text layers.\n`;
}

export function parseArgs(argv) {
  const [command, ...args] = argv;
  if (command === '--help' || command === '-h') return { help: true };
  if (command !== 'validate' && command !== 'render') fail(usage());
  const result = { command, overrides: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--job' || arg === '--output' || arg === '--set') {
      if (!args[i + 1]) fail(`${arg} requires a value`);
      const value = args[++i];
      if (arg === '--job') result.jobPath = value;
      else if (arg === '--output') result.output = value;
      else result.overrides.push(value);
    } else if (arg === '--overwrite') result.overwrite = true;
    else fail(`unknown argument: ${arg}\n${usage()}`);
  }
  if (!result.jobPath) fail(`--job is required\n${usage()}`);
  return result;
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) { process.stdout.write(usage()); return; }
  const jobPath = resolve(args.jobPath);
  let raw;
  try { raw = JSON.parse(await readFile(jobPath, 'utf8')); }
  catch (error) { fail(`cannot read job ${jobPath}: ${error.message}`); }
  for (const override of args.overrides) {
    const separator = override.indexOf('.text=');
    if (separator < 1) fail(`invalid --set value: ${override}; use ID.text=VALUE`);
    const id = override.slice(0, separator);
    const layer = raw?.layers?.find(item => item.id === id);
    if (!layer || layer.type !== 'text') fail(`unknown text layer: ${id}`);
    layer.text = override.slice(separator + 6);
  }
  if (args.output) raw.output = isAbsolute(args.output) ? args.output : resolve(process.cwd(), args.output);
  const job = validateJob(raw, dirname(jobPath));
  await checkInputs(job);
  if (args.command === 'validate') { process.stdout.write(`Valid job: ${job.name}\n`); return; }
  const output = await renderJob(job, { overwrite: args.overwrite, progress: true });
  process.stdout.write(`Created ${output}\n`);
  const postsRoot = resolve(here, '../posts');
  if (basename(jobPath) === 'job.json' && jobPath.startsWith(postsRoot + sep)) {
    const thumbnail = join(dirname(jobPath), 'thumbnail.jpg');
    createThumbnail(output, thumbnail, job.canvas.durationMs);
    process.stdout.write(`Created ${thumbnail}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { process.stderr.write(`Error: ${error.message}\n`); process.exitCode = 1; });
}
