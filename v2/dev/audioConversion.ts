import { execFile } from 'node:child_process';
import { mkdtemp, open, readFile, rm } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';

const run = promisify(execFile);
const MAX_MEDIA_BYTES = 2 * 1024 * 1024 * 1024;

async function writeUpload(request: IncomingMessage, path: string, pcmPath?: string, videoBytes?: number): Promise<void> {
  const output = await open(path, 'w');
  let pcm: Awaited<ReturnType<typeof open>> | undefined;
  let size = 0, audioBytes = 0;
  let remainingVideo = pcmPath ? videoBytes! : Infinity;
  try {
    if (pcmPath) pcm = await open(pcmPath, 'w');
    for await (const chunk of request) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_MEDIA_BYTES) throw new Error('Media file exceeds the 2 GB limit.');
      const split = Math.min(bytes.length, remainingVideo);
      if (split > 0) await output.writeFile(bytes.subarray(0, split));
      if (pcm && split < bytes.length) {
        await pcm.writeFile(bytes.subarray(split));
        audioBytes += bytes.length - split;
      }
      remainingVideo -= split;
    }
    if (pcm && (remainingVideo !== 0 || audioBytes === 0)) throw new Error('Incomplete video/audio upload.');
  } finally {
    await Promise.all([output.close(), pcm?.close()]);
  }
}

async function runFfmpeg(args: string[]): Promise<void> {
  const candidates = [process.env.FFMPEG_PATH, '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg', 'ffmpeg']
    .filter((candidate): candidate is string => !!candidate);
  let conversionError: unknown;
  for (const executable of candidates) {
    try {
      await run(executable, args, { timeout: 600000 });
      return;
    } catch (cause) {
      conversionError = cause;
    }
  }
  throw conversionError;
}

async function convertFlac(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') { response.writeHead(405, { Allow: 'POST' }).end(); return; }
  const folder = await mkdtemp(join(tmpdir(), 'studio-flac-'));
  try {
    const input = join(folder, 'source.flac');
    const output = join(folder, 'decoded.wav');
    await writeUpload(request, input);
    await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input,
      '-vn', '-c:a', 'pcm_f32le', output]);
    const bytes = await readFile(output);
    response.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Content-Length': bytes.length,
      'Cache-Control': 'no-store',
    }).end(bytes);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Could not convert FLAC: ${message}`);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

async function alignVideoDuration(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === 'GET') {
    try {
      await runFfmpeg(['-version']);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ available: true, pcmAudio: true }));
    } catch {
      response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        .end(JSON.stringify({ available: false, error: 'FFmpeg is unavailable. Restart the local studio server with FFmpeg installed.' }));
    }
    return;
  }
  if (request.method !== 'POST') { response.writeHead(405, { Allow: 'POST' }).end(); return; }
  const seconds = Number(request.headers['x-target-duration-seconds']);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400) {
    response.writeHead(400).end('Invalid target duration.');
    return;
  }
  const folder = await mkdtemp(join(tmpdir(), 'studio-loop-'));
  try {
    const input = join(folder, 'source.mp4');
    const output = join(folder, 'aligned.mp4');
    const pcmAudio = request.headers['x-video-bytes'] !== undefined;
    const videoBytes = Number(request.headers['x-video-bytes']);
    if (pcmAudio && (!Number.isSafeInteger(videoBytes) || videoBytes <= 0 || videoBytes >= MAX_MEDIA_BYTES)) {
      response.writeHead(400).end('Invalid video length.');
      return;
    }
    const wav = join(folder, 'audio.wav');
    await writeUpload(request, input, pcmAudio ? wav : undefined, videoBytes);
    const end = String(seconds);
    await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input,
      ...(pcmAudio ? ['-i', wav, '-map', '0:v:0', '-map', '1:a:0'] : []),
      '-t', end, '-filter:a', `atrim=0:${end},asetpts=PTS-STARTPTS`,
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-use_editlist', '1',
      '-movie_timescale', '1000000', '-movflags', '+faststart', output]);
    const bytes = await readFile(output);
    response.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': bytes.length,
      'Cache-Control': 'no-store',
    }).end(bytes);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Could not align exported video: ${message}`);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

export function audioConversion(): Plugin {
  return {
    name: 'local-flac-conversion',
    configureServer(server) {
      server.middlewares.use('/api/audio/convert-flac', (request, response) => { void convertFlac(request, response); });
      server.middlewares.use('/api/video/align-duration', (request, response) => { void alignVideoDuration(request, response); });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/audio/convert-flac', (request, response) => { void convertFlac(request, response); });
      server.middlewares.use('/api/video/align-duration', (request, response) => { void alignVideoDuration(request, response); });
    },
  };
}
