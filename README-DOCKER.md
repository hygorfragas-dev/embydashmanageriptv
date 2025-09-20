# Configuração Docker para Emby Manager SaaS

## Problemas Identificados e Soluções

### 1. Erro de Conexão ECONNREFUSED

**Problema**: O container Docker não consegue se conectar ao servidor Emby em `localhost:8096`.

**Causa**: Dentro do container Docker, `localhost` se refere ao próprio container, não ao host.

**Soluções**:

#### Opção A: Usar host.docker.internal (Recomendado para desenvolvimento)
```bash
docker run -p 3000:3000 \
  -v /home/emby-saas/prisma:/app/prisma \
  -e DATABASE_URL="file:./dev.db" \
  -e EMBY_ADMIN_USERNAME="painel" \
  -e EMBY_ADMIN_PASSWORD="#140795Hygor#" \
  emby-saas
```

**Importante**: Configure o servidor Emby para usar `http://host.docker.internal:8096` em vez de `http://localhost:8096`.

#### Opção B: Usar rede do host
```bash
docker run --network host \
  -v /home/emby-saas/prisma:/app/prisma \
  -e DATABASE_URL="file:./dev.db" \
  -e EMBY_ADMIN_USERNAME="painel" \
  -e EMBY_ADMIN_PASSWORD="#140795Hygor#" \
  emby-saas
```

#### Opção C: Usar IP real do servidor Emby
```bash
docker run -p 3000:3000 \
  -v /home/emby-saas/prisma:/app/prisma \
  -e DATABASE_URL="file:./dev.db" \
  -e EMBY_ADMIN_USERNAME="painel" \
  -e EMBY_ADMIN_PASSWORD="#140795Hygor#" \
  emby-saas
```

**Configure o servidor Emby para usar o IP real**: `http://192.168.1.100:8096` (substitua pelo IP real).

### 2. Erro de Compressão Z_DATA_ERROR

**Problema**: Erro na descompressão de dados do servidor Emby.

**Causa**: Problemas com headers de compressão entre o container e o servidor Emby.

**Solução**: O código foi atualizado para usar `Accept-Encoding: identity` que desabilita a compressão e evita esses erros.

### 3. Configuração de Variáveis de Ambiente

**Problema**: As variáveis `EMBY_ADMIN_USERNAME` e `EMBY_ADMIN_PASSWORD` estavam definidas como vazias no Dockerfile.

**Solução**: Sempre passe as variáveis de ambiente no comando `docker run`:

```bash
docker run -p 3000:3000 \
  -e EMBY_ADMIN_USERNAME="seu_usuario_admin" \
  -e EMBY_ADMIN_PASSWORD="sua_senha_admin" \
  -e DATABASE_URL="file:./dev.db" \
  emby-saas
```

## Docker Compose (Recomendado)

Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'
services:
  emby-saas:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./dev.db
      - EMBY_ADMIN_USERNAME=painel
      - EMBY_ADMIN_PASSWORD=#140795Hygor#
    volumes:
      - ./prisma:/app/prisma
    # Para conectar ao Emby no host
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Execute com:
```bash
docker-compose up -d
```

## Verificação de Conectividade

Para testar se o container consegue acessar o Emby:

```bash
# Entre no container
docker exec -it <container_id> sh

# Teste a conectividade
curl -v http://host.docker.internal:8096/emby/System/Info
```

## Logs e Debug

Para visualizar os logs em tempo real:
```bash
docker logs -f <container_id>
```

Os logs agora incluem informações mais detalhadas sobre:
- Erros de conexão com endereço e porta específicos
- Erros de compressão de dados
- Status das requisições HTTP

## Segurança

⚠️ **IMPORTANTE**: Nunca commite credenciais no código. Use:

1. **Variáveis de ambiente** (como mostrado acima)
2. **Docker Secrets** para produção:

```yaml
version: '3.8'
services:
  emby-saas:
    build: .
    secrets:
      - emby_username
      - emby_password
    environment:
      - EMBY_ADMIN_USERNAME_FILE=/run/secrets/emby_username
      - EMBY_ADMIN_PASSWORD_FILE=/run/secrets/emby_password

secrets:
  emby_username:
    file: ./secrets/emby_username.txt
  emby_password:
    file: ./secrets/emby_password.txt
```

3. **Arquivo .env** (não commitado):

```bash
# .env
EMBY_ADMIN_USERNAME=painel
EMBY_ADMIN_PASSWORD=#140795Hygor#
DATABASE_URL=file:./dev.db
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  emby-saas:
    build: .
    env_file: .env
    ports:
      - "3000:3000"
```