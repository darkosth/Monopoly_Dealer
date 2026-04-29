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
            // 🛠️ ACTUALIZADO: Nueva ruta de API
            const res = await fetch(`/api/monopoly/game/check-room?roomCode=${roomCode}`);
            const data = await res.json().catch(() => null);

            if (!res.ok) throw new Error(data?.error || 'La sala no existe o el servidor no responde.');

            setRoomPlayers(data.players);
            setStep(1); // Pasamos a elegir si somos nuevos o existentes
        } catch (error) {
            toast.error("Room Error ❌", { description: error.message });
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

            // 🛠️ ACTUALIZADO: Nueva ruta de API
            const res = await fetch('/api/monopoly/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'Error al unirse. Verifica tu conexión.');

            // ¡Login Exitoso! Guardamos en LocalStorage y entramos
            localStorage.setItem('monopolyUserId', data.player.id);
            toast.success(action === 'new' ? "Account Created! 🚀" : "Welcome back! 🎮");
            
            // 🛠️ ACTUALIZADO: Nueva ruta del frontend
            router.push(`/monopoly/room/${data.gameSession.roomCode}`);

        } catch (error) {
            toast.error("Login Failed ❌", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto glass-panel border-2 border-neon-cyan/50 shadow-[0_0_30px_rgba(0,209,255,0.15)] rounded-3xl overflow-hidden mt-8">
            <CardHeader className="text-center pb-4">
                <CardTitle className="text-3xl font-black text-neon-cyan tracking-widest text-glow">JOIN GAME</CardTitle>
                <CardDescription className="text-slate-300 font-medium">Enter a room code to connect</CardDescription>
            </CardHeader>

            <CardContent className="pt-2">
                {/* FASE 0: INGRESAR CÓDIGO */}
                {step === 0 && (
                    <form onSubmit={handleCheckRoom} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Room Code</label>
                            <Input
                                placeholder="e.g. ABCD"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-center text-3xl tracking-[0.3em] font-black uppercase focus-visible:ring-neon-cyan transition-all"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full rounded-2xl h-14 bg-neon-cyan text-black font-black hover:bg-neon-cyan/90 shadow-[0_0_15px_rgba(0,209,255,0.4)] active:scale-95 transition-all text-lg" disabled={isLoading}>
                            {isLoading ? 'SEARCHING...' : 'FIND ROOM'}
                        </Button>
                    </form>
                )}

                {/* FASE 1: BIFURCACIÓN */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="text-center mb-6">
                            <span className="bg-neon-green/20 text-neon-green border border-neon-green/50 text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(0,255,135,0.2)]">
                                ✔ Room Found
                            </span>
                        </div>
                        <Button onClick={() => setStep(2)} className="w-full h-14 text-lg rounded-2xl bg-neon-cyan text-black font-black hover:bg-neon-cyan/90 shadow-[0_0_15px_rgba(0,209,255,0.4)] active:scale-95 transition-all">
                            👤 NEW PLAYER
                        </Button>
                        <Button onClick={() => setStep(3)} variant="outline" className="w-full h-14 text-lg rounded-2xl border-2 border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all">
                            🔄 RECONNECT (EXISTING)
                        </Button>
                        <Button variant="ghost" onClick={() => setStep(0)} className="w-full text-slate-400 mt-2 hover:bg-transparent hover:text-white transition-all">
                            ← Back
                        </Button>
                    </div>
                )}

                {/* FASE 2: JUGADOR NUEVO */}
                {step === 2 && (
                    <form onSubmit={(e) => handleJoin(e, 'new')} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Your Name</label>
                            <Input
                                placeholder="e.g. Darkosth"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus-visible:ring-neon-cyan transition-all text-lg font-bold"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Create a 4-Digit PIN</label>
                            <Input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="****"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-center text-3xl tracking-[0.5em] focus-visible:ring-neon-cyan transition-all font-black"
                                required
                            />
                            <p className="text-xs text-slate-400 text-center font-medium mt-2">Don&apost forget it! You&aposll need it to reconnect.</p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-14">
                                Back
                            </Button>
                            <Button type="submit" className="w-2/3 rounded-2xl bg-neon-cyan text-black font-black hover:bg-neon-cyan/90 shadow-[0_0_15px_rgba(0,209,255,0.4)] active:scale-95 transition-all h-14 text-lg" disabled={isLoading}>
                                {isLoading ? 'JOINING...' : 'JOIN GAME'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* FASE 3: RECONECTAR */}
                {step === 3 && (
                    <form onSubmit={(e) => handleJoin(e, 'reconnect')} className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Who are you?</label>
                            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} required>
                                <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus:ring-neon-cyan transition-all text-lg font-bold">
                                    <SelectValue placeholder="Select your name" />
                                </SelectTrigger>
                                <SelectContent className="glass-panel border-white/20 text-white rounded-2xl">
                                    {roomPlayers.map((p) => (
                                        <SelectItem key={p.id} value={p.id} className="focus:bg-white/10 focus:text-neon-cyan font-bold text-lg">
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Enter your PIN</label>
                            <Input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="****"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-center text-3xl tracking-[0.5em] focus-visible:ring-neon-cyan transition-all font-black"
                                required
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-14">
                                Back
                            </Button>
                            <Button type="submit" className="w-2/3 rounded-2xl bg-neon-green text-black font-black hover:bg-neon-green/90 shadow-[0_0_15px_rgba(0,255,135,0.4)] active:scale-95 transition-all h-14 text-lg" disabled={isLoading}>
                                {isLoading ? 'VERIFYING...' : 'RECONNECT'}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}