import { useEffect, useRef, useState } from 'preact/hooks';
import { cliJobToProject, parseCliJob } from '../core/cliJob.ts';
import { registerAsset } from '../core/assets.ts';
import { loadProject } from '../core/state.ts';
import type { Project } from '../core/schema.ts';
import { listLibraryItems, type LibraryItem } from '../core/persistence.ts';
import { bundledLibraryId, openLibraryItem } from '../core/library.ts';

const jobFiles = import.meta.glob('../../posts/**/job.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const projectFiles = import.meta.glob('../../posts/**/project.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const thumbnails = import.meta.glob('../../posts/**/thumbnail.jpg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const imageFiles = import.meta.glob('../../posts/**/*.{png,jpg,jpeg,webp}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

interface PostEntry {
  key: string;
  name: string;
  thumbnail?: string;
  json: string;
  saved?: LibraryItem;
  bundled?: boolean;
}

function isProject(value: any): value is Project {
  return value && typeof value === 'object' && value.metadata && value.settings && Array.isArray(value.layers);
}

const bundledPosts: PostEntry[] = Object.entries({ ...projectFiles, ...jobFiles }).map(([key, json]) => {
  let name = key.split('/').at(-2) ?? 'Post';
  try {
    const value = JSON.parse(json);
    name = value.metadata?.name || value.name || name;
  } catch { /* Show the JSON so it can be fixed. */ }
  return { key, name, json, thumbnail: thumbnails[key.replace(/(?:job|project)\.json$/, 'thumbnail.jpg')], bundled: true };
});

function downloadJson(json: string, name: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function relativeAssetKey(jobKey: string, assetPath: string) {
  if (assetPath.startsWith('/') || assetPath.includes('://')) throw new Error(`Use a relative image path: ${assetPath}`);
  const parts = jobKey.split('/').slice(0, -1);
  for (const part of assetPath.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.' && part) parts.push(part);
  }
  return parts.join('/');
}

async function loadPostImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

interface PostsDialogProps {
  onClose: () => void;
}

export function PostsDialog({ onClose }: PostsDialogProps) {
  const [posts, setPosts] = useState<PostEntry[]>(bundledPosts);
  const [selected, setSelected] = useState<PostEntry | null>(bundledPosts[0] ?? null);
  const [json, setJson] = useState(bundledPosts[0]?.json ?? '');
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    listLibraryItems('post').then(items => {
      if (!active) return;
      const savedById = new Map(items.map(item => [item.id, item]));
      const entries = bundledPosts.map(post => {
        const saved = savedById.get(bundledLibraryId('post', post.key));
        return saved ? { ...post, name: saved.name, json: JSON.stringify(saved.project, null, 2), thumbnail: saved.thumbnail || post.thumbnail, saved } : post;
      });
      entries.push(...items.filter(item => !item.id.startsWith('post:bundled:')).map(item => ({
        key: item.id, name: item.name, thumbnail: item.thumbnail,
        json: JSON.stringify(item.project, null, 2), saved: item,
      })));
      setPosts(entries);
      if (selected) {
        const updated = entries.find(entry => entry.key === selected.key);
        if (updated && updated.saved && !selected.saved) { setSelected(updated); setJson(updated.json); }
      } else if (entries[0]) { setSelected(entries[0]); setJson(entries[0].json); }
    }).catch(cause => { if (active) setError(`Could not load saved posts: ${cause instanceof Error ? cause.message : String(cause)}`); });
    return () => { active = false; };
  }, []);

  function selectPost(post: PostEntry) {
    setSelected(post);
    setJson(post.json);
    setError('');
  }

  async function openFile(file: File) {
    try {
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      if (parsed?.jobVersion !== 1 && !isProject(parsed)) throw new Error('Expected a video project or version 1 job.');
      setSelected({ key: file.name, name: parsed.name || file.name, json: contents });
      setJson(contents);
      setError('');
    } catch (cause) {
      setError(`Could not open JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  function handleDownload() {
    try {
      const parsed = JSON.parse(json);
      if (parsed?.jobVersion !== 1 && !isProject(parsed)) throw new Error('Expected a video project or version 1 job.');
      downloadJson(JSON.stringify(parsed, null, 2) + '\n', selected?.name ?? 'post');
      setError('');
    } catch (cause) {
      setError(`Fix the JSON before downloading: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  async function handleOpenVisual() {
    if (!selected) return;
    setOpening(true);
    setError('');
    try {
      const parsed = JSON.parse(json);
      if (isProject(parsed)) {
        if (selected.saved) await openLibraryItem(selected.saved);
        loadProject(parsed, selected.saved
          ? { kind: 'post', id: selected.saved.id, name: selected.saved.name }
          : selected.bundled ? { kind: 'post', id: bundledLibraryId('post', selected.key), name: selected.name } : null);
        onClose();
        return;
      }
      const job = parseCliJob(parsed);
      const imageLayers = job.layers.filter(layer => layer.type === 'image');
      const loaded = await Promise.all(imageLayers.map(async layer => {
        const key = relativeAssetKey(selected.key, layer.path);
        const url = imageFiles[key];
        if (!url) throw new Error(`Image ${layer.path} is not bundled with this post. Open a post from the list with its images in v2/posts.`);
        return { id: `post_asset_${layer.id}`, layerId: layer.id, image: await loadPostImage(url) };
      }));
      for (const asset of loaded) registerAsset(asset.id, asset.image);
      const imageSizes = Object.fromEntries(loaded.map(asset => [asset.layerId, { width: asset.image.naturalWidth, height: asset.image.naturalHeight }]));
      loadProject(cliJobToProject(job, imageSizes), selected.bundled
        ? { kind: 'post', id: bundledLibraryId('post', selected.key), name: selected.name } : null);
      onClose();
    } catch (cause) {
      setError(`Could not open on canvas: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div class="posts-overlay" onClick={onClose}>
      <div class="posts-dialog" role="dialog" aria-modal="true" aria-label="Posts" onClick={(event) => event.stopPropagation()}>
        <div class="posts-header">
          <div><h2>Posts</h2><p>View generated thumbnails and open their editable projects or JSON jobs.</p></div>
          <button class="posts-close" onClick={onClose} aria-label="Close posts">×</button>
        </div>
        <div class="posts-content">
          <div class="posts-list">
            {posts.map(post => (
              <button key={post.key} class={`posts-card ${selected?.key === post.key ? 'posts-card-selected' : ''}`} onClick={() => selectPost(post)}>
                <div class="posts-thumb">{post.thumbnail ? <img src={post.thumbnail} alt={`${post.name} thumbnail`} /> : <span>No thumbnail</span>}</div>
                <span>{post.name}{post.saved ? ' · Saved' : ''}</span>
              </button>
            ))}
            {posts.length === 0 && <p class="posts-empty">No posts saved yet.</p>}
          </div>
          <div class="posts-json-panel">
            <div class="posts-json-heading">
              <h3>{selected?.name ?? 'Open a JSON job'}</h3>
              <button onClick={() => fileInput.current?.click()}>Open JSON file</button>
              <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                if (file) void openFile(file);
              }} />
            </div>
            <textarea aria-label="Post JSON" spellcheck={false} value={json} onInput={(event) => setJson((event.target as HTMLTextAreaElement).value)} placeholder="Open a JSON video job to inspect or edit it." />
            {error && <p class="posts-error" role="alert">{error}</p>}
            <div class="posts-footer">
              <span>Download JSON to the post folder to keep its relative image paths working.</span>
              <button class="posts-visual" disabled={!json || opening} onClick={() => void handleOpenVisual()}>{opening ? 'Opening…' : 'Open in Visual Editor'}</button>
              <button class="posts-download" disabled={!json} onClick={handleDownload}>Download JSON</button>
            </div>
          </div>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.posts-overlay { position: fixed; inset: 0; z-index: 1100; background: rgba(0,0,0,.68); display: flex; align-items: center; justify-content: center; padding: 24px; }
.posts-dialog { width: min(1080px, 100%); height: min(760px, 90vh); background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 24px 80px rgba(0,0,0,.55); display: flex; flex-direction: column; overflow: hidden; }
.posts-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
.posts-header h2 { margin: 0; color: var(--text-primary); font-size: 18px; }
.posts-header p { margin: 5px 0 0; color: var(--text-secondary); font-size: 12px; }
.posts-close { color: var(--text-secondary); background: var(--bg-elevated); border-radius: var(--radius-sm); width: 30px; height: 30px; font-size: 20px; }
.posts-content { display: grid; grid-template-columns: 230px minmax(0,1fr); min-height: 0; flex: 1; }
.posts-list { padding: 18px; border-right: 1px solid var(--border); overflow: auto; }
.posts-card { display: block; width: 100%; text-align: left; background: var(--bg-elevated); color: var(--text-primary); padding: 9px; border: 1px solid transparent; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 12px; }
.posts-card-selected { border-color: var(--accent); }
.posts-thumb { height: 170px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; display: flex; align-items: center; justify-content: center; color: var(--text-muted); margin-bottom: 8px; }
.posts-thumb img { height: 100%; max-width: 100%; object-fit: contain; }
.posts-empty { color: var(--text-secondary); font-size: 12px; }
.posts-json-panel { min-width: 0; min-height: 0; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.posts-json-heading { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.posts-json-heading h3 { margin: 0; color: var(--text-primary); font-size: 14px; flex: 1; }
.posts-json-heading button, .posts-download, .posts-visual { background: var(--bg-elevated); color: var(--text-primary); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 12px; }
.posts-json-panel textarea { flex: 1; min-height: 0; width: 100%; resize: none; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
.posts-json-panel textarea:focus { outline: 1px solid var(--accent); }
.posts-error { margin: 0; color: #ff8b8b; font-size: 12px; }
.posts-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--text-secondary); font-size: 11px; }
.posts-download, .posts-visual { white-space: nowrap; }
.posts-visual { background: var(--accent); color: white; }
.posts-download:disabled { opacity: .4; }
.posts-visual:disabled { opacity: .4; }
@media (max-width: 700px) { .posts-content { grid-template-columns: 150px minmax(0,1fr); } .posts-header { padding: 14px; } .posts-list, .posts-json-panel { padding: 10px; } .posts-thumb { height: 110px; } }
`;
