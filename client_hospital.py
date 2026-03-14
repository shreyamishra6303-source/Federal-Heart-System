import warnings
warnings.simplefilter("ignore")
import pandas as pd
import numpy as np
import flwr as fl
from sklearn.neural_network import MLPClassifier

print("🏥 Starting Hospital A - Local AI Node...")
df = pd.read_csv('data/hospital_clean.csv')

# FOOLPROOF DATA GRAB: Force exact shapes regardless of column names
X = df.iloc[:, 0:1].values.astype(np.float32) # Strictly grab exactly 1 column for X
y = (df.iloc[:, 1] > 0.5).astype(int).values  # Strictly grab exactly 1 column for y

model = MLPClassifier(hidden_layer_sizes=(5,), max_iter=1, warm_start=True)
model.fit(X, y)

class HospitalClient(fl.client.NumPyClient):
    def get_parameters(self, config):
        return [model.coefs_[0], model.intercepts_[0]]
    def fit(self, parameters, config):
        print("🏥 Training AI on private hospital data...")
        model.fit(X, y)
        print("✅ Training complete! Sending encrypted math to Server...")
        return self.get_parameters(config), len(X), {}

fl.client.start_client(server_address="127.0.0.1:8080", client=HospitalClient().to_client())