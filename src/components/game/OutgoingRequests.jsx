'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // NUEVO: Importamos Button
import { useGameStore } from '@/store/useGameStore';
import { toast } from 'sonner'; // NUEVO: Importamos toast para errores

export default function OutgoingRequests({ roomCode, currentUserId }) {
    const [outboundRequests, setOutboundRequests] = useState([]);
    const players = useGameStore(state => state.players);

    const fetchOutbound = useCallback(async () => {
        try {
            const response = await fetch(`/api/payment-request?roomCode=${roomCode}&playerId=${currentUserId}&type=outgoing`);
            const data = await response.json();
            if (response.ok) {
                setOutboundRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Error fetching outbound requests', error);
        }
    }, [roomCode, currentUserId]);

    useEffect(() => {
        fetchOutbound();

        // Escuchamos cualquier cambio en la tabla PaymentRequest para esta sala
        const channel = supabase
            .channel(`outbound-tracker-${currentUserId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'PaymentRequest' },
                () => {
                    // Si alguien paga o rechaza, refrescamos la lista
                    fetchOutbound();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOutbound, currentUserId]);

    // NUEVO: Función para cerrar manualmente los tickets rechazados
    const handleCloseTicket = async (requestId) => {
        try {
            const response = await fetch('/api/payment-request/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, requesterId: currentUserId })
            });

            if (!response.ok) throw new Error('Failed to close ticket');

            // Refrescamos la lista para quitarlo de la pantalla inmediatamente
            fetchOutbound();
        } catch (error) {
            toast.error("Could not close ticket");
        }
    };

    if (outboundRequests.length === 0) return null;

    const getTargetName = (id) => players.find(p => p.id === id)?.name || 'Unknown';

    return (
        <Card className="max-w-4xl mx-auto mb-6 border-blue-200 bg-blue-50/30">
            <CardHeader className="py-3">
                <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    📋 Your Active Requests (Waiting for payment)
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
                <div className="flex flex-wrap gap-2">
                    {outboundRequests.map(req => (
                        <div
                            key={req.id}
                            // NUEVO: Cambiamos el color del borde y fondo si está rechazado
                            className={`border rounded-md px-3 py-2 flex items-center gap-3 shadow-sm ${req.status === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-white border-blue-200'
                                }`}
                        >
                            <span className="text-sm font-medium text-slate-700">
                                {getTargetName(req.targetPlayerId)}
                            </span>

                            {/* NUEVO: Cambiamos el color de la cantidad a rojo si está rechazado */}
                            <Badge
                                variant={req.status === 'REJECTED' ? 'destructive' : 'secondary'}
                                className={req.status !== 'REJECTED' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}
                            >
                                ${req.amount}
                            </Badge>

                            {/* NUEVO: Lógica visual dependiendo del estado */}
                            {req.status === 'REJECTED' ? (
                                <div className="flex items-center gap-1 pl-2 border-l border-red-200 ml-1">
                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                                        Rejected
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full ml-1"
                                        onClick={() => handleCloseTicket(req.id)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-[10px] animate-pulse text-blue-500 font-bold uppercase ml-2">
                                    Pending
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}