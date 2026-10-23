import { signal } from '@preact/signals';
import { project, selectedLayerId, selectedLayerIds, isPlaying } from './state.ts';
import { duplicateProjectLayer } from './duplicateLayer.ts';
import type { Project } from './schema.ts';

export interface Command {
  readonly label: string;
  execute(): void;
  undo(): void;
}

const MAX_HISTORY = 100;

const undoStack: Command[] = [];
const redoStack: Command[] = [];

export const canUndo = signal(false);
export const canRedo = signal(false);
export const lastCommandLabel = signal('');

function updateSignals() {
  canUndo.value = undoStack.length > 0;
  canRedo.value = redoStack.length > 0;
  lastCommandLabel.value = undoStack.length > 0 ? undoStack[undoStack.length - 1].label : '';
}

export function executeCommand(cmd: Command) {
  cmd.execute();
  undoStack.push(cmd);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  updateSignals();
}

export function undo() {
  const cmd = undoStack.pop();
  if (!cmd) return;
  cmd.undo();
  redoStack.push(cmd);
  updateSignals();
}

export function redo() {
  const cmd = redoStack.pop();
  if (!cmd) return;
  cmd.execute();
  undoStack.push(cmd);
  updateSignals();
}

export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  updateSignals();
}

export function projectCommand(label: string, updater: (p: Project) => Project): Command {
  let prevState: Project;
  let nextState: Project;
  return {
    label,
    execute() {
      prevState = project.value;
      nextState = updater(prevState);
      project.value = nextState;
    },
    undo() {
      project.value = prevState;
    },
  };
}

export function batchCommand(label: string, commands: Command[]): Command {
  return {
    label,
    execute() {
      for (const cmd of commands) cmd.execute();
    },
    undo() {
      for (let i = commands.length - 1; i >= 0; i--) commands[i].undo();
    },
  };
}

export function duplicateLayer(layerId: string): void {
  const before = project.value;
  const result = duplicateProjectLayer(before, layerId);
  if (!result.duplicateId) return;
  const previousSelection = selectedLayerId.value;
  const previousMultiSelection = [...selectedLayerIds.value];
  isPlaying.value = false;
  executeCommand({
    label: 'Duplicate layer',
    execute() {
      project.value = result.project;
      selectedLayerIds.value = [];
      selectedLayerId.value = result.duplicateId;
    },
    undo() {
      project.value = before;
      selectedLayerId.value = previousSelection;
      selectedLayerIds.value = previousMultiSelection;
    },
  });
}

export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const isMeta = e.metaKey || e.ctrlKey;
    const editing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
    if (isMeta && !e.altKey && !editing && e.key.toLowerCase() === 'd' && selectedLayerId.value) {
      e.preventDefault();
      duplicateLayer(selectedLayerId.value);
      return;
    }
    if (isMeta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (isMeta && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
    } else if (isMeta && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  });
}
