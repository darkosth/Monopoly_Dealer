'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ChameleonLandingPage() {
  const router = useRouter();

  // Estados Generales
  const [view, setView] = useState('menu'); // 'menu' | 'create' | 'join'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados de Formulario Compartidos
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [pin, setPin] = useState('');

  // Estados Específicos para Unirse
  const [joinStep, setJoinStep] = useState(0);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  // ------------------------------------------------------------------
  // FUNCIÓN 1: CREAR PARTIDA (HOST)
  // ------------------------------------------------------------------
  const handleCreateGame = async (e) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 🛠️ ACTUALIZADO: Nueva ruta de API para The Chameleon
      const response = await fetch('/api/chameleon/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: playerName, pin: pin }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Failed to create game');

      const hostPlayer = data.gameSession.players[0];

      // 🛠️ ACTUALIZADO: Nueva clave de LocalStorage exclusiva
      localStorage.setItem('chameleonUserId', hostPlayer.id);
      
      // 🛠️ ACTUALIZADO: Enrutamiento a la sala del Camaleón
      router.push(`/chameleon/room/${data.gameSession.roomCode}`);
    } catch (err) {
      setError(err.message || 'Error creating game');
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // FUNCIÓN 2: VALIDAR SALA (Paso 1 de Unirse)
  // ------------------------------------------------------------------
  const handleCheckRoom = async (e) => {
    e.preventDefault();
    if (!roomCode) return;
    setIsLoading(true);
    setError('');

    try {
      // 🛠️ ACTUALIZADO: Nueva ruta
      const res = await fetch(`/api/chameleon/game/check-room?roomCode=${roomCode}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error || 'Room not found');

      setRoomPlayers(data.players);
      setJoinStep(1);
    } catch (error) {
      setError(error.message || 'Room not found');
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // FUNCIÓN 3: EJECUTAR LOGIN (Nuevo o Reconectar)
  // ------------------------------------------------------------------
  const handleJoinGame = async (e, action) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = { action, roomCode, pin };

      if (action === 'new') payload.playerName = playerName;
      if (action === 'reconnect') payload.playerId = selectedPlayerId;

      // 🛠️ ACTUALIZADO: Nueva ruta
      const response = await fetch('/api/chameleon/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Failed to join game');

      // 🛠️ ACTUALIZADO: Clave y ruta de The Chameleon
      localStorage.setItem('chameleonUserId', data.player.id);
      toast.success(action === 'new' ? "Account Created! 🚀" : "Welcome back! 🕵️");
      router.push(`/chameleon/room/${data.gameSession.roomCode}`);
    } catch (err) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // RENDERIZADO (Con estética Morado / Verde Camaleón)
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Fondo misterioso específico para este juego */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md glass-panel border-2 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] rounded-3xl relative z-10 overflow-hidden">

        <CardHeader className="text-center pt-8 pb-6">
          <CardTitle className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-purple-500 tracking-widest text-glow pb-2">
            THE CHAMELEON
          </CardTitle>
          <CardDescription className="text-slate-300 font-medium text-sm tracking-widest uppercase">
            A Social Deduction Game
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-2xl mb-6 text-sm text-center font-bold tracking-wider animate-in fade-in">
              {error}
            </div>
          )}

          {/* VISTA PRINCIPAL: MENÚ */}
          {view === 'menu' && (
            <div className="flex flex-col gap-5 animate-in zoom-in-95 duration-300">
              <Button
                onClick={() => { setView('create'); setError(''); }}
                className="w-full h-16 rounded-2xl bg-purple-600 text-white font-black text-lg tracking-widest hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all"
              >
                🕵️ HOST NEW GAME
              </Button>
              <Button
                variant="outline"
                onClick={() => { setView('join'); setJoinStep(0); setError(''); }}
                className="w-full h-16 rounded-2xl border-2 border-green-400 text-green-400 font-black text-lg tracking-widest hover:bg-green-400/10 active:scale-95 transition-all"
              >
                👥 JOIN LOBBY
              </Button>
              <Button variant="ghost" onClick={() => router.push('/')} className="w-full text-slate-400 hover:bg-transparent hover:text-white transition-all uppercase tracking-widest text-xs font-bold mt-2">
                ← Back to Arcade
              </Button>
            </div>
          )}

          {/* VISTA: CREAR JUEGO (HOST) */}
          {view === 'create' && (
            <form onSubmit={handleCreateGame} className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-2">
                <span className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                  Host Setup
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Your Name</label>
                <Input
                  placeholder="e.g., Detective Chris"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                  maxLength={15}
                  className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus-visible:ring-purple-500 transition-all font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Create a 4-Digit PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-center text-3xl tracking-[0.5em] focus-visible:ring-purple-500 transition-all font-black"
                  required
                />
              </div>
              <div className="flex gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setView('menu')} className="w-1/3 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-14">
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="w-2/3 rounded-2xl bg-purple-600 text-white font-black hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95 transition-all h-14 text-lg tracking-widest">
                  {isLoading ? 'STARTING...' : 'CREATE ROOM'}
                </Button>
              </div>
            </form>
          )}

          {/* VISTA: UNIRSE A JUEGO (MULTIPASO) */}
          {view === 'join' && (
            <div className="animate-in fade-in duration-300">

              {/* PASO 0: INGRESAR CÓDIGO */}
              {joinStep === 0 && (
                <form onSubmit={handleCheckRoom} className="flex flex-col gap-5 slide-in-from-right-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-green-400 uppercase tracking-widest">Room Code</label>
                    <Input
                      placeholder="e.g., YBX3"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      required
                      maxLength={6}
                      className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-center text-3xl tracking-[0.3em] font-black uppercase focus-visible:ring-green-400 transition-all"
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button type="button" variant="outline" onClick={() => setView('menu')} className="w-1/3 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-14">
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="w-2/3 rounded-2xl bg-green-500 text-black font-black hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] active:scale-95 transition-all h-14 text-lg tracking-widest">
                      {isLoading ? 'SEARCHING...' : 'FIND ROOM'}
                    </Button>
                  </div>
                </form>
              )}

              {/* PASO 1: BIFURCACIÓN */}
              {joinStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="text-center mb-6">
                    <span className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                      ✔ Room Found
                    </span>
                  </div>
                  <Button onClick={() => { setJoinStep(2); setError(''); }} className="w-full h-14 text-lg rounded-2xl bg-green-500 text-black font-black hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] active:scale-95 transition-all">
                    👤 NEW PLAYER
                  </Button>
                  <Button onClick={() => { setJoinStep(3); setError(''); }} variant="outline" className="w-full h-14 text-lg rounded-2xl border-2 border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all">
                    🔄 RECONNECT
                  </Button>
                  <Button variant="ghost" onClick={() => setJoinStep(0)} className="w-full text-slate-400 mt-2 hover:bg-transparent hover:text-white transition-all uppercase tracking-widest text-xs font-bold">
                    ← Cancel
                  </Button>
                </div>
              )}

              {/* PASO 2: JUGADOR NUEVO */}
              {joinStep === 2 && (
                <form onSubmit={(e) => handleJoinGame(e, 'new')} className="flex flex-col gap-5 animate-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-green-400 uppercase tracking-widest">Your Name</label>
                    <Input
                      placeholder="e.g., Raquel"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      required
                      maxLength={15}
                      className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus-visible:ring-green-400 transition-all text-lg font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-green-400 uppercase tracking-widest">Create a 4-Digit PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="****"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-center text-3xl tracking-[0.5em] focus-visible:ring-green-400 transition-all font-black"
                      required
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button type="button" variant="outline" onClick={() => setJoinStep(1)} className="w-1/3 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-14">
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="w-2/3 rounded-2xl bg-green-500 text-black font-black hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] active:scale-95 transition-all h-14 text-lg tracking-widest">
                      {isLoading ? 'JOINING...' : 'JOIN LOBBY'}
                    </Button>
                  </div>
                </form>
              )}

              {/* PASO 3: RECONECTAR */}
              {joinStep === 3 && (
                <form onSubmit={(e) => handleJoinGame(e, 'reconnect')} className="flex flex-col gap-5 animate-in slide-in-from-left-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-green-400 uppercase tracking-widest">Who are you?</label>
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} required>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-2xl h-14 focus:ring-green-400 transition-all text-lg font-bold">
                        <SelectValue placeholder="Select your name" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-white/20 text-white rounded-2xl">
                        {roomPlayers.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="focus:bg-white/10 focus:text-green-400 font-bold text-lg">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-green-400 uppercase tracking-widest">Enter your PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="****"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="bg-white/5 border-white/20 text-white rounded-2xl h-16 text-center text-3xl tracking-[0.5em] focus-visible:ring-green-400 transition-all font-black"
                      required
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button type="button" variant="outline" onClick={() => setJoinStep(1)} className="w-1/3 rounded-2xl border-white/20 text-white hover:bg-white/10 active:scale-95 transition-all h-14">
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="w-2/3 rounded-2xl bg-purple-600 text-white font-black hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95 transition-all h-14 text-lg tracking-widest">
                      {isLoading ? 'VERIFYING...' : 'RECONNECT'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}