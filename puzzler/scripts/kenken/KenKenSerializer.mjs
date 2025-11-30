/**
 * KenKen puzzle serialization - encoding and decoding puzzle IDs
 */

import { createEmptyGrid } from '../core/Grid.mjs';
import { Cage, KenKenPuzzle, createConstraints, precomputePossibleValues } from './KenKenGenerator.mjs';
import { Solver } from '../core/Solver.mjs';

// Character sets for encoding (URL-safe)
const CHAR_SET = "ugMyQszjSnLoDBfVOPrTNvYEJmKbRixItceClXqkAFUHdGwZahpW";
const OP_CHAR_SET = "PprTndbsGOWQCgxUkFfqEMDXLwHuvmVihcjyIztBRKNAoSZaeYlJ";

// Operator to character mapping
const OP_TO_CHAR = {
    '+': 'q',
    'x': 'p',
    '-': 'G',
    '/': 'e',
    'gcd': 'k',
    'lcm': 'Z',
    '%': 'W',
    'HIDE': 'h'
};

// Character to operator mapping (reverse)
const CHAR_TO_OP = Object.fromEntries(
    Object.entries(OP_TO_CHAR).map(([k, v]) => [v, k])
);

/**
 * Encodes a puzzle to a shareable ID string
 * @param {KenKenPuzzle} puzzle 
 * @returns {string} Encoded puzzle ID
 */
export function encode(puzzle) {
    const { n, cages, difficulty, specialFlags } = puzzle;
    
    // First 3 characters: n, difficulty, special flags
    let encoded = CHAR_SET[n] + CHAR_SET[difficulty];
    
    // Encode special flags as 5-bit binary
    const flagBits = 
        (specialFlags.mod ? 1 : 0) * 16 +
        (specialFlags.gcd ? 1 : 0) * 8 +
        (specialFlags.lcm ? 1 : 0) * 4 +
        (specialFlags.zero ? 1 : 0) * 2 +
        (specialFlags.hidden ? 1 : 0);
    encoded += CHAR_SET[flagBits] + '-';
    
    // Encode cage grid (which cage each cell belongs to)
    const cageGrid = puzzle.getCageGrid();
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            encoded += CHAR_SET[cageGrid[r][c]];
        }
    }
    encoded += '-';
    
    // Encode cage operators and values
    for (const cage of cages) {
        // Cage ID
        encoded += OP_CHAR_SET[cage.id];
        // Operator
        encoded += OP_TO_CHAR[cage.operator];
        // Value (split into low and high parts for large values)
        const valueLow = cage.target % OP_CHAR_SET.length;
        const valueHigh = Math.floor(cage.target / OP_CHAR_SET.length);
        encoded += OP_CHAR_SET[valueLow] + valueHigh;
        encoded += '*';
    }
    
    return encoded;
}

/**
 * Decodes a puzzle ID string back to a puzzle
 * @param {string} puzzleId 
 * @returns {KenKenPuzzle} Decoded puzzle
 */
export function decode(puzzleId) {
    const parts = puzzleId.split('-');
    
    // Parse header (first part)
    const header = parts[0];
    const n = CHAR_SET.indexOf(header[0]);
    const difficulty = CHAR_SET.indexOf(header[1]);
    
    // Parse special flags
    const flagBits = CHAR_SET.indexOf(header[2]);
    const flagBinary = flagBits.toString(2).padStart(5, '0');
    const specialFlags = {
        mod: flagBinary[0] === '1',
        gcd: flagBinary[1] === '1',
        lcm: flagBinary[2] === '1',
        zero: flagBinary[3] === '1',
        hidden: flagBinary[4] === '1'
    };
    
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
    
    // Parse cage operators and values
    const opsStr = parts[2];
    const opParts = opsStr.split('*').filter(s => s.length > 0);
    const cageOperators = {};
    
    for (const opPart of opParts) {
        const cageId = OP_CHAR_SET.indexOf(opPart[0]);
        const operator = CHAR_TO_OP[opPart[1]];
        const valueLow = OP_CHAR_SET.indexOf(opPart[2]);
        const valueHigh = parseInt(opPart[3]) || 0;
        const target = valueHigh * OP_CHAR_SET.length + valueLow;
        
        cageOperators[cageId] = { operator, target };
    }
    
    // Build cage objects
    const cages = [];
    let hiddenCageId = null;
    let hiddenValue = null;
    
    for (const [idStr, cells] of Object.entries(cageCells)) {
        const id = parseInt(idStr);
        const { operator, target } = cageOperators[id];
        cages.push(new Cage(id, cells, operator, target));
        
        if (operator === 'HIDE') {
            hiddenCageId = id;
            hiddenValue = target;
        }
    }
    
    // Solve to get solution
    const constraints = createConstraints(cages, specialFlags.zero);
    const possibleValues = precomputePossibleValues(n, cages, specialFlags.zero);
    
    // Pre-fill single-cell cages
    const initialGrid = createEmptyGrid(n);
    for (const cage of cages) {
        if (cage.cells.length === 1) {
            const [r, c] = cage.cells[0];
            initialGrid[r][c] = cage.target;
        }
    }
    
    const solver = new Solver(n, constraints, possibleValues);
    const solution = solver.solve(initialGrid);
    
    const puzzle = new KenKenPuzzle(n, cages, solution, difficulty, specialFlags);
    puzzle.hiddenCageId = hiddenCageId;
    puzzle.hiddenValue = hiddenValue;
    
    return puzzle;
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
        // Load from puzzle ID - validate that ID exists
        const puzzleId = parts[1];
        if (!puzzleId || puzzleId.trim() === '') {
            return {
                mode: 'error',
                params: {
                    message: 'No puzzle ID provided'
                }
            };
        }
        return {
            mode: 'load',
            params: {
                puzzleId: puzzleId
            }
        };
    } else if (modeIndicator === 1) {
        // Daily puzzle
        return {
            mode: 'daily',
            params: {}
        };
    } else {
        // Generate new puzzle
        return {
            mode: 'generate',
            params: {
                n: modeIndicator,
                difficulty: parseInt(parts[1]) || 0,
                mod: parts[2] === '1',
                gcd: parts[3] === '1',
                lcm: parts[4] === '1',
                zero: parts[5] === '1',
                hidden: parts[6] === '1'
            }
        };
    }
}

/**
 * Creates a URL for a puzzle
 * @param {KenKenPuzzle} puzzle 
 * @returns {string} URL path with query string
 */
export function createPuzzleUrl(puzzle) {
    const id = encode(puzzle);
    return `puzzle.html?0|${id}`;
}

/**
 * Creates a URL for generating a new puzzle with same settings
 * @param {KenKenPuzzle} puzzle 
 * @returns {string} URL path with query string
 */
export function createNewPuzzleUrl(puzzle) {
    const { n, difficulty, specialFlags } = puzzle;
    const params = [
        n,
        difficulty,
        specialFlags.mod ? 1 : 0,
        specialFlags.gcd ? 1 : 0,
        specialFlags.lcm ? 1 : 0,
        specialFlags.zero ? 1 : 0,
        specialFlags.hidden ? 1 : 0
    ];
    return `puzzle.html?${params.join('|')}`;
}

