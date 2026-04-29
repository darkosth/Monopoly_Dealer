'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";

export default function PaymentModal({ isOpen, onClose, roomCode, currentUserId, players, preSelectedReceiverId }) {
  const [receiverId, setReceiverId] = useState(preSelectedReceiverId || '');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentPlayer = players.find(p => p.id === currentUserId);
  const currentBalance = currentPlayer?.balance || 0;
  const isInsufficient = amount !== '' && !isNaN(amount) && Number(amount) > currentBalance;

  // Sync if bankPreset changes (e.g., user opens modal for different bank card)
  useEffect(() => {
    if (isOpen) {
      setReceiverId(preSelectedReceiverId || '');
      setAmount('');
    }
  }, [isOpen, preSelectedReceiverId]);

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

      const response = await fetch('/api/monopoly/transaction', {
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

      // Mostrar notificación de éxito con estilo
      const receiverName = isBank ? (isBankTax ? 'Taxes (Free Parking)' : 'the Bank') : players.find(p => p.id === receiverId)?.name;
      toast.success("Payment Successful 💸", {
        description: `You paid $${amount} to ${receiverName}.`,
      });

      // Limpiar formulario y cerrar modal
      setAmount('');
      setReceiverId('');
      onClose();

    } catch (error) {
      toast.error("Payment Failed ❌", {
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
            Make a Payment
          </DialogTitle>
          <DialogDescription className="text-slate-300 font-medium">
            Select who you want to pay and enter the amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePayment} className="grid gap-5 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Pay to:</label>
            <Select value={receiverId} onValueChange={setReceiverId} required>
              <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus:ring-neon-cyan transition-all">
                <SelectValue placeholder="Select a player or Bank" />
              </SelectTrigger>
              <SelectContent className="glass-panel border-white/20 text-white rounded-2xl">
                <SelectItem value="bank_property" className="font-bold text-neon-cyan focus:bg-white/10 focus:text-neon-cyan">🏦 Bank (Buy Property/House)</SelectItem>
                <SelectItem value="bank_tax" className="font-bold text-neon-gold focus:bg-white/10 focus:text-neon-gold">🏛️ Bank (Taxes 👉 Free Parking)</SelectItem>
                {otherPlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id} className="focus:bg-white/10 focus:text-white">
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
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
              className={`bg-white/5 border-white/20 text-white rounded-2xl h-16 text-3xl text-center font-black tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-neon-cyan ${isInsufficient ? "!border-neon-red !text-neon-red !ring-neon-red shadow-[0_0_10px_rgba(255,0,85,0.3)]" : ""
                }`}
            />
            {isInsufficient && (
              <p className="text-neon-red text-xs font-bold uppercase tracking-wider mt-2 text-center animate-pulse">
                Insufficient funds (Max: ${currentBalance})
              </p>
            )}
          </div>

          <DialogFooter className="mt-6 flex gap-3 sm:justify-between">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-1/2 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-12">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isInsufficient} className="w-full sm:w-1/2 rounded-2xl bg-neon-green text-black font-black hover:bg-neon-green/90 shadow-[0_0_15px_rgba(0,255,135,0.4)] active:scale-95 transition-all h-12 text-lg">
              {isLoading ? 'Processing...' : 'Send Money'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}