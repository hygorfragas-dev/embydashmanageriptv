import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmby, makeEmbyRequest } from '../../../../lib/emby-auth';

export async function POST(req: NextRequest) {
  try {
    const { serverUrl, apiKey } = await req.json();
    
    console.log('DEBUG - Dados recebidos:', { serverUrl, apiKey: apiKey ? 'PRESENTE' : 'AUSENTE' });

    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: 'URL do servidor e API Key são obrigatórios.' }, { status: 400 });
    }

    // 1. Autenticar no Emby para obter o token de acesso
    console.log('DEBUG - Iniciando autenticação no Emby...');
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
    console.log('DEBUG - Token obtido com sucesso');

    // 2. Buscar os usuários do Emby usando o token
    console.log('DEBUG - Buscando usuários do Emby...');
    const usersRes = await makeEmbyRequest(`${serverUrl}/Users`, accessToken, {
      method: 'GET'
    });

    console.log('DEBUG - Status da busca de usuários:', usersRes.status);
    console.log('DEBUG - Headers da resposta de usuários:', Object.fromEntries(usersRes.headers.entries()));

    if (!usersRes.ok) {
      const errorBody = await usersRes.text();
      console.error("Erro ao buscar usuários do Emby:", errorBody);
      return NextResponse.json({ error: 'Erro ao buscar usuários do Emby.' }, { status: usersRes.status });
    }

    let embyUsers;
    try {
      const usersText = await usersRes.text();
      console.log('DEBUG - Resposta de usuários (primeiros 200 chars):', usersText.substring(0, 200));
      console.log('DEBUG - Tamanho da resposta:', usersText.length);
      embyUsers = JSON.parse(usersText);
      console.log('DEBUG - Número de usuários encontrados:', embyUsers.length);
    } catch (parseError: any) {
      console.error('DEBUG - Erro ao fazer parse da resposta de usuários:', parseError);
      console.error('DEBUG - Tipo do erro:', parseError.constructor?.name);
      console.error('DEBUG - Stack trace:', parseError.stack);
      return NextResponse.json({ error: 'Erro ao processar resposta de usuários do Emby.' }, { status: 500 });
    }

    return NextResponse.json(embyUsers);

  } catch (err: any) {
    console.error("Erro interno na API:", err);
    console.error("Tipo do erro:", err.constructor.name);
    console.error("Stack trace:", err.stack);
    if (err.cause) {
      console.error("Causa do erro:", err.cause);
    }
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}