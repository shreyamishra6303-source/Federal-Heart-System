import warnings
warnings.simplefilter("ignore")
import pandas as pd
import numpy as np
import flwr as fl
import torch
import torch.nn as nn
import torch.optim as optim

print("🏥 Starting Hospital A - Local AI Node (FedProx + Privacy Enabled)...")

# 1. FOOLPROOF DATA LOADING
df = pd.read_csv('data/hospital_clean.csv')
# iloc ensures we grab the right data even if names change
X_data = df.iloc[:, 0:1].values
y_data = (df.iloc[:, 1] > 0.5).astype(int).values 

X = torch.tensor(X_data, dtype=torch.float32)
y = torch.tensor(y_data, dtype=torch.float32).view(-1, 1)

# 2. THE AI BRAIN
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
criterion = nn.BCELoss()

# 3. FEDERATED CLIENT WITH FEDPROX & NOISE
class HospitalClient(fl.client.NumPyClient):
    def get_parameters(self, config):
        # 🛡️ DIFFERENTIAL PRIVACY: Add noise to weights before sending
        noisy_params = []
        for param in model.parameters():
            p = param.detach().numpy()
            noise = np.random.normal(0, 0.01, p.shape) # Gaussian Noise
            noisy_params.append(p + noise)
        return noisy_params

    def set_parameters(self, parameters):
        for param, server_weight in zip(model.parameters(), parameters):
            # Force EVERY weight coming from the server to be a Float32
            param.data = torch.tensor(server_weight, dtype=torch.float32)

    def fit(self, parameters, config):
        print("🚀 Force-syncing types and training...")
        
        # 1. Update model with server weights (now forced to float32)
        self.set_parameters(parameters)
        
        # 2. Force the model and data to float32 one last time
        model.float()
        X_train = X.to(torch.float32)
        y_train = y.to(torch.float32)
        
        # 3. FedProx reference weights must also be float32
        global_weights = [torch.tensor(p, dtype=torch.float32) for p in parameters]
        
        optimizer = optim.SGD(model.parameters(), lr=0.01)
        mu = 0.1 
        
        for epoch in range(2):
            optimizer.zero_grad()
            outputs = model(X_train)
            loss = criterion(outputs, y_train)
            
            # FedProx penalty calculation
            proximal_term = 0.0
            for local_p, global_p in zip(model.parameters(), global_weights):
                proximal_term += ((local_p - global_p) ** 2).sum()
            loss += (mu / 2) * proximal_term 
            
            loss.backward()
            optimizer.step()
            
        print("✅ Training complete. Sending noisy weights back...")
        return self.get_parameters(config), len(X), {}
# Start the client
fl.client.start_client(server_address="127.0.0.1:8080", client=HospitalClient().to_client())