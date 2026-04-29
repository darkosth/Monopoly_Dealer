// src/app/api/chameleon/game/info/route.js
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
    const session = await prisma.chameleonSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      // 🛠️ ARREGLO: Agregamos votes: true
      include: { players: true, votes: true } 
    });

    if (!session) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room: session });

  } catch (error) {
    console.error('Error fetching room info:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}