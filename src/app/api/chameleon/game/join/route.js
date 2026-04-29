import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { action, roomCode, pin, playerName, playerId } = await request.json();

    if (!roomCode || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Buscamos la sesión
    const session = await prisma.chameleonSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: { players: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    let player;

    // 2. Lógica de Nuevo Jugador
    if (action === 'new') {
      if (!playerName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

      // Verificamos que el nombre no esté repetido en esta sala
      const nameExists = session.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (nameExists) {
        return NextResponse.json({ error: 'Name already taken in this room' }, { status: 400 });
      }

      player = await prisma.chameleonPlayer.create({
        data: {
          name: playerName,
          pin: pin,
          sessionId: session.id,
        }
      });
    } 
    // 3. Lógica de Reconexión
    else if (action === 'reconnect') {
      if (!playerId) return NextResponse.json({ error: 'Player selection required' }, { status: 400 });

      player = session.players.find(p => p.id === playerId);
      if (!player) return NextResponse.json({ error: 'Player not found in this room' }, { status: 404 });

      if (player.pin !== pin) {
        return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
      }
    } 
    else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, gameSession: session, player });

  } catch (error) {
    console.error('Error joining Chameleon game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}