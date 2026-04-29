import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { requesterId, targetPlayerId } = await request.json();

    if (!requesterId || !targetPlayerId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const hostCheck = await prisma.player.findUnique({ where: { id: requesterId } });
    if (!hostCheck || !hostCheck.isHost) {
      return NextResponse.json({ error: 'Unauthorized: Banker powers only' }, { status: 403 });
    }

    // Obtener Free Parking actual
    const session = await prisma.gameSession.findUnique({
      where: { id: hostCheck.gameSessionId }
    });

    if (!session || session.freeParkingAmount <= 0) {
      return NextResponse.json({ error: 'Free Parking is empty' }, { status: 400 });
    }

    const parkingJackpot = session.freeParkingAmount;

    // Entregar monto y resetear la sala a 0
    await prisma.$transaction([
      prisma.player.update({
        where: { id: targetPlayerId },
        data: { balance: { increment: parkingJackpot } }
      }),
      prisma.gameSession.update({
        where: { id: hostCheck.gameSessionId },
        data: { freeParkingAmount: 0 }
      }),
      prisma.transactionLog.create({
        data: {
          gameSessionId: hostCheck.gameSessionId,
          senderId: null, // Free Parking se considera emitido por el Banco en el Log
          receiverId: targetPlayerId,
          amount: parkingJackpot
        }
      })
    ]);

    return NextResponse.json({ success: true, amount: parkingJackpot });
  } catch (error) {
    console.error('Free Parking error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}