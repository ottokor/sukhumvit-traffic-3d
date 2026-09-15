import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORRIDOR } from '../corridor.js';

test('every point of interest has a non-empty Thai name', () => {
  for (const p of CORRIDOR.pois) {
    assert.ok(typeof p.labelTh === 'string' && p.labelTh.trim().length > 0, p.label);
  }
});

test('airBounds pads the corridor bounds outward on every side', () => {
  const [w, s, e, n] = CORRIDOR.bounds;
  const [aw, as, ae, an] = CORRIDOR.airBounds;
  assert.ok(aw < w && as < s && ae > e && an > n);
});
