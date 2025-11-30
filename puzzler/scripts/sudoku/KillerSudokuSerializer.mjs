/**
 * Killer Sudoku puzzle serialization - encoding and decoding puzzle IDs
 */

import { createEmptyGrid } from '../core/Grid.mjs';
import { Solver } from '../core/Solver.mjs';
import { 
    KillerCage, 
    KillerSudokuPuzzle, 
    createConstraints, 
    precomputePossibleValues,
    getBoxConfig 
} from './KillerSudokuGenerator.mjs';

// Character sets for encoding (URL-safe)
const CHAR_SET = "ugMyQszjSnLoDBfVOPrTNvYEJmKbRixItceClXqkAFUHdGwZahpW";

/**
 * Encodes a puzzle to a shareable ID string
 * @param {KillerSudokuPuzzle} puzzle 
 * @returns {string} Encoded puzzle ID
 */
export function encode(puzzle) {
    const { n, cages, difficulty } = puzzle;
    
    // Header: n, difficulty
    let encoded = CHAR_SET[n] + CHAR_SET[difficulty] + '-';
    
    // Encode cage grid (which cage each cell belongs to)
    const cageGrid = puzzle.getCageGrid();
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            encoded += CHAR_SET[cageGrid[r][c]];
        }
    }
    encoded += '-';
    
    // Encode cage sums
    for (const cage of cages) {
        // Cage ID
        encoded += CHAR_SET[cage.id];
        // Sum (split for large values)
        const sumLow = cage.target % CHAR_SET.length;
        const sumHigh = Math.floor(cage.target / CHAR_SET.length);
        encoded += CHAR_SET[sumLow] + sumHigh;
        encoded += '*';
    }
    
    return encoded;
}

/**
 * Decodes a puzzle ID string back to a puzzle
 * @param {string} puzzleId 
 * @returns {KillerSudokuPuzzle} Decoded puzzle
 */
export function decode(puzzleId) {
    const parts = puzzleId.split('-');
    
    // Parse header
    const header = parts[0];
    const n = CHAR_SET.indexOf(header[0]);
    const difficulty = CHAR_SET.indexOf(header[1]);
    
    const boxConfig = getBoxConfig(n);
    if (!boxConfig) {
        throw new Error(`Unsupported grid size: ${n}`);
    }
    
    // Parse cage grid
    const cageGridStr = parts[1];
    const cageGrid = createEmptyGrid(n);
    const cageCells = {};
    
    for (let i = 0; i < cageGridStr.length; i++) {
        const r = Math.floor(i / n);
        const c = i % n;
        const cageId = CHAR_SET.indexOf(cageGridStr[i]);
        cageGrid[r][c] = cageId;
        
        if (!cageCells[cageId]) {
            cageCells[cageId] = [];
        }
        cageCells[cageId].push([r, c]);
    }
    
    // Parse cage sums
    const sumsStr = parts[2];
    const sumParts = sumsStr.split('*').filter(s => s.length > 0);
    const cageSums = {};
    
    for (const sumPart of sumParts) {
        const cageId = CHAR_SET.indexOf(sumPart[0]);
        const sumLow = CHAR_SET.indexOf(sumPart[1]);
        const sumHigh = parseInt(sumPart[2]) || 0;
        const target = sumHigh * CHAR_SET.length + sumLow;
        
        cageSums[cageId] = target;
    }
    
    // Build cage objects
    const cages = [];
    for (const [idStr, cells] of Object.entries(cageCells)) {
        const id = parseInt(idStr);
        const target = cageSums[id];
        cages.push(new KillerCage(id, cells, target));
    }
    
    // Solve to get solution
    const constraints = createConstraints(n, boxConfig.rows, boxConfig.cols, cages);
    const possibleValues = precomputePossibleValues(n, cages);
    const initialGrid = createEmptyGrid(n);
    
    const solver = new Solver(n, constraints, possibleValues);
    const solution = solver.solve(initialGrid);
    
    return new KillerSudokuPuzzle(
        n, 
        boxConfig.rows, 
        boxConfig.cols, 
        cages, 
        solution, 
        difficulty
    );
}

/**
 * Parses URL query string to determine puzzle loading mode
 * @param {string} queryString - URL query string (without ?)
 * @returns {{mode: string, params: object}}
 */
export function parseQueryString(queryString) {
    const parts = queryString.split('|');
    const modeIndicator = parseInt(parts[0]);
    
    if (modeIndicator === 0) {
        // Load from puzzle ID
        const puzzleId = parts[1];
        if (!puzzleId || puzzleId.trim() === '') {
            return {
                mode: 'error',
                params: { message: 'No puzzle ID provided' }
            };
        }
        return {
            mode: 'load',
            params: { puzzleId }
        };
    } else {
        // Generate new puzzle
        // Format: n|difficulty
        return {
            mode: 'generate',
            params: {
                n: modeIndicator,
                difficulty: parseInt(parts[1]) || 0
            }
        };
    }
}

/**
 * Creates a URL for a puzzle
 * @param {KillerSudokuPuzzle} puzzle 
 * @returns {string} URL path with query string
 */
export function createPuzzleUrl(puzzle) {
    const id = encode(puzzle);
    return `puzzle.html?0|${id}`;
}

/**
 * Creates a URL for generating a new puzzle with same settings
 * @param {KillerSudokuPuzzle} puzzle 
 * @returns {string} URL path with query string
 */
export function createNewPuzzleUrl(puzzle) {
    const { n, difficulty } = puzzle;
    return `puzzle.html?${n}|${difficulty}`;
}

