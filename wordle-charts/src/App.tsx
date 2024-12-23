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
  Treemap,
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
import { InstructionsDialog } from '@/components/InstructionsDialog';
import { DateRangePicker } from '@/components/date-range-picker';
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
  calculateFirstGuessFrequency,
  FirstGuessData,
} from '@/services/wordleDataProcessing';
import { ModeToggle } from '@/components/mode-toggle';
import { ThemeProvider } from '@/components/theme-provider';
import { FileInput } from '@/components/FileInput';
import { useCheatingData } from '@/utils/useCheatingData';
import { useSearchParams } from 'react-router-dom';

const CHART_CONFIG = {
  yAxisDomains: {
    personal: [-3, 3],
    difference: [-0.75, 0.5],
    default: [2.5, 6],
    rolling: [3.25, 4.5],
    clairvoyant: [0, 1.7]
  },
  yAxisTicks: {
    personal: [-3, -2, -1, 0, 1, 2, 3],
    difference: [-0.75, -0.5, -0.25, 0, 0.25, 0.5],
    default: [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
    rolling: [3.25, 3.5, 3.75, 4, 4.25, 4.5],
    clairvoyant: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7]
  }
};

const WordleChart = () => {
  // Add searchParams
  const [searchParams, setSearchParams] = useSearchParams();

  // Data and Loading States
  const { data, loading, error } = useWordleData();
  const [personalData, setPersonalData] = useState<PersonalData[]>([]);
  const [firstGuessData, setFirstGuessData] = useState<FirstGuessData[]>([]);
  const { data: cheatingData, loading: cheatingLoading } = useCheatingData();
  
  // UI Control States
  const [showWords, setShowWords] = useState(false);
  const [isHardMode, setIsHardMode] = useState(false);
  const [chartMode, setChartMode] = useState<'standard' | 'difference' | 'personal' | 'rolling7' | 'rolling30' | 'firstGuess' | 'clairvoyant'>(
    (searchParams.get('chart') as any) || 'standard'
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileBanner, setShowMobileBanner] = useState(true);
  const [fileName, setFileName] = useState<string>("Upload your .json file here! 🙂");

  // Date States
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const fromDate = searchParams.get('from');
    return fromDate ? startOfDay(parseISO(fromDate)) : undefined;
  });

  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(() => {
    const toDate = searchParams.get('to');
    return toDate ? endOfDay(parseISO(toDate)) : undefined;
  });
  const minDate = useMemo(() => 
    data?.length ? parseISO(data[0].date) : subMonths(new Date(), 12), 
    [data]
  );
  const maxDate = useMemo(() => 
    data?.length ? parseISO(data[data.length - 1].date) : new Date(), 
    [data]
  );

  // Chart Data States
  const [chartState, setChartState] = useState<ChartState>({
    allData: {
      normal: [],
      hard: [],
      difference: [],
      personal: [],
      rolling7: [],
      rolling30: [],
      clairvoyant: []
    },
    displayData: []
  });
  const [personalStats, setPersonalStats] = useState<PersonalStats>({ 
    count: 0, 
    total: 0,
    normal: { aboveAverage: 0, belowAverage: 0 },
    hard: { aboveAverage: 0, belowAverage: 0 }
  });
  const [wordleStats, setWordleStats] = useState<WordleStats>({} as WordleStats);

  // Audio States
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioIndex, setAudioIndex] = useState(0);
  const [audioElements] = useState(() => {
    const basePath = '/is_wordle_harder_or_am_I_just_stupid';
    return [
      new Audio(`${basePath}/sounds/chord1.mp3`),
      new Audio(`${basePath}/sounds/chord2.mp3`),
      new Audio(`${basePath}/sounds/chord3.mp3`),
      new Audio(`${basePath}/sounds/chord4.mp3`)
    ];
  });

  const cumulativeAverage = useMemo(() => {
    if (!data?.length) return 0;
    const sum = data.reduce((acc, curr) => acc + (isHardMode ? curr.hardAverage : curr.average), 0);
    return sum / data.length;
  }, [data, isHardMode]);

  React.useEffect(() => {
    if (data?.length) {
      // Only set default dates if URL params don't exist
      if (!searchParams.get('from') && !searchParams.get('to')) {
        setSelectedDate(parseISO(data[0].date));
        setSelectedEndDate(parseISO(data[data.length - 1].date));
      }
    }
  }, [data, searchParams]);

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

      // Process cheating analysis data
      const cheatingProcessedData = data.map(d => {
        const normalCheating = cheatingData.normal.find(c => c.date === d.date);
        const hardCheating = cheatingData.hard.find(c => c.date === d.date);
        
        return {
          ...d,
          proportionDelta: normalCheating?.guesses.proportion.delta || null,
          hardProportionDelta: hardCheating?.guesses.proportion.delta || null,
          proportion: normalCheating?.guesses.proportion || null,
          hardProportion: hardCheating?.guesses.proportion || null
        };
      }).filter(filterByDate);

      setChartState({
        allData: {
          normal: filteredData,
          hard: filteredData,
          difference: filteredData,
          personal: filteredData.filter(d => d.personalDifference !== null),
          rolling7: filtered7Data,
          rolling30: filtered30Data,
          clairvoyant: cheatingProcessedData
        },
        displayData: chartMode === 'clairvoyant' 
          ? cheatingProcessedData
          : chartMode === 'personal' 
            ? filteredData.filter(d => d.personalDifference !== null)
            : chartMode === 'rolling7' 
              ? filtered7Data 
              : chartMode === 'rolling30'
                ? filtered30Data
                : filteredData
      });
    }
  }, [data, personalData, selectedDate, selectedEndDate, cheatingData]);

  React.useEffect(() => {
    if (data?.length && personalData.length) {
      setPersonalStats(calculatePersonalStats(data, personalData));
    }
  }, [data, personalData]);

  React.useEffect(() => {
    if (personalData.length) {
      setFirstGuessData(calculateFirstGuessFrequency(personalData));
    }
  }, [personalData]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Adjust the width as needed
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleModeChange = (newMode: typeof chartMode) => {
    setChartMode(newMode);
    setSearchParams(params => {
      params.set('chart', newMode);
      return params;
    });
    if (newMode !== 'firstGuess') {
      setChartState(prev => ({
        ...prev,
        displayData: prev.allData[newMode === 'standard' ? 'normal' : newMode]
      }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (!Array.isArray(json)) {
            throw new Error('Invalid data format: expected an array');
          }
          setPersonalData(json);
          setPersonalStats(calculatePersonalStats(data, json));
          setWordleStats(calculateWordleStats(json));
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert('Error parsing file. Please make sure you uploaded a valid JSON file with Wordle data.');
        } finally {
          if (event.target) {
            event.target.value = '';
          }
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

  const playNextChord = () => {
    if (soundEnabled) {
      const audio = audioElements[audioIndex];
      audio.volume = 1.0; // Full volume when sound is enabled
      
      // Reset the audio to start
      audio.currentTime = 0;
      
      // Stop any currently playing audio
      audioElements.forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
      
      // Play the new audio
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      
      // Move to next audio file, loop back to start if at end
      setAudioIndex((prevIndex) => (prevIndex + 1) % audioElements.length);
    }
  };

  const handleTreemapMouseEnter = (data: any) => {
    if (data && data.name) {
      playNextChord();
    }
  };

  if (loading || cheatingLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;
  if (!data?.length) return null;

  return (
    <div className="h-[100dvh] p-4 flex flex-col overflow-hidden">
      {isMobile && showMobileBanner && (
        <div className="bg-yellow-300 text-black text-center p-2 font-bold relative">
          This site is best viewed on desktop. 
          <button 
            onClick={() => setShowMobileBanner(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-12 gap-3 mb-4">
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full inline-flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              {chartMode === 'standard' ? 'Wordle Average' : 
               chartMode === 'difference' ? 'Normal vs. Hard' : 
               chartMode === 'personal' ? 'Personal vs. Average' :
               chartMode === 'rolling7' ? '7-Day Rolling Average' :
               chartMode === 'rolling30' ? '30-Day Rolling Average' :
               chartMode === 'clairvoyant' ? 'Clairvoyant Guesses' :
               'First Guess Frequency'}
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
              <DropdownMenuItem onSelect={() => handleModeChange('clairvoyant')}>
                Clairvoyant Guesses
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Personal Charts</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => handleModeChange('personal')}>
                    Personal vs. Average
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleModeChange('firstGuess')}>
                    First Guess Frequency
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {chartMode !== 'firstGuess' && (
            <DateRangePicker
              align="start"
              initialDateFrom={selectedDate || minDate}
              initialDateTo={selectedEndDate || maxDate}
              onUpdate={({ range }) => {
                setSelectedDate(range.from);
                setSelectedEndDate(range.to || range.from);
                
                // Update URL params
                setSearchParams(params => {
                  if (range.from) {
                    params.set('from', range.from.toISOString().split('T')[0]);
                  } else {
                    params.delete('from');
                  }
                  if (range.to) {
                    params.set('to', range.to.toISOString().split('T')[0]);
                  } else {
                    params.delete('to');
                  }
                  return params;
                });
              }}
              showCompare={false}
            />
          )}
        </div>

        {chartMode === 'personal' && (
          <div className="col-span-12 flex items-center gap-3">
            <div className="flex-grow">
              <FileInput
                onChange={handleFileUpload}
                fileName={fileName}
              />
            </div>
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
        )}

        <div className="col-span-12 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {(chartMode === 'standard' || chartMode === 'rolling7' || chartMode === 'rolling30' || chartMode === 'clairvoyant') && (
              <div className="flex items-center gap-2">
                <Label htmlFor="hard-mode-toggle">Hard Mode</Label>
                <Switch
                  id="hard-mode-toggle"
                  checked={isHardMode}
                  onCheckedChange={setIsHardMode}
                />
              </div>
            )}
            
            {chartMode !== 'firstGuess' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="show-words">Show Words</Label>
                <Switch
                  id="show-words"
                  checked={showWords}
                  onCheckedChange={setShowWords}
                />
              </div>
            )}
            
            {chartMode === 'firstGuess' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="sound-toggle">Sound</Label>
                <Switch
                  id="sound-toggle"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>
            )}

            {chartMode === 'personal' && personalData.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="hard-mode-toggle">Hard Mode</Label>
                <Switch
                  id="hard-mode-toggle"
                  checked={isHardMode}
                  onCheckedChange={setIsHardMode}
                />
              </div>
            )}
          </div>
          
          <ModeToggle />
        </div>

        {chartMode === 'personal' && personalStats.count > 0 && (
          <div className="col-span-12">
            <div className="text-sm text-gray-600 dark:text-gray-300 break-normal">
              Comparing <span className="font-bold">{personalStats.count}</span> wordles against {isHardMode ? 'hard' : 'normal'} mode:
              <span className="text-red-600 dark:text-red-400 font-bold"> {isHardMode ? personalStats.hard.aboveAverage : personalStats.normal.aboveAverage}</span> above average,
              <span className="text-green-600 dark:text-green-400 font-bold"> {isHardMode ? personalStats.hard.belowAverage : personalStats.normal.belowAverage}</span> below average
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'firstGuess' ? (
            <Treemap
              data={firstGuessData}
              dataKey="size"
              nameKey="name"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#2563eb"
              onMouseEnter={handleTreemapMouseEnter}
            >
              <Tooltip
                content={(props) => (
                  <CustomTooltip 
                    {...props} 
                    chartMode={chartMode} 
                    personalData={personalData} 
                    firstGuessData={firstGuessData}
                  />
                )}
              />
            </Treemap>
          ) : (
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
                domain={chartMode === 'clairvoyant' ? CHART_CONFIG.yAxisDomains.clairvoyant :
                       chartMode === 'personal' ? CHART_CONFIG.yAxisDomains.personal :
                       chartMode === 'difference' ? CHART_CONFIG.yAxisDomains.difference :
                       chartMode.startsWith('rolling') ? CHART_CONFIG.yAxisDomains.rolling :
                       CHART_CONFIG.yAxisDomains.default}
                ticks={chartMode === 'clairvoyant' ? CHART_CONFIG.yAxisTicks.clairvoyant :
                       chartMode === 'personal' ? CHART_CONFIG.yAxisTicks.personal :
                       chartMode === 'difference' ? CHART_CONFIG.yAxisTicks.difference :
                       chartMode.startsWith('rolling') ? CHART_CONFIG.yAxisTicks.rolling :
                       CHART_CONFIG.yAxisTicks.default}
                tickFormatter={(value) => value.toFixed(2)}
                label={{ 
                  value: chartMode === 'clairvoyant' ? 'Proportion Delta' :
                         chartMode === 'difference' || chartMode === 'personal' ? 'Difference in Guesses' : 'Average Guesses', 
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
                  chartMode === 'clairvoyant' ? (isHardMode ? 'hardProportionDelta' : 'proportionDelta') :
                  chartMode === 'difference' ? 'difference' : 
                  chartMode === 'personal' ? (isHardMode ? 'personalDifferenceHard' : 'personalDifference') :
                  chartMode.startsWith('rolling') ? (isHardMode ? 'rollingAverageHard' : 'rollingAverage') :
                  isHardMode ? 'hardAverage' : 'average'
                }
              />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
      
      <InstructionsDialog 
        open={showInstructions} 
        onOpenChange={setShowInstructions} 
      />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="wordle-charts-theme">
      <WordleChart />
    </ThemeProvider>
  );
}

export default App;