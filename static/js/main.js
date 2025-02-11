// Global validation state
let isValid = false;

function setLoadingState(isLoading) {
    const calculateBtn = document.getElementById('calculate-btn');
    const buttonText = document.getElementById('button-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resetBtn = document.getElementById('reset-btn');
    
    calculateBtn.disabled = isLoading;
    resetBtn.disabled = isLoading;
    
    if (isLoading) {
        buttonText.textContent = 'Calculating...';
        loadingSpinner.classList.remove('hidden');
    } else {
        buttonText.textContent = 'Calculate Priority Weights';
        loadingSpinner.classList.add('hidden');
    }
}
// Utility function to create score input dropdown
function createScoreInput(id, name, isDisabled = false) {
    const select = document.createElement('select');
    select.id = id;
    select.name = name;
    select.required = true;
    select.className = isDisabled ? 
        'disabled-field rounded-md border border-gray-300 bg-gray-100' : 
        'rounded-md border border-gray-300';
    select.disabled = isDisabled;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.text = 'Select score between 1 to 9';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.add(placeholder);

    // Add options 1-9 for BWM scale
    for (let i = 1; i <= 9; i++) {
        select.add(new Option(i.toString(), i));
    }

    return select;
}

// Update dropdowns when number of factors changes
function updateDropdowns(numFactors) {
    const bestSelect = document.getElementById('best_factor');
    const worstSelect = document.getElementById('worst_factor');
    
    // Reset dropdowns
    bestSelect.innerHTML = '<option value="">Select best factor</option>';
    worstSelect.innerHTML = '<option value="">Select worst factor</option>';
    
    if (numFactors >= 2) {
        bestSelect.disabled = false;
        worstSelect.disabled = false;
        
        // Add options for each factor
        for (let i = 1; i <= numFactors; i++) {
            bestSelect.add(new Option(`Factor ${i}`, i));
            worstSelect.add(new Option(`Factor ${i}`, i));
        }
    } else {
        // Disable dropdowns if less than 2 factors
        bestSelect.disabled = true;
        worstSelect.disabled = true;
    }

    // Reset form state
    document.getElementById('bo_scores').innerHTML = '';
    document.getElementById('ow_scores').innerHTML = '';
    document.getElementById('results').innerHTML = '';
}

// Update score inputs based on best and worst factor selections
function updateScoreInputs(numFactors) {
    const boScoresDiv = document.getElementById('bo_scores');
    const owScoresDiv = document.getElementById('ow_scores');
    const bestFactor = parseInt(document.getElementById('best_factor').value);
    const worstFactor = parseInt(document.getElementById('worst_factor').value);
    
    // Clear existing score inputs
    boScoresDiv.innerHTML = '';
    owScoresDiv.innerHTML = '';
    
    // Create score inputs for each factor
    for (let i = 1; i <= numFactors; i++) {
        // Create Best-Others (BO) score inputs
        const boDiv = document.createElement('div');
        boDiv.className = 'flex items-center space-x-3 mb-2';
        
        if (i === bestFactor) {
            // Best factor always has score of 1 in BO comparison
            boDiv.innerHTML = `
                <span class="text-sm text-gray-700 w-24">Factor ${i}:</span>
                <select name="bo_score_${i}" disabled class="disabled-field rounded-md border border-gray-300 bg-gray-100">
                    <option value="1">1</option>
                </select>
                <span class="text-sm text-gray-500">(Best factor)</span>
            `;
        } else {
            boDiv.innerHTML = `<span class="text-sm text-gray-700 w-24">Factor ${i}:</span>`;
            const boSelect = createScoreInput(`bo_score_${i}`, `bo_score_${i}`);
            boSelect.onchange = () => updateCorrespondingScore('bo', i, boSelect.value);
            boDiv.appendChild(boSelect);
        }
        boScoresDiv.appendChild(boDiv);
        
        // Create Others-Worst (OW) score inputs
        const owDiv = document.createElement('div');
        owDiv.className = 'flex items-center space-x-3 mb-2';
        
        if (i === worstFactor) {
            // Worst factor always has score of 1 in OW comparison
            owDiv.innerHTML = `
                <span class="text-sm text-gray-700 w-24">Factor ${i}:</span>
                <select name="ow_score_${i}" disabled class="disabled-field rounded-md border border-gray-300 bg-gray-100">
                    <option value="1">1</option>
                </select>
                <span class="text-sm text-gray-500">(Worst factor)</span>
            `;
        } else if (i === bestFactor) {
            // Best factor score in OW is linked to worst factor score in BO
            owDiv.innerHTML = `<span class="text-sm text-gray-700 w-24">Factor ${i}:</span>`;
            const owSelect = createScoreInput(`ow_score_${i}`, `ow_score_${i}`, true);
            owDiv.appendChild(owSelect);
        } else {
            owDiv.innerHTML = `<span class="text-sm text-gray-700 w-24">Factor ${i}:</span>`;
            const owSelect = createScoreInput(`ow_score_${i}`, `ow_score_${i}`);
            owDiv.appendChild(owSelect);
        }
        owScoresDiv.appendChild(owDiv);
    }
}

// Update corresponding scores to maintain consistency
function updateCorrespondingScore(type, factor, value) {
    const bestFactor = parseInt(document.getElementById('best_factor').value);
    const worstFactor = parseInt(document.getElementById('worst_factor').value);
    
    if (type === 'bo' && factor === worstFactor) {
        const owBestSelect = document.getElementById(`ow_score_${bestFactor}`);
        if (owBestSelect) {
            owBestSelect.value = value;
        }
    }
}

// Update worst factor options when best factor is selected
function updateWorstFactorOptions() {
    const bestFactor = document.getElementById('best_factor').value;
    const worstSelect = document.getElementById('worst_factor');
    const numFactors = parseInt(document.getElementById('num_factors').value);
    
    worstSelect.innerHTML = '<option value="">Select worst factor</option>';
    
    for (let i = 1; i <= numFactors; i++) {
        if (i != bestFactor) {
            worstSelect.add(new Option(`Factor ${i}`, i));
        }
    }
    
    // Reset worst factor selection
    worstSelect.value = '';
    
    // Clear existing score inputs
    document.getElementById('bo_scores').innerHTML = '';
    document.getElementById('ow_scores').innerHTML = '';
    document.getElementById('results').innerHTML = '';
}

// Validate factor selections
async function validateFactors() {
    const bestFactor = document.getElementById('best_factor').value;
    const worstFactor = document.getElementById('worst_factor').value;
    
    if (!bestFactor || !worstFactor) return;
    
    try {
        const response = await fetch('/validate-factors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                best_factor: bestFactor,
                worst_factor: worstFactor
            })
        });
        
        const data = await response.json();
        isValid = data.valid;
        
        if (!isValid) {
            alert(data.message);
            document.getElementById('worst_factor').value = '';
        } else {
            const numFactors = parseInt(document.getElementById('num_factors').value);
            updateScoreInputs(numFactors);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error validating factor selections');
    }
}

// Calculate weights

async function calculateWeights(event) {
    event.preventDefault();
    
    if (!isValid) {
        alert('Please ensure all inputs are valid before calculating.');
        return;
    }
    
    const form = document.getElementById('bwm-form');
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    try {
        const response = await fetch('/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }
        
        if (result.weights && result.ksi_value) {
            let resultsHtml = '<div class="space-y-4">';
            
            // Display BWM Matrix
            resultsHtml += '<div class="mb-4"><h3 class="font-bold mb-2">BWM Modified Matrix:</h3><div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300">';
            
            // Add column headers
            resultsHtml += '<tr><th class="border border-gray-300 px-4 py-2"></th>';
            for (let i = 0; i < result.bwm_matrix[0].length; i++) {
                resultsHtml += `<th class="border border-gray-300 px-4 py-2">Factor ${i + 1}</th>`;
            }
            resultsHtml += '</tr>';
            
            // Add matrix rows
            result.bwm_matrix.forEach((row, rowIndex) => {
                resultsHtml += `<tr><th class="border border-gray-300 px-4 py-2">Factor ${rowIndex + 1}</th>`;
                row.forEach(cell => {
                    resultsHtml += `<td class="border border-gray-300 px-4 py-2 text-center">${cell}</td>`;
                });
                resultsHtml += '</tr>';
            });
            resultsHtml += '</table></div></div>';

            // Display Best and Worst Factors
            resultsHtml += `
                <div class="mb-4">
                    <h3 class="font-bold mb-2">Factor Information:</h3>
                    <div class="ml-4">
                        <p>Best Factor: ${result.best_factor}</p>
                        <p>Worst Factor: ${result.worst_factor}</p>
                    </div>
                </div>`;

            // Display Best-Others and Others-Worst Vectors
            resultsHtml += `
                <div class="mb-4">
                    <h3 class="font-bold mb-2">Best-Others Vector:</h3>
                    <pre class="bg-gray-100 p-2 rounded">${JSON.stringify(result.best_n, null, 2)}</pre>
                </div>
                <div class="mb-4">
                    <h3 class="font-bold mb-2">Others-Worst Vector:</h3>
                    <pre class="bg-gray-100 p-2 rounded">${JSON.stringify(result.worst_n, null, 2)}</pre>
                </div>`;

            // Display Weights
            resultsHtml += '<div class="mb-4"><h3 class="font-bold mb-2">Calculated Priority Weights:</h3>';
            result.weights.forEach((weight, index) => {
                resultsHtml += `
                    <div class="flex justify-between items-center py-1 border-b">
                        <span class="font-medium">Factor ${index + 1}:</span>
                        <span>${weight.toFixed(4)}</span>
                    </div>`;
            });
            resultsHtml += '</div>';
            
            // Display Objective Value
            resultsHtml += `
                <div class="mt-4 pt-4 border-t">
                    <div class="flex justify-between items-center">
                        <span class="font-bold">Objective Value (ξ):</span>
                        <span>${result.ksi_value.toFixed(6)}</span>
                    </div>
                </div>
            </div>`;
            
            document.getElementById('results').innerHTML = resultsHtml;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while calculating the weights.');
    }
}
// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Number of factors change
    document.getElementById('num_factors').addEventListener('change', function(e) {
        const numFactors = parseInt(e.target.value) || 0;
        updateDropdowns(numFactors);
        isValid = false;
    });

    // Best factor selection
    document.getElementById('best_factor').addEventListener('change', function() {
        updateWorstFactorOptions();
        isValid = false;
    });

    // Worst factor selection
    document.getElementById('worst_factor').addEventListener('change', function() {
        validateFactors();
    });

    // Form submission
    document.getElementById('bwm-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!isValid) {
            alert('Please ensure all inputs are valid before calculating.');
            return;
        }
        
        // Set loading state
        setLoadingState(true);
        
        // Clear previous results
        document.getElementById('results').innerHTML = '<p class="text-gray-500">Calculating results...</p>';
        
        // Collect all form data
        const formData = new FormData(e.target);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        try {
            const response = await fetch('/solve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.weights && result.ksi_value) {
                let resultsHtml = '<div class="space-y-4">';
    
                // Build BWM Matrix HTML (hidden by default)
                let matrixHtml = '<div class="mb-4"><h3 class="font-bold mb-2">BWM Input Matrix:</h3><div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300">';
                matrixHtml += '<tr><th class="border border-gray-300 px-4 py-2"></th>';
                for (let i = 0; i < result.bwm_matrix[0].length; i++) {
                    matrixHtml += `<th class="border border-gray-300 px-4 py-2">Factor ${i + 1}</th>`;
                }
                matrixHtml += '</tr>';
                result.bwm_matrix.forEach((row, rowIndex) => {
                    matrixHtml += `<tr><th class="border border-gray-300 px-4 py-2">Factor ${rowIndex + 1}</th>`;
                    row.forEach(cell => {
                        matrixHtml += `<td class="border border-gray-300 px-4 py-2 text-center">${cell}</td>`;
                    });
                    matrixHtml += '</tr>';
                });
                matrixHtml += '</table></div></div>';
    
                // Display Priority Weights
                resultsHtml += '<div class="mb-4"><h3 class="font-bold mb-2">Calculated Priority Weights:</h3>';
                result.weights.forEach((weight, index) => {
                    resultsHtml += `
                        <div class="flex justify-between items-center py-1 border-b">
                            <span class="font-medium">Factor ${index + 1}:</span>
                            <span>${weight.toFixed(4)}</span>
                        </div>`;
                });
                resultsHtml += '</div>';
    
                // Display Objective Value
                resultsHtml += `
                    <div class="mt-4 pt-4 border-t">
                        <div class="flex justify-between items-center">
                            <span class="font-bold">Objective Value (ξ):</span>
                            <span>${result.ksi_value.toFixed(6)}</span>
                        </div>
                    </div>`;
    
                // Add Toggle Checkbox and Hidden Matrix
                resultsHtml += `
                    <div class="mt-4">
                        <label class="inline-flex items-center space-x-2">
                            <input type="checkbox" id="showMatrixCheckbox" class="form-checkbox">
                            <span>Show input BWM matrix</span>
                        </label>
                    </div>
                    <div id="bwm-matrix-container" class="hidden">
                        ${matrixHtml}
                    </div>
                `;
    
                resultsHtml += '</div>'; // Close space-y-4 div
                document.getElementById('results').innerHTML = resultsHtml;
    
                // Add event listener for the checkbox
                const checkbox = document.getElementById('showMatrixCheckbox');
                const matrixContainer = document.getElementById('bwm-matrix-container');
                if (checkbox && matrixContainer) {
                    checkbox.addEventListener('change', function() {
                        matrixContainer.classList.toggle('hidden', !this.checked);
                    });
                }
            }
        } catch (error) { 
            console.error('Error:', error);
            alert('An error occurred while calculating the weights.');
            document.getElementById('results').innerHTML = '<p class="text-red-500">An error occurred while calculating the weights.</p>';
        } finally {
            setLoadingState(false);
        }
    });
});