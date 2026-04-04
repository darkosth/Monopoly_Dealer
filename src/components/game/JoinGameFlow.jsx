'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function JoinGameFlow() {
    const router = useRouter();

    // Fases: 0 = Input Room, 1 = Elegir Tipo, 2 = Formulario Nuevo, 3 = Formulario Existente
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Datos del formulario
    const [roomCode, setRoomCode] = useState('');
    const [roomPlayers, setRoomPlayers] = useState([]);
    const [playerName, setPlayerName] = useState('');
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [pin, setPin] = useState('');

    // Paso 1: Validar Sala
    const handleCheckRoom = async (e) => {
        e.preventDefault();
        if (!roomCode) return;
        setIsLoading(true);

        try {
            const res = await fetch(`/api/game/check-room?roomCode=${roomCode}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setRoomPlayers(data.players);
            setStep(1); // Pasamos a elegir si somos nuevos o existentes
        } catch (error) {
            toast.error("Room Error", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Paso 2 y 3: Ejecutar el Login (Nuevo o Existente)
    const handleJoin = async (e, action) => {
        e.preventDefault();
        if (pin.length < 4) {
            toast.error("Invalid PIN", { description: "PIN must be exactly 4 digits." });
            return;
        }

        setIsLoading(true);
        try {
            const payload = { action, roomCode, pin };

            if (action === 'new') payload.playerName = playerName;
            if (action === 'reconnect') payload.playerId = selectedPlayerId;

            const res = await fetch('/api/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // ¡Login Exitoso! Guardamos en LocalStorage y entramos
            localStorage.setItem('monopolyUserId', data.player.id);
            toast.success(action === 'new' ? "Account Created!" : "Welcome back!");
            router.push(`/room/${data.gameSession.roomCode}`);

        } catch (error) {
            toast.error("Login Failed", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-black text-slate-800">Join Game</CardTitle>
                <CardDescription>Enter a room code to connect</CardDescription>
            </CardHeader>

            <CardContent>
                {/* FASE 0: INGRESAR CÓDIGO */}
                {step === 0 && (
                    <form onSubmit={handleCheckRoom} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Room Code</label>
                            <Input
                                placeholder="e.g. ABCD"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="text-center text-xl tracking-widest font-bold uppercase"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                            {isLoading ? 'Searching...' : 'Find Room'}
                        </Button>
                    </form>
                )}

                {/* FASE 1: BIFURCACIÓN */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                        <div className="text-center mb-6">
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                Room Found
                            </span>
                        </div>
                        <Button onClick={() => setStep(2)} className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700">
                            👤 New Player
                        </Button>
                        <Button onClick={() => setStep(3)} variant="outline" className="w-full h-14 text-lg border-2">
                            🔄 Reconnect (Existing)
                        </Button>
                        <Button variant="ghost" onClick={() => setStep(0)} className="w-full text-slate-400 mt-4">
                            ← Back
                        </Button>
                    </div>
                )}

                {/* FASE 2: JUGADOR NUEVO */}
                {step === 2 && (
                    <form onSubmit={(e) => handleJoin(e, 'new')} className="space-y-4 animate-in slide-in-from-right-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Your Name</label>
                            <Input
                                placeholder="e.g. Darkosth"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Create a 4-Digit PIN</label>
                            <Input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="****"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="text-center text-2xl tracking-widest"
                                required
                            />
                            <p className="text-xs text-slate-500 text-center">Don't forget it! You'll need it to reconnect.</p>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">Back</Button>
                            <Button type="submit" className="w-2/3 bg-blue-600" disabled={isLoading}>
                                {isLoading ? 'Joining...' : 'Join Game'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* FASE 3: RECONECTAR */}
                {step === 3 && (
                    <form onSubmit={(e) => handleJoin(e, 'reconnect')} className="space-y-4 animate-in slide-in-from-left-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Who are you?</label>
                            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your name" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roomPlayers.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Enter your PIN</label>
                            <Input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="****"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="text-center text-2xl tracking-widest"
                                required
                            />
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">Back</Button>
                            <Button type="submit" className="w-2/3 bg-green-600 hover:bg-green-700" disabled={isLoading}>
                                {isLoading ? 'Verifying...' : 'Reconnect'}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}