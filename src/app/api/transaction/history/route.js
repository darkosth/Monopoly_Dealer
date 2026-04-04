import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('roomCode');

    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 });
    }

    const gameSession = await prisma.gameSession.findUnique({
      where: { roomCode }
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const transactions = await prisma.transactionLog.findMany({
      where: { gameSessionId: gameSession.id },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limitar a las últimas 100 transacciones
    });

    return NextResponse.json({ transactions });

  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction history' }, { status: 500 });
  }
}
