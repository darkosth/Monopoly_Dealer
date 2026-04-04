import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const { roomCode, requesterId, targetPlayerId, amount } = body;

    if (!roomCode || !amount || amount <= 0 || !requesterId || !targetPlayerId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const session = await prisma.gameSession.findUnique({
      where: { roomCode },
      include: { players: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let targets = [];
    if (targetPlayerId === 'all') {
      targets = session.players.filter(p => p.id !== requesterId).map(p => p.id);
    } else {
      targets = [targetPlayerId];
    }

    if (targets.length === 0) {
      return NextResponse.json({ error: 'No valid targets found' }, { status: 400 });
    }

    const operations = targets.map(targetId => 
      prisma.paymentRequest.create({
        data: {
          amount,
          requesterId,
          targetPlayerId: targetId,
          gameSessionId: session.id,
          status: 'PENDING'
        }
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, count: targets.length });

  } catch (error) {
    console.error('Create payment request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('roomCode');
    const playerId = searchParams.get('playerId');

    if (!roomCode || !playerId) {
      return NextResponse.json({ error: 'Params missing' }, { status: 400 });
    }

    const session = await prisma.gameSession.findUnique({
      where: { roomCode }
    });

    if (!session) return NextResponse.json({ error: 'Session not found'}, { status: 404 });

    const requests = await prisma.paymentRequest.findMany({
      where: {
        gameSessionId: session.id,
        targetPlayerId: playerId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
