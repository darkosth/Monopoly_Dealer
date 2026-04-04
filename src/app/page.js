'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
// NUEVAS IMPORTACIONES
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function LandingPage() {
  const router = useRouter();
  const { setGameData } = useGameStore();

  // Estados Generales
  const [view, setView] = useState('menu'); // 'menu' | 'create' | 'join'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados de Formulario Compartidos
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [pin, setPin] = useState(''); // NUEVO: Estado para el PIN (Host y Jugadores)

  // Estados Específicos para Unirse (Flujo de Login)
  const [joinStep, setJoinStep] = useState(0); // 0: Código, 1: Tipo, 2: Nuevo, 3: Reconectar
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
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: playerName, pin: pin }), // Enviamos el PIN del Host
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const hostPlayer = data.gameSession.players[0];

      setGameData(
        data.gameSession.roomCode,
        data.gameSession.players,
        data.gameSession.freeParkingAmount,
        hostPlayer.id
      );

      localStorage.setItem('monopolyUserId', hostPlayer.id);
      router.push(`/room/${data.gameSession.roomCode}`);
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
      const res = await fetch(`/api/game/check-room?roomCode=${roomCode}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setRoomPlayers(data.players);
      setJoinStep(1); // Sala encontrada, pasamos a elegir Nuevo o Existente
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

      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setGameData(
        data.gameSession.roomCode,
        [],
        data.gameSession.freeParkingAmount,
        data.player.id
      );

      localStorage.setItem('monopolyUserId', data.player.id);
      toast.success(action === 'new' ? "Account Created!" : "Welcome back!");
      router.push(`/room/${data.gameSession.roomCode}`);
    } catch (err) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // RENDERIZADO
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-slate-800">Monopoly Bank</CardTitle>
          <CardDescription>Manage your game finances in real-time</CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-md mb-4 text-sm text-center font-medium">
              {error}
            </div>
          )}

          {/* VISTA PRINCIPAL: MENÚ */}
          {view === 'menu' && (
            <div className="flex flex-col gap-4">
              <Button size="lg" onClick={() => { setView('create'); setError(''); }} className="w-full">
                Create New Game
              </Button>
              <Button size="lg" variant="outline" onClick={() => { setView('join'); setJoinStep(0); setError(''); }} className="w-full">
                Join Existing Game
              </Button>
            </div>
          )}

          {/* VISTA: CREAR JUEGO (HOST) */}
          {view === 'create' && (
            <form onSubmit={handleCreateGame} className="flex flex-col gap-4 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name (Banker)</label>
                <Input
                  placeholder="e.g., Jorge"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Create a 4-Digit PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="text-center text-xl tracking-widest"
                  required
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={() => setView('menu')} className="w-1/3">
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="w-2/3">
                  {isLoading ? 'Creating...' : 'Start Game'}
                </Button>
              </div>
            </form>
          )}

          {/* VISTA: UNIRSE A JUEGO (MULTIPASO) */}
          {view === 'join' && (
            <div className="animate-in fade-in">
              {/* PASO 0: INGRESAR CÓDIGO */}
              {joinStep === 0 && (
                <form onSubmit={handleCheckRoom} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Room Code</label>
                    <Input
                      placeholder="e.g., ABCD"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      required
                      maxLength={6}
                      className="text-center text-xl tracking-widest font-bold uppercase"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="ghost" onClick={() => setView('menu')} className="w-1/3">
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="w-2/3 bg-blue-600 hover:bg-blue-700">
                      {isLoading ? 'Searching...' : 'Find Room'}
                    </Button>
                  </div>
                </form>
              )}

              {/* PASO 1: BIFURCACIÓN */}
              {joinStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="text-center mb-4">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Room Found
                    </span>
                  </div>
                  <Button onClick={() => { setJoinStep(2); setError(''); }} className="w-full h-12 text-md">
                    👤 New Player
                  </Button>
                  <Button onClick={() => { setJoinStep(3); setError(''); }} variant="outline" className="w-full h-12 text-md border-2">
                    🔄 Reconnect (Existing)
                  </Button>
                  <Button variant="ghost" onClick={() => setJoinStep(0)} className="w-full text-slate-400 mt-2">
                    Cancel
                  </Button>
                </div>
              )}

              {/* PASO 2: JUGADOR NUEVO */}
              {joinStep === 2 && (
                <form onSubmit={(e) => handleJoinGame(e, 'new')} className="flex flex-col gap-4 animate-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Name</label>
                    <Input
                      placeholder="e.g., Raquel"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      required
                      maxLength={15}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Create a 4-Digit PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="****"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="text-center text-xl tracking-widest"
                      required
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="ghost" onClick={() => setJoinStep(1)} className="w-1/3">
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="w-2/3 bg-blue-600 hover:bg-blue-700">
                      {isLoading ? 'Joining...' : 'Join Game'}
                    </Button>
                  </div>
                </form>
              )}

              {/* PASO 3: RECONECTAR */}
              {joinStep === 3 && (
                <form onSubmit={(e) => handleJoinGame(e, 'reconnect')} className="flex flex-col gap-4 animate-in slide-in-from-left-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Who are you?</label>
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
                    <label className="text-sm font-medium">Enter your PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="****"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="text-center text-xl tracking-widest"
                      required
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="ghost" onClick={() => setJoinStep(1)} className="w-1/3">
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading} className="w-2/3 bg-green-600 hover:bg-green-700">
                      {isLoading ? 'Verifying...' : 'Reconnect'}
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