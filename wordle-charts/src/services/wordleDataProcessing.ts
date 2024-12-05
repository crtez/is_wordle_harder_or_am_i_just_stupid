import { WordleStats, PersonalData } from '@/types/wordle_types';
import puzzleIds from '@/data/archive/relevant_puzzle_ids.json';

export const getBookmarkletCode = (): string => {
  const ids = puzzleIds.puzzle_ids.join(',');
  return `ajavascript:(function(){
    const ids = '${ids}';
    if (!ids) return;

    const allIds = ids.split(',').map(id => id.trim()).filter(id => id !== '');
    let allGameData = [];

    async function fetchChunks(startIndex = 0) {
      if (startIndex >= allIds.length) {
        const blob = new Blob([JSON.stringify(allGameData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_wordle_data.json';
        a.click();
        return;
      }

      const chunk = allIds.slice(startIndex, startIndex + 31);
      const url = \`https://www.nytimes.com/svc/games/state/wordleV2/latests?puzzle_ids=\${chunk.join(',')}\`;
      
      try {
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
        
        const data = await response.json();
        if (data.states && Array.isArray(data.states)) {
          allGameData = allGameData.concat(data.states);
        }
        
        console.log(\`Fetched \${chunk.length} puzzles. Total: \${allGameData.length}\`);
        setTimeout(() => fetchChunks(startIndex + 31), 1000);
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchChunks();
  })();`;
}; 

export const processWordleData = (data: any[], personalData: PersonalData[], isHardMode = false) => {
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
      personalDifference: personalGuesses ? personalGuesses - (isHardMode ? d.hardAverage : d.average) : null
    };
  });
};

export const calculatePersonalStats = (data: any[], personalData: PersonalData[], isHardMode: boolean = false) => {
  let matchCount = 0, aboveCount = 0, belowCount = 0;

  data?.forEach(d => {
    const personalGame = personalData.find(p => 
      p.game_data.status === "WIN" && 
      p.game_data.boardState.filter(row => row !== "").slice(-1)[0]?.toLowerCase() === d.word.toLowerCase()
    );
    if (personalGame) {
      matchCount++;
      const personalGuesses = personalGame.game_data.boardState.filter(row => row !== "").length;
      const compareAverage = isHardMode ? d.hardAverage : d.average;
      if (personalGuesses > compareAverage) aboveCount++;
      if (personalGuesses < compareAverage) belowCount++;
    }
  });

  return {
    count: matchCount,
    total: data?.length || 0,
    aboveAverage: aboveCount,
    belowAverage: belowCount
  };
};

export const calculateRollingAverage = (data: any[], days: number, isHardMode: boolean) => {
  return data.map((item, index) => {
    if (index < days - 1) {
      return { ...item, rollingAverage: null };
    }
    const startIndex = index - days + 1;
    const window = data.slice(startIndex, index + 1);
    const sum = window.reduce((acc, curr) => 
      acc + (isHardMode ? curr.hardAverage : curr.average), 0
    );
    return {
      ...item,
      rollingAverage: sum / days
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