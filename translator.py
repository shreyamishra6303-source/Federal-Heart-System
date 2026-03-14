import pandas as pd
import numpy as np
from scipy.interpolate import interp1d

def process_data():
    # Read the JSON file
    df = pd.read_json('data/watch_messy.json')
    
    # Extract time and heart_val arrays
    time = df['time_sec'].values
    heart_val = df['heart_val'].values
    
    # Sort by time to ensure it's strictly increasing
    sort_idx = np.argsort(time)
    time = time[sort_idx]
    heart_val = heart_val[sort_idx]
    
    # Create new time array at 1000Hz (interval of 0.001s)
    new_time = np.arange(time[0], time[-1], 0.001)
    
    # Cubic interpolation using Scipy
    cubic_interpolator = interp1d(time, heart_val, kind='cubic', bounds_error=False, fill_value="extrapolate")
    new_heart_val = cubic_interpolator(new_time)
    
    # Normalize values to be between 0 and 1
    min_val = np.min(new_heart_val)
    max_val = np.max(new_heart_val)
    
    if max_val > min_val:
        normalized_heart_val = (new_heart_val - min_val) / (max_val - min_val)
    else:
        normalized_heart_val = new_heart_val  # Avoid division by zero
    
    # Create output DataFrame
    output_df = pd.DataFrame({
        'time_sec': new_time,
        'heart_val': normalized_heart_val
    })
    
    # Save the output to a CSV file
    output_df.to_csv('data/watch_translated.csv', index=False)
    print(f"Successfully processed {len(df)} original points into {len(output_df)} points at 1000Hz.")
    print("Saved to data/watch_translated.csv")

if __name__ == "__main__":
    process_data()
