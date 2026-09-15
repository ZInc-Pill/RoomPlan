import { isInteractiveElement, isPrimaryPointer, getModifierState } from '../src/utils/input';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✓ ${msg}`);
  }
}

console.log('--- Testing Stage 5F: Drawing & Input Interaction Consolidation ---');

// 1. isInteractiveElement tests
console.log('\n[1] isInteractiveElement target verification:');
const mockDiv = { tagName: 'DIV', isContentEditable: false } as unknown as EventTarget;
const mockInput = { tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget;
const mockTextarea = { tagName: 'TEXTAREA', isContentEditable: false } as unknown as EventTarget;
const mockSelect = { tagName: 'SELECT', isContentEditable: false } as unknown as EventTarget;
const mockEditable = { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget;

assert(isInteractiveElement(null) === false, 'null target is not interactive');
assert(isInteractiveElement(mockDiv) === false, '<div> is not interactive');
assert(isInteractiveElement(mockInput) === true, '<input> is interactive');
assert(isInteractiveElement(mockTextarea) === true, '<textarea> is interactive');
assert(isInteractiveElement(mockSelect) === true, '<select> is interactive');
assert(isInteractiveElement(mockEditable) === true, 'isContentEditable is interactive');

// 2. isPrimaryPointer tests
console.log('\n[2] isPrimaryPointer button verification:');
assert(isPrimaryPointer({ button: 0 }) === true, 'Left click (button 0) is primary');
assert(isPrimaryPointer({ button: 1 }) === false, 'Middle click (button 1) is not primary');
assert(isPrimaryPointer({ button: 2 }) === false, 'Right click (button 2) is not primary');
assert(isPrimaryPointer({ isPrimary: true }) === true, 'Touch primary is primary');
assert(isPrimaryPointer({ isPrimary: false }) === false, 'Touch secondary is not primary');

// 3. getModifierState tests
console.log('\n[3] getModifierState modifier extraction:');
const ePlain = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false } as unknown as KeyboardEvent;
const eCmd = { ctrlKey: false, metaKey: true, shiftKey: false, altKey: false } as unknown as KeyboardEvent;
const eShift = { ctrlKey: false, metaKey: false, shiftKey: true, altKey: false } as unknown as KeyboardEvent;
const eCmdShift = { ctrlKey: false, metaKey: true, shiftKey: true, altKey: false } as unknown as KeyboardEvent;

const sPlain = getModifierState(ePlain);
assert(!sPlain.ctrlOrMeta && !sPlain.shift && !sPlain.alt, 'Plain event has no modifiers');

const sCmd = getModifierState(eCmd);
assert(sCmd.ctrlOrMeta && !sCmd.shift, 'Meta key detected in ctrlOrMeta');

const sShift = getModifierState(eShift);
assert(!sShift.ctrlOrMeta && sShift.shift, 'Shift key detected');

const sCmdShift = getModifierState(eCmdShift);
assert(sCmdShift.ctrlOrMeta && sCmdShift.shift, 'Both Cmd and Shift detected');

console.log('\nAll Stage 5F interaction tests passed successfully! 🎉\n');
