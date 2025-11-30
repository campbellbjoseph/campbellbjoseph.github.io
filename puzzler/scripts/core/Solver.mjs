/**
 * Generic backtracking solver for grid-based puzzles
 */

import { cloneGrid } from './Grid.mjs';

/**
 * Backtracking puzzle solver
 */
export class Solver {
    /**
     * @param {number} n - Grid size
     * @param {import('./Constraint.mjs').Constraint} constraint - Constraint to validate placements
     * @param {Map<string, number[]>} possibleValues - Map of "row-col" to possible values
     */
    constructor(n, constraint, possibleValues) {
        this.n = n;
        this.constraint = constraint;
        this.possibleValues = possibleValues;
    }

    /**
     * Finds the first empty cell in the grid
     * @param {number[][]} grid - Current grid state
     * @returns {[number, number]|null} Coordinate of empty cell or null if complete
     */
    findEmptyCell(grid) {
        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                if (grid[r][c] === -1) {
                    return [r, c];
                }
            }
        }
        return null;
    }

    /**
     * Solves the puzzle and returns the solution
     * @param {number[][]} grid - Initial grid state
     * @returns {number[][]|null} Solution grid or null if no solution
     */
    solve(grid) {
        const workingGrid = cloneGrid(grid);
        return this._solveRecursive(workingGrid);
    }

    /**
     * Recursive solving helper
     * @param {number[][]} grid - Current grid state
     * @returns {number[][]|null} Solution or null
     */
    _solveRecursive(grid) {
        const emptyCell = this.findEmptyCell(grid);
        
        if (!emptyCell) {
            // Grid is complete
            return grid;
        }

        const [r, c] = emptyCell;
        const key = `${r}-${c}`;
        const values = this.possibleValues.get(key) || [];

        for (const value of values) {
            if (this.constraint.canPlace(grid, [r, c], value, this.n)) {
                grid[r][c] = value;
                
                const result = this._solveRecursive(grid);
                if (result) {
                    return result;
                }
                
                grid[r][c] = -1;
            }
        }

        return null;
    }

    /**
     * Counts the number of solutions (stops early if > max)
     * @param {number[][]} grid - Initial grid state
     * @param {number} max - Maximum solutions to count before stopping
     * @returns {number} Number of solutions found (capped at max + 1)
     */
    countSolutions(grid, max = 2) {
        const workingGrid = cloneGrid(grid);
        return this._countRecursive(workingGrid, max, { count: 0 });
    }

    /**
     * Recursive solution counting helper
     * @param {number[][]} grid - Current grid state
     * @param {number} max - Maximum to count
     * @param {{count: number}} counter - Counter object
     * @returns {number} Current count
     */
    _countRecursive(grid, max, counter) {
        if (counter.count > max) {
            return counter.count;
        }

        const emptyCell = this.findEmptyCell(grid);
        
        if (!emptyCell) {
            // Grid is complete - found a solution
            counter.count++;
            return counter.count;
        }

        const [r, c] = emptyCell;
        const key = `${r}-${c}`;
        const values = this.possibleValues.get(key) || [];

        for (const value of values) {
            if (counter.count > max) {
                break;
            }

            if (this.constraint.canPlace(grid, [r, c], value, this.n)) {
                grid[r][c] = value;
                this._countRecursive(grid, max, counter);
                grid[r][c] = -1;
            }
        }

        return counter.count;
    }
}

/**
 * Creates a map of possible values for each cell based on constraints
 * @param {number} n - Grid size
 * @param {boolean} zeroAllowed - Whether 0 is allowed
 * @param {Function} filterFn - Optional function to filter values per cell: (row, col, values) => filteredValues
 * @returns {Map<string, number[]>} Map of "row-col" to possible values
 */
export function createPossibleValuesMap(n, zeroAllowed, filterFn = null) {
    const map = new Map();
    const start = zeroAllowed ? 0 : 1;
    const end = zeroAllowed ? n - 1 : n;
    const allValues = Array.from({ length: n }, (_, i) => start + i);

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const key = `${r}-${c}`;
            const values = filterFn ? filterFn(r, c, [...allValues]) : [...allValues];
            map.set(key, values);
        }
    }

    return map;
}

