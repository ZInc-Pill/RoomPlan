import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';

// Exercise the actual component's pointer handlers and RAF loop with a deterministic clock.
const effects: (() => void)[] = [], listeners = new Map<string, () => void>();
let callbacks = new Map<number, (now: number) => void>(), nextId = 0, now = 0;
const compiled = await build({ entryPoints: ['src/components/MobileGlide.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'transform', tsconfigRaw: { compilerOptions: { jsx: 'react' } }, plugins: [{ name: 'hook-harness', setup(api) {
  api.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'harness' }));
  api.onLoad({ filter: /.*/, namespace: 'harness' }, () => ({ contents: `export const useRef = current => ({current}); export const useState = initial => [initial, () => {}]; export const useCallback = cb => cb; export const useEffect = cb => globalThis.collectEffect(cb()); export default {createElement:(type,props,...children)=>({type,props:{...props,children}})};`, loader: 'js' }));
} }] });
const sandbox: any = { module: { exports: {} }, performance: { now: () => now }, collectEffect: (cleanup: () => void) => effects.push(cleanup), requestAnimationFrame: (cb: (now: number) => void) => { callbacks.set(++nextId, cb); return nextId; }, cancelAnimationFrame: (id: number) => callbacks.delete(id) };
sandbox.exports = sandbox.module.exports;
sandbox.window = sandbox.document = { addEventListener: (name: string, cb: () => void) => listeners.set(name, cb), removeEventListener: (name: string) => listeners.delete(name) };
runInNewContext(compiled.outputFiles[0].text, sandbox);
const tick = () => { now += 16; const current = callbacks; callbacks = new Map(); current.forEach(cb => cb(now)); };
const findPad = (node: any): any => node?.props?.onPointerDown ? node : node?.props?.children?.map(findPad).find(Boolean);
let moves = 0, vector = [0, 0];
const pad = findPad(sandbox.module.exports.MobileGlide({ label: 'test', onMove: () => moves++, onVector: (x: number, y: number) => { vector = [x, y]; } }));
const target = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 96, height: 96 }), setPointerCapture: () => {}, hasPointerCapture: () => true, releasePointerCapture: () => {} };
const event = (id = 1, x = 80, y = 48) => ({ pointerId: id, isPrimary: true, button: 0, clientX: x, clientY: y, currentTarget: target, preventDefault() {}, stopPropagation() {} });
for (const ending of ['onPointerUp', 'onPointerCancel', 'onLostPointerCapture', 'blur', 'visibilitychange', 'unmount']) {
  pad.props.onPointerDown(event()); tick();
  assert.ok(vector[0] > 0 && moves > 0);
  pad.props.onPointerMove(event(1, 16)); tick();
  assert.ok(vector[0] < 0, 'direction changes immediately');
  pad.props.onPointerCancel(event(2)); tick();
  assert.ok(vector[0] < 0, 'secondary cancellation does not stop owner');
  if (ending === 'unmount') effects.forEach(cleanup => cleanup?.());
  else if (ending === 'blur' || ending === 'visibilitychange') listeners.get(ending)!();
  else pad.props[ending](event());
  const stopped = moves;
  tick(); tick();
  assert.equal(moves, stopped, `${ending} must cancel every pending frame`);
  assert.deepEqual(vector, [0, 0]);
}
console.log('Shared Glide lifecycle: release, pointercancel, lost capture, blur, visibility, unmount, direction reversal and secondary-pointer isolation passed.');
