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
  const [showWords, setShowWords] = useState(false);
  const { data, loading, error } = useWordleData();
  
  const [left, setLeft] = useState('dataMin');
  const [right, setRight] = useState('dataMax');
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [bottom, setBottom] = useState(2.5);
  const [top, setTop] = useState(6);
  const [displayData, setDisplayData] = useState(data);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    let leftIndex = data.findIndex(d => 
      showWords ? d.word === refAreaLeft : d.date === refAreaLeft
    );
    let rightIndex = data.findIndex(d => 
      showWords ? d.word === refAreaRight : d.date === refAreaRight
    );

    if (leftIndex > rightIndex) 
      [leftIndex, rightIndex] = [rightIndex, leftIndex];

    const [bottom, top] = getAxisYDomain(leftIndex + 1, rightIndex + 1, data, 0.5);

    const zoomedData = data.slice(leftIndex, rightIndex + 1);

    setRefAreaLeft('');
    setRefAreaRight('');
    setLeft(data[leftIndex][showWords ? 'word' : 'date']);
    setRight(data[rightIndex][showWords ? 'word' : 'date']);
    setBottom(bottom);
    setTop(top);
    setDisplayData(zoomedData);
  };

  const zoomOut = () => {
    setRefAreaLeft('');
    setRefAreaRight('');
    setLeft('dataMin');
    setRight('dataMax');
    setBottom(2.5);
    setTop(6);
    setDisplayData(data);
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
            data={displayData}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel)}
            onMouseMove={(e) => e && refAreaLeft && setRefAreaRight(e.activeLabel)}
            onMouseUp={zoom}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              allowDataOverflow
              dataKey={showWords ? "word" : "date"}
              domain={[left, right]}
              angle={-45}
              textAnchor="end"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => showWords ? value : new Date(value).toLocaleDateString()}
            />
            <YAxis
              allowDataOverflow
              domain={[bottom, top]}
              ticks={[2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ value: 'Average Guesses', angle: -90, position: 'insideLeft' }}
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
                strokeWidth: 1,
                r: 3
              }}
              activeDot={{ 
                r: 6
              }}
              animationDuration={300}
            />
            {refAreaLeft && refAreaRight ? (
              <ReferenceArea 
                x1={refAreaLeft} 
                x2={refAreaRight} 
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