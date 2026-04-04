import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    // AHORA RECIBIMOS EL roomCode
    const { roomCode, senderId, receiverId, amount } = await request.json();

    if (!roomCode || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid transaction details' }, { status: 400 });
    }

    // Buscamos la sesión usando el roomCode
    const gameSession = await prisma.gameSession.findUnique({
      where: { roomCode: roomCode }
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Validar los fondos del emisor (sender)
    if (senderId) {
      const sender = await prisma.player.findUnique({
        where: { id: senderId }
      });

      if (!sender) {
        return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
      }

      if (sender.balance < amount) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
      }
    }

    const operations = [];

    if (senderId) {
      operations.push(
        prisma.player.update({
          where: { id: senderId },
          data: { balance: { decrement: amount } }
        })
      );
    }

    if (receiverId) {
      operations.push(
        prisma.player.update({
          where: { id: receiverId },
          data: { balance: { increment: amount } }
        })
      );
    }

    operations.push(
      prisma.transactionLog.create({
        data: {
          gameSessionId: gameSession.id, // Usamos el ID que acabamos de buscar
          senderId,
          receiverId,
          amount
        }
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Transaction error:', error);
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
  }
}