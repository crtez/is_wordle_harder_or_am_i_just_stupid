import { PersonalData, PersonalStats } from '@/types/wordle_types';
import puzzleIds from '@/data/archive/relevant_puzzle_ids.json';

export const getBookmarkletCode = (): string => {
  const ids = puzzleIds.puzzle_ids.join(',');
  return `ajavascript:(function(){
    const ids = '${ids}';
    if (!ids) return;

    const allIds = ids.split(',').map(id => id.trim()).filter(id => id !== '');
    let allGameData = [];
    
    const CONCURRENT_REQUESTS = 3;
    const CHUNK_SIZE = 31;
    const DELAY = 1000;

    async function fetchChunk(chunk) {
      const url = 'https://www.nytimes.com/svc/games/state/wordleV2/latests?puzzle_ids=' + chunk.join(',');
      
      try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
        
        const data = await response.json();
        return data.states || [];
      } catch (error) {
        console.error('Error fetching chunk:', error);
        return [];
      }
    }

    async function processBatch(startIndex) {
      const chunks = [];
      
      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        const chunkStart = startIndex + (i * CHUNK_SIZE);
        if (chunkStart >= allIds.length) break;
        
        const chunk = allIds.slice(chunkStart, chunkStart + CHUNK_SIZE);
        chunks.push(fetchChunk(chunk));
      }

      if (chunks.length === 0) {
        const blob = new Blob([JSON.stringify(allGameData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_wordle_data.json';
        a.click();
        return;
      }

      const results = await Promise.all(chunks);
      const newData = results.flat();
      allGameData = allGameData.concat(newData);
      
      console.log('Fetched ' + newData.length + ' puzzles. Total: ' + allGameData.length);
      
      setTimeout(() => {
        processBatch(startIndex + (CONCURRENT_REQUESTS * CHUNK_SIZE));
      }, DELAY);
    }

    processBatch(0);
  })()`;
};

export const processWordleData = (data: any[], personalData: PersonalData[]) => {
  return data.map(d => {
    const personalGame = personalData.find(p => 
      p.game_data.status === "WIN" && 
      p.game_data.boardState.filter(row => row !== "").slice(-1)[0]?.toLowerCase() === d.word.toLowerCase()
    );
    const personalGuesses = personalGame ? 
      personalGame.game_data.boardState.filter((row: string) => row !== "").length :
      null;
    
    return {
      ...d,
      difference: d.hardAverage - d.average,
      personalDifference: personalGuesses ? personalGuesses - d.average : null,
      personalDifferenceHard: personalGuesses ? personalGuesses - d.hardAverage : null
    };
  });
};

export const calculatePersonalStats = (data: any[], personalData: PersonalData[]): PersonalStats => {
  let matchCount = 0;
  let normalAbove = 0, normalBelow = 0;
  let hardAbove = 0, hardBelow = 0;

  data?.forEach(d => {
    const personalGame = personalData.find(p => 
      p.game_data.status === "WIN" && 
      p.game_data.boardState.filter(row => row !== "").slice(-1)[0]?.toLowerCase() === d.word.toLowerCase()
    );
    if (personalGame) {
      matchCount++;
      const personalGuesses = personalGame.game_data.boardState.filter(row => row !== "").length;
      
      if (personalGuesses > d.average) normalAbove++;
      if (personalGuesses < d.average) normalBelow++;
      
      if (personalGuesses > d.hardAverage) hardAbove++;
      if (personalGuesses < d.hardAverage) hardBelow++;
    }
  });

  return {
    count: matchCount,
    total: data?.length || 0,
    normal: {
      aboveAverage: normalAbove,
      belowAverage: normalBelow
    },
    hard: {
      aboveAverage: hardAbove,
      belowAverage: hardBelow
    }
  };
};

export const calculateRollingAverage = (data: any[], days: number) => {
  return data.map((item, index) => {
    if (index < days - 1) {
      return { 
        ...item, 
        rollingAverage: null,
        rollingAverageHard: null 
      };
    }
    const startIndex = index - days + 1;
    const window = data.slice(startIndex, index + 1);
    
    const normalSum = window.reduce((acc, curr) => acc + curr.average, 0);
    const hardSum = window.reduce((acc, curr) => acc + curr.hardAverage, 0);
    
    return {
      ...item,
      rollingAverage: normalSum / days,
      rollingAverageHard: hardSum / days
    };
  });
};

export interface FirstGuessData {
  name: string;
  size: number;
  firstUsed: string;
}

export const calculateFirstGuessFrequency = (data: PersonalData[]): FirstGuessData[] => {
  const firstGuesses: { [key: string]: { count: number; firstUsed: number } } = {};
  
  data.forEach(entry => {
    if (entry.game_data.boardState.length > 0 && entry.game_data.boardState[0]) {
      const firstGuess = entry.game_data.boardState[0].toUpperCase();
      if (!firstGuesses[firstGuess]) {
        firstGuesses[firstGuess] = {
          count: 1,
          firstUsed: entry.timestamp
        };
      } else {
        firstGuesses[firstGuess].count += 1;
        firstGuesses[firstGuess].firstUsed = Math.min(firstGuesses[firstGuess].firstUsed, entry.timestamp);
      }
    }
  });

  return Object.entries(firstGuesses)
    .map(([name, data]) => ({ 
      name, 
      size: data.count,
      firstUsed: new Date(data.firstUsed * 1000).toISOString().split('T')[0]
    }))
    .sort((a, b) => b.size - a.size);
};