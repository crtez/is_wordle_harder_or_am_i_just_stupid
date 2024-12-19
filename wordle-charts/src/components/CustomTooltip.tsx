import { format, parseISO } from 'date-fns';
import { TooltipProps } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { PersonalData } from '@/types/wordle_types';

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  chartMode: 'standard' | 'difference' | 'personal' | 'rolling7' | 'rolling30' | 'firstGuess';
  personalData: PersonalData[];
  isHardMode?: boolean;
  firstGuessData?: { name: string; size: number }[];
  wordImages?: Record<string, string | null>;
}

export const CustomTooltip = ({ active, payload, chartMode, personalData, isHardMode, firstGuessData, wordImages }: CustomTooltipProps) => {
  if (!active || !payload?.[0]) return null;
  
  const dataPoint = payload[0].payload;
  if (!dataPoint) return null;


  if (chartMode === 'firstGuess' && firstGuessData) {
    const totalGuesses = firstGuessData.reduce((sum, item) => sum + item.size, 0);
    const percentage = ((dataPoint.size / totalGuesses) * 100).toFixed(1);
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-bold">{dataPoint.name}</p>
        <p>Used {dataPoint.size} times ({percentage}%)</p>
        {wordImages?.[dataPoint.name] && (
          <div className="mt-2">
            <img 
              src={wordImages[dataPoint.name] ?? undefined} 
              alt={dataPoint.name}
              className="max-w-[200px] max-h-[200px] object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
      <p className="text-gray-900">
        <span className="font-bold">{dataPoint.word}</span>
        <span className="font-bold text-gray-600"> #{dataPoint.id}</span>
        <span className="font-bold text-gray-600"> • {format(parseISO(dataPoint.date), 'M/d/yyyy')}</span>
      </p>
      {chartMode === 'personal' && (dataPoint.personalDifference !== null || dataPoint.personalDifferenceHard !== null) ? (
        <>
          <p className="text-gray-800">
            Personal vs Average: {
              (isHardMode ? dataPoint.personalDifferenceHard : dataPoint.personalDifference) > 0 ? '+' : ''
            }{(isHardMode ? dataPoint.personalDifferenceHard : dataPoint.personalDifference).toFixed(2)} guesses
          </p>
          <p className="text-gray-800">
            Your Score: {
              personalData.find(p => 
                p.game_data.status === "WIN" && 
                p.game_data.boardState.filter(row => row !== "").slice(-1)[0]?.toLowerCase() === dataPoint.word.toLowerCase()
              )?.game_data.boardState.filter(row => row !== "").length || 'N/A'
            }
          </p>
          <p className="text-gray-800">
            Global Average: {(isHardMode ? dataPoint.hardAverage : dataPoint.average).toFixed(2)}
          </p>
        </>
      ) : chartMode === 'difference' ? (
        <>
          <p className="text-gray-800">
            Difficulty Gap: {dataPoint.difference?.toFixed(2)} guesses
          </p>
          <p className="text-gray-800">
            Normal: {dataPoint.average.toFixed(2)}
          </p>
          <p className="text-gray-800">
            Hard: {dataPoint.hardAverage.toFixed(2)}
          </p>
        </>
      ) : chartMode.startsWith('rolling') ? (
        <>
          <p className="text-gray-800">
            {chartMode === 'rolling7' ? '7' : '30'}-Day Average: {
              (isHardMode ? dataPoint.rollingAverageHard : dataPoint.rollingAverage)?.toFixed(2)
            } guesses
          </p>
          <p className="text-gray-800">
            Daily Average: {(isHardMode ? dataPoint.hardAverage : dataPoint.average).toFixed(2)}
          </p>
        </>
      ) : (
        <p className="text-gray-800">
          Average ({isHardMode ? 'Hard' : 'Normal'}): {
            (isHardMode ? dataPoint.hardAverage : dataPoint.average).toFixed(2)
          } guesses
        </p>
      )}
    </div>
  );
}; 