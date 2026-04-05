'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";

export default function RequestMoneyModal({ isOpen, onClose, roomCode, currentUserId, players }) {
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const otherPlayers = players.filter(p => p.id !== currentUserId);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!targetPlayerId || !amount || isNaN(amount) || amount <= 0) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/payment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          requesterId: currentUserId,
          targetPlayerId: targetPlayerId,
          amount: parseInt(amount, 10)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send request');
      }

      const targetName = targetPlayerId === 'all' ? 'Everyone' : players.find(p => p.id === targetPlayerId)?.name;
      toast.success("Request Sent 📥", {
        description: `You requested $${amount} from ${targetName}.`,
      });

      setAmount('');
      setTargetPlayerId('');
      onClose();

    } catch (error) {
      toast.error("Request Failed ❌", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] glass-panel border-2 border-neon-cyan/50 text-white rounded-3xl shadow-[0_0_30px_rgba(0,209,255,0.2)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-neon-cyan tracking-wide text-glow">
            Request Money
          </DialogTitle>
          <DialogDescription className="text-slate-300 font-medium">
            Ask a specific player or everyone to pay you money.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRequest} className="grid gap-5 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Request from:</label>
            <Select value={targetPlayerId} onValueChange={setTargetPlayerId} required>
              <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus:ring-neon-cyan transition-all">
                <SelectValue placeholder="Select a player or Everyone" />
              </SelectTrigger>
              <SelectContent className="glass-panel border-white/20 text-white rounded-2xl">
                <SelectItem value="all" className="font-black text-neon-gold focus:bg-white/10 focus:text-neon-gold">
                  🌍 Everyone (All Players)
                </SelectItem>
                {otherPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id} className="focus:bg-white/10 focus:text-white font-bold">
                    👤 {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Amount ($):</label>
            <Input
              type="number"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
              className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-3xl text-center font-black tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-neon-cyan"
            />
          </div>

          <DialogFooter className="mt-6 flex gap-3 sm:justify-between">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-1/2 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-12">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-1/2 rounded-2xl bg-neon-cyan text-black font-black hover:bg-neon-cyan/90 shadow-[0_0_15px_rgba(0,209,255,0.4)] active:scale-95 transition-all h-12 text-lg">
              {isLoading ? 'Processing...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}