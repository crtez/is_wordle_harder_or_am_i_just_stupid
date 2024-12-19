import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PersonalData, WordleStats } from '@/types/wordle_types';
import { calculateCompletionTimes, calculateMostActiveHour } from '@/services/wordleDataProcessing';

interface StatsDialogProps {
  wordleStats: WordleStats;
  personalData: PersonalData[];
}

export function StatsDialog({ wordleStats, personalData }: StatsDialogProps) {
  const times = calculateCompletionTimes(personalData);
  const mostActiveHour = calculateMostActiveHour(personalData);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 whitespace-nowrap">
          View Stats
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-2xl text-center">
            Your Wordle Statistics
          </DialogTitle>
        </DialogHeader>
        
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-8 p-6">
          {/* Left Column - Main Stats */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{wordleStats.gamesPlayed}</p>
                <p className="text-sm text-muted-foreground"><strong>Games Played</strong></p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{wordleStats.gamesWon}</p>
                <p className="text-sm text-muted-foreground"><strong>Games Won</strong></p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{wordleStats.currentStreak}</p>
                <p className="text-sm text-muted-foreground"><strong>Current Streak</strong></p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{wordleStats.maxStreak}</p>
                <p className="text-sm text-muted-foreground"><strong>Max Streak</strong></p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{wordleStats.winRate?.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground"><strong>Win Rate</strong></p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{wordleStats.averageGuesses?.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground"><strong>Average Guesses</strong></p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center col-span-2">
                <p className="text-2xl font-bold text-foreground">{times.average}</p>
                <p className="text-sm text-muted-foreground"><strong>Average Completion Time</strong></p>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>Earliest: {times.earliest.time} ({times.earliest.date})</p>
                  <p>Latest: {times.latest.time} ({times.latest.date})</p>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center col-span-2">
                <p className="text-2xl font-bold text-foreground">{mostActiveHour.hour}</p>
                <p className="text-sm text-muted-foreground"><strong>Most Active Hour</strong></p>
                <p className="text-sm text-muted-foreground">Games Completed: {mostActiveHour.count}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Guess Distribution */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-4 text-foreground">Guess Distribution</h3>
            <div className="space-y-2">
              {Object.entries(wordleStats.guessDistribution || {})
                .filter(([key]) => key !== 'fail')
                .map(([guesses, count]) => {
                  const total = Object.values(wordleStats.guessDistribution || {}).reduce((a, b) => a + b, 0);
                  const percentage = (count / total) * 100;
                  return (
                    <div key={guesses} className="flex items-center gap-2">
                      <div className="w-4 text-right text-foreground"><strong>{guesses}</strong></div>
                      <div className="flex-1 h-8 relative">
                        <div 
                          className="absolute inset-y-0 left-0 bg-primary/20 rounded"
                          style={{ width: `${Math.max(percentage * 0.95 + 15, 15)}%` }}
                        >
                          <span className="absolute inset-y-0 right-2 flex items-center text-sm text-foreground">
                            {count}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div className="flex items-center gap-2">
                <div className="w-4 text-right text-foreground"><strong>X</strong></div>
                <div className="flex-1 h-8 relative">
                  <div 
                    className="absolute inset-y-0 left-0 bg-destructive/20 rounded"
                    style={{ 
                      width: `${Math.max((wordleStats.guessDistribution?.fail || 0) / 
                        Object.values(wordleStats.guessDistribution || {}).reduce((a, b) => a + b, 0) * 100 * 0.95 + 15, 15)}%` 
                    }}
                  >
                    <span className="absolute inset-y-0 right-2 flex items-center text-sm text-foreground">
                      {wordleStats.guessDistribution?.fail || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 