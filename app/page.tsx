"use client";
import React, { useState, useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [balance, setBalance] = useState(1362.44);
  const [bet, setBet] = useState(1.00);
  const [win, setWin] = useState(0.00);
  
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [board, setBoard] = useState<string[]>(Array(20).fill('♠️'));
  const [boomingSymbols, setBoomingSymbols] = useState<string[]>([]);
  const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);

  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [showFreeSpinTap, setShowFreeSpinTap] = useState(false);
  
  const [stepWinAmount, setStepWinAmount] = useState<number | null>(null);
  const [winTierText, setWinTierText] = useState<string | null>(null);
  const [isBalanceBumping, setIsBalanceBumping] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bgStars, setBgStars] = useState<Particle[]>([]);

  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio('/sounds/background.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.2; 
    
    const stars = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: ['#facc15', '#f472b6', '#38bdf8', '#c084fc'][Math.floor(Math.random() * 4)],
      size: Math.random() * 6 + 2
    }));
    setBgStars(stars);
  }, []);

  const startGame = () => {
    setHasStarted(true);
    if (bgMusicRef.current) {
      bgMusicRef.current.play().catch(() => console.log("Audio blocked"));
    }
  };

  const playWinTierSound = (winAmount: number) => {
    if (winAmount >= 200) { setWinTierText("PRObleMA!"); playSound('s.mp3', 0.8); }
    else if (winAmount >= 150) { setWinTierText("SAVAGE"); playSound('s.mp3', 0.8); }
    else if (winAmount >= 100) { setWinTierText("MANIAC"); playSound('m.mp3', 0.8); }
    else if (winAmount >= 70) { setWinTierText("TRIPLE KILL"); playSound('3.mp3', 0.8); }
    else if (winAmount >= 40) { setWinTierText("DOUBLE KILL"); playSound('2.mp3', 0.8); }
    else if (winAmount >= 20) { setWinTierText("FIRST BLOOD"); playSound('f.mp3', 0.8); }
  };

  const playSound = (fileName: string, volumeLevel = 0.7) => {
    try {
      const audio = new Audio(`/sounds/${fileName}`);
      audio.volume = fileName === 'fah.mp3' ? 0.15 : volumeLevel;
      audio.play().catch(() => {});
    } catch {}
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const buyFreeSpins = (spinCount: number, cost: number) => {
    if (isSpinning || isAutoSpinning || balance < cost) return;
    setBalance(prev => prev - cost);
    setFreeSpinsLeft(spinCount);
    setIsFreeSpinMode(true);
    setIsAutoSpinning(true);
    playSound('paldo.mp3', 0.8);
  };

  const spawnExplosionParticles = () => {
    const newParticles: Particle[] = [];
    const colors = ['#facc15', '#ec4899', '#06b6d4', '#4ade80', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        id: Math.random(),
        x: (Math.random() - 0.5) * 250,
        y: (Math.random() - 0.5) * 250,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 0
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);
  };

  const handleSpin = async (isFreeSpin = false) => {
    if (isSpinning || (!isFreeSpin && balance < bet)) return;
    
    setIsSpinning(true);
    setWin(0);
    setCurrentMultiplier(isFreeSpinMode ? 2 : 1);
    setWinTierText(null);
    setStepWinAmount(null); 
    setBoomingSymbols([]);

    setBoard(Array(20).fill('blur'));

    try {
      const response = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, currentBalance: balance, isFreeSpin })
      });

      const data = await response.json();
      
      if (isFreeSpin) setFreeSpinsLeft(prev => prev - 1);

      let runningWin = 0;

      for (let i = 0; i < data.cascades.length; i++) {
        const cascade = data.cascades[i];
        
        setBoard(cascade.board);
        setCurrentMultiplier(cascade.multiplier);
        
        if (cascade.combo > 0) {
            setBoomingSymbols(cascade.winningSymbols);
            setStepWinAmount(cascade.win); 
            spawnExplosionParticles();
            
            runningWin += cascade.win;
            setWin(runningWin); 

            playWinTierSound(runningWin);
            
            playSound('fah.mp3');
            await delay(900); 
            
            setBoomingSymbols([]); 
            setStepWinAmount(null);
            setTimeout(() => setWinTierText(null), 800);
        } else {
            await delay(500);
        }
      }

      setIsSpinning(false);

      // --- ARAKO SOUND LOGIC FIX ---
      if (data.triggerFreeSpins && !isAutoSpinning) {
        playSound('paldo.mp3', 0.8);
        setShowFreeSpinTap(true);
      } else {
        // Play Arako if the player won NOTHING, OR if they got teased with 2 or 3 scatters
        if (data.totalWin === 0 || data.scatterCount === 2 || data.scatterCount === 3) {
          playSound('arako.mp3', 0.8);
        }
      }

      if (data.totalWin > 0) {
        setIsBalanceBumping(true);
        setBalance(data.newBalance);
        setTimeout(() => setIsBalanceBumping(false), 2000);
      } else {
        setBalance(data.newBalance);
      }

    } catch {
      setIsSpinning(false);
    }
  };

  useEffect(() => {
    if (isAutoSpinning && freeSpinsLeft > 0 && !isSpinning) {
      const timer = setTimeout(() => handleSpin(true), 1500); 
      return () => clearTimeout(timer);
    } else if (isAutoSpinning && freeSpinsLeft === 0 && !isSpinning) {
      setIsAutoSpinning(false);
      setIsFreeSpinMode(false);
    }
  }, [isAutoSpinning, freeSpinsLeft, isSpinning]);

  const startFreeSpins = () => {
    setFreeSpinsLeft(10);
    setShowFreeSpinTap(false);
    setIsAutoSpinning(true);
    setIsFreeSpinMode(true);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root { background-color: #0f172a; }
        body { margin: 0; padding: 0; overflow-x: hidden; background-color: #0f172a; }

        @keyframes float-up {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-20vh) rotate(360deg); opacity: 0; }
        }
        .anime-bg-element {
          position: absolute;
          animation: float-up 15s linear infinite;
          border-radius: 50%;
          filter: blur(4px);
        }

        @keyframes pulse-glow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); box-shadow: 0 0 25px rgba(250, 204, 21, 1); } }
        .scatter-pulse { animation: pulse-glow 1s ease-in-out infinite; }
        
        @keyframes boom {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.35); opacity: 1; text-shadow: 0 0 30px yellow; z-index: 50; }
            100% { transform: scale(0); opacity: 0; }
        }
        .is-booming { animation: boom 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; background-color: rgba(234, 179, 8, 0.3); border-color: #facc15; }
        
        .blur-reel { filter: blur(6px); opacity: 0.5; }
        
        @keyframes explode-text { 
            0% { transform: scale(0.1) rotate(-15deg); opacity: 0; } 
            20% { transform: scale(1.4) rotate(5deg); opacity: 1; text-shadow: 0 0 40px #ef4444; } 
            80% { transform: scale(1.1) rotate(0deg); opacity: 1; } 
            100% { transform: scale(1.8); opacity: 0; }
        }
        .moba-win-text { animation: explode-text 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        @keyframes particle-fade {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; }
        }
        .particle { animation: particle-fade 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }

        @keyframes banner-slide {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
        }
        .ticker-text { animation: banner-slide 18s linear infinite; }

        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .floating-cards { animation: bounce-slow 3s ease-in-out infinite; }

        .anime-gradient {
          background: linear-gradient(-45deg, #3b0764, #be185d, #0f172a, #1e1b4b);
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}} />

      <div className="fixed inset-0 w-full h-full anime-gradient -z-20"></div>

      <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        {bgStars.map((star) => (
          <div 
            key={`star-${star.id}`}
            className="anime-bg-element"
            style={{
              left: `${star.x}vw`,
              bottom: `-20vh`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen font-sans select-none pb-4 relative overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle absolute rounded-full left-1/2 top-1/2 shadow-[0_0_10px_currentColor]"
              style={{
                width: '10px', height: '10px',
                backgroundColor: p.color,
                color: p.color,
                '--x': `${p.x}px`,
                '--y': `${p.y}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {showFreeSpinTap && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 cursor-pointer backdrop-blur-sm" onClick={startFreeSpins}>
             <div className="text-8xl mb-6 animate-bounce">⚡⚡⚡⚡</div>
             <h1 className="text-6xl font-black text-pink-500 text-center mb-8 drop-shadow-[0_0_20px_#ec4899]" style={{ fontFamily: 'Impact' }}>4 SCATTERS HIT</h1>
             <p className="text-white text-3xl font-bold animate-pulse text-center">TAP TO UNLEASH<br/><span className="text-cyan-400 font-extrabold text-5xl">10 FREE SPINS</span></p>
          </div>
        )}

        {!hasStarted && (
          <div className="w-full max-w-md px-6 flex flex-col items-center justify-center z-20 h-screen relative">
            <div className="bg-[#15121F]/80 backdrop-blur-md border-2 border-pink-500/50 p-8 pt-12 rounded-[2.5rem] text-center flex flex-col items-center relative w-full shadow-[0_0_50px_rgba(236,72,153,0.4)]">
              
              <div className="relative w-36 h-36 flex items-center justify-center mb-6">
                <div className="absolute -right-4 -top-2 rotate-12 bg-white rounded-md w-12 h-16 border border-gray-300 shadow-xl flex flex-col items-center justify-center font-bold text-red-600 text-xs floating-cards">
                  <span>A</span><span>♦</span>
                </div>
                <div className="absolute -right-10 top-4 rotate-[25deg] bg-white rounded-md w-12 h-16 border border-gray-300 shadow-xl flex flex-col items-center justify-center font-bold text-black text-xs floating-cards" style={{ animationDelay: '0.3s' }}>
                  <span>A</span><span>♣</span>
                </div>
                <div className="absolute -right-16 top-14 rotate-[38deg] bg-white rounded-md w-12 h-16 border border-gray-300 shadow-xl flex flex-col items-center justify-center font-bold text-red-600 text-xs floating-cards" style={{ animationDelay: '0.6s' }}>
                  <span>A</span><span>♥</span>
                </div>
                
                <div className="w-28 h-28 rounded-full bg-[#1F1933] border-4 border-pink-500 overflow-hidden flex items-center justify-center shadow-[0_0_20px_#ec4899] relative">
                  <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="53" r="30" fill="#FCE3D2"/>
                    <path d="M20 40C20 20 80 20 80 40C80 44 75 48 50 48C25 48 20 44 20 40Z" fill="#1C1A24"/>
                    <ellipse cx="40" cy="48" rx="3" ry="4" fill="#1C1A24"/>
                    <ellipse cx="60" cy="48" rx="3" ry="4" fill="#1C1A24"/>
                    <path d="M36 41C40 40 42 41 42 41" stroke="#1C1A24" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M64 41C60 40 58 41 58 41" stroke="#1C1A24" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M44 58C44 58 47 61 50 61C53 61 56 58 56 58" stroke="#E05B49" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              <h2 className="text-cyan-400 font-extrabold text-sm tracking-wider uppercase mb-1 drop-shadow-md">WELCOME TO</h2>
              <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-300 to-cyan-400 mb-6 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" style={{ fontFamily: 'Impact' }}>PROB</h1>
              
              <div className="bg-[#1E172B] border border-cyan-500/50 rounded-full px-4 py-1.5 flex items-center gap-2 mb-6 shadow-inner animate-pulse">
                <span className="bg-pink-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">18</span>
                <span className="text-cyan-300 font-extrabold text-xs tracking-wider">PLAY RESPONSIBLY</span>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-8 max-w-xs font-medium">
                Experience the ultimate simulated spinning thrill. Please remember to set your limits, play for fun, and enjoy the game safely!
              </p>

              <button onClick={startGame} className="w-full py-4 rounded-full font-black text-xl tracking-widest uppercase text-white border-2 border-pink-400 bg-gradient-to-r from-pink-600 via-purple-500 to-cyan-600 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(236,72,153,0.6)]">
                GET STARTED 🎰
              </button>
            </div>
          </div>
        )}

        {hasStarted && (
          <div className="w-full flex flex-col items-center pt-4 relative min-h-screen">
            <button onClick={() => { setHasStarted(false); if (bgMusicRef.current) bgMusicRef.current.pause(); }} className="absolute top-4 left-4 z-50 bg-black/70 border border-pink-500/40 text-pink-400 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-md">
              ◀ Menu
            </button>

            <div className="w-full max-w-md pb-2 flex flex-col items-center relative z-10 mt-12">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-white to-cyan-400 mb-3 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" style={{ fontFamily: 'Impact' }}>ProB</h1>
              
              <div className="flex items-center justify-center space-x-4 bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                {isFreeSpinMode ? (
                    <>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier === 2 ? 'text-pink-400 scale-125 drop-shadow-[0_0_10px_#ec4899]' : 'text-gray-400'}`}>×2</span>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier === 4 ? 'text-purple-400 scale-125 drop-shadow-[0_0_10px_#a855f7]' : 'text-gray-400'}`}>×4</span>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier === 6 ? 'text-cyan-400 scale-125 drop-shadow-[0_0_10px_#06b6d4]' : 'text-gray-400'}`}>×6</span>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier >= 10 ? 'text-green-400 scale-130 animate-pulse drop-shadow-[0_0_15px_#4ade80]' : 'text-gray-400'}`}>×10+</span>
                    </>
                ) : (
                    <>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier === 1 ? 'text-pink-400 scale-125 drop-shadow-[0_0_10px_#ec4899]' : 'text-gray-400'}`}>×1</span>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier === 2 ? 'text-purple-400 scale-125 drop-shadow-[0_0_10px_#a855f7]' : 'text-gray-400'}`}>×2</span>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier === 3 ? 'text-cyan-400 scale-125 drop-shadow-[0_0_10px_#06b6d4]' : 'text-gray-400'}`}>×3</span>
                        <span className={`font-bold text-xl transition-all ${currentMultiplier >= 5 ? 'text-green-400 scale-130 animate-pulse drop-shadow-[0_0_15px_#4ade80]' : 'text-gray-400'}`}>×5+</span>
                    </>
                )}
              </div>
              
              {isAutoSpinning && (
                <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black px-6 py-1.5 rounded-full text-sm mt-3 animate-pulse border-2 border-white shadow-[0_0_20px_#ec4899]">
                  FREE SPINS: {freeSpinsLeft} LEFT
                </div>
              )}
            </div>

            {/* SLOT GRID */}
            <div className="w-full max-w-[380px] px-2 mt-2 relative">
              
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                {winTierText && (
                  <h1 className="moba-win-text text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-pink-500 to-purple-800 drop-shadow-[0_5px_10px_rgba(0,0,0,0.9)] absolute top-0" style={{ fontFamily: 'Impact', WebkitTextStroke: '2px white' }}>
                    {winTierText}
                  </h1>
                )}

                {stepWinAmount !== null && stepWinAmount > 0 && (
                    <div className="flex flex-col items-center mt-12 animate-bounce">
                      <h2 className="text-5xl font-black text-pink-400 drop-shadow-[0_0_20px_#ec4899]" style={{ fontFamily: 'Impact', WebkitTextStroke: '2px white' }}>
                        PALDO! ×{currentMultiplier}
                      </h2>
                      <h3 className="text-5xl font-black text-cyan-400 drop-shadow-[0_0_20px_#06b6d4] mt-1" style={{ fontFamily: 'Impact', WebkitTextStroke: '2px white' }}>
                        + ₱{stepWinAmount.toFixed(2)}
                      </h3>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-5 gap-[4px] bg-black/60 backdrop-blur-md p-2 rounded-xl border-4 border-pink-500/60 shadow-[0_0_40px_rgba(236,72,153,0.4)]">
                {board.map((symbol, index) => {
                  const isBooming = boomingSymbols.includes(symbol);
                  return (
                    <div key={index} className={`relative aspect-[3/4] rounded bg-gradient-to-b from-[#1E1B4B] to-[#0F172A] border flex items-center justify-center overflow-hidden transition-all duration-300 ${isBooming ? 'is-booming' : 'border-[#312E81]'} ${symbol === 'blur' ? 'blur-reel' : ''}`}>
                        {symbol === '⚡' ? (
                          <div className="absolute inset-0 scatter-pulse rounded-full bg-gradient-to-b from-pink-500 to-purple-700 flex flex-col items-center justify-center border-2 border-pink-300">
                             <span className="text-3xl drop-shadow-[0_0_10px_white]">⚡</span>
                          </div>
                        ) : symbol === '👑' ? (
                          <span className="text-4xl drop-shadow-[0_0_10px_#facc15] text-yellow-400">👑</span>
                        ) : symbol !== 'blur' ? (
                          <span className={`text-4xl drop-shadow-md font-bold ${['♥️', '♦️'].includes(symbol) ? 'text-pink-500' : 'text-cyan-100'}`}>{symbol}</span>
                        ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CONTROLS AREA */}
            <div className="w-full max-w-md flex flex-col items-center mt-auto px-4 pt-4 pb-1">
              
              {/* FEATURE BUY BUTTONS */}
              <div className="flex gap-3 justify-center w-full mb-3">
                <button 
                  onClick={() => buyFreeSpins(5, 50.00)} 
                  disabled={isSpinning || isAutoSpinning || balance < 50.00} 
                  className="flex-1 py-2 rounded-xl font-black text-xs uppercase border border-pink-500 bg-gradient-to-r from-pink-900/60 to-purple-900/60 text-pink-300 hover:brightness-120 active:scale-95 transition-all disabled:opacity-30 shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                >
                  🎬 Buy 5 Spins <br/><span className="text-white text-sm">₱50.00</span>
                </button>
                <button 
                  onClick={() => buyFreeSpins(10, 100.00)} 
                  disabled={isSpinning || isAutoSpinning || balance < 100.00} 
                  className="flex-1 py-2 rounded-xl font-black text-xs uppercase border border-cyan-500 bg-gradient-to-r from-purple-900/60 to-cyan-900/60 text-cyan-300 hover:brightness-120 active:scale-95 transition-all disabled:opacity-30 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                >
                  🚀 Buy 10 Spins <br/><span className="text-white text-sm">₱100.00</span>
                </button>
              </div>

              <div className={`bg-black/80 backdrop-blur-sm border-2 px-6 py-2 rounded-full font-bold text-xl tracking-widest mb-4 transition-all ${win > 0 ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] text-cyan-300 scale-110' : 'border-pink-500/50 text-pink-400'}`}>
                WIN: <span className="text-white font-black">₱ {win.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between w-full mb-4 px-4">
                <div className={`flex gap-1 items-center bg-black/60 backdrop-blur-sm p-1.5 rounded-full border-2 border-purple-500/50 ${isAutoSpinning ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button onClick={() => setBet(prev => Math.max(1, prev - 1))} disabled={isSpinning} className="w-10 h-10 rounded-full bg-[#312E81] text-white font-black text-lg active:scale-90 hover:bg-pink-600 transition-colors">-</button>
                  <span className="text-white text-sm font-bold px-3 whitespace-nowrap">Bet ₱ {bet.toFixed(2)}</span>
                  <button onClick={() => setBet(prev => prev + 1)} disabled={isSpinning} className="w-10 h-10 rounded-full bg-[#312E81] text-white font-black text-lg active:scale-90 hover:bg-pink-600 transition-colors">+</button>
                </div>

                <button onClick={() => handleSpin(false)} disabled={isSpinning || isAutoSpinning || balance < bet} className={`w-20 h-20 rounded-full shadow-[0_0_30px_rgba(236,72,153,0.8)] border-4 border-white transition-all ${(isSpinning || isAutoSpinning) ? 'bg-gray-800 opacity-40' : 'bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-500 active:scale-90 hover:brightness-110'}`}>
                  <span className="text-4xl text-white font-bold flex items-center justify-center drop-shadow-md">↻</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-pink-200 font-bold text-sm bg-black/80 backdrop-blur-sm px-6 py-2.5 rounded-xl border-2 border-pink-500/50 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative mb-4">
                BALANCE: 
                <span className={`font-black text-lg transition-all ${isBalanceBumping ? 'animate-balance-bump text-white' : 'text-cyan-300'}`}>
                  ₱ {balance.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 py-1.5 overflow-hidden relative flex items-center select-none shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
              <div className="ticker-text whitespace-nowrap text-xs font-extrabold text-white uppercase flex gap-12 tracking-wider">
                <span>⚠️ 21 years old and above only. Know when to stop. Play responsibly. Simulated gaming only. www.pagcor.ph/regulatory</span>
                <span>⚠️ 21 years old and above only. Know when to stop. Play responsibly. Simulated gaming only. www.pagcor.ph/regulatory</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}