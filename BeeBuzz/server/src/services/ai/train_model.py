import os
import pickle
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

# Generate realistic logistics dataset
np.random.seed(42)
num_samples = 5000

distance = np.random.uniform(50, 1500, num_samples) # in km
weight = np.random.uniform(100, 5000, num_samples) # in kg

truck_types = ['Pickup', 'Mini Truck', 'Lorry', 'Container', 'Flatbed']
truck_choice = np.random.choice(truck_types, num_samples)

cargo_types = ['Electronics', 'Furniture', 'Clothing', 'Food & Beverages', 'Machinery', 'Other']
cargo_choice = np.random.choice(cargo_types, num_samples)

# Simulated marketplace factors
fuel_index = np.random.uniform(85, 105, num_samples) # diesel price per liter
weather_premium = np.random.choice([1.0, 1.08, 1.15], num_samples, p=[0.7, 0.2, 0.1]) # Clear, Rain, Storm
demand_premium = np.random.choice([0.9, 1.0, 1.15], num_samples, p=[0.2, 0.6, 0.2]) # Low, Normal, High demand routes

# Baseline pricing structure
truck_rates = {'Pickup': 15, 'Mini Truck': 18, 'Lorry': 25, 'Container': 35, 'Flatbed': 40}
cargo_multipliers = {'Electronics': 1.05, 'Furniture': 1.0, 'Clothing': 0.95, 'Food & Beverages': 1.0, 'Machinery': 1.12, 'Other': 1.0}

price = []
for i in range(num_samples):
    base_rate = truck_rates[truck_choice[i]]
    cargo_mult = cargo_multipliers[cargo_choice[i]]
    
    # Calculate operational costs
    fuel_cost = distance[i] * 8 * (fuel_index[i]/95.0)
    tolls = distance[i] * 3
    base_charge = distance[i] * base_rate
    
    # Cargo weight capacity premium
    weight_surge = 1.0
    if weight[i] > 500:
        weight_surge += 0.10
    if weight[i] > 1000:
        weight_surge += 0.15
    if weight[i] > 3000:
        weight_surge += 0.10
        
    final_rate = (base_charge * weight_surge * cargo_mult * weather_premium[i] * demand_premium[i]) + fuel_cost + tolls
    
    # Add random spot market variation (Gaussian noise)
    noise = np.random.normal(0, 0.02 * final_rate)
    price.append(max(800, round(final_rate + noise)))

df = pd.DataFrame({
    'distance_km': distance,
    'cargo_weight_kg': weight,
    'truck_type': truck_choice,
    'cargo_type': cargo_choice,
    'fuel_index': fuel_index,
    'weather_premium': weather_premium,
    'demand_premium': demand_premium,
    'price': price
})

# Preprocessing: One-hot encode categorical features
df_encoded = pd.get_dummies(df, columns=['truck_type', 'cargo_type'], dtype=int)

# Extract features and targets
X = df_encoded.drop(columns=['price'])
y = df_encoded['price']

# Save column layouts to ensure prediction feature alignment
feature_cols = X.columns.tolist()
dir_path = os.path.dirname(os.path.abspath(__file__))
os.makedirs(dir_path, exist_ok=True)
with open(os.path.join(dir_path, 'feature_columns.json'), 'w') as f:
    json.dump(feature_cols, f)

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Model Training
model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
model.fit(X_train, y_train)

# Evaluation
y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)

print(f"--- MODEL TRAINING COMPLETE ---")
print(f"Dataset Size: {num_samples} samples")
print(f"R2 Score: {r2 * 100:.2f}%")
print(f"Mean Absolute Error: Rs {mae:.2f}")

# Save the trained model
with open(os.path.join(dir_path, 'pricing_model.pkl'), 'wb') as f:
    pickle.dump(model, f)
