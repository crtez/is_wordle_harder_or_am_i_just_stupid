import puzzleIds from '@/data/archive/relevant_puzzle_ids.json';

export const getBookmarkletCode = (): string => {
  const ids = puzzleIds.puzzle_ids.join(',');
  return `ajavascript:(function(){
    const ids = '${ids}';
    if (!ids) return;

    const allIds = ids.split(',').map(id => id.trim()).filter(id => id !== '');
    let allGameData = [];

    async function fetchChunks(startIndex = 0) {
      if (startIndex >= allIds.length) {
        const blob = new Blob([JSON.stringify(allGameData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_wordle_data.json';
        a.click();
        return;
      }

      const chunk = allIds.slice(startIndex, startIndex + 31);
      const url = \`https://www.nytimes.com/svc/games/state/wordleV2/latests?puzzle_ids=\${chunk.join(',')}\`;
      
      try {
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
        
        const data = await response.json();
        if (data.states && Array.isArray(data.states)) {
          allGameData = allGameData.concat(data.states);
        }
        
        console.log(\`Fetched \${chunk.length} puzzles. Total: \${allGameData.length}\`);
        setTimeout(() => fetchChunks(startIndex + 31), 1000);
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchChunks();
  })();`;
}; 