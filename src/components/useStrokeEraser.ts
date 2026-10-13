import { useRef } from 'react';
import type React from 'react';
import { annotationPoint, Point, PageAnnotations } from '../services/annotations';
import { remainingStrokes } from '../services/eraser';

export function useStrokeEraser(current: React.RefObject<PageAnnotations>, change: (value: PageAnnotations) => void, persist: (value: PageAnnotations) => void) {
  const gesture = useRef<{ id: number; last: Point; changed: boolean } | null>(null);
  const sweep = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = annotationPoint(event.clientX, event.clientY, bounds);
    const strokes = remainingStrokes(current.current.strokes, active.last, point, bounds);
    active.last = point;
    if (strokes.length === current.current.strokes.length) return;
    const next = { ...current.current, strokes };
    if (active.changed) persist(next); else change(next);
    active.changed = true;
  };
  return {
    start(event: React.PointerEvent<SVGSVGElement>) {
      gesture.current = { id: event.pointerId, last: annotationPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()), changed: false };
      event.currentTarget.setPointerCapture(event.pointerId); sweep(event);
    },
    move: sweep,
    finish(event: React.PointerEvent<SVGSVGElement>) {
      if (gesture.current?.id !== event.pointerId) return;
      gesture.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
  };
}
