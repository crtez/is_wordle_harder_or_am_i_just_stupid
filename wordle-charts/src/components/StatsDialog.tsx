import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { WordleStats } from '@/components/wordle_types';

interface StatsDialogProps {
  wordleStats: WordleStats;
}

export function StatsDialog({ wordleStats }: StatsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 whitespace-nowrap">
          View Stats
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Wordle Statistics</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div className="space-y-2">
            <p>Games Played: {wordleStats.gamesPlayed}</p>
            <p>Games Won: {wordleStats.gamesWon}</p>
            <p>Win Rate: {wordleStats.winRate?.toFixed(1)}%</p>
            <p>Average Guesses: {wordleStats.averageGuesses?.toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <p>Current Streak: {wordleStats.currentStreak}</p>
            <p>Max Streak: {wordleStats.maxStreak}</p>
            <p>Guess Distribution:</p>
            <div className="text-sm">
              {Object.entries(wordleStats.guessDistribution || {})
                .filter(([key]) => key !== 'fail')
                .map(([guesses, count]) => (
                  <p key={guesses}>
                    {guesses}: {count} times
                  </p>
                ))}
              <p>Failed: {wordleStats.guessDistribution?.fail || 0} times</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 