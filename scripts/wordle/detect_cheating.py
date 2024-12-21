import json
from datetime import datetime, timedelta
import os
import glob

# Define base paths
NORMAL_PATH = "data/wordle/guesses_by_round/normal"
HARD_PATH = "data/wordle/guesses_by_round/hard"

def get_first_guesses_from_file(filename, word):
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
            # Calculate total guesses for the word
            total_guesses = sum(data[0].values())
            # Get first guesses for the specific word
            word_guesses = data[0].get(word, 0)
            # Return proportion (0 if total_guesses is 0)
            return word_guesses / total_guesses if total_guesses > 0 else 0
    except (FileNotFoundError, json.JSONDecodeError, IndexError):
        return 0

def get_word_for_date(date_str, mode="normal"):
    # Find the file matching the date pattern for the specified mode
    pattern = f'data/wordle/guesses_by_round/{mode}/guesses-by-round-{mode}-{date_str}-*.json'
    files = glob.glob(pattern)
    if files:
        return files[0].split('-')[-1].split('.')[0]
    return None

def process_wordle_stats(current_date_str, mode="normal"):
    # Parse the current date
    current_date = datetime.strptime(current_date_str, '%Y-%m-%d')
    
    # Calculate yesterday's date
    yesterday = current_date - timedelta(days=1)
    yesterday_str = yesterday.strftime('%Y-%m-%d')
    
    # Get words for today and yesterday
    today_word = get_word_for_date(current_date_str, mode)
    yesterday_word = get_word_for_date(yesterday_str, mode)
    
    if not today_word or not yesterday_word:
        return None
    
    # Construct filenames using the correct mode
    base_path = f"data/wordle/guesses_by_round/{mode}"
    today_file = f'{base_path}/guesses-by-round-{mode}-{current_date_str}-{today_word}.json'
    yesterday_file = f'{base_path}/guesses-by-round-{mode}-{yesterday_str}-{yesterday_word}.json'
    
    # Get the proportions of first guesses
    today_proportion = get_first_guesses_from_file(today_file, today_word)
    yesterday_proportion = get_first_guesses_from_file(yesterday_file, today_word)
    
    delta = today_proportion - yesterday_proportion
    
    # Create the result dictionary with proportions and percentage difference
    result = {
        "date": current_date_str,
        "word": today_word,
        "firstGuessesProportion": round(today_proportion * 100, 2),  # Convert to percentage
        "firstGuessesYesterdayProportion": round(yesterday_proportion * 100, 2),  # Convert to percentage
        "delta": round(delta * 100, 2)
    }
    
    return result

# Example usage
if __name__ == "__main__":
    dates = ["2023-12-26"]  # Add more dates as needed
    
    print("Starting script...")
    
    for date in dates:
        print(f"\n=== Processing date: {date} ===")
        
        # Process both modes more elegantly
        for mode in ["normal", "hard"]:
            result = process_wordle_stats(date, mode)
            if result:
                print(f"\n{mode.upper()} mode results:")
                print(json.dumps(result, indent=2))
            else:
                print(f"\nNo results found for {mode} mode")

