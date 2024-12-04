import React, { useState, useMemo } from 'react';
import { useWordleData } from '@/utils/processWordleData';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { InstructionsDialog } from '@/components/InstructionsDialog';
import { getBookmarkletCode } from '@/utils/bookmarklet';
import { DateTimePicker } from '@/components/datetime-picker';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import { format, parseISO } from 'date-fns';
import { CustomTooltip } from '@/components/CustomTooltip';
import { ChartState, WordleStats, PersonalData } from '@/components/wordle_types';
import { StatsDialog } from '@/components/StatsDialog';

const CHART_CONFIG = {
  yAxisDomains: {
    personal: [-3, 3],
    difference: [-0.75, 0.5],
    default: [2.5, 6],
    rolling: [3.5, 4.5]
  },
  yAxisTicks: {
    personal: [-3, -2, -1, 0, 1, 2, 3],
    difference: [-0.75, -0.5, -0.25, 0, 0.25, 0.5],
    default: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
    rolling: [3.5, 3.75, 4, 4.25, 4.5]
  }
};

// Move data processing to a separate function
const processWordleData = (data: any[], personalData: PersonalData[]) => {
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
      personalDifference: personalGuesses ? personalGuesses - d.average : null
    };
  });
};

// Move stats calculation to a separate function
const calculatePersonalStats = (data: any[], personalData: PersonalData[]) => {
  let matchCount = 0, aboveCount = 0, belowCount = 0;

  data?.forEach(d => {
    const personalGame = personalData.find(p => 
      p.game_data.status === "WIN" && 
      p.game_data.boardState.filter(row => row !== "").slice(-1)[0]?.toLowerCase() === d.word.toLowerCase()
    );
    if (personalGame) {
      matchCount++;
      const personalGuesses = personalGame.game_data.boardState.filter(row => row !== "").length;
      if (personalGuesses > d.average) aboveCount++;
      if (personalGuesses < d.average) belowCount++;
    }
  });

  return {
    count: matchCount,
    total: data?.length || 0,
    aboveAverage: aboveCount,
    belowAverage: belowCount
  };
};

const calculateRollingAverage = (data: any[], days: number, isHardMode: boolean) => {
  return data.map((item, index) => {
    if (index < days - 1) {
      return { ...item, rollingAverage: null };  // Return null for points before we have enough data
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

const calculateWordleStats = (data: PersonalData[]): WordleStats => {
  if (!data.length) return {} as WordleStats;

  // Find the game data with the latest timestamp
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

const WordleChart = () => {
  const { data, loading, error } = useWordleData();
  const [showWords, setShowWords] = useState(false);
  const [isHardMode, setIsHardMode] = useState(false);
  const [chartMode, setChartMode] = useState<'standard' | 'difference' | 'personal' | 'rolling7' | 'rolling30'>('standard');
  
  const [chartState, setChartState] = useState<ChartState>({
    allData: {
      normal: [],
      hard: [],
      difference: [],
      personal: [],
      rolling7: [],
      rolling30: []
    },
    displayData: []
  });
  const [personalData, setPersonalData] = useState<PersonalData[]>([]);
  const [personalStats, setPersonalStats] = useState({ 
    count: 0, 
    total: 0,
    aboveAverage: 0,
    belowAverage: 0 
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const minDate = useMemo(() => 
    data?.length ? parseISO(data[0].date) : subMonths(new Date(), 12), 
    [data]
  );
  
  const maxDate = useMemo(() => 
    data?.length ? parseISO(data[data.length - 1].date) : new Date(), 
    [data]
  );

  const [wordleStats, setWordleStats] = useState<WordleStats>({} as WordleStats);

  React.useEffect(() => {
    if (data?.length) {
      setSelectedDate(parseISO(data[0].date));
      setSelectedEndDate(parseISO(data[data.length - 1].date));
    }
  }, [data]);

  React.useEffect(() => {
    if (data?.length) {
      const processedData = processWordleData(data, personalData);
      
      // Calculate rolling averages before date filtering
      const rolling7Data = calculateRollingAverage(processedData, 7, isHardMode)
        .filter(d => d.rollingAverage !== null);
      const rolling30Data = calculateRollingAverage(processedData, 30, isHardMode)
        .filter(d => d.rollingAverage !== null);

      // Apply date filtering to all datasets
      const filterByDate = (d: any) => {
        const date = parseISO(d.date);
        const isAfterStart = !selectedDate || date >= startOfDay(selectedDate);
        const isBeforeEnd = !selectedEndDate || date <= endOfDay(selectedEndDate);
        return isAfterStart && isBeforeEnd;
      };

      const filteredData = processedData.filter(filterByDate);
      const filtered7Data = rolling7Data.filter(filterByDate);
      const filtered30Data = rolling30Data.filter(filterByDate);

      setChartState({
        allData: {
          normal: filteredData,
          hard: filteredData,
          difference: filteredData,
          personal: filteredData.filter(d => d.personalDifference !== null),
          rolling7: filtered7Data,
          rolling30: filtered30Data
        },
        displayData: chartMode === 'personal' 
          ? filteredData.filter(d => d.personalDifference !== null)
          : chartMode === 'rolling7' 
            ? filtered7Data 
            : chartMode === 'rolling30'
              ? filtered30Data
              : filteredData
      });
    }
  }, [data, personalData, selectedDate, selectedEndDate, isHardMode]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;
  if (!data?.length) return null;

  const handleModeChange = (newMode: 'standard' | 'difference' | 'personal' | 'rolling7' | 'rolling30') => {
    setChartMode(newMode);
    setChartState(prev => ({
      ...prev,
      displayData: prev.allData[newMode === 'standard' ? 'normal' : newMode]
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          setPersonalData(json);
          setPersonalStats(calculatePersonalStats(data, json));
          setWordleStats(calculateWordleStats(json));
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(getBookmarkletCode())
      .then(() => {
        setShowInstructions(true);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy script. Please try again.');
      });
  };

  return (
    <div className="h-[100dvh] p-4 flex flex-col overflow-hidden">
      <div className="grid grid-cols-12 gap-3 mb-4">
        <div className="col-span-10 grid grid-cols-6 gap-3 items-center">
          <Select 
            defaultValue="standard" 
            onValueChange={handleModeChange}
          >
            <SelectTrigger>
              <SelectValue>
                {chartMode === 'standard' ? 'Wordle Average' : 
                 chartMode === 'difference' ? 'Hard Mode Difficulty Gap' : 
                 chartMode === 'personal' ? 'Personal Performance' :
                 chartMode === 'rolling7' ? '7-Day Rolling Average' :
                 '30-Day Rolling Average'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Wordle Average</SelectItem>
              <SelectItem value="rolling7">7-Day Rolling Average</SelectItem>
              <SelectItem value="rolling30">30-Day Rolling Average</SelectItem>
              <SelectItem value="difference">Hard Mode Difficulty Gap</SelectItem>
              <SelectItem value="personal">Personal Performance</SelectItem>
            </SelectContent>
          </Select>
          
          <DateTimePicker
            value={selectedDate} 
            onChange={setSelectedDate} 
            min={minDate} 
            max={maxDate}
            hideTime={true}
            clearable={true}
          />

          <DateTimePicker
            value={selectedEndDate}
            onChange={setSelectedEndDate}
            min={selectedDate || minDate}
            max={maxDate}
            hideTime={true}
            clearable={true}
          />

          {(chartMode === 'standard' || chartMode === 'rolling7' || chartMode === 'rolling30') && (
            <div className="flex items-center gap-2">
              <Label htmlFor="hard-mode-toggle">Hard Mode</Label>
              <Switch
                id="hard-mode-toggle"
                checked={isHardMode}
                onCheckedChange={setIsHardMode}
              />
            </div>
          )}
          
          {chartMode === 'personal' && (
            <>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="col-span-1"
              />
              <div className="col-span-2 flex gap-2">
                <button
                  onClick={handleCopyBookmarklet}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 whitespace-nowrap"
                >
                  Copy Data Fetcher
                </button>
                {personalData.length > 0 && (
                  <StatsDialog wordleStats={wordleStats} />
                )}
              </div>
              {personalStats.count > 0 && (
                <div className="col-span-3 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
                  Found <span className="font-bold">{personalStats.count}</span> wordles 
                  (<span className="text-red-600 font-bold">{personalStats.aboveAverage}</span> above the average,
                  <span className="text-green-600 font-bold"> {personalStats.belowAverage}</span> below the average)
                </div>
              )}
            </>
          )}
        </div>

        <div className="col-span-2 flex items-center gap-2 justify-end h-10">
          <Label htmlFor="axis-toggle" className="whitespace-nowrap">Show Words</Label>
          <Switch
            id="axis-toggle"
            checked={showWords}
            onCheckedChange={setShowWords}
          />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart 
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={showWords ? "word" : "date"}
              angle={-45}
              interval="preserveStartEnd"
              textAnchor="end"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => showWords ? value : format(parseISO(value), 'M/d/yyyy')}
              style={{ userSelect: 'none' }}
            />
            <YAxis
              domain={chartMode === 'personal' ? CHART_CONFIG.yAxisDomains.personal :
                     chartMode === 'difference' ? CHART_CONFIG.yAxisDomains.difference :
                     chartMode.startsWith('rolling') ? CHART_CONFIG.yAxisDomains.rolling :
                     CHART_CONFIG.yAxisDomains.default}
              ticks={chartMode === 'personal' ? CHART_CONFIG.yAxisTicks.personal :
                     chartMode === 'difference' ? CHART_CONFIG.yAxisTicks.difference :
                     chartMode.startsWith('rolling') ? CHART_CONFIG.yAxisTicks.rolling :
                     CHART_CONFIG.yAxisTicks.default}
              tickFormatter={(value) => value.toFixed(2)}
              label={{ 
                value: chartMode === 'difference' || chartMode === 'personal' ? 'Difference in Guesses' : 'Average Guesses', 
                angle: -90, 
                position: 'insideLeft',
                style: { userSelect: 'none' }
              }}
              style={{ userSelect: 'none' }}
            />
            <Tooltip 
              content={(props) => (
                <CustomTooltip 
                  {...props} 
                  chartMode={chartMode} 
                  personalData={personalData}
                  isHardMode={isHardMode}
                />
              )} 
            />
            <Scatter 
              name="Wordle Data"
              data={chartState.displayData}
              fill="#2563eb"
              line={chartMode === 'rolling7' || chartMode === 'rolling30'}
              shape="circle"
              isAnimationActive={false}
              dataKey={
                chartMode === 'difference' ? 'difference' : 
                chartMode === 'personal' ? 'personalDifference' :
                chartMode === 'rolling7' || chartMode === 'rolling30' ? 'rollingAverage' :
                isHardMode ? 'hardAverage' : 'average'
              }
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <InstructionsDialog 
        open={showInstructions} 
        onOpenChange={setShowInstructions} 
      />
    </div>
  );
};

export default WordleChart;