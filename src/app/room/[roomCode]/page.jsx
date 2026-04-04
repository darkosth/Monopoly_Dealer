'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PaymentModal from '@/components/game/PaymentModal';
import TransactionHistoryModal from '@/components/game/TransactionHistoryModal';
import RequestMoneyModal from '@/components/game/RequestMoneyModal';
import IncomingRequests from '@/components/game/IncomingRequests';
import OutgoingRequests from '@/components/game/OutgoingRequests'; // NUEVO: Importamos el componente de Tickets
import { toast } from 'sonner';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode;

  const { players, currentUserId, setGameData, addPlayer, updatePlayerBalance } = useGameStore();
  const [isLoading, setIsLoading] = useState(true);

  // Estado para controlar si el modal se muestra o no
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const storedUserId = localStorage.getItem('monopolyUserId');
      if (!storedUserId) {
        router.push('/');
        return;
      }

      try {
        const response = await fetch(`/api/game/info?roomCode=${roomCode}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        setGameData(
          data.gameSession.roomCode,
          data.gameSession.players,
          data.gameSession.freeParkingAmount,
          storedUserId
        );
      } catch (error) {
        console.error(error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [roomCode, router, setGameData]);

  useEffect(() => {
    if (isLoading) return;

    const channel = supabase
      .channel(`room-${roomCode}`)
      // 1. Escuchamos cambios en los jugadores (esto ya lo teníamos)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Player' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addPlayer(payload.new);
          }
          if (payload.eventType === 'UPDATE') {
            updatePlayerBalance(payload.new.id, payload.new.balance);
          }
        }
      )
      // 2. Escuchamos cuando se crea una nueva transacción
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'TransactionLog' },
        (payload) => {
          const transaction = payload.new;

          // Si el jugador de este celular es quien recibe el dinero...
          if (transaction.receiverId === currentUserId) {

            // Un truco Pro: Usamos getState() para leer Zustand sin romper el useEffect
            const currentPlayers = useGameStore.getState().players;

            // Buscamos quién fue el buen samaritano que nos pagó
            const sender = currentPlayers.find(p => p.id === transaction.senderId);
            const senderName = sender ? sender.name : 'The Bank';

            // ¡Lanzamos la notificación verde!
            toast.success("Dinero Recibido 🤑", {
              description: `${senderName} te ha enviado $${transaction.amount}.`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, isLoading, addPlayer, updatePlayerBalance, currentUserId]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading game...</div>;
  }

  const me = players.find((p) => p.id === currentUserId);
  const isHost = me?.isHost;

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      {/* Header de la Sala */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Room: {roomCode}</h1>
          <p className="text-sm text-slate-500">Playing as: {me?.name} {isHost && '(Host)'}</p>
        </div>

        {/* Contenedor de botones de acción */}
        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
          <Button
            onClick={() => setIsRequestModalOpen(true)}
            variant="outline"
            className="w-full md:w-auto text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            📥 Request Money
          </Button>
          <Button
            onClick={() => setIsHistoryModalOpen(true)}
            variant="outline"
            className="w-full md:w-auto text-slate-700 border-slate-300"
          >
            📋 History
          </Button>
          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
          >
            💸 Pay
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full md:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            Leave
          </Button>
        </div>
      </div>

      {/* Peticiones de Dinero Entrantes */}
      <IncomingRequests roomCode={roomCode} currentUserId={currentUserId} />

      {/* NUEVO: El "Ticket" de seguimiento de dinero que ME deben */}
      <OutgoingRequests roomCode={roomCode} currentUserId={currentUserId} />

      {/* Grid de Jugadores */}
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {players.map((player) => (
          <Card key={player.id} className={player.id === currentUserId ? 'border-2 border-blue-500 shadow-md' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg truncate">
                {player.name} {player.id === currentUserId && <span className="text-blue-500 text-sm">(You)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-black ${player.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${player.balance}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modales inyectados por encima de la pantalla */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        roomCode={roomCode}
        currentUserId={currentUserId}
        players={players}
      />

      <TransactionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        roomCode={roomCode}
        players={players}
      />

      <RequestMoneyModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        roomCode={roomCode}
        currentUserId={currentUserId}
        players={players}
      />
    </div>
  );
}