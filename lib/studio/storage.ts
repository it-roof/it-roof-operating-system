import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { studioConfig } from './config';

function rootDir() {
  return studioConfig.outputDir.trim() || path.join(process.cwd(), 'storage', 'studio');
}

export function storageKey(jobId: string, variantIndex: number, ext: string) {
  return `${jobId}/${variantIndex}.${ext.replace(/^\./, '')}`;
}

export function absolutePath(key: string) {
  const resolved = path.resolve(rootDir(), key);
  const root = path.resolve(rootDir());
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error('Ungültiger Speicherpfad.');
  }
  return resolved;
}

export async function saveBuffer(key: string, data: Buffer) {
  const full = absolutePath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function readBuffer(key: string) {
  return readFile(absolutePath(key));
}

export function publicMediaUrl(key: string) {
  return `/api/studio/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export function reachableMediaUrl(key: string) {
  const base = studioConfig.publicBaseUrl;
  if (!base) return null;
  return `${base}${publicMediaUrl(key)}`;
}
