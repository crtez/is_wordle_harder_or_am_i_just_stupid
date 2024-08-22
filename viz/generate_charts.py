import plotly.express as px
import os
import json
from jinja2 import Environment, FileSystemLoader
import webbrowser
import statistics


def extract_number(item):
    # Split the string by commas
    parts = item.split(',')
    # Extract the number part and convert it to an integer
    return int(parts[1])


folder_path = "../data"
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

fig.add_hline(y=statistics.mean(normal), line_dash="dash", line_color="red",
              annotation_text=f"Avg: {statistics.mean(normal):.2f}",
              annotation_position="top right")


fig2 = px.scatter(x=word, y=hard, labels={'x': 'Word', 'y': 'Guesses'},
                  title="Average guesses per word on Hard difficulty",
                  hover_name=dates)

fig2.add_hline(y=statistics.mean(hard), line_dash="dash", line_color="red",
              annotation_text=f"Avg: {statistics.mean(hard):.2f}",
              annotation_position="top right")

env = Environment(
    loader=FileSystemLoader(
        'templates'
    )
)
template = env.get_template('template.html')

html = template.render({'table1': fig.to_html(),
                        'table2': fig2.to_html()})

output_file = 'wordle.html'

# Write the HTML to the file
with open(output_file, 'w', encoding="utf-8") as f:
    f.write(html)

# Open the HTML file in the default web browser
webbrowser.open(output_file)
