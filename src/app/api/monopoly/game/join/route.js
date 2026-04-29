import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ¡LA CURA MÁGICA PARA VERCEL!
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, roomCode, pin } = body;

    const gameSession = await prisma.gameSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() }
    });

    if (!gameSession) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    // FLUJO A: RECONECTAR JUGADOR EXISTENTE
    if (action === 'reconnect') {
      const { playerId } = body;

      const existingPlayer = await prisma.player.findUnique({ where: { id: playerId } });

      if (!existingPlayer) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

      // Verificamos el PIN
      if (existingPlayer.pin !== pin) {
        return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
      }

      return NextResponse.json({ success: true, player: existingPlayer, gameSession });
    }

    // FLUJO B: CREAR JUGADOR NUEVO
    if (action === 'new') {
      const { playerName } = body;

      // Verificamos que el nombre no esté tomado en esa sala
      const nameExists = await prisma.player.findFirst({
        where: {
          gameSessionId: gameSession.id,
          name: { equals: playerName.trim(), mode: 'insensitive' }
        }
      });

      if (nameExists) {
        return NextResponse.json({ error: 'Name already taken in this room' }, { status: 400 });
      }

      const newPlayer = await prisma.player.create({
        data: {
          name: playerName.trim(),
          pin: pin,
          gameSessionId: gameSession.id,
          balance: 1500,
          isHost: false,
        }
      });

      return NextResponse.json({ success: true, player: newPlayer, gameSession });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in join process:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}