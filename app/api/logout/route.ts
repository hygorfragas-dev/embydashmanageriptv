import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Criar resposta
  const response = NextResponse.json({
    message: 'Logout realizado com sucesso!'
  });

  // Remover o cookie userType
  response.cookies.set('userType', '', {
    path: '/',
    expires: new Date(0), // Data no passado para expirar imediatamente
    httpOnly: true,
    sameSite: 'strict',
  });

  return response;
}