/**
 * Killer Sudoku puzzle generation
 */

import { createEmptyGrid, isValidCoord, shuffleArray, cloneGrid } from '../core/Grid.mjs';
import { RowColumnUniqueness, BoxUniqueness, CompositeConstraint } from '../core/Constraint.mjs';
import { Solver, createPossibleValuesMap } from '../core/Solver.mjs';
import { KillerCageConstraint, isSumAchievable } from './SudokuConstraints.mjs';

/**
 * Box dimension configurations for different grid sizes
 */
const BOX_CONFIGS = {
    4: { rows: 2, cols: 2 },
    6: { rows: 2, cols: 3 },
    9: { rows: 3, cols: 3 },
    12: { rows: 3, cols: 4 }
};

/**
 * Difficulty settings for cage sizes
 */
const DIFFICULTY_CAGE_SIZES = {
    0: [1, 2, 2, 2, 2, 3, 3, 3],           // Easy - reduced single cells
    1: [2, 2, 2, 3, 3, 3, 4],         // Medium - no single cells
    2: [2, 2, 3, 3, 3, 4, 4, 5]       // Hard - no single cells
};

/**
 * Represents a cage in a Killer Sudoku puzzle
 */
export class KillerCage {
    /**
     * @param {number} id - Unique cage identifier
     * @param {[number, number][]} cells - Array of [row, col] coordinates
     * @param {number} target - Target sum
     */
    constructor(id, cells, target = null) {
        this.id = id;
        this.cells = cells;
        this.target = target;
    }
}

/**
 * Represents a complete Killer Sudoku puzzle
 */
export class KillerSudokuPuzzle {
    /**
     * @param {number} n - Grid size
     * @param {number} boxRows - Rows per box
     * @param {number} boxCols - Columns per box
     * @param {KillerCage[]} cages - Array of cages
     * @param {number[][]} solution - Solution grid
     * @param {number} difficulty - Difficulty level (0-2)
     */
    constructor(n, boxRows, boxCols, cages, solution, difficulty) {
        this.n = n;
        this.boxRows = boxRows;
        this.boxCols = boxCols;
        this.cages = cages;
        this.solution = solution;
        this.difficulty = difficulty;
        
        // For compatibility with UI
        this.specialFlags = {
            mod: false,
            gcd: false,
            lcm: false,
            zero: false,
            hidden: false
        };
    }

    /**
     * Gets the cage grid (cell -> cage id mapping)
     * @returns {number[][]}
     */
    getCageGrid() {
        const grid = createEmptyGrid(this.n);
        for (const cage of this.cages) {
            for (const [r, c] of cage.cells) {
                grid[r][c] = cage.id;
            }
        }
        return grid;
    }

    /**
     * Gets cage by cell coordinate
     * @param {number} row 
     * @param {number} col 
     * @returns {KillerCage|null}
     */
    getCageAt(row, col) {
        return this.cages.find(cage => 
            cage.cells.some(([r, c]) => r === row && c === col)
        ) || null;
    }
}

/**
 * Generates a valid Sudoku grid using backtracking
 * @param {number} n - Grid size
 * @param {number} boxRows - Rows per box
 * @param {number} boxCols - Columns per box
 * @returns {number[][]|null} Valid Sudoku grid or null if failed
 */
export function generateSudokuGrid(n, boxRows, boxCols) {
    const grid = createEmptyGrid(n);
    const rowConstraint = new RowColumnUniqueness();
    const boxConstraint = new BoxUniqueness(boxRows, boxCols);
    
    // Create array of all values and shuffle for randomness
    const values = Array.from({ length: n }, (_, i) => i + 1);
    
    function solve(row, col) {
        if (row === n) {
            return true; // Filled all rows
        }
        
        const nextCol = (col + 1) % n;
        const nextRow = col + 1 === n ? row + 1 : row;
        
        // Shuffle values for this cell
        const shuffledValues = [...values];
        shuffleArray(shuffledValues);
        
        for (const value of shuffledValues) {
            if (rowConstraint.canPlace(grid, [row, col], value, n) &&
                boxConstraint.canPlace(grid, [row, col], value, n)) {
                grid[row][col] = value;
                
                if (solve(nextRow, nextCol)) {
                    return true;
                }
                
                grid[row][col] = -1;
            }
        }
        
        return false;
    }
    
    if (solve(0, 0)) {
        return grid;
    }
    
    return null;
}

/**
 * Generates cages using random BFS expansion
 * Ensures no cage has duplicate values from the solution
 * @param {number[][]} grid - Solution grid
 * @param {number} n - Grid size
 * @param {number} difficulty - Difficulty level (0-2)
 * @returns {{cageGrid: number[][], cages: KillerCage[]}}
 */
export function generateCages(grid, n, difficulty) {
    const cageGrid = createEmptyGrid(n);
    const cages = [];
    const cageSizes = DIFFICULTY_CAGE_SIZES[difficulty] || DIFFICULTY_CAGE_SIZES[0];
    
    let slotsLeft = n * n;
    let currentCageId = 0;
    
    while (slotsLeft > 0) {
        // Pick random cage size
        const targetSize = cageSizes[Math.floor(Math.random() * cageSizes.length)];
        
        // Find first empty cell
        let root = null;
        for (let r = 0; r < n && !root; r++) {
            for (let c = 0; c < n && !root; c++) {
                if (cageGrid[r][c] === -1) {
                    root = [r, c];
                }
            }
        }
        
        if (!root) break;
        
        // BFS expansion - but only add cells with unique values
        const cageCells = [];
        const cageValues = new Set();
        const queue = [root];
        const directions = [[-1, 0], [0, -1], [1, 0], [0, 1]];
        const visited = new Set();
        
        while (queue.length > 0 && cageCells.length < targetSize) {
            const current = queue.shift();
            const [r, c] = current;
            const key = `${r}-${c}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Skip if already assigned to a cage
            if (cageGrid[r][c] !== -1) continue;
            
            // Check if this value would create a duplicate in the cage
            const cellValue = grid[r][c];
            if (cageValues.has(cellValue)) continue;
            
            // Add to cage
            cageCells.push(current);
            cageValues.add(cellValue);
            cageGrid[r][c] = currentCageId;
            
            // Add neighbors in random order
            const shuffledDirs = [...directions];
            shuffleArray(shuffledDirs);
            
            for (const [dr, dc] of shuffledDirs) {
                const nr = r + dr;
                const nc = c + dc;
                const nkey = `${nr}-${nc}`;
                
                if (isValidCoord([nr, nc], n) && 
                    cageGrid[nr][nc] === -1 && 
                    !visited.has(nkey)) {
                    queue.push([nr, nc]);
                }
            }
        }
        
        // Calculate cage sum
        const sum = cageCells.reduce((acc, [r, c]) => acc + grid[r][c], 0);
        
        cages.push(new KillerCage(currentCageId, cageCells, sum));
        slotsLeft -= cageCells.length;
        currentCageId++;
    }
    
    return { cageGrid, cages };
}

/**
 * Creates constraints for solving/validating Killer Sudoku
 * @param {number} n - Grid size
 * @param {number} boxRows - Rows per box
 * @param {number} boxCols - Columns per box
 * @param {KillerCage[]} cages - Array of cages
 * @returns {CompositeConstraint}
 */
export function createConstraints(n, boxRows, boxCols, cages) {
    const composite = new CompositeConstraint();
    
    // Add Sudoku constraints
    composite.add(new RowColumnUniqueness());
    composite.add(new BoxUniqueness(boxRows, boxCols));
    
    // Add cage constraints
    for (const cage of cages) {
        composite.add(new KillerCageConstraint(cage.cells, cage.target));
    }
    
    return composite;
}

/**
 * Precomputes possible values for each cell
 * @param {number} n - Grid size
 * @param {KillerCage[]} cages - Array of cages
 * @returns {Map<string, number[]>}
 */
export function precomputePossibleValues(n, cages) {
    // For Killer Sudoku, all values 1-n are initially possible
    // Cage constraints narrow this down during solving
    return createPossibleValuesMap(n, false, null);
}

/**
 * Generates a valid Killer Sudoku puzzle
 * @param {number} n - Grid size (4, 6, 9, or 12)
 * @param {number} difficulty - Difficulty (0-2)
 * @param {number} maxAttempts - Maximum generation attempts
 * @returns {KillerSudokuPuzzle|null}
 */
export function generatePuzzle(n, difficulty, maxAttempts = 50) {
    const boxConfig = BOX_CONFIGS[n];
    if (!boxConfig) {
        console.error(`Unsupported grid size: ${n}`);
        return null;
    }
    
    const { rows: boxRows, cols: boxCols } = boxConfig;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate valid Sudoku solution
        const solution = generateSudokuGrid(n, boxRows, boxCols);
        if (!solution) continue;
        
        // Generate cages
        const { cages } = generateCages(solution, n, difficulty);
        
        // Verify all cage sums are valid
        let validCages = true;
        for (const cage of cages) {
            if (!isSumAchievable(n, cage.target, cage.cells.length)) {
                validCages = false;
                break;
            }
        }
        if (!validCages) continue;
        
        // Create constraints and verify unique solution
        const constraints = createConstraints(n, boxRows, boxCols, cages);
        const possibleValues = precomputePossibleValues(n, cages);
        const initialGrid = createEmptyGrid(n);
        
        const solver = new Solver(n, constraints, possibleValues);
        const solutionCount = solver.countSolutions(initialGrid, 2);
        
        if (solutionCount !== 1) {
            console.log(`Attempt ${attempt + 1}: ${solutionCount} solutions, retrying...`);
            continue;
        }
        
        console.log(`Puzzle generated in ${attempt + 1} attempts`);
        return new KillerSudokuPuzzle(n, boxRows, boxCols, cages, solution, difficulty);
    }
    
    console.log(`Failed to generate puzzle after ${maxAttempts} attempts`);
    return null;
}

/**
 * Gets box configuration for a grid size
 * @param {number} n - Grid size
 * @returns {{rows: number, cols: number}|null}
 */
export function getBoxConfig(n) {
    return BOX_CONFIGS[n] || null;
}

