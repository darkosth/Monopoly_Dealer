import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    // NUEVO: Ahora exigimos recibir el payerId (quién hizo clic)
    const { requestId, action, payerId } = await request.json();

    if (action !== 'pay') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: requestId }
    });

    if (!paymentRequest || paymentRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request is no longer valid' }, { status: 400 });
    }

    // 🔥 EL CANDADO DE SEGURIDAD 🔥
    // Si el que hizo clic no es el dueño de la deuda, bloqueamos la transacción
    if (paymentRequest.targetPlayerId !== payerId) {
      return NextResponse.json({ error: 'Unauthorized: You cannot pay someone else’s debt.' }, { status: 403 });
    }

    // Si el jugador no tiene suficiente dinero, también lo bloqueamos (Opcional pero recomendado)
    const payerAccount = await prisma.player.findUnique({ where: { id: payerId } });
    if (payerAccount.balance < paymentRequest.amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    const operations = [
      prisma.player.update({
        where: { id: paymentRequest.targetPlayerId },
        data: { balance: { decrement: paymentRequest.amount } }
      }),
      prisma.player.update({
        where: { id: paymentRequest.requesterId },
        data: { balance: { increment: paymentRequest.amount } }
      }),
      prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'PAID' }
      }),
      prisma.transactionLog.create({
        data: {
          gameSessionId: paymentRequest.gameSessionId,
          senderId: paymentRequest.targetPlayerId,
          receiverId: paymentRequest.requesterId,
          amount: paymentRequest.amount
        }
      })
    ];

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing payment response:', error);
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
  }
}