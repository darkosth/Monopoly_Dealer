'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/useGameStore';
import { toast } from 'sonner';

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

    // Función para cerrar manualmente los tickets rechazados
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
        <Card className="max-w-4xl mx-auto mb-8 glass-panel border-2 border-neon-cyan/30 shadow-[0_0_15px_rgba(0,209,255,0.1)] rounded-3xl overflow-hidden">
            <CardHeader className="py-3 bg-neon-cyan/10 border-b border-neon-cyan/20">
                <CardTitle className="text-sm font-black text-neon-cyan uppercase tracking-widest flex items-center gap-2 text-glow">
                    📋 Active Requests (Pending)
                </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
                <div className="flex flex-wrap gap-3">
                    {outboundRequests.map(req => (
                        <div
                            key={req.id}
                            // Cambiamos el color del borde, fondo y sombras si está rechazado
                            className={`border-2 rounded-2xl px-4 py-2 flex items-center gap-3 backdrop-blur-md transition-all ${req.status === 'REJECTED'
                                    ? 'bg-neon-red/10 border-neon-red shadow-[0_0_10px_rgba(255,0,85,0.2)]'
                                    : 'bg-white/5 border-neon-cyan/50 hover:bg-white/10'
                                }`}
                        >
                            <span className="text-sm font-bold text-white">
                                {getTargetName(req.targetPlayerId)}
                            </span>

                            {/* Cambiamos el color de la cantidad a rojo si está rechazado */}
                            <Badge
                                variant="outline"
                                className={`font-black text-sm px-2 py-1 ${req.status === 'REJECTED'
                                        ? 'bg-neon-red/20 text-neon-red border-none'
                                        : 'bg-neon-cyan/20 text-neon-cyan border-none'
                                    }`}
                            >
                                ${req.amount}
                            </Badge>

                            {/* Lógica visual dependiendo del estado */}
                            {req.status === 'REJECTED' ? (
                                <div className="flex items-center gap-1 pl-2 border-l border-neon-red/50 ml-1">
                                    <span className="text-[10px] font-black text-neon-red uppercase tracking-widest text-glow">
                                        Rejected
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-neon-red hover:text-white hover:bg-neon-red/50 rounded-full ml-1 transition-all active:scale-95"
                                        onClick={() => handleCloseTicket(req.id)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-[10px] animate-pulse text-neon-cyan font-black uppercase tracking-widest ml-2 text-glow">
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