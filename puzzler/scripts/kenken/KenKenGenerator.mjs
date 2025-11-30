/**
 * KenKen puzzle generation
 */

import { generateLatinSquare, createEmptyGrid, isValidCoord, shuffleArray } from '../core/Grid.mjs';
import { RowColumnUniqueness, CageConstraint, CompositeConstraint } from '../core/Constraint.mjs';
import { Solver, createPossibleValuesMap } from '../core/Solver.mjs';
import { calculateCageValue, validateCagePlacement, getPossibleValuesForCage } from './KenKenConstraints.mjs';

/**
 * Difficulty settings for cage sizes
 */
const DIFFICULTY_CAGE_SIZES = [
    [1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4],           // Easy - reduced single cells
    [1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 5], // Medium - reduced single cells
    [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6] // Hard - no single cells
];

/**
 * Represents a cage in a KenKen puzzle
 */
export class Cage {
    /**
     * @param {number} id - Unique cage identifier
     * @param {[number, number][]} cells - Array of [row, col] coordinates
     * @param {string} operator - Cage operator (+, -, x, /, %, gcd, lcm, HIDE)
     * @param {number} target - Target value
     */
    constructor(id, cells, operator = null, target = null) {
        this.id = id;
        this.cells = cells;
        this.operator = operator;
        this.target = target;
    }
}

/**
 * Represents a complete KenKen puzzle
 */
export class KenKenPuzzle {
    /**
     * @param {number} n - Grid size
     * @param {Cage[]} cages - Array of cages
     * @param {number[][]} solution - Solution grid
     * @param {number} difficulty - Difficulty level (0-2)
     * @param {{mod: boolean, gcd: boolean, lcm: boolean, zero: boolean, hidden: boolean}} specialFlags
     */
    constructor(n, cages, solution, difficulty, specialFlags) {
        this.n = n;
        this.cages = cages;
        this.solution = solution;
        this.difficulty = difficulty;
        this.specialFlags = specialFlags;
        this.hiddenCageId = null;
        this.hiddenValue = null;
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
     * @returns {Cage|null}
     */
    getCageAt(row, col) {
        return this.cages.find(cage => 
            cage.cells.some(([r, c]) => r === row && c === col)
        ) || null;
    }
}

/**
 * Generates cages using BFS-like expansion
 * @param {number} n - Grid size
 * @param {number} difficulty - Difficulty level (0-2)
 * @returns {{cageGrid: number[][], cages: Map<number, [number, number][]>}}
 */
export function generateCages(n, difficulty) {
    const cageGrid = createEmptyGrid(n);
    const cageSizes = DIFFICULTY_CAGE_SIZES[difficulty];
    const cages = new Map();
    
    let slotsLeft = n * n;
    let currentCageId = 0;
    
    while (slotsLeft > 0) {
        // Pick random cage size
        const targetSize = cageSizes[Math.floor(Math.random() * cageSizes.length)];
        
        // Find first empty cell (root of new cage)
        let root = null;
        for (let i = 0; i < n && !root; i++) {
            for (let j = 0; j < n && !root; j++) {
                if (cageGrid[i][j] === -1) {
                    root = [i, j];
                }
            }
        }
        
        if (!root) break;
        
        // BFS expansion from root
        const cageCells = [];
        const queue = [root];
        const directions = [[-1, 0], [0, -1], [1, 0], [0, 1]];
        
        while (queue.length > 0 && cageCells.length < targetSize) {
            const current = queue.shift();
            const [r, c] = current;
            
            // Skip if already assigned
            if (cageGrid[r][c] !== -1) continue;
            
            cageCells.push(current);
            cageGrid[r][c] = currentCageId;
            
            // Add neighbors in random order
            const shuffledDirs = [...directions];
            shuffleArray(shuffledDirs);
            
            for (const [dr, dc] of shuffledDirs) {
                const nr = r + dr;
                const nc = c + dc;
                
                if (isValidCoord([nr, nc], n) && cageGrid[nr][nc] === -1) {
                    queue.push([nr, nc]);
                }
            }
        }
        
        cages.set(currentCageId, cageCells);
        slotsLeft -= cageCells.length;
        currentCageId++;
    }
    
    return { cageGrid, cages };
}

/**
 * Assigns operators and targets to cages
 * @param {number[][]} grid - Solution grid
 * @param {Map<number, [number, number][]>} cages - Cage cells map
 * @param {{mod: boolean, gcd: boolean, lcm: boolean, zero: boolean, hidden: boolean}} specialFlags
 * @returns {{cageObjects: Cage[], hasSpecial: boolean, hiddenCageId: number|null}}
 */
export function assignOperators(grid, cages, specialFlags) {
    const n = grid.length;
    const cageObjects = [];
    let hasSpecial = false;
    let hiddenCageId = null;
    let foundHiddenCandidate = false;

    for (const [id, cells] of cages) {
        // Build operator pool based on cage size and special flags
        let operators = ['+', 'x'];
        
        if (cells.length === 2) {
            operators.push('+', 'x', '-', '-', '-', '/', '/', '/');
            
            if (specialFlags.mod) {
                operators.push('%', '%', '%');
            }
            if (specialFlags.gcd) {
                operators.push('+', 'x', 'gcd', 'gcd');
            }
        }
        
        if (specialFlags.lcm) {
            operators.push('+', 'x', 'lcm', 'lcm');
        }
        
        // Check if any cell is 0 (restricts operators)
        const hasZero = cells.some(([r, c]) => grid[r][c] === 0);
        if (hasZero) {
            operators = ['+', '-', 'x'];
        }
        
        // Try operators until we find a valid one
        let operator, target;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            operator = operators[Math.floor(Math.random() * operators.length)];
            target = calculateCageValue(grid, cells, operator);
            attempts++;
        } while (target === -1 && attempts < maxAttempts);
        
        // Fallback to addition if no valid operator found
        if (target === -1) {
            operator = '+';
            target = cells.reduce((sum, [r, c]) => sum + grid[r][c], 0);
        }
        
        // Check for hidden clue candidate (single cell not on edge)
        if (cells.length === 1 && specialFlags.hidden && !foundHiddenCandidate) {
            const [r, c] = cells[0];
            const isEdge = r === 0 || r === n - 1 || c === 0 || c === n - 1;
            if (!isEdge) {
                operator = 'HIDE';
                hiddenCageId = id;
                foundHiddenCandidate = true;
            }
        }
        
        // Track if special operator used
        if (['%', 'gcd', 'lcm'].includes(operator) && cells.length > 1) {
            hasSpecial = true;
        }
        
        cageObjects.push(new Cage(id, cells, operator, target));
    }
    
    return { cageObjects, hasSpecial, hiddenCageId };
}

/**
 * Creates constraints for solving/validating
 * @param {Cage[]} cages 
 * @param {boolean} zeroAllowed 
 * @returns {CompositeConstraint}
 */
export function createConstraints(cages, zeroAllowed) {
    const composite = new CompositeConstraint();
    composite.add(new RowColumnUniqueness());
    
    for (const cage of cages) {
        composite.add(new CageConstraint(
            cage.cells,
            cage.operator,
            cage.target,
            (values, op, target, isComplete, n) => 
                validateCagePlacement(values, op, target, isComplete, n)
        ));
    }
    
    return composite;
}

/**
 * Precomputes possible values for each cell based on cage constraints
 * @param {number} n 
 * @param {Cage[]} cages 
 * @param {boolean} zeroAllowed 
 * @returns {Map<string, number[]>}
 */
export function precomputePossibleValues(n, cages, zeroAllowed) {
    // Create a cell -> cage map
    const cellToCage = new Map();
    for (const cage of cages) {
        for (const [r, c] of cage.cells) {
            cellToCage.set(`${r}-${c}`, cage);
        }
    }
    
    return createPossibleValuesMap(n, zeroAllowed, (r, c, allValues) => {
        const cage = cellToCage.get(`${r}-${c}`);
        if (!cage) return allValues;
        return getPossibleValuesForCage(n, cage.operator, cage.target, zeroAllowed);
    });
}

/**
 * Validates that hidden clue is uniquely determinable
 * @param {number} n 
 * @param {Cage[]} cages 
 * @param {number} hiddenCageId 
 * @param {number} hiddenValue 
 * @param {boolean} zeroAllowed 
 * @returns {boolean}
 */
export function validateHiddenClue(n, cages, hiddenCageId, hiddenValue, zeroAllowed) {
    const hiddenCage = cages.find(c => c.id === hiddenCageId);
    if (!hiddenCage || hiddenCage.cells.length !== 1) return false;
    
    const [hr, hc] = hiddenCage.cells[0];
    let validCount = 0;
    
    const start = zeroAllowed ? 0 : 1;
    const end = zeroAllowed ? n - 1 : n;
    
    for (let testValue = start; testValue <= end; testValue++) {
        // Create modified cages with test value
        const testCages = cages.map(cage => {
            if (cage.id === hiddenCageId) {
                return new Cage(cage.id, cage.cells, 'HIDE', testValue);
            }
            return cage;
        });
        
        // Check if puzzle has a solution with this value
        const constraints = createConstraints(testCages, zeroAllowed);
        const possibleValues = precomputePossibleValues(n, testCages, zeroAllowed);
        
        // Pre-fill single-cell cages
        const initialGrid = createEmptyGrid(n);
        for (const cage of testCages) {
            if (cage.cells.length === 1) {
                const [r, c] = cage.cells[0];
                initialGrid[r][c] = cage.target;
            }
        }
        
        const solver = new Solver(n, constraints, possibleValues);
        const solutionCount = solver.countSolutions(initialGrid, 1);
        
        if (solutionCount >= 1) {
            validCount++;
            if (validCount > 1) return false;
        }
    }
    
    return validCount === 1;
}

/**
 * Generates a valid KenKen puzzle
 * @param {number} n - Grid size
 * @param {number} difficulty - Difficulty (0-2)
 * @param {{mod: boolean, gcd: boolean, lcm: boolean, zero: boolean, hidden: boolean}} specialFlags
 * @param {number} maxAttempts - Maximum generation attempts
 * @returns {KenKenPuzzle|null}
 */
export function generatePuzzle(n, difficulty, specialFlags, maxAttempts = 100) {
    const needsSpecial = specialFlags.mod || specialFlags.gcd || specialFlags.lcm;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate solution grid
        const solution = generateLatinSquare(n, specialFlags.zero);
        
        // Generate cages
        const { cages } = generateCages(n, difficulty);
        
        // Check for interior single-cell cage if hidden clues needed
        if (specialFlags.hidden) {
            let hasInteriorSingle = false;
            for (const [id, cells] of cages) {
                if (cells.length === 1) {
                    const [r, c] = cells[0];
                    if (r !== 0 && r !== n - 1 && c !== 0 && c !== n - 1) {
                        hasInteriorSingle = true;
                        break;
                    }
                }
            }
            if (!hasInteriorSingle) continue;
        }
        
        // Assign operators
        const { cageObjects, hasSpecial, hiddenCageId } = assignOperators(solution, cages, specialFlags);
        
        // Check special operator requirement
        if (needsSpecial && !hasSpecial) continue;
        
        // Create constraints and solver
        const constraints = createConstraints(cageObjects, specialFlags.zero);
        const possibleValues = precomputePossibleValues(n, cageObjects, specialFlags.zero);
        
        // Pre-fill single-cell cages (except hidden)
        const initialGrid = createEmptyGrid(n);
        for (const cage of cageObjects) {
            if (cage.cells.length === 1 && cage.operator !== 'HIDE') {
                const [r, c] = cage.cells[0];
                initialGrid[r][c] = cage.target;
            }
        }
        
        // Check unique solution
        const solver = new Solver(n, constraints, possibleValues);
        const solutionCount = solver.countSolutions(initialGrid, 2);
        
        if (solutionCount !== 1) continue;
        
        // Validate hidden clue if applicable
        if (specialFlags.hidden && hiddenCageId !== null) {
            const hiddenCage = cageObjects.find(c => c.id === hiddenCageId);
            if (!validateHiddenClue(n, cageObjects, hiddenCageId, hiddenCage.target, specialFlags.zero)) {
                continue;
            }
        }
        
        // Success! Create puzzle object
        const puzzle = new KenKenPuzzle(n, cageObjects, solution, difficulty, specialFlags);
        if (hiddenCageId !== null) {
            const hiddenCage = cageObjects.find(c => c.id === hiddenCageId);
            puzzle.hiddenCageId = hiddenCageId;
            puzzle.hiddenValue = hiddenCage.target;
        }
        
        console.log(`Puzzle generated in ${attempt + 1} attempts`);
        return puzzle;
    }
    
    console.log(`Failed to generate puzzle after ${maxAttempts} attempts`);
    return null;
}

/**
 * Generates a daily puzzle based on date
 * @param {Date} date 
 * @returns {KenKenPuzzle}
 */
export function generateDailyPuzzle(date = new Date()) {
    // Seed based on date
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    const randomValue = (Math.sin(seed) * 10000) % 1;
    const x = Math.floor(Math.abs(randomValue) * 1000);
    
    // Determine puzzle parameters from seed
    const n = (x % 3) + 6; // 6, 7, or 8
    const difficulty = Math.floor(Math.random() * 3);
    const hasHidden = (x % 5) === 0;
    
    const specialFlags = {
        mod: false,
        gcd: false,
        lcm: false,
        zero: false,
        hidden: hasHidden
    };
    
    return generatePuzzle(n, difficulty, specialFlags, 100);
}

