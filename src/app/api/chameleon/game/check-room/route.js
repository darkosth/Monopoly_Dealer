import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get('roomCode');

  if (!roomCode) {
    return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
  }

  try {
    // Buscamos la sala específica del Camaleón
    const session = await prisma.chameleonSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: {
        // Solo traemos lo necesario, ocultamos los PINs por seguridad
        players: {
          select: {
            id: true,
            name: true,
            isHost: true
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Room not found. Check the code and try again.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, players: session.players });

  } catch (error) {
    console.error('Error checking Chameleon room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}