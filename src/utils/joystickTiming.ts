// Snap speed is time-based, independent of free-glide speed or display refresh rate.
export function snapRepeatInterval(deflection: number): number {
  return 300 - Math.max(0, Math.min(1, deflection)) * 160;
}

export function joystickDirection(angle: number): 'up' | 'down' | 'left' | 'right' {
  const x = Math.cos(angle), y = Math.sin(angle);
  return Math.abs(x) >= Math.abs(y) ? x >= 0 ? 'right' : 'left' : y >= 0 ? 'down' : 'up';
}
