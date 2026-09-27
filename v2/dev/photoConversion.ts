import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const run = promisify(execFile);
const SRGB_PROFILE = '/System/Library/ColorSync/Profiles/sRGB Profile.icc';
const MAX_FILE_BYTES = 40 * 1024 * 1024;

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += part.length;
    if (size > MAX_FILE_BYTES) throw new Error('Photo is larger than 40 MB.');
    chunks.push(part);
  }
  return Buffer.concat(chunks);
}

async function convertPhoto(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' }).end();
    return;
  }
  if (process.platform !== 'darwin') {
    response.writeHead(204).end();
    return;
  }

  const extension = String(request.headers['x-photo-extension'] ?? '').toLowerCase();
  if (!/^\.(png|jpe?g|heic|heif|webp|avif|tiff?|gif|bmp)$/.test(extension)) {
    response.writeHead(415).end('Unsupported photo format.');
    return;
  }

  const folder = await mkdtemp(join(tmpdir(), 'studio-photo-'));
  try {
    const input = join(folder, `original${extension}`);
    const output = join(folder, 'converted.png');
    await writeFile(input, await readBody(request));
    let profile;
    try {
      profile = await run('sips', ['-g', 'profile', input], { timeout: 15000 });
    } catch {
      // Browsers may support formats that the installed version of sips cannot inspect.
      response.writeHead(204).end();
      return;
    }
    if (!/BT\.2020|\bPQ\b|\bHLG\b/i.test(profile.stdout)) {
      response.writeHead(204).end();
      return;
    }
    await run('sips', ['-m', SRGB_PROFILE, input, '--out', output], { timeout: 30000 });
    const bytes = await readFile(output);
    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': bytes.length,
      'Cache-Control': 'no-store',
    }).end(bytes);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Could not convert photo colour: ${message}`);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

export function photoConversion(): Plugin {
  return {
    name: 'local-photo-color-conversion',
    configureServer(server) {
      server.middlewares.use('/api/photo/convert', (request, response) => { void convertPhoto(request, response); });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/photo/convert', (request, response) => { void convertPhoto(request, response); });
    },
  };
}
