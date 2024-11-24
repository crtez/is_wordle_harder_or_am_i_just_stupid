import React, { useState } from 'react';
import { useWordleData } from '@/utils/processWordleData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const WordleChart = () => {
  const [showWords, setShowWords] = useState(false);
  const { data, loading, error } = useWordleData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

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
        <h1 className="text-xl font-bold">Wordle Average Scores</h1>
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
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={showWords ? "word" : "date"}
              angle={-45}
              textAnchor="end"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => showWords ? value : new Date(value).toLocaleDateString()}
            />
            <YAxis
              domain={[2, 6]}
              ticks={[2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ value: 'Average Guesses', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
               content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#2563eb"
              strokeWidth={0}
              dot={{ fill: '#2563eb', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WordleChart;