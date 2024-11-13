import plotly.graph_objects as go
import os
import json
from jinja2 import Environment, FileSystemLoader
import pandas as pd

def extract_number(item):
    parts = item.split(',')
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
    dates.append(parts[2])

# Create DataFrames for easier manipulation
df_normal = pd.DataFrame({'word': word, 'normal': normal, 'date': dates})
df_hard = pd.DataFrame({'word': word, 'hard': hard, 'date': dates})

# Calculate rolling averages (window sizes of 7 and 30)
df_normal['rolling_avg_7'] = df_normal['normal'].rolling(window=7).mean()
df_normal['rolling_avg_30'] = df_normal['normal'].rolling(window=30).mean()
df_hard['rolling_avg_7'] = df_hard['hard'].rolling(window=7).mean()
df_hard['rolling_avg_30'] = df_hard['hard'].rolling(window=30).mean()

# Create a single figure with updatemenus (dropdown)
fig = go.Figure(layout_yaxis_range=[2.5,6])

# Add traces for normal difficulty
fig.add_trace(go.Scatter(
    x=df_normal['word'],
    y=df_normal['normal'],
    mode='markers',
    name='Daily Data',
    hovertext=df_normal['date'],
    visible=True,
    legendgroup='daily',
))

fig.add_trace(go.Scatter(
    x=df_normal['word'],
    y=df_normal['rolling_avg_7'],
    mode='lines',
    name='7-day Rolling Average',
    hovertext=df_normal['date'],
    line=dict(color='green', width=2),
    visible=True,
))

fig.add_trace(go.Scatter(
    x=df_normal['word'],
    y=df_normal['rolling_avg_30'],
    mode='lines',
    name='30-day Rolling Average',
    hovertext=df_normal['date'],
    line=dict(color='blue', width=2),
    visible=True,
))

# Add traces for hard difficulty (initially hidden)
fig.add_trace(go.Scatter(
    x=df_hard['word'],
    y=df_hard['hard'],
    mode='markers',
    name='Daily Data',
    hovertext=df_hard['date'],
    visible=False,
    legendgroup='daily',
))

fig.add_trace(go.Scatter(
    x=df_hard['word'],
    y=df_hard['rolling_avg_7'],
    mode='lines',
    name='7-day Rolling Average',
    hovertext=df_hard['date'],
    line=dict(color='green', width=2),
    visible=False,
))

fig.add_trace(go.Scatter(
    x=df_hard['word'],
    y=df_hard['rolling_avg_30'],
    mode='lines',
    name='30-day Rolling Average',
    hovertext=df_hard['date'],
    line=dict(color='blue', width=2),
    visible=False,
))

# Add dropdown menu
fig.update_layout(
    updatemenus=[
        dict(
            buttons=list([
                dict(
                    args=[{"visible": [True, True, True, False, False, False]},
                          {"title": "Average guesses per word on Normal difficulty"}],
                    label="Normal",
                    method="update"
                ),
                dict(
                    args=[{"visible": [False, False, False, True, True, True]},
                          {"title": "Average guesses per word on Hard difficulty"}],
                    label="Hard",
                    method="update"
                )
            ]),
            direction="down",
            showactive=True,
            x=1,
            y=1.05,
        ),
    ],
    title="Average guesses per word on Normal difficulty",
    xaxis_title="Word",
    yaxis_title="Guesses",
    legend_title="Legend"
)

# Add overall average lines for both difficulties
normal_avg = df_normal['normal'].mean()
hard_avg = df_hard['hard'].mean()

fig.add_hline(
    y=normal_avg,
    line_dash="dash",
    line_color="red",
    annotation_text=f"Normal Avg: {normal_avg:.2f}",
    annotation_position="top right",
    visible=True
)

fig.add_hline(
    y=hard_avg,
    line_dash="dash",
    line_color="red",
    annotation_text=f"Hard Avg: {hard_avg:.2f}",
    annotation_position="top right",
    visible=True
)

env = Environment(loader=FileSystemLoader('templates'))
template = env.get_template('template.html')

html = template.render({'table': fig.to_html()})

output_file = 'docs/index.html'

with open(output_file, 'w', encoding="utf-8") as f:
    f.write(html)