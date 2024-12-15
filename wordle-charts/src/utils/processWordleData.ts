interface WordleData {
  efficiency: {
    normal: number;
    hard: number;
  };
  luck: {
    normal: number;
    hard: number;
  };
  steps: {
    normal: number[];
    hard: number[];
  };
  unsolvedPenalty: {
    normal: number;
    hard: number;
  };
  average: {
    normal: number;
    hard: number;
  };
  percentSolvingInThreeOrFewer: {
    normal: number;
    hard: number;
  };
  percentiles: {
    normal: Record<string, number>;
    hard: Record<string, number>;
  };
}

interface ChartDataPoint {
  id: string;
  date: string;
  word: string;
  average: number;
  hardAverage: number;
  percentSolved: number;
  percentSolvedHard: number;
  percentThreeOrFewer: number;
  percentThreeOrFewerHard: number;
  efficiency: number;
  efficiencyHard: number;
  personalDifference?: number | null;
}

export async function processWordleData(): Promise<ChartDataPoint[]> {
  // Use Vite's glob import feature to get all JSON files in the data directory
  const modules = import.meta.glob('/src/data/summaries/summary_*.json', { eager: true });

  const chartData: ChartDataPoint[] = [];

  for (const path in modules) {
    const data = modules[path] as WordleData;

    // Extract date and word from the filename
    // Path format: /src/data/summary_word,id,YYYY-MM-DD.json
    const filename = path.split('/').pop() || '';
    const [prefix, id, dateStr] = filename.split(',');
    const word = prefix.split('_')[1].toUpperCase();
    const date = dateStr.split('.')[0];

    chartData.push({
      date: date,
      word,
      id,
      average: data.average.normal,
      hardAverage: data.average.hard,
      percentSolved: (1 - data.unsolvedPenalty.normal / 100) * 100,
      percentSolvedHard: (1 - data.unsolvedPenalty.hard / 100) * 100,
      percentThreeOrFewer: data.percentSolvingInThreeOrFewer.normal * 100,
      percentThreeOrFewerHard: data.percentSolvingInThreeOrFewer.hard * 100,
      efficiency: data.efficiency.normal * 100,
      efficiencyHard: data.efficiency.hard * 100,
    });
  }

  // Sort by date
  return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Optional: Create a custom hook for using this data
import { useState, useEffect } from 'react';

export const useWordleData = () => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    processWordleData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}