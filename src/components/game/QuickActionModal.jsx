'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function QuickActionModal({
  isOpen,
  onClose,
  targetPlayer,
  currentUserId,
  roomCode,
  players,
}) {
  const [mode, setMode] = useState('pay'); // 'pay' | 'request'
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  const me = players.find((p) => p.id === currentUserId);
  const myBalance = me?.balance ?? 0;

  const amountNum = parseInt(amount, 10);
  const isAmountValid = amount !== '' && !isNaN(amountNum) && amountNum > 0;
  const isInsufficient = mode === 'pay' && isAmountValid && amountNum > myBalance;
  const isDisabled = !isAmountValid || isInsufficient || isLoading;

  // LA VACUNA 1: Limpiamos el setTimeout para evitar Memory Leaks
  useEffect(() => {
    let timer;
    if (isOpen) {
      setMode('pay');
      setAmount('');
      setIsLoading(false);
      
      timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
    // Función de limpieza: Destruye el zombi si el componente se desmonta
    return () => clearTimeout(timer); 
  }, [isOpen, targetPlayer?.id]);

  const handleSubmit = async () => {
    if (isDisabled) return;
    setIsLoading(true);

    try {
      if (mode === 'pay') {
        const response = await fetch('/api/monopoly/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            senderId: currentUserId,
            receiverId: targetPlayer.id,
            amount: amountNum,
            isTax: false,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Transaction failed');
        }
        toast.success('Payment Successful 💸', {
          description: `You paid $${amountNum} to ${targetPlayer.name}.`,
        });
      } else {
        const response = await fetch('/api/monopoly/payment-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            requesterId: currentUserId,
            targetPlayerId: targetPlayer.id,
            amount: amountNum,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Request failed');
        }
        toast.success('Request Sent 📥', {
          description: `You requested $${amountNum} from ${targetPlayer.name}.`,
        });
      }

      onClose();
    } catch (error) {
      toast.error('Action Failed ❌', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const isPay = mode === 'pay';
  
  // Seguridad: Si targetPlayer es null (mientras se cierra el modal), usamos strings vacíos
  const targetName = targetPlayer?.name || '';
  
  const ctaLabel = isAmountValid
    ? isPay
      ? `PAY $${amountNum} TO ${targetName.toUpperCase()} 💸`
      : `REQUEST $${amountNum} FROM ${targetName.toUpperCase()} 📥`
    : isPay
      ? `ENTER AMOUNT TO PAY`
      : `ENTER AMOUNT TO REQUEST`;

  return (
    // LA VACUNA 2: El Dialog siempre se renderiza, no se corta de golpe
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px] p-0 border-0 bg-transparent shadow-none overflow-visible [&>button]:hidden">
        
        {/* Solo mostramos el contenido visual si tenemos a quién pagarle */}
        {targetPlayer && (
          <div className={`relative glass-panel rounded-3xl text-white overflow-hidden border-2 transition-all duration-500 animate-in zoom-in-90 slide-in-from-bottom-4 duration-300 ${isPay ? 'border-neon-green/60 shadow-[0_0_40px_rgba(0,255,135,0.25)]' : 'border-neon-cyan/60 shadow-[0_0_40px_rgba(0,209,255,0.25)]'}`}>
            
            <div className={`absolute inset-0 opacity-10 transition-colors duration-500 pointer-events-none ${isPay ? 'bg-neon-green' : 'bg-neon-cyan'}`} />

            {/* ── Header ── */}
            <div className="relative px-6 pt-6 pb-4 text-center border-b border-white/10">
              <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-xl leading-none">✕</button>
              <div className="text-5xl mb-2">👤</div>
              <h2 className="text-2xl font-black tracking-wide text-white text-glow">
                {targetName}
              </h2>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Balance: <span className={targetPlayer.balance < 0 ? 'text-neon-red' : 'text-neon-green font-bold'}>${targetPlayer.balance.toLocaleString()}</span>
              </p>
            </div>

            {/* ── Segmented Control ── */}
            <div className="relative px-6 pt-5">
              <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                <button onClick={() => setMode('pay')} className={`flex-1 py-2.5 rounded-xl font-black text-sm tracking-wider transition-all duration-300 ${isPay ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(0,255,135,0.5)]' : 'text-slate-400 hover:text-white'}`}>
                  💸 PAY
                </button>
                <button onClick={() => setMode('request')} className={`flex-1 py-2.5 rounded-xl font-black text-sm tracking-wider transition-all duration-300 ${!isPay ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,209,255,0.5)]' : 'text-slate-400 hover:text-white'}`}>
                  📥 REQUEST
                </button>
              </div>
            </div>

            {/* ── Amount Input ── */}
            <div className="relative px-6 pt-5 pb-2">
              <div className="relative flex items-center justify-center">
                <span className={`text-5xl font-black transition-colors duration-300 mr-1 ${isInsufficient ? 'text-neon-red' : isPay ? 'text-neon-green' : 'text-neon-cyan'}`}>$</span>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  min="1"
                  className={`w-full bg-transparent border-none outline-none text-center font-black tracking-widest placeholder:text-white/20 text-6xl transition-colors duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isInsufficient ? 'text-neon-red' : isPay ? 'text-neon-green text-glow' : 'text-neon-cyan text-glow'}`}
                />
              </div>

              {isInsufficient && (
                <p className="text-neon-red text-xs font-bold uppercase tracking-wider text-center animate-pulse mt-2">
                  Insufficient funds (Max: ${myBalance.toLocaleString()})
                </p>
              )}
            </div>

            {/* ── CTA Button ── */}
            <div className="relative px-4 pb-4 pt-3">
              <button onClick={handleSubmit} disabled={isDisabled} className={`w-full py-4 rounded-2xl font-black text-sm sm:text-base tracking-wider transition-all duration-300 active:scale-95 ${isDisabled ? 'bg-white/10 text-slate-500 cursor-not-allowed' : isPay ? 'bg-neon-green text-black shadow-[0_0_20px_rgba(0,255,135,0.5)] hover:shadow-[0_0_30px_rgba(0,255,135,0.7)]' : 'bg-neon-cyan text-black shadow-[0_0_20px_rgba(0,209,255,0.5)] hover:shadow-[0_0_30px_rgba(0,209,255,0.7)]'}`}>
                {isLoading ? 'PROCESSING...' : ctaLabel}
              </button>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}