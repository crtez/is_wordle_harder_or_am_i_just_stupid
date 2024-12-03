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
import { TooltipProps } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { getBookmarkletCode } from '@/utils/bookmarklet';
import { DateTimePicker } from '@/components/datetime-picker';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import { format, parseISO } from 'date-fns';


interface ChartState {
  allData: {
    normal: any[];
    hard: any[];
    difference: any[];
    personal: any[];
  };
  displayData: any[];
}

interface PersonalData {
  puzzle_id: string;
  game_data: {
    boardState: string[];
    status: string;
  }
}

// Move chart config to a separate object
const CHART_CONFIG = {
  yAxisDomains: {
    personal: [-3, 3],
    difference: [-0.75, 0.5],
    default: [2.5, 6]
  },
  yAxisTicks: {
    personal: [-3, -2, -1, 0, 1, 2, 3],
    difference: [-0.75, -0.5, -0.25, 0, 0.25, 0.5],
    default: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]
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

const WordleChart = () => {
  const { data, loading, error } = useWordleData();
  const [showWords, setShowWords] = useState(false);
  const [isHardMode, setIsHardMode] = useState(false);
  const [chartMode, setChartMode] = useState<'standard' | 'difference' | 'personal'>('standard');
  
  const [chartState, setChartState] = useState<ChartState>({
    allData: {
      normal: [],
      hard: [],
      difference: [],
      personal: []
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

  React.useEffect(() => {
    if (data?.length) {
      const processedData = processWordleData(data, personalData);
      
      // Filter data based on date range
      const filteredData = processedData.filter(d => {
        const date = parseISO(d.date);
        const isAfterStart = !selectedDate || date >= startOfDay(selectedDate);
        const isBeforeEnd = !selectedEndDate || date <= endOfDay(selectedEndDate);
        return isAfterStart && isBeforeEnd;
      });

      setChartState({
        allData: {
          normal: filteredData,
          hard: filteredData,
          difference: filteredData,
          personal: filteredData.filter(d => d.personalDifference !== null)
        },
        displayData: chartMode === 'personal' 
          ? filteredData.filter(d => d.personalDifference !== null)
          : filteredData
      });
    }
  }, [data, personalData, selectedDate, selectedEndDate]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;
  if (!data?.length) return null;

  const handleModeChange = (newMode: 'standard' | 'difference' | 'personal') => {
    setChartMode(newMode);
    setChartState(prev => ({
      ...prev,
      displayData: prev.allData[newMode === 'standard' ? 'normal' : newMode]
    }));
  };

  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
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
              Global Average: {dataPoint.average.toFixed(2)}
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
        ) : (
          <p className="text-gray-800">
            Average ({chartMode === 'standard' ? 'Normal' : 'Hard'}): {
              (chartMode === 'standard' ? dataPoint.average : dataPoint.hardAverage).toFixed(2)
            } guesses
          </p>
        )}
      </div>
    );
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
    <div className="h-[100dvh] p-4 flex flex-col">
      <div className="grid grid-cols-12 gap-3 mb-4 items-center">
        <div className="col-span-10 grid grid-cols-6 gap-3 items-center">
          <Select 
            defaultValue="standard" 
            onValueChange={handleModeChange}
          >
            <SelectTrigger>
              <SelectValue>
                {chartMode === 'standard' ? 'Wordle Average' : 
                 chartMode === 'difference' ? 'Hard Mode Difficulty Gap' : 
                 'Personal Performance'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Wordle Average</SelectItem>
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

          {chartMode === 'standard' && (
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
              <button
                onClick={handleCopyBookmarklet}
                className="col-span-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-center"
              >
                Copy Data Fetcher
              </button>
              {personalStats.count > 0 && (
                <div className="col-span-1 text-xs text-gray-600 flex">
                  <span>
                    Found <span className="font-bold">{personalStats.count}</span> wordles 
                    (<span className="text-red-600 font-bold">{personalStats.aboveAverage}</span> above the average,
                    <span className="text-green-600 font-bold"> {personalStats.belowAverage}</span> below the average)
                  </span>
              </div>
              )}
            </>
          )}
        </div>

        <div className="col-span-2 flex items-center gap-2 justify-end">
          <Label htmlFor="axis-toggle" className="whitespace-nowrap">Show Words</Label>
          <Switch
            id="axis-toggle"
            checked={showWords}
            onCheckedChange={setShowWords}
          />
        </div>
      </div>
      <div className="flex-1">
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
                     CHART_CONFIG.yAxisDomains.default}
              ticks={chartMode === 'personal' ? CHART_CONFIG.yAxisTicks.personal :
                     chartMode === 'difference' ? CHART_CONFIG.yAxisTicks.difference :
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
            <Tooltip content={(props: TooltipProps<ValueType, NameType>) => <CustomTooltip {...props} />} />
            <Scatter 
              name="Wordle Data"
              data={chartState.displayData}
              fill="#2563eb"
              line={false}
              shape="circle"
              isAnimationActive={false}
              dataKey={
                chartMode === 'difference' ? 'difference' : 
                chartMode === 'personal' ? 'personalDifference' :
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