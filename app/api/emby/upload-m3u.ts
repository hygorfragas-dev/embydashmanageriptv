import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseM3U(text: string) {
  const lines = text.split(/\r?\n/);
  const canais = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      const attrs = line.match(/([\w-]+)="([^"]*)"/g) || [];
      const attrMap = {};
      attrs.forEach(attr => {
        const [k, v] = attr.split('=');
        attrMap[k.replace(/\"/g, '')] = v.replace(/\"/g, '');
      });
      const tvgId = attrMap['tvg-id'] || '';
      if (tvgId) {
        const tvgName = attrMap['tvg-name'] || '';
        const tvgLogo = attrMap['tvg-logo'] || '';
        const groupTitle = attrMap['group-title'] || '';
        const name = line.split(',').slice(1).join(',').trim();
        const url = lines[i + 1] || '';
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
  return new Promise((resolve) => {
    const form = formidable({
      maxFileSize: 200 * 1024 * 1024, // 200MB
      multiples: false,
    });
    form.parse(req as any, async (err, fields, files) => {
      if (err) {
        resolve(NextResponse.json({ error: 'Arquivo muito grande ou inválido.' }, { status: 400 }));
        return;
      }
      const file = files.file;
      if (!file) {
        resolve(NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 }));
        return;
      }
      const filePath = Array.isArray(file) ? file[0].filepath : file.filepath;
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.startsWith('#EXTM3U')) {
        resolve(NextResponse.json({ error: 'Arquivo não é um M3U válido.' }, { status: 400 }));
        return;
      }
      const canais = parseM3U(content);
      resolve(NextResponse.json({ canais }));
    });
  });
} 