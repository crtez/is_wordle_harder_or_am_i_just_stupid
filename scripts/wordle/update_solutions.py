import os
import json
import requests
from datetime import datetime, timedelta, timezone

# Path to the JSON file
file_path = 'data/wordle/solutions.json'

# Get yesterday's date, ignoring time
yesterday = datetime.now(timezone.utc).date() - timedelta(days=1)

# Extract latest date from JSON file, or use launch date if file doesn't exist
try:
    with open(file_path, 'r') as f:
        solutions = json.load(f)
        # Get the latest date from the keys
        latest_date = datetime.strptime(max(solutions.keys()), '%Y-%m-%d').date()
except (FileNotFoundError, json.JSONDecodeError, ValueError):
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    # Initialize empty solutions dict and start from launch date
    solutions = {}
    latest_date = datetime(2021, 6, 18).date() # launch date -1 day

# Start from the day after the latest date
current_date = latest_date + timedelta(days=1)

# Initialize list of dates to process
missing_dates = []

# Continue until we reach yesterday's date
while current_date <= yesterday:
    missing_dates.append(current_date.strftime('%Y-%m-%d'))
    current_date += timedelta(days=1)

# Process each missing date
for date_str in missing_dates:
    # Fetch the solution data
    wordle_url = f"https://www.nytimes.com/svc/wordle/v2/{date_str}.json"
    response = requests.get(wordle_url)
    if response.status_code != 200:
        print(f"Failed to fetch data for date {date_str}")
        continue

    data = response.json()
    print(f"Solution for {date_str}: {data['solution']}")
    
    # Add the data to our dictionary using date as key
    solutions[date_str] = data

    # Save the entire solutions dict after each successful addition
    with open(file_path, 'w') as f:
        json.dump(solutions, f, indent=2)

    print(f"Data added for {date_str}")

