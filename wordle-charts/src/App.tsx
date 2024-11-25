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

const getAxisYDomain = (from: number, to: number, data: any[], offset: number) => {
  const refData = data.slice(from - 1, to);
  let [bottom, top] = [refData[0].average, refData[0].average];
  
  refData.forEach((d) => {
    if (d.average > top) top = d.average;
    if (d.average < bottom) bottom = d.average;
  });

  return [(bottom | 0) - offset, (top | 0) + offset];
};

const WordleChart = () => {
  const { data, loading, error } = useWordleData();
  const [showWords, setShowWords] = useState(false);
  
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
      setChartState({
        left: 'dataMin',
        right: 'dataMax',
        bottom: 2.5,
        top: 6,
        displayData: data,
      });
    }
  }, [data]);

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

    const [bottom, top] = getAxisYDomain(leftIndex + 1, rightIndex + 1, data, 0.5);
    
    setRefArea({ left: '', right: '' });
    setChartState({
      left: data[leftIndex][showWords ? 'word' : 'date'],
      right: data[rightIndex][showWords ? 'word' : 'date'],
      bottom,
      top,
      displayData: data.slice(leftIndex, rightIndex + 1),
    });
  };

  const zoomOut = () => {
    setRefArea({ left: '', right: '' });
    setChartState({
      left: 'dataMin',
      right: 'dataMax',
      bottom: 2.5,
      top: 6,
      displayData: data,
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
          <p className="text-gray-800">
            Average: {payload[0].value.toFixed(2)} guesses
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-screen p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center">
          <h1 className="text-xl font-bold">Wordle Average Scores</h1>
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
      <div className="h-[calc(100vh-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
          //eslint-disable-next-line react/jsx-no-bind
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
              domain={[chartState.bottom || 2.5, chartState.top || 6]}
              ticks={[2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ 
                value: 'Average Guesses', 
                angle: -90, 
                position: 'insideLeft',
                style: { userSelect: 'none' }
              }}
              style={{ userSelect: 'none' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="average"
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