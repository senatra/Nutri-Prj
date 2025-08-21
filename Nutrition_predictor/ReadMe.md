<!-- To create V-enviroment -->
python -m venv nutrition_env

<!-- Activate virtual environment -->
<!-- On Windows: -->
nutrition_env\Scripts\activate
 <!-- On macOS/Linux: -->
source nutrition_env/bin/activate

 <!-- Install required packages -->
pip install -r requirements.txt



<!-- ORRR -->


python -m pip install --upgrade pip setuptools wheel

pip install -r requirements.txt


<!-- TO RUN THE API -->
python nutrition_api.py