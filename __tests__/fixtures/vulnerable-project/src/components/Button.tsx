// Intentionally inaccessible fixture — do NOT copy patterns from this file.
import React from 'react';

export function Button({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div onClick={onConfirm} style={{ color: '#cccccc', background: '#dddddd' }}>
      ✕
    </div>
  );
}
