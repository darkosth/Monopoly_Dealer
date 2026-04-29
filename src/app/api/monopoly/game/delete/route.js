import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ¡LA CURA MÁGICA PARA VERCEL!
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { roomCode, requesterId } = await request.json();

    if (!roomCode || !requesterId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Identificar al que pide borrar
    const hostCheck = await prisma.player.findUnique({
      where: { id: requesterId },
      include: { gameSession: true }
    });

    if (!hostCheck || !hostCheck.isHost || hostCheck.gameSession.roomCode !== roomCode) {
      return NextResponse.json({ error: 'Unauthorized: Only the Host can close the room.' }, { status: 403 });
    }

    // Borrar TODA la sesión en cascada
    await prisma.gameSession.delete({
      where: { roomCode: roomCode }
    });

    return NextResponse.json({ success: true, message: 'Room destroyed successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
