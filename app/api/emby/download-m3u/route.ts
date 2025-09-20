import { NextRequest, NextResponse } from 'next/server';

function parseM3U(text: string) {
  const lines = text.split(/\r?\n/);
  const canais = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      const attrs = line.match(/([\w-]+)="([^"]*)"/g) || [];
      const attrMap: { [key: string]: string } = {};
      attrs.forEach(attr => {
        const [k, v] = attr.split('=');
        attrMap[k.replace(/\"/g, '')] = v.replace(/\"/g, '');
      });
      const tvgId = attrMap['tvg-id'] || '';
      const tvgName = attrMap['tvg-name'] || '';
      const tvgLogo = attrMap['tvg-logo'] || '';
      const groupTitle = attrMap['group-title'] || '';
      const name = line.split(',').slice(1).join(',').trim();
      const url = lines[i + 1];
      if (url && url.trim() !== '') {
        canais.push({ tvgId, tvgName, tvgLogo, groupTitle, name, url });
      }
      i += 2;
    } else {
      i++;
    }
  }
  return canais;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL não informada.' }, { status: 400 });
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: 'Erro ao baixar arquivo.' }, { status: 400 });
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Erro ao ler arquivo.' }, { status: 400 });
    let received = 0;
    const chunks: Uint8Array[] = [];
    const maxSize = 200 * 1024 * 1024; // 200MB
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > maxSize) {
        return NextResponse.json({ error: 'Arquivo muito grande.' }, { status: 400 });
      }
      chunks.push(value);
    }
    const content = Buffer.concat(chunks).toString('utf-8');
    if (!content.startsWith('#EXTM3U')) {
      return NextResponse.json({ error: 'Arquivo não é um M3U válido.' }, { status: 400 });
    }
    const canais = parseM3U(content);
    return NextResponse.json({ canais });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}