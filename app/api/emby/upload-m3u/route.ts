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
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    if (file.size > 200 * 1024 * 1024) { // 200MB
        return NextResponse.json({ error: 'Arquivo muito grande.' }, { status: 400 });
    }

    const content = await file.text();

    if (!content.startsWith('#EXTM3U')) {
      return NextResponse.json({ error: 'Arquivo não é um M3U válido.' }, { status: 400 });
    }

    const canais = parseM3U(content);
    return NextResponse.json({ canais });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}