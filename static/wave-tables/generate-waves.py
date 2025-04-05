# --- generate_waves_v5.py ---
# Generates 128 individual JSON files for GM instruments
# AND a manifest.json file mapping GM instrument names to filenames,
# with entries ordered numerically (1-128).
import json
import os
import math
import sys # To check Python version
import numpy as np # Using numpy for random numbers

# --- Version Check ---
# Dictionary insertion order is guaranteed in Python 3.7+
# json.dump without sort_keys=True relies on this.
if sys.version_info < (3, 7):
    print("Warning: Python version is < 3.7. Dictionary insertion order may not be preserved in the manifest.")
    print("         The manifest keys will be instrument names, but their order might not be strictly numeric.")

# General MIDI Instrument Names (Program Numbers 1-128)
# [ ... GM INSTRUMENT DICTIONARY gm_instruments ... ] - Same as before
gm_instruments = {
    1: "Acoustic Grand Piano", 2: "Bright Acoustic Piano", 3: "Electric Grand Piano", 4: "Honky-tonk Piano",
    5: "Electric Piano 1", 6: "Electric Piano 2", 7: "Harpsichord", 8: "Clavinet",
    9: "Celesta", 10: "Glockenspiel", 11: "Music Box", 12: "Vibraphone",
    13: "Marimba", 14: "Xylophone", 15: "Tubular Bells", 16: "Dulcimer",
    17: "Drawbar Organ", 18: "Percussive Organ", 19: "Rock Organ", 20: "Church Organ",
    21: "Reed Organ", 22: "Accordion", 23: "Harmonica", 24: "Tango Accordion",
    25: "Acoustic Guitar (nylon)", 26: "Acoustic Guitar (steel)", 27: "Electric Guitar (jazz)", 28: "Electric Guitar (clean)",
    29: "Electric Guitar (muted)", 30: "Overdriven Guitar", 31: "Distortion Guitar", 32: "Guitar Harmonics",
    33: "Acoustic Bass", 34: "Electric Bass (finger)", 35: "Electric Bass (pick)", 36: "Fretless Bass",
    37: "Slap Bass 1", 38: "Slap Bass 2", 39: "Synth Bass 1", 40: "Synth Bass 2",
    41: "Violin", 42: "Viola", 43: "Cello", 44: "Contrabass",
    45: "Tremolo Strings", 46: "Pizzicato Strings", 47: "Orchestral Harp", 48: "Timpani",
    49: "String Ensemble 1", 50: "String Ensemble 2", 51: "Synth Strings 1", 52: "Synth Strings 2",
    53: "Choir Aahs", 54: "Voice Oohs", 55: "Synth Voice", 56: "Orchestra Hit",
    57: "Trumpet", 58: "Trombone", 59: "Tuba", 60: "Muted Trumpet",
    61: "French Horn", 62: "Brass Section", 63: "Synth Brass 1", 64: "Synth Brass 2",
    65: "Soprano Sax", 66: "Alto Sax", 67: "Tenor Sax", 68: "Baritone Sax",
    69: "Oboe", 70: "English Horn", 71: "Bassoon", 72: "Clarinet",
    73: "Piccolo", 74: "Flute", 75: "Recorder", 76: "Pan Flute",
    77: "Blown Bottle", 78: "Shakuhachi", 79: "Whistle", 80: "Ocarina",
    81: "Lead 1 (square)", 82: "Lead 2 (sawtooth)", 83: "Lead 3 (calliope)", 84: "Lead 4 (chiff)",
    85: "Lead 5 (charang)", 86: "Lead 6 (voice)", 87: "Lead 7 (fifths)", 88: "Lead 8 (bass + lead)",
    89: "Pad 1 (new age)", 90: "Pad 2 (warm)", 91: "Pad 3 (polysynth)", 92: "Pad 4 (choir)",
    93: "Pad 5 (bowed)", 94: "Pad 6 (metallic)", 95: "Pad 7 (halo)", 96: "Pad 8 (sweep)",
    97: "FX 1 (rain)", 98: "FX 2 (soundtrack)", 99: "FX 3 (crystal)", 100: "FX 4 (atmosphere)",
    101: "FX 5 (brightness)", 102: "FX 6 (goblins)", 103: "FX 7 (echoes)", 104: "FX 8 (sci-fi)",
    105: "Sitar", 106: "Banjo", 107: "Shamisen", 108: "Koto",
    109: "Kalimba", 110: "Bag pipe", 111: "Fiddle", 112: "Shanai",
    113: "Tinkle Bell", 114: "Agogo", 115: "Steel Drums", 116: "Woodblock",
    117: "Taiko Drum", 118: "Melodic Tom", 119: "Synth Drum", 120: "Reverse Cymbal",
    121: "Guitar Fret Noise", 122: "Breath Noise", 123: "Seashore", 124: "Bird Tweet",
    125: "Telephone Ring", 126: "Helicopter", 127: "Applause", 128: "Gunshot"
}

# Create a reverse mapping for convenience if needed later (Number -> Name)
# gm_number_to_name = {v: k for k, v in gm_instruments.items()} # Optional

# --- Waveform Generation Functions ---
# [ ... ALL WAVEFORM FUNCTIONS create_sine, create_square, etc ... ] - Same as before
def create_sine(n_harmonics):
    real = [0.0] * max(2, n_harmonics); imag = [0.0] * max(2, n_harmonics)
    if n_harmonics > 1: imag[1] = 1.0
    return real, imag
def create_square(n_harmonics, decay=0.8):
    n=max(2, n_harmonics); real=[0.0]*n; imag=[0.0]*n; amp=1.0
    for k in range(1, n):
        if k%2!=0: imag[k]=amp/(k+1e-9); amp*=decay
    if n>1 and abs(imag[1])>1e-9: imag=[x*(1.0/imag[1]) for x in imag]
    real[0]=0.0; imag[0]=0.0; return real, imag
def create_sawtooth(n_harmonics, decay=0.8):
    n=max(2, n_harmonics); real=[0.0]*n; imag=[0.0]*n; amp=1.0
    for k in range(1, n): imag[k]=amp/(k+1e-9); amp*=decay
    if n>1 and abs(imag[1])>1e-9: imag=[x*(1.0/imag[1]) for x in imag]
    real[0]=0.0; imag[0]=0.0; return real, imag
def create_triangle(n_harmonics, decay=0.9):
    n=max(2, n_harmonics); real=[0.0]*n; imag=[0.0]*n; amp=1.0; sign=1.0
    for k in range(1, n):
        if k%2!=0: imag[k]=sign*amp/(k*k+1e-9); sign*=-1; amp*=decay
    if n>1 and abs(imag[1])>1e-9: imag=[x*(1.0/abs(imag[1])) for x in imag]
    real[0]=0.0; imag[0]=0.0; return real, imag
def create_rich_mix(n_harmonics, odd_bias=1.5, decay=0.7):
    n=max(2, n_harmonics); real=[0.0]*n; imag=[0.0]*n; amp=1.0
    for k in range(1, n):
        h_amp=amp/(k+1e-9); phase=np.random.uniform(0, np.pi/4); mod=np.random.uniform(0.8, 1.2)
        if k%2!=0: h_amp*=odd_bias
        real[k]=h_amp*mod*math.cos(phase); imag[k]=h_amp*mod*math.sin(phase); amp*=decay
    if n > 1: mag1=math.sqrt(real[1]**2 + imag[1]**2)
    if mag1 > 1e-9: norm=1.0/mag1; real=[x*norm for x in real]; imag=[x*norm for x in imag]
    imag[0]=0.0; real[0]=0.0; return real, imag
def create_bell(n_harmonics, peaks=[1, 2.7, 5.4, 9.2], decay=0.6):
    n=max(2, n_harmonics); real=[0.0]*n; imag=[0.0]*n; amp=1.0; max_sq=0
    p_indices=[int(round(p)) for p in peaks]
    for idx in p_indices:
        if 0 < idx < n:
             phase=np.random.uniform(0, np.pi/2); r_amp=amp*math.cos(phase); i_amp=amp*math.sin(phase)
             real[idx]=r_amp; imag[idx]=i_amp; mag_sq=r_amp**2+i_amp**2
             if mag_sq > max_sq: max_sq=mag_sq
             amp*=decay
    imag[0]=0.0; real[0]=0.0; return real, imag
def create_noise_approx(n_harmonics):
    n=max(2, n_harmonics); real=[0.0]*n; imag=[0.0]*n
    for k in range(1, n): decay=1.0/math.sqrt(k+1e-9); real[k]=np.random.uniform(-0.5,0.5)*decay; imag[k]=np.random.uniform(-0.5,0.5)*decay
    imag[0]=0.0; real[0]=0.0; return real, imag

# --- Main Generation ---
output_dir = "gm_periodic_waves_v5" # New directory name
os.makedirs(output_dir, exist_ok=True)

num_harmonics = 32 # Number of harmonics

manifest_data_by_name = {} # Dictionary for manifest (Name: filename)
files_generated_count = 0
files_error_count = 0

print(f"Generating 128 instrument waves with {num_harmonics} harmonics into '{output_dir}'...")
print("Manifest keys will be instrument names, ordered numerically (1-128).")

# --- Loop through all 128 instruments ---
for i in range(1, 129):
    instrument_name = gm_instruments.get(i)
    if not instrument_name:
        print(f"!!! Skipping number {i} - Name not found in gm_instruments dictionary. !!!")
        files_error_count += 1
        continue

    # Sanitize name for filename
    safe_name = instrument_name.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_").replace("+", "plus")
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')

    filename = f"{i:03d}_{safe_name}.json" # Keep number in filename
    filepath = os.path.join(output_dir, filename)

    # Add mapping using NAME as key (insertion order maintained in loop)
    manifest_data_by_name[instrument_name] = filename

    # Initialize real/imag lists
    real = [0.0] * num_harmonics
    imag = [0.0] * num_harmonics

    # --- Waveform Assignment Logic ---
    # [ ... EXTENSIVE IF/ELIF BLOCK TO ASSIGN real, imag ... ] - Same as before
    if 1 <= i <= 8: # Pianos, EPs, Harpsi, Clav
        if i == 7 or i == 8: real, imag = create_square(num_harmonics, decay=0.6)
        elif i == 5 or i == 6:
             real, imag = create_triangle(num_harmonics, decay=0.7)
             if num_harmonics > 1 : imag[1] *= 0.7
             if num_harmonics > 2: imag[2] = 0.4
        else: real, imag = create_rich_mix(num_harmonics, odd_bias=1.2, decay=0.75)
    elif 9 <= i <= 16: # Chromatic Percussion
        if i == 9 or i == 11: real, imag = create_bell(num_harmonics, peaks=[1, 3.1, 5.8], decay=0.5)
        elif i == 10 or i == 14: real, imag = create_bell(num_harmonics, peaks=[1, 4.1, 7.2, 11.5], decay=0.6)
        elif i == 12:
             real, imag = create_bell(num_harmonics, peaks=[1, 2.9, 6.0], decay=0.4)
             if num_harmonics > 1: mag1 = math.sqrt(real[1]**2 + imag[1]**2);
             if mag1 > 1e-9: norm = 1.0/mag1; real = [x*norm for x in real]; imag = [x*norm for x in imag]
        elif i == 15: real, imag = create_bell(num_harmonics, peaks=[1, 2.3, 3.7, 5.1, 6.8, 9.0], decay=0.7)
        else:
             real, imag = create_triangle(num_harmonics, decay=0.6)
             if num_harmonics > 1 : imag[1] *= 0.8
             if num_harmonics > 2: imag[2] = 0.3
    elif 17 <= i <= 24: # Organs, Accordions
        if i == 17:
             real, imag = create_sine(num_harmonics)
             if num_harmonics > 8: imag[2]=0.5; imag[3]=0.3; imag[4]=0.4; imag[6]=0.2; imag[8]=0.25
        elif i == 18 or i == 19: real, imag = create_square(num_harmonics, decay=0.7)
        elif i == 20 or i == 21: real, imag = create_rich_mix(num_harmonics, odd_bias=1.1, decay=0.6)
        else: real, imag = create_sawtooth(num_harmonics, decay=0.75)
    elif 25 <= i <= 32: # Guitars
        if i == 25: real, imag = create_triangle(num_harmonics, decay=0.6)
        elif i == 26 or i == 28: real, imag = create_sawtooth(num_harmonics, decay=0.65)
        elif i == 27:
             real, imag = create_triangle(num_harmonics, decay=0.5)
             if num_harmonics > 1 : imag[1] *= 0.6
        elif i == 29:
            real, imag = create_square(num_harmonics, decay=0.5)
            if num_harmonics > 1 : imag = [x*0.5 for x in imag]
        elif i == 30 or i == 31: real, imag = create_square(num_harmonics, decay=0.8)
        else:
            real, imag = create_sine(num_harmonics)
            if num_harmonics > 1: imag[1] = 0
            if num_harmonics > 4: imag[4] = 1.0
    elif 33 <= i <= 40: # Bass
        if i == 33 or i == 36:
            real, imag = create_sine(num_harmonics)
            if num_harmonics > 3: imag[2] = 0.4; imag[3]=0.2
        elif i == 34 or i == 35: real, imag = create_sawtooth(num_harmonics, decay=0.5)
        elif i == 37 or i == 38: real, imag = create_square(num_harmonics, decay=0.6)
        else: real, imag = create_square(num_harmonics, decay=0.7) if i == 39 else create_sawtooth(num_harmonics, decay=0.6)
    elif 41 <= i <= 48: # Strings, Harp, Timpani
        if i == 46: real, imag = create_sawtooth(num_harmonics, decay=0.4)
        elif i == 47: real, imag = create_triangle(num_harmonics, decay=0.5)
        elif i == 48:
            real, imag = create_sine(num_harmonics)
            if num_harmonics > 1: imag[1] = 0.8
            if num_harmonics > 3: imag[2] = 0.5; imag[3] = 0.6
        elif i == 45: real, imag = create_sawtooth(num_harmonics, decay=0.7)
        else: real, imag = create_sawtooth(num_harmonics, decay=0.7)
    elif 49 <= i <= 56: # Ensemble, Choir, Voice, Hit
        if i == 53 or i == 54:
             real_b, imag_b = create_triangle(num_harmonics, decay=0.6); real, imag = list(real_b), list(imag_b)
             norm = 1.0;
             if num_harmonics>1 and abs(imag[1])>1e-9: norm = abs(imag[1])
             for k in range(3,7):
                 if k<num_harmonics: imag[k]*=1.5
             for k in range(8,12):
                 if k<num_harmonics: imag[k]*=1.2
             if num_harmonics>1 and abs(imag[1])>1e-9 and norm>1e-9:
                 curr = abs(imag[1]); renorm = norm/curr; imag = [x*renorm for x in imag]
        elif i == 55: real, imag = create_triangle(num_harmonics, decay=0.7)
        elif i == 56: real, imag = create_rich_mix(num_harmonics, odd_bias=1.0, decay=0.5)
        else: real, imag = create_rich_mix(num_harmonics, odd_bias=1.1, decay=0.65)
    elif 57 <= i <= 64: # Brass
        if i == 60: real, imag = create_square(num_harmonics, decay=0.5)
        elif i == 61: real, imag = create_sawtooth(num_harmonics, decay=0.7)
        elif i == 59: real, imag = create_sawtooth(num_harmonics, decay=0.6)
        else: real, imag = create_sawtooth(num_harmonics, decay=0.8) if i not in [63, 64] else create_square(num_harmonics, decay=0.75)
    elif 65 <= i <= 72: # Reed
        if i == 72: real, imag = create_square(num_harmonics, decay=0.7)
        else: real, imag = create_sawtooth(num_harmonics, decay=0.75)
    elif 73 <= i <= 80: # Pipe
        if i in [74, 75, 77, 80]:
             real, imag = create_sine(num_harmonics)
             if num_harmonics > 3: imag[2]=0.3; imag[3]=0.15
        elif i in [73, 79]:
             real, imag = create_sine(num_harmonics)
             if num_harmonics > 5: imag[2]=0.1; imag[3]=0.05; imag[5]=0.15
        else:
             r_s, i_s = create_sine(num_harmonics); r_n, i_n = create_noise_approx(num_harmonics)
             real = [rs*0.7+rn*0.3 for rs,rn in zip(r_s, r_n)]; imag = [is_*0.7+in_*0.3 for is_,in_ in zip(i_s, i_n)]
             if num_harmonics > 1: mag1 = math.sqrt(real[1]**2+imag[1]**2)
             if mag1 > 1e-9: norm = 1.0/mag1; real=[x*norm for x in real]; imag=[x*norm for x in imag]
    elif 81 <= i <= 88: # Synth Lead
        if i == 81: real, imag = create_square(num_harmonics, decay=0.8)
        elif i == 82: real, imag = create_sawtooth(num_harmonics, decay=0.8)
        else: real, imag = create_rich_mix(num_harmonics, odd_bias=1.3, decay=0.7)
    elif 89 <= i <= 96: # Synth Pad
         if i == 90: real, imag = create_triangle(num_harmonics, decay=0.4)
         elif i == 94: real, imag = create_bell(num_harmonics, peaks=[1, 3.8, 6.1, 10.5], decay=0.5)
         else: real, imag = create_rich_mix(num_harmonics, odd_bias=1.0, decay=0.5)
    elif 97 <= i <= 104: # Synth Effects
        if i in [99, 101]: real, imag = create_bell(num_harmonics, peaks=[1, 5.2, 9.8, 15.1], decay=0.6)
        elif i in [97, 100, 104]: real, imag = create_noise_approx(num_harmonics)
        else: real, imag = create_rich_mix(num_harmonics, odd_bias=np.random.uniform(0.5, 1.5), decay=np.random.uniform(0.5, 0.8))
    elif 105 <= i <= 112: # Ethnic
        if i in [105, 107, 108]: real, imag = create_sawtooth(num_harmonics, decay=0.6)
        elif i == 106: real, imag = create_sawtooth(num_harmonics, decay=0.75)
        elif i == 109: real, imag = create_bell(num_harmonics, peaks=[1, 3.5, 5.9], decay=0.5)
        elif i == 110:
             r_s, i_s = create_sawtooth(num_harmonics, decay=0.8); r_q, i_q = create_square(num_harmonics, decay=0.8)
             real = [rs*0.6+rq*0.4 for rs,rq in zip(r_s, r_q)]; imag = [is_*0.6+iq*0.4 for is_,iq in zip(i_s, i_q)]
             if num_harmonics > 1: mag1 = math.sqrt(real[1]**2+imag[1]**2)
             if mag1 > 1e-9: norm = 1.0/mag1; real=[x*norm for x in real]; imag=[x*norm for x in imag]
        elif i == 111: real, imag = create_sawtooth(num_harmonics, decay=0.75)
        else: real, imag = create_sawtooth(num_harmonics, decay=0.8)
    elif 113 <= i <= 120: # Percussive
        if i == 113:
            real, imag = create_sine(num_harmonics)
            if num_harmonics > 1: imag[1] = 0
            if num_harmonics > 8: imag[8] = 1.0
        elif i == 114: real, imag = create_bell(num_harmonics, peaks=[1, 1.8], decay=0.4)
        elif i == 115: real, imag = create_bell(num_harmonics, peaks=[1, 1.6, 2.9, 4.1], decay=0.6)
        elif i == 116: real, imag = create_square(num_harmonics, decay=0.3)
        elif i == 117 or i == 118:
             real, imag = create_sine(num_harmonics)
             if num_harmonics > 1: imag[1] = 0.7
             if num_harmonics > 3: imag[2]=0.5; imag[3]=0.4
        elif i == 119: real, imag = create_triangle(num_harmonics, decay=0.5)
        else: real, imag = create_noise_approx(num_harmonics)
    elif 121 <= i <= 128: # Sound Effects
        if i in [124, 125]:
             real, imag = create_sine(num_harmonics)
             if i == 124 and num_harmonics > 7: imag[7] = 0.5
        else: real, imag = create_noise_approx(num_harmonics)
    # --- End Waveform Assignment ---

    # Try to write the INDIVIDUAL instrument JSON file
    try:
        # Prepare data
        real_list = [float(x) for x in real]; imag_list = [float(x) for x in imag]
        if len(real_list) != num_harmonics: real_list = (real_list + [0.0] * num_harmonics)[:num_harmonics]
        if len(imag_list) != num_harmonics: imag_list = (imag_list + [0.0] * num_harmonics)[:num_harmonics]
        real_list[0] = 0.0; imag_list[0] = 0.0

        instrument_data = {
            "name": instrument_name, "gm_number": i,
            "description": "Approximate PeriodicWave data...", # Truncated description
            "real": real_list, "imag": imag_list
        }
        with open(filepath, 'w') as f:
            json.dump(instrument_data, f, indent=2)
        files_generated_count += 1
    except Exception as e:
        print(f"--- ERROR writing {filename} (GM {i}) ---\n  Error: {e}\n----------------------------")
        files_error_count += 1
# --- End of Loop ---

# --- Generate the Manifest File using NAME keys, preserving INSERTION order ---
manifest_filename = "manifest.json"
manifest_filepath = os.path.join(output_dir, manifest_filename)

print("-" * 20)
print(f"Attempting to write manifest file: {manifest_filepath}")
try:
    with open(manifest_filepath, 'w') as f:
        # --->>> Dump WITHOUT sort_keys=True to preserve insertion order <<<---
        json.dump(manifest_data_by_name, f, indent=2, sort_keys=False)
    print(f"Successfully generated manifest file: {manifest_filename}")
    print("  (Order should reflect GM numbers 1-128 if Python >= 3.7)")
except Exception as e:
    print(f"ERROR writing manifest file {manifest_filename}: {e}")
    files_error_count += 1

# --- Final Summary ---
# [ ... SUMMARY PRINT STATEMENTS ... ] - Same as before
print("\n--- Generation Summary ---")
print(f"Attempted to generate 128 instrument files.")
print(f"Successfully generated: {files_generated_count} files.")
print(f"Encountered errors for: {files_error_count} files (check above, includes manifest if failed).")
print(f"Manifest file generated: {'Yes' if os.path.exists(manifest_filepath) else 'No'}")
print(f"Manifest keys are instrument NAMES, ordered numerically by GM number.")
print(f"Output directory: '{output_dir}'")

if files_generated_count == 128 and os.path.exists(manifest_filepath):
     print("\nAll 128 instrument files and the manifest generated successfully.")
else:
     print("\nReview the output directory and any error messages above.")

print("\nNOTE: The numeric ordering in manifest.json relies on Python 3.7+ dictionary")
print("      insertion order preservation and the JSON library respecting it.")