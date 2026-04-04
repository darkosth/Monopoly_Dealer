import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { requesterId, targetPlayerId, action } = await request.json();

    if (!requesterId || !targetPlayerId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const hostCheck = await prisma.player.findUnique({ where: { id: requesterId } });
    if (!hostCheck || !hostCheck.isHost) {
      return NextResponse.json({ error: 'Unauthorized: Banker powers only' }, { status: 403 });
    }

    // Protegemos que el Host no se expulse a sí mismo por accidente u otro bug
    if (action === 'kick' && requesterId === targetPlayerId) {
      return NextResponse.json({ error: 'Host cannot kick themselves' }, { status: 400 });
    }

    if (action === 'reset_pin') {
      await prisma.player.update({
        where: { id: targetPlayerId },
        data: { pin: '0000' }
      });
      return NextResponse.json({ success: true, message: 'PIN reset to 0000' });
    }

    if (action === 'declare_bankruptcy') {
      await prisma.player.update({
        where: { id: targetPlayerId },
        data: { balance: 0 }
      });
      return NextResponse.json({ success: true, message: 'Player is Bankrupt' });
    }

    if (action === 'kick') {
      await prisma.player.delete({
        where: { id: targetPlayerId }
      });
      return NextResponse.json({ success: true, message: 'Player kicked' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Player manage error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
