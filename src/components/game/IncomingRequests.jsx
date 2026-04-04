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
      const response = await fetch(`/api/payment-request?roomCode=${roomCode}&playerId=${currentUserId}&type=incoming`);
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
      const response = await fetch('/api/payment-request/respond', {
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
        toast.success('Payment Sent', { description: 'You have paid the request.' });
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
    <div className="max-w-4xl mx-auto mb-4 space-y-2">
      {requests.map(req => (
        <div key={req.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center shadow-sm animate-in slide-in-from-top-2">
          <div>
            <span className="font-bold text-yellow-800">Payment Request: </span>
            <span className="text-yellow-900">
              {getRequesterName(req.requesterId)} is asking you for <span className="font-black text-lg">${req.amount}</span>.
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
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
