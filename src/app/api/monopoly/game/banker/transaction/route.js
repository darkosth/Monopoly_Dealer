import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ¡LA CURA MÁGICA PARA VERCEL!
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { requesterId, action, targetPlayerId, amount } = await request.json();

    if (!requesterId || !action || !targetPlayerId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Seguridad: Verificar que es Host
    const hostCheck = await prisma.player.findUnique({ where: { id: requesterId } });
    if (!hostCheck || !hostCheck.isHost) {
      return NextResponse.json({ error: 'Unauthorized: Banker powers only' }, { status: 403 });
    }

    let finalAmount = 0;
    if (action === 'pass_go') {
      finalAmount = 200;
    } else if (action === 'custom_payment' && amount > 0) {
      finalAmount = amount;
    } else {
      return NextResponse.json({ error: 'Invalid action or amount' }, { status: 400 });
    }

    // Otorgar dinero (No se requiere descontar de nadie, es dinero fresco del Banco)
    await prisma.$transaction([
      prisma.player.update({
        where: { id: targetPlayerId },
        data: { balance: { increment: finalAmount } }
      }),
      prisma.transactionLog.create({
        data: {
          gameSessionId: hostCheck.gameSessionId,
          senderId: null, // Banco
          receiverId: targetPlayerId,
          amount: finalAmount
        }
      })
    ]);

    return NextResponse.json({ success: true, message: `Granted $${finalAmount}` });
  } catch (error) {
    console.error('Banker transaction error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
