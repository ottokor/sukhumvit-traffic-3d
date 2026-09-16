import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AQI_BANDS, aqiBand, aqiColorExpression, shortStationName } from '../scripts/aqi.mjs';

test('aqiBand maps every band boundary to the right name', () => {
  assert.equal(aqiBand(0).name, 'good');
  assert.equal(aqiBand(50).name, 'good');
  assert.equal(aqiBand(51).name, 'moderate');
  assert.equal(aqiBand(100).name, 'moderate');
  assert.equal(aqiBand(101).name, 'unhealthy for sensitive groups');
  assert.equal(aqiBand(150).name, 'unhealthy for sensitive groups');
  assert.equal(aqiBand(151).name, 'unhealthy');
  assert.equal(aqiBand(200).name, 'unhealthy');
  assert.equal(aqiBand(201).name, 'very unhealthy');
  assert.equal(aqiBand(300).name, 'very unhealthy');
  assert.equal(aqiBand(301).name, 'hazardous');
  assert.equal(aqiBand(9999).name, 'hazardous');
});

test('every band has a distinct colour', () => {
  const colors = new Set(AQI_BANDS.map((b) => b.color));
  assert.equal(colors.size, AQI_BANDS.length);
});

test('aqiColorExpression places a stop just above every band boundary', () => {
  const expr = aqiColorExpression();
  assert.deepEqual(expr.slice(0, 2), ['step', ['get', 'aqi']]);
  const stops = [];
  for (let i = 3; i < expr.length; i += 2) stops.push(expr[i]);
  assert.deepEqual(stops, [51, 101, 151, 201, 301]);
});

test('shortStationName strips the trailing city/country and any Thai parenthetical', () => {
  assert.equal(shortStationName('Nonsi Witthaya School, Bangkok, Thailand'), 'Nonsi Witthaya School');
  assert.equal(
    shortStationName('Chulalongkorn Hospital (โรงพยาบาลจุฬาลงกรณ์), Bangkok, Thailand'),
    'Chulalongkorn Hospital',
  );
  assert.equal(shortStationName('Din Daeng'), 'Din Daeng');
  assert.equal(shortStationName(''), '');
});
