interface EmbyAuthConfig {
  serverUrl: string;
  apiKey: string;
  username?: string;
  password?: string;
  useAdminCredentials?: boolean;
}

interface EmbyAuthResponse {
  success: boolean;
  accessToken?: string;
  userId?: string;
  error?: string;
}

/**
 * Função utilitária padronizada para autenticação no Emby
 */
export async function authenticateEmby(config: EmbyAuthConfig): Promise<EmbyAuthResponse> {
  try {
    const { serverUrl, apiKey, useAdminCredentials = false } = config;

    // Determinar credenciais baseado no tipo de autenticação
    let username: string;
    let password: string;

    if (useAdminCredentials) {
      // Usar credenciais administrativas
      username = process.env.EMBY_ADMIN_USERNAME || '';
      password = process.env.EMBY_ADMIN_PASSWORD || '';
      
      if (!username || !password) {
        return {
          success: false,
          error: 'Credenciais administrativas não configuradas nas variáveis de ambiente.'
        };
      }
    } else {
      // Usar credenciais do painel
      username = config.username || 'painel';
      password = config.password || process.env.EMBY_PANEL_PASSWORD || '';
      
      if (!password) {
        return {
          success: false,
          error: 'Senha do painel não configurada no backend.'
        };
      }
    }

    // Construir URL do endpoint
    const authUrl = `${serverUrl}/emby/Users/AuthenticateByName?api_key=${apiKey}`;

    // Headers padronizados
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'identity',
      'User-Agent': 'Painel/1.0.0'
    };

    // Adicionar header de autorização para credenciais administrativas
    if (useAdminCredentials) {
      headers['X-Emby-Authorization'] = `Emby UserId="", Client="Painel", Device="Painel", DeviceId="123", Version="1.0.0", Token=""`;
    }

    // Body da requisição
    const body: any = {
      Username: username,
      Pw: password
    };

    // Incluir ApiKey no body para credenciais administrativas
    if (useAdminCredentials) {
      body.ApiKey = apiKey;
    }

    console.log(`[EmbyAuth] Iniciando autenticação para usuário: ${username}`);

    const response = await fetch(authUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    console.log(`[EmbyAuth] Status da resposta: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EmbyAuth] Falha na autenticação:`, errorText);
      return {
        success: false,
        error: `Falha na autenticação no Emby (${response.status})`
      };
    }

    let authData;
    try {
      const responseText = await response.text();
      authData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[EmbyAuth] Erro ao fazer parse da resposta:', parseError);
      return {
        success: false,
        error: 'Erro ao processar resposta de autenticação.'
      };
    }

    const accessToken = authData.AccessToken;
    const userId = authData.User?.Id;

    if (!accessToken) {
      console.error('[EmbyAuth] Token não encontrado na resposta:', authData);
      return {
        success: false,
        error: 'Token de acesso não retornado pelo Emby.'
      };
    }

    console.log('[EmbyAuth] Autenticação realizada com sucesso');

    return {
      success: true,
      accessToken,
      userId
    };

  } catch (error: any) {
    console.error('[EmbyAuth] Erro interno:', error);
    return {
      success: false,
      error: error.message || 'Erro interno na autenticação.'
    };
  }
}

/**
 * Função para fazer requisições autenticadas ao Emby
 */
export async function makeEmbyRequest(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    'X-Emby-Token': accessToken,
    'Accept': 'application/json',
    'Accept-Encoding': 'identity',
    'User-Agent': 'Painel/1.0.0',
    ...options.headers
  };

  return fetch(url, {
    ...options,
    headers
  });
}