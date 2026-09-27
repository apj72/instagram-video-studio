import type { AnimatedProperty, Layer, Project } from './schema.ts';

function scaleProperty<T>(property: AnimatedProperty<T>, ratio: number): AnimatedProperty<T> {
  return { ...property, keyframes: property.keyframes.map(frame => ({ ...frame, time: frame.time * ratio })) };
}

function scaleLayer(layer: Layer, ratio: number, targetDuration: number, alreadyExtended: boolean): Layer {
  const common = {
    inTime: layer.inTime * ratio,
    outTime: alreadyExtended && layer.outTime === targetDuration ? targetDuration : layer.outTime * ratio,
    opacity: scaleProperty(layer.opacity, ratio),
    position: { x: scaleProperty(layer.position.x, ratio), y: scaleProperty(layer.position.y, ratio) },
    scale: { x: scaleProperty(layer.scale.x, ratio), y: scaleProperty(layer.scale.y, ratio) },
    rotation: scaleProperty(layer.rotation, ratio),
  };
  switch (layer.type) {
    case 'image': return { ...layer, ...common, parallaxDuration: layer.parallaxDuration * ratio };
    case 'text': return { ...layer, ...common, fontSize: scaleProperty(layer.fontSize, ratio),
      typewriter: layer.typewriter && { ...layer.typewriter, speed: layer.typewriter.speed / ratio } };
    case 'video': return {
      ...layer, ...common,
      fadeInTime: layer.fadeInTime * ratio,
      fadeOutTime: layer.fadeOutTime * ratio,
      fadeDuration: layer.fadeDuration * ratio,
      slideInTime: layer.slideInTime * ratio,
      slideInDuration: layer.slideInDuration * ratio,
      slideOutTime: layer.slideOutTime * ratio,
      slideOutDuration: layer.slideOutDuration * ratio,
    };
    case 'effect': {
      const config = { ...layer.config };
      for (const key of ['startTime', 'endTime']) {
        if (typeof config[key] === 'number') config[key] = config[key] * ratio;
      }
      for (const key of ['speed', 'speedX', 'speedY']) {
        if (typeof config[key] === 'number') config[key] = config[key] / ratio;
      }
      return { ...layer, ...common, config };
    }
    case 'background-logo': return { ...layer, ...common, speed: layer.speed / ratio };
    case 'group': return { ...layer, ...common, entrance: layer.entrance && {
      ...layer.entrance,
      startTime: layer.entrance.startTime * ratio,
      duration: layer.entrance.duration * ratio,
      stagger: layer.entrance.stagger * ratio,
    } };
    default: return { ...layer, ...common };
  }
}

/** Stretch explicit visual event times by the old-to-new duration ratio. */
export function scaleProjectTimeline(
  project: Project, sourceDuration: number, targetDuration: number, alreadyExtended = false,
): Project {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0 || !Number.isFinite(targetDuration) || targetDuration <= 0) return project;
  const ratio = targetDuration / sourceDuration;
  if (ratio === 1) return project;
  const motion = project.settings.backgroundMotion;
  return {
    ...project,
    settings: {
      ...project.settings,
      duration: targetDuration,
      backgroundMotion: motion && { ...motion, startTime: motion.startTime * ratio, duration: motion.duration * ratio },
    },
    layers: project.layers.map(layer => scaleLayer(layer, ratio, targetDuration, alreadyExtended)),
    audio: {
      ...project.audio,
      fadeInDuration: project.audio.fadeInDuration * ratio,
      fadeOutDuration: project.audio.fadeOutDuration * ratio,
    },
  };
}

/** Change the endpoint while keeping existing events at their current times. */
export function resizeProjectDuration(project: Project, duration: number): Project {
  if (!Number.isFinite(duration) || duration <= 0) return project;
  const previous = project.settings.duration;
  return {
    ...project,
    settings: { ...project.settings, duration },
    layers: project.layers.map(layer => ({
      ...layer,
      outTime: layer.outTime === previous ? duration : layer.outTime,
    })),
  };
}
