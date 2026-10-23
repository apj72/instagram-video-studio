import { loadMediaFolder } from './persistence.ts';

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
};

export function canPickMediaFolders(): boolean {
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

export async function pickMediaFolder(mode: 'read' | 'readwrite'): Promise<FileSystemDirectoryHandle> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error('Folder selection requires a browser with local folder access, such as Chrome or Edge.');
  return picker({ mode, id: mode === 'read' ? 'media-source' : 'media-destination' });
}

export async function requestDirectoryPermission(handle: FileSystemDirectoryHandle, mode: 'read' | 'readwrite'): Promise<boolean> {
  const permissionHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  };
  const descriptor = { mode };
  let permission = await permissionHandle.queryPermission?.(descriptor);
  if (permission !== 'granted') permission = await permissionHandle.requestPermission?.(descriptor);
  return permission === 'granted';
}

export async function saveExportToConfiguredFolder(blob: Blob, filename: string): Promise<boolean> {
  const folder = await loadMediaFolder('destination');
  if (!folder) return false;
  if (!await requestDirectoryPermission(folder, 'readwrite')) {
    throw new Error('Permission to save in the selected destination folder was not granted. Choose another folder in Project settings.');
  }
  const file = await folder.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
  return true;
}
