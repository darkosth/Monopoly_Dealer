'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { useGameStore } from '@/store/useGameStore';

export default function IncomingRequests({ roomCode, currentUserId }) {
  const [requests, setRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const players = useGameStore(state => state.players);

  const fetchRequests = useCallback(async () => {
    if (!roomCode || !currentUserId) return;
    try {
      // 🛠️ ACTUALIZADO: Apuntando a la nueva ruta /api/monopoly/...
      const response = await fetch(`/api/monopoly/payment-request?roomCode=${roomCode}&playerId=${currentUserId}&type=incoming`);
      const data = await response.json();
      if (response.ok) {
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests', error);
    }
  }, [roomCode, currentUserId]);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel(`payment-requests-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'PaymentRequest', filter: `targetPlayerId=eq.${currentUserId}` },
        () => {
          // Si hay algún cambio en nuestras peticiones de pago, recargamos la lista
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests, currentUserId]);

  const handleRespond = async (requestId, action) => {
    setProcessingId(requestId);
    try {
      // 🛠️ ACTUALIZADO: Apuntando a la nueva ruta /api/monopoly/...
      const response = await fetch('/api/monopoly/payment-request/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          payerId: currentUserId,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      if (action === 'pay') {
        toast.success('Payment Sent 💸', { description: 'You have paid the request.' });
      } else {
        toast.info('Request Rejected ❌', { description: 'You declined the payment.' });
      }

      // Refrescamos la lista para quitarla
      fetchRequests();

    } catch (error) {
      toast.error('Action Failed', { description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const getRequesterName = (id) => {
    return players.find(p => p.id === id)?.name || 'Someone';
  };

  if (requests.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto mb-6 space-y-4">
      {requests.map(req => (
        <div
          key={req.id}
          className="glass-panel border-2 border-neon-gold/50 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center shadow-[0_0_20px_rgba(255,215,0,0.15)] animate-in slide-in-from-top-4 fade-in duration-300 gap-4"
        >
          <div className="text-center md:text-left w-full md:w-auto">
            <span className="text-xs font-black uppercase tracking-widest text-neon-gold block mb-1">
              🔔 Payment Request
            </span>
            <span className="text-slate-300 font-medium">
              <strong className="text-white text-lg">{getRequesterName(req.requesterId)}</strong> is asking you for <span className="font-black text-2xl text-neon-cyan text-glow ml-1">${req.amount}</span>
            </span>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 md:flex-none rounded-xl border-2 border-neon-red text-neon-red hover:bg-neon-red/10 active:scale-95 transition-all h-12 px-6"
              onClick={() => handleRespond(req.id, 'reject')}
              disabled={processingId === req.id}
            >
              Reject
            </Button>
            <Button
              size="sm"
              className="flex-1 md:flex-none rounded-xl bg-neon-green text-black font-black hover:bg-neon-green/90 shadow-[0_0_15px_rgba(0,255,135,0.4)] active:scale-95 transition-all h-12 px-6"
              onClick={() => handleRespond(req.id, 'pay')}
              disabled={processingId === req.id}
            >
              Pay ${req.amount}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}