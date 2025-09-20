# Estágio 1: Build
# Usa uma imagem Node.js completa para instalar dependências e construir o projeto.
FROM node:18-alpine AS builder

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de manifesto de pacotes
COPY package.json pnpm-lock.yaml* ./

# Instala o pnpm
RUN npm install -g pnpm

# Instala todas as dependências (incluindo devDependencies para o build)
RUN pnpm install

# Copia o restante do código da aplicação
COPY . .

# Gera o cliente Prisma
RUN pnpm prisma generate

# Executa o build da aplicação
RUN pnpm build

# Estágio 2: Produção
# Usa uma imagem Node.js mínima para a execução em produção.
FROM node:18-alpine AS runner

# Define o diretório de trabalho
WORKDIR /app

# Define o ambiente para produção
ENV NODE_ENV=production

# Define as variáveis de ambiente necessárias para o runtime
ENV EMBY_ADMIN_USERNAME=""
ENV EMBY_ADMIN_PASSWORD=""

# Copia a build otimizada do estágio anterior
# A configuração 'standalone' no next.config.mjs garante que a pasta .next/standalone
# contenha apenas o necessário para rodar a aplicação.
COPY --from=builder /app/.next/standalone ./

# Copia os assets estáticos (CSS, JS)
COPY --from=builder /app/.next/static ./.next/static

# Copia a pasta 'public' (se houver imagens, fontes, etc.)
COPY --from=builder /app/public ./public

# Copia o schema do Prisma para a imagem final
COPY --from=builder /app/prisma/schema.prisma ./prisma/

# Copia o script de entrypoint
COPY --from=builder /app/entrypoint.sh ./

# Torna o script executável
RUN chmod +x ./entrypoint.sh

# Expõe a porta em que a aplicação irá rodar
EXPOSE 3000

# Define o entrypoint para executar as migrações antes de iniciar
ENTRYPOINT ["./entrypoint.sh"]

# Define o comando padrão para o entrypoint
CMD ["node", "server.js"]