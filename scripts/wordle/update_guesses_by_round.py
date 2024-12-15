import os
import requests
from datetime import datetime, timedelta

# Paths to the folders containing the JSON files
normal_folder_path = 'data/wordle/guesses_by_round/normal'
hard_folder_path = 'data/wordle/guesses_by_round/hard'

# Ensure directories exist
os.makedirs(normal_folder_path, exist_ok=True)
os.makedirs(hard_folder_path, exist_ok=True)

# Set start date to March 29, 2023
start_date = datetime(2023, 3, 29)
today = datetime.now()

# Initialize an empty list to store the dates
dates_to_process = []

# Start from March 29, 2023
current_date = start_date

# Continue until we reach today's date
while current_date <= today:
    # Add the current date to the list of dates
    dates_to_process.append(current_date)
    # Move to the next day
    current_date += timedelta(days=1)

# Process each date
for date_obj in dates_to_process:
    date_str = date_obj.strftime('%Y-%m-%d')

    # Step 1: Fetch the solution from the Wordle API
    wordle_url = f"https://www.nytimes.com/svc/wordle/v2/{date_str}.json"
    response = requests.get(wordle_url)
    if response.status_code != 200:
        print(f"Failed to fetch data for date {date_str}")
        continue

    data = response.json()
    solution = data['solution']

    print(f"Processing {date_str}: {solution}")

    # Step 2: Fetch both normal and hard mode data
    for mode in ['normal', 'hard']:
        url = f"https://static01.nyt.com/newsgraphics/2022/2022-01-25-wordle-solver/{solution}/guesses-by-round-{mode}.json"
        response = requests.get(url)
        if response.status_code != 200:
            print(f"Failed to fetch {mode} mode data for solution {solution} on {date_str}")
            continue

        # Step 3: Save the JSON files
        folder_path = normal_folder_path if mode == 'normal' else hard_folder_path
        filename = f"guesses-by-round-{mode}-{date_str}-{solution}.json"
        with open(os.path.join(folder_path, filename), 'w') as f:
            f.write(response.text)

        print(f"Saved {mode} mode data as {filename}")