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

const getAxisYDomain = (from: number, to: number, data: any[], offset: number, mode: string) => {
  const refData = data.slice(from - 1, to);
  const key = mode === 'difference' ? 'difference' : (mode === 'normal' ? 'average' : 'hardAverage');
  let [bottom, top] = [refData[0][key], refData[0][key]];
  
  refData.forEach((d) => {
    if (d[key] > top) top = d[key];
    if (d[key] < bottom) bottom = d[key];
  });

  return [(bottom | 0) - offset, (top | 0) + offset];
};

const WordleChart = () => {
  const { data, loading, error } = useWordleData('normal');
  const [showWords, setShowWords] = useState(false);
  const [mode, setMode] = useState('normal');
  
  const [chartState, setChartState] = useState({
    left: null,
    right: null,
    bottom: null,
    top: null,
    displayData: [],
  });
  const [refArea, setRefArea] = useState({ left: '', right: '' });

  React.useEffect(() => {
    if (data?.length) {
      const dataWithDifference = data.map(d => ({
        ...d,
        difference: d.hardAverage - d.average
      }));
      setChartState({
        left: 'dataMin',
        right: 'dataMax',
        bottom: mode === 'difference' ? -1 : 2.5,
        top: mode === 'difference' ? 1 : 6,
        displayData: dataWithDifference,
      });
    }
  }, [data, mode]);

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
      displayData: data.slice(leftIndex, rightIndex + 1).map(d => ({
        ...d,
        difference: d.hardAverage - d.average
      })),
    });
  };

  const zoomOut = () => {
    setRefArea({ left: '', right: '' });
    setChartState({
      left: 'dataMin',
      right: 'dataMax',
      bottom: mode === 'difference' ? -1 : 2.5,
      top: mode === 'difference' ? 1 : 6,
      displayData: data.map(d => ({
        ...d,
        difference: d.hardAverage - d.average
      })),
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = data.find(d => showWords ? d.word === label : d.date === label);
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
          <p className="font-medium text-gray-900">{dataPoint.word}</p>
          <p className="text-gray-600">
            {new Date(dataPoint.date).toLocaleDateString()}
          </p>
          {mode === 'difference' ? (
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
    }
    return null;
  };

  return (
    <div className="h-[100dvh] p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center">
          <Select 
            defaultValue="normal" 
            onValueChange={(newMode) => {
              setChartState(prev => ({
                ...prev,
                bottom: newMode === 'difference' ? -1 : 2.5,
                top: newMode === 'difference' ? 1 : 6,
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
            </SelectContent>
          </Select>
          <button 
            onClick={zoomOut}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Zoom Out
          </button>
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
            onMouseDown={(e) => e && setRefArea(prev => ({ ...prev, left: e.activeLabel }))}
            onMouseMove={(e) => e && refArea.left && setRefArea(prev => ({ ...prev, right: e.activeLabel }))}
            onMouseUp={zoom}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={showWords ? "word" : "date"}
              angle={-45}
              interval="preserveStartEnd"
              textAnchor="end"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => showWords ? value : new Date(value).toLocaleDateString()}
              style={{ userSelect: 'none' }}
            />
            <YAxis
              domain={[
                chartState.bottom || (mode === 'difference' ? -1 : 2.5),
                chartState.top || (mode === 'difference' ? 1 : 6)
              ]}
              ticks={mode === 'difference' ? 
                [-0.5, 0, 0.5, 1] :  // ticks for difference mode
                [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]  // ticks for normal/hard mode
              }
              tickFormatter={(value) => value.toFixed(1)}
              label={{ 
                value: mode === 'difference' ? 'Difference in Average' : 'Average Guesses', 
                angle: -90, 
                position: 'insideLeft',
                style: { userSelect: 'none' }
              }}
              style={{ userSelect: 'none' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={mode === 'difference' ? 'difference' : (mode === 'normal' ? 'average' : 'hardAverage')}
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