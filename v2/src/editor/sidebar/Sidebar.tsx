import { useEffect, useState } from 'preact/hooks';
import { duplicateLayer } from '../../core/commands.ts';
import { SliderNumberControl } from './SliderNumberControl.tsx';
import { project, selectedLayerId, selectedLayerIds, selectedLayer, updateLayer, removeLayer, reorderLayers, isPlaying, groupSelectedLayers, ungroupLayer } from '../../core/state.ts';
import type { Layer, ImageLayer, TextLayer, EffectLayer, ShapeLayer, VideoLayer, BackgroundLogoLayer, GroupLayer } from '../../core/schema.ts';
import { getGroupForLayer } from '../../core/groups.ts';
import { evaluateProperty } from '../../timeline/interpolation.ts';
import { currentTime, autoKeyframe } from '../../core/state.ts';
import { AudioPanel } from './AudioPanel.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { AddLayerPanel } from './AddLayerPanel.tsx';
import { MotionPanel } from './MotionPanel.tsx';
import { PresetPanel } from './PresetPanel.tsx';
import { loadImageAsset, loadVideoAsset } from '../../core/assets.ts';
import { getFirstVisibleTime } from '../../timeline/events.ts';
import { DEFAULT_LASER_COLORS, DEFAULT_LASER_SPEED, DEFAULT_LASER_SWEEP, getDefaultLaserAngle, getLaserOrigin, setLaserOrigin } from '../../render/laserMotion.ts';

const LAYER_TYPE_ICONS: Record<string, string> = {
  'image': 'IMG',
  'text': 'TXT',
  'video': 'VID',
  'shape': 'SHP',
  'effect': 'FX',
  'background-logo': 'BG',
  'group': 'GRP',
};

const FONT_FAMILIES = [
  'Bungee',
  'Permanent Marker',
  'Space Mono',
  '"Bungee", sans-serif',
  '"Permanent Marker", cursive',
  '"Space Mono", monospace',
  '"Arial Black", sans-serif',
  '"Impact", sans-serif',
  '"Bebas Neue", sans-serif',
  '"Oswald", sans-serif',
  '"Montserrat", sans-serif',
  '"Roboto Condensed", sans-serif',
];

const CLOCK_DIRECTIONS: Record<number, string> = {
  12: '12 (Up)',
  1: '1',
  2: '2',
  3: '3 (Right)',
  4: '4',
  5: '5',
  6: '6 (Down)',
  7: '7',
  8: '8',
  9: '9 (Left)',
  10: '10',
  11: '11',
};

export function Sidebar({ onSeek }: { onSeek: (timeMs: number) => void }) {
  const layers = project.value.layers;
  const [open, setOpen] = useState<Record<string, boolean>>({ layers: true });
  const toggle = (key: string) => setOpen(previous => ({ ...previous, [key]: !previous[key] }));

  return (
    <aside class="sidebar" aria-label="Layers and tools">
      <div class="sidebar-tools">
        <Rollup title="Add layers" open={Boolean(open.add)} onToggle={() => toggle('add')}><AddLayerPanel /></Rollup>
        <Rollup title="Project" open={Boolean(open.project)} onToggle={() => toggle('project')}><SettingsPanel /></Rollup>
        <Rollup title="Audio" open={Boolean(open.audio)} onToggle={() => toggle('audio')}><AudioPanel onSeek={onSeek} /></Rollup>
        <Rollup title="Presets" open={Boolean(open.presets)} onToggle={() => toggle('presets')}><PresetPanel /></Rollup>
        <Rollup title="Motion presets" open={Boolean(open.motion)} onToggle={() => toggle('motion')}><MotionPanel /></Rollup>
      </div>
      <div class="sidebar-layer-section">
        <button class="rollup-header" aria-expanded={Boolean(open.layers)} onClick={() => toggle('layers')}>
          <span><span class="rollup-chevron">{open.layers ? '▾' : '▸'}</span> Layers</span>
          <span class="sidebar-count">{layers.length}</span>
        </button>
        {open.layers && <div class="layer-list">
          <div class="layer-selection-toolbar">
            <span>{selectedLayerIds.value.length ? `${selectedLayerIds.value.length} selected` : 'Select layers to group'}</span>
            <button type="button" disabled={selectedLayerIds.value.length < 2} onClick={() => groupSelectedLayers()}>Group</button>
          </div>
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              class={`layer-item ${selectedLayerId.value === layer.id || selectedLayerIds.value.includes(layer.id) ? 'layer-item-selected' : ''} ${layer.visible ? '' : 'layer-item-hidden'} ${getGroupForLayer(layers, layer.id) ? 'layer-item-member' : ''}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                  if (layer.type !== 'group' && !getGroupForLayer(layers, layer.id)) {
                    selectedLayerIds.value = selectedLayerIds.value.includes(layer.id)
                      ? selectedLayerIds.value.filter(id => id !== layer.id)
                      : [...selectedLayerIds.value, layer.id];
                  }
                  return;
                }
                isPlaying.value = false;
                selectedLayerIds.value = [];
                selectedLayerId.value = layer.id;
                const firstVisible = getFirstVisibleTime(layer, project.value.settings.duration);
                onSeek(layer.type === 'group' && layer.entrance && layer.entrance.direction !== 'none'
                  ? Math.min(project.value.settings.duration, Math.max(firstVisible, layer.entrance.startTime + Math.min(100, layer.entrance.duration * 0.2)))
                  : firstVisible);
              }}
            >
              <input type="checkbox" class="layer-multi-check" aria-label={`Select ${layer.name} for group`}
                checked={selectedLayerIds.value.includes(layer.id)} disabled={layer.type === 'group' || Boolean(getGroupForLayer(layers, layer.id))}
                onClick={(e) => e.stopPropagation()}
                onChange={() => {
                  selectedLayerIds.value = selectedLayerIds.value.includes(layer.id)
                    ? selectedLayerIds.value.filter(id => id !== layer.id)
                    : [...selectedLayerIds.value, layer.id];
                }} />
              <span class="layer-type-badge">{LAYER_TYPE_ICONS[layer.type] ?? '?'}</span>
              <span class="layer-name">{layer.name}</span>
              {layer.type === 'group' && <span class="layer-group-count">{layer.children.length}</span>}
              <button
                type="button"
                class={`layer-visibility-btn ${layer.visible ? '' : 'layer-visibility-off'}`}
                title={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                aria-pressed={layer.visible}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, l => ({ ...l, visible: !l.visible }));
                }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  {layer.visible ? <>
                    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </> : <>
                    <path d="M3 3 21 21M10.6 6.1A11.7 11.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.2 6.7C3.5 8.5 2 12 2 12s3.6 6 10 6c1.5 0 2.9-.3 4.1-.9" />
                    <path d="M10 10a3 3 0 0 0 4 4" />
                  </>}
                </svg>
              </button>
              <div class="layer-actions">
                <button type="button" class="layer-action-btn" title={`Duplicate ${layer.name} (Cmd/Ctrl+D)`}
                  aria-label={`Duplicate ${layer.name}`} onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M15 8V4H4v11h4" />
                  </svg>
                </button>
                <button
                  class="layer-action-btn"
                  title={layer.locked ? 'Unlock' : 'Lock'}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, l => ({ ...l, locked: !l.locked }));
                  }}
                >
                  {layer.locked ? 'L' : 'U'}
                </button>
                {index > 0 && (
                  <button
                    class="layer-action-btn"
                    title="Move up"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderLayers(index, index - 1);
                    }}
                  >^</button>
                )}
                {index < layers.length - 1 && (
                  <button
                    class="layer-action-btn"
                    title="Move down"
                    onClick={(e) => {
                      e.stopPropagation();
                      reorderLayers(index, index + 1);
                    }}
                  >v</button>
                )}
              </div>
            </div>
          ))}
          {layers.length === 0 && (
            <div class="layer-list-empty">No layers. Use Templates, Import V1, or Add Layer above.</div>
          )}
        </div>}
      </div>
      <style>{sidebarStyles}</style>
    </aside>
  );
}

function Rollup({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: any }) {
  return (
    <section class="rollup-section">
      <button class="rollup-header" aria-expanded={open} onClick={onToggle}>
        <span><span class="rollup-chevron">{open ? '▾' : '▸'}</span> {title}</span>
      </button>
      {open && <div class="rollup-content">{children}</div>}
    </section>
  );
}

export function Inspector() {
  const selected = selectedLayer.value;
  return (
    <aside class="inspector" aria-label="Properties">
      <div class="inspector-header">
        <strong>Properties</strong>
        {selected && <span title={selected.name}>{selected.name}</span>}
      </div>
      {selected ? (
        <div class="inspector-scroll" key={selected.id}>
          {selected.type === 'effect' && (
            <div class="inspector-note">Full-frame effect. Adjust its settings here; it has no draggable canvas box.</div>
          )}
          <details class="inspector-group" open>
            <summary>{selected.type === 'effect' ? 'Layer and timing' : 'Timing and transform'}</summary>
            <div class="property-panel">
            <CommonProperties layer={selected} />
            </div>
          </details>

          <details class="inspector-group" open>
            <summary>{selected.type === 'text' ? 'Text and style' : `${selected.type} settings`}</summary>
            <div class="property-panel">
            {selected.type === 'image' && <ImageProperties layer={selected} />}
            {selected.type === 'text' && <TextProperties layer={selected} />}
            {selected.type === 'effect' && <EffectProperties layer={selected} />}
            {selected.type === 'shape' && <ShapeProperties layer={selected} />}
            {selected.type === 'video' && <VideoProperties layer={selected} />}
            {selected.type === 'background-logo' && <BgLogoProperties layer={selected} />}
            {selected.type === 'group' && <GroupProperties layer={selected} />}
            </div>
          </details>

          <div class="property-panel">
            <button type="button" class="prop-upload-btn duplicate-layer-btn"
              title="Duplicate with all settings and animation (Cmd/Ctrl+D)"
              onClick={() => duplicateLayer(selected.id)}>{selected.type === 'group' ? 'Duplicate group and layers' : 'Duplicate layer'}</button>
            <div class="property-danger-zone">
              <button
                class="danger-btn"
                onClick={() => selected.type === 'group' ? ungroupLayer(selected.id) : removeLayer(selected.id)}
              >
                {selected.type === 'group' ? 'Ungroup (keep layers)' : 'Delete Layer'}
              </button>
            </div>
          </div>
        </div>
      ) : <div class="inspector-empty">Select a layer to edit its settings. Effects are selected from the Layers list.</div>}
    </aside>
  );
}

function PropertyRow({ label, children, tooltip }: { label: string; children: any; tooltip?: string }) {
  return (
    <div class="prop-row" title={tooltip}>
      <label class="prop-label">{label}</label>
      <div class="prop-control">{children}</div>
    </div>
  );
}

function PropSubheading({ label }: { label: string }) {
  return <div class="prop-subheading">{label}</div>;
}

function LaserNumberInput({ value, min, max, label, onCommit }: { value: number; min: number; max: number; label: string; onCommit: (number: number) => void }) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  useEffect(() => setDraft(String(Math.round(value))), [value]);

  const commit = (raw: string) => {
    const number = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(number)) {
      setDraft(String(Math.round(value)));
      return;
    }
    const next = Math.max(min, Math.min(max, Math.round(number)));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return <input type="number" min={min} max={max} step="1" value={draft} aria-label={label}
    onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
    onBlur={(e) => commit((e.target as HTMLInputElement).value)}
    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
}

interface PropertyEdit {
  /** How an animated property absorbs the edit: shift the curve, or scale it about zero. */
  mode?: 'offset' | 'ratio';
  min?: number;
  max?: number;
}

/**
 * Writes a property value for the playhead.
 *
 * With Auto-Key on this keyframes at the playhead. With it off, a property that is already
 * animated has its whole curve moved, so the value shown becomes the value asked for and the
 * animation keeps its shape. Writing only the first keyframe made these controls look dead on
 * any layer with a keyframed entrance — the Version1 logo's scale runs 0.04 → 0.88 → 0.52, so
 * dragging Scale only changed the invisible first frame.
 */
function setPropertyValue(_layer: Layer, id: string, path: string[], value: number, edit: PropertyEdit = {}) {
  const { mode = 'offset', min = -Infinity, max = Infinity } = edit;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const time = autoKeyframe.value ? currentTime.value : 0;
  updateLayer(id, l => {
    let obj = l as any;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    const prop = obj[path[path.length - 1]];
    let kfs = [...prop.keyframes];

    if (autoKeyframe.value) {
      const existingIdx = kfs.findIndex((k: any) => k.time === time);
      if (existingIdx >= 0) {
        kfs[existingIdx] = { ...kfs[existingIdx], value: clamp(value) };
      } else {
        kfs.push({ time, value: clamp(value), easing: 'ease-out' as const });
        kfs.sort((a: any, b: any) => a.time - b.time);
      }
    } else if (kfs.length > 1) {
      const current = evaluateProperty(prop, currentTime.value);
      // Scaling about zero is meaningless when the current value is zero, so shift instead.
      const ratio = mode === 'ratio' && current !== 0 ? value / current : null;
      const delta = value - current;
      kfs = kfs.map((k: any) => ({ ...k, value: clamp(ratio === null ? k.value + delta : k.value * ratio) }));
    } else if (kfs.length === 1) {
      kfs[0] = { ...kfs[0], value: clamp(value) };
    } else {
      kfs.push({ time: 0, value: clamp(value), easing: 'linear' });
    }

    const newProp = { keyframes: kfs };
    const result = { ...l } as any;
    let target = result;
    for (let i = 0; i < path.length - 1; i++) {
      target[path[i]] = { ...target[path[i]] };
      target = target[path[i]];
    }
    target[path[path.length - 1]] = newProp;
    return result as Layer;
  });
}

function CommonProperties({ layer }: { layer: Layer }) {
  const t = currentTime.value;
  const opacity = evaluateProperty(layer.opacity, t);
  const posX = evaluateProperty(layer.position.x, t);
  const posY = evaluateProperty(layer.position.y, t);
  const scX = evaluateProperty(layer.scale.x, t);
  const rot = evaluateProperty(layer.rotation, t);

  return (
    <>
      <PropertyRow label="Name" tooltip="Display name for this layer">
        <input
          type="text"
          value={layer.name}
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, name: (e.target as HTMLInputElement).value }))}
        />
      </PropertyRow>
      <PropertyRow label="Type" tooltip="Layer type (read-only)">
        <span class="prop-value-readonly">{layer.type}</span>
      </PropertyRow>
      <PropertyRow label="Visible" tooltip="Toggle layer visibility on canvas">
        <input
          type="checkbox"
          checked={layer.visible}
          onChange={() => updateLayer(layer.id, l => ({ ...l, visible: !l.visible }))}
        />
      </PropertyRow>
      <PropertyRow label="Locked" tooltip="Lock layer to prevent accidental edits">
        <input
          type="checkbox"
          checked={layer.locked}
          onChange={() => updateLayer(layer.id, l => ({ ...l, locked: !l.locked }))}
        />
      </PropertyRow>
      <PropertyRow label="Blend" tooltip="Compositing blend mode for this layer">
        <select
          value={layer.blendMode}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, blendMode: (e.target as HTMLSelectElement).value }))}
        >
          <option value="source-over">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="lighten">Lighten</option>
          <option value="darken">Darken</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Opacity" tooltip="Layer transparency: 0% is invisible, 100% is fully opaque.">
        <SliderNumberControl label="Opacity" displayScale={100} unit="%" min="0" max="1" step="0.01" value={opacity}
          onValueChange={(value) => setPropertyValue(layer, layer.id, ['opacity'], value, { min: 0, max: 1 })} />
      </PropertyRow>
      {layer.type !== 'effect' && <>
      <PropertyRow label="Pos Y" tooltip="Vertical position of the element’s anchor: 0% is the top, 50% is the middle, 100% is the bottom.">
        <SliderNumberControl label="Pos Y" displayScale={100} unit="%" fineStep={100 / project.value.settings.height} fineLabel="1 px" hint="0 = top · 50 = middle · 100 = bottom" min="0" max="1" step="0.01" value={posY}
          onValueChange={(value) => setPropertyValue(layer, layer.id, ['position', 'y'], value)} />
      </PropertyRow>
      <PropertyRow label="Pos X" tooltip="Horizontal position of the element’s anchor: 0% is the left edge, 50% is the centre, 100% is the right edge.">
        <SliderNumberControl label="Pos X" displayScale={100} unit="%" fineStep={100 / project.value.settings.width} fineLabel="1 px" hint="0 = left · 50 = centre · 100 = right" min="0" max="1" step="0.01" value={posX}
          onValueChange={(value) => setPropertyValue(layer, layer.id, ['position', 'x'], value)} />
      </PropertyRow>
      <PropertyRow label="Scale" tooltip="Element size as a percentage: 100% is its base size, 50% is half size.">
        <SliderNumberControl label="Scale" displayScale={100} unit="%" min="0" max="3" step="0.01" value={scX}
          onValueChange={(value) => {
            const v = value;
            setPropertyValue(layer, layer.id, ['scale', 'x'], v, { mode: 'ratio', min: 0 });
            setPropertyValue(layer, layer.id, ['scale', 'y'], v, { mode: 'ratio', min: 0 });
          }} />
      </PropertyRow>
      <PropertyRow label="Rotation" tooltip="Rotation in degrees: 0° is upright; 90° is a quarter turn. Animatable with keyframes.">
        <SliderNumberControl label="Rotation" displayScale={360} unit="°" fineStep={0.1} min="-1" max="1" step="0.01" value={rot}
          onValueChange={(value) => setPropertyValue(layer, layer.id, ['rotation'], value)} />
      </PropertyRow>
      </>}
      <PropertyRow label="In Time" tooltip="Time when this layer becomes visible (milliseconds)">
        <input type="number" min="0" step="100" value={layer.inTime}
          class="prop-num-input"
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, inTime: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <span class="prop-unit">ms</span>
      </PropertyRow>
      <PropertyRow label="Out Time" tooltip="Time when this layer disappears (milliseconds)">
        <input type="number" min="0" step="100" value={layer.outTime}
          class="prop-num-input"
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, outTime: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <span class="prop-unit">ms</span>
      </PropertyRow>
    </>
  );
}

function GroupProperties({ layer }: { layer: GroupLayer }) {
  const entrance = layer.entrance ?? { direction: 'none' as const, startTime: 0, duration: 600, stagger: 180, alternate: false };
  const setEntrance = (change: Partial<typeof entrance>) => updateLayer(layer.id, current => ({
    ...current, entrance: { ...entrance, ...change },
  } as GroupLayer));
  const memberNames = layer.children.map(id => project.value.layers.find(child => child.id === id)?.name).filter(Boolean);
  return <>
    <div class="inspector-note">Move, scale, rotate, fade, and time these {layer.children.length} layers together. Drag a member on the canvas while this group is selected to move the group.</div>
    <PropertyRow label="Members"><span class="prop-value-readonly">{memberNames.join(', ')}</span></PropertyRow>
    <PropSubheading label="Staggered slide in" />
    <PropertyRow label="Direction">
      <select aria-label="Group slide direction" value={entrance.direction}
        onChange={(e) => setEntrance({ direction: (e.target as HTMLSelectElement).value as typeof entrance.direction })}>
        <option value="none">None</option>
        <option value="left">From left</option>
        <option value="right">From right</option>
        <option value="top">From top</option>
        <option value="bottom">From bottom</option>
      </select>
    </PropertyRow>
    <PropertyRow label="Start" tooltip="When the first member starts entering">
      <input type="number" min="0" step="100" value={entrance.startTime} aria-label="Group entrance start time"
        onInput={(e) => setEntrance({ startTime: Math.max(0, Number((e.target as HTMLInputElement).value) || 0) })} />
      <span class="prop-unit">ms</span>
    </PropertyRow>
    <PropertyRow label="Slide time" tooltip="Time each member takes to reach its visible position">
      <input type="number" min="1" step="50" value={entrance.duration} aria-label="Group slide duration"
        onInput={(e) => setEntrance({ duration: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })} />
      <span class="prop-unit">ms</span>
    </PropertyRow>
    <PropertyRow label="Delay" tooltip="Time between successive members starting">
      <input type="number" min="0" step="50" value={entrance.stagger} aria-label="Group stagger delay"
        onInput={(e) => setEntrance({ stagger: Math.max(0, Number((e.target as HTMLInputElement).value) || 0) })} />
      <span class="prop-unit">ms</span>
    </PropertyRow>
    <PropertyRow label="Alternate" tooltip="Alternate the chosen direction with its opposite">
      <input type="checkbox" checked={entrance.alternate} aria-label="Alternate group slide direction"
        onChange={() => setEntrance({ alternate: !entrance.alternate })} />
    </PropertyRow>
  </>;
}

function ImageProperties({ layer }: { layer: ImageLayer }) {
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const assetId = `asset_${Date.now().toString(36)}`;
      const img = await loadImageAsset(assetId, file);
      updateLayer(layer.id, l => ({
        ...l,
        assetId,
        size: { width: img.naturalWidth, height: img.naturalHeight },
      }));
    };
    input.click();
  };

  return (
    <>
      <PropSubheading label="Image" />
      <PropertyRow label="Image" tooltip="Upload or replace the image file for this layer">
        <button class="prop-upload-btn" onClick={handleImageUpload}>
          {layer.assetId ? 'Change Image' : 'Upload Image'}
        </button>
      </PropertyRow>
      <PropSubheading label="Parallax" />
      <PropertyRow label="Enabled" tooltip="Enable slow cinematic vertical pan effect">
        <input type="checkbox" checked={layer.parallax}
          onChange={() => updateLayer(layer.id, l => ({ ...l, parallax: !(l as ImageLayer).parallax }) as Layer)} />
      </PropertyRow>
      {layer.parallax && (
        <>
          <PropertyRow label="Start Y" tooltip="Vertical start position for parallax drift (-1 = above frame)">
            <SliderNumberControl label="Start Y" displayScale={100} unit="%" min="-1" max="0" step="0.01" value={layer.parallaxStartY}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, parallaxStartY: value }) as Layer)} />
          </PropertyRow>
          <PropertyRow label="Duration" tooltip="Time for the parallax transition in/out (ms)">
            <input type="number" min="0" step="100" value={layer.parallaxDuration} class="prop-num-input"
              onInput={(e) => updateLayer(layer.id, l => ({ ...l, parallaxDuration: parseInt((e.target as HTMLInputElement).value) || 0 }) as Layer)} />
            <span class="prop-unit">ms</span>
          </PropertyRow>
        </>
      )}
    </>
  );
}

function TextProperties({ layer }: { layer: TextLayer }) {
  const t = currentTime.value;
  const fontSize = evaluateProperty(layer.fontSize, t);

  return (
    <>
      <PropSubheading label="Text" />
      <PropertyRow label="Text" tooltip="Text content. Use \\n for line breaks.">
        <textarea value={layer.text} rows={3}
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, text: (e.target as HTMLTextAreaElement).value }))} />
      </PropertyRow>
      <PropertyRow label="Font" tooltip="Font family. Google Fonts loaded automatically.">
        <select value={layer.fontFamily}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, fontFamily: (e.target as HTMLSelectElement).value }))}>
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>)}
        </select>
      </PropertyRow>
      <PropertyRow label="Weight" tooltip="Font weight / boldness">
        <select value={layer.fontWeight}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, fontWeight: (e.target as HTMLSelectElement).value }))}>
          <option value="400">Normal</option>
          <option value="bold">Bold</option>
          <option value="900">Black</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Size" tooltip="Font size in pixels. Animatable with keyframes.">
        <SliderNumberControl label="Font size" min={12} max={300} step={1} value={fontSize}
          onValueChange={(size) => setPropertyValue(layer, layer.id, ['fontSize'], size, { mode: 'ratio', min: 1 })} />
        <span class="prop-unit">px</span>
      </PropertyRow>
      <PropertyRow label="Color" tooltip="Text fill color">
        <input type="color" value={layer.textColor}
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, textColor: (e.target as HTMLInputElement).value }))} />
      </PropertyRow>
      <PropertyRow label="Align" tooltip="Horizontal text alignment">
        <select value={layer.textAlign}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, textAlign: (e.target as HTMLSelectElement).value as 'left' | 'center' | 'right' }))}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Line H" tooltip="Line height as a percentage of font size: 100% is tight, 150% is normal.">
        <SliderNumberControl label="Line H" displayScale={100} unit="%" min="0.8" max="3" step="0.1" value={layer.lineHeight}
          onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, lineHeight: value }))} />

      </PropertyRow>
      <PropertyRow label="Spacing" tooltip="Letter spacing in pixels (negative = tighter)">
        <SliderNumberControl label="Spacing" min="-5" max="20" step="0.5" value={layer.letterSpacing}
          onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, letterSpacing: value }))} />
      </PropertyRow>

      <PropSubheading label="Headline Effect" />
      <PropertyRow label="Style" tooltip="Brand outline or stacked orange and pink headline treatment">
        <select value={layer.headlineEffect?.mode ?? 'none'}
          onChange={(e) => {
            const mode = (e.target as HTMLSelectElement).value;
            updateLayer(layer.id, l => ({
              ...l,
              headlineEffect: mode === 'none' ? undefined : {
                mode: mode as 'outline' | 'stacked',
                outlineColor: '#000000', outlineWidth: 12, offset: 7,
                midColor: '#FF7A1A', backColor: '#FF2E93',
              },
            }));
          }}>
          <option value="none">None</option>
          <option value="outline">Black outline</option>
          <option value="stacked">Stacked orange + pink</option>
        </select>
      </PropertyRow>
      {layer.headlineEffect && (
        <>
          <PropertyRow label="Outline" tooltip="Headline outline colour">
            <input type="color" value={layer.headlineEffect.outlineColor}
              onInput={(e) => updateLayer(layer.id, l => ({ ...l, headlineEffect: { ...(l as TextLayer).headlineEffect!, outlineColor: (e.target as HTMLInputElement).value } }))} />
          </PropertyRow>
          <PropertyRow label="Stroke" tooltip="Headline outline width in pixels">
            <SliderNumberControl label="Stroke" min="0" max="24" step="1" value={layer.headlineEffect.outlineWidth}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, headlineEffect: { ...(l as TextLayer).headlineEffect!, outlineWidth: value } }))} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          {layer.headlineEffect.mode === 'stacked' && (
            <>
              <PropertyRow label="Offset" tooltip="Distance between stacked headline colours">
                <SliderNumberControl label="Offset" min="0" max="24" step="1" value={layer.headlineEffect.offset}
                  onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, headlineEffect: { ...(l as TextLayer).headlineEffect!, offset: value } }))} />
                <span class="prop-unit">px</span>
              </PropertyRow>
              <PropertyRow label="Middle">
                <input type="color" value={layer.headlineEffect.midColor}
                  onInput={(e) => updateLayer(layer.id, l => ({ ...l, headlineEffect: { ...(l as TextLayer).headlineEffect!, midColor: (e.target as HTMLInputElement).value } }))} />
              </PropertyRow>
              <PropertyRow label="Back">
                <input type="color" value={layer.headlineEffect.backColor}
                  onInput={(e) => updateLayer(layer.id, l => ({ ...l, headlineEffect: { ...(l as TextLayer).headlineEffect!, backColor: (e.target as HTMLInputElement).value } }))} />
              </PropertyRow>
            </>
          )}
        </>
      )}

      <PropSubheading label="Stroke" />
      <PropertyRow label="Enabled">
        <input type="checkbox" checked={layer.stroke.enabled}
          onChange={() => updateLayer(layer.id, l => ({ ...l, stroke: { ...(l as TextLayer).stroke, enabled: !(l as TextLayer).stroke.enabled } }))} />
      </PropertyRow>
      {layer.stroke.enabled && (
        <>
          <PropertyRow label="Color">
            <input type="color" value={layer.stroke.color}
              onInput={(e) => updateLayer(layer.id, l => ({ ...l, stroke: { ...(l as TextLayer).stroke, color: (e.target as HTMLInputElement).value } }))} />
          </PropertyRow>
          <PropertyRow label="Width">
            <SliderNumberControl label="Width" min="1" max="10" step="1" value={layer.stroke.width}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, stroke: { ...(l as TextLayer).stroke, width: value } }))} />
          </PropertyRow>
        </>
      )}

      <PropSubheading label="Shadow" />
      <PropertyRow label="Enabled">
        <input type="checkbox" checked={layer.shadow.enabled}
          onChange={() => updateLayer(layer.id, l => ({ ...l, shadow: { ...(l as TextLayer).shadow, enabled: !(l as TextLayer).shadow.enabled } }))} />
      </PropertyRow>
      {layer.shadow.enabled && (
        <>
          <PropertyRow label="Color">
            <input type="color" value={layer.shadow.color}
              onInput={(e) => updateLayer(layer.id, l => ({ ...l, shadow: { ...(l as TextLayer).shadow, color: (e.target as HTMLInputElement).value } }))} />
          </PropertyRow>
          <PropertyRow label="Blur">
            <SliderNumberControl label="Blur" min="0" max="30" step="1" value={layer.shadow.blur}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, shadow: { ...(l as TextLayer).shadow, blur: value } }))} />
          </PropertyRow>
          <PropertyRow label="Offset Y">
            <SliderNumberControl label="Offset Y" min="-10" max="10" step="1" value={layer.shadow.offsetY}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, shadow: { ...(l as TextLayer).shadow, offsetY: value } }))} />
          </PropertyRow>
        </>
      )}

      <PropSubheading label="Background" />
      <PropertyRow label="Enabled">
        <input type="checkbox" checked={layer.background.enabled}
          onChange={() => updateLayer(layer.id, l => ({ ...l, background: { ...(l as TextLayer).background, enabled: !(l as TextLayer).background.enabled } }))} />
      </PropertyRow>
      {layer.background.enabled && (
        <>
          <PropertyRow label="Color">
            <input type="color" value={layer.background.color}
              onInput={(e) => updateLayer(layer.id, l => ({ ...l, background: { ...(l as TextLayer).background, color: (e.target as HTMLInputElement).value } }))} />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <SliderNumberControl label="Opacity" displayScale={100} unit="%" min="0" max="1" step="0.05" value={layer.background.opacity}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, background: { ...(l as TextLayer).background, opacity: value } }))} />
          </PropertyRow>
          <PropertyRow label="Pad X">
            <SliderNumberControl label="Pad X" min="0" max="80" step="2" value={layer.background.paddingX}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, background: { ...(l as TextLayer).background, paddingX: value } }))} />
          </PropertyRow>
          <PropertyRow label="Pad Y">
            <SliderNumberControl label="Pad Y" min="0" max="40" step="2" value={layer.background.paddingY}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, background: { ...(l as TextLayer).background, paddingY: value } }))} />
          </PropertyRow>
          <PropertyRow label="Radius">
            <SliderNumberControl label="Radius" min="0" max="30" step="1" value={layer.background.cornerRadius}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, background: { ...(l as TextLayer).background, cornerRadius: value } }))} />
          </PropertyRow>
        </>
      )}

      <PropSubheading label="Border" />
      <PropertyRow label="Enabled">
        <input type="checkbox" checked={layer.border.enabled}
          onChange={() => updateLayer(layer.id, l => ({ ...l, border: { ...(l as TextLayer).border, enabled: !(l as TextLayer).border.enabled } }))} />
      </PropertyRow>
      {layer.border.enabled && (
        <>
          <PropertyRow label="Color">
            <input type="color" value={layer.border.color}
              onInput={(e) => updateLayer(layer.id, l => ({ ...l, border: { ...(l as TextLayer).border, color: (e.target as HTMLInputElement).value } }))} />
          </PropertyRow>
          <PropertyRow label="Width">
            <SliderNumberControl label="Width" min="1" max="10" step="1" value={layer.border.width}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, border: { ...(l as TextLayer).border, width: value } }))} />
          </PropertyRow>
          <PropertyRow label="Radius">
            <SliderNumberControl label="Radius" min="0" max="30" step="1" value={layer.border.cornerRadius}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, border: { ...(l as TextLayer).border, cornerRadius: value } }))} />
          </PropertyRow>
          <PropertyRow label="Pad X">
            <SliderNumberControl label="Pad X" min="0" max="80" step="2" value={layer.border.paddingX}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, border: { ...(l as TextLayer).border, paddingX: value } }))} />
          </PropertyRow>
          <PropertyRow label="Pad Y">
            <SliderNumberControl label="Pad Y" min="0" max="40" step="2" value={layer.border.paddingY}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, border: { ...(l as TextLayer).border, paddingY: value } }))} />
          </PropertyRow>
        </>
      )}

      <PropSubheading label="Typewriter" />
      <PropertyRow label="Enabled" tooltip="Text types itself character by character">
        <input type="checkbox" checked={layer.typewriter?.enabled ?? false}
          onChange={() => {
            const tw = layer.typewriter ?? { enabled: false, speed: 30, cursor: true, cursorChar: '|' };
            updateLayer(layer.id, l => ({ ...l, typewriter: { ...tw, enabled: !tw.enabled } }));
          }} />
      </PropertyRow>
      {layer.typewriter?.enabled && (
        <>
          <PropertyRow label="Speed" tooltip="Characters revealed per second">
            <SliderNumberControl label="Speed" displayScale={100} unit="%" min="5" max="100" step="5" value={layer.typewriter.speed}
              onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, typewriter: { ...(l as TextLayer).typewriter!, speed: value } }))} />
            <span class="prop-unit">ch/s</span>
          </PropertyRow>
          <PropertyRow label="Cursor" tooltip="Show blinking cursor during typing">
            <input type="checkbox" checked={layer.typewriter.cursor}
              onChange={() => updateLayer(layer.id, l => ({ ...l, typewriter: { ...(l as TextLayer).typewriter!, cursor: !(l as TextLayer).typewriter!.cursor } }))} />
          </PropertyRow>
          <PropertyRow label="Char" tooltip="Cursor character">
            <input type="text" value={layer.typewriter.cursorChar} style="width:30px;text-align:center"
              onInput={(e) => updateLayer(layer.id, l => ({ ...l, typewriter: { ...(l as TextLayer).typewriter!, cursorChar: (e.target as HTMLInputElement).value || '|' } }))} />
          </PropertyRow>
        </>
      )}
    </>
  );
}

function EffectProperties({ layer }: { layer: EffectLayer }) {
  const cfg = layer.config as Record<string, any>;

  const updateConfig = (key: string, value: unknown) => {
    updateLayer(layer.id, l => ({
      ...l,
      config: { ...(l as EffectLayer).config, [key]: value },
    }));
  };

  const updateLaserInsertionPoint = (index: number, axis: 'x' | 'y', percent: number) => {
    if (!Number.isFinite(percent)) return;
    updateLayer(layer.id, l => {
      const config = (l as EffectLayer).config;
      const count = Math.max(1, Math.min(3, Math.round(Number(config.count ?? 3))));
      const origins = config.origins as { x: number; y: number }[] | undefined;
      const point = getLaserOrigin(index, count, origins);
      return { ...l, config: { ...config, origins: setLaserOrigin(origins, index, count, { ...point, [axis]: percent / 100 }) } };
    });
  };

  const updateLaserAngle = (index: number, degrees: number) => {
    if (!Number.isFinite(degrees)) return;
    updateLayer(layer.id, l => {
      const config = (l as EffectLayer).config;
      const count = Math.max(1, Math.min(3, Math.round(Number(config.count ?? 3))));
      const angles = Array.from({ length: count }, (_, beam) => Number((config.angles as number[] | undefined)?.[beam] ?? getDefaultLaserAngle(beam, count)));
      angles[index] = Math.max(-180, Math.min(180, Math.round(degrees)));
      return { ...l, config: { ...config, angles } };
    });
  };

  return (
    <>
      <PropSubheading label={`Effect: ${layer.effectType}`} />

      {layer.effectType === 'laser-beams' && (
        <>
          <PropertyRow label="Beams" tooltip="Use no more than three beams per the DJ Tony T guide">
            <SliderNumberControl label="Beams" min="0" max="3" step="1" value={cfg.count ?? 3}
              onValueChange={(value) => updateConfig('count', value)} />

          </PropertyRow>
          <PropertyRow label="Glow">
            <SliderNumberControl label="Glow" min="0" max="60" step="1" value={cfg.glow ?? 26}
              onValueChange={(value) => updateConfig('glow', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Speed" tooltip="How quickly the projector beams sweep across the screen. Zero holds them still.">
            <SliderNumberControl label="Speed" displayScale={60} unit="/min" min="0" max="0.8" step="0.01" value={cfg.speed ?? DEFAULT_LASER_SPEED}
              onValueChange={(value) => updateConfig('speed', value)} />
          </PropertyRow>
          <PropertyRow label="Sweep" tooltip="How far each beam swings to either side of its centre angle">
            <SliderNumberControl label="Sweep" min="0" max="45" step="1" value={cfg.sweep ?? DEFAULT_LASER_SWEEP}
              onValueChange={(value) => updateConfig('sweep', value)} />
            <span class="prop-unit">°</span>
          </PropertyRow>
          <div class="laser-origin-hint">Drag the numbered points on the canvas, or enter X and Y positions below.</div>
          {Array.from({ length: Math.max(0, Math.min(3, cfg.count ?? 3)) }, (_, index) => {
            const origin = getLaserOrigin(index, cfg.count ?? 3, cfg.origins);
            const angle = cfg.angles?.[index] ?? getDefaultLaserAngle(index, cfg.count ?? 3);
            return <div key={index} class="laser-beam-settings">
              <PropertyRow label={`Beam ${index + 1}`} tooltip={`Colour of laser beam ${index + 1}`}>
                <input type="color" aria-label={`Beam ${index + 1} colour`} value={cfg.colors?.[index] ?? DEFAULT_LASER_COLORS[index]}
                  onInput={(e) => {
                    const colors = [...(cfg.colors ?? DEFAULT_LASER_COLORS)];
                    colors[index] = (e.target as HTMLInputElement).value;
                    updateConfig('colors', colors);
                  }} />
                <span class="prop-unit">{cfg.colors?.[index] ?? DEFAULT_LASER_COLORS[index]}</span>
              </PropertyRow>
              <PropertyRow label={`Origin ${index + 1}`} tooltip="Beam insertion point as a percentage of the canvas width and height">
                <div class="laser-origin-fields">
                  <label>X <LaserNumberInput value={origin.x * 100} min={0} max={100} label={`Beam ${index + 1} origin X percent`}
                    onCommit={(percent) => updateLaserInsertionPoint(index, 'x', percent)} />%</label>
                  <label>Y <LaserNumberInput value={origin.y * 100} min={0} max={100} label={`Beam ${index + 1} origin Y percent`}
                    onCommit={(percent) => updateLaserInsertionPoint(index, 'y', percent)} />%</label>
                </div>
              </PropertyRow>
              <PropertyRow label={`Angle ${index + 1}`} tooltip="Starting direction: 0° is up, negative aims left, positive aims right. Sweep moves around this angle.">
                <SliderNumberControl label={`Angle ${index + 1}`} min="-180" max="180" step="1" value={angle}
                  aria-label={`Beam ${index + 1} insertion angle slider`}
                  onValueChange={(value) => updateLaserAngle(index, value)} />
                <span class="prop-unit">°</span>
              </PropertyRow>
            </div>;
          })}
        </>
      )}

      {layer.effectType === 'spectrum' && (
        <>
          <PropertyRow label="Height">
            <SliderNumberControl label="Height" min="200" max="1600" step="50" value={cfg.height ?? 900}
              onValueChange={(value) => updateConfig('height', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Offset">
            <SliderNumberControl label="Offset" min="0" max="200" step="5" value={cfg.bottomOffset ?? 40}
              onValueChange={(value) => updateConfig('bottomOffset', value)} />
          </PropertyRow>
          <PropertyRow label="Bars">
            <SliderNumberControl label="Bars" min="8" max="64" step="4" value={cfg.barCount ?? 32}
              onValueChange={(value) => updateConfig('barCount', value)} />

          </PropertyRow>
        </>
      )}

      {layer.effectType === 'waveform' && (
        <>
          <PropertyRow label="Y Center">
            <SliderNumberControl label="Y Center" displayScale={100} unit="%" min="0.1" max="0.9" step="0.01" value={cfg.yCenter ?? 0.61}
              onValueChange={(value) => updateConfig('yCenter', value)} />
          </PropertyRow>
          <PropertyRow label="Height">
            <SliderNumberControl label="Height" min="200" max="1800" step="50" value={cfg.height ?? 1200}
              onValueChange={(value) => updateConfig('height', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Line W">
            <SliderNumberControl label="Line W" min="1" max="12" step="1" value={cfg.lineWidth ?? 6}
              onValueChange={(value) => updateConfig('lineWidth', value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'pulsing-logo' && (
        <>
          <PropertyRow label="Max Scale">
            <SliderNumberControl label="Max Scale" displayScale={100} unit="%" min="1" max="4" step="0.1" value={cfg.maxScale ?? 2.0}
              onValueChange={(value) => updateConfig('maxScale', value)} />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <SliderNumberControl label="Opacity" displayScale={100} unit="%" min="0" max="1" step="0.05" value={cfg.opacity ?? 1}
              onValueChange={(value) => updateConfig('opacity', value)} />
          </PropertyRow>
          <PropertyRow label="Start">
            <input type="number" min="0" step="100" value={cfg.startTime ?? 0} class="prop-num-input"
              onInput={(e) => updateConfig('startTime', parseInt((e.target as HTMLInputElement).value) || 0)} />
            <span class="prop-unit">ms</span>
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'glitch' && (
        <>
          <PropertyRow label="Intensity">
            <SliderNumberControl label="Intensity" displayScale={100} unit="%" min="0.1" max="3" step="0.1" value={cfg.intensity ?? 1.0}
              onValueChange={(value) => updateConfig('intensity', value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'vignette' && (
        <>
          <PropertyRow label="Strength">
            <SliderNumberControl label="Strength" displayScale={100} unit="%" min="0.1" max="1" step="0.05" value={cfg.strength ?? 0.55}
              onValueChange={(value) => updateConfig('strength', value)} />
          </PropertyRow>
          <PropertyRow label="Inner R">
            <SliderNumberControl label="Inner R" displayScale={60} unit="/min" min="0" max="0.8" step="0.05" value={cfg.innerRadius ?? 0.3}
              onValueChange={(value) => updateConfig('innerRadius', value)} />
          </PropertyRow>
          <PropertyRow label="Outer R">
            <SliderNumberControl label="Outer R" displayScale={100} unit="%" min="0.3" max="1.5" step="0.05" value={cfg.outerRadius ?? 0.8}
              onValueChange={(value) => updateConfig('outerRadius', value)} />
          </PropertyRow>
          <PropertyRow label="Color">
            <select value={cfg.color ?? '0,0,0'}
              onChange={(e) => updateConfig('color', (e.target as HTMLSelectElement).value)}>
              <option value="0,0,0">Black</option>
              <option value="232,66,63">Red</option>
              <option value="0,0,80">Dark Blue</option>
              <option value="60,0,60">Purple</option>
            </select>
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'scanlines' && (
        <>
          <PropertyRow label="Spacing">
            <SliderNumberControl label="Spacing" min="2" max="12" step="1" value={cfg.spacing ?? 4}
              onValueChange={(value) => updateConfig('spacing', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Thick">
            <SliderNumberControl label="Thick" min="1" max="6" step="1" value={cfg.thickness ?? 2}
              onValueChange={(value) => updateConfig('thickness', value)} />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <SliderNumberControl label="Opacity" displayScale={100} unit="%" min="0.01" max="0.3" step="0.01" value={cfg.opacity ?? 0.05}
              onValueChange={(value) => updateConfig('opacity', value)} />
          </PropertyRow>
          <PropertyRow label="Color">
            <input type="color" value={cfg.color ?? '#000000'}
              onInput={(e) => updateConfig('color', (e.target as HTMLInputElement).value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'grid' && (
        <>
          <PropertyRow label="Spacing">
            <SliderNumberControl label="Spacing" min="20" max="150" step="5" value={cfg.spacing ?? 60}
              onValueChange={(value) => updateConfig('spacing', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Color">
            <input type="color" value={cfg.color ?? '#E8423F'}
              onInput={(e) => updateConfig('color', (e.target as HTMLInputElement).value)} />
          </PropertyRow>
          <PropertyRow label="Line W">
            <SliderNumberControl label="Line W" min="0.5" max="4" step="0.5" value={cfg.lineWidth ?? 1}
              onValueChange={(value) => updateConfig('lineWidth', value)} />
          </PropertyRow>
          <PropertyRow label="Speed">
            <SliderNumberControl label="Speed" displayScale={100} unit="%" min="0" max="5" step="0.5" value={cfg.speed ?? 1}
              onValueChange={(value) => updateConfig('speed', value)} />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <SliderNumberControl label="Opacity" displayScale={100} unit="%" min="0.01" max="0.2" step="0.01" value={cfg.opacity ?? 0.04}
              onValueChange={(value) => updateConfig('opacity', value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'corner-accents' && (
        <>
          <PropertyRow label="Margin">
            <SliderNumberControl label="Margin" min="10" max="100" step="5" value={cfg.margin ?? 40}
              onValueChange={(value) => updateConfig('margin', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Length">
            <SliderNumberControl label="Length" min="20" max="150" step="5" value={cfg.length ?? 60}
              onValueChange={(value) => updateConfig('length', value)} />
          </PropertyRow>
          <PropertyRow label="Line W">
            <SliderNumberControl label="Line W" min="1" max="8" step="1" value={cfg.lineWidth ?? 3}
              onValueChange={(value) => updateConfig('lineWidth', value)} />
          </PropertyRow>
          <PropertyRow label="Color">
            <input type="color" value={cfg.color ?? '#E8423F'}
              onInput={(e) => updateConfig('color', (e.target as HTMLInputElement).value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'sweep' && (
        <>
          <PropertyRow label="Speed">
            <SliderNumberControl label="Speed" displayScale={100} unit="%" min="0.3" max="3" step="0.1" value={cfg.speed ?? 1}
              onValueChange={(value) => updateConfig('speed', value)} />
          </PropertyRow>
          <PropertyRow label="Width">
            <SliderNumberControl label="Width" min="50" max="500" step="25" value={cfg.sweepWidth ?? 200}
              onValueChange={(value) => updateConfig('sweepWidth', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Count">
            <SliderNumberControl label="Count" min="1" max="6" step="1" value={cfg.count ?? 3}
              onValueChange={(value) => updateConfig('count', value)} />

          </PropertyRow>
        </>
      )}

      {layer.effectType === 'particles' && (
        <>
          <PropertyRow label="Max" tooltip="Maximum particle count on screen">
            <SliderNumberControl label="Max" min="20" max="200" step="10" value={cfg.maxCount ?? 80}
              onValueChange={(value) => updateConfig('maxCount', value)} />

          </PropertyRow>
          <PropertyRow label="Spawn" tooltip="Spawn probability per frame (higher = more particles)">
            <SliderNumberControl label="Spawn" displayScale={100} unit="%" min="0.1" max="1" step="0.1" value={cfg.spawnRate ?? 0.7}
              onValueChange={(value) => updateConfig('spawnRate', value)} />
          </PropertyRow>
          <PropertyRow label="Size Min">
            <SliderNumberControl label="Size Min" min="1" max="10" step="1" value={cfg.sizeMin ?? 2}
              onValueChange={(value) => updateConfig('sizeMin', value)} />
          </PropertyRow>
          <PropertyRow label="Size Max">
            <SliderNumberControl label="Size Max" min="2" max="20" step="1" value={cfg.sizeMax ?? 5}
              onValueChange={(value) => updateConfig('sizeMax', value)} />
          </PropertyRow>
          <PropertyRow label="Gravity" tooltip="Vertical pull (-0.5 = up, 0 = float, 0.5 = fall)">
            <SliderNumberControl label="Gravity" min="-0.5" max="0.5" step="0.05" value={cfg.gravity ?? 0}
              onValueChange={(value) => updateConfig('gravity', value)} />
          </PropertyRow>
          <PropertyRow label="Color 1">
            <input type="color" value={cfg.color1 ?? '#E8423F'}
              onInput={(e) => updateConfig('color1', (e.target as HTMLInputElement).value)} />
          </PropertyRow>
          <PropertyRow label="Color 2">
            <input type="color" value={cfg.color2 ?? '#FFFFFF'}
              onInput={(e) => updateConfig('color2', (e.target as HTMLInputElement).value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'strobe' && (
        <>
          <PropertyRow label="Color" tooltip="Flash color">
            <input type="color" value={cfg.color ?? '#FFFFFF'}
              onInput={(e) => updateConfig('color', (e.target as HTMLInputElement).value)} />
          </PropertyRow>
          <PropertyRow label="Intensity" tooltip="Flash brightness (0-1)">
            <SliderNumberControl label="Intensity" displayScale={100} unit="%" min="0.1" max="1" step="0.05" value={cfg.intensity ?? 0.8}
              onValueChange={(value) => updateConfig('intensity', value)} />
          </PropertyRow>
          <PropertyRow label="Beat Div" tooltip="Beat division (1 = quarter, 2 = eighth, 0.5 = half)">
            <select value={cfg.beatDiv ?? 1}
              onChange={(e) => updateConfig('beatDiv', parseFloat((e.target as HTMLSelectElement).value))}>
              <option value="0.25">Whole</option>
              <option value="0.5">Half</option>
              <option value="1">Quarter</option>
              <option value="2">Eighth</option>
              <option value="4">Sixteenth</option>
            </select>
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'film-grain' && (
        <>
          <PropertyRow label="Intensity" tooltip="Grain visibility (0 = none, 1 = very noisy)">
            <SliderNumberControl label="Intensity" displayScale={100} unit="%" min="0.05" max="0.8" step="0.05" value={cfg.intensity ?? 0.3}
              onValueChange={(value) => updateConfig('intensity', value)} />
          </PropertyRow>
          <PropertyRow label="Size" tooltip="Grain pixel size (1 = fine, 4+ = coarse)">
            <SliderNumberControl label="Size" min="1" max="6" step="1" value={cfg.grainSize ?? 2}
              onValueChange={(value) => updateConfig('grainSize', value)} />
          </PropertyRow>
          <PropertyRow label="Mono" tooltip="Monochrome grain (off = color noise)">
            <input type="checkbox" checked={cfg.mono !== false}
              onChange={() => updateConfig('mono', cfg.mono === false)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'chromatic-aberration' && (
        <>
          <PropertyRow label="Intensity" tooltip="Pixel offset for RGB channel separation">
            <SliderNumberControl label="Intensity" displayScale={100} unit="%" min="1" max="20" step="1" value={cfg.intensity ?? 4}
              onValueChange={(value) => updateConfig('intensity', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Angle" tooltip="Direction of the color split (degrees)">
            <SliderNumberControl label="Angle" min="0" max="360" step="15" value={cfg.angle ?? 0}
              onValueChange={(value) => updateConfig('angle', value)} />
            <span class="prop-unit">°</span>
          </PropertyRow>
          <PropertyRow label="Edge Only" tooltip="Only apply near frame edges (cinematic lens effect)">
            <input type="checkbox" checked={cfg.edgeOnly ?? false}
              onChange={() => updateConfig('edgeOnly', !(cfg.edgeOnly ?? false))} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'color-grading' && (
        <>
          <PropertyRow label="Preset" tooltip="Color grading preset (adjusts all sliders)">
            <select value={cfg.preset ?? 'none'}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                updateConfig('preset', v);
                updateConfig('hue', undefined);
                updateConfig('saturation', undefined);
                updateConfig('brightness', undefined);
                updateConfig('contrast', undefined);
              }}>
              <option value="none">None</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
              <option value="vintage">Vintage</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="noir">Noir</option>
            </select>
          </PropertyRow>
          <PropertyRow label="Hue" tooltip="Hue rotation in degrees (-180 to 180)">
            <SliderNumberControl label="Hue" min="-180" max="180" step="5" value={cfg.hue ?? 0}
              onValueChange={(value) => updateConfig('hue', value)} />
          </PropertyRow>
          <PropertyRow label="Sat" tooltip="Saturation adjustment (-1 = desaturate, 0 = normal, 1 = vivid)">
            <SliderNumberControl label="Sat" displayScale={100} unit="%" min="-1" max="1" step="0.05" value={cfg.saturation ?? 0}
              onValueChange={(value) => updateConfig('saturation', value)} />
          </PropertyRow>
          <PropertyRow label="Bright" tooltip="Brightness multiplier (-0.5 = dark, 0 = normal, 0.5 = bright)">
            <SliderNumberControl label="Bright" displayScale={100} unit="%" min="-0.5" max="0.5" step="0.05" value={cfg.brightness ?? 0}
              onValueChange={(value) => updateConfig('brightness', value)} />
          </PropertyRow>
          <PropertyRow label="Contrast" tooltip="Contrast boost (-0.5 to 0.5)">
            <SliderNumberControl label="Contrast" displayScale={100} unit="%" min="-0.5" max="0.5" step="0.05" value={cfg.contrast ?? 0}
              onValueChange={(value) => updateConfig('contrast', value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'zoom-pulse' && (
        <>
          <PropertyRow label="Amount" tooltip="Zoom intensity per beat pulse">
            <SliderNumberControl label="Amount" displayScale={100} unit="%" min="0.01" max="0.15" step="0.01" value={cfg.amount ?? 0.03}
              onValueChange={(value) => updateConfig('amount', value)} />
          </PropertyRow>
          <PropertyRow label="Beat Div" tooltip="Beat division for pulse timing">
            <select value={cfg.beatDiv ?? 1}
              onChange={(e) => updateConfig('beatDiv', parseFloat((e.target as HTMLSelectElement).value))}>
              <option value="0.5">Half</option>
              <option value="1">Quarter</option>
              <option value="2">Eighth</option>
            </select>
          </PropertyRow>
          <PropertyRow label="Decay" tooltip="How quickly the pulse fades (higher = snappier)">
            <SliderNumberControl label="Decay" min="1" max="6" step="0.5" value={cfg.decay ?? 2}
              onValueChange={(value) => updateConfig('decay', value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'blur-transition' && (
        <>
          <PropertyRow label="Max Blur" tooltip="Maximum blur radius in pixels">
            <SliderNumberControl label="Max Blur" min="2" max="50" step="2" value={cfg.maxBlur ?? 20}
              onValueChange={(value) => updateConfig('maxBlur', value)} />
            <span class="prop-unit">px</span>
          </PropertyRow>
          <PropertyRow label="Start" tooltip="Start time of the blur effect (ms)">
            <input type="number" min="0" step="100" value={cfg.startTime ?? 0} class="prop-num-input"
              onInput={(e) => updateConfig('startTime', parseInt((e.target as HTMLInputElement).value) || 0)} />
            <span class="prop-unit">ms</span>
          </PropertyRow>
          <PropertyRow label="End" tooltip="End time of the blur effect (ms)">
            <input type="number" min="0" step="100" value={cfg.endTime ?? project.value.settings.duration} class="prop-num-input"
              onInput={(e) => updateConfig('endTime', parseInt((e.target as HTMLInputElement).value) || 0)} />
            <span class="prop-unit">ms</span>
          </PropertyRow>
          <PropertyRow label="Mode" tooltip="Blur direction: in (blur→clear), out (clear→blur), or pulse">
            <select value={cfg.mode ?? 'in-out'}
              onChange={(e) => updateConfig('mode', (e.target as HTMLSelectElement).value)}>
              <option value="in">Blur In (blur→clear)</option>
              <option value="out">Blur Out (clear→blur)</option>
              <option value="in-out">Pulse (clear→blur→clear)</option>
            </select>
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'parallax-drift' && (
        <>
          <PropertyRow label="Speed X" tooltip="Horizontal camera drift speed">
            <SliderNumberControl label="Speed X" displayScale={100} unit="%" min="-0.1" max="0.1" step="0.005" value={cfg.speedX ?? 0.02}
              onValueChange={(value) => updateConfig('speedX', value)} />
          </PropertyRow>
          <PropertyRow label="Speed Y" tooltip="Vertical camera drift speed">
            <SliderNumberControl label="Speed Y" displayScale={100} unit="%" min="-0.1" max="0.1" step="0.005" value={cfg.speedY ?? 0.01}
              onValueChange={(value) => updateConfig('speedY', value)} />
          </PropertyRow>
          <PropertyRow label="Zoom" tooltip="How much the frame zooms during drift">
            <SliderNumberControl label="Zoom" displayScale={100} unit="%" min="0" max="0.2" step="0.01" value={cfg.zoomAmount ?? 0.05}
              onValueChange={(value) => updateConfig('zoomAmount', value)} />
          </PropertyRow>
        </>
      )}

      {layer.effectType === 'mirror' && (
        <>
          <PropertyRow label="Mode" tooltip="Mirror axis or kaleidoscope pattern">
            <select value={cfg.mode ?? 'horizontal'}
              onChange={(e) => updateConfig('mode', (e.target as HTMLSelectElement).value)}>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="both">Both</option>
              <option value="kaleidoscope">Kaleidoscope</option>
            </select>
          </PropertyRow>
          {(cfg.mode === 'kaleidoscope') && (
            <PropertyRow label="Segments" tooltip="Number of kaleidoscope segments">
              <SliderNumberControl label="Segments" min="4" max="12" step="2" value={cfg.segments ?? 6}
                onValueChange={(value) => updateConfig('segments', value)} />

            </PropertyRow>
          )}
        </>
      )}
    </>
  );
}

function ShapeProperties({ layer }: { layer: ShapeLayer }) {
  return (
    <>
      <PropSubheading label="Shape" />
      <PropertyRow label="Type">
        <select value={layer.shapeType}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, shapeType: (e.target as HTMLSelectElement).value as ShapeLayer['shapeType'] }))}>
          <option value="rect">Rectangle</option>
          <option value="rounded-rect">Rounded Rect</option>
          <option value="ellipse">Ellipse</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Width">
        <input type="number" min="1" value={layer.size.width} class="prop-num-input"
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, size: { ...(l as ShapeLayer).size, width: parseInt((e.target as HTMLInputElement).value) || 1 } }))} />
      </PropertyRow>
      <PropertyRow label="Height">
        <input type="number" min="1" value={layer.size.height} class="prop-num-input"
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, size: { ...(l as ShapeLayer).size, height: parseInt((e.target as HTMLInputElement).value) || 1 } }))} />
      </PropertyRow>
      <PropertyRow label="Fill">
        <input type="checkbox" checked={layer.fill.enabled}
          onChange={() => updateLayer(layer.id, l => ({ ...l, fill: { ...(l as ShapeLayer).fill, enabled: !(l as ShapeLayer).fill.enabled } }))} />
        {layer.fill.enabled && (
          <input type="color" value={layer.fill.color}
            onInput={(e) => updateLayer(layer.id, l => ({ ...l, fill: { ...(l as ShapeLayer).fill, color: (e.target as HTMLInputElement).value } }))} />
        )}
      </PropertyRow>
      <PropertyRow label="Stroke">
        <input type="checkbox" checked={layer.stroke.enabled}
          onChange={() => updateLayer(layer.id, l => ({ ...l, stroke: { ...(l as ShapeLayer).stroke, enabled: !(l as ShapeLayer).stroke.enabled } }))} />
        {layer.stroke.enabled && (
          <input type="color" value={layer.stroke.color}
            onInput={(e) => updateLayer(layer.id, l => ({ ...l, stroke: { ...(l as ShapeLayer).stroke, color: (e.target as HTMLInputElement).value } }))} />
        )}
      </PropertyRow>
      {layer.stroke.enabled && (
        <PropertyRow label="Stroke W">
          <SliderNumberControl label="Stroke W" min="1" max="20" step="1" value={layer.stroke.width}
            onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, stroke: { ...(l as ShapeLayer).stroke, width: value } }))} />
        </PropertyRow>
      )}
      {(layer.shapeType === 'rounded-rect') && (
        <PropertyRow label="Radius">
          <SliderNumberControl label="Radius" min="0" max="100" step="1" value={layer.cornerRadius}
            onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, cornerRadius: value }))} />
        </PropertyRow>
      )}
    </>
  );
}

function VideoProperties({ layer }: { layer: VideoLayer }) {
  const canvasHeight = project.value.settings.height;
  const handleVideoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const assetId = `asset_${Date.now().toString(36)}`;
      await loadVideoAsset(assetId, file);
      updateLayer(layer.id, l => ({
        ...l,
        assetId,
      }));
    };
    input.click();
  };

  return (
    <>
      <PropSubheading label="Video Slice" />
      <PropertyRow label="Video">
        <button class="prop-upload-btn" onClick={handleVideoUpload}>
          {layer.assetId ? 'Change Video' : 'Upload Video'}
        </button>
      </PropertyRow>
      <PropertyRow label="Background">
        <button class="prop-upload-btn" onClick={() => updateLayer(layer.id, current => ({
          ...current,
          orientation: 'horizontal',
          thickness: canvasHeight,
          position: {
            ...current.position,
            y: { keyframes: current.position.y.keyframes.map(frame => ({ ...frame, value: 0.5 })) },
          },
        }))}>Fill canvas</button>
      </PropertyRow>
      <PropertyRow label="Orient">
        <select value={layer.orientation}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, orientation: (e.target as HTMLSelectElement).value as 'horizontal' | 'vertical' }))}>
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Thick">
        <SliderNumberControl label="Thick" min="50" max={Math.max(1000, canvasHeight)} step="10" value={layer.thickness}
          onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, thickness: value }))} />
        <span class="prop-unit">px</span>
      </PropertyRow>
      <PropertyRow label="Pan">
        <SliderNumberControl label="Pan" displayScale={100} unit="%" min="0" max="1" step="0.01" value={layer.videoPan}
          onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, videoPan: value }))} />
      </PropertyRow>
      <PropSubheading label="Fade" />
      <PropertyRow label="In Time">
        <input type="number" min="0" step="100" value={layer.fadeInTime} class="prop-num-input"
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, fadeInTime: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <span class="prop-unit">ms</span>
      </PropertyRow>
      <PropertyRow label="Out Time">
        <input type="number" min="0" step="100" value={layer.fadeOutTime} class="prop-num-input"
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, fadeOutTime: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <span class="prop-unit">ms</span>
      </PropertyRow>
      <PropertyRow label="Duration">
        <input type="number" min="0" step="100" value={layer.fadeDuration} class="prop-num-input"
          onInput={(e) => updateLayer(layer.id, l => ({ ...l, fadeDuration: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <span class="prop-unit">ms</span>
      </PropertyRow>
      <PropSubheading label="Slide" />
      <PropertyRow label="In">
        <select value={layer.slideIn}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, slideIn: (e.target as HTMLSelectElement).value as VideoLayer['slideIn'] }))}>
          <option value="none">None</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Out">
        <select value={layer.slideOut}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, slideOut: (e.target as HTMLSelectElement).value as VideoLayer['slideOut'] }))}>
          <option value="none">None</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </PropertyRow>
    </>
  );
}

function BgLogoProperties({ layer }: { layer: BackgroundLogoLayer }) {
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const assetId = `asset_${Date.now().toString(36)}`;
      await loadImageAsset(assetId, file);
      updateLayer(layer.id, l => ({
        ...l,
        assetId,
      }));
    };
    input.click();
  };

  return (
    <>
      <PropSubheading label="Background Logo" />
      <PropertyRow label="Image">
        <button class="prop-upload-btn" onClick={handleImageUpload}>
          {layer.assetId ? 'Change Image' : 'Upload Image'}
        </button>
      </PropertyRow>
      <PropertyRow label="Scale">
        <SliderNumberControl label="Scale" displayScale={100} unit="%" min="0.1" max="3" step="0.05" value={layer.logoScale}
          onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, logoScale: value }))} />

      </PropertyRow>
      <PropertyRow label="Speed">
        <SliderNumberControl label="Speed" displayScale={1000} unit="px/s" min="0" max="1" step="0.01" value={layer.speed}
          onValueChange={(value) => updateLayer(layer.id, l => ({ ...l, speed: value }))} />

      </PropertyRow>
      <PropertyRow label="Direction">
        <select value={layer.clockDir}
          onChange={(e) => updateLayer(layer.id, l => ({ ...l, clockDir: parseInt((e.target as HTMLSelectElement).value) }))}>
          {Object.entries(CLOCK_DIRECTIONS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </PropertyRow>
    </>
  );
}

const sidebarStyles = `
.sidebar {
  width: 258px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-tools { max-height: 42%; overflow-y: auto; flex-shrink: 0; }
.sidebar-layer-section { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.sidebar-layer-section .layer-list { overflow-y: auto; min-height: 0; flex: 1; }
.rollup-section { border-bottom: 1px solid var(--border); }
.rollup-header {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; padding: 10px 14px; background: var(--bg-tertiary);
  color: var(--text-secondary); text-align: left; font-size: 11px;
  font-weight: 650; text-transform: uppercase; letter-spacing: .8px;
  cursor: pointer;
}
.rollup-header:hover { color: var(--text-primary); background: var(--bg-elevated); }
.rollup-chevron { display: inline-block; width: 14px; color: var(--accent); }
.rollup-content > div { border-bottom: 0; }
.rollup-content .sidebar-header { display: none; }

.inspector {
  width: 340px; flex-shrink: 0; display: flex; flex-direction: column;
  min-height: 0; background: var(--bg-secondary); border-left: 1px solid var(--border);
}
.inspector-header {
  min-height: 42px; padding: 10px 14px; display: flex; flex-direction: column;
  gap: 2px; border-bottom: 1px solid var(--border); background: var(--bg-tertiary);
}
.inspector-header strong { font-size: 11px; letter-spacing: .8px; text-transform: uppercase; }
.inspector-header span { font-size: 12px; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inspector-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.inspector-empty, .inspector-note { padding: 14px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.inspector-note { background: rgba(34, 211, 238, .08); border-bottom: 1px solid var(--border); }
.inspector-group { border-bottom: 1px solid var(--border); }
.inspector-group summary {
  padding: 10px 14px; background: var(--bg-tertiary); cursor: pointer;
  color: var(--text-secondary); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .6px;
}
.inspector-group summary:hover { color: var(--text-primary); }

@media (max-width: 1100px) {
  .sidebar { width: 220px; }
  .inspector { width: 280px; }
}
@media (max-width: 780px) {
  .shell-main { flex-wrap: wrap; overflow-y: auto; }
  .sidebar { width: 42%; height: 45%; order: 1; }
  .inspector { width: 58%; height: 45%; order: 2; }
  .shell-canvas-area { order: 0; flex: 0 0 100%; height: 55%; }
}

.sidebar-section {
  border-bottom: 1px solid var(--border);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.sidebar-count {
  background: var(--bg-elevated);
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10px;
}

.layer-list {
  padding: 4px;
}

.layer-selection-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 5px 8px 8px; color: var(--text-secondary); font-size: 11px; }
.layer-selection-toolbar button { padding: 5px 10px; border-radius: 4px; background: var(--accent); color: #071015; font-weight: 700; }
.layer-selection-toolbar button:disabled { opacity: .4; cursor: default; }
.layer-multi-check { flex: 0 0 auto; margin: 0; accent-color: var(--accent); }
.layer-item-member { padding-left: 20px; }
.layer-group-count { color: var(--text-muted); font-size: 10px; }

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s;
}
.layer-item:hover { background: var(--bg-elevated); }

.layer-item-selected {
  background: var(--accent-dim) !important;
  border: 1px solid var(--accent);
}

.layer-type-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.layer-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.layer-item-hidden .layer-name,
.layer-item-hidden .layer-type-badge { opacity: .48; }
.layer-visibility-btn { flex: 0 0 28px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--text-primary); background: var(--bg-tertiary); border-radius: 4px; }
.layer-visibility-btn:hover { background: var(--border-hover); }
.layer-visibility-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.layer-visibility-off { color: var(--text-muted); }

.layer-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.layer-item:focus-within .layer-actions,
.layer-item:hover .layer-actions,
.layer-item-selected .layer-actions { opacity: 1; }

.layer-action-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 3px;
  color: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
  transition: background 0.1s;
}
.layer-action-btn:hover { background: var(--border-hover); color: var(--text-primary); }

.layer-list-empty {
  padding: 20px 14px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.property-panel {
  padding: 8px 14px;
}

.prop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.prop-label {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 55px;
  text-align: right;
  flex-shrink: 0;
}

.prop-control {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.prop-control input[type="text"],
.prop-control select,
.prop-control textarea {
  width: 100%;
  font-size: 12px;
  padding: 4px 6px;
}

.prop-control textarea {
  resize: vertical;
  min-height: 50px;
}

.prop-control input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
}

.prop-control input[type="checkbox"] {
  accent-color: var(--accent);
  flex-shrink: 0;
}

.prop-control input[type="range"] {
  flex: 1;
  min-width: 60px;
}

.duplicate-layer-btn { width: 100%; margin: 8px 0; }
.prop-control { min-width: 0; }
.prop-slider-number { flex: 1; min-width: 0; }
.prop-slider-number-main { display: flex; align-items: center; gap: 6px; min-width: 0; }
.prop-slider-unit { color: var(--text-muted); font-size: 10px; min-width: 14px; }
.prop-fine-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding-top: 5px; font-size: 10px; color: var(--text-muted); }
.prop-fine-controls button { padding: 3px 6px; border: 1px solid var(--border); border-radius: 3px; font-size: 10px; color: var(--text-primary); background: var(--bg-tertiary); }
.prop-fine-controls button:hover { border-color: var(--accent); }
.prop-fine-shortcut { margin-left: auto; }
.prop-fine-hint { width: 100%; font-size: 10px; }
.prop-slider-number input[type="range"] { width: 0; min-width: 36px; }
.prop-slider-number-input { width: 76px; flex: 0 0 76px; min-width: 0; padding: 4px; font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }

.prop-num-input {
  width: 70px !important;
  flex: 0 0 70px !important;
  text-align: center;
}

.laser-origin-hint { padding: 8px 0 4px 63px; color: var(--text-muted); font-size: 10px; line-height: 1.35; }
.laser-beam-settings { border-top: 1px solid var(--border); padding: 3px 0; }
.laser-origin-fields { display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--text-secondary); }
.laser-origin-fields label { display: flex; align-items: center; gap: 3px; }
.laser-origin-fields input { width: 48px; padding: 3px 4px; text-align: center; font-size: 11px; }
.laser-beam-settings .prop-control > input[type="number"] { width: 50px; min-width: 0; flex: 0 0 50px; padding: 3px 4px; text-align: center; font-size: 11px; }

.prop-unit {
  font-size: 9px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
  min-width: 28px;
}

.prop-value-readonly {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.prop-subheading {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-top: 10px;
  margin-bottom: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.prop-upload-btn {
  padding: 4px 10px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  transition: background 0.15s;
  cursor: pointer;
}
.prop-upload-btn:hover { background: var(--border-hover); color: var(--text-primary); }

.property-danger-zone {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.danger-btn {
  width: 100%;
  padding: 6px;
  background: rgba(232, 66, 63, 0.12);
  color: var(--accent);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s;
}
.danger-btn:hover { background: rgba(232, 66, 63, 0.25); }
`;
