export interface PersonalData {
  puzzle_id: string;
  game_data: {
    boardState: string[];
    status: string;
    setLegacyStats: {
      gamesPlayed: number;
      gamesWon: number;
      currentStreak: number;
      maxStreak: number;
      guesses: Record<string, number>;
    };
  };
  timestamp: number;
}
  
export interface WordleStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<string, number>;
  winRate: number;
  averageGuesses: number;
}
  
export interface ChartState {
  allData: {
    normal: any[];
    hard: any[];
    difference: any[];
    personal: any[];
    rolling7: any[];
    rolling30: any[];
    clairvoyant: any[];
  };
  displayData: any[];
}
  
export interface PersonalStats {
  count: number;
  total: number;
  normal: {
    aboveAverage: number;
    belowAverage: number;
  };
  hard: {
    aboveAverage: number;
    belowAverage: number;
  };
}
  
export interface CheatingAnalysisData {
  date: string;
  word: string;
  guesses: {
    today: number;
    yesterday: number;
    delta: number;
    proportion: {
      today: number;
      yesterday: number;
      delta: number;
    }
  }
}