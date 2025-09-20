import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmby } from '../../../lib/emby-auth';

export async function POST(req: NextRequest) {
  try {
    const { serverUrl, apiKey } = await req.json();
    
    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: 'URL do servidor e API Key são obrigatórios.' }, { status: 400 });
    }

    const authResult = await authenticateEmby({
      serverUrl,
      apiKey,
      useAdminCredentials: false // Usar credenciais do painel
    });

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    return NextResponse.json({
      accessToken: authResult.accessToken,
      userId: authResult.userId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}