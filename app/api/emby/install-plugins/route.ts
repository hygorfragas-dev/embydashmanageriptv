import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmby, makeEmbyRequest } from '../../../../lib/emby-auth';

export async function POST(req: NextRequest) {
  try {
    const { serverUrl, apiKey, plugins } = await req.json();
    
    console.log('DEBUG - Dados recebidos para instalação de plugins:', { serverUrl, apiKey: apiKey ? 'PRESENTE' : 'AUSENTE', plugins });

    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: 'URL do servidor e API Key são obrigatórios.' }, { status: 400 });
    }

    if (!plugins || !Array.isArray(plugins) || plugins.length === 0) {
      return NextResponse.json({ error: 'Lista de plugins é obrigatória.' }, { status: 400 });
    }

    // 1. Autenticar no Emby para obter o token de acesso
    console.log('DEBUG - Iniciando autenticação no Emby para instalação de plugins...');
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
    console.log('DEBUG - Token obtido com sucesso para instalação de plugins');

    const installResults = [];

    // 2. Instalar cada plugin
    for (const pluginName of plugins) {
      try {
        console.log(`DEBUG - Instalando plugin: ${pluginName}`);
        
        const installUrl = `${serverUrl}/emby/Packages/Installed/${pluginName}`;
        
        const installRes = await makeEmbyRequest(installUrl, accessToken, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log(`DEBUG - Status da instalação do plugin ${pluginName}:`, installRes.status);
        console.log(`DEBUG - Headers da resposta de instalação do ${pluginName}:`, Object.fromEntries(installRes.headers.entries()));

        if (installRes.ok) {
          console.log(`DEBUG - Plugin ${pluginName} instalado com sucesso`);
          installResults.push({
            plugin: pluginName,
            status: 'success',
            message: 'Plugin instalado com sucesso'
          });
        } else {
          const errorBody = await installRes.text();
          console.error(`Erro ao instalar plugin ${pluginName}:`, errorBody);
          installResults.push({
            plugin: pluginName,
            status: 'error',
            message: `Erro ao instalar: ${errorBody}`,
            httpStatus: installRes.status
          });
        }
      } catch (pluginError: any) {
        console.error(`Erro interno ao instalar plugin ${pluginName}:`, pluginError);
        installResults.push({
          plugin: pluginName,
          status: 'error',
          message: `Erro interno: ${pluginError.message}`
        });
      }
    }

    // 3. Verificar se todos os plugins foram instalados com sucesso
    const allSuccess = installResults.every(result => result.status === 'success');
    
    return NextResponse.json({ 
      success: allSuccess,
      results: installResults,
      message: allSuccess ? 'Todos os plugins foram instalados com sucesso' : 'Alguns plugins falharam na instalação'
    });

  } catch (err: any) {
    console.error("Erro interno na API de instalação de plugins:", err);
    console.error("Tipo do erro:", err.constructor.name);
    console.error("Stack trace:", err.stack);
    if (err.cause) {
      console.error("Causa do erro:", err.cause);
    }
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}