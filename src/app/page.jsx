'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gamepad2, Coins, Sparkles, Lock } from 'lucide-react';

export default function GamesHubPage() {
  const games = [
    {
      id: 'monopoly',
      title: 'Monopoly Dealer',
      description: 'Real-time digital finances & banker panel.',
      href: '/monopoly',
      icon: <Coins className="w-8 h-8 text-neon-gold" />,
      color: 'neon-gold',
      borderColor: 'border-neon-gold/50',
      glow: 'shadow-[0_0_30px_rgba(255,215,0,0.2)] hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]',
      isLocked: false,
      badge: 'ACTIVE'
    },
    {
      id: 'Chameleon',
      title: 'The Chameleon',
      description: ' try to find the chameleon among the players...',
      href: '/chameleon',
      icon: <Sparkles className="w-8 h-8 text-neon-cyan/50" />,
      color: 'neon-gold', 
      borderColor: 'border-neon-gold/50',
      glow: 'shadow-[0_0_30px_rgba(255,215,0,0.2)] hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]',
      isLocked: false,
      badge: 'ACTIVE'
    },
    {
      id: 'next-next-game',
      title: 'Mystery Game',
      description: 'The next big family adventure is brewing...',
      href: '#',
      icon: <Sparkles className="w-8 h-8 text-neon-cyan/50" />,
      color: 'neon-cyan',
      borderColor: 'border-white/10',
      glow: '',
      isLocked: true,
      badge: 'COMING SOON'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
      
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-10 relative z-10 animate-in slide-in-from-top-8 duration-500">
        <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-full mb-4 border border-white/10 backdrop-blur-md">
          <Gamepad2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 tracking-widest uppercase text-glow drop-shadow-2xl">
          Family Arcade
        </h1>
        <p className="text-slate-400 mt-3 font-bold tracking-widest uppercase text-xs md:text-sm">
          Select your game night experience
        </p>
      </div>

      {/* Games Flex Container */}
      <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-6 w-full max-w-4xl relative z-10">
        {games.map((game, index) => {
          const CardWrapper = game.isLocked ? 'div' : Link;
          
          return (
            <CardWrapper 
              key={game.id} 
              href={game.href}
              // El ancho fijo w-[340px] mantiene la carta mediana y consistente
              className={`block w-full sm:w-[340px] outline-none transition-all duration-500 animate-in zoom-in-90 delay-${index * 100} ${
                game.isLocked ? 'cursor-not-allowed opacity-60 grayscale-[50%]' : 'hover:-translate-y-2 focus-visible:ring-4 focus-visible:ring-white/20'
              }`}
            >
              <Card className={`h-full glass-panel border-2 ${game.borderColor} rounded-3xl overflow-hidden transition-all duration-500 ${game.glow} relative`}>
                
                {/* Top Badge */}
                <div className="absolute top-4 right-4 z-20">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full border backdrop-blur-md ${
                    game.isLocked 
                      ? 'bg-slate-900/50 text-slate-400 border-slate-700/50' 
                      : `bg-${game.color}/20 text-${game.color} border-${game.color}/50`
                  }`}>
                    {game.badge}
                  </span>
                </div>

                {/* Proporciones tipográficas e iconos reducidos */}
                <CardHeader className="pt-8 pb-2 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl mb-4 flex items-center justify-center transition-transform duration-500 ${
                    game.isLocked ? 'bg-white/5' : `bg-${game.color}/10 group-hover:scale-110 group-hover:rotate-3`
                  }`}>
                    {game.isLocked ? <Lock className="w-6 h-6 text-slate-500" /> : game.icon}
                  </div>
                  <CardTitle className={`text-2xl font-black tracking-wide ${game.isLocked ? 'text-slate-300' : 'text-white'}`}>
                    {game.title}
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-medium text-sm mt-1">
                    {game.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 pb-6">
                  {!game.isLocked && (
                    <div className={`inline-flex items-center text-xs font-bold tracking-widest uppercase mt-3 text-${game.color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                      Launch Game →
                    </div>
                  )}
                </CardContent>

                {/* Internal Glow Effect */}
                {!game.isLocked && (
                  <div className={`absolute -bottom-16 -right-16 w-48 h-48 bg-${game.color}/10 rounded-full blur-[50px] pointer-events-none transition-all duration-500 group-hover:bg-${game.color}/20`} />
                )}
              </Card>
            </CardWrapper>
          )
        })}
      </div>
    </div>
  );
}