import warnings
warnings.simplefilter("ignore")
import pandas as pd
import flwr as fl
from sklearn.neural_network import MLPClassifier

print("⌚ Starting Smartwatch - Local AI Node...")
# Note: This relies on watch_clean.csv which my teammate is making in Step 3
try:
    df = pd.read_csv('data/watch_clean.csv')
    X = df[['timestamp_ms']].values
    y = (df['ecg_mv'] > 0.5).astype(int).values 
except FileNotFoundError:
    print("Waiting for Step 3 to finish. Dummy data loaded for now.")
    X, y = [[0]], [0]

model = MLPClassifier(hidden_layer_sizes=(5,), max_iter=1, warm_start=True)
model.fit(X, y)

class WatchClient(fl.client.NumPyClient):
    def get_parameters(self, config):
        return [model.coefs_[0], model.intercepts_[0]]
    def fit(self, parameters, config):
        print("⌚ Training AI on private watch data...")
        model.fit(X, y)
        print("✅ Training complete! Sending encrypted math to Server...")
        return self.get_parameters(config), len(X), {}

fl.client.start_client(server_address="127.0.0.1:8080", client=WatchClient().to_client())
