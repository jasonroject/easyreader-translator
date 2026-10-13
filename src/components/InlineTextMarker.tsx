import React from 'react';
import type { PageNote } from '../services/annotations';
export function InlineTextMarker({ note, label, onClick }: { note: PageNote; label: string; onClick: () => void }) {
  return <button aria-label={label} title="点击编辑页内文字" onClick={onClick} className="absolute z-10 whitespace-pre-wrap break-words rounded bg-amber-50/95 px-1 text-left shadow-sm ring-1 ring-amber-300" style={{ left: `${note.point.x / 10}%`, top: `${note.point.y / 10}%`, width: `${Math.min(300, 1000 - note.point.x) / 10}%`, fontSize: `${(note.fontSize || 18) / 10}cqw`, lineHeight: 1.4, color: note.color || '#dc2626' }}>{note.text || '点击输入文字'}</button>;
}
