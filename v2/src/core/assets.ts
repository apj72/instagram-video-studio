import { signal } from '@preact/signals';

const store = new Map<string, HTMLImageElement | HTMLVideoElement>();

export const assetVersion = signal(0);

export function getAssetMap(): Map<string, HTMLImageElement | HTMLVideoElement> {
  return store;
}

export function getAsset(id: string): HTMLImageElement | HTMLVideoElement | undefined {
  return store.get(id);
}

export function registerAsset(id: string, element: HTMLImageElement | HTMLVideoElement): void {
  store.set(id, element);
  assetVersion.value++;
}

export function removeAsset(id: string): void {
  const el = store.get(id);
  if (el instanceof HTMLVideoElement) {
    el.pause();
    el.src = '';
    el.load();
  }
  if (el) {
    const src = (el as HTMLImageElement).src;
    if (src?.startsWith('blob:')) URL.revokeObjectURL(src);
  }
  store.delete(id);
  assetVersion.value++;
}

export function loadImageAsset(id: string, file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      registerAsset(id, img);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

export function loadVideoAsset(id: string, file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onloadeddata = () => {
      registerAsset(id, video);
      video.play().catch(() => {});
      resolve(video);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load video: ${file.name}`));
    };
    video.src = url;
  });
}
