"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, RotateCcw, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createRound, recordGesture, toggleResult } from "@/lib/heads-up/gameEngine.mjs";
import { useTiltGesture } from "@/hooks/useTiltGesture";

const COPY = {
  es: { title: "En la frente", choose: "Elige una categoría", cards: "tarjetas", seconds: "segundos", start: "Empezar", loading: "Cargando…", rotate: "Pon el teléfono horizontal y llévalo a tu frente", correct: "¡Correcto!", pass: "Pasar", miss: "Fallo", markCorrect: "Marcar como correcto", markMiss: "Marcar como fallo", direction: "Arriba pasa · abajo acierta", time: "Tiempo", results: "Ronda terminada", again: "Otra ronda", cancel: "Cancelar ronda", cancelTitle: "¿Cancelar esta ronda?", cancelDescription: "El progreso de esta ronda se descartará.", continue: "Seguir jugando", denied: "El sensor necesita permiso para comenzar.", empty: "Esta categoría todavía no tiene opciones.", unavailable: "No pudimos cargar el catálogo. Intenta otra vez." },
  en: { title: "On your forehead", choose: "Choose a category", cards: "cards", seconds: "seconds", start: "Start", loading: "Loading…", rotate: "Turn the phone sideways and place it on your forehead", correct: "Correct!", pass: "Pass", miss: "Miss", markCorrect: "Mark as correct", markMiss: "Mark as missed", direction: "Tilt up to pass · down for correct", time: "Time", results: "Round over", again: "Play again", cancel: "Cancel round", cancelTitle: "Cancel this round?", cancelDescription: "This round's progress will be discarded.", continue: "Keep playing", denied: "Motion permission is required to begin.", empty: "This category does not have options yet.", unavailable: "The catalog could not be loaded. Try again." },
};

export default function HeadsUpGame() {
  const [language, setLanguage] = useState("es");
  const [duration, setDuration] = useState(60);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [phase, setPhase] = useState("setup");
  const [countdown, setCountdown] = useState(3);
  const [remaining, setRemaining] = useState(60);
  const [round, setRound] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const copy = COPY[language];

  useEffect(() => {
    localStorage.setItem("headsUpLanguage", language);
    fetch(`/api/heads-up/categories?lang=${language}`).then((res) => { if (!res.ok) throw new Error("catalog"); return res.json(); }).then((data) => { setCategories(data.categories || []); setCatalogError(false); }).catch(() => { setCategories([]); setCatalogError(true); }).finally(() => setCatalogLoading(false));
  }, [language]);

  const chooseCategory = async (category) => {
    setSelected(category); setPhase("loading");
    try {
      const response = await fetch(`/api/heads-up/categories/${category.id}/options?lang=${language}`);
      if (!response.ok) throw new Error("options");
      const data = await response.json(); setOptions(data.options || []);
    } catch { setOptions([]); setCatalogError(true); }
    setPhase("setup");
  };

  const handleGesture = useCallback((gesture) => {
    setRound((current) => current ? recordGesture(current, gesture) : current);
    setFeedback(gesture); if (navigator.vibrate) navigator.vibrate(gesture === "correct" ? 90 : [45, 40, 45]);
    window.setTimeout(() => setFeedback(null), 300);
  }, []);
  const { permission, requestPermission } = useTiltGesture({ enabled: phase === "playing" && !cancelOpen, onGesture: handleGesture });

  const begin = async () => {
    if (!options.length || !(await requestPermission())) return;
    setRound(createRound({ options, durationSeconds: duration })); setRemaining(duration); setCountdown(3); setPhase("countdown");
  };

  const cancelRound = () => {
    setCancelOpen(false);
    setPhase("setup");
    setRound(null);
    setFeedback(null);
    setRemaining(duration);
  };

  useEffect(() => {
    if (phase !== "countdown") return undefined;
    const timer = window.setTimeout(() => countdown > 1 ? setCountdown((value) => value - 1) : setPhase("playing"), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "playing" || cancelOpen) return undefined;
    const timer = window.setInterval(() => setRemaining((value) => { if (value <= 1) { window.clearInterval(timer); setPhase("results"); return 0; } return value - 1; }), 1000);
    return () => window.clearInterval(timer);
  }, [cancelOpen, phase]);

  const current = round?.queue[round.currentIndex % round.queue.length];
  const score = round?.correct.length || 0;
  const accent = feedback === "correct" ? "bg-emerald-500" : feedback === "pass" ? "bg-rose-500" : "bg-amber-300";
  const categoryCards = categories.map((category) => (
    <button key={category.id} onClick={() => chooseCategory(category)} className={`group rounded-[2rem] border p-5 text-left transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 ${selected?.id === category.id ? "border-amber-300 bg-amber-300 text-stone-950" : "border-white/10 bg-stone-900 text-white"}`}>
      <span className="block text-2xl font-black">{category.name}</span><span className={`mt-2 block text-sm ${selected?.id === category.id ? "text-stone-700" : "text-stone-400"}`}>{category.optionCount} {copy.cards}</span>
    </button>
  ));

  if (phase === "countdown") return <main className="min-h-dvh bg-amber-300 text-stone-950 grid place-items-center"><div className="text-center"><p className="mb-6 text-xl font-bold">{copy.rotate}</p><div className="text-[12rem] font-black leading-none tabular-nums">{countdown}</div></div></main>;
  if (phase === "playing") return (
    <main className={`min-h-dvh ${accent} text-stone-950 transition-colors duration-200 grid grid-rows-[auto_1fr_auto] p-5`}>
      <header className="flex items-center justify-between text-xl font-black">
        <span>{selected?.name}</span>
        <div className="flex items-center gap-2">
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger asChild>
              <Button aria-label={copy.cancel} variant="ghost" size="icon" className="rounded-full border border-stone-950/10 bg-stone-950/10 text-stone-950/60 hover:bg-stone-950/20 hover:text-stone-950 focus-visible:ring-stone-950/40">
                <X />
              </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="border-stone-700 bg-stone-950 p-6 text-white ring-white/10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">{copy.cancelTitle}</DialogTitle>
                <DialogDescription className="text-stone-400">{copy.cancelDescription}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="-mx-6 -mb-6 border-white/10 bg-stone-900/80 p-6">
                <DialogClose asChild>
                  <Button variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">{copy.continue}</Button>
                </DialogClose>
                <Button onClick={cancelRound} className="bg-rose-600 text-white hover:bg-rose-500">{copy.cancel}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <span className="rounded-full bg-stone-950 px-5 py-2 text-white tabular-nums">{remaining}s</span>
        </div>
      </header>
      <section className="grid place-items-center"><div className="max-w-5xl text-center text-6xl font-black leading-none sm:text-8xl md:text-9xl">{feedback ? (feedback === "correct" ? copy.correct : copy.pass) : current?.text}</div></section>
      <footer className="flex justify-between text-sm font-black uppercase tracking-[.25em]"><span>↑ {copy.pass}</span><span>{score}</span><span>{copy.correct} ↓</span></footer>
    </main>
  );
  if (phase === "results") return <main className="min-h-dvh bg-stone-950 p-6 text-white"><div className="mx-auto max-w-3xl pt-16"><p className="text-sm font-black uppercase tracking-[.3em] text-amber-300">{copy.results}</p><div className="my-8 text-9xl font-black text-amber-300 tabular-nums">{score}</div><div className="grid gap-3">{round?.results.map((result, index) => { const isCorrect = result.outcome === "correct"; return <button key={`${result.option.id}-${index}`} type="button" aria-label={`${isCorrect ? copy.markMiss : copy.markCorrect}: ${result.option.text}`} aria-pressed={isCorrect} onClick={() => setRound((currentRound) => toggleResult(currentRound, index))} className={`flex min-h-16 w-full items-center gap-4 rounded-2xl border p-4 text-left font-black transition-[transform,opacity] duration-100 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 ${isCorrect ? "border-emerald-400 bg-emerald-500 text-stone-950 hover:bg-emerald-400" : "border-rose-400/20 bg-rose-500/10 text-rose-200 opacity-60 hover:bg-rose-500/20 hover:opacity-100 focus-visible:opacity-100"}`}><span className="w-8 shrink-0 text-center font-mono text-sm opacity-60">{index + 1}</span>{isCorrect ? <Check /> : <X />}<span className="min-w-0 flex-1 text-lg">{result.option.text}</span><span className="text-xs uppercase tracking-wider opacity-80">{isCorrect ? copy.correct : copy.miss}</span></button>; })}</div><Button onClick={() => setPhase("setup")} className="mt-10 h-14 w-full rounded-2xl bg-amber-300 text-lg font-black text-stone-950"><RotateCcw />{copy.again}</Button></div></main>;

  return <main className="min-h-dvh bg-stone-950 p-5 text-white"><div className="mx-auto max-w-5xl py-8"><header className="mb-10 flex flex-wrap items-center justify-between gap-4"><Link href="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-white"><ArrowLeft /> Family Arcade</Link><div className="flex items-center gap-2 rounded-full bg-stone-900 p-1">{["es", "en"].map((lang) => <button key={lang} onClick={() => { setLanguage(lang); setSelected(null); setOptions([]); setCatalogLoading(true); }} className={`rounded-full px-4 py-2 text-sm font-black uppercase ${language === lang ? "bg-amber-300 text-stone-950" : "text-stone-400"}`}>{lang}</button>)}</div></header><div className="mb-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><p className="mb-2 text-sm font-black uppercase tracking-[.3em] text-amber-300">Heads Up</p><h1 className="max-w-3xl text-5xl font-black leading-none sm:text-7xl">{copy.title}</h1></div><label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900 p-3"><Clock3 className="text-amber-300"/><input aria-label={copy.time} type="number" min="15" max="300" step="15" value={duration} onChange={(event) => setDuration(Math.min(300, Math.max(15, Number(event.target.value) || 60)))} className="w-20 bg-transparent text-2xl font-black outline-none"/><span className="text-stone-400">{copy.seconds}</span><Settings2 className="text-stone-600"/></label></div><h2 className="mb-5 text-xl font-black">{copy.choose}</h2>{catalogLoading && <p className="mb-4 animate-pulse text-stone-400">{copy.loading}</p>}{catalogError && <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">{copy.unavailable}</p>}{selected && <div className="mb-5 rounded-3xl border border-amber-300/30 bg-amber-300/5 p-4"><p className="mb-3 text-center text-sm font-black uppercase tracking-[.16em] text-amber-200">{copy.direction}</p><Button onClick={begin} disabled={!options.length || phase === "loading"} className="h-16 w-full rounded-2xl bg-amber-300 text-xl font-black text-stone-950 hover:bg-amber-200">{phase === "loading" ? copy.loading : copy.start}</Button>{!options.length && phase !== "loading" && <p className="mt-3 text-center text-rose-300">{copy.empty}</p>}{["denied", "unsupported"].includes(permission) && <p className="mt-3 text-center text-rose-300">{copy.denied}</p>}</div>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categoryCards}</div></div></main>;
}
