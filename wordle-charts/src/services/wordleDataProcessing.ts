import { WordleStats, PersonalData, PersonalStats } from '@/types/wordle_types';
import puzzleIds from '@/data/archive/relevant_puzzle_ids.json';
import { fromUnixTime, format } from 'date-fns';

export const getBookmarkletCode = (): string => {
  const ids = puzzleIds.puzzle_ids.join(',');
  return `javascript:(function(){
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

export const calculateWordleStats = (data: PersonalData[]): WordleStats => {
  if (!data.length) return {} as WordleStats;

  const latestGameData = data.reduce((latest, current) => 
    current.timestamp > latest.timestamp ? current : latest
  );

  const stats = latestGameData?.game_data?.setLegacyStats;
  if (!stats) return {} as WordleStats;

  const totalGuesses = Object.entries(stats.guesses)
    .filter(([key]) => key !== 'fail')
    .reduce((sum, [key, value]) => sum + (Number(key) * value), 0);
  
  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    currentStreak: stats.currentStreak,
    maxStreak: stats.maxStreak,
    guessDistribution: stats.guesses,
    winRate: (stats.gamesWon / stats.gamesPlayed) * 100,
    averageGuesses: totalGuesses / stats.gamesWon
  };
};

export const calculateCumulativeAverage = (data: any[], isHardMode: boolean): number => {
  if (!data?.length) return 0;
  const sum = data.reduce((acc, curr) => acc + (isHardMode ? curr.hardAverage : curr.average), 0);
  return sum / data.length;
};

interface CompletionTimes {
  average: string;
  earliest: {
    time: string;
    date: string;
  };
  latest: {
    time: string;
    date: string;
  };
}

export const calculateCompletionTimes = (data: PersonalData[]): CompletionTimes => {
  if (!data.length) return { 
    average: 'N/A', 
    earliest: { time: 'N/A', date: 'N/A' }, 
    latest: { time: 'N/A', date: 'N/A' } 
  };

  const wins = data.filter(entry => entry.game_data.status === "WIN");
  if (!wins.length) return { 
    average: 'N/A', 
    earliest: { time: 'N/A', date: 'N/A' }, 
    latest: { time: 'N/A', date: 'N/A' } 
  };

  // Calculate average
  const totalMinutes = wins.reduce((sum, entry) => {
    const date = fromUnixTime(entry.timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return sum + (hours * 60) + minutes;
  }, 0);

  const averageMinutes = totalMinutes / wins.length;
  const averageHours = Math.floor(averageMinutes / 60);
  const averageMins = Math.round(averageMinutes % 60);

  // Find earliest and latest
  const [earliest, latest] = wins.reduce(([earliest, latest], entry) => {
    const date = fromUnixTime(entry.timestamp);
    const minutes = date.getHours() * 60 + date.getMinutes();
    
    if (!earliest || minutes < (earliest.getHours() * 60 + earliest.getMinutes())) {
      earliest = date;
    }
    if (!latest || minutes > (latest.getHours() * 60 + latest.getMinutes())) {
      latest = date;
    }
    
    return [earliest, latest];
  }, [null, null] as [Date | null, Date | null]);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeFormat = 'h:mm a';
  const dateFormat = 'MMM d, yyyy';

  return {
    average: `${format(new Date(0, 0, 0, averageHours, averageMins), timeFormat)} ${timezone}`,
    earliest: {
      time: format(earliest!, timeFormat),
      date: format(earliest!, dateFormat)
    },
    latest: {
      time: format(latest!, timeFormat),
      date: format(latest!, dateFormat)
    }
  };
}; 

export const calculateMostActiveHour = (data: PersonalData[]): { hour: string; count: number } => {
  const hourCount: { [key: string]: number } = {};

  data.forEach(entry => {
    if (entry.game_data.status === "WIN") {
      const date = fromUnixTime(entry.timestamp);
      const hour = date.getHours();
      const hourKey = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'} - ${((hour + 1) % 12) || 12}:00 ${hour + 1 < 12 ? 'AM' : 'PM'}`;
      hourCount[hourKey] = (hourCount[hourKey] || 0) + 1;
    }
  });

  const mostActiveHour = Object.entries(hourCount).reduce((prev, curr) => 
    curr[1] > prev[1] ? curr : prev
  );

  return { hour: mostActiveHour[0], count: mostActiveHour[1] || 0 };
}; 

export interface FirstGuessData {
  name: string;
  size: number;
}

export const calculateFirstGuessFrequency = (data: PersonalData[]): FirstGuessData[] => {
  const firstGuesses: { [key: string]: number } = {};
  
  data.forEach(entry => {
    if (entry.game_data.boardState.length > 0 && entry.game_data.boardState[0]) {
      const firstGuess = entry.game_data.boardState[0].toUpperCase();
      firstGuesses[firstGuess] = (firstGuesses[firstGuess] || 0) + 1;
    }
  });

  return Object.entries(firstGuesses)
    .map(([name, size]) => ({ name, size }))
    .sort((a, b) => b.size - a.size);
};