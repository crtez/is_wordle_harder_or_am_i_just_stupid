import { useState, useEffect } from 'react';
import { CheatingAnalysisData } from '@/types/wordle_types';
import normalData from '../data/cheating_analysis_normal.json';
import hardData from '../data/cheating_analysis_hard.json';

export const useCheatingData = () => {
  const [data, setData] = useState<{
    normal: CheatingAnalysisData[];
    hard: CheatingAnalysisData[];
  }>({ normal: [], hard: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      console.log('Loading cheating data:', {
        normal: normalData.slice(0, 2),
        hard: hardData.slice(0, 2)
      });

      setData({
        normal: normalData,
        hard: hardData
      });
    } catch (err) {
      console.error('Error loading cheating data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load cheating analysis data'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error };
}; 