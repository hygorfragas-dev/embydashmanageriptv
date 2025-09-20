import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { email, password, name, serverName, serverUrl, apiKey, type } = await req.json();

  // Busca o usuário pelo ID
  const user = await prisma.user.findUnique({ where: { id: Number(params.id) } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  // Só atualiza a senha se o campo password for preenchido
  let hashedPassword = user.password;
  if (password && password !== '') {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  // Atualiza o usuário
  const updatedUser = await prisma.user.update({
    where: { id: Number(params.id) },
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

  return NextResponse.json({ message: 'Usuário atualizado com sucesso!', user: updatedUser });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.user.delete({
      where: { id: Number(params.id) }
    });
    return NextResponse.json({ message: 'Usuário excluído com sucesso!' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir usuário.' }, { status: 500 });
  }
} 