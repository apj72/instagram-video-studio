import { signal } from '@preact/signals';
import type { Project } from './schema.ts';

const DB_NAME = 'version1-studio';
const DB_VERSION = 2;
const PROJECTS_STORE = 'projects';
const ASSETS_STORE = 'assets';
const LIBRARY_STORE = 'library';
const AUTOSAVE_KEY = '__autosave__';

export const savedProjects = signal<ProjectListEntry[]>([]);
export const isSaving = signal(false);

export interface ProjectListEntry {
  id: string;
  name: string;
  modifiedAt: string;
}

interface StoredProject {
  id: string;
  data: Project;
  modifiedAt: string;
}

interface StoredAsset {
  id: string;
  projectId: string;
  blob: Blob;
  mimeType: string;
  name: string;
}

export type LibraryKind = 'post' | 'template';
export interface LibraryItem {
  id: string;
  kind: LibraryKind;
  name: string;
  project: Project;
  thumbnail?: string;
  assets: { id: string; blob: Blob; mimeType: string }[];
  audio?: { blob: Blob; mimeType: string; name: string };
  modifiedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        const store = db.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(LIBRARY_STORE)) {
        db.createObjectStore(LIBRARY_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLibraryItem(item: LibraryItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = tx(db, LIBRARY_STORE, 'readwrite');
    t.objectStore(LIBRARY_STORE).put(item);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function listLibraryItems(kind: LibraryKind): Promise<LibraryItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = tx(db, LIBRARY_STORE, 'readonly');
    const req = t.objectStore(LIBRARY_STORE).getAll();
    req.onsuccess = () => resolve((req.result as LibraryItem[])
      .filter(item => item.kind === kind)
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)));
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, stores: string | string[], mode: IDBTransactionMode): IDBTransaction {
  return db.transaction(stores, mode);
}

export async function saveProject(id: string, project: Project): Promise<void> {
  isSaving.value = true;
  try {
    const db = await openDb();
    const stored: StoredProject = {
      id,
      data: {
        ...project,
        metadata: { ...project.metadata, modifiedAt: new Date().toISOString() },
      },
      modifiedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const t = tx(db, PROJECTS_STORE, 'readwrite');
      t.objectStore(PROJECTS_STORE).put(stored);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    await refreshProjectList();
  } finally {
    isSaving.value = false;
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = tx(db, PROJECTS_STORE, 'readonly');
    const req = t.objectStore(PROJECTS_STORE).get(id);
    req.onsuccess = () => {
      const stored = req.result as StoredProject | undefined;
      resolve(stored?.data ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = tx(db, [PROJECTS_STORE, ASSETS_STORE], 'readwrite');
    t.objectStore(PROJECTS_STORE).delete(id);
    const assetStore = t.objectStore(ASSETS_STORE);
    const idx = assetStore.index('projectId');
    const cursor = idx.openCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) { c.delete(); c.continue(); }
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  await refreshProjectList();
}

export async function listProjects(): Promise<ProjectListEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = tx(db, PROJECTS_STORE, 'readonly');
    const req = t.objectStore(PROJECTS_STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredProject[])
        .filter(p => p.id !== AUTOSAVE_KEY)
        .map(p => ({ id: p.id, name: p.data.metadata.name, modifiedAt: p.modifiedAt }))
        .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

async function refreshProjectList() {
  savedProjects.value = await listProjects();
}

export async function autosave(project: Project): Promise<void> {
  await saveProject(AUTOSAVE_KEY, project);
}

export async function loadAutosave(): Promise<Project | null> {
  return loadProject(AUTOSAVE_KEY);
}

export async function saveAsset(projectId: string, assetId: string, blob: Blob, mimeType: string, name: string): Promise<void> {
  const db = await openDb();
  const stored: StoredAsset = { id: assetId, projectId, blob, mimeType, name };
  await new Promise<void>((resolve, reject) => {
    const t = tx(db, ASSETS_STORE, 'readwrite');
    t.objectStore(ASSETS_STORE).put(stored);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function loadAsset(assetId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = tx(db, ASSETS_STORE, 'readonly');
    const req = t.objectStore(ASSETS_STORE).get(assetId);
    req.onsuccess = () => {
      const stored = req.result as StoredAsset | undefined;
      resolve(stored?.blob ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

let autosaveInterval: ReturnType<typeof setInterval> | null = null;

export function startAutosave(getProject: () => Project, intervalMs: number = 30000) {
  stopAutosave();
  autosaveInterval = setInterval(() => {
    autosave(getProject());
  }, intervalMs);
}

export function stopAutosave() {
  if (autosaveInterval !== null) {
    clearInterval(autosaveInterval);
    autosaveInterval = null;
  }
}

refreshProjectList();
