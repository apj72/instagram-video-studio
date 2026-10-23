import type { Project } from '../core/schema.ts';

type Media = HTMLImageElement | HTMLVideoElement;

/** Export owns its decoders: the live preview must never seek the video being encoded. */
export async function createExportVideoAssets(project: Project, assets: Map<string, Media>, signal?: AbortSignal) {
  const isolatedAssets = new Map(assets);
  const videos: HTMLVideoElement[] = [];
  const isolatedProject: Project = { ...project, layers: project.layers.map(layer => ({ ...layer })) };
  const dispose = () => {
    for (const video of videos) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  };
  try {
    await Promise.all(isolatedProject.layers.map(async layer => {
      if (layer.type !== 'video' || !layer.visible || layer.inTime >= project.settings.duration || layer.outTime < 0) return;
      const source = layer.assetId ? assets.get(layer.assetId) : undefined;
      if (!(source instanceof HTMLVideoElement) || !(source.currentSrc || source.src)) {
        throw new Error(`Video for “${layer.name}” is not loaded. Choose the video again before exporting.`);
      }
      const video = document.createElement('video');
      videos.push(video);
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      if (source.crossOrigin !== null) video.crossOrigin = source.crossOrigin;
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          video.removeEventListener('loadeddata', ready);
          video.removeEventListener('error', failed);
          signal?.removeEventListener('abort', aborted);
        };
        const ready = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(new Error(`Could not load “${layer.name}” for export.`)); };
        const aborted = () => { cleanup(); reject(new DOMException('Export cancelled', 'AbortError')); };
        const timer = setTimeout(failed, 15000);
        video.addEventListener('loadeddata', ready);
        video.addEventListener('error', failed);
        signal?.addEventListener('abort', aborted, { once: true });
        if (signal?.aborted) { aborted(); return; }
        video.src = source.currentSrc || source.src;
        video.load();
      });
      // Each layer also needs its own decoder when duplicates share a media asset but have different timings.
      let id = `export-video:${layer.id}`;
      while (isolatedAssets.has(id)) id += ':copy';
      isolatedAssets.set(id, video);
      layer.assetId = id;
    }));
    return { project: isolatedProject, assets: isolatedAssets, dispose };
  } catch (cause) {
    dispose();
    throw cause;
  }
}
