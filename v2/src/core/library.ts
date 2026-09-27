import type { Project } from './schema.ts';
import { getAssetMap, loadImageAsset, loadVideoAsset } from './assets.ts';
import { saveLibraryItem, type LibraryItem, type LibraryKind } from './persistence.ts';
import { getAudioFile, loadAudioFile } from '../audio/analyser.ts';

export function bundledLibraryId(kind: LibraryKind, key: string): string {
  return `${kind}:bundled:${key}`;
}

function mediaIds(project: Project): string[] {
  return [...new Set(project.layers
    .filter(layer => layer.type === 'image' || layer.type === 'video' || layer.type === 'background-logo')
    .map(layer => layer.assetId)
    .filter((id): id is string => !!id))];
}

/** Include uploaded and bundled layer media in the saved snapshot. */
export async function saveEditorLibraryItem(input: Omit<LibraryItem, 'assets' | 'audio' | 'modifiedAt'>): Promise<LibraryItem> {
  const assets = await Promise.all(mediaIds(input.project).map(async id => {
    const element = getAssetMap().get(id);
    if (!element) throw new Error(`Media for layer asset ${id} is not loaded yet.`);
    const response = await fetch(element.src);
    if (!response.ok) throw new Error(`Could not save media for asset ${id}.`);
    const blob = await response.blob();
    return { id, blob, mimeType: blob.type || (element instanceof HTMLVideoElement ? 'video/mp4' : 'image/png') };
  }));
  const audioFile = getAudioFile();
  const audio = input.project.audio.assetId && audioFile
    ? { blob: audioFile as Blob, mimeType: audioFile.type, name: audioFile.name }
    : undefined;
  const item: LibraryItem = { ...input, assets, audio, modifiedAt: new Date().toISOString() };
  await saveLibraryItem(item);
  return item;
}

export async function openLibraryItem(item: LibraryItem): Promise<Project> {
  for (const asset of item.assets ?? []) {
    const file = new File([asset.blob], asset.id, { type: asset.mimeType });
    if (asset.mimeType.startsWith('video/')) await loadVideoAsset(asset.id, file);
    else await loadImageAsset(asset.id, file);
  }
  if (item.audio) await loadAudioFile(new File([item.audio.blob], item.audio.name, { type: item.audio.mimeType }), item.project.audio.assetId);
  return structuredClone(item.project);
}
