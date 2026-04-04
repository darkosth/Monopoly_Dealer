import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { roomCode, playerName } = await request.json();

    if (!roomCode || !playerName) {
      return NextResponse.json({ error: 'Room code and player name are required' }, { status: 400 });
    }

    // 1. Buscamos si la sala existe
    const gameSession = await prisma.gameSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
    });

    if (!gameSession) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!gameSession.isActive) {
      return NextResponse.json({ error: 'This game has ended' }, { status: 403 });
    }

    // 2. Creamos al nuevo jugador y lo unimos a la sala
    const newPlayer = await prisma.player.create({
      data: {
        name: playerName,
        gameSessionId: gameSession.id,
        balance: 1500,
        isHost: false,
      }
    });

    return NextResponse.json({ success: true, player: newPlayer, gameSession });

  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}