import os
import json
import pandas as pd
import numpy as np
import neurokit2 as nk

# Create data folder
os.makedirs('data', exist_ok=True)
print("Generating mock heart data...")

# 1. HOSPITAL DATA (Clean, 100 Hz, CSV)
ecg_clean = nk.ecg_simulate(duration=10, sampling_rate=100, heart_rate=70)
time_clean = np.linspace(0, 10, len(ecg_clean))
df_hospital = pd.DataFrame({'timestamp_ms': time_clean * 1000, 'ecg_mv': ecg_clean})
df_hospital.to_csv('data/hospital_clean.csv', index=False)
print("✅ Created Hospital Data: data/hospital_clean.csv")

# 2. SMARTWATCH DATA (Messy, 10 Hz, JSON)
ecg_messy = nk.ecg_simulate(duration=10, sampling_rate=10, heart_rate=70, noise=0.5)
time_messy = np.linspace(0, 10, len(ecg_messy))
watch_data = []
for t, v in zip(time_messy, ecg_messy):
    jittered_time = t + np.random.uniform(-0.05, 0.05) 
    watch_data.append({
        "time_sec": round(jittered_time, 3), 
        "heart_val": round(v * 0.5, 3),      
        "sensor_type": "AppleWatch_S8"
    })

with open('data/watch_messy.json', 'w') as f:
    json.dump(watch_data, f, indent=4)
print("✅ Created Smartwatch Data: data/watch_messy.json")
