import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ¡LA CURA MÁGICA PARA VERCEL!
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomCode = searchParams.get('roomCode');

        if (!roomCode) return NextResponse.json({ error: 'Room code required' }, { status: 400 });

        const gameSession = await prisma.gameSession.findUnique({
            where: { roomCode: roomCode.toUpperCase() },
            include: {
                // MUY IMPORTANTE: Solo devolvemos ID y Nombre. ¡NUNCA el PIN ni el saldo aquí!
                players: { select: { id: true, name: true } }
            }
        });

        if (!gameSession) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (!gameSession.isActive) return NextResponse.json({ error: 'This game has ended' }, { status: 403 });

        return NextResponse.json({ success: true, players: gameSession.players });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}