import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { email, password, name, serverName, serverUrl, apiKey, type } = await req.json();

  // Verifica se o usuário já existe
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return NextResponse.json({ error: 'Usuário já cadastrado.' }, { status: 400 });
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(password, 10);

  // Cria o usuário
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      serverName,
      serverUrl,
      apiKey,
      type,
    },
  });

  return NextResponse.json({ message: 'Usuário cadastrado com sucesso!', user: { id: user.id, email: user.email, name: user.name, serverName: user.serverName, serverUrl: user.serverUrl, apiKey: user.apiKey, type: user.type, createdAt: user.createdAt } });
} 