import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Función auxiliar para generar un código de 4 letras/números (ej. "K9X2")
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

export async function POST(request) {
  try {
    // 1. NUEVO: Extraemos también el pin de la petición
    const { hostName, pin } = await request.json();

    if (!hostName) {
      return NextResponse.json({ error: 'Host name is required' }, { status: 400 });
    }

    // 2. NUEVO: Validamos que el PIN venga en la petición
    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    const roomCode = generateRoomCode();

    // Creamos la sesión y al jugador Host en un solo paso
    const gameSession = await prisma.gameSession.create({
      data: {
        roomCode: roomCode,
        players: {
          create: {
            name: hostName,
            pin: pin,          // <--- 3. NUEVO: Aquí guardamos el PIN del Host en la base de datos
            isHost: true,
            balance: 1500,     // Balance inicial por defecto
          }
        }
      },
      // Le pedimos a Prisma que nos devuelva también los jugadores recién creados
      include: {
        players: true,
      }
    });

    return NextResponse.json({ success: true, gameSession });

  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}