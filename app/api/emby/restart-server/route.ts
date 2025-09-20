import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmby, makeEmbyRequest } from '../../../../lib/emby-auth';

export async function POST(req: NextRequest) {
  try {
    const { serverUrl, apiKey } = await req.json();
    
    console.log('DEBUG - Dados recebidos para reinicialização do servidor:', { serverUrl, apiKey: apiKey ? 'PRESENTE' : 'AUSENTE' });

    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: 'URL do servidor e API Key são obrigatórios.' }, { status: 400 });
    }

    // 1. Autenticar no Emby para obter o token de acesso
    console.log('DEBUG - Iniciando autenticação no Emby para reinicialização...');
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
    console.log('DEBUG - Token obtido com sucesso para reinicialização');

    // 2. Reiniciar o servidor Emby
    console.log('DEBUG - Enviando comando de reinicialização...');
    const restartUrl = `${serverUrl}/emby/System/Restart`;
    
    const restartRes = await makeEmbyRequest(restartUrl, accessToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('DEBUG - Status da reinicialização:', restartRes.status);
    console.log('DEBUG - Headers da resposta de reinicialização:', Object.fromEntries(restartRes.headers.entries()));

    if (restartRes.ok || restartRes.status === 204) {
      console.log('DEBUG - Comando de reinicialização enviado com sucesso');
      return NextResponse.json({ 
        success: true,
        message: 'Comando de reinicialização enviado com sucesso. O servidor será reiniciado em alguns segundos.'
      });
    } else {
      const errorBody = await restartRes.text();
      console.error("Erro ao reiniciar servidor:", errorBody);
      return NextResponse.json({ 
        error: 'Erro ao reiniciar servidor Emby.',
        details: errorBody,
        httpStatus: restartRes.status
      }, { status: restartRes.status });
    }

  } catch (err: any) {
    console.error("Erro interno na API de reinicialização:", err);
    console.error("Tipo do erro:", err.constructor.name);
    console.error("Stack trace:", err.stack);
    if (err.cause) {
      console.error("Causa do erro:", err.cause);
    }
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}