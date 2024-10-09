import plotly.express as px
import plotly.graph_objects as go
import os
import json
from jinja2 import Environment, FileSystemLoader
import webbrowser
import statistics
import pandas as pd

def extract_number(item):
    parts = item.split(',')
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
    dates.append(parts[2])

# Create DataFrames for easier manipulation
df_normal = pd.DataFrame({'word': word, 'normal': normal, 'date': dates})
df_hard = pd.DataFrame({'word': word, 'hard': hard, 'date': dates})

# Calculate rolling averages (window size of 7)
df_normal['rolling_avg'] = df_normal['normal'].rolling(window=7).mean()
df_hard['rolling_avg'] = df_hard['hard'].rolling(window=7).mean()

# Create scatter plots with dates as hover text and add rolling average line
fig = px.scatter(df_normal, x='word', y='normal', labels={'word': 'Word', 'normal': 'Guesses'},
                 title="Average guesses per word on Normal difficulty",
                 hover_name='date')

fig.add_trace(go.Scatter(x=df_normal['word'], y=df_normal['rolling_avg'],
                         mode='lines', name='7-day Rolling Average',
                         line=dict(color='green', width=2)))

fig.add_hline(y=statistics.mean(normal), line_dash="dash", line_color="red",
              annotation_text=f"Avg: {statistics.mean(normal):.2f}",
              annotation_position="top right")

fig2 = px.scatter(df_hard, x='word', y='hard', labels={'word': 'Word', 'hard': 'Guesses'},
                  title="Average guesses per word on Hard difficulty",
                  hover_name='date')

fig2.add_trace(go.Scatter(x=df_hard['word'], y=df_hard['rolling_avg'],
                          mode='lines', name='7-day Rolling Average',
                          line=dict(color='green', width=2)))

fig2.add_hline(y=statistics.mean(hard), line_dash="dash", line_color="red",
               annotation_text=f"Avg: {statistics.mean(hard):.2f}",
               annotation_position="top right")

env = Environment(loader=FileSystemLoader('templates'))
template = env.get_template('template.html')

html = template.render({'table1': fig.to_html(),
                        'table2': fig2.to_html()})

output_file = 'wordle.html'

with open(output_file, 'w', encoding="utf-8") as f:
    f.write(html)

webbrowser.open(output_file)