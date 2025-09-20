# Emby Manager SaaS

## 📋 Visão Geral

O **Emby Manager SaaS** é uma aplicação web desenvolvida em Next.js que permite o gerenciamento centralizado de múltiplos servidores Emby através de uma interface web moderna e intuitiva. O sistema funciona como um SaaS (Software as a Service) onde um administrador pode cadastrar usuários que, por sua vez, podem gerenciar os usuários de seus próprios servidores Emby através da API oficial do Emby.

## 🎯 Objetivo do Sistema

### O que o sistema PRECISA fazer:
- **Gerenciamento Multi-tenant**: Permitir que múltiplos usuários gerenciem seus próprios servidores Emby de forma isolada
- **Autenticação Segura**: Sistema de login diferenciado para administradores e usuários regulares
- **Integração com API Emby**: Comunicação direta com a API do Emby para operações CRUD de usuários
- **Interface Completa**: Painel para criação, edição e exclusão de usuários Emby com todas as políticas e configurações
- **Persistência de Dados**: Armazenamento permanente de configurações de servidores e usuários do SaaS

### O que o sistema JÁ faz:
- ✅ **Sistema de Autenticação Completo**
  - Login de administrador com credenciais fixas
  - Login de usuários regulares do SaaS
  - Redirecionamento automático baseado no tipo de usuário
  - Proteção de rotas por tipo de usuário

- ✅ **Painel Administrativo Funcional**
  - Criação e edição de usuários do SaaS
  - Configuração de servidores Emby (nome, URL, porta, API key)
  - Gerenciamento de credenciais e tipos de usuário
  - Interface responsiva e moderna

- ✅ **Dashboard de Usuário Completo**
  - Visualização de usuários do servidor Emby
  - Criação de novos usuários Emby com interface em abas
  - Edição completa de usuários existentes
  - Configuração de todas as políticas do Emby:
    - Permissões de mídia (reprodução, download, exclusão)
    - Configurações de transcodificação
    - Limites de streaming simultâneo
    - Configurações de reprodução (legendas, áudio, etc.)

- ✅ **Interface Moderna e Responsiva**
  - Design clean e profissional
  - Cards interativos para usuários
  - Formulários organizados em abas
  - Feedback visual com badges e ícones
  - Totalmente responsivo para desktop e mobile

## 🏗️ Arquitetura do Sistema

### Estrutura de Arquivos
\`\`\`
app/
├── page.tsx                 # Página de login principal
├── admin/
│   └── page.tsx            # Painel administrativo
├── dashboard/
│   └── page.tsx            # Dashboard do usuário
├── layout.tsx              # Layout principal
└── globals.css             # Estilos globais

components/ui/              # Componentes shadcn/ui
├── button.tsx
├── card.tsx
├── input.tsx
├── dialog.tsx
├── tabs.tsx
└── ...

public/images/              # Imagens de referência do Emby
├── emby-interface-1.png
├── emby-interface-2.png
└── emby-users.png
\`\`\`

### Tipos de Dados

#### SaasUser (Usuário do SaaS)
\`\`\`typescript
interface SaasUser {
  id: string                 // ID único do usuário
  serverName: string         // Nome do servidor Emby
  serverUrl: string          // URL completa do servidor (ex: http://localhost:8096)
  apiKey: string            // Chave da API do Emby
  username: string          // Nome do usuário no SaaS
  password: string          // Senha do usuário no SaaS
  email: string             // Email do usuário
  type: "admin" | "user"    // Tipo de usuário
  createdAt: string         // Data de criação
}
\`\`\`

#### EmbyUser (Usuário do Servidor Emby)
\`\`\`typescript
interface EmbyUser {
  id: string                // ID do usuário no Emby
  name: string              // Nome do usuário
  serverId: string          // ID do servidor Emby
  hasPassword: boolean      // Se tem senha configurada
  isAdministrator: boolean  // Se é administrador
  isDisabled: boolean       // Se está desabilitado
  lastActivityDate: string  // Última atividade
  policy: {                 // Políticas de acesso
    isAdministrator: boolean
    isHidden: boolean
    enableMediaPlayback: boolean
    enableAudioPlaybackTranscoding: boolean
    enableVideoPlaybackTranscoding: boolean
    enablePlaybackRemuxing: boolean
    enableContentDeletion: boolean
    enableContentDownloading: boolean
    enableSubtitleDownloading: boolean
    enableSubtitleManagement: boolean
    enableLiveTvAccess: boolean
    enableLiveTvManagement: boolean
    enableRemoteAccess: boolean
    enableSyncTranscoding: boolean
    enableMediaConversion: boolean
    enableAllChannels: boolean
    enableAllDevices: boolean
    enableAllFolders: boolean
    simultaneousStreamLimit: number
    remoteClientBitrateLimit: number
  }
  configuration: {          // Configurações de reprodução
    playDefaultAudioTrack: boolean
    subtitleMode: string
    enableNextEpisodeAutoPlay: boolean
    resumeRewindSeconds: number
  }
}
\`\`\`

## 🔐 Lógica de Autenticação

### Fluxo de Autenticação

1. **Página de Login (`app/page.tsx`)**
   - Interface única para todos os tipos de usuário
   - Validação de credenciais no frontend
   - Redirecionamento baseado no tipo de usuário

2. **Validação de Credenciais**
   \`\`\`typescript
   // Administrador (credenciais fixas)
   if (email === "hygorfragas@gmail.com" && password === "140795Hygor") {
     localStorage.setItem("isAdmin", "true")
     localStorage.setItem("userEmail", email)
     router.push("/admin")
   }
   
   // Usuário regular (busca no localStorage)
   const users = JSON.parse(localStorage.getItem("saasUsers") || "[]")
   const user = users.find(u => u.email === email && u.password === password)
   if (user) {
     localStorage.setItem("isAdmin", "false")
     localStorage.setItem("userEmail", email)
     localStorage.setItem("currentUser", JSON.stringify(user))
     router.push("/dashboard")
   }
   \`\`\`

3. **Proteção de Rotas**
   - Cada página verifica o tipo de usuário no `useEffect`
   - Redirecionamento automático se não autorizado
   - Dados do usuário carregados do localStorage

### Estados de Autenticação

- **`isAdmin`**: "true" | "false" | null
- **`userEmail`**: Email do usuário logado
- **`currentUser`**: Dados completos do usuário (apenas para users)

### Credenciais de Teste

**Administrador:**
- Email: `hygorfragas@gmail.com`
- Senha: `140795Hygor`

**Usuário Teste:**
- Email: `teste@exemplo.com`
- Senha: `123456`

## 💾 Persistência de Dados

### Estado Atual (localStorage)
Atualmente, o sistema utiliza o `localStorage` do navegador para persistir dados:

\`\`\`typescript
// Usuários do SaaS
localStorage.setItem("saasUsers", JSON.stringify(users))

// Estado de autenticação
localStorage.setItem("isAdmin", "true")
localStorage.setItem("userEmail", email)
localStorage.setItem("currentUser", JSON.stringify(user))
\`\`\`

### Para Tornar os Dados Permanentes

#### Opção 1: Supabase (Recomendado)
\`\`\`bash
npm install @supabase/supabase-js
\`\`\`

**Estrutura de Tabelas:**
\`\`\`sql
-- Tabela de usuários do SaaS
CREATE TABLE saas_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_name VARCHAR NOT NULL,
  server_url VARCHAR NOT NULL,
  api_key VARCHAR NOT NULL,
  username VARCHAR NOT NULL,
  password VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  type VARCHAR CHECK (type IN ('admin', 'user')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sessões (opcional)
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES saas_users(id),
  session_token VARCHAR NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

#### Opção 2: Neon Database
\`\`\`bash
npm install @neondatabase/serverless
\`\`\`

#### Opção 3: MongoDB
\`\`\`bash
npm install mongodb mongoose
\`\`\`

### Implementação de Persistência

1. **Criar cliente do banco de dados**
2. **Substituir localStorage por chamadas de API**
3. **Implementar Server Actions para operações CRUD**
4. **Adicionar middleware de autenticação**
5. **Implementar sistema de sessões JWT**

## 🔌 Integração com API do Emby

### Endpoints da API Emby Utilizados

\`\`\`typescript
// Base URL: {serverUrl}/emby

// Listar usuários
GET /Users?api_key={apiKey}

// Criar usuário
POST /Users/New?api_key={apiKey}
Body: {
  Name: string,
  Password: string
}

// Atualizar usuário
POST /Users/{userId}?api_key={apiKey}
Body: EmbyUser

// Atualizar política do usuário
POST /Users/{userId}/Policy?api_key={apiKey}
Body: UserPolicy

// Deletar usuário
DELETE /Users/{userId}?api_key={apiKey}

// Atualizar configuração do usuário
POST /Users/{userId}/Configuration?api_key={apiKey}
Body: UserConfiguration
\`\`\`

### Implementação das Chamadas API

\`\`\`typescript
// Exemplo de implementação
const embyApi = {
  baseUrl: currentUser.serverUrl,
  apiKey: currentUser.apiKey,
  
  async getUsers() {
    const response = await fetch(`${this.baseUrl}/emby/Users?api_key=${this.apiKey}`)
    return response.json()
  },
  
  async createUser(userData: Partial<EmbyUser>) {
    const response = await fetch(`${this.baseUrl}/emby/Users/New?api_key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    return response.json()
  },
  
  async updateUser(userId: string, userData: Partial<EmbyUser>) {
    const response = await fetch(`${this.baseUrl}/emby/Users/${userId}?api_key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    return response.json()
  },
  
  async deleteUser(userId: string) {
    const response = await fetch(`${this.baseUrl}/emby/Users/${userId}?api_key=${this.apiKey}`, {
      method: 'DELETE'
    })
    return response.ok
  }
}
\`\`\`

## 🚀 Próximos Passos para Produção

### 1. Implementar Persistência Real
- [ ] Configurar Supabase ou outro banco de dados
- [ ] Migrar dados do localStorage para o banco
- [ ] Implementar Server Actions para operações CRUD

### 2. Melhorar Autenticação
- [ ] Implementar JWT tokens
- [ ] Adicionar middleware de autenticação
- [ ] Sistema de refresh tokens
- [ ] Hash de senhas com bcrypt

### 3. Integração Real com Emby
- [ ] Substituir dados mock por chamadas reais à API
- [ ] Implementar tratamento de erros da API
- [ ] Adicionar validação de conectividade do servidor
- [ ] Cache de dados para melhor performance

### 4. Funcionalidades Adicionais
- [ ] Reset de senha
- [ ] Logs de atividade
- [ ] Monitoramento de saúde dos servidores
- [ ] Operações em lote para usuários
- [ ] Backup e restore de configurações

### 5. Melhorias de UX/UI
- [ ] Loading states
- [ ] Notificações toast
- [ ] Confirmações de ações destrutivas
- [ ] Paginação para muitos usuários
- [ ] Busca e filtros

## 🛠️ Tecnologias Utilizadas

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes de UI
- **Lucide React** - Ícones
- **localStorage** - Persistência temporária (a ser substituída)

## 📝 Notas para Desenvolvimento

### Estrutura de Dados Mock
O sistema atualmente utiliza dados mock para demonstração. Os usuários Emby de exemplo incluem:
- `hygorfragas` (administrador)
- `denisecastro` (usuário regular)

### Configurações de Políticas
Todas as políticas do Emby foram mapeadas e estão disponíveis na interface:
- Permissões de mídia
- Configurações de transcodificação  
- Limites de streaming
- Configurações de reprodução
- Acesso a recursos específicos

### Responsividade
A interface foi desenvolvida com mobile-first e é totalmente responsiva, adaptando-se a diferentes tamanhos de tela.

---

Este README serve como documentação completa para desenvolvedores que precisam entender, manter ou expandir o sistema Emby Manager SaaS.
