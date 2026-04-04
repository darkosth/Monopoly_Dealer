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
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transaction/history?roomCode=${roomCode}`);
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
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Audit Trail</DialogTitle>
          <DialogDescription>
            Complete history of transactions in this room.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-1">
          {isLoading ? (
            <div className="text-center text-slate-500 py-8">Loading history...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No transactions yet.</div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-slate-50 p-3 rounded-lg border flex justify-between items-center text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700">
                      {getPlayerName(tx.senderId)} &rarr; {getPlayerName(tx.receiverId)}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">{timeAgo(tx.timestamp)}</span>
                  </div>
                  <div className="text-base font-bold text-green-600">
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
