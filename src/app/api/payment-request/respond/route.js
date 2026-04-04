import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { requestId, action } = await request.json(); // action = 'pay'

    if (!requestId || action !== 'pay') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: requestId },
      include: { gameSession: true }
    });

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    if (paymentRequest.status !== 'PENDING') {
      return NextResponse.json({ error: `Request already ${paymentRequest.status.toLowerCase()}` }, { status: 400 });
    }

    // Si la acción es 'pay', validar fondos del targetPlayer (quien paga)
    const payerId = paymentRequest.targetPlayerId;
    const amount = paymentRequest.amount;

    const payer = await prisma.player.findUnique({
      where: { id: payerId }
    });

    if (!payer || payer.balance < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // Ejecutar la transacción
    await prisma.$transaction([
      prisma.player.update({
        where: { id: payerId },
        data: { balance: { decrement: amount } }
      }),
      prisma.player.update({
        where: { id: paymentRequest.requesterId },
        data: { balance: { increment: amount } }
      }),
      prisma.transactionLog.create({
        data: {
          gameSessionId: paymentRequest.gameSessionId,
          senderId: payerId,
          receiverId: paymentRequest.requesterId,
          amount: amount
        }
      }),
      prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'PAID' }
      })
    ]);

    return NextResponse.json({ success: true, status: 'PAID' });
  } catch (error) {
    console.error('Payment request respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
