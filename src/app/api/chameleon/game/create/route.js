import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// LA CURA MÁGICA PARA VERCEL
export const dynamic = 'force-dynamic';

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

export async function POST(request) {
  try {
    const { hostName, pin } = await request.json();

    if (!hostName || !pin) {
      return NextResponse.json({ error: 'Host name and PIN are required' }, { status: 400 });
    }

    const roomCode = generateRoomCode();

    // Creamos la sesión del Camaleón y al Host en un solo paso
    const gameSession = await prisma.chameleonSession.create({
      data: {
        roomCode: roomCode,
        status: 'lobby', // El juego empieza en el lobby
        players: {
          create: {
            name: hostName,
            pin: pin,
            isHost: true,
          }
        }
      },
      include: {
        players: true,
      }
    });

    return NextResponse.json({ success: true, gameSession });

  } catch (error) {
    console.error('Error creating Chameleon game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}