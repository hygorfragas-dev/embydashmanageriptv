import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // Busca o usuário
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 400 });
  }

  // Compara a senha
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 400 });
  }

  const response = NextResponse.json({
    message: 'Login realizado com sucesso!',
    user: { id: user.id, email: user.email, name: user.name, type: user.type, serverUrl: user.serverUrl, apiKey: user.apiKey }
  });

  // Define o cookie com o tipo de usuário
  if (user.type) {
    response.cookies.set('userType', user.type, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 1 semana
    });
  }

  return response;
}