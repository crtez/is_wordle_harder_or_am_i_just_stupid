import React, { useState, useMemo, useEffect } from 'react';
import { useWordleData } from '@/utils/processWordleData';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { InstructionsDialog } from '@/components/InstructionsDialog';
import { DateTimePicker } from '@/components/datetime-picker';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import { format, parseISO } from 'date-fns';
import { CustomTooltip } from '@/components/CustomTooltip';
import { ChartState, WordleStats, PersonalData, PersonalStats } from '@/types/wordle_types';
import { StatsDialog } from '@/components/StatsDialog';
import {
  processWordleData,
  calculatePersonalStats,
  calculateRollingAverage,
  calculateWordleStats,
  getBookmarkletCode,
} from '@/services/wordleDataProcessing';

const CHART_CONFIG = {
  yAxisDomains: {
    personal: [-3, 3],
    difference: [-0.75, 0.5],
    default: [2.5, 6],
    rolling: [3.25, 4.5]
  },
  yAxisTicks: {
    personal: [-3, -2, -1, 0, 1, 2, 3],
    difference: [-0.75, -0.5, -0.25, 0, 0.25, 0.5],
    default: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
    rolling: [3.25, 3.5, 3.75, 4, 4.25, 4.5]
  }
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
  const [personalStats, setPersonalStats] = useState<PersonalStats>({ 
    count: 0, 
    total: 0,
    normal: { aboveAverage: 0, belowAverage: 0 },
    hard: { aboveAverage: 0, belowAverage: 0 }
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

  const cumulativeAverage = useMemo(() => {
    if (!data?.length) return 0;
    const sum = data.reduce((acc, curr) => acc + (isHardMode ? curr.hardAverage : curr.average), 0);
    return sum / data.length;
  }, [data, isHardMode]);

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
      const rolling7Data = calculateRollingAverage(processedData, 7)
        .filter(d => d.rollingAverage !== null);
      const rolling30Data = calculateRollingAverage(processedData, 30)
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
  }, [data, personalData, selectedDate, selectedEndDate]);

  React.useEffect(() => {
    if (data?.length && personalData.length) {
      setPersonalStats(calculatePersonalStats(data, personalData));
    }
  }, [data, personalData]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Adjust the width as needed
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      {isMobile && (
        <div className="bg-yellow-300 text-black text-center p-2 font-bold">
          This site is best viewed on desktop, if you're on a phone good luck.
        </div>
      )}
      
      <div className="grid grid-cols-12 gap-3 mb-4">
        <div className="col-span-10 grid grid-cols-6 gap-3 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full inline-flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              {chartMode === 'standard' ? 'Wordle Average' : 
               chartMode === 'difference' ? 'Normal vs. Hard' : 
               chartMode === 'personal' ? 'Personal vs. Average' :
               chartMode === 'rolling7' ? '7-Day Rolling Average' :
               '30-Day Rolling Average'}
              <ChevronDown className="ml-2 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => handleModeChange('standard')}>
                Wordle Average
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleModeChange('rolling7')}>
                7-Day Rolling Average
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleModeChange('rolling30')}>
                30-Day Rolling Average
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleModeChange('difference')}>
                Normal vs. Hard
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Personal Charts</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => handleModeChange('personal')}>
                    Personal vs. Average
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
                  <StatsDialog wordleStats={wordleStats} personalData={personalData} />
                )}
              </div>
              {personalStats.count > 0 && (
                <div className="col-span-3 flex items-center gap-4">
                  <div className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis w-[540px]">
                    Comparing <span className="font-bold">{personalStats.count}</span> wordles against {isHardMode ? 'hard' : 'normal'} mode:
                    <span className="text-red-600 font-bold"> {isHardMode ? personalStats.hard.aboveAverage : personalStats.normal.aboveAverage}</span> above average,
                    <span className="text-green-600 font-bold"> {isHardMode ? personalStats.hard.belowAverage : personalStats.normal.belowAverage}</span> below average
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="hard-mode-toggle">Hard Mode</Label>
                    <Switch
                      id="hard-mode-toggle"
                      checked={isHardMode}
                      onCheckedChange={setIsHardMode}
                    />
                  </div>
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
            {(chartMode === 'standard' || chartMode.startsWith('rolling')) && (
              <ReferenceLine 
              y={cumulativeAverage} 
              stroke="#666"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${cumulativeAverage.toFixed(2)}`,
                position: 'left',
                fill: '#666',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />
            )}
            <Scatter 
              name="Wordle Data"
              data={chartState.displayData}
              fill="#2563eb"
              line={chartMode === 'rolling7' || chartMode === 'rolling30'}
              shape="circle"
              isAnimationActive={false}
              dataKey={
                chartMode === 'difference' ? 'difference' : 
                chartMode === 'personal' ? (isHardMode ? 'personalDifferenceHard' : 'personalDifference') :
                chartMode.startsWith('rolling') ? (isHardMode ? 'rollingAverageHard' : 'rollingAverage') :
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