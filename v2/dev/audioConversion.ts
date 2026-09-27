import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';

const run = promisify(execFile);
const MAX_MEDIA_BYTES = 2 * 1024 * 1024 * 1024;

async function writeUpload(request: IncomingMessage, path: string): Promise<void> {
  const output = createWriteStream(path);
  let size = 0;
  try {
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_MEDIA_BYTES) throw new Error('Media file exceeds the 2 GB limit.');
      if (!output.write(chunk)) await new Promise<void>(resolve => output.once('drain', resolve));
    }
    await new Promise<void>((resolve, reject) => {
      output.once('error', reject);
      output.end(resolve);
    });
  } catch (cause) {
    output.destroy();
    throw cause;
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
    const output = join(folder, 'decoded.m4a');
    await writeUpload(request, input);
    await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input,
      '-vn', '-c:a', 'aac', '-b:a', '256k', output]);
    const bytes = await readFile(output);
    response.writeHead(200, {
      'Content-Type': 'audio/mp4',
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
    await writeUpload(request, input);
    const end = String(seconds);
    await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input,
      '-t', end, '-filter:a', `atrim=0:${end},asetpts=PTS-STARTPTS`,
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', output]);
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
