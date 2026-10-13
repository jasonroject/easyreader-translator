export type Point = { x: number; y: number };
export type Stroke = { id: string; color: string; width: number; points: Point[] };
export type PageNote = { id: string; point: Point; text: string };
export type PageAnnotations = { strokes: Stroke[]; notes: PageNote[] };
export const emptyAnnotations = (): PageAnnotations => ({ strokes: [], notes: [] });

export function annotationPoint(x: number, y: number, bounds: { left: number; top: number; width: number; height: number }): Point {
  return { x: Math.max(0, Math.min(1000, (x - bounds.left) / bounds.width * 1000)), y: Math.max(0, Math.min(1000, (y - bounds.top) / bounds.height * 1000)) };
}
export function strokePath(points: Point[]) {
  if (!points.length) return '';
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  return points.length === 1 ? `${path} l0.01,0.01` : path;
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('easyreader-annotations', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('pages');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readAnnotations(key: string): Promise<PageAnnotations> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('pages').objectStore('pages').get(key);
      request.onsuccess = () => resolve(request.result || emptyAnnotations());
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function writeAnnotations(key: string, value: PageAnnotations) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pages', 'readwrite');
      tx.objectStore('pages').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('批注保存中断'));
    });
  } finally { db.close(); }
}

// Shared queues survive page changes and closing the editor. Reads wait for pending writes.
const pending = new Map<string, Promise<void>>();
export function saveAnnotations(key: string, value: PageAnnotations) {
  const next = (pending.get(key) || Promise.resolve()).catch(() => {}).then(() => writeAnnotations(key, value));
  pending.set(key, next);
  void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => {});
  return next;
}
export async function loadAnnotations(key: string) {
  await pending.get(key);
  return readAnnotations(key);
}
