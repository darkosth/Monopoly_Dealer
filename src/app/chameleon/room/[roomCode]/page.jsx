'use client';

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Gavel,
  Play,
  RefreshCw,
  Settings2,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import HostSettingsModal from "@/components/chameleon/HostSettingsModal";

export default function ChameleonRoom({ params }) {
  const resolvedParams = use(params);
  const { roomCode } = resolvedParams;
  const router = useRouter();

  const [players, setPlayers] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVotingState, setIsVotingState] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("RANDOM");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const currentPlayerRef = useRef(null);

  const fetchRoomData = useCallback(async () => {
    try {
      const savedUserId = localStorage.getItem("chameleonUserId");
      const response = await fetch(`/api/chameleon/game/info?roomCode=${roomCode}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setRoomData(data.room);
      setPlayers(data.room.players);
      setCurrentPlayer(data.room.players.find((player) => player.id === savedUserId) || null);
    } catch (error) {
      toast.error("Error", { description: "Failed to fetch room data." });
      router.push("/chameleon");
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, router]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  useEffect(() => {
    const savedUserId = localStorage.getItem("chameleonUserId");
    if (!savedUserId) {
      router.push("/chameleon");
      return;
    }

    fetchRoomData();

    const roomChannel = supabase
      .channel(`chameleon_room_${roomCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ChameleonPlayer" },
        () => {
          fetchRoomData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ChameleonSession",
          filter: `roomCode=eq.${roomCode.toUpperCase()}`,
        },
        () => {
          fetchRoomData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ChameleonVote" },
        () => {
          fetchRoomData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [fetchRoomData, roomCode, router]);

  useEffect(() => {
    let hasSentLeave = false;

    const notifyHostLeave = () => {
      const player = currentPlayerRef.current;
      if (!player?.isHost || !player?.isParticipating || hasSentLeave) {
        return;
      }

      hasSentLeave = true;

      const payload = JSON.stringify({
        roomCode,
        hostId: player.id,
        action: "LEAVE_ROOM",
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/chameleon/game/host-action",
          new Blob([payload], { type: "application/json" })
        );
        return;
      }

      fetch("/api/chameleon/game/host-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("pagehide", notifyHostLeave);
    return () => {
      window.removeEventListener("pagehide", notifyHostLeave);
    };
  }, [roomCode]);

  const handleStartRound = async () => {
    try {
      const res = await fetch("/api/chameleon/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, category: selectedCategory }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Oops!", { description: error.message });
    }
  };

  const handleHostCommand = async (actionCommand) => {
    try {
      const res = await fetch("/api/chameleon/game/host-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, hostId: currentPlayer.id, action: actionCommand }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      if (actionCommand === "RETURN_TO_LOBBY") {
        toast.info("Returned to Lobby");
      }
    } catch (error) {
      toast.error("Command Failed", { description: error.message });
    }
  };

  const handleCastVote = async (targetId) => {
    setIsVotingState(true);
    try {
      const res = await fetch("/api/chameleon/game/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, voterId: currentPlayer.id, votedTargetId: targetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Vote Failed", { description: error.message });
    } finally {
      setIsVotingState(false);
    }
  };

  if (isLoading || !roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-green-400 font-black text-2xl animate-pulse">
        LOADING ROOM...
      </div>
    );
  }

  const activePlayers = players.filter((player) => player.isParticipating);
  const activePlayerCount = activePlayers.length;
  const leaderboardPlayers = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const myVote = roomData.votes?.find((vote) => vote.voterId === currentPlayer?.id);
  const hasVoted = !!myVote;

  let isCaught = false;
  let votesNeeded = 0;
  let isRoundOver = false;

  if (roomData.status === "results") {
    votesNeeded = Math.floor(activePlayerCount / 2) + 1;
    const chameleonVotes = roomData.votes.filter(
      (vote) => vote.votedTargetId === roomData.chameleonId
    ).length;
    isCaught = chameleonVotes >= votesNeeded;
    isRoundOver = isCaught || roomData.votesUsed >= roomData.maxVotesAllowed;
  }

  const HostControls = ({
    buttonText,
    icon: Icon,
    onClick,
    disabled,
    showCategory = false,
    variant = "primary",
    secondaryButtonText,
    secondaryIcon: SecondaryIcon,
    onSecondaryClick,
  }) => (
    <Card className="glass-panel border-2 border-purple-500/30 rounded-3xl overflow-hidden mt-6 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative z-10">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest">
              Host Controls
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 w-8 rounded-full hover:bg-purple-500/20 text-purple-400 transition-all"
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>

        {showCategory && (
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-2xl h-14 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none cursor-pointer"
            >
              <option value="RANDOM" className="bg-slate-900">Random (Mixed)</option>
              <option value="ANIMALS" className="bg-slate-900">Animals</option>
              <option value="FOOD" className="bg-slate-900">Food</option>
              <option value="MOVIES" className="bg-slate-900">Movies</option>
              <option value="PROFESSIONS" className="bg-slate-900">Professions</option>
              <option value="PLACES" className="bg-slate-900">Places</option>
              <option value="OBJECTS" className="bg-slate-900">Objects</option>
              <option value="SPORTS" className="bg-slate-900">Sports</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={onClick}
            disabled={disabled}
            className={`w-full h-14 rounded-2xl font-black tracking-widest flex gap-2 active:scale-95 transition-all text-lg ${
              variant === "warning"
                ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            }`}
          >
            <Icon className="w-5 h-5" />
            {disabled ? "WAITING (MIN 3 PLAYING)" : buttonText}
          </Button>

          {onSecondaryClick && (
            <Button
              onClick={onSecondaryClick}
              variant="outline"
              className="w-full h-12 rounded-2xl border-white/20 text-slate-300 hover:bg-white/10 hover:text-white tracking-widest font-bold"
            >
              <SecondaryIcon className="w-4 h-4 mr-2" /> {secondaryButtonText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen p-4 sm:p-6 text-white font-sans relative overflow-hidden flex flex-col items-center pt-20">
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${
          roomData.status === "lobby"
            ? "bg-purple-600/10"
            : roomData.status === "playing"
              ? !currentPlayer?.isParticipating
                ? "bg-blue-500/10"
                : currentPlayer?.id === roomData.chameleonId
                  ? "bg-red-500/10"
                  : "bg-green-500/10"
              : roomData.status === "voting"
                ? "bg-yellow-500/10"
                : roomData.status === "results"
                  ? isCaught
                    ? "bg-green-500/20"
                    : isRoundOver
                      ? "bg-red-500/20"
                      : "bg-yellow-500/20"
                  : "bg-purple-600/10"
        }`}
      />

      <div className="w-full max-w-2xl mb-8 glass-panel p-4 rounded-3xl border-2 border-white/10 relative z-10 mt-4 shadow-lg">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Room Code</p>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-green-400 tracking-widest">
              {roomCode}
            </p>

            {currentPlayer && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="bg-white/5 px-3 py-2 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Player</p>
                  <p className="font-black text-white flex items-center gap-2">
                    {currentPlayer.name}
                    {currentPlayer.isHost && <Crown className="w-4 h-4 text-purple-400" />}
                  </p>
                </div>
                <div className="bg-yellow-500/10 px-3 py-2 rounded-2xl border border-yellow-500/20">
                  <p className="text-[10px] text-yellow-300 uppercase font-bold tracking-widest">Score</p>
                  <p className="font-black text-yellow-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    {currentPlayer.score} pts
                  </p>
                </div>
                <div className="bg-white/5 px-3 py-2 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Role</p>
                  <p className={`font-black ${currentPlayer.isParticipating ? "text-green-400" : "text-blue-400"}`}>
                    {currentPlayer.isParticipating ? "Playing" : "Referee"}
                  </p>
                </div>
                <div className="bg-yellow-500/10 px-3 py-2 rounded-2xl border border-yellow-500/20">
                  <p className="text-[10px] text-yellow-300 uppercase font-bold tracking-widest">Strikes</p>
                  <p className="font-black text-yellow-400">
                    {roomData.votesUsed} / {roomData.maxVotesAllowed}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-right flex flex-col items-end">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">
              Status
            </p>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <span className="text-sm font-black uppercase text-white tracking-widest">
                {roomData.status === "lobby"
                  ? "Lobby"
                  : roomData.status === "playing"
                    ? "Round Active"
                    : roomData.status === "voting"
                      ? "Voting"
                      : "Results"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl flex-1 flex flex-col relative z-10">
        {roomData.status === "lobby" && (
          <div className="flex-1 flex flex-col animate-in fade-in">
            <Card className="glass-panel border-2 border-white/10 rounded-3xl overflow-hidden shadow-lg flex-1">
              <CardHeader className="bg-white/5 border-b border-white/5 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-xl">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">
                    Waiting Room ({activePlayerCount} Playing)
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 custom-scrollbar overflow-y-auto max-h-[40vh]">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${
                      player.id === currentPlayer?.id
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-white/5 border-white/5"
                    }`}
                  >
                    <span className="font-bold text-white text-lg flex items-center gap-2">
                      {player.name}
                      {player.id === currentPlayer?.id && (
                        <span className="text-green-400 text-xs uppercase tracking-widest ml-1 bg-green-500/20 px-2 py-0.5 rounded-full">
                          (You)
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      {!player.isParticipating && (
                        <div className="bg-slate-500/20 px-3 py-1 rounded-full border border-slate-500/30 flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Referee
                          </span>
                        </div>
                      )}
                      {player.isHost && (
                        <div className="bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                            Host
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {currentPlayer?.isHost ? (
              <HostControls
                showCategory={true}
                buttonText="START GAME"
                icon={Play}
                onClick={handleStartRound}
                disabled={activePlayerCount < 3}
              />
            ) : (
              <div className="text-center p-8 bg-white/5 rounded-3xl border border-dashed border-white/20 mt-6 animate-pulse">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-slate-300 font-bold tracking-widest uppercase text-sm">
                  Waiting for the Host to start...
                </p>
              </div>
            )}
          </div>
        )}

        {roomData.status === "playing" && (
          <div className="flex-1 flex flex-col justify-center animate-in zoom-in-95 duration-500">
            <Card
              className={`flex-1 glass-panel border-2 text-center rounded-3xl overflow-hidden flex flex-col justify-center ${
                !currentPlayer?.isParticipating
                  ? "border-blue-500/50"
                  : currentPlayer?.id === roomData.chameleonId
                    ? "border-red-500/50"
                    : "border-green-500/50"
              }`}
            >
              <CardContent className="pt-8 pb-10 px-6">
                <span className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] text-slate-300 border border-white/10">
                  Category: {roomData.category}
                </span>
                <div className="mt-10">
                  {!currentPlayer?.isParticipating ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                      <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <Eye className="w-8 h-8 text-blue-400" />
                      </div>
                      <h1 className="text-3xl font-black text-blue-400 tracking-widest uppercase">
                        Referee Mode
                      </h1>
                      <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Secret Word</p>
                          <p className="text-3xl font-black text-green-400">{roomData.secretWord}</p>
                        </div>
                        <div className="w-full h-px bg-white/10 my-2" />
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">
                            The Chameleon is
                          </p>
                          <p className="text-3xl font-black text-red-500">
                            {players.find((player) => player.id === roomData.chameleonId)?.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : currentPlayer?.id === roomData.chameleonId ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                      <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                        <EyeOff className="w-8 h-8 text-red-500" />
                      </div>
                      <h1 className="text-5xl font-black text-red-500 tracking-wider text-glow animate-pulse">
                        CHAMELEON
                      </h1>
                      <p className="text-slate-300 font-bold tracking-widest uppercase text-sm mt-4">
                        Blend in. Guess the word.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                      <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-sm mb-2">
                        Secret Word
                      </p>
                      <h1 className="text-5xl font-black text-green-400 tracking-wider text-glow">
                        {roomData.secretWord}
                      </h1>
                      <p className="text-slate-400 font-medium text-sm mt-6">Describe it with ONE word.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {currentPlayer?.isHost && (
              <HostControls
                showCategory={false}
                buttonText="CALL FOR VOTE"
                icon={Gavel}
                variant="warning"
                onClick={() => handleHostCommand("START_VOTING")}
                disabled={false}
                secondaryButtonText="CHANGE WORD (REROLL)"
                secondaryIcon={RefreshCw}
                onSecondaryClick={handleStartRound}
              />
            )}
          </div>
        )}

        {roomData.status === "voting" && (
          <div className="flex-1 flex flex-col animate-in fade-in">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-yellow-400 tracking-widest uppercase text-glow">
                Who is the Chameleon?
              </h2>
              <p className="text-slate-300 mt-2 font-medium">
                Votes cast: {roomData.votes?.length || 0} / {activePlayerCount}
              </p>
            </div>

            {!currentPlayer?.isParticipating || hasVoted ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-dashed border-white/20 p-8">
                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-black text-white tracking-widest uppercase text-center">
                  Waiting for everyone
                  <br />
                  to vote...
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {activePlayers
                  .filter((target) => target.id !== currentPlayer.id)
                  .map((target) => (
                    <Button
                      key={target.id}
                      onClick={() => handleCastVote(target.id)}
                      disabled={isVotingState}
                      className="h-24 rounded-2xl glass-panel border-2 border-white/10 hover:border-yellow-400 hover:bg-yellow-500/20 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <span className="text-xl font-black text-white">{target.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">Vote</span>
                    </Button>
                  ))}
              </div>
            )}

            {currentPlayer?.isHost && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="ghost"
                  onClick={() => handleHostCommand("CONTINUE_ROUND")}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel Voting
                </Button>
              </div>
            )}
          </div>
        )}

        {roomData.status === "results" && (
          <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-500">
            <Card
              className={`glass-panel border-2 rounded-3xl overflow-hidden shadow-2xl ${
                isCaught
                  ? "border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
                  : isRoundOver
                    ? "border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]"
                    : "border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]"
              }`}
            >
              <CardHeader
                className={`text-center py-6 ${
                  isCaught
                    ? "bg-green-500/20"
                    : isRoundOver
                      ? "bg-red-500/20"
                      : "bg-yellow-500/20"
                }`}
              >
                {isCaught ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-2" />
                    <h2 className="text-3xl font-black text-green-400 uppercase tracking-widest text-glow">
                      CHAMELEON CAUGHT!
                    </h2>
                    <p className="text-slate-200 mt-1 font-bold">+1 Pt to everyone else</p>
                  </>
                ) : isRoundOver ? (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                    <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest text-glow">
                      CHAMELEON ESCAPED!
                    </h2>
                    <p className="text-slate-200 mt-1 font-bold">+2 Pts to the Chameleon</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-2 animate-bounce" />
                    <h2 className="text-3xl font-black text-yellow-400 uppercase tracking-widest text-glow">
                      WRONG VOTE!
                    </h2>
                    <p className="text-slate-200 mt-1 font-bold">
                      The Chameleon remains hidden... (+2 Pts)
                    </p>
                  </>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {isRoundOver ? (
                  <>
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Leaderboard
                        </h3>
                      </div>
                      {leaderboardPlayers.map((player, index) => (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${
                            player.id === currentPlayer?.id
                              ? "border-green-500/30 bg-green-500/10"
                              : "border-white/5 bg-black/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-500 w-5 text-center">#{index + 1}</span>
                            <p className="font-bold text-white flex items-center gap-2">
                              {player.name}
                              {player.isHost && <Crown className="w-3.5 h-3.5 text-purple-400" />}
                            </p>
                          </div>
                          <span className="font-black text-yellow-400">{player.score} pts</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-center bg-black/40 p-4 rounded-2xl border border-white/10 animate-in fade-in zoom-in">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        The Chameleon Was
                      </p>
                      <p className="text-3xl font-black text-white">
                        {players.find((player) => player.id === roomData.chameleonId)?.name}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center bg-black/40 p-4 rounded-2xl border border-white/10 animate-pulse">
                    <p className="text-sm font-bold text-slate-300 tracking-widest uppercase">
                      Identity Protected
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">
                    Vote Breakdown (Needed {votesNeeded})
                  </h3>
                  {activePlayers.map((player) => {
                    const votesReceived = roomData.votes.filter(
                      (vote) => vote.votedTargetId === player.id
                    ).length;
                    if (votesReceived === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={player.id}
                        className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                      >
                        <span
                          className={`font-bold ${
                            isRoundOver && player.id === roomData.chameleonId
                              ? "text-red-400"
                              : "text-white"
                          }`}
                        >
                          {player.name}
                        </span>
                        <div className="flex gap-1">
                          {Array.from({ length: votesReceived }).map((_, index) => (
                            <div key={index} className="w-2 h-6 bg-yellow-500 rounded-sm" />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {currentPlayer?.isHost && (
              <div className="mt-6 space-y-4 animate-in fade-in">
                {!isRoundOver ? (
                  <div className="space-y-2 text-center">
                    <p className="text-yellow-400 font-bold uppercase tracking-widest text-sm">
                      Strike {roomData.votesUsed} used. Try again!
                    </p>
                    <HostControls
                      showCategory={false}
                      buttonText="CONTINUE ROUND"
                      icon={RefreshCw}
                      onClick={() => handleHostCommand("CONTINUE_ROUND")}
                      disabled={false}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <HostControls
                      showCategory={true}
                      buttonText="START NEXT ROUND"
                      icon={Play}
                      onClick={handleStartRound}
                      disabled={activePlayerCount < 3}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => handleHostCommand("RETURN_TO_LOBBY")}
                      className="w-full h-12 text-slate-400 hover:text-white uppercase tracking-widest font-bold"
                    >
                      Back to Lobby
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {currentPlayer?.isHost && (
        <HostSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          roomCode={roomCode}
          hostId={currentPlayer.id}
          currentMaxVotes={roomData?.maxVotesAllowed}
          hostIsParticipating={currentPlayer.isParticipating}
        />
      )}
    </main>
  );
}
