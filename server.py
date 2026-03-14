import flwr as fl

print("🌐 Starting the Federated Central Hub (Master Server)...")
print("Waiting for BOTH the Hospital and the Watch to connect...\n")

# Define the Federated Averaging (FedAvg) strategy
strategy = fl.server.strategy.FedAvg(
    fraction_fit=1.0,  
    min_fit_clients=2,       # FORCES the server to wait for 2 clients to train
    min_available_clients=2, # FORCES the server to wait for 2 clients to connect
)

# Start the server on your local machine
fl.server.start_server(
    server_address="127.0.0.1:8080",
    config=fl.server.ServerConfig(num_rounds=2), 
    strategy=strategy,
)