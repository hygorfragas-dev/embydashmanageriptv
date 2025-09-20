#!/bin/sh
# entrypoint.sh

# Executa as migrações do Prisma para garantir que o banco de dados esteja atualizado
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Inicia a aplicação
echo "Starting application..."
exec "$@"