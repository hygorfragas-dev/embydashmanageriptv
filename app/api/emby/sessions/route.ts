import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmby, makeEmbyRequest } from '../../../../lib/emby-auth';

export async function POST(req: NextRequest) {
  try {
    const { serverUrl, apiKey } = await req.json();
    
    console.log('DEBUG - Dados recebidos para sessões:', { serverUrl, apiKey: apiKey ? 'PRESENTE' : 'AUSENTE' });

    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: 'URL do servidor e API Key são obrigatórios.' }, { status: 400 });
    }

    // 1. Autenticar no Emby para obter o token de acesso
    console.log('DEBUG - Iniciando autenticação no Emby para sessões...');
    const authResult = await authenticateEmby({
      serverUrl,
      apiKey,
      useAdminCredentials: true // Usar credenciais administrativas
    });

    if (!authResult.success) {
      console.error("Falha na autenticação no Emby:", authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const accessToken = authResult.accessToken!;
    console.log('DEBUG - Token obtido com sucesso para sessões');

    // 2. Buscar as sessões ativas do Emby
    console.log('DEBUG - Buscando sessões ativas do Emby...');
    const sessionsRes = await makeEmbyRequest(
      `${serverUrl}/Sessions?IncludeAllSessionsIfAdmin=true&IsPlaying=true`, 
      accessToken, 
      {
        method: 'GET'
      }
    );

    console.log('DEBUG - Status da busca de sessões:', sessionsRes.status);
    console.log('DEBUG - Headers da resposta de sessões:', Object.fromEntries(sessionsRes.headers.entries()));

    if (!sessionsRes.ok) {
      const errorBody = await sessionsRes.text();
      console.error("Erro ao buscar sessões do Emby:", errorBody);
      return NextResponse.json({ error: 'Erro ao buscar sessões do Emby.' }, { status: sessionsRes.status });
    }

    let sessions;
    try {
      const sessionsText = await sessionsRes.text();
      console.log('DEBUG - Resposta de sessões (primeiros 200 chars):', sessionsText.substring(0, 200));
      console.log('DEBUG - Tamanho da resposta de sessões:', sessionsText.length);
      sessions = JSON.parse(sessionsText);
      console.log('DEBUG - Número de sessões encontradas:', sessions.length);
    } catch (parseError: any) {
      console.error('DEBUG - Erro ao fazer parse da resposta de sessões:', parseError);
      console.error('DEBUG - Tipo do erro:', parseError.constructor?.name);
      console.error('DEBUG - Stack trace:', parseError.stack);
      return NextResponse.json({ error: 'Erro ao processar resposta de sessões do Emby.' }, { status: 500 });
    }

    // 3. Filtrar sessões que estão reproduzindo IPTV
    let iptvCount = 0;
    
    if (Array.isArray(sessions)) {
      sessions.forEach((session: any) => {
        if (session.NowPlayingItem && session.NowPlayingItem.Path) {
          const path = session.NowPlayingItem.Path.toLowerCase();
          // Verificar se o arquivo tem extensão .m3u8 ou .m3u
          if (path.includes('.m3u8') || path.includes('.m3u')) {
            iptvCount++;
            console.log('DEBUG - Sessão IPTV encontrada:', {
              user: session.UserName,
              item: session.NowPlayingItem.Name,
              path: session.NowPlayingItem.Path
            });
          }
        }
      });
    }

    console.log('DEBUG - Total de usuários reproduzindo IPTV:', iptvCount);

    return NextResponse.json({ 
      iptvCount,
      totalSessions: sessions.length,
      sessions: sessions // Retornar todas as sessões para debug se necessário
    });

  } catch (err: any) {
    console.error("Erro interno na API de sessões:", err);
    console.error("Tipo do erro:", err.constructor.name);
    console.error("Stack trace:", err.stack);
    if (err.cause) {
      console.error("Causa do erro:", err.cause);
    }
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}