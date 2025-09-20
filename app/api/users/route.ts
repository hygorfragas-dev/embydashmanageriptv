import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      serverName: true,
      serverUrl: true,
      apiKey: true,
      type: true,
      createdAt: true
    }
  });
  return NextResponse.json(users);
} 