// Intentionally inefficient fixture — do NOT copy patterns from this file.
import * as _ from 'lodash';
import React from 'react';

export function Hero() {
  const sorted = _.sortBy([3, 1, 2]);
  return (
    <section>
      <h1>Welcome</h1>
      <h4>Sub section skips levels</h4>
      <img src="/hero-4k-unoptimized.png" />
      <p>{sorted.join(',')}</p>
    </section>
  );
}
