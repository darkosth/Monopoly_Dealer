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

    // Identificar si somos el host (seguridad base adicional en UI)
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
            
            toast.success('Bank action successful!', { description: data.message || `Transfer complete.` });
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
        <Card className="max-w-4xl mx-auto mb-6 border-amber-300 bg-amber-50/50 shadow-md">
            <CardHeader className="py-3 bg-amber-100/50 border-b border-amber-200 rounded-t-xl">
                <CardTitle className="text-lg font-black text-amber-900 flex items-center gap-2">
                    🏦 Banker Control Panel
                </CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    
                    {/* Select Player */}
                    <div className="w-full md:w-1/3 space-y-1">
                        <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">Target Player</label>
                        <Select value={targetId} onValueChange={setTargetId}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select who gets money" />
                            </SelectTrigger>
                            <SelectContent>
                                {players.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name} {p.id === currentUserId && '(You)'}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quick Action: Pass GO */}
                    <div className="w-full md:w-auto">
                        <Button 
                            className="w-full bg-green-600 hover:bg-green-700 font-bold"
                            disabled={!targetId || isLoading}
                            onClick={() => handleBankAction('transaction', { action: 'pass_go' })}
                        >
                            💸 Pass GO (+ $200)
                        </Button>
                    </div>

                    {/* Quick Action: Free Parking */}
                    <div className="w-full md:w-auto">
                        <Button 
                            variant="outline"
                            className="w-full border-blue-400 text-blue-700 hover:bg-blue-50 font-bold"
                            disabled={!targetId || isLoading || freeParkingAmount <= 0}
                            onClick={() => handleBankAction('free-parking', {})}
                        >
                            🚗 Award Free Parking (${freeParkingAmount})
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-1/2">
                    <Input 
                        type="number" 
                        placeholder="Custom amount..." 
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="bg-white"
                        min="1"
                    />
                    <Button 
                        onClick={() => handleBankAction('transaction', { action: 'custom_payment', amount: parseInt(customAmount) })}
                        disabled={!targetId || !customAmount || isLoading}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        Send Custom
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
