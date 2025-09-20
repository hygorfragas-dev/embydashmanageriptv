# Guia de Segurança - Emby SaaS

## 🔒 Configuração de Variáveis de Ambiente

### Para Desenvolvimento Local

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` com suas credenciais reais:
```env
EMBY_ADMIN_USERNAME="seu_usuario_admin"
EMBY_ADMIN_PASSWORD="sua_senha_admin"
```

### Para Produção com Docker

#### Opção 1: Arquivo .env
```bash
# Crie um arquivo .env.production
EMBY_ADMIN_USERNAME="seu_usuario_admin"
EMBY_ADMIN_PASSWORD="sua_senha_admin"

# Execute o container
docker run -d \
  --env-file .env.production \
  -p 3000:3000 \
  emby-saas
```

#### Opção 2: Variáveis de Ambiente Diretas
```bash
docker run -d \
  -e EMBY_ADMIN_USERNAME="seu_usuario_admin" \
  -e EMBY_ADMIN_PASSWORD="sua_senha_admin" \
  -p 3000:3000 \
  emby-saas
```

#### Opção 3: Docker Compose
```yaml
version: '3.8'
services:
  emby-saas:
    build: .
    ports:
      - "3000:3000"
    environment:
      - EMBY_ADMIN_USERNAME=seu_usuario_admin
      - EMBY_ADMIN_PASSWORD=sua_senha_admin
    # OU usando arquivo de ambiente
    # env_file:
    #   - .env.production
```

## ⚠️ Importantes Considerações de Segurança

### ✅ O que foi corrigido:
- ✅ Credenciais removidas do código frontend
- ✅ Credenciais movidas para variáveis de ambiente
- ✅ Nova API route `/api/emby/check-plugin` para verificação segura
- ✅ Autenticação centralizada no backend

### 🚨 Nunca faça:
- ❌ Commitar arquivos `.env` com credenciais reais
- ❌ Expor credenciais no frontend/JavaScript
- ❌ Usar credenciais hardcoded no código
- ❌ Compartilhar credenciais em logs ou mensagens de erro

### 🔐 Recomendações adicionais:
1. **Rotacione as credenciais** regularmente
2. **Use usuários específicos** para cada ambiente (dev/prod)
3. **Monitore logs** para tentativas de acesso não autorizadas
4. **Configure HTTPS** em produção
5. **Use secrets management** em ambientes de produção (Docker Secrets, Kubernetes Secrets, etc.)

## 🛠️ Troubleshooting

### Erro: "Configuração do servidor incompleta"
- Verifique se as variáveis `EMBY_ADMIN_USERNAME` e `EMBY_ADMIN_PASSWORD` estão definidas
- Confirme que o container tem acesso às variáveis de ambiente

### Plugin status sempre "fail"
- Verifique se as credenciais estão corretas
- Confirme se o usuário tem permissões administrativas no Emby
- Verifique se o servidor Emby está acessível