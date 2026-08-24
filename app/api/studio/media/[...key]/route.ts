import { NextRequest, NextResponse } from 'next/server';
import { readBuffer, absolutePath } from '@/lib/studio/storage';
import path from 'path';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.map(decodeURIComponent).join('/');
  try {
    const buf = await readBuffer(storageKey);
    const ext = path.extname(absolutePath(storageKey)).toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Datei nicht gefunden.' }, { status: 404 });
  }
}
