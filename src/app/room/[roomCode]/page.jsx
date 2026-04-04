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
import OutgoingRequests from '@/components/game/OutgoingRequests';
import BankerPanel from '@/components/game/BankerPanel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode;

  const { players, currentUserId, setGameData, addPlayer, updatePlayerBalance, updateFreeParking, freeParkingAmount } = useGameStore();
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
      // 1. Escuchamos cambios en los jugadores
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
          if (payload.eventType === 'DELETE') {
            // Si nos borran a NOSOTROS (sea por Kick o porque el Host borró la sala entera)
            if (payload.old.id === currentUserId) {
              toast.error("You have been removed from the room.");
              localStorage.removeItem('monopolyUserId');
              router.push('/');
            } else {
              // Recargar la página o sacar al jugador localmente
              window.location.reload(); // Simple manera de refrescar si borran a otro
            }
          }
        }
      )
      // Escuchamos actualizaciones globales de la sesión (ej. Free Parking)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'GameSession' },
        (payload) => {
           if (payload.new && payload.new.roomCode === roomCode) {
             updateFreeParking(payload.new.freeParkingAmount);
           }
        }
      )
      // Escuchamos cuando se crea una nueva transacción
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

  const handleManagePlayer = async (targetId, action, targetName) => {
    if (action === 'kick' || action === 'declare_bankruptcy') {
      const confirmMsg = action === 'kick' 
        ? `Are you sure you want to KICK ${targetName} from the game?`
        : `Are you sure you want to BANKRUPT ${targetName}? Their balance will be set to $0.`;
      if (!window.confirm(confirmMsg)) return;
    }

    try {
      const res = await fetch('/api/game/banker/manage-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUserId, targetPlayerId: targetId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Action executed successfully');
    } catch (error) {
      toast.error('Manage Error', { description: error.message });
    }
  };

  const me = players.find((p) => p.id === currentUserId);
  const isHost = me?.isHost;

  const handleLeave = async () => {
    if (isHost) {
      if (!window.confirm("🚨 WARNING 🚨\nAre you sure you want to close this room? This will kick everyone out and PERMANENTLY delete all transaction history, players, and balances.")) return;
      try {
        await fetch('/api/game/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomCode, requesterId: currentUserId })
        });
      } catch (error) {
        toast.error("Failed to delete room");
      }
    } else {
      if (!window.confirm("Are you sure you want to leave the room?")) return;
      router.push('/');
    }
  };

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
          <Button variant="outline" onClick={handleLeave} className="w-full md:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            {isHost ? 'Close Room' : 'Leave'}
          </Button>
        </div>
      </div>

      {/* Panel de Banquero Exclusivo */}
      <BankerPanel currentUserId={currentUserId} />

      {/* Peticiones de Dinero Entrantes */}
      <IncomingRequests roomCode={roomCode} currentUserId={currentUserId} />

      {/* NUEVO: El "Ticket" de seguimiento de dinero que ME deben */}
      <OutgoingRequests roomCode={roomCode} currentUserId={currentUserId} />

      {/* Bote de Free Parking visible para todos */}
      <div className="max-w-4xl mx-auto mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label="car">🚗</span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-100">Free Parking Jackpot</h2>
            <p className="text-3xl font-black">${freeParkingAmount}</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-blue-100">Lands in Free Parking to collect!</p>
        </div>
      </div>

      {/* Grid de Jugadores */}
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        {players.map((player) => {
          const isBankrupt = player.balance === 0;

          return (
          <Card key={player.id} className={`${player.id === currentUserId ? 'border-2 border-blue-500 shadow-md' : ''} ${isBankrupt ? 'opacity-50 grayscale' : ''}`}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className={`text-lg truncate ${isBankrupt ? 'line-through text-slate-500' : ''}`}>
                {player.name} {player.id === currentUserId && <span className="text-blue-500 text-sm">(You)</span>}
              </CardTitle>
              {isHost && player.id !== currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <Settings className="h-4 w-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleManagePlayer(player.id, 'reset_pin', player.name)}>
                      🔄 Reset PIN (0000)
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-orange-600" onClick={() => handleManagePlayer(player.id, 'declare_bankruptcy', player.name)}>
                      📉 Declare Bankruptcy
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 font-bold" onClick={() => handleManagePlayer(player.id, 'kick', player.name)}>
                      🚫 Kick Player
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-black ${player.balance < 0 ? 'text-red-600' : player.balance === 0 ? 'text-slate-500' : 'text-green-600'}`}>
                ${player.balance}
              </div>
              {isBankrupt && <div className="text-xs font-bold text-red-600 uppercase mt-1">Bankrupt</div>}
            </CardContent>
          </Card>
        )})}
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