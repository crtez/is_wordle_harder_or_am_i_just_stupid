import { format, parseISO } from 'date-fns';
import { TooltipProps } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { PersonalData } from '@/types/wordle_types';

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  chartMode: 'standard' | 'difference' | 'personal' | 'rolling7' | 'rolling30' | 'firstGuess' | 'clairvoyant';
  personalData: PersonalData[];
  isHardMode?: boolean;
  firstGuessData?: { name: string; size: number }[];
}

export const CustomTooltip = ({ active, payload, chartMode, personalData, isHardMode, firstGuessData }: CustomTooltipProps) => {
  if (!active || !payload?.[0]) return null;
  
  const dataPoint = payload[0].payload;
  if (!dataPoint) return null;

  return chartMode === 'firstGuess' && firstGuessData ? (
    <div className="bg-background p-3 border rounded-lg shadow-lg">
      <p className="font-bold text-foreground">{dataPoint.name}</p>
      <p className="text-foreground">Used {dataPoint.size} times ({((dataPoint.size / firstGuessData.reduce((sum, item) => sum + item.size, 0)) * 100).toFixed(1)}%)</p>
    </div>
  ) : chartMode === 'clairvoyant' ? (
    <div className="bg-background p-2 border border-border rounded shadow-sm">
      <p className="text-foreground">
        <span className="font-bold">{dataPoint.word}</span>
        <span className="font-bold text-muted-foreground"> • {format(parseISO(dataPoint.date), 'M/d/yyyy')}</span>
      </p>
      {isHardMode ? (
        <>
          <p className="text-foreground">
            Delta: {dataPoint.hardProportionDelta}%
          </p>
          <p className="text-foreground">
            Guessed First: {dataPoint.hardProportion?.today}%
          </p>
          <p className="text-foreground">
            Guessed First (Day Before): {dataPoint.hardProportion?.yesterday}%
          </p>
          <p className="text-foreground">
          {dataPoint.hardGuessesNumberYesterday} -&gt; {dataPoint.hardGuessesNumber} guesses
          </p>
        </>
      ) : (
        <>
          <p className="text-foreground">
          Delta: {dataPoint.proportionDelta}%
          </p>
          <p className="text-foreground">
            Guessed First: {dataPoint.proportion?.today}%
          </p>
          <p className="text-foreground">
            Guessed First (Day Before): {dataPoint.proportion?.yesterday}%
          </p>
          <p className="text-foreground">
          {dataPoint.guessesNumberYesterday} -&gt; {dataPoint.guessesNumber} guesses
          </p>
        </>
      )}
    </div>
  ) : (
    <div className="bg-background p-2 border border-border rounded shadow-sm">
      <p className="text-foreground">
        <span className="font-bold">{dataPoint.word}</span>
        <span className="font-bold text-muted-foreground"> #{dataPoint.id}</span>
        <span className="font-bold text-muted-foreground"> • {format(parseISO(dataPoint.date), 'M/d/yyyy')}</span>
      </p>
      {chartMode === 'personal' && (dataPoint.personalDifference !== null || dataPoint.personalDifferenceHard !== null) ? (
        <>
          <p className="text-foreground">
            Personal vs Average: {
              (isHardMode ? dataPoint.personalDifferenceHard : dataPoint.personalDifference) > 0 ? '+' : ''
            }{(isHardMode ? dataPoint.personalDifferenceHard : dataPoint.personalDifference).toFixed(2)} guesses
          </p>
          <p className="text-foreground">
            Your Score: {
              personalData.find(p => 
                p.game_data.status === "WIN" && 
                p.game_data.boardState.filter(row => row !== "").slice(-1)[0]?.toLowerCase() === dataPoint.word.toLowerCase()
              )?.game_data.boardState.filter(row => row !== "").length || 'N/A'
            }
          </p>
          <p className="text-foreground">
            Global Average: {(isHardMode ? dataPoint.hardAverage : dataPoint.average).toFixed(2)}
          </p>
        </>
      ) : chartMode === 'difference' ? (
        <>
          <p className="text-foreground">
            Difficulty Gap: {dataPoint.difference?.toFixed(2)} guesses
          </p>
          <p className="text-foreground">
            Normal: {dataPoint.average.toFixed(2)}
          </p>
          <p className="text-foreground">
            Hard: {dataPoint.hardAverage.toFixed(2)}
          </p>
        </>
      ) : chartMode.startsWith('rolling') ? (
        <>
          <p className="text-foreground">
            {chartMode === 'rolling7' ? '7' : '30'}-Day Average: {
              (isHardMode ? dataPoint.rollingAverageHard : dataPoint.rollingAverage)?.toFixed(2)
            } guesses
          </p>
          <p className="text-foreground">
            Daily Average: {(isHardMode ? dataPoint.hardAverage : dataPoint.average).toFixed(2)}
          </p>
        </>
      ) : (
        <p className="text-foreground">
          Average ({isHardMode ? 'Hard' : 'Normal'}): {
            (isHardMode ? dataPoint.hardAverage : dataPoint.average).toFixed(2)
          } guesses
        </p>
      )}
    </div>
  );
}; 