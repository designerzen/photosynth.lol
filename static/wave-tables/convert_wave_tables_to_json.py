import os
import json
import re
import shutil

# Define the source directory (root of wave-tables)
source_dir = os.path.dirname(os.path.abspath(__file__))

# Define the output directory (where to save the converted files)
output_dir = os.path.join(source_dir, 'gm_periodic_waves_v5')

# Check if output directory exists, if so, clear it
if os.path.exists(output_dir):
    # Remove all files in the directory
    for file in os.listdir(output_dir):
        file_path = os.path.join(output_dir, file)
        if os.path.isfile(file_path):
            os.unlink(file_path)
else:
    # Create the directory if it doesn't exist
    os.makedirs(output_dir)

# Function to parse the wave table file
def parse_wave_table(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if the file is already in JSON format
    if content.strip().startswith('{') and content.strip().endswith('}'):
        try:
            # Try to parse as JSON first (for files like acoustic-guitar-nylon)
            data = json.loads(content)
            if 'real' in data and 'imag' in data:
                return data['real'], data['imag']
        except json.JSONDecodeError:
            pass  # Not valid JSON, continue with regex parsing
    
    # Extract real array
    real_match = re.search(r"['\"]real['\"]\s*:\s*\[(.*?)\]", content, re.DOTALL)
    real_values = []
    if real_match:
        real_str = real_match.group(1)
        # Parse the values
        for val in real_str.split(','):
            val = val.strip()
            if val and not val.isspace():
                try:
                    real_values.append(float(val))
                except ValueError:
                    pass
    
    # Extract imag array if it exists
    imag_match = re.search(r"['\"]imag['\"]\s*:\s*\[(.*?)\]", content, re.DOTALL)
    imag_values = []
    if imag_match:
        imag_str = imag_match.group(1)
        # Parse the values
        for val in imag_str.split(','):
            val = val.strip()
            if val and not val.isspace():
                try:
                    imag_values.append(float(val))
                except ValueError:
                    pass
    
    # If no imag array is found, create an array of zeros with the same length as real
    if not imag_values and real_values:
        imag_values = [0.0] * len(real_values)
    
    return real_values, imag_values

# Function to convert a file name to a more readable name
def format_name(filename):
    # Remove file extension if any
    name = os.path.splitext(filename)[0]
    # Replace underscores and hyphens with spaces
    name = name.replace('_', ' ').replace('-', ' ')
    # Capitalize each word
    return ' '.join(word.capitalize() for word in name.split())

# Function to process a single file
def process_file(file_path, output_name=None):
    filename = os.path.basename(file_path)
    
    # Skip if it's not a file or is a Python file or zip file
    if not os.path.isfile(file_path) or filename.endswith(('.py', '.zip', '.json')):
        return False
    
    print(f"Converting {filename}...")
    
    # Parse the wave table
    real_values, imag_values = parse_wave_table(file_path)
    
    if not real_values:
        print(f"  Warning: No real values found in {filename}")
        return False
    
    # Use provided output name or format the filename
    display_name = output_name or format_name(filename)
    
    # Create the new JSON structure
    wave_data = {
        "name": display_name,
        "description": f"Converted from {filename}",
        "real": real_values,
        "imag": imag_values
    }
    
    # Save to the output directory
    output_filename = output_name or filename
    if not output_filename.endswith('.json'):
        output_filename += '.json'
    
    output_path = os.path.join(output_dir, output_filename)
    with open(output_path, 'w') as f:
        json.dump(wave_data, f, indent=2)
    
    print(f"  Saved to {output_path}")
    return True

# Process files in the root directory
root_files = [f for f in os.listdir(source_dir) 
             if os.path.isfile(os.path.join(source_dir, f)) 
             and not f.startswith('.') 
             and not f.endswith(('.py', '.zip'))]

root_converted = 0
for filename in root_files:
    file_path = os.path.join(source_dir, filename)
    if process_file(file_path):
        root_converted += 1

print(f"Converted {root_converted} files from root directory")

# Process files in the general-midi directory
gm_dir = os.path.join(source_dir, 'general-midi')
if os.path.exists(gm_dir) and os.path.isdir(gm_dir):
    gm_files = [f for f in os.listdir(gm_dir) 
               if os.path.isfile(os.path.join(gm_dir, f)) 
               and not f.startswith('.')]
    
    gm_converted = 0
    for filename in gm_files:
        file_path = os.path.join(gm_dir, filename)
        # Format the output filename to match GM numbering convention
        # For simplicity, we'll just use the original name
        output_name = filename + '.json'
        if process_file(file_path, output_name):
            gm_converted += 1
    
    print(f"Converted {gm_converted} files from general-midi directory")

print("Conversion complete!")

# Create a manifest file
manifest = {
    "description": "Wave tables converted to standard JSON format",
    "version": "1.0",
    "files": [f for f in os.listdir(output_dir) if f.endswith('.json') and f != 'manifest.json']
}

with open(os.path.join(output_dir, 'manifest.json'), 'w') as f:
    json.dump(manifest, f, indent=2)

print(f"Created manifest.json with {len(manifest['files'])} entries")