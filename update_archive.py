import os
import json
import requests
from datetime import datetime, timedelta

# Path to the folder containing the JSON files
folder_path = 'data/archive/json'

# Create folder if it doesn't exist
os.makedirs(folder_path, exist_ok=True)

# If folder is empty, start from Wordle's launch date
if not os.listdir(folder_path):
    latest_date = datetime(2021, 6, 18)
else:
    # Extract dates from existing files and find the latest date
    dates = [datetime.strptime(filename.replace('.json', ''), '%Y-%m-%d')
             for filename in os.listdir(folder_path)]
    latest_date = max(dates)

today = datetime.now()

# Initialize an empty list to store the missing dates
missing_dates = []

# Start from the day after the latest date
current_date = latest_date + timedelta(days=1)

# Continue until we reach today's date
while current_date <= today:
    # Add the current date to the list of missing dates
    missing_dates.append(current_date)

    # Move to the next day
    current_date += timedelta(days=1)

# Process each missing date
for date_obj in missing_dates:
    date_str = date_obj.strftime('%Y-%m-%d')

    # Fetch the solution and days_since_launch
    wordle_url = f"https://www.nytimes.com/svc/wordle/v2/{date_str}.json"
    response = requests.get(wordle_url)
    
    if response.status_code == 200:
        data = response.json()
        
        # Create filename in the format: WORD_solution,ID,DATE.json
        filename = f"{date_str}.json"
        file_path = os.path.join(folder_path, filename)
        
        # Save the JSON response
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Saved {filename}")
    else:
        print(f"Failed to fetch data for {date_str}")

# Get all IDs from JSON content
ids = []
for filename in os.listdir(folder_path):
    if filename.endswith('.json'):
        file_path = os.path.join(folder_path, filename)
        with open(file_path, 'r') as f:
            data = json.load(f)
            ids.append(data['id'])

data = {
    "last_updated": datetime.now().isoformat(),
    "puzzle_ids": ids[227:] # from the rough acquisition of wordle by NYT
}

# Write to a JSON file
with open('data/archive/relevant_puzzle_ids.json', 'w') as f:
    json.dump(data, f, indent=2)