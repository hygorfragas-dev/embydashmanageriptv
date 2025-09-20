import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmby, makeEmbyRequest } from '../../../../lib/emby-auth';

export async function POST(req: NextRequest) {
  try {
    const { serverUrl, apiKey } = await req.json();
    
    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: 'URL do servidor e API Key são obrigatórios.' }, { status: 400 });
    }

    // 1. Autenticar no Emby para obter o token de acesso
    const authResult = await authenticateEmby({
      serverUrl,
      apiKey,
      useAdminCredentials: true // Usar credenciais administrativas
    });

    if (!authResult.success) {
      console.error('Falha na autenticação no Emby:', authResult.error);
      return NextResponse.json({ status: 'fail' });
    }

    const token = authResult.accessToken!;

    // 2. Buscar plugins usando o token e makeEmbyRequest
    const pluginsUrl = `${serverUrl}/emby/Plugins`;
    
    const pluginsRes = await makeEmbyRequest(pluginsUrl, token);
    
    if (!pluginsRes.ok) {
      console.error('Erro ao buscar plugins:', pluginsRes.status, await pluginsRes.text());
      return NextResponse.json({ status: 'fail' });
    }

    const plugins = await pluginsRes.json();
    
    // 3. Verificar se os plugins IPTV e Reports estão instalados
    const iptvPluginFound = (plugins || []).some((plugin: any) =>
      plugin.ConfigurationFileName === "MediaBrowser.Channels.IPTV.xml" &&
      plugin.Id === "c333f63b-83e9-48d2-8b9a-c5aba546fb1e" &&
      plugin.Name === "IPTV"
    );

    const reportsPluginFound = (plugins || []).some((plugin: any) =>
      plugin.Id === "2fe79c34-c9dc-4d94-9df2-2f3f36764414"
    );

    return NextResponse.json({
      status: (iptvPluginFound && reportsPluginFound) ? 'ok' : 'fail',
      plugins: {
        iptv: iptvPluginFound,
        reports: reportsPluginFound
      }
    });

  } catch (error: any) {
    console.error('Erro interno na verificação de plugin:', error);
    
    // Verificar se é erro de conexão
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      console.error('Erro de conexão: Servidor Emby não está acessível em', error.cause.address + ':' + error.cause.port);
      return NextResponse.json({ 
        status: 'fail', 
        error: 'Servidor Emby não está acessível. Verifique se o Emby está rodando e acessível.' 
      });
    }
    
    // Verificar se é erro de compressão
    if (error.cause && error.cause.code === 'Z_DATA_ERROR') {
      console.error('Erro de compressão de dados. Tentando novamente sem compressão.');
      return NextResponse.json({ 
        status: 'fail', 
        error: 'Erro na descompressão de dados do servidor Emby.' 
      });
    }
    
    return NextResponse.json({ 
      status: 'fail', 
      error: 'Erro interno na verificação de plugins.' 
    });
  }
}