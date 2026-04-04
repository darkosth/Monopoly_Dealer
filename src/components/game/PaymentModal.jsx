'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";

export default function PaymentModal({ isOpen, onClose, roomCode, currentUserId, players }) {
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filtramos la lista para que no te puedas pagar a ti mismo
  const otherPlayers = players.filter(p => p.id !== currentUserId);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!receiverId || !amount || isNaN(amount) || amount <= 0) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          senderId: currentUserId,
          receiverId: receiverId === 'bank' ? null : receiverId, // Si es el banco, enviamos null
          amount: parseInt(amount, 10)
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      // Mostrar notificación de éxito
      const receiverName = receiverId === 'bank' ? 'the Bank' : players.find(p => p.id === receiverId)?.name;
      toast.success("Payment Successful", {
        description: `You paid $${amount} to ${receiverName}.`,
      });

      // Limpiar formulario y cerrar modal
      setAmount('');
      setReceiverId('');
      onClose();

    } catch (error) {
      toast.error("Payment Failed", {
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
          <DialogTitle>Make a Payment</DialogTitle>
          <DialogDescription>
            Select who you want to pay and enter the amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePayment} className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pay to:</label>
            <Select value={receiverId} onValueChange={setReceiverId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a player or Bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank" className="font-bold text-slate-700">🏦 The Bank</SelectItem>
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
              placeholder="e.g. 500" 
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Send Money'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}