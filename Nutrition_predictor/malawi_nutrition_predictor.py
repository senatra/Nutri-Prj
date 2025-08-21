import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

class NutritionPredictor:
    """Simplified nutrition predictor with core ML functionality"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.is_trained = False
        self.districts_data = None
        
    def load_data(self):
        """Load and process the CSV data files"""
        print("📊 Loading nutrition data from CSV files...")
        
        try:
            # Load the actual CSV files
            vulnerability_df = pd.read_csv('composite-vulnerability.csv')
            consumption_df = pd.read_csv('consumption-adequacy-of.csv') 
            nutrients_df = pd.read_csv('nutrients-adequacy.csv')
            
            print(f"✅ Loaded vulnerability data: {len(vulnerability_df)} records")
            print(f"✅ Loaded consumption data: {len(consumption_df)} records")
            print(f"✅ Loaded nutrients data: {len(nutrients_df)} records")
            
            # Extract unique districts from consumption data
            consumption_clean = consumption_df.drop_duplicates(
                subset=['Average consumption adequacy of Kilocalories (kcal) (ADM2_EN)']
            )
            
            # Get all unique district names from the consumption data
            district_names = consumption_clean['Average consumption adequacy of Kilocalories (kcal) (ADM2_EN)'].tolist()
            
            # Remove city entries to avoid duplicates (keep main districts)
            main_districts = []
            for district in district_names:
                if 'City' not in district:
                    main_districts.append(district)
            
            print(f"✅ Found {len(main_districts)} main districts")
            
            # Create region mapping based on known Malawi geography
            region_mapping = {
                'Balaka': 'Southern', 'Blantyre': 'Southern', 'Chikwawa': 'Southern',
                'Chiradzulu': 'Southern', 'Machinga': 'Southern', 'Mangochi': 'Southern',
                'Mulanje': 'Southern', 'Mwanza': 'Southern', 'Neno': 'Southern',
                'Nsanje': 'Southern', 'Phalombe': 'Southern', 'Thyolo': 'Southern',
                'Zomba': 'Southern', 'Dedza': 'Central', 'Dowa': 'Central',
                'Kasungu': 'Central', 'Lilongwe': 'Central', 'Mchinji': 'Central',
                'Nkhotakota': 'Central', 'Ntcheu': 'Central', 'Ntchisi': 'Central',
                'Salima': 'Central', 'Chitipa': 'Northern', 'Karonga': 'Northern',
                'Likoma': 'Northern', 'Mzimba': 'Northern', 'Nkhata Bay': 'Northern',
                'Rumphi': 'Northern'
            }
            
            # Create population estimates (approximate) 

            # This is only mock data
            population_mapping = {
                'Balaka': 380000, 'Blantyre': 1200000, 'Chikwawa': 500000,
                'Chiradzulu': 320000, 'Chitipa': 230000, 'Dedza': 620000,
                'Dowa': 700000, 'Karonga': 350000, 'Kasungu': 800000,
                'Likoma': 15000, 'Lilongwe': 2400000, 'Machinga': 600000,
                'Mangochi': 900000, 'Mchinji': 500000, 'Mulanje': 540000,
                'Mwanza': 110000, 'Mzimba': 900000, 'Neno': 140000,
                'Nkhata Bay': 250000, 'Nkhotakota': 380000, 'Nsanje': 280000,
                'Ntcheu': 560000, 'Ntchisi': 280000, 'Phalombe': 350000,
                'Rumphi': 200000, 'Salima': 350000, 'Thyolo': 650000, 'Zomba': 750000
            }
            
            # Build the master dataset using actual CSV data
            data_rows = []
            
            for i, district in enumerate(main_districts):
                row = {
                    'district': district,
                    'region': region_mapping.get(district, 'Central'),  # Default to Central if not found
                    'population': population_mapping.get(district, 500000),  # Default population
                }
                
                # Add vulnerability data (map by category index)
                if i < len(vulnerability_df):
                    row['vulnerability'] = vulnerability_df.iloc[i]['Composite Vulnerability Index']
                else:
                    # Use mean if we run out of vulnerability data points
                    row['vulnerability'] = vulnerability_df['Composite Vulnerability Index'].mean()
                
                # Add consumption adequacy from actual data
                district_consumption = consumption_clean[
                    consumption_clean['Average consumption adequacy of Kilocalories (kcal) (ADM2_EN)'] == district
                ]
                
                if not district_consumption.empty:
                    row['kcal_adequacy'] = district_consumption['Average consumption adequacy of Kilocalories (kcal) (value)'].iloc[0]
                else:
                    # Fallback to overall mean
                    row['kcal_adequacy'] = consumption_df['Average consumption adequacy of Kilocalories (kcal) (value)'].mean()
                
                data_rows.append(row)
            
            # Create the main DataFrame
            df = pd.DataFrame(data_rows)
            
            # Add actual nutrient adequacy data from the nutrients CSV
            # Parse the nutrients data and add to each district
            nutrient_data = {}
            
            for _, row in nutrients_df.iterrows():
                nutrient_name = row['Category'].lower()
                nutrient_value = row['Consumption adequacy of nutrients']
                
                # Clean nutrient names
                if 'calcium' in nutrient_name:
                    nutrient_data['calcium'] = nutrient_value
                elif 'folate' in nutrient_name:
                    nutrient_data['folate'] = nutrient_value
                elif 'iron' in nutrient_name:
                    nutrient_data['iron'] = nutrient_value
                elif 'niacin' in nutrient_name:
                    nutrient_data['niacin'] = nutrient_value
                elif 'proteins' in nutrient_name:
                    nutrient_data['proteins'] = nutrient_value
                elif 'riboflavin' in nutrient_name:
                    nutrient_data['riboflavin'] = nutrient_value
                elif 'thiamin' in nutrient_name:
                    nutrient_data['thiamin'] = nutrient_value
                elif 'vitamin a' in nutrient_name:
                    nutrient_data['vitamin_a'] = nutrient_value
                elif 'vitamin b12' in nutrient_name:
                    nutrient_data['vitamin_b12'] = nutrient_value
                elif 'vitamin b6' in nutrient_name:
                    nutrient_data['vitamin_b6'] = nutrient_value
                elif 'vitamin c' in nutrient_name:
                    nutrient_data['vitamin_c'] = nutrient_value
                elif 'zinc' in nutrient_name:
                    nutrient_data['zinc'] = nutrient_value
            
            print(f"✅ Extracted {len(nutrient_data)} nutrients: {list(nutrient_data.keys())}")
            
            # Add nutrient adequacy to each district with some realistic variation
            np.random.seed(42)  # For reproducible results
            
            for nutrient_name, national_avg in nutrient_data.items():
                # Add district-level variation (±10% of national average)
                variation = np.random.normal(0, national_avg * 0.1, len(df))
                df[f'{nutrient_name}_adequacy'] = np.clip(national_avg + variation, 5, 100)
            
            self.districts_data = df
            
            print(f"✅ Master dataset created: {len(df)} districts with {len(df.columns)} features")
            print(f"✅ Nutrients included: {len(nutrient_data)} types")
            
            # Print sample of the data
            print("\n📋 Sample of loaded data:")
            print(df[['district', 'region', 'vulnerability', 'kcal_adequacy']].head())
            
            return df
            
        except FileNotFoundError as e:
            print(f"❌ Error loading data files: {e}")
            print("Make sure these CSV files are in the same directory as this script:")
            print("  - composite-vulnerability.csv")
            print("  - consumption-adequacy-of.csv")
            print("  - nutrients-adequacy.csv")
            return None
        
        except Exception as e:
            print(f"❌ Error processing data: {e}")
            return None
    
    def create_features(self, df):
        """Engineer features for ML model using actual CSV data"""
        print("🔧 Creating features from actual data...")
        
        # Encode regions
        le = LabelEncoder()
        df['region_encoded'] = le.fit_transform(df['region'])
        
        # Population features
        df['population_log'] = np.log(df['population'])
        df['is_urban'] = (df['population'] > 500000).astype(int)
        
        # Nutrition features from actual data
        nutrient_cols = [col for col in df.columns if col.endswith('_adequacy') and col != 'kcal_adequacy']
        
        print(f"📋 Working with {len(nutrient_cols)} nutrients: {[col.replace('_adequacy', '') for col in nutrient_cols[:5]]}...")
        
        df['avg_nutrient_adequacy'] = df[nutrient_cols].mean(axis=1)
        df['nutrient_deficiency_count'] = (df[nutrient_cols] < 60).sum(axis=1)
        
        # Specific critical nutrient indicators (based on your data showing severe deficiencies)
        if 'vitamin_b12_adequacy' in df.columns:
            df['critical_b12_deficiency'] = (df['vitamin_b12_adequacy'] < 30).astype(int)  # B12 very low at 22.9%
        
        if 'riboflavin_adequacy' in df.columns:
            df['riboflavin_deficiency'] = (df['riboflavin_adequacy'] < 60).astype(int)  # Riboflavin at 52.47%
        
        if 'vitamin_a_adequacy' in df.columns:
            df['vitamin_a_deficiency'] = (df['vitamin_a_adequacy'] < 60).astype(int)  # Vitamin A at 54.48%
        
        # Vulnerability categories based on actual data distribution
        # Use fixed thresholds instead of percentiles to avoid duplicate edge errors
        df['high_vulnerability'] = (df['vulnerability'] > 0.7).astype(int)
        df['medium_vulnerability'] = ((df['vulnerability'] > 0.4) & (df['vulnerability'] <= 0.7)).astype(int)
        df['low_vulnerability'] = (df['vulnerability'] <= 0.4).astype(int)
        
        # Create vulnerability percentile only if we have multiple unique values
        try:
            if len(df['vulnerability'].unique()) > 3:
                df['vulnerability_percentile'] = pd.qcut(df['vulnerability'], 
                                                       q=[0, 0.33, 0.66, 1.0], 
                                                       labels=['Low', 'Medium', 'High'],
                                                       duplicates='drop')
            else:
                # Fallback to simple categorization
                df['vulnerability_percentile'] = pd.cut(df['vulnerability'],
                                                      bins=[0, 0.4, 0.7, 1.0],
                                                      labels=['Low', 'Medium', 'High'],
                                                      include_lowest=True)
        except Exception:
            # If qcut still fails, use simple thresholds
            df['vulnerability_percentile'] = pd.cut(df['vulnerability'],
                                                  bins=[0, 0.4, 0.7, 1.0],
                                                  labels=['Low', 'Medium', 'High'],
                                                  include_lowest=True)
        
        # Calorie adequacy categories
        df['low_kcal_adequacy'] = (df['kcal_adequacy'] < 85).astype(int)  # Below 85% adequacy
        df['very_low_kcal_adequacy'] = (df['kcal_adequacy'] < 80).astype(int)  # Below 80% adequacy
        
        # Severe deficiency indicators
        df['severe_micronutrient_deficiency'] = (df['avg_nutrient_adequacy'] < 50).astype(int)
        df['multiple_deficiencies'] = (df['nutrient_deficiency_count'] >= 3).astype(int)
        
        # Combined risk indicators
        df['compound_risk'] = (
            df['high_vulnerability'].astype(int) + 
            df['severe_micronutrient_deficiency'].astype(int) + 
            df['low_kcal_adequacy'].astype(int)
        )
        
        # Target variable: Comprehensive Nutrition Risk Score
        # Weighted based on severity of actual data patterns
        df['nutrition_risk'] = (
            df['vulnerability'] * 0.35 +  # Vulnerability index weight
            (100 - df['avg_nutrient_adequacy']) / 100 * 0.35 +  # Micronutrient deficiency
            (100 - df['kcal_adequacy']) / 100 * 0.20 +  # Calorie adequacy
            df['compound_risk'] / 3 * 0.10  # Combined risk factors
        )
        
        # Normalize nutrition risk to 0-1 scale
        df['nutrition_risk'] = np.clip(df['nutrition_risk'], 0, 1)
        
        print(f"✅ Features created - Nutrition risk range: {df['nutrition_risk'].min():.3f} to {df['nutrition_risk'].max():.3f}")
        print(f"📊 Average micronutrient adequacy: {df['avg_nutrient_adequacy'].mean():.1f}%")
        print(f"📊 Districts with high vulnerability: {df['high_vulnerability'].sum()}")
        print(f"📊 Districts with severe micronutrient deficiency: {df['severe_micronutrient_deficiency'].sum()}")
        
        return df
    
    def train_model(self, df):
        """Train the ML model using actual CSV data"""
        print("🤖 Training ML model with actual nutrition data...")
        
        # Select features for training - using both basic and derived features
        feature_cols = [
            # Basic features from CSV
            'vulnerability', 'kcal_adequacy',
            
            # Geographic and population features
            'region_encoded', 'population_log', 'is_urban',
            
            # Nutrient adequacy features
            'avg_nutrient_adequacy', 'nutrient_deficiency_count',
            
            # Risk category features
            'high_vulnerability', 'medium_vulnerability',
            'low_kcal_adequacy', 'very_low_kcal_adequacy',
            'severe_micronutrient_deficiency', 'multiple_deficiencies',
            'compound_risk'
        ]
        
        # Add specific nutrient deficiency indicators if available
        if 'critical_b12_deficiency' in df.columns:
            feature_cols.append('critical_b12_deficiency')
        if 'riboflavin_deficiency' in df.columns:
            feature_cols.append('riboflavin_deficiency')
        if 'vitamin_a_deficiency' in df.columns:
            feature_cols.append('vitamin_a_deficiency')
        
        # Filter features that actually exist in the dataframe
        available_features = [col for col in feature_cols if col in df.columns]
        
        print(f"📊 Using {len(available_features)} features for training")
        print(f"🔍 Key features: {available_features[:8]}...")
        
        X = df[available_features].fillna(df[available_features].median())
        y = df['nutrition_risk']
        
        self.feature_names = available_features
        
        print(f"📈 Training data: {len(X)} districts")
        print(f"📊 Nutrition risk distribution:")
        print(f"   - Low risk (<0.3): {(y < 0.3).sum()} districts")
        print(f"   - Moderate risk (0.3-0.6): {((y >= 0.3) & (y < 0.6)).sum()} districts") 
        print(f"   - High risk (≥0.6): {(y >= 0.6).sum()} districts")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model with better hyperparameters for this dataset size
        self.model = RandomForestRegressor(
            n_estimators=100, 
            max_depth=6,
            min_samples_split=3,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        print(f"✅ Model trained successfully!")
        print(f"📊 Performance metrics:")
        print(f"   - R² Score: {r2:.3f}")
        print(f"   - RMSE: {rmse:.3f}")
        print(f"   - Mean Absolute Error: {np.mean(np.abs(y_test - y_pred)):.3f}")
        
        # Show feature importance
        if hasattr(self.model, 'feature_importances_'):
            feature_importance = pd.DataFrame({
                'feature': available_features,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print(f"\n🎯 Top 5 Most Important Features:")
            for _, row in feature_importance.head().iterrows():
                print(f"   - {row['feature']}: {row['importance']:.3f}")
        
        self.is_trained = True
        return r2, rmse
    
    def predict_nutrition_risk(self, district_name):
        """Predict nutrition risk for a specific district"""
        if not self.is_trained:
            print("❌ Model not trained yet!")
            return None
        
        district_data = self.districts_data[self.districts_data['district'] == district_name]
        
        if district_data.empty:
            print(f"❌ District '{district_name}' not found")
            return None
        
        # Prepare features
        X = district_data[self.feature_names].fillna(district_data[self.feature_names].median())
        X_scaled = self.scaler.transform(X)
        
        # Make prediction
        risk_score = self.model.predict(X_scaled)[0]
        
        # Get confidence interval using tree predictions
        tree_predictions = [tree.predict(X_scaled)[0] for tree in self.model.estimators_]
        confidence_lower = np.percentile(tree_predictions, 2.5)
        confidence_upper = np.percentile(tree_predictions, 97.5)
        
        return {
            'district': district_name,
            'nutrition_risk': risk_score,
            'confidence_interval': (confidence_lower, confidence_upper),
            'risk_level': self._classify_risk(risk_score)
        }
    
    def _classify_risk(self, risk_score):
        """Classify risk level"""
        if risk_score < 0.3:
            return 'LOW'
        elif risk_score < 0.6:
            return 'MODERATE'
        else:
            return 'HIGH'
    
    def simulate_intervention(self, district_name, intervention_type, scale_percent):
        """Simulate intervention impact"""
        if not self.is_trained:
            print("❌ Model not trained yet!")
            return None
        
        # Get baseline prediction
        baseline = self.predict_nutrition_risk(district_name)
        if not baseline:
            return None
        
        # Apply intervention effects
        district_data = self.districts_data[self.districts_data['district'] == district_name].copy()
        
        # Define intervention effects
        intervention_effects = {
            'supplementation': {
                'avg_nutrient_adequacy': 1.2,  # 20% improvement
                'nutrient_deficiency_count': 0.7  # 30% reduction
            },
            'fortification': {
                'avg_nutrient_adequacy': 1.15,  # 15% improvement
                'kcal_adequacy': 1.1  # 10% improvement
            },
            'cash_transfer': {
                'vulnerability': 0.8,  # 20% reduction
                'kcal_adequacy': 1.2  # 20% improvement
            },
            'nutrition_education': {
                'avg_nutrient_adequacy': 1.1,  # 10% improvement
                'vulnerability': 0.9  # 10% reduction
            }
        }
        
        if intervention_type in intervention_effects:
            effects = intervention_effects[intervention_type]
            scale_factor = scale_percent / 100
            
            for feature, multiplier in effects.items():
                if feature in district_data.columns:
                    if multiplier > 1:  # Improvement
                        district_data[feature] *= (1 + (multiplier - 1) * scale_factor)
                    else:  # Reduction
                        district_data[feature] *= (1 - (1 - multiplier) * scale_factor)
        
        # For intervention simulation, we need to recalculate some features manually
        # instead of calling create_features (which expects multiple districts)
        
        # Recalculate key derived features
        if 'avg_nutrient_adequacy' in district_data.columns:
            # Update compound risk based on new values
            district_data['high_vulnerability'] = (district_data['vulnerability'] > 0.7).astype(int)
            district_data['medium_vulnerability'] = ((district_data['vulnerability'] > 0.4) & (district_data['vulnerability'] <= 0.7)).astype(int)
            district_data['low_kcal_adequacy'] = (district_data['kcal_adequacy'] < 85).astype(int)
            district_data['severe_micronutrient_deficiency'] = (district_data['avg_nutrient_adequacy'] < 50).astype(int)
            
            # Recalculate compound risk
            district_data['compound_risk'] = (
                district_data['high_vulnerability'].astype(int) + 
                district_data['severe_micronutrient_deficiency'].astype(int) + 
                district_data['low_kcal_adequacy'].astype(int)
            )
            
            # Recalculate nutrition risk
            district_data['nutrition_risk'] = (
                district_data['vulnerability'] * 0.35 +
                (100 - district_data['avg_nutrient_adequacy']) / 100 * 0.35 +
                (100 - district_data['kcal_adequacy']) / 100 * 0.20 +
                district_data['compound_risk'] / 3 * 0.10
            )
            
            district_data['nutrition_risk'] = np.clip(district_data['nutrition_risk'], 0, 1)
        
        # Make prediction using the model
        try:
            X = district_data[self.feature_names].fillna(district_data[self.feature_names].median())
            X_scaled = self.scaler.transform(X)
            intervention_risk = self.model.predict(X_scaled)[0]
        except Exception as e:
            print(f"⚠️ Warning: Could not use ML model for intervention prediction: {e}")
            # Fallback to calculated risk
            intervention_risk = district_data['nutrition_risk'].iloc[0]
        
        return {
            'intervention': intervention_type,
            'scale': f"{scale_percent}%",
            'baseline_risk': baseline['nutrition_risk'],
            'intervention_risk': intervention_risk,
            'risk_reduction': baseline['nutrition_risk'] - intervention_risk,
            'effectiveness': f"{((baseline['nutrition_risk'] - intervention_risk) / baseline['nutrition_risk'] * 100):.1f}%"
        }
    
    def get_district_summary(self, district_name):
        """Get comprehensive district summary"""
        district_data = self.districts_data[self.districts_data['district'] == district_name]
        
        if district_data.empty:
            return None
        
        row = district_data.iloc[0]
        
        # Get top nutrient deficiencies
        nutrient_cols = [col for col in district_data.columns if col.endswith('_adequacy') and col != 'kcal_adequacy']
        nutrient_values = {col.replace('_adequacy', ''): row[col] for col in nutrient_cols}
        worst_nutrients = sorted(nutrient_values.items(), key=lambda x: x[1])[:3]
        
        summary = {
            'district': district_name,
            'region': row['region'],
            'population': f"{row['population']:,}",
            'vulnerability_score': f"{row['vulnerability']:.3f}",
            'kcal_adequacy': f"{row['kcal_adequacy']:.1f}%",
            'avg_nutrient_adequacy': f"{row['avg_nutrient_adequacy']:.1f}%",
            'worst_nutrients': [f"{name}: {value:.1f}%" for name, value in worst_nutrients]
        }
        
        if self.is_trained:
            prediction = self.predict_nutrition_risk(district_name)
            summary.update({
                'nutrition_risk': f"{prediction['nutrition_risk']:.3f}",
                'risk_level': prediction['risk_level']
            })
        
        return summary
    
    def analyze_all_districts(self):
        """Analyze all districts and return rankings"""
        if not self.is_trained:
            print("❌ Model not trained yet!")
            return None
        
        results = []
        
        for district in self.districts_data['district']:
            prediction = self.predict_nutrition_risk(district)
            if prediction:
                results.append({
                    'district': district,
                    'region': self.districts_data[self.districts_data['district'] == district]['region'].iloc[0],
                    'nutrition_risk': prediction['nutrition_risk'],
                    'risk_level': prediction['risk_level']
                })
        
        # Sort by risk level
        results_df = pd.DataFrame(results).sort_values('nutrition_risk', ascending=False)
        
        return results_df
    
    def create_visualization(self, save_plot=True):
        """Create visualization of results"""
        if not self.is_trained:
            print("❌ Model not trained yet!")
            return
        
        results_df = self.analyze_all_districts()
        
        plt.figure(figsize=(12, 8))
        
        # Color by region
        colors = {'Northern': 'blue', 'Central': 'green', 'Southern': 'red'}
        
        for region in results_df['region'].unique():
            region_data = results_df[results_df['region'] == region]
            plt.scatter(region_data.index, region_data['nutrition_risk'], 
                       c=colors[region], label=region, alpha=0.7, s=100)
        
        plt.axhline(y=0.6, color='red', linestyle='--', alpha=0.5, label='High Risk Threshold')
        plt.axhline(y=0.3, color='orange', linestyle='--', alpha=0.5, label='Moderate Risk Threshold')
        
        plt.xlabel('District Ranking (by risk)')
        plt.ylabel('Nutrition Risk Score')
        plt.title('Malawi Districts - Nutrition Risk Assessment')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        if save_plot:
            plt.savefig('malawi_nutrition_risk_analysis.png', dpi=300, bbox_inches='tight')
            print("📊 Visualization saved as 'malawi_nutrition_risk_analysis.png'")
        
        plt.show()
    
    def save_model_for_production(self, model_dir='./models'):
        """Save model and all necessary data for production use"""
        import os
        import json
        from datetime import datetime
        
        if not self.is_trained:
            print("❌ No trained model to save!")
            return False
        
        # Create models directory
        os.makedirs(model_dir, exist_ok=True)
        
        # Save the ML model and scaler
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'training_date': datetime.now().isoformat(),
            'model_type': 'RandomForestRegressor'
        }
        
        model_path = os.path.join(model_dir, 'nutrition_model.pkl')
        joblib.dump(model_data, model_path)
        
        # Save districts data as JSON for the frontend
        districts_json = self.districts_data.to_dict('records')
        districts_path = os.path.join(model_dir, 'districts_data.json')
        
        with open(districts_path, 'w') as f:
            json.dump(districts_json, f, indent=2, default=str)
        
        # Save model metadata for API
        metadata = {
            'model_version': '1.0.0',
            'training_date': datetime.now().isoformat(),
            'num_districts': len(self.districts_data),
            'num_features': len(self.feature_names),
            'feature_names': self.feature_names,
            'districts': self.districts_data['district'].tolist(),
            'regions': self.districts_data['region'].unique().tolist(),
            'risk_thresholds': {
                'low': 0.3,
                'moderate': 0.6,
                'high': 1.0
            },
            'intervention_types': [
                'supplementation',
                'fortification', 
                'cash_transfer',
                'nutrition_education'
            ]
        }
        
        metadata_path = os.path.join(model_dir, 'model_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Create a simple prediction API script
        api_script = '''#!/usr/bin/env python3
"""
Simple Flask API for Malawi Nutrition Predictions
Deploy this to serve your React app
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for React app

# Load model on startup
model_data = joblib.load('models/nutrition_model.pkl')
MODEL = model_data['model']
SCALER = model_data['scaler']
FEATURE_NAMES = model_data['feature_names']

# Load districts data
with open('models/districts_data.json', 'r') as f:
    DISTRICTS_DATA = json.load(f)

# Load metadata
with open('models/model_metadata.json', 'r') as f:
    METADATA = json.load(f)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_version': METADATA['model_version'],
        'training_date': METADATA['training_date']
    })

@app.route('/api/districts', methods=['GET'])
def get_districts():
    """Get all districts with basic info"""
    districts = []
    for district_data in DISTRICTS_DATA:
        districts.append({
            'name': district_data['district'],
            'region': district_data['region'],
            'population': district_data['population']
        })
    return jsonify({'districts': districts})

@app.route('/api/predict/<district_name>', methods=['GET'])
def predict_district_risk(district_name):
    """Predict nutrition risk for a specific district"""
    
    # Find district data
    district_data = None
    for d in DISTRICTS_DATA:
        if d['district'].lower() == district_name.lower():
            district_data = d
            break
    
    if not district_data:
        return jsonify({'error': f'District {district_name} not found'}), 404
    
    try:
        # Prepare features
        features_df = pd.DataFrame([district_data])
        
        # Select and scale features
        X = features_df[FEATURE_NAMES].fillna(features_df[FEATURE_NAMES].median())
        X_scaled = SCALER.transform(X)
        
        # Make prediction
        risk_score = MODEL.predict(X_scaled)[0]
        
        # Get confidence interval
        tree_predictions = [tree.predict(X_scaled)[0] for tree in MODEL.estimators_]
        confidence_lower = np.percentile(tree_predictions, 2.5)
        confidence_upper = np.percentile(tree_predictions, 97.5)
        
        # Classify risk level
        if risk_score < 0.3:
            risk_level = 'LOW'
        elif risk_score < 0.6:
            risk_level = 'MODERATE'
        else:
            risk_level = 'HIGH'
        
        return jsonify({
            'district': district_name,
            'nutrition_risk': round(risk_score, 3),
            'risk_level': risk_level,
            'confidence_interval': {
                'lower': round(confidence_lower, 3),
                'upper': round(confidence_upper, 3)
            },
            'district_info': {
                'region': district_data['region'],
                'population': district_data['population'],
                'vulnerability': district_data['vulnerability'],
                'kcal_adequacy': district_data['kcal_adequacy']
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/simulate', methods=['POST'])
def simulate_intervention():
    """Simulate intervention effects"""
    
    data = request.get_json()
    district_name = data.get('district')
    intervention_type = data.get('intervention_type')
    scale_percent = data.get('scale_percent', 50)
    
    # Find district data
    district_data = None
    for d in DISTRICTS_DATA:
        if d['district'].lower() == district_name.lower():
            district_data = dict(d)  # Make a copy
            break
    
    if not district_data:
        return jsonify({'error': f'District {district_name} not found'}), 404
    
    try:
        # Get baseline prediction
        baseline_df = pd.DataFrame([district_data])
        baseline_X = baseline_df[FEATURE_NAMES].fillna(baseline_df[FEATURE_NAMES].median())
        baseline_X_scaled = SCALER.transform(baseline_X)
        baseline_risk = MODEL.predict(baseline_X_scaled)[0]
        
        # Apply intervention effects
        intervention_effects = {
            'supplementation': {
                'avg_nutrient_adequacy': 1.2,
                'nutrient_deficiency_count': 0.7
            },
            'fortification': {
                'avg_nutrient_adequacy': 1.15,
                'kcal_adequacy': 1.1
            },
            'cash_transfer': {
                'vulnerability': 0.8,
                'kcal_adequacy': 1.2
            },
            'nutrition_education': {
                'avg_nutrient_adequacy': 1.1,
                'vulnerability': 0.9
            }
        }
        
        if intervention_type in intervention_effects:
            effects = intervention_effects[intervention_type]
            scale_factor = scale_percent / 100
            
            for feature, multiplier in effects.items():
                if feature in district_data:
                    if multiplier > 1:  # Improvement
                        district_data[feature] *= (1 + (multiplier - 1) * scale_factor)
                    else:  # Reduction
                        district_data[feature] *= (1 - (1 - multiplier) * scale_factor)
        
        # Predict with intervention
        intervention_df = pd.DataFrame([district_data])
        intervention_X = intervention_df[FEATURE_NAMES].fillna(intervention_df[FEATURE_NAMES].median())
        intervention_X_scaled = SCALER.transform(intervention_X)
        intervention_risk = MODEL.predict(intervention_X_scaled)[0]
        
        risk_reduction = baseline_risk - intervention_risk
        effectiveness = (risk_reduction / baseline_risk * 100) if baseline_risk > 0 else 0
        
        return jsonify({
            'district': district_name,
            'intervention': intervention_type,
            'scale': f"{scale_percent}%",
            'baseline_risk': round(baseline_risk, 3),
            'intervention_risk': round(intervention_risk, 3),
            'risk_reduction': round(risk_reduction, 3),
            'effectiveness_percent': round(effectiveness, 1)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rankings', methods=['GET'])
def get_district_rankings():
    """Get all districts ranked by nutrition risk"""
    
    try:
        results = []
        
        for district_data in DISTRICTS_DATA:
            # Prepare features and predict
            features_df = pd.DataFrame([district_data])
            X = features_df[FEATURE_NAMES].fillna(features_df[FEATURE_NAMES].median())
            X_scaled = SCALER.transform(X)
            risk_score = MODEL.predict(X_scaled)[0]
            
            # Classify risk
            if risk_score < 0.3:
                risk_level = 'LOW'
            elif risk_score < 0.6:
                risk_level = 'MODERATE'
            else:
                risk_level = 'HIGH'
            
            results.append({
                'district': district_data['district'],
                'region': district_data['region'],
                'nutrition_risk': round(risk_score, 3),
                'risk_level': risk_level,
                'population': district_data['population']
            })
        
        # Sort by risk level
        results.sort(key=lambda x: x['nutrition_risk'], reverse=True)
        
        return jsonify({'rankings': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Malawi Nutrition API...")
    print("📡 Available endpoints:")
    print("   GET  /api/health")
    print("   GET  /api/districts") 
    print("   GET  /api/predict/<district_name>")
    print("   POST /api/simulate")
    print("   GET  /api/rankings")
    print("\\n🌐 Access from React: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
'''
        
        api_path = os.path.join('nutrition_api.py')
        with open(api_path, 'w') as f:
            f.write(api_script)
        
        # Create requirements.txt for deployment
        requirements = '''flask==2.3.3
flask-cors==4.0.0
scikit-learn==1.3.0
pandas==2.0.3
numpy==1.24.3
joblib==1.3.2
'''
        
        requirements_path = os.path.join(model_dir, 'requirements.txt')
        with open(requirements_path, 'w') as f:
            f.write(requirements)
        
        print(f"✅ Production model saved to '{model_dir}'")
        print(f"📁 Files created:")
        print(f"   - {model_path} (ML model)")
        print(f"   - {districts_path} (Districts data)")
        print(f"   - {metadata_path} (Model metadata)")
        print(f"   - {api_path} (Flask API)")
        print(f"   - {requirements_path} (Python dependencies)")
        
        print(f"\\n🚀 To deploy API for your React app:")
        print(f"   1. cd {model_dir}")
        print(f"   2. pip install -r requirements.txt")
        print(f"   3. python nutrition_api.py")
        print(f"   4. Your React app can call: http://localhost:5000/api/")
        
        return True
    
    def load_model(self, filepath='malawi_nutrition_model.pkl'):
        """Load a trained model"""
        try:
            model_data = joblib.load(filepath)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.feature_names = model_data['feature_names']
            self.districts_data = model_data['districts_data']
            self.is_trained = True
            print(f"✅ Model loaded from '{filepath}'")
            return True
        except FileNotFoundError:
            print(f"❌ Model file '{filepath}' not found")
            return False


def main():
    """Main function to demonstrate the system and create production models"""
    print("🇲🇼 MALAWI NUTRITION PREDICTOR - SIMPLIFIED VERSION")
    print("=" * 55)
    
    # Initialize predictor
    predictor = NutritionPredictor()
    
    # Load and process data
    df = predictor.load_data()
    if df is None:
        print("❌ Failed to load data. Exiting.")
        return
    
    # Create features and train model
    df_with_features = predictor.create_features(df)
    r2, rmse = predictor.train_model(df_with_features)
    
    # Demonstrate predictions
    print("\n🔮 NUTRITION RISK PREDICTIONS")
    print("-" * 35)
    
    test_districts = ['Lilongwe', 'Dedza', 'Chitipa']
    
    for district in test_districts:
        summary = predictor.get_district_summary(district)
        if summary:
            print(f"\n📍 {district.upper()}")
            print(f"   Region: {summary['region']}")
            print(f"   Population: {summary['population']}")
            print(f"   Nutrition Risk: {summary['nutrition_risk']} ({summary['risk_level']})")
            print(f"   Worst nutrients: {', '.join(summary['worst_nutrients'][:2])}")
    
    # Demonstrate intervention simulation
    print("\n💡 INTERVENTION SIMULATION")
    print("-" * 30)
    
    intervention_result = predictor.simulate_intervention('Dedza', 'supplementation', 50)
    if intervention_result:
        print(f"District: {intervention_result['intervention']} at {intervention_result['scale']}")
        print(f"Baseline risk: {intervention_result['baseline_risk']:.3f}")
        print(f"After intervention: {intervention_result['intervention_risk']:.3f}")
        print(f"Risk reduction: {intervention_result['risk_reduction']:.3f} ({intervention_result['effectiveness']})")
    
    # Show district rankings
    print("\n🏆 TOP 5 HIGHEST RISK DISTRICTS")
    print("-" * 33)
    
    all_results = predictor.analyze_all_districts()
    if all_results is not None:
        top_5 = all_results.head()
        for idx, row in top_5.iterrows():
            print(f"{idx+1}. {row['district']} ({row['region']}) - Risk: {row['nutrition_risk']:.3f}")
    
    # Create visualization
    print("\n📊 Creating visualization...")
    predictor.create_visualization()
    
    # Save for production use
    print("\n🚀 SAVING FOR PRODUCTION USE")
    print("-" * 35)
    predictor.save_model_for_production()
    
    print("\n🎉 COMPLETE! Your models are ready for:")
    print("   ✅ Local development and testing")
    print("   ✅ React frontend integration") 
    print("   ✅ API deployment")
    print("   ✅ Production use")


def create_production_models():
    """Standalone function to just create models for production"""
    print("🏭 CREATING PRODUCTION MODELS ONLY")
    print("=" * 40)
    
    predictor = NutritionPredictor()
    
    # Quick model creation
    df = predictor.load_data()
    if df is None:
        return False
        
    df_with_features = predictor.create_features(df)
    predictor.train_model(df_with_features)
    
    # Save for production
    success = predictor.save_model_for_production()
    
    if success:
        print("\n✅ Production models created successfully!")
        print("🔗 Ready to integrate with your React app")
        return True
    else:
        print("\n❌ Failed to create production models")
        return False


if __name__ == "__main__":
    main()