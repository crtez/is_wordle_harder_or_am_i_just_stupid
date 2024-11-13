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

def create_figure(df, y_column, title):
    fig = go.Figure()

    # Add scatter plot
    fig.add_trace(go.Scatter(
        x=df['word'],
        y=df[y_column],
        mode='markers',
        name='Daily Data',
        hovertext=df['date'],
        legendgroup='daily',
    ))

    # Add 7-day rolling average
    fig.add_trace(go.Scatter(
        x=df['word'],
        y=df[f'rolling_avg_7'],
        mode='lines',
        name='7-day Rolling Average',
        line=dict(color='green', width=2)
    ))

    # Add 30-day rolling average
    fig.add_trace(go.Scatter(
        x=df['word'],
        y=df[f'rolling_avg_30'],
        mode='lines',
        name='30-day Rolling Average',
        line=dict(color='blue', width=2)
    ))

    # Add overall average line
    overall_avg = df[y_column].mean()
    fig.add_hline(
        y=overall_avg,
        line_dash="dash",
        line_color="red",
        annotation_text=f"Avg: {overall_avg:.2f}",
        annotation_position="top right"
    )

    fig.update_layout(
        title=title,
        xaxis_title="Word",
        yaxis_title="Guesses",
        legend_title="Legend"
    )

    return fig

# Create figures
fig_normal = create_figure(df_normal, 'normal', "Average guesses per word on Normal difficulty")
fig_hard = create_figure(df_hard, 'hard', "Average guesses per word on Hard difficulty")

env = Environment(loader=FileSystemLoader('viz/templates'))
template = env.get_template('template.html')

html = template.render({'table1': fig_normal.to_html(),
                        'table2': fig_hard.to_html()})

output_file = 'viz/wordle.html'

with open(output_file, 'w', encoding="utf-8") as f:
    f.write(html)