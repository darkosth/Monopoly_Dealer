import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CATEGORIES } from '@/lib/chameleon/constants';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { roomCode, category } = await request.json();

    if (!roomCode || !category) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const session = await prisma.chameleonSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: { players: true }
    });

    if (!session) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const activePlayers = session.players.filter(p => p.isParticipating);

    if (activePlayers.length < 3) {
      return NextResponse.json({ error: 'Not enough participating players (Min 3)' }, { status: 400 });
    }

    let eligiblePlayers = activePlayers;
    
    if (session.chameleonId) {
       const filtered = activePlayers.filter(p => p.id !== session.chameleonId);
       if (filtered.length > 0) {
         eligiblePlayers = filtered;
       }
    }

    let finalCategory = category;
    if (category === "RANDOM") {
      const categoryKeys = Object.keys(CATEGORIES);
      finalCategory = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
    }

    const words = CATEGORIES[finalCategory];
    const secretWord = words[Math.floor(Math.random() * words.length)];
    const randomPlayerIndex = Math.floor(Math.random() * eligiblePlayers.length);
    const newChameleonId = eligiblePlayers[randomPlayerIndex].id;

    // 🛠️ LIMPIEZA DE RONDA ANTERIOR: Borramos los votos
    await prisma.chameleonVote.deleteMany({ where: { sessionId: session.id } });

    // 🛠️ ACTUALIZACIÓN DE SESIÓN: Reseteamos los strikes (votesUsed)
    await prisma.chameleonSession.update({
      where: { roomCode: session.roomCode },
      data: {
        status: 'playing',
        category: finalCategory,
        secretWord: secretWord,
        chameleonId: newChameleonId,
        votesUsed: 0 
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error starting round:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}