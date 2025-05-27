let nutritionData = [];

// Load nutrition data
async function loadNutritionData() {
    try {
        const response = await fetch('nutrition.csv');
        const csvText = await response.text();
        
        const lines = csvText.trim().split('\n');
        // Use the second row (index 1) as headers since the first row is category headers
        const headers = parseCSVLine(lines[1]);
        
        // Start from row 2 (index 2) since we have 2 header rows
        for (let i = 2; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length && values[0] && values[0].trim()) {
                const item = {};
                headers.forEach((header, index) => {
                    if (header) {
                        item[header.trim()] = values[index] ? values[index].trim().replace(/"/g, '') : '';
                    }
                });
                // Only add items that have a name
                if (item.Item && item.Item.trim()) {
                    nutritionData.push(item);
                }
            }
        }
        
        console.log('Loaded nutrition data:', nutritionData.length, 'items');
        populateIngredientOptions();
    } catch (error) {
        console.error('Error loading nutrition data:', error);
        alert('Error loading nutrition data. Please check that nutrition.csv is available.');
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function populateSelectWithCategories(selectElement) {
    // Clear existing options except the first one
    selectElement.innerHTML = '<option value="">Select an ingredient...</option>';
    
    // Group ingredients by category
    const categorizedIngredients = {};
    nutritionData.forEach((item, index) => {
        if (item.Item && item.Category) {
            const category = item.Category.trim();
            if (!categorizedIngredients[category]) {
                categorizedIngredients[category] = [];
            }
            categorizedIngredients[category].push({
                index: index,
                name: item.Item,
                item: item
            });
        }
    });
    
    // Sort categories alphabetically
    const sortedCategories = Object.keys(categorizedIngredients).sort();
    
    // Add each category as an optgroup
    sortedCategories.forEach(category => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        
        // Sort ingredients within each category alphabetically
        const sortedIngredients = categorizedIngredients[category].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        
        sortedIngredients.forEach(ingredient => {
            const option = document.createElement('option');
            option.value = ingredient.index;
            option.textContent = ingredient.name;
            optgroup.appendChild(option);
        });
        
        selectElement.appendChild(optgroup);
    });
}

function populateIngredientOptions() {
    const selects = document.querySelectorAll('.ingredient-select');
    selects.forEach(select => {
        populateSelectWithCategories(select);
        
        // Add event listener to show serving size when ingredient is selected
        select.addEventListener('change', function() {
            updateServingSize(this);
        });
    });
    
    console.log('Populated dropdowns with', nutritionData.length, 'ingredients organized by category');
}

function updateServingSize(selectElement) {
    const ingredientInput = selectElement.closest('.ingredient-input');
    let servingSizeDisplay = ingredientInput.querySelector('.serving-size-display');
    
    if (selectElement.value) {
        const selectedItem = nutritionData[parseInt(selectElement.value)];
        const servingSize = selectedItem['Serving Size'] || 'Not specified';
        
        if (!servingSizeDisplay) {
            servingSizeDisplay = document.createElement('div');
            servingSizeDisplay.className = 'serving-size-display';
            ingredientInput.appendChild(servingSizeDisplay);
        }
        
        servingSizeDisplay.textContent = `Serving size: ${servingSize}`;
        servingSizeDisplay.style.display = 'block';
    } else {
        if (servingSizeDisplay) {
            servingSizeDisplay.style.display = 'none';
        }
    }
}

function addIngredient() {
    const container = document.getElementById('ingredients-container');
    const newIngredient = document.createElement('div');
    newIngredient.className = 'ingredient-input';
    newIngredient.innerHTML = `
        <select class="ingredient-select">
            <option value="">Select an ingredient...</option>
        </select>
        <input type="number" class="ingredient-amount" placeholder="Amount" min="0" step="0.1">
        <button type="button" class="remove-btn" onclick="removeIngredient(this)">Remove</button>
    `;
    container.appendChild(newIngredient);
    
    // Populate the new select with categorized options
    const select = newIngredient.querySelector('.ingredient-select');
    populateSelectWithCategories(select);
    
    // Add event listener for serving size display
    select.addEventListener('change', function() {
        updateServingSize(this);
    });
}

function removeIngredient(button) {
    const container = document.getElementById('ingredients-container');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

function analyzeRecipe() {
    const ingredients = [];
    
    document.querySelectorAll('.ingredient-input').forEach(input => {
        const select = input.querySelector('.ingredient-select');
        const amount = parseFloat(input.querySelector('.ingredient-amount').value);
        
        if (select.value && amount > 0) {
            ingredients.push({
                index: parseInt(select.value),
                amount: amount,
                data: nutritionData[parseInt(select.value)]
            });
        }
    });
    
    if (ingredients.length === 0) {
        alert('Please add at least one ingredient with an amount.');
        return;
    }
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').classList.remove('show');
    
    setTimeout(() => {
        const analysis = calculateNutrition(ingredients);
        displayResults(analysis);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').classList.add('show');
    }, 500);
}

function calculateNutrition(ingredients) {
    const totals = {};
    const nutrientCategories = {
        macronutrients: ['Cals', 'Protein', 'Fats', 'Carbs', 'Fiber'],
        vitamins: ['Vit A', 'Vit B1', 'Vit B2', 'Vit B3', 'Vit B5', 'Vit B6', 'Vit B7', 'Vit B9', 'Vit B12', 'Vit C', 'Vit D', 'Vit E', 'Vit K', 'Choline'],
        minerals: ['Ca', 'Cu', 'Io', 'Fe', 'Mg', 'Mn', 'P', 'K', 'Se', 'Na', 'Zn'],
        phytonutrients: ['Carotenoids', 'Polyphenols', 'Phytosterols', 'Glucosinolates', 'Thiosulfinates', 'Betalains', 'Taurine', 'Ergothionine']
    };
    
    // Initialize totals
    Object.values(nutrientCategories).flat().forEach(nutrient => {
        totals[nutrient] = 0;
    });
    
    // Sum up nutrients from all ingredients
    ingredients.forEach(ingredient => {
        Object.keys(totals).forEach(nutrient => {
            const value = ingredient.data[nutrient];
            if (value && value !== '0%' && value !== '0.0 mg' && value !== '0.0 μg' && value !== '0') {
                // For macronutrients (non-percentage values), parse as numbers
                if (['Cals', 'Protein', 'Fats', 'Carbs', 'Fiber'].includes(nutrient)) {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        totals[nutrient] += numValue * ingredient.amount;
                    }
                }
                // Parse percentage values for vitamins and minerals
                else if (value.includes('%')) {
                    const numValue = parseFloat(value.replace('%', ''));
                    if (!isNaN(numValue)) {
                        totals[nutrient] += numValue * ingredient.amount;
                    }
                } else {
                    // For non-percentage values, assume they're in mg and convert
                    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
                    if (!isNaN(numValue) && numValue > 0) {
                        totals[nutrient] += numValue * ingredient.amount;
                    }
                }
            }
        });
    });
    
    return {
        totals,
        categories: nutrientCategories,
        ingredients: ingredients.map(ing => ing.data.Item)
    };
}

function displayResults(analysis) {
    const { totals, categories, ingredients } = analysis;
    
    // Display summary with intelligent recommendations
    const summaryContent = document.getElementById('summary-content');
    const sufficientNutrients = Object.entries(totals).filter(([nutrient, value]) => {
        // Don't count macronutrients in the "sufficient" calculation since they don't have daily value percentages
        return !['Cals', 'Protein', 'Fats', 'Carbs', 'Fiber'].includes(nutrient) && value >= 20;
    }).length;
    const totalMicronutrients = Object.keys(totals).length - 5; // Subtract macronutrients
    
    // Generate intelligent recommendations
    const recommendations = generateNutrientRecommendations(totals, categories);
    
    summaryContent.innerHTML = `
        <p><strong>Ingredients analyzed:</strong> ${ingredients.join(', ')}</p>
        <p><strong>Micronutrients with good coverage (≥20%):</strong> ${sufficientNutrients} out of ${totalMicronutrients}</p>
        <div class="recommendations">
            <h4>🎯 Personalized Recommendations:</h4>
            ${recommendations}
        </div>
    `;
    
    // Display macronutrients first
    displayMacronutrientCategory('macronutrients-grid', categories.macronutrients, totals);
    
    // Display vitamins
    displayNutrientCategory('vitamins-grid', categories.vitamins, totals);
    
    // Display minerals
    displayNutrientCategory('minerals-grid', categories.minerals, totals);
    
    // Display phytonutrients
    displayNutrientCategory('phytonutrients-grid', categories.phytonutrients, totals);
}

function generateNutrientRecommendations(totals, categories) {
    // Find deficient nutrients (less than 10% for most deficient, less than 20% for moderately deficient)
    const deficientNutrients = [];
    const moderatelyDeficientNutrients = [];
    
    [...categories.vitamins, ...categories.minerals].forEach(nutrient => {
        const value = totals[nutrient] || 0;
        if (value < 10) {
            deficientNutrients.push(nutrient);
        } else if (value < 20) {
            moderatelyDeficientNutrients.push(nutrient);
        }
    });
    
    let recommendations = '';
    
    // High-priority recommendations for most deficient nutrients
    if (deficientNutrients.length > 0) {
        recommendations += `<div class="recommendation-section high-priority">
            <h5>🔴 Most Needed (less than 10% daily value):</h5>`;
        
        deficientNutrients.slice(0, 3).forEach(nutrient => { // Show top 3 most deficient
            const suggestions = getNutrientSuggestions(nutrient);
            recommendations += `<p><strong>${formatNutrientName(nutrient)}:</strong> Try adding ${suggestions}</p>`;
        });
        
        recommendations += `</div>`;
    }
    
    // Medium-priority recommendations
    if (moderatelyDeficientNutrients.length > 0) {
        recommendations += `<div class="recommendation-section medium-priority">
            <h5>🟡 Could Use More (10-20% daily value):</h5>`;
        
        moderatelyDeficientNutrients.slice(0, 2).forEach(nutrient => { // Show top 2 moderate deficiencies
            const suggestions = getNutrientSuggestions(nutrient);
            recommendations += `<p><strong>${formatNutrientName(nutrient)}:</strong> Consider ${suggestions}</p>`;
        });
        
        recommendations += `</div>`;
    }
    
    // If recipe is already well-balanced
    if (deficientNutrients.length === 0 && moderatelyDeficientNutrients.length <= 2) {
        recommendations += `<div class="recommendation-section good-balance">
            <h5>✅ Great job! Your recipe has excellent nutritional diversity.</h5>
            <p>This recipe provides good coverage of most essential vitamins and minerals.</p>
        </div>`;
    }
    
    return recommendations;
}

function getNutrientSuggestions(nutrient) {
    const suggestions = {
        'Vit A': 'beef liver, sweet potato, carrots, or spinach',
        'Vit B1': 'pork loin, sunflower seeds, or pinto beans',
        'Vit B2': 'beef liver, chicken liver, or cottage cheese',
        'Vit B3': 'chicken breast, bluefin tuna, or beef heart',
        'Vit B5': 'chicken liver, beef heart, or avocado',
        'Vit B6': 'chicken breast, pistachios, or salmon',
        'Vit B7': 'chicken liver, sunflower seeds, or eggs',
        'Vit B9': 'beef liver, chicken liver, or spinach',
        'Vit B12': 'beef liver, sardines, or bluefin tuna',
        'Vit C': 'golden kiwi, strawberries, or lemon',
        'Vit D': 'sardines, salmon, or eggs',
        'Vit E': 'sunflower seeds, almonds, or spinach',
        'Vit K': 'kale, spinach, or mustard greens',
        'Choline': 'eggs, beef liver, or chicken liver',
        'Ca': 'sardines, kale, or cottage cheese',
        'Cu': 'beef liver, oysters, or cocoa',
        'Io': 'Eastern oyster, shrimp, or sardines',
        'Fe': 'beef liver, chicken liver, or oysters',
        'Mg': 'almonds, spinach, or cocoa',
        'Mn': 'pineapple, pecans, or spinach',
        'P': 'sardines, chicken liver, or sunflower seeds',
        'K': 'avocado, spinach, or salmon',
        'Se': 'Brazil nuts, sardines, or bluefin tuna',
        'Na': 'sardines, cottage cheese, or olives',
        'Zn': 'oysters, beef liver, or pumpkin seeds'
    };
    
    return suggestions[nutrient] || 'nutrient-dense whole foods';
}

function displayMacronutrientCategory(containerId, nutrients, totals) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    nutrients.forEach(nutrient => {
        const value = totals[nutrient] || 0;
        
        const nutrientDiv = document.createElement('div');
        nutrientDiv.className = 'nutrient-item macronutrient';
        
        // Format the display value with appropriate units
        let displayValue;
        let unitLabel;
        
        switch(nutrient) {
            case 'Cals':
                displayValue = Math.round(value);
                unitLabel = 'calories';
                break;
            case 'Protein':
            case 'Fats':
            case 'Carbs':
            case 'Fiber':
                displayValue = value.toFixed(1);
                unitLabel = 'g';
                break;
            default:
                displayValue = value.toFixed(1);
                unitLabel = '';
        }
        
        nutrientDiv.innerHTML = `
            <div class="nutrient-name">${formatMacronutrientName(nutrient)}</div>
            <div class="nutrient-amount">${displayValue} ${unitLabel}</div>
        `;
        
        container.appendChild(nutrientDiv);
    });
}

function formatMacronutrientName(nutrient) {
    const nameMap = {
        'Cals': 'Calories',
        'Protein': 'Protein',
        'Fats': 'Total Fat',
        'Carbs': 'Carbohydrates',
        'Fiber': 'Dietary Fiber'
    };
    
    return nameMap[nutrient] || nutrient;
}

function displayNutrientCategory(containerId, nutrients, totals) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    nutrients.forEach(nutrient => {
        const value = totals[nutrient] || 0;
        const isSufficient = value >= 20; // 20% or more considered sufficient
        
        const nutrientDiv = document.createElement('div');
        nutrientDiv.className = `nutrient-item ${isSufficient ? 'sufficient' : 'insufficient'}`;
        
        const displayValue = nutrient.includes('Vit') || ['Ca', 'Cu', 'Io', 'Fe', 'Mg', 'Mn', 'P', 'K', 'Se', 'Na', 'Zn'].includes(nutrient) 
            ? `${value.toFixed(1)}%` 
            : `${value.toFixed(1)} mg`;
        
        nutrientDiv.innerHTML = `
            <div class="nutrient-name">${formatNutrientName(nutrient)}</div>
            <div class="nutrient-amount">${displayValue}</div>
        `;
        
        container.appendChild(nutrientDiv);
    });
}

function formatNutrientName(nutrient) {
    const nameMap = {
        'Vit A': 'Vitamin A',
        'Vit B1': 'Vitamin B1 (Thiamin)',
        'Vit B2': 'Vitamin B2 (Riboflavin)',
        'Vit B3': 'Vitamin B3 (Niacin)',
        'Vit B5': 'Vitamin B5 (Pantothenic Acid)',
        'Vit B6': 'Vitamin B6',
        'Vit B7': 'Vitamin B7 (Biotin)',
        'Vit B9': 'Vitamin B9 (Folate)',
        'Vit B12': 'Vitamin B12',
        'Vit C': 'Vitamin C',
        'Vit D': 'Vitamin D',
        'Vit E': 'Vitamin E',
        'Vit K': 'Vitamin K',
        'Ca': 'Calcium',
        'Cu': 'Copper',
        'Io': 'Iodine',
        'Fe': 'Iron',
        'Mg': 'Magnesium',
        'Mn': 'Manganese',
        'P': 'Phosphorus',
        'K': 'Potassium',
        'Se': 'Selenium',
        'Na': 'Sodium',
        'Zn': 'Zinc'
    };
    
    return nameMap[nutrient] || nutrient;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadNutritionData();
}); 