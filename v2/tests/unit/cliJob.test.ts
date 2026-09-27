import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cliJobToProject, parseCliJob } from '../../src/core/cliJob.ts';

const source = JSON.parse(readFileSync(new URL('../../posts/september-mix/job.json', import.meta.url), 'utf8'));

describe('CLI job visual editor import', () => {
  it('maps the September Mix canvas, layers, and fades to a project', () => {
    const job = parseCliJob(source);
    const project = cliJobToProject(job);
    expect(project.metadata.name).toBe('September Mix — DJ Tony T');
    expect(project.settings).toMatchObject({ width: 1080, height: 1920, fps: 30, duration: 17000 });
    expect(project.layers).toHaveLength(job.layers.length);
    expect(project.layers[0]).toMatchObject({ type: 'image', assetId: 'post_asset_background' });
    expect(project.layers[2].opacity.keyframes.map(frame => frame.value)).toEqual([0, 1, 1, 0]);
    expect(project.layers[7]).toMatchObject({ type: 'text', text: 'DISCO GROOVES\\nBIG VOCALS\\nCLASSIC HOOKS\\nLATE-NIGHT ENERGY' });
    const fitted = cliJobToProject(job, { cover: { width: 800, height: 1600 } });
    expect(fitted.layers[3].scale.x.keyframes[0].value).toBeCloseTo(340 / 1080);
  });

  it('rejects a malformed job instead of loading it onto the canvas', () => {
    expect(() => parseCliJob({ ...source, jobVersion: 2 })).toThrow(/version 1/);
    expect(() => parseCliJob({ ...source, layers: [source.layers[0], source.layers[0]] })).toThrow(/Duplicate layer ID/);
  });
});
