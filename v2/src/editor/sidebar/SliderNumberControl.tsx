import { useEffect, useRef, useState } from 'preact/hooks';

interface SliderNumberControlProps {
  value: number;
  min: number | string;
  max: number | string;
  step: number | string;
  label: string;
  'aria-label'?: string;
  /** Convert stored values to familiar display units without changing the project schema. */
  displayScale?: number;
  unit?: string;
  fineStep?: number;
  fineLabel?: string;
  hint?: string;
  onValueChange: (value: number) => void;
}

const precise = (value: number) => String(Number(value.toFixed(4)));

/** Whole-number readouts at rest, exact values and fine nudges while the field is focused. */
export function SliderNumberControl({ value, min, max, step, label, onValueChange,
  displayScale = 1, unit, fineStep, fineLabel, hint, 'aria-label': sliderLabel }: SliderNumberControlProps) {
  const shown = value * displayScale;
  const lower = Number(min) * displayScale, upper = Number(max) * displayScale;
  const increment = displayScale === 1 ? Math.max(1, Number(step)) : 1;
  const fine = fineStep ?? (Number(step) < 1 ? .1 : Math.min(1, increment));
  const hasFine = fine < increment;
  const [draft, setDraft] = useState(() => precise(shown));
  const [focused, setFocused] = useState(false);
  const editing = useRef(false);
  const dirty = useRef(false);
  const cancelled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing.current) setDraft(precise(shown));
  }, [shown]);

  const apply = (entered: number) => {
    const bounded = Math.max(lower, Math.min(upper, entered));
    const next = Number(bounded.toFixed(10));
    dirty.current = false;
    setDraft(precise(next));
    if (inputRef.current) inputRef.current.value = precise(next);
    if (Math.abs(next / displayScale - value) > 1e-12) onValueChange(next / displayScale);
  };

  const commit = () => {
    editing.current = false;
    const entered = Number(draft);
    // Focusing a rounded readout must never round the actual position or animation.
    if (cancelled.current || !dirty.current || draft.trim() === '' || !Number.isFinite(entered)) {
      cancelled.current = false;
      dirty.current = false;
      setDraft(precise(shown));
      return;
    }
    apply(entered);
  };

  const nudge = (amount: number) => {
    const entered = Number(draft);
    const source = dirty.current && draft.trim() !== '' && Number.isFinite(entered) ? entered : shown;
    apply(source + amount);
  };

  return (
    <div class="prop-slider-number" onFocusIn={() => setFocused(true)}
      onFocusOut={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}>
      <div class="prop-slider-number-main">
        <input type="range" min={lower} max={upper} step={increment} value={shown}
          aria-label={sliderLabel ?? `${label} slider`}
          onInput={(e) => apply(Number(e.currentTarget.value))} />
        <input ref={inputRef} type="number" min={lower} max={upper} step="any"
          value={focused ? draft : String(Math.round(shown))}
          class="prop-slider-number-input" aria-label={`${label} value`}
          title="Type a value; Enter applies, Escape cancels. Shift + arrow keys makes fine adjustments."
          onFocus={() => { editing.current = true; dirty.current = false; cancelled.current = false; setDraft(precise(shown)); }}
          onInput={(e) => { dirty.current = true; setDraft(e.currentTarget.value); }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelled.current = true; e.currentTarget.blur(); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? fine : increment));
            }
          }} />
        {unit && <span class="prop-slider-unit">{unit}</span>}
      </div>
      {focused && <div class="prop-fine-controls">
        {hasFine && <>
          <span>Fine</span>
          <button type="button" aria-label={`${label} fine decrease`} onMouseDown={(e) => e.preventDefault()}
            onClick={() => nudge(-fine)}>−{fineLabel ?? precise(fine)}{!fineLabel && unit ? ` ${unit}` : ''}</button>
          <button type="button" aria-label={`${label} fine increase`} onMouseDown={(e) => e.preventDefault()}
            onClick={() => nudge(fine)}>+{fineLabel ?? precise(fine)}{!fineLabel && unit ? ` ${unit}` : ''}</button>
          <span class="prop-fine-shortcut">Shift + ↑/↓</span>
        </>}
        {hint && <span class="prop-fine-hint">{hint}</span>}
        {!hasFine && !hint && <span>↑/↓ adjusts by {precise(increment)}{unit ? ` ${unit}` : ''}</span>}
      </div>}
    </div>
  );
}
