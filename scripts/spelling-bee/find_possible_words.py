import json
import os
from pathlib import Path

def is_word_possible(word, puzzle_data):
    """
    Check if a word is possible given puzzle letters.
    Rules:
    - Must be at least 4 letters
    - Must contain the center letter
    - Can only use provided letters
    """
    if len(word) < 4:
        return False
        
    center_letter = puzzle_data['letters']['center_letter'].lower()
    all_letters = [letter.lower() for letter in puzzle_data['letters']['all_letters']]
    
    word = word.lower()
    
    # Check if word contains center letter
    if center_letter not in word:
        return False
        
    # Check if word only uses allowed letters
    return all(letter in all_letters for letter in word)

def find_possible_dates(word):
    """Find all dates where the word would have been possible."""
    archive_dir = Path('data/spelling-bee/archive')
    possible_dates = []
    
    # Get all JSON files in archive
    json_files = archive_dir.glob('spelling-bee_*.json')
    
    for json_file in json_files:
        with open(json_file, 'r') as f:
            puzzle_data = json.load(f)
            
            if is_word_possible(word, puzzle_data):
                possible_dates.append({
                    'date': puzzle_data['date'],
                    'puzzle_number': puzzle_data['puzzle_number'],
                    'letters': puzzle_data['letters']
                })
    
    return possible_dates

def main():
    while True:
        word = input("\nEnter a word to check (or 'quit' to exit): ").strip()
        
        if word.lower() == 'quit':
            break
            
        possible_dates = find_possible_dates(word)
        
        if not possible_dates:
            print(f"\nThe word '{word}' was not possible in any puzzle.")
        else:
            print(f"\nThe word '{word}' was possible on these dates:")
            for data in possible_dates:
                print(f"\nDate: {data['date']} (Puzzle #{data['puzzle_number']})")
                print(f"Center letter: {data['letters']['center_letter']}")
                print(f"Outer letters: {', '.join(data['letters']['outer_letters'])}")

if __name__ == "__main__":
    main() 