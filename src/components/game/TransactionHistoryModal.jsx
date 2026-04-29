'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Pequeña función para el tiempo relativo (ej: "hace 2 min")
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `Just now`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  return date.toLocaleDateString();
}

export default function TransactionHistoryModal({ isOpen, onClose, roomCode, players }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, roomCode]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // 🛠️ ACTUALIZADO: Apuntando a la nueva ruta /api/monopoly/...
      const response = await fetch(`/api/monopoly/transaction/history?roomCode=${roomCode}`);
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayerName = (id) => {
    if (!id) return '🏦 The Bank';
    const player = players.find(p => p.id === id);
    return player ? `👤 ${player.name}` : 'Unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col glass-panel border-2 border-white/20 text-white rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)]">
        <DialogHeader className="pb-4 border-b border-white/10">
          <DialogTitle className="text-2xl font-black text-white tracking-widest text-glow">
            📋 AUDIT TRAIL
          </DialogTitle>
          <DialogDescription className="text-slate-300 font-medium">
            Complete history of transactions in this room.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-1 custom-scrollbar">
          {isLoading ? (
            <div className="text-center text-neon-cyan font-black tracking-widest py-10 animate-pulse text-glow">
              LOADING HISTORY...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-slate-400 font-medium py-10 uppercase tracking-widest">
              No transactions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center transition-all hover:bg-white/10 animate-in slide-in-from-bottom-2 fade-in duration-300"
                  style={{ animationDelay: `${index * 50}ms` }} // Efecto de cascada al cargar
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-base flex items-center gap-2">
                      {getPlayerName(tx.senderId)}
                      <span className="text-neon-cyan text-glow">➔</span>
                      {getPlayerName(tx.receiverId)}
                    </span>
                    <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      {timeAgo(tx.timestamp)}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-neon-green text-glow tracking-wide">
                    ${tx.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}