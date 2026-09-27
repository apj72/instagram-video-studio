import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseArgs, validateJob } from '../../cli/video-studio.mjs';

const examplePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../examples/friday-lineup.json');
const base = dirname(examplePath);
const example = JSON.parse(await readFile(examplePath, 'utf8'));

test('example job resolves its media and output relative to its file', () => {
  const job = validateJob(example, base);
  assert.equal(job.layers[0].path, resolve(base, '../public/assets/logo_transparent.png'));
  assert.equal(job.output, resolve(base, '../out/friday-lineup.mp4'));
});

test('invalid version and unknown fields fail clearly', () => {
  assert.throws(() => validateJob({ ...example, jobVersion: 2 }, base), /jobVersion must be 1/);
  assert.throws(() => validateJob({ ...example, mystery: true }, base), /unknown field "mystery"/);
});

test('duplicate layer ids and impossible fades fail validation', () => {
  const duplicate = { ...example, layers: [...example.layers, { ...example.layers[0] }] };
  assert.throws(() => validateJob(duplicate, base), /duplicate layer id/);
  const fade = structuredClone(example);
  fade.layers[0].fadeInMs = 6000;
  fade.layers[0].fadeOutMs = 6000;
  assert.throws(() => validateJob(fade, base), /fades exceed layer duration/);
});

test('CLI parses repeated text overrides and rejects unknown arguments', () => {
  const parsed = parseArgs(['render', '--job', 'event.json', '--set', 'title.text=Friday', '--set', 'venue.text=London']);
  assert.deepEqual(parsed.overrides, ['title.text=Friday', 'venue.text=London']);
  assert.throws(() => parseArgs(['render', '--job', 'event.json', '--unsafe']), /unknown argument/);
});
