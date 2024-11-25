import os
import requests
from datetime import datetime, timedelta

# Path to the folder containing the JSON files
folder_path = 'wordle-charts/src/data'

# Extract dates directly from filenames and find the latest date
dates = [datetime.strptime(filename.split(',')[-1].replace('.json', ''), '%Y-%m-%d')
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

    # Step 1: Fetch the solution and days_since_launch
    wordle_url = f"https://www.nytimes.com/svc/wordle/v2/{date_str}.json"
    response = requests.get(wordle_url)
    if response.status_code != 200:
        print(f"Failed to fetch data for date {date_str}")
        continue

    data = response.json()
    solution = data['solution']
    days_since_launch = data['days_since_launch']

    print(f"Solution for {date_str}: {solution}")
    print(f"Days Since Launch: {days_since_launch}")

    # Step 2: Fetch the summary data
    summary_url = f"https://static01.nyt.com/newsgraphics/2022/2022-01-25-wordle-solver/{solution}/summary.json"
    summary_response = requests.get(summary_url)
    if summary_response.status_code != 200:
        print(f"Failed to fetch summary for solution {solution} on {date_str}")
        continue

    # Step 3: Save the summary JSON
    filename = f"summary_{solution},{days_since_launch},{date_str}.json"
    with open(os.path.join(folder_path, filename), 'w') as f:
        f.write(summary_response.text)

    print(f"Summary saved as {filename}")
