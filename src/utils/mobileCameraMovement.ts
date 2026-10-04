/** Camera's horizontal right vector gives a stable floor basis even at a top-down view. */
export function cameraRelativeGlide(x: number, y: number, rightX: number, rightZ: number) {
  const length = Math.hypot(rightX, rightZ);
  const rx = length > 1e-6 ? rightX / length : 1;
  const rz = length > 1e-6 ? rightZ / length : 0;
  return { x: rx * x - rz * y, y: rz * x + rx * y };
}
