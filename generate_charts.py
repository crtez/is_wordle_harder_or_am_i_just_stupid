import plotly.express as px
import os
import json


def extract_number(item):
    # Split the string by commas
    parts = item.split(',')
    # Extract the number part and convert it to an integer
    return int(parts[1])


folder_path = "data"
d = {}
for filename in os.listdir(folder_path):
    if filename.startswith("summary_") and filename.endswith(".json"):
        with open(folder_path + "/" + filename, "r") as file:
            data = json.load(file)
            d[filename] = data['average']

list_of_filenames = [x for x in os.listdir(folder_path) if x.endswith(".json")]
sorted_keys = sorted(list_of_filenames, key=extract_number)

word = []
normal = []
hard = []
dates = []
for key in sorted_keys:
    parts = key.split("_")[1].split(".")[0].split(",")
    word.append(parts[0])
    normal.append(d[key]['normal'])
    hard.append(d[key]['hard'])
    dates.append(parts[2])  # Assuming date is in the third part

# Create scatter plots with dates as hover text
fig = px.scatter(x=word, y=normal, labels={'x': 'Word', 'y': 'Guesses'},
                 title="Average guesses per word on Normal difficulty",
                 hover_name=dates)
fig2 = px.scatter(x=word, y=hard, labels={'x': 'Word', 'y': 'Guesses'},
                  title="Average guesses per word on Hard difficulty",
                  hover_name=dates)

# Show the plots
fig.show()
fig2.show()
