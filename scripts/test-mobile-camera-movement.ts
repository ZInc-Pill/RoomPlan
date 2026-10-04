import assert from 'node:assert/strict';
import { Quaternion, Vector3, Euler } from 'three';
import { cameraRelativeGlide } from '../src/utils/mobileCameraMovement';
for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.72]) {
  for (const pitch of [-0.2, -1.2, -Math.PI / 2 + 0.00001]) {
    const q = new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'));
    const right = new Vector3(1, 0, 0).applyQuaternion(q);
    const delta = cameraRelativeGlide(1, 0, right.x, right.z);
    assert.ok(Math.abs(delta.x * right.x + delta.y * right.z - 1) < 1e-6, 'right matches camera at every pitch');
    const down = cameraRelativeGlide(0, 1, right.x, right.z);
    assert.ok(Math.abs(delta.x * down.x + delta.y * down.y) < 1e-6);
    const reverse = cameraRelativeGlide(-1, 0, right.x, right.z);
    assert.ok(Math.abs(delta.x + reverse.x) < 1e-6 && Math.abs(delta.y + reverse.y) < 1e-6);
    const diagonal = cameraRelativeGlide(3, 4, right.x, right.z);
    assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 5) < 1e-6);
  }
}
assert.deepEqual(cameraRelativeGlide(1, 0, 0, 0), { x: 1, y: 0 });
console.log('Mobile Glide camera basis: 15 yaw/pitch combinations, near-top-down, reversals and speed preservation passed.');
