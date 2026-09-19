import assert from 'node:assert/strict';
import { snapRepeatInterval, joystickDirection } from '../src/utils/joystickTiming';
assert.equal(snapRepeatInterval(1), 140);
assert.equal(snapRepeatInterval(0.5), 220);
assert.equal(snapRepeatInterval(5), 140);
assert.equal(snapRepeatInterval(-1), 300);
for (const [angle, expected] of [[0, 'right'], [Math.PI / 2, 'down'], [Math.PI, 'left'], [-Math.PI / 2, 'up']] as const) {
  assert.equal(joystickDirection(angle), expected);
}
console.log('Joystick repeat intervals, bounds and cardinal direction checks passed.');
