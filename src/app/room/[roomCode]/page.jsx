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
// NUEVA IMPORTACIÓN: El motor de animación de números
import CountUp from 'react-countup';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode;

  const { players, currentUserId, setGameData, addPlayer, updatePlayerBalance, updateFreeParking, freeParkingAmount } = useGameStore();
  const [isLoading, setIsLoading] = useState(true);

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
            if (payload.old.id === currentUserId) {
              toast.error("You have been removed from the room.");
              localStorage.removeItem('monopolyUserId');
              router.push('/');
            } else {
              window.location.reload();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'GameSession' },
        (payload) => {
          if (payload.new && payload.new.roomCode === roomCode) {
            updateFreeParking(payload.new.freeParkingAmount);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'TransactionLog' },
        (payload) => {
          const transaction = payload.new;
          if (transaction.receiverId === currentUserId) {
            const currentPlayers = useGameStore.getState().players;
            const sender = currentPlayers.find(p => p.id === transaction.senderId);
            const senderName = sender ? sender.name : 'The Bank';

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
    return <div className="min-h-screen flex items-center justify-center text-neon-cyan font-black text-2xl animate-pulse">Loading Game...</div>;
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
    <div className="min-h-screen p-4 sm:p-6 text-white font-sans overflow-hidden">

      {/* Header de la Sala */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 glass-panel p-5 rounded-3xl gap-5">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black text-white tracking-widest text-glow">ROOM: {roomCode}</h1>
          <p className="text-sm text-slate-300 font-medium mt-1">
            Playing as: <span className="text-neon-cyan font-bold">{me?.name}</span> {isHost && <span className="text-neon-gold"> (Banker)</span>}
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto flex-wrap justify-center md:justify-end">
          <Button onClick={() => setIsRequestModalOpen(true)} variant="outline" className="w-[45%] md:w-auto rounded-2xl border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-all active:scale-95">
            📥 Request
          </Button>
          <Button onClick={() => setIsHistoryModalOpen(true)} variant="outline" className="w-[45%] md:w-auto rounded-2xl border-2 border-white/20 text-white hover:bg-white/10 transition-all active:scale-95">
            📋 History
          </Button>
          <Button onClick={() => setIsPaymentModalOpen(true)} className="w-[45%] md:w-auto rounded-2xl bg-neon-green text-black font-black hover:bg-neon-green/90 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,135,0.4)]">
            💸 Pay
          </Button>
          <Button variant="outline" onClick={handleLeave} className="w-[45%] md:w-auto rounded-2xl border-2 border-neon-red text-neon-red hover:bg-neon-red/10 transition-all active:scale-95">
            {isHost ? 'Close Room' : 'Leave'}
          </Button>
        </div>
      </div>

      <BankerPanel currentUserId={currentUserId} />
      <IncomingRequests roomCode={roomCode} currentUserId={currentUserId} />
      <OutgoingRequests roomCode={roomCode} currentUserId={currentUserId} />

      {/* Grid de Jugadores con CountUp */}
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-5 mt-8 pb-32">
        {players.map((player) => {
          const isBankrupt = player.balance === 0;
          const isMe = player.id === currentUserId;

          return (
            <Card
              key={player.id}
              className={`glass-panel rounded-3xl border-2 transition-all duration-300 ${isMe ? 'border-neon-cyan shadow-[0_0_20px_rgba(0,209,255,0.3)]' : 'border-white/10'
                } ${isBankrupt ? 'opacity-50 grayscale border-neon-red/50' : ''}`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className={`text-xl truncate font-bold ${isBankrupt ? 'line-through text-slate-500' : 'text-white'}`}>
                  {player.name} {isMe && <span className="text-neon-cyan text-sm ml-1">(You)</span>}
                </CardTitle>

                {isHost && !isMe && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10 rounded-full transition-all">
                        <Settings className="h-5 w-5 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-panel border-white/20 text-white">
                      <DropdownMenuItem className="hover:bg-white/10" onClick={() => handleManagePlayer(player.id, 'reset_pin', player.name)}>
                        🔄 Reset PIN (0000)
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-neon-gold hover:bg-neon-gold/10" onClick={() => handleManagePlayer(player.id, 'declare_bankruptcy', player.name)}>
                        📉 Declare Bankruptcy
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-neon-red font-bold hover:bg-neon-red/10" onClick={() => handleManagePlayer(player.id, 'kick', player.name)}>
                        🚫 Kick Player
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent>
                {/* Aquí inyectamos el contador animado */}
                <div className={`text-4xl font-black text-glow tracking-wide ${player.balance < 0 ? 'text-neon-red' :
                  isBankrupt ? 'text-slate-500' :
                    'text-neon-green'
                  }`}>
                  $<CountUp end={player.balance} duration={1} preserveValue={true} />
                </div>
                {isBankrupt && <div className="text-sm font-black text-neon-red uppercase tracking-widest mt-2">Bankrupt</div>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[calc(100%-2rem)] md:max-w-4xl z-50 bg-black/70 backdrop-blur-xl border-t-2 border-x-2 border-b-4 border-neon-gold/60 rounded-3xl p-3 sm:p-5 text-white shadow-[0_-10px_40px_rgba(255,215,0,0.2)] flex items-center justify-between transition-all">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="bg-neon-gold/20 p-2 sm:p-3 rounded-2xl border border-neon-gold/50 shadow-[inset_0_0_10px_rgba(255,215,0,0.5)]">
            <span className="text-3xl sm:text-4xl" role="img" aria-label="car">🚗</span>
          </div>
          <div>
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neon-gold">Free Parking Jackpot</h2>
            <p className="text-3xl sm:text-4xl font-black text-glow text-white">
              $<CountUp end={freeParkingAmount} duration={1} preserveValue={true} />
            </p>
          </div>
        </div>
        <div className="text-right hidden sm:block pr-2">
          <p className="text-sm font-black text-slate-300 uppercase tracking-widest text-glow">Land to collect!</p>
        </div>
      </div>

      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} roomCode={roomCode} currentUserId={currentUserId} players={players} />
      <TransactionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} roomCode={roomCode} players={players} />
      <RequestMoneyModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} roomCode={roomCode} currentUserId={currentUserId} players={players} />
    </div>
  );
}