'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skull, Settings2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HostSettingsModal({
  isOpen,
  onClose,
  roomCode,
  hostId,
  currentMaxVotes,
  hostIsParticipating,
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [maxVotes, setMaxVotes] = useState("1");
  const [isParticipating, setIsParticipating] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setMaxVotes(currentMaxVotes?.toString() || "1");
      setIsParticipating(hostIsParticipating ?? true);
    }
  }, [isOpen, currentMaxVotes, hostIsParticipating]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chameleon/game/host-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          hostId,
          action: 'UPDATE_SETTINGS',
          payload: {
            isParticipating,
            maxVotesAllowed: parseInt(maxVotes, 10)
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Settings updated!');
      onClose();
    } catch (error) {
      toast.error('Failed to update settings', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetScores = async () => {
    if (!window.confirm('Reset all player scores to 0?')) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/chameleon/game/host-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, hostId, action: 'RESET_SCORES' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('All scores reset to 0');
    } catch (error) {
      toast.error('Failed to reset scores', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!window.confirm('WARNING\nAre you sure you want to close this room? This deletes all scores and players permanently.')) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/chameleon/game/host-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, hostId, action: 'CLOSE_ROOM' })
      });
      if (!res.ok) throw new Error('Failed to close room');
      router.push('/chameleon');
    } catch (error) {
      toast.error('Error closing room', { description: error.message });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] glass-panel border-2 border-purple-500/50 text-white rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.2)] max-h-[85vh] overflow-y-auto custom-scrollbar [&>button]:hidden">
        <DialogHeader className="pb-4 border-b border-white/10 relative">
          <button onClick={onClose} className="absolute top-0 right-0 text-slate-400 hover:text-white transition-colors text-xl leading-none">x</button>
          <DialogTitle className="text-2xl font-black text-purple-400 tracking-widest text-glow flex items-center gap-2">
            <Settings2 className="w-6 h-6" /> HOST PANEL
          </DialogTitle>
          <DialogDescription className="text-slate-300 font-medium">
            Manage room settings and scores.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Game Configuration</h3>

            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="space-y-1">
                <p className="font-bold text-sm">Host plays?</p>
                <p className="text-xs text-slate-400">Turn off to be just the referee.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsParticipating(!isParticipating)}
                className={`w-14 h-8 rounded-full transition-all flex items-center p-1 ${isParticipating ? 'bg-green-500' : 'bg-slate-600'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-transform ${isParticipating ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <label className="text-sm font-bold block">Strikes (Max Votes Allowed)</label>
              <p className="text-xs text-slate-400 mb-2">How many times can the group vote wrong?</p>
              <Select value={maxVotes} onValueChange={setMaxVotes}>
                <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl text-white font-bold">
                  <SelectValue placeholder="Select strikes" />
                </SelectTrigger>
                <SelectContent className="glass-panel border-white/20 text-white rounded-xl">
                  <SelectItem value="1" className="font-bold">1 Strike (Hardcore)</SelectItem>
                  <SelectItem value="2" className="font-bold">2 Strikes (Standard)</SelectItem>
                  <SelectItem value="3" className="font-bold">3 Strikes (Forgiving)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/10">
            <Button
              onClick={handleResetScores}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 rounded-xl border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 hover:text-yellow-200 transition-all font-black tracking-widest"
            >
              <Trophy className="w-4 h-4 mr-2" /> RESET ALL SCORES
            </Button>

            <Button
              onClick={handleCloseRoom}
              disabled={isLoading}
              variant="destructive"
              className="w-full h-12 rounded-xl font-black tracking-widest bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all"
            >
              <Skull className="w-4 h-4 mr-2" /> CLOSE ROOM
            </Button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={onClose} variant="outline" className="flex-1 h-12 rounded-xl border-white/20 hover:bg-white/10 text-white font-bold">
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={isLoading} className="flex-1 h-12 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-black tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            {isLoading ? 'SAVING...' : 'SAVE'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
