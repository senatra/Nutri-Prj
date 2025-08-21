from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime

try:
    from malawi_nutrition_predictor import NutritionPredictor
except ImportError:
    print("❌ Error: Cannot import NutritionPredictor")
    print("Make sure malawi_nutrition_predictor.py is in the same directory")
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Enable CORS for React app

# Global variables to store the model and data
predictor = None
model_loaded = False

def initialize_model():
    """Initialize and train the model on startup"""
    global predictor, model_loaded
    
    print("🤖 Initializing Malawi Nutrition Predictor...")
    
    try:
        # Initialize predictor
        predictor = NutritionPredictor()
        
        # Load and process data
        print("📊 Loading nutrition data...")
        df = predictor.load_data()
        if df is None:
            print("❌ Failed to load data files")
            return False
        
        # Create features and train model
        print("🔧 Creating features and training model...")
        df_with_features = predictor.create_features(df)
        r2, rmse = predictor.train_model(df_with_features)
        
        print(f"✅ Model trained successfully!")
        print(f"📊 Model Performance: R²={r2:.3f}, RMSE={rmse:.3f}")
        print(f"🏥 Ready to serve {len(df)} districts")
        
        model_loaded = True
        return True
        
    except Exception as e:
        print(f"❌ Error initializing model: {e}")
        return False

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check API health and model status"""
    return jsonify({
        'status': 'healthy' if model_loaded else 'model_not_loaded',
        'model_loaded': model_loaded,
        'timestamp': datetime.now().isoformat(),
        'districts_count': len(predictor.districts_data) if model_loaded else 0,
        'features_count': len(predictor.feature_names) if model_loaded else 0
    })

@app.route('/api/districts', methods=['GET'])
def get_districts():
    """Get all districts with basic info"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        districts = []
        for _, row in predictor.districts_data.iterrows():
            districts.append({
                'name': row['district'],
                'region': row['region'],
                'population': int(row['population']),
                'vulnerability': float(row['vulnerability']),
                'kcal_adequacy': float(row['kcal_adequacy'])
            })
        
        return jsonify({
            'districts': districts,
            'total_count': len(districts)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error loading districts: {str(e)}'}), 500

@app.route('/api/predict/<district_name>', methods=['GET'])
def predict_district_risk(district_name):
    """Predict nutrition risk for a specific district"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        # Get prediction from your model
        prediction = predictor.predict_nutrition_risk(district_name)
        
        if not prediction:
            return jsonify({'error': f'District {district_name} not found'}), 404
        
        # Get additional district info
        district_data = predictor.districts_data[
            predictor.districts_data['district'].str.lower() == district_name.lower()
        ]
        
        if district_data.empty:
            return jsonify({'error': f'District {district_name} not found'}), 404
        
        district_row = district_data.iloc[0]
        
        return jsonify({
            'district': prediction['district'],
            'nutrition_risk': round(prediction['nutrition_risk'], 4),
            'risk_level': prediction['risk_level'],
            'confidence_interval': {
                'lower': round(prediction['confidence_interval'][0], 4),
                'upper': round(prediction['confidence_interval'][1], 4)
            },
            'district_info': {
                'region': district_row['region'],
                'population': int(district_row['population']),
                'vulnerability': float(district_row['vulnerability']),
                'kcal_adequacy': float(district_row['kcal_adequacy']),
                'avg_nutrient_adequacy': float(district_row['avg_nutrient_adequacy']) if 'avg_nutrient_adequacy' in district_row else None
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Error predicting risk: {str(e)}'}), 500

@app.route('/api/simulate', methods=['POST'])
def simulate_intervention():
    """Simulate intervention effects"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        district_name = data.get('district')
        intervention_type = data.get('intervention_type')
        scale_percent = data.get('scale_percent', 50)
        
        if not district_name or not intervention_type:
            return jsonify({'error': 'Missing required fields: district, intervention_type'}), 400
        
        # Run simulation using your model
        simulation_result = predictor.simulate_intervention(
            district_name, 
            intervention_type, 
            scale_percent
        )
        
        if not simulation_result:
            return jsonify({'error': f'Simulation failed for district {district_name}'}), 404
        
        return jsonify({
            'district': simulation_result.get('district', district_name),
            'intervention': simulation_result['intervention'],
            'scale': simulation_result['scale'],
            'baseline_risk': round(simulation_result['baseline_risk'], 4),
            'intervention_risk': round(simulation_result['intervention_risk'], 4),
            'risk_reduction': round(simulation_result['risk_reduction'], 4),
            'effectiveness_percent': float(simulation_result['effectiveness'].replace('%', ''))
        })
        
    except Exception as e:
        return jsonify({'error': f'Error running simulation: {str(e)}'}), 500

@app.route('/api/rankings', methods=['GET'])
def get_district_rankings():
    """Get all districts ranked by nutrition risk"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        # Get rankings from your model
        results_df = predictor.analyze_all_districts()
        
        if results_df is None:
            return jsonify({'error': 'Failed to analyze districts'}), 500
        
        rankings = []
        for _, row in results_df.iterrows():
            rankings.append({
                'district': row['district'],
                'region': row['region'],
                'nutrition_risk': round(row['nutrition_risk'], 4),
                'risk_level': row['risk_level'],
                'population': int(predictor.districts_data[
                    predictor.districts_data['district'] == row['district']
                ]['population'].iloc[0])
            })
        
        return jsonify({
            'rankings': rankings,
            'total_count': len(rankings)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error getting rankings: {str(e)}'}), 500

@app.route('/api/summary/<district_name>', methods=['GET'])
def get_district_summary(district_name):
    """Get comprehensive district summary"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        summary = predictor.get_district_summary(district_name)
        
        if not summary:
            return jsonify({'error': f'District {district_name} not found'}), 404
        
        return jsonify(summary)
        
    except Exception as e:
        return jsonify({'error': f'Error getting summary: {str(e)}'}), 500

@app.route('/api/interventions', methods=['GET'])
def get_intervention_types():
    """Get available intervention types"""
    return jsonify({
        'intervention_types': [
            {
                'id': 'supplementation',
                'name': 'Nutrient Supplementation',
                'description': 'Direct nutrient supplementation programs',
                'icon': '💊'
            },
            {
                'id': 'fortification',
                'name': 'Food Fortification',
                'description': 'Fortifying staple foods with essential nutrients',
                'icon': '🥘'
            },
            {
                'id': 'cash_transfer',
                'name': 'Cash Transfer Program',
                'description': 'Direct cash transfers to improve food access',
                'icon': '💰'
            },
            {
                'id': 'nutrition_education',
                'name': 'Nutrition Education',
                'description': 'Community nutrition education and awareness',
                'icon': '📚'
            }
        ]
    })

@app.route('/api/regions', methods=['GET'])
def get_regions_summary():
    """Get summary statistics by region"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        results_df = predictor.analyze_all_districts()
        
        if results_df is None:
            return jsonify({'error': 'Failed to analyze districts'}), 500
        
        # Group by region
        region_stats = results_df.groupby('region').agg({
            'nutrition_risk': ['mean', 'min', 'max', 'count'],
            'risk_level': lambda x: x.value_counts().to_dict()
        }).round(4)
        
        regions = []
        for region in region_stats.index:
            risk_counts = region_stats.loc[region, ('risk_level', '<lambda>')]
            regions.append({
                'region': region,
                'avg_risk': region_stats.loc[region, ('nutrition_risk', 'mean')],
                'min_risk': region_stats.loc[region, ('nutrition_risk', 'min')],
                'max_risk': region_stats.loc[region, ('nutrition_risk', 'max')],
                'district_count': region_stats.loc[region, ('nutrition_risk', 'count')],
                'risk_distribution': risk_counts
            })
        
        return jsonify({
            'regions': regions,
            'total_regions': len(regions)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error getting region summary: {str(e)}'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🚀 Starting Malawi Nutrition API Server...")
    print("=" * 50)
    
    # Check if required files exist
    required_files = [
        'composite-vulnerability.csv',
        'consumption-adequacy-of.csv', 
        'nutrients-adequacy.csv'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required CSV files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nPlease ensure all CSV files are in the same directory as this script.")
        sys.exit(1)
    
    # Initialize the model
    if not initialize_model():
        print("❌ Failed to initialize model. Exiting.")
        sys.exit(1)
    
    print("\n📡 Available API endpoints:")
    print("   GET  /api/health              - Check API status")
    print("   GET  /api/districts           - Get all districts")
    print("   GET  /api/predict/<district>  - Predict nutrition risk")
    print("   POST /api/simulate            - Simulate interventions")
    print("   GET  /api/rankings            - Get district rankings")
    print("   GET  /api/summary/<district>  - Get district summary")
    print("   GET  /api/interventions       - Get intervention types")
    print("   GET  /api/regions             - Get regional summary")
    
    print(f"\n🌐 API will be available at: http://localhost:5000")
    print(f"🔗 React dashboard can connect to: http://localhost:5000/api/")
    print(f"📊 Test the API: http://localhost:5000/api/health")
    
    print("\n" + "=" * 50)
    print("🎉 Ready to serve nutrition predictions!")
    print("Press Ctrl+C to stop the server")
    print("=" * 50 + "\n")
    
    # Run the Flask app
    app.run(
        debug=True,           # Enable debug mode for development
        host='0.0.0.0',      # Listen on all interfaces
        port=5000,           # Use port 5000
        threaded=True        # Handle multiple requests
    )