import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import re
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

def extract_letters(html):
    """Extract letters from the puzzle div."""
    soup = BeautifulSoup(html, 'html.parser')
    div = soup.find('div', class_='thinner-space-after')
    
    if not div:
        return None
    
    # Find all img tags
    imgs = div.find_all('img')
    if not imgs or len(imgs) != 7:
        return None
    
    letters = []
    for img in imgs:
        # Extract letter from alt text or filename
        alt_text = img.get('alt', '')
        if len(alt_text) == 1:
            letters.append(alt_text)
        else:
            # Try to extract from filename (e.g., "w-y.gif" -> "W")
            src = img.get('src', '')
            match = re.search(r'/([a-zA-Z])-[yg]\.gif', src)
            if match:
                letters.append(match.group(1).upper())
    
    if len(letters) != 7:
        return None
        
    return {
        'center_letter': letters[0],
        'outer_letters': letters[1:],
        'all_letters': letters
    }

def save_to_json(data, date_str):
    """Save puzzle data to a JSON file."""
    filename = os.path.join('spelling-bee', 'archive', f'spelling-bee_{date_str}.json')
    os.makedirs(os.path.dirname(filename), exist_ok=True)  # Create directories if they don't exist
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    return filename

def get_latest_file():
    """Find the most recent JSON file in the current directory."""
    archive_dir = os.path.join('spelling-bee', 'archive')
    files = [f for f in os.listdir(archive_dir) if f.startswith('spelling-bee_') and f.endswith('.json')]
    if not files:
        return None
    return os.path.join(archive_dir, max(files))

def get_start_number():
    """Determine the starting puzzle number."""
    latest_file = get_latest_file()
    if latest_file:
        # Load the file and get its puzzle number
        with open(latest_file, 'r') as f:
            data = json.load(f)
            return data['puzzle_number'] + 1
    return 1  # Start from the first puzzle

def fetch_puzzle(number):
    """Fetch and process a single puzzle."""
    url = f'https://www.sbsolver.com/s/{number}'
    try:
        response = requests.get(url)
        letters_data = extract_letters(response.text)
        
        if not letters_data:
            return None
        
        # Calculate the date
        start_date = datetime(2018, 5, 9)
        current_date = start_date + timedelta(days=number - 1)
        date_str = current_date.strftime('%Y-%m-%d')
        
        data = {
            'date': date_str,
            'puzzle_number': number,
            'letters': letters_data
        }
        
        filename = save_to_json(data, date_str)
        return data
    except Exception as e:
        print(f"\nError processing puzzle {number}: {str(e)}")
        return None

def main():
    current_number = get_start_number()
    max_workers = 5  # Adjust this number based on your needs
    batch_size = 50  # Process puzzles in batches to show progress
    
    while True:
        # Create a batch of puzzle numbers to process
        puzzle_numbers = list(range(current_number, current_number + batch_size))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_number = {
                executor.submit(fetch_puzzle, number): number 
                for number in puzzle_numbers
            }
            
            # Process results with progress bar
            with tqdm(total=len(puzzle_numbers), desc="Fetching puzzles") as pbar:
                for future in as_completed(future_to_number):
                    number = future_to_number[future]
                    result = future.result()
                    
                    if result is None:
                        print(f"\nNo valid puzzle found for number {number}. Stopping.")
                        return
                    
                    pbar.update(1)
                    # Small delay to be nice to the server
                    time.sleep(0.2)
        
        current_number += batch_size

if __name__ == "__main__":
    main()