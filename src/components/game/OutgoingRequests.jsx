'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/store/useGameStore';

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
                    // Si alguien paga (status cambia a PAID), refrescamos la lista
                    fetchOutbound();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOutbound, currentUserId]);

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
                        <div key={req.id} className="bg-white border border-blue-200 rounded-md px-3 py-2 flex items-center gap-3 shadow-sm">
                            <span className="text-sm font-medium text-slate-700">
                                {getTargetName(req.targetPlayerId)}
                            </span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                ${req.amount}
                            </Badge>
                            <span className="text-[10px] animate-pulse text-blue-500 font-bold uppercase">
                                Pending
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}