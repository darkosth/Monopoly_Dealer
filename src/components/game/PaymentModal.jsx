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

  const currentPlayer = players.find(p => p.id === currentUserId);
  const currentBalance = currentPlayer?.balance || 0;
  const isInsufficient = amount !== '' && !isNaN(amount) && Number(amount) > currentBalance;

  // Filtramos la lista para que no te puedas pagar a ti mismo
  const otherPlayers = players.filter(p => p.id !== currentUserId);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!receiverId || !amount || isNaN(amount) || amount <= 0) return;

    setIsLoading(true);

    try {
      const isBankProperty = receiverId === 'bank_property';
      const isBankTax = receiverId === 'bank_tax';
      const isBank = isBankProperty || isBankTax;

      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          senderId: currentUserId,
          receiverId: isBank ? null : receiverId,
          amount: parseInt(amount, 10),
          isTax: isBankTax
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      // Mostrar notificación de éxito
      const receiverName = isBank ? (isBankTax ? 'Taxes (Free Parking)' : 'the Bank') : players.find(p => p.id === receiverId)?.name;
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
                <SelectItem value="bank_property" className="font-bold text-slate-700">🏦 Bank (Buy Property/House)</SelectItem>
                <SelectItem value="bank_tax" className="font-bold text-orange-600">🏛️ Bank (Taxes & Fines 👉 Free Parking)</SelectItem>
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
              className={isInsufficient ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}
            />
            {isInsufficient && (
              <p className="text-red-500 text-xs mt-1">
                Insufficient funds (Max: ${currentBalance})
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isInsufficient}>
              {isLoading ? 'Processing...' : 'Send Money'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}