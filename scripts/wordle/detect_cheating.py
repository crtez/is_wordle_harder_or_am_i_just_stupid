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
            # Return both raw count and proportion
            return word_guesses, (word_guesses / total_guesses if total_guesses > 0 else 0)
    except (FileNotFoundError, json.JSONDecodeError, IndexError):
        return 0, 0

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
    
    # Get the counts and proportions of first guesses
    today_count, today_proportion = get_first_guesses_from_file(today_file, today_word)
    yesterday_count, yesterday_proportion = get_first_guesses_from_file(yesterday_file, today_word)
    
    delta_proportion = today_proportion - yesterday_proportion
    delta_count = today_count - yesterday_count
    
    # Create the result dictionary with both counts and proportions
    result = {
        "date": current_date_str,
        "word": today_word,
        "guesses": {
            "today": today_count,
            "yesterday": yesterday_count,
            "delta": delta_count,
            "proportion": {
                "today": round(today_proportion * 100, 2),  # Convert to percentage
                "yesterday": round(yesterday_proportion * 100, 2),  # Convert to percentage
                "delta": round(delta_proportion * 100, 2)
            }
        }
    }
    
    return result

# Example usage
if __name__ == "__main__":
    # Define output files
    normal_output = "data/wordle/guesses_by_round/cheating_analysis_normal.json"
    hard_output = "data/wordle/guesses_by_round/cheating_analysis_hard.json"
    
    # Load existing results
    existing_results = {
        "normal": [],
        "hard": []
    }
    for mode, filename in [("normal", normal_output), ("hard", hard_output)]:
        try:
            with open(filename, 'r') as f:
                existing_results[mode] = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            pass
    
    # Create date range from 2023-03-30 to present
    start_date = datetime(2023, 3, 30)
    end_date = datetime.now()
    dates = [(start_date + timedelta(days=x)).strftime('%Y-%m-%d')
             for x in range((end_date - start_date).days + 1)]
    
    print("Starting script...")
    
    # Process dates for each mode
    for mode in ["normal", "hard"]:
        results = existing_results[mode]
        processed_dates = {r["date"] for r in results}  # Get set of already processed dates
        output_file = normal_output if mode == "normal" else hard_output
        
        for date in dates:
            if date not in processed_dates:  # Only process if we don't have results yet
                print(f"\n=== Processing date: {date} for {mode} mode ===")
                result = process_wordle_stats(date, mode)
                if result:
                    results.append(result)
                    print(f"\n{mode.upper()} mode results:")
                    print(json.dumps(result, indent=2))
                else:
                    print(f"\nNo results found for {mode} mode")
        
        # Save results to file
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\nSaved {mode} mode results to {output_file}")

