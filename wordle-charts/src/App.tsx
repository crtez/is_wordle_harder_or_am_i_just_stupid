import React, { useState } from 'react';
import { useWordleData } from '@/utils/processWordleData';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea 
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

interface ChartState {
  left: string | null;
  right: string | null;
  bottom: number | null;
  top: number | null;
  displayData: any[];
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface PersonalData {
  puzzle_id: string;
  game_data: {
    boardState: string[];
    status: string;
  }
}

const getAxisYDomain = (from: number, to: number, data: any[], offset: number, mode: string) => {
  const refData = data.slice(from - 1, to);
  const key = mode === 'difference' ? 'difference' : 
              mode === 'personal' ? 'personalDifference' :
              mode === 'normal' ? 'average' : 'hardAverage';
  let [bottom, top] = [refData[0][key], refData[0][key]];
  
  refData.forEach((d) => {
    if (d[key] > top) top = d[key];
    if (d[key] < bottom) bottom = d[key];
  });

  return [(bottom | 0) - offset, (top | 0) + offset];
};

// Helper function to add one day to a date string
const adjustDate = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date;
};

const WordleChart = () => {
  const { data, loading, error } = useWordleData();
  const [showWords, setShowWords] = useState(false);
  const [mode, setMode] = useState<'normal' | 'hard' | 'difference' | 'personal'>('normal');
  
  const [chartState, setChartState] = useState<ChartState>({
    left: null,
    right: null,
    bottom: null,
    top: null,
    displayData: [],
  });
  const [refArea, setRefArea] = useState<{ left: string; right: string }>({ left: '', right: '' });
  const [personalData, setPersonalData] = useState<PersonalData[]>([]);
  const [personalStats, setPersonalStats] = useState({ 
    count: 0, 
    total: 0,
    aboveAverage: 0,
    belowAverage: 0 
  });

  React.useEffect(() => {
    if (data?.length) {
      const processedData = data.map(d => {
        const personalGame = personalData.find(p => 
          p.game_data.setLegacyStats?.lastWonDayOffset === parseInt(d.id)
        );
        const personalGuesses = personalGame ? 
          personalGame.game_data.boardState.filter(row => row !== "").length :
          null;
        
        return {
          ...d,
          difference: d.hardAverage - d.average,
          personalDifference: personalGuesses ? personalGuesses - d.average : null
        };
      });

      // Filter out data points without personal data when in personal mode
      const displayData = mode === 'personal' 
        ? processedData.filter(d => d.personalDifference !== null)
        : processedData;

      setChartState({
        left: 'dataMin',
        right: 'dataMax',
        bottom: mode === 'personal' ? -3 : mode === 'difference' ? -0.75 : 2.5,
        top: mode === 'personal' ? 3 : mode === 'difference' ? 0.5 : 6,
        displayData,
      } as ChartState);
    }
  }, [data, mode, personalData]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;
  if (!data?.length) return null;

  const zoom = () => {
    const { left: refAreaLeft, right: refAreaRight } = refArea;
    if (refAreaLeft === refAreaRight || !refAreaRight) {
      setRefArea({ left: '', right: '' });
      return;
    }

    let [leftIndex, rightIndex] = [
      data.findIndex(d => showWords ? d.word === refAreaLeft : d.date === refAreaLeft),
      data.findIndex(d => showWords ? d.word === refAreaRight : d.date === refAreaRight)
    ];

    if (leftIndex > rightIndex) [leftIndex, rightIndex] = [rightIndex, leftIndex];

    const [bottom, top] = getAxisYDomain(leftIndex + 1, rightIndex + 1, data, 0.5, mode);
    
    setRefArea({ left: '', right: '' });
    setChartState({
      left: data[leftIndex][showWords ? 'word' : 'date'],
      right: data[rightIndex][showWords ? 'word' : 'date'],
      bottom,
      top,
      displayData: data.slice(leftIndex, rightIndex + 1).map(d => {
        const personalGame = personalData.find(p => 
          p.game_data.setLegacyStats?.lastWonDayOffset === parseInt(d.id)
        );
        const personalGuesses = personalGame ? 
          personalGame.game_data.boardState.filter(row => row !== "").length :
          null;
        
        return {
          ...d,
          difference: d.hardAverage - d.average,
          personalDifference: personalGuesses ? personalGuesses - d.average : null
        };
      }),
    });
  };

  const zoomOut = () => {
    setRefArea({ left: '', right: '' });
    const processedData = data.map(d => {
      const personalGame = personalData.find(p => 
        p.game_data.setLegacyStats?.lastWonDayOffset === parseInt(d.id)
      );
      const personalGuesses = personalGame ? 
        personalGame.game_data.boardState.filter(row => row !== "").length :
        null;
      
      return {
        ...d,
        difference: d.hardAverage - d.average,
        personalDifference: personalGuesses ? personalGuesses - d.average : null
      };
    });

    // Filter data points in personal mode
    const displayData = mode === 'personal' 
      ? processedData.filter(d => d.personalDifference !== null)
      : processedData;

    setChartState({
      left: 'dataMin',
      right: 'dataMax',
      bottom: mode === 'personal' ? -3 : mode === 'difference' ? -0.75 : 2.5,
      top: mode === 'personal' ? 3 : mode === 'difference' ? 0.5 : 6,
      displayData,
    });
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload?.length) return null;
    
    const dataPoint = data?.find(d => showWords ? d.word === label : d.date === label);
    if (!dataPoint) return null;

    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
        <p className="font-medium text-gray-900">
          {dataPoint.word} <span className="text-gray-600">#{dataPoint.id}</span>
        </p>
        <p className="text-gray-600">
          {adjustDate(dataPoint.date).toLocaleDateString()}
        </p>
        {mode === 'personal' && dataPoint.personalDifference !== null ? (
          <>
            <p className="text-gray-800">
              Personal vs Average: {payload[0].value > 0 ? '+' : ''}{payload[0].value.toFixed(2)} guesses
            </p>
            <p className="text-gray-600">
              Your Score: {
                personalData.find(p => 
                  p.game_data.setLegacyStats?.lastWonDayOffset === parseInt(dataPoint.id)
                )?.game_data.boardState.filter(row => row !== "").length || 'N/A'
              }
            </p>
            <p className="text-gray-600">
              Global Average: {dataPoint.average.toFixed(2)}
            </p>
          </>
        ) : mode === 'difference' ? (
          <>
            <p className="text-gray-800">
              Difficulty Gap: {payload[0].value.toFixed(2)} guesses
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
            Average ({mode === 'normal' ? 'Normal' : 'Hard'}): {payload[0].value.toFixed(2)} guesses
          </p>
        )}
      </div>
    );
  };

  const handleMouseDown = (e: any) => {
    if (e?.activeLabel) {
      setRefArea(prev => ({ ...prev, left: e.activeLabel }));
    }
  };

  const handleMouseMove = (e: any) => {
    if (e?.activeLabel && refArea.left) {
      setRefArea(prev => ({ ...prev, right: e.activeLabel }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          setPersonalData(json);
          
          // Count matches and above/below average
          let matchCount = 0;
          let aboveCount = 0;
          let belowCount = 0;

          data?.forEach(d => {
            const personalGame = json.find((p: PersonalData) => 
              p.game_data.setLegacyStats?.lastWonDayOffset === parseInt(d.id)
            );
            if (personalGame) {
              matchCount++;
              const personalGuesses = personalGame.game_data.boardState.filter(row => row !== "").length;
              if (personalGuesses > d.average) aboveCount++;
              if (personalGuesses < d.average) belowCount++;
            }
          });
          
          setPersonalStats({
            count: matchCount,
            total: data?.length || 0,
            aboveAverage: aboveCount,
            belowAverage: belowCount
          });
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-[100dvh] p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center">
          <Select 
            defaultValue="normal" 
            onValueChange={(newMode: 'normal' | 'hard' | 'difference' | 'personal') => {
              setChartState(prev => ({
                ...prev,
                bottom: newMode === 'personal' ? -3 : newMode === 'difference' ? -0.75 : 2.5,
                top: newMode === 'personal' ? 3 : newMode === 'difference' ? 0.5 : 6,
                displayData: data.map(d => ({
                  ...d,
                  difference: d.hardAverage - d.average
                }))
              }));
              setMode(newMode);
            }}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Wordle Average Scores (Normal)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Wordle Average Scores (Normal)</SelectItem>
              <SelectItem value="hard">Wordle Average Scores (Hard)</SelectItem>
              <SelectItem value="difference">Hard Mode Difficulty Gap</SelectItem>
              <SelectItem value="personal">Personal Performance Comparison</SelectItem>
            </SelectContent>
          </Select>
          <button 
            onClick={zoomOut}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Zoom Out
          </button>
          {mode === 'personal' && (
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="max-w-[280px]"
              />
              {personalStats.count > 0 && (
                <span className="text-sm text-gray-600">
                  Found {personalStats.count} results ({personalStats.belowAverage} below average, {personalStats.aboveAverage} above average) out of {personalStats.total} total Wordles
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="axis-toggle">Show Words</Label>
          <Switch
            id="axis-toggle"
            checked={showWords}
            onCheckedChange={setShowWords}
          />
        </div>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartState.displayData}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={zoom}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={showWords ? "word" : "date"}
              angle={-45}
              interval="preserveStartEnd"
              textAnchor="end"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => showWords ? value : adjustDate(value).toLocaleDateString()}
              style={{ userSelect: 'none' }}
            />
            <YAxis
              domain={[
                chartState.bottom || (mode === 'personal' ? -3 : mode === 'difference' ? -0.75 : 2.5),
                chartState.top || (mode === 'personal' ? 3 : mode === 'difference' ? 0.5 : 6)
              ]}
              ticks={mode === 'personal' ? 
                [-3, -2, -1, 0, 1, 2, 3] :  // ticks for personal mode
                mode === 'difference' ? 
                [-0.75, -0.5, -0.25, 0, 0.25, 0.5] :  // updated ticks for difference mode
                [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]  // ticks for normal/hard mode
              }
              tickFormatter={(value) => value.toFixed(2)}
              label={{ 
                value: mode === 'difference' || mode === 'personal' ? 'Difference in Guesses' : 'Average Guesses', 
                angle: -90, 
                position: 'insideLeft',
                style: { userSelect: 'none' }
              }}
              style={{ userSelect: 'none' }}
            />
            <Tooltip content={(props: TooltipProps) => <CustomTooltip {...props} />} />
            <Line
              type="monotone"
              dataKey={
                mode === 'difference' ? 'difference' : 
                mode === 'personal' ? 'personalDifference' :
                mode === 'normal' ? 'average' : 
                'hardAverage'
              }
              stroke="#2563eb"
              strokeWidth={0}
              dot={{ 
                fill: "#ffffff",
                stroke: "#2563eb",
                strokeWidth: 1.5,
                r: 3
              }}
              activeDot={{ 
                r: 6
              }}
              animationDuration={0}
            />
            {refArea.left && refArea.right ? (
              <ReferenceArea 
                x1={refArea.left} 
                x2={refArea.right} 
                strokeOpacity={0.3} 
                fill="#2563eb"
                fillOpacity={0.1}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WordleChart;