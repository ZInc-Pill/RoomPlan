import { openingValidationError } from './openingAttachment';
import type { PlanDocument } from './documentHistory';
import { ITEM_CATALOG } from '../catalog';

export const PROJECT_LIMIT = 5_000_000;
export const AUTOSAVE_KEY = 'roomplan.project.v1';
export const BACKUP_KEY = 'roomplan.project.backup.v1';
export function parseProject(text: string): PlanDocument {
  if (text.length > PROJECT_LIMIT) throw new Error('Project is too large (maximum 5 MB).');
  let file: any;
  try { file = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!file || typeof file !== 'object') throw new Error('Expected a RoomPlan project.');
  if (file.version !== undefined && file.version !== 1) throw new Error('This project version is not supported.');
  const data = file.version === 1 ? file.document : file;
  const ids = new Set<string>();
  const string = (value: unknown, label: string) => {
    if (typeof value !== 'string' || value.length > 10000) throw new Error(`Invalid ${label}.`);
    return value;
  };
  const number = (value: unknown, label: string, minimum = -1e6) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 1e6) throw new Error(`Invalid ${label}.`);
    return value;
  };
  const point = (p: any) => ({ x: number(p?.x, 'position'), y: number(p?.y, 'position') });
  const id = (entry: any) => {
    const value = string(entry?.id, 'object ID');
    if (!value || ids.has(value)) throw new Error('Object IDs must be unique and nonempty.');
    ids.add(value); return value;
  };
  const optional = (entry: any, keys: string[], numeric = false) => Object.fromEntries(keys.filter(key => entry[key] !== undefined).map(key => [key, numeric ? number(entry[key], key, key === 'elevation' ? 0 : 0.001) : string(entry[key], key)]));
  if (!data || !['walls', 'floors', 'items', 'comments'].every(key => Array.isArray(data[key]) && data[key].length <= 10000)) throw new Error('Project must contain walls, floors, items and comments arrays (maximum 10,000 each).');
  const document: PlanDocument = {
    walls: data.walls.map((w: any) => ({ id: id(w), start: point(w.start), end: point(w.end), thickness: number(w.thickness, 'wall thickness', 0.001), ...optional(w, ['height'], true), ...optional(w, ['color', 'material']) })),
    floors: data.floors.map((f: any) => {
      if (!Array.isArray(f?.points) || f.points.length < 3 || f.points.length > 10000) throw new Error('Floors need 3–10,000 corners.');
      return { id: id(f), points: f.points.map(point), color: string(f.color, 'floor color'), ...optional(f, ['material']) };
    }),
    items: data.items.map((i: any) => {
      const itemId = id(i);
      if (i.wallId !== undefined && (!data.walls.some((wall: any) => wall?.id === i.wallId) || typeof i.wallOffset !== 'number' || !Number.isFinite(i.wallOffset) || i.wallOffset < 0)) throw new Error('Invalid opening wall attachment.');
      if (i.wallId !== undefined && !ITEM_CATALOG.some(type => type.id === i.typeId && ['door', 'window'].includes(type.shape))) throw new Error('Only doors and windows can attach to walls.');
      if (!ITEM_CATALOG.some(type => type.id === i.typeId)) throw new Error('Project contains an unknown furniture type.');
      return { id: itemId, typeId: i.typeId, ...point(i), rotation: number(i.rotation, 'rotation'), ...optional(i, ['width', 'depth', 'height', 'elevation'], true), ...optional(i, ['color', 'material', 'wallId']), ...(i.wallId !== undefined ? { wallOffset: i.wallOffset } : {}) };
    }),
    comments: data.comments.map((c: any) => ({ id: id(c), ...point(c), text: string(c.text, 'note') })),
  };
  const error = openingValidationError(document);
  if (error) throw new Error(error);
  return document;
}

export function serializeProject(document: PlanDocument): string {
  return JSON.stringify({ version: 1, savedAt: new Date().toISOString(), document }, null, 2);
}
