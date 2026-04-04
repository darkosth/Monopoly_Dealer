'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function LandingPage() {
  const router = useRouter();
  const { setGameData } = useGameStore();

  // Estados de la interfaz
  const [view, setView] = useState('menu'); // 'menu' | 'create' | 'join'
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Función para crear una nueva partida (Host)
  const handleCreateGame = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: playerName }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // El Host es el único jugador en el arreglo al momento de crear
      const hostPlayer = data.gameSession.players[0];

      // 1. Guardar en Zustand
      setGameData(
        data.gameSession.roomCode,
        data.gameSession.players,
        data.gameSession.freeParkingAmount,
        hostPlayer.id
      );

      // 2. Guardar en LocalStorage (fail-safe por si recargan la página)
      localStorage.setItem('monopolyUserId', hostPlayer.id);

      // 3. Redirigir a la sala
      router.push(`/room/${data.gameSession.roomCode}`);
    } catch (err) {
      setError(err.message || 'Error creating game');
      setIsLoading(false);
    }
  };

  // Función para unirse a una partida existente (Familia)
  const handleJoinGame = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerName }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // 1. Guardar en Zustand (la lista completa de jugadores la cargaremos en la fase 7)
      setGameData(
        data.gameSession.roomCode,
        [], 
        data.gameSession.freeParkingAmount,
        data.player.id
      );

      // 2. Guardar en LocalStorage
      localStorage.setItem('monopolyUserId', data.player.id);

      // 3. Redirigir a la sala
      router.push(`/room/${data.gameSession.roomCode}`);
    } catch (err) {
      setError(err.message || 'Error joining game');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-slate-800">Monopoly Bank</CardTitle>
          <CardDescription>Manage your game finances in real-time</CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-md mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {/* VISTA PRINCIPAL: MENÚ */}
          {view === 'menu' && (
            <div className="flex flex-col gap-4">
              <Button size="lg" onClick={() => setView('create')} className="w-full">
                Create New Game
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView('join')} className="w-full">
                Join Existing Game
              </Button>
            </div>
          )}

          {/* VISTA: CREAR JUEGO */}
          {view === 'create' && (
            <form onSubmit={handleCreateGame} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name (Host)</label>
                <Input 
                  placeholder="e.g., Jorge" 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                  maxLength={15}
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

          {/* VISTA: UNIRSE A JUEGO */}
          {view === 'join' && (
            <form onSubmit={handleJoinGame} className="flex flex-col gap-4">
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
                <label className="text-sm font-medium">Room Code</label>
                <Input 
                  placeholder="e.g., X7B9" 
                  value={roomCode} 
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  className="uppercase"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={() => setView('menu')} className="w-1/3">
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="w-2/3">
                  {isLoading ? 'Joining...' : 'Join Game'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}