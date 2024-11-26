document.addEventListener('DOMContentLoaded', function() {
  const fetchButton = document.getElementById('fetch');
  const statusDiv = document.getElementById('status');
  const idListTextarea = document.getElementById('idList');

  async function getCookies() {
    const cookies = await chrome.cookies.getAll({domain: '.nytimes.com'});
    return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  }

  fetchButton.addEventListener('click', async () => {
    const ids = idListTextarea.value
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '');

    if (ids.length === 0) {
      statusDiv.textContent = 'Please enter some IDs';
      return;
    }

    fetchButton.disabled = true;
    statusDiv.textContent = 'Fetching data...';

    try {
      const cookieString = await getCookies();
      let allGameData = [];

      // Process in chunks of 31
      for (let i = 0; i < ids.length; i += 31) {
        const chunk = ids.slice(i, i + 31);
        const url = `https://www.nytimes.com/svc/games/state/wordleV2/latests?puzzle_ids=${chunk.join(',')}`;
        
        statusDiv.textContent = `Fetching puzzles ${i + 1} to ${Math.min(i + 31, ids.length)}...`;
        
        const response = await fetch(url, {
          headers: {
            'Cookie': cookieString
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // Extract all gameData objects from the states array and add them to our collection
        if (data.states && Array.isArray(data.states)) {
          allGameData = allGameData.concat(data.states);
        }
        
        console.log(`Current gameData count: ${allGameData.length}`);
        
        // Add a small delay between requests to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Save all gameData objects as a single JSON array
      const blob = new Blob([JSON.stringify(allGameData, null, 2)], {type: 'application/json'});
      const filename = `wordle_data_all.json`;
      
      chrome.downloads.download({
        url: URL.createObjectURL(blob),
        filename: filename,
        saveAs: false
      });
      
      statusDiv.textContent = `All data fetched and saved successfully! Total game states: ${allGameData.length}`;
    } catch (error) {
      statusDiv.textContent = `Error: ${error.message}`;
      console.error('Full error:', error);
    } finally {
      fetchButton.disabled = false;
    }
  });
});