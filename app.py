from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from gekko import GEKKO
from dotenv import load_dotenv
import os
import traceback

# Load .env variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/validate-factors', methods=['POST'])
def validate_factors():
    try:
        best_factor = int(request.json.get('best_factor'))
        worst_factor = int(request.json.get('worst_factor'))
        
        if best_factor == worst_factor:
            return jsonify({'valid': False, 'message': 'Best and worst factors cannot be the same'})
        return jsonify({'valid': True})
    except (ValueError, TypeError):
        return jsonify({'valid': False, 'message': 'Invalid input values'})

@app.route('/solve', methods=['POST'])
def solve():
    try:
        # Add debug logging
        print("Received form data:", request.json)
        
        # Get form data
        form_data = request.json
        if not form_data:
            raise ValueError("No form data received")
            
        num_factors = int(form_data.get('num_factors', 0))
        if num_factors < 2:
            raise ValueError("Number of factors must be at least 2")
            
        best_criteria = int(form_data.get('best_factor', 0))
        worst_criteria = int(form_data.get('worst_factor', 0))
        
        print(f"Processing {num_factors} factors, best: {best_criteria}, worst: {worst_criteria}")

        # Create best and worst arrays
        best = []
        worst = []
        
        # Populate best scores
        for i in range(1, num_factors + 1):
            if i == best_criteria:
                best.append(1)
            else:
                score_key = f'bo_score_{i}'
                score = form_data.get(score_key)
                if score is None:
                    raise ValueError(f"Missing best-others score for factor {i}")
                best.append(int(score))

        # Populate worst scores
        for i in range(1, num_factors + 1):
            if i == worst_criteria:
                worst.append(1)
            elif i == best_criteria:
                worst.append(best[worst_criteria - 1])
            else:
                score_key = f'ow_score_{i}'
                score = form_data.get(score_key)
                if score is None:
                    raise ValueError(f"Missing others-worst score for factor {i}")
                worst.append(int(score))

        print("Best scores:", best)
        print("Worst scores:", worst)

        # Create dictionaries for best_n and worst_n
        best_n = {i: best[i] for i in range(len(best))}
        worst_n = {i: worst[i] for i in range(len(worst))}

        # Create BWM Matrix
        bwm = pd.DataFrame(columns=[i for i in range(0, num_factors)], 
                          index=[i for i in range(0, num_factors)])

        # Fill BWM matrix as per notebook logic
        best_criteria -= 1  # Convert to 0-based index
        worst_criteria -= 1

        # Fill best row
        for i in bwm.columns:
            bwm[i][best_criteria] = best[i]

        # Fill worst column
        for i in bwm.index:
            bwm[worst_criteria][i] = worst[i]

        # Fill diagonal with 1s
        for i in bwm.columns:
            if i in bwm.index:
                bwm[i][i] = 1

        # Calculate reciprocal values
        for i in bwm.columns:
            bwm[best_criteria][i] = round(1/bwm[i][best_criteria], 2)
            bwm[i][worst_criteria] = round(1/bwm[worst_criteria][i], 2)

        # Find and fill NaN values
        nan_indices = []
        for i in range(bwm.shape[0]):
            for j in range(bwm.shape[1]):
                if pd.isna(bwm.iloc[i, j]):
                    nan_indices.append((i, j))

        for (v, k) in nan_indices:
            bwm[k][v] = (
                round((bwm[k][best_criteria])/(bwm[v][best_criteria]), 2),
                round((bwm[worst_criteria][v])/(bwm[worst_criteria][k]), 2)
            )

        print("BWM Matrix created successfully")
        print(bwm)

        # Convert BWM matrix to JSON serializable format
        bwm_json = []
        for i in range(bwm.shape[0]):
            row = []
            for j in range(bwm.shape[1]):
                value = bwm.iloc[i, j]
                if isinstance(value, tuple):
                    row.append(f"({value[0]}, {value[1]})")
                else:
                    row.append(str(value))
            bwm_json.append(row)

        # Count deviational variables
        count = 0
        a = np.triu(bwm)
        for i in range(len(a)):
            for j in range(len(a)):
                if i == j or a[i][j] == 0:
                    continue
                else:
                    if isinstance(a[i][j], tuple):
                        count += 2
                    else:
                        count += 1

        print(f"Number of deviational variables: {count}")

        # Setup GEKKO optimization
        m = GEKKO(remote=True)
        m.options.SOLVER = 3
        w = m.Array(m.Var, num_factors, lb=0)
        p = m.Array(m.Var, count)
        m.options.SCALING = 1

        # Create equations
        a = np.triu(bwm)
        d = {i: a[i] for i in range(len(a))}

        k = 0
        n = 0
        while n != count:
            for (k, v) in d.items():
                for s in range(len(v)):
                    if k == s:
                        if v[s] == 1:
                            continue
                    if v[s] == 0:
                        continue
                    
                    if isinstance(v[s], tuple):
                        m.Equation(m.log(w[k]) - m.log(w[s]) + p[n] == m.log(d[k][s][0]))
                        m.Equation(m.log(w[k]) - m.log(w[s]) + p[n+1] == m.log(d[k][s][1]))
                        n += 2
                    else:
                        m.Equation(m.log(w[k]) - m.log(w[s]) + p[n] == m.log(d[k][s]))
                        n += 1

        # Add constraint for product of weights
        m.Equation(m.log(np.prod(w)) == 0)

        # Set objective function
        m.Minimize(np.sum(p**2))

        print("Starting optimization")
        # Solve the optimization problem
        try:
            m.solve(disp=False)
            print("Optimization completed successfully")
        except Exception as e:
            print("Optimization failed:", str(e))
            raise

        # Calculate normalized weights
        weights = [float(wi[0]) for wi in w]
        total_sum = sum(weights)
        normalized_weights = [round(wi/total_sum, 4) for wi in weights]

        print("Normalized weights:", normalized_weights)
        print("Optimization objective value:", float(m.options.OBJFCNVAL))

        # Return results
        result = {
            'weights': normalized_weights,
            'ksi_value': float(m.options.OBJFCNVAL),
            'bwm_matrix': bwm_json,
            'best_factor': best_criteria + 1,
            'worst_factor': worst_criteria + 1,
            'best_n': best_n,
            'worst_n': worst_n
        }
        
        print("Returning results:", result)
        return jsonify(result)

    except Exception as e:
        print(f"Error in /solve route: {str(e)}")
        traceback.print_exc()  # This will print the full stack trace
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if os.getenv('FLASK_ENV') == 'development':
        app.run(debug=False)
    else:
        # No need to call app.run() here for production
        pass

