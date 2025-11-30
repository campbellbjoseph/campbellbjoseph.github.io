/**
 * KenKen-specific cage constraints and math operations
 */

/**
 * Computes GCD of two numbers
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
export function gcd(x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x;
}

/**
 * Computes LCM of two numbers
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
export function lcm(x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    return (x * y) / gcd(x, y);
}

/**
 * Computes GCD of an array of numbers
 * @param {number[]} values 
 * @returns {number}
 */
export function gcdArray(values) {
    return values.reduce((acc, val) => gcd(acc, val));
}

/**
 * Computes LCM of an array of numbers
 * @param {number[]} values 
 * @returns {number}
 */
export function lcmArray(values) {
    return values.reduce((acc, val) => lcm(acc, val));
}

/**
 * Evaluates if a complete cage satisfies the constraint
 * @param {number[]} values - All values in the cage
 * @param {string} operator - Cage operator
 * @param {number} target - Target value
 * @returns {boolean}
 */
export function evaluateCageComplete(values, operator, target) {
    if (values.length === 0) return false;

    switch (operator) {
        case '+':
            return values.reduce((a, b) => a + b, 0) === target;
        
        case '-': {
            if (values.length !== 2) return false;
            const [a, b] = values;
            return Math.abs(a - b) === target;
        }
        
        case 'x':
            return values.reduce((a, b) => a * b, 1) === target;
        
        case '/': {
            if (values.length !== 2) return false;
            const big = Math.max(...values);
            const small = Math.min(...values);
            return small !== 0 && big % small === 0 && big / small === target;
        }
        
        case '%': {
            if (values.length !== 2) return false;
            const big = Math.max(...values);
            const small = Math.min(...values);
            return small !== 0 && big % small === target;
        }
        
        case 'gcd':
            if (values.includes(0)) return false;
            return gcdArray(values) === target;
        
        case 'lcm':
            if (values.includes(0)) return false;
            return lcmArray(values) === target;
        
        case 'HIDE':
            // Single cell with hidden value - just check the value matches
            return values.length === 1 && values[0] === target;
        
        default:
            return false;
    }
}

/**
 * Validates partial cage placement (used during solving)
 * @param {number[]} values - Current values in cage
 * @param {string} operator - Cage operator
 * @param {number} target - Target value
 * @param {boolean} isComplete - Whether all cells in cage are filled
 * @param {number} n - Grid size
 * @returns {boolean}
 */
export function validateCagePlacement(values, operator, target, isComplete, n) {
    if (values.length === 0) return true;

    // Handle zero in special operations
    if (values.includes(0)) {
        if (operator === '/' || operator === '%' || operator === 'gcd' || operator === 'lcm') {
            return false;
        }
    }

    if (isComplete) {
        return evaluateCageComplete(values, operator, target);
    }

    // Partial validation
    switch (operator) {
        case '+': {
            const sum = values.reduce((a, b) => a + b, 0);
            return sum <= target;
        }
        
        case '-': {
            // For partial (1 value), check if target is achievable
            if (values.length === 1) {
                const v = values[0];
                // Other value could be v + target or v - target
                const a = v + target;
                const b = v - target;
                return a <= n || b >= (n > 0 ? 1 : 0);
            }
            return true;
        }
        
        case 'x': {
            const product = values.reduce((a, b) => a * b, 1);
            // Product can't exceed target (unless zero is involved and target is 0)
            if (target === 0) {
                return values.includes(0) || product <= n ** values.length;
            }
            return product <= target && target % product === 0;
        }
        
        case '/': {
            if (values.length === 1) {
                const v = values[0];
                // Check if v * target <= n or v % target === 0
                return v * target <= n || (v !== 0 && v % target === 0);
            }
            return true;
        }
        
        case '%': {
            // Partial modulo: both values must be > target for remainder to be target
            if (values.length === 1) {
                return values[0] > target || values[0] === 0;
            }
            return true;
        }
        
        case 'gcd': {
            // GCD of partial values must be divisible by target
            if (values.includes(0)) return false;
            const g = gcdArray(values);
            return g % target === 0;
        }
        
        case 'lcm': {
            // Target must be divisible by LCM of partial values
            if (values.includes(0)) return false;
            const l = lcmArray(values);
            return target % l === 0;
        }
        
        case 'HIDE':
            // Hidden single-cell cage
            return values.length <= 1;
        
        default:
            return true;
    }
}

/**
 * Gets possible values for a cell based on cage constraint
 * @param {number} n - Grid size
 * @param {string} operator - Cage operator
 * @param {number} target - Target value
 * @param {boolean} zeroAllowed - Whether 0 is allowed
 * @returns {number[]} Possible values
 */
export function getPossibleValuesForCage(n, operator, target, zeroAllowed) {
    const start = zeroAllowed ? 0 : 1;
    const end = zeroAllowed ? n - 1 : n;
    const result = [];

    for (let i = start; i <= end; i++) {
        let valid = true;

        switch (operator) {
            case 'x':
                // Value must divide target (or target is 0 and value is 0)
                valid = (target === 0 && i === 0) || (target !== 0 && target % i === 0);
                break;
            
            case '/':
                // Value times target <= n, or value divisible by target
                valid = i !== 0 && (i * target <= n || i % target === 0);
                break;
            
            case 'gcd':
                // Value must be divisible by target
                valid = i !== 0 && i % target === 0;
                break;
            
            case 'lcm':
                // Target must be divisible by value
                valid = i !== 0 && target % i === 0;
                break;
            
            case '%':
                // Value must be > target (as smaller number) or could be the larger
                valid = i !== 0 && i > target;
                break;
            
            default:
                // +, -, HIDE allow all values
                valid = true;
        }

        if (valid) {
            result.push(i);
        }
    }

    return result;
}

/**
 * Calculates the cage value from a grid
 * @param {number[][]} grid - Solution grid
 * @param {[number, number][]} cells - Cage cells
 * @param {string} operator - Operator to use
 * @returns {number} Calculated value, or -1 if invalid
 */
export function calculateCageValue(grid, cells, operator) {
    const values = cells.map(([r, c]) => grid[r][c]);

    switch (operator) {
        case '+':
            return values.reduce((a, b) => a + b, 0);
        
        case '-': {
            if (values.length !== 2) return -1;
            return Math.abs(values[0] - values[1]);
        }
        
        case 'x':
            return values.reduce((a, b) => a * b, 1);
        
        case '/': {
            if (values.length !== 2) return -1;
            const big = Math.max(...values);
            const small = Math.min(...values);
            if (small === 0 || big % small !== 0) return -1;
            return big / small;
        }
        
        case '%': {
            if (values.length !== 2) return -1;
            const big = Math.max(...values);
            const small = Math.min(...values);
            if (small === 0 || big * small === 0) return -1;
            // Skip if result would be 0 (too easy) - random chance
            if (big % small === 0 && Math.random() > 0.2) return -1;
            return big % small;
        }
        
        case 'gcd': {
            if (values.includes(0)) return -1;
            const result = gcdArray(values);
            // Skip if result is 1 (too common) - random chance
            if (result === 1 && Math.random() > 0.2) return -1;
            return result;
        }
        
        case 'lcm': {
            if (values.includes(0)) return -1;
            return lcmArray(values);
        }
        
        case 'HIDE':
            return values.length === 1 ? values[0] : -1;
        
        default:
            return -1;
    }
}

