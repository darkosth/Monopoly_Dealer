'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useGameStore } from '@/store/useGameStore';

export default function BankerPanel({ currentUserId }) {
    const players = useGameStore(state => state.players);
    const freeParkingAmount = useGameStore(state => state.freeParkingAmount);

    const [targetId, setTargetId] = useState('');
    const [customAmount, setCustomAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Identificar si somos el host
    const amIHost = players.find(p => p.id === currentUserId)?.isHost;

    if (!amIHost) return null;

    const handleBankAction = async (endpoint, payload) => {
        if (!targetId) {
            toast.error('Select a player first');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/game/banker/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: currentUserId, targetPlayerId: targetId, ...payload })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success('Bank action successful! 🏦', { description: data.message || `Transfer complete.` });
            if (endpoint === 'transaction' && payload.action === 'custom_payment') {
                setCustomAmount('');
            }
        } catch (error) {
            toast.error('Bank Error', { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto mb-8 glass-panel border-2 border-neon-gold/50 shadow-[0_0_20px_rgba(255,215,0,0.15)] rounded-3xl overflow-hidden">
            <CardHeader className="py-4 bg-neon-gold/10 border-b border-neon-gold/20">
                <CardTitle className="text-xl font-black text-neon-gold flex items-center gap-2 tracking-widest text-glow">
                    👑 BANKER CONTROL PANEL
                </CardTitle>
            </CardHeader>
            <CardContent className="py-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">

                    {/* Select Player */}
                    <div className="w-full md:w-1/3 space-y-2">
                        <label className="text-xs font-bold text-neon-gold uppercase tracking-wider">Target Player</label>
                        <Select value={targetId} onValueChange={setTargetId}>
                            <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus:ring-neon-gold transition-all">
                                <SelectValue placeholder="Select who gets money" />
                            </SelectTrigger>
                            <SelectContent className="glass-panel border-white/20 text-white rounded-2xl">
                                {players.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="focus:bg-white/10 focus:text-neon-gold">
                                        {p.name} {p.id === currentUserId && '(You)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quick Action: Pass GO */}
                    <div className="w-full md:w-auto">
                        <Button
                            className="w-full bg-neon-green text-black font-black hover:bg-neon-green/90 shadow-[0_0_15px_rgba(0,255,135,0.4)] active:scale-95 rounded-2xl h-14 transition-all"
                            disabled={!targetId || isLoading}
                            onClick={() => handleBankAction('transaction', { action: 'pass_go' })}
                        >
                            💸 Pass GO (+ $200)
                        </Button>
                    </div>

                    {/* Quick Action: Free Parking */}
                    <div className="w-full md:w-auto">
                        <Button
                            className="w-full bg-neon-gold text-black font-black hover:bg-neon-gold/90 shadow-[0_0_15px_rgba(255,215,0,0.4)] active:scale-95 rounded-2xl h-14 transition-all"
                            disabled={!targetId || isLoading || freeParkingAmount <= 0}
                            onClick={() => handleBankAction('free-parking', {})}
                        >
                            🚗 Award Free Parking (${freeParkingAmount})
                        </Button>
                    </div>
                </div>

                {/* Custom Amount Transfer */}
                <div className="flex gap-3 w-full md:w-2/3 items-center bg-black/20 p-3 rounded-2xl border border-white/10">
                    <Input
                        type="number"
                        placeholder="Custom amount..."
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="bg-white/5 border-white/20 text-white rounded-xl h-12 text-lg font-bold focus-visible:ring-neon-cyan"
                        min="1"
                    />
                    <Button
                        onClick={() => handleBankAction('transaction', { action: 'custom_payment', amount: parseInt(customAmount) })}
                        disabled={!targetId || !customAmount || isLoading}
                        className="bg-neon-cyan text-black font-black hover:bg-neon-cyan/90 shadow-[0_0_15px_rgba(0,209,255,0.4)] active:scale-95 rounded-xl h-12 px-6 transition-all"
                    >
                        Send Custom
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}