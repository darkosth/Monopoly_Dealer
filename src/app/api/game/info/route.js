import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ¡LA CURA MÁGICA PARA VERCEL!
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Obtenemos el código de la URL (ej. ?roomCode=X7B9)
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('roomCode');

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    // Buscamos la sesión y le pedimos a Prisma que incluya el arreglo de jugadores
    const gameSession = await prisma.gameSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: {
        players: {
          orderBy: { createdAt: 'asc' } // Ordenamos para que el Host salga primero
        }
      }
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, gameSession });

  } catch (error) {
    console.error('Error fetching room info:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}