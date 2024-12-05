import { format, parseISO } from 'date-fns';
import { TooltipProps } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { PersonalData } from '@/types/wordle_types';

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  chartMode: 'standard' | 'difference' | 'personal' | 'rolling7' | 'rolling30';
  personalData: PersonalData[];
  isHardMode?: boolean;
}

export const CustomTooltip = ({ active, payload, chartMode, personalData, isHardMode }: CustomTooltipProps) => {
  if (!active || !payload?.[0]) return null;
  
  const dataPoint = payload[0].payload;
  if (!dataPoint) return null;

  return (
    <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
      <p className="font-medium text-gray-900">
        {dataPoint.word} <span className="text-gray-600">#{dataPoint.id}</span>
      </p>
      <p className="text-gray-600">
        {format(parseISO(dataPoint.date), 'M/d/yyyy')}
      </p>
      {chartMode === 'personal' && dataPoint.personalDifference !== null ? (
        <>
          <p className="text-gray-800">
            Personal vs Average: {dataPoint.personalDifference > 0 ? '+' : ''}{dataPoint.personalDifference.toFixed(2)} guesses
          </p>
          <p className="text-gray-600">
            Your Score: {
              personalData.find(p => 
                p.game_data.status === "WIN" && 
                p.game_data.boardState.filter(row => row !== "").slice(-1)[0]?.toLowerCase() === dataPoint.word.toLowerCase()
              )?.game_data.boardState.filter(row => row !== "").length || 'N/A'
            }
          </p>
          <p className="text-gray-600">
            Global Average: {(isHardMode ? dataPoint.hardAverage : dataPoint.average).toFixed(2)}
          </p>
        </>
      ) : chartMode === 'difference' ? (
        <>
          <p className="text-gray-800">
            Difficulty Gap: {dataPoint.difference?.toFixed(2)} guesses
          </p>
          <p className="text-gray-600">
            Normal: {dataPoint.average.toFixed(2)}
          </p>
          <p className="text-gray-600">
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
          <p className="text-gray-600">
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