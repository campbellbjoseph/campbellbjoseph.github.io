/**
 * Killer Sudoku-specific constraints
 * Cage sums with no-repeat rule
 */

import { Constraint } from '../core/Constraint.mjs';

/**
 * Killer Sudoku cage constraint
 * Sum of values must equal target, and no value can repeat within the cage
 */
export class KillerCageConstraint extends Constraint {
    /**
     * @param {[number, number][]} cells - Cells in this cage
     * @param {number} target - Target sum
     */
    constructor(cells, target) {
        super();
        this.cells = cells;
        this.target = target;
    }

    /**
     * Checks if a coordinate is part of this cage
     * @param {[number, number]} coord - Coordinate to check
     * @returns {boolean} True if coordinate is in this cage
     */
    containsCell(coord) {
        return this.cells.some(c => c[0] === coord[0] && c[1] === coord[1]);
    }

    /**
     * Checks if placing a value in this cage is valid
     * @param {number[][]} grid - Current grid state
     * @param {[number, number]} coord - [row, col] coordinate
     * @param {number} value - Value to place
     * @param {number} n - Grid size
     * @returns {boolean} True if placement is valid
     */
    canPlace(grid, coord, value, n) {
        if (!this.containsCell(coord)) {
            return true; // Not our cage
        }

        // Collect current values in cage
        const values = [];
        for (const cell of this.cells) {
            if (cell[0] === coord[0] && cell[1] === coord[1]) continue;
            if (grid[cell[0]][cell[1]] !== -1) {
                values.push(grid[cell[0]][cell[1]]);
            }
        }

        // Check no-repeat rule: value cannot already exist in cage
        if (values.includes(value)) {
            return false;
        }

        // Add the new value
        values.push(value);
        const isComplete = values.length === this.cells.length;

        return validateKillerCage(values, this.target, isComplete, n);
    }
}

/**
 * Validates a Killer Sudoku cage (sum + uniqueness)
 * @param {number[]} values - Current values in cage
 * @param {number} target - Target sum
 * @param {boolean} isComplete - Whether all cells are filled
 * @param {number} n - Grid size
 * @returns {boolean} True if valid
 */
export function validateKillerCage(values, target, isComplete, n) {
    // Check for duplicates
    const uniqueValues = new Set(values);
    if (uniqueValues.size !== values.length) {
        return false;
    }

    const sum = values.reduce((a, b) => a + b, 0);

    if (isComplete) {
        return sum === target;
    }

    // Partial validation: sum must not exceed target
    if (sum >= target) {
        return false;
    }

    // Check if remaining cells can possibly reach target
    const remaining = target - sum;
    const cellsLeft = values.length; // This would need cage size passed in
    // For now, just check sum doesn't exceed
    
    return true;
}

/**
 * Gets possible values for a cell based on Killer cage constraint
 * @param {number} n - Grid size
 * @param {number} target - Target sum
 * @param {number} cageSize - Number of cells in cage
 * @param {number[]} existingValues - Values already placed in cage
 * @returns {number[]} Possible values
 */
export function getPossibleValuesForKillerCage(n, target, cageSize, existingValues = []) {
    const result = [];
    const currentSum = existingValues.reduce((a, b) => a + b, 0);
    const remainingCells = cageSize - existingValues.length;
    const remainingSum = target - currentSum;

    for (let i = 1; i <= n; i++) {
        // Skip if already in cage
        if (existingValues.includes(i)) continue;

        // Check if this value could be part of a valid sum
        if (i > remainingSum) continue;

        // If this is the last cell, must equal remaining sum exactly
        if (remainingCells === 1) {
            if (i === remainingSum) {
                result.push(i);
            }
            continue;
        }

        // Check if remaining sum minus this value is achievable
        // Minimum possible with (remainingCells - 1) smallest unused values
        // Maximum possible with (remainingCells - 1) largest unused values
        const afterThis = remainingSum - i;
        const cellsAfter = remainingCells - 1;
        
        // Get unused values (excluding i and existingValues)
        const unused = [];
        for (let v = 1; v <= n; v++) {
            if (v !== i && !existingValues.includes(v)) {
                unused.push(v);
            }
        }

        if (unused.length < cellsAfter) continue;

        // Minimum sum: smallest (cellsAfter) unused values
        const minSum = unused.slice(0, cellsAfter).reduce((a, b) => a + b, 0);
        // Maximum sum: largest (cellsAfter) unused values
        const maxSum = unused.slice(-cellsAfter).reduce((a, b) => a + b, 0);

        if (afterThis >= minSum && afterThis <= maxSum) {
            result.push(i);
        }
    }

    return result;
}

/**
 * Calculates valid combinations for a cage
 * Used for hint generation and difficulty analysis
 * @param {number} n - Grid size (max value)
 * @param {number} target - Target sum
 * @param {number} cageSize - Number of cells
 * @returns {number[][]} Array of valid combinations
 */
export function getValidCombinations(n, target, cageSize) {
    const combinations = [];
    
    function backtrack(start, currentCombo, currentSum) {
        if (currentCombo.length === cageSize) {
            if (currentSum === target) {
                combinations.push([...currentCombo]);
            }
            return;
        }
        
        if (currentSum >= target) return;
        if (currentCombo.length + (n - start + 1) < cageSize) return;

        for (let i = start; i <= n; i++) {
            if (currentSum + i > target) break;
            currentCombo.push(i);
            backtrack(i + 1, currentCombo, currentSum + i);
            currentCombo.pop();
        }
    }

    backtrack(1, [], 0);
    return combinations;
}

/**
 * Checks if a sum is achievable with given cage size
 * @param {number} n - Grid size
 * @param {number} target - Target sum
 * @param {number} cageSize - Number of cells
 * @returns {boolean} True if achievable
 */
export function isSumAchievable(n, target, cageSize) {
    if (cageSize > n) return false;
    
    // Minimum sum: 1 + 2 + ... + cageSize
    const minSum = (cageSize * (cageSize + 1)) / 2;
    
    // Maximum sum: (n - cageSize + 1) + ... + n
    const maxSum = (cageSize * (2 * n - cageSize + 1)) / 2;
    
    return target >= minSum && target <= maxSum;
}

