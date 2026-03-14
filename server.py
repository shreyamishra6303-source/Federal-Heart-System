import flwr as fl

print("🌐 Starting the Federated Central Hub (Master Server)...")
print("Waiting for hospitals to connect...\n")

# Define the Federated Averaging (FedAvg) strategy
strategy = fl.server.strategy.FedAvg(
    fraction_fit=1.0,           # Train on 100% of connected clients
    min_fit_clients=1,          # Minimum number of clients needed to train
    min_available_clients=1,    # Minimum clients needed to start the network
)

# Start the server on your local machine
fl.server.start_server(
    server_address="127.0.0.1:8080",
    config=fl.server.ServerConfig(num_rounds=2), # We will run 2 communication rounds for the demo
    strategy=strategy,
)