import { NextResponse } from 'next/server';

const SYMBOLS = ['♠️', '♥️', '♣️', '♦️', 'A', 'K', 'Q', 'J'];
const SCATTER = '⚡';
const WILD = '👑';

// Multipliers now scale up much higher!
const MULTIPLIERS_NORMAL = [1, 2, 3, 5, 10, 15, 20, 25, 30];
const MULTIPLIERS_FREE = [2, 4, 6, 10, 20, 30, 40, 50, 60]; 

function getRandomSymbol() {
  const rand = Math.random();
  // Adjusted probabilities so getting 0 wins is very common
  if (rand < 0.035) return SCATTER;
  if (rand < 0.065) return WILD;
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

export async function POST(request) {
  try {
    const { bet, currentBalance, isFreeSpin } = await request.json();

    if (!isFreeSpin && currentBalance < bet) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    let board = Array.from({ length: 20 }, () => getRandomSymbol());
    let cascades = [];
    let totalWin = 0;
    let comboCount = 0;
    
    // Check initial scatter count
    let initialScatterCount = board.filter(s => s === SCATTER).length;
    // 4 scatters are now strictly required to trigger free spins!
    let triggerFreeSpins = initialScatterCount >= 4;

    let hasWin = true;
    let currentBoard = [...board];

    while(hasWin && comboCount < 12) {
       let counts = {};
       
       currentBoard.forEach(sym => {
           if(sym !== SCATTER && sym !== WILD) {
               counts[sym] = (counts[sym] || 0) + 1;
           }
       });

       // A win requires 4 or more matching symbols anywhere on the board
       let winningSymbols = Object.keys(counts).filter(sym => counts[sym] >= 4);

       if (winningSymbols.length > 0) {
           let multArray = isFreeSpin ? MULTIPLIERS_FREE : MULTIPLIERS_NORMAL;
           let multIndex = Math.min(comboCount, multArray.length - 1);
           let currentMult = multArray[multIndex];
           
           let stepWin = 0;
           winningSymbols.forEach(sym => {
               let matchCount = counts[sym];
               let wildCount = currentBoard.filter(s => s === WILD).length;
               matchCount += wildCount;

               let payout = (matchCount - 3) * 0.35 * bet;
               stepWin += payout * currentMult;
           });

           totalWin += stepWin;

           cascades.push({
               board: [...currentBoard],
               winningSymbols,
               win: stepWin,
               multiplier: currentMult,
               combo: comboCount + 1
           });

           // Replace only winning symbols to drop new ones
           currentBoard = currentBoard.map(sym => 
               winningSymbols.includes(sym) ? getRandomSymbol() : sym
           );
           comboCount++;
       } else {
           hasWin = false;
           if (comboCount === 0) {
               cascades.push({
                   board: [...currentBoard],
                   winningSymbols: [],
                   win: 0,
                   multiplier: isFreeSpin ? MULTIPLIERS_FREE[0] : 1,
                   combo: 0
               });
           }
       }
    }

    const newBalance = isFreeSpin ? currentBalance + totalWin : currentBalance - bet + totalWin;

    return NextResponse.json({
        cascades,
        totalWin,
        triggerFreeSpins,
        scatterCount: initialScatterCount,
        newBalance
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}