import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
    try {
        const { requestId, requesterId } = await request.json();

        // Verificamos que quien cierra sea el que creó la petición
        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: { id: requestId }
        });

        if (paymentRequest.requesterId !== requesterId) {
            return NextResponse.json({ error: 'Only the requester can close this ticket' }, { status: 403 });
        }

        // Marcamos como ARCHIVED o simplemente lo borramos
        // Borrarlo es más limpio para que no llene la base de datos
        await prisma.paymentRequest.delete({
            where: { id: requestId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to close ticket' }, { status: 500 });
    }
}