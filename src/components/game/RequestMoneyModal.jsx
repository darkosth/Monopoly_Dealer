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
      toast.success("Request Sent", {
        description: `You requested $${amount} from ${targetName}.`,
      });

      setAmount('');
      setTargetPlayerId('');
      onClose();

    } catch (error) {
      toast.error("Request Failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Money</DialogTitle>
          <DialogDescription>
            Ask a specific player or everyone to pay you money.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRequest} className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Request from:</label>
            <Select value={targetPlayerId} onValueChange={setTargetPlayerId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a player or Everyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold text-blue-600">🌍 Everyone (All Players)</SelectItem>
                {otherPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    👤 {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount ($):</label>
            <Input 
              type="number" 
              placeholder="e.g. 50" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? 'Processing...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
