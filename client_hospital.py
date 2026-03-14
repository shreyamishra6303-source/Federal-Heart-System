import warnings
warnings.simplefilter("ignore")
import pandas as pd
import numpy as np
import flwr as fl
import torch
import torch.nn as nn
import torch.optim as optim

print("🏥 Starting Hospital A - Local AI Node...")

# 1. Load our generated clinical data
df = pd.read_csv('data/hospital_clean.csv')
X_data = df[['ecg_voltage']].values
y_data = (df['ecg_voltage'] > 0.5).astype(int).values # Dummy labels (0 for normal, 1 for anomaly)

X = torch.tensor(X_data, dtype=torch.float32)
y = torch.tensor(y_data, dtype=torch.float32).view(-1, 1)

# 2. Build the PyTorch Brain
class HeartModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.layer1 = nn.Linear(1, 5)
        self.layer2 = nn.Linear(5, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = torch.relu(self.layer1(x))
        x = self.sigmoid(self.layer2(x))
        return x

model = HeartModel()
criterion = nn.BCELoss() # Calculates the AI's errors

# 3. The Federated Hub Connection
class HospitalClient(fl.client.NumPyClient):
    def get_parameters(self, config):
        # 🟢 DIFFERENTIAL PRIVACY (The Blurring) 🟢
        # We add mathematical static right before the notes leave the hospital
        noisy_weights = []
        for param in model.parameters():
            weight_np = param.detach().numpy()
            noise = np.random.normal(0, 0.01, weight_np.shape) 
            noisy_weights.append(weight_np + noise)
        return noisy_weights

    def set_parameters(self, parameters):
        for param, server_weight in zip(model.parameters(), parameters):
            param.data = torch.tensor(server_weight)

    def fit(self, parameters, config):
        print("🏥 Downloading Master AI... Training on local data...")
        self.set_parameters(parameters)
        
        # Save a copy of the master weights to use for our rubber band
        global_weights = [torch.tensor(p) for p in parameters]
        optimizer = optim.SGD(model.parameters(), lr=0.01)
        mu = 0.1 # This is the stiffness of the FedProx rubber band
        
        # Train for 2 quick epochs
        for epoch in range(2):
            optimizer.zero_grad()
            outputs = model(X)
            loss = criterion(outputs, y)
            
            # 🟢 FEDPROX (The Rubber Band) 🟢
            # Penalize the AI if it changes the master weights too much
            proximal_term = 0.0
            for local_param, global_param in zip(model.parameters(), global_weights):
                proximal_term += ((local_param - global_param) ** 2).sum()
            
            loss += (mu / 2) * proximal_term 
            
            loss.backward()
            optimizer.step()
            
        print("✅ Training complete! Blurring notes with Differential Privacy and sending to Server...")
        return self.get_parameters(config), len(X), {}

# Connect to the local hackathon server
fl.client.start_client(server_address="127.0.0.1:8080", client=HospitalClient().to_client())