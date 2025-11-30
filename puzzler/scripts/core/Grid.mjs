/**
 * Grid utilities for puzzle generation and manipulation
 */

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 * @param {Array} arr - Array to shuffle
 */
export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

/**
 * Transposes a 2D array
 * @param {number[][]} arr - 2D array to transpose
 * @param {number} n - Size of the array
 * @returns {number[][]} Transposed array
 */
export function transpose(arr, n) {
    const grid = createEmptyGrid(n);
    for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
            grid[x][y] = arr[y][x];
        }
    }
    return grid;
}

/**
 * Creates an empty n×n grid filled with -1
 * @param {number} n - Size of the grid
 * @returns {number[][]} Empty grid
 */
export function createEmptyGrid(n) {
    return Array.from({ length: n }, () => Array(n).fill(-1));
}

/**
 * Generates a valid Latin square of size n
 * @param {number} n - Size of the Latin square
 * @param {boolean} zeroAllowed - If true, uses 0 to n-1 instead of 1 to n
 * @returns {number[][]} Valid Latin square
 */
export function generateLatinSquare(n, zeroAllowed = false) {
    const grid = createEmptyGrid(n);
    
    // Create initial Latin square pattern
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            grid[i][j] = ((i + j) % n) + 1;
        }
    }
    
    // Shuffle rows
    shuffleArray(grid);
    
    // Transpose and shuffle again for more randomness
    const transposed = transpose(grid, n);
    shuffleArray(transposed);
    
    // Adjust for zero-allowed mode
    if (zeroAllowed) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                transposed[i][j] -= 1;
            }
        }
    }
    
    return transposed;
}

/**
 * Checks if a coordinate is within grid bounds
 * @param {[number, number]} coord - [row, col] coordinate
 * @param {number} n - Grid size
 * @returns {boolean} True if coordinate is valid
 */
export function isValidCoord(coord, n) {
    return coord[0] >= 0 && coord[0] < n && coord[1] >= 0 && coord[1] < n;
}

/**
 * Gets all adjacent coordinates (up, down, left, right)
 * @param {[number, number]} coord - [row, col] coordinate
 * @returns {[number, number][]} Array of adjacent coordinates
 */
export function getAdjacent(coord) {
    const [r, c] = coord;
    return [
        [r - 1, c], // up
        [r + 1, c], // down
        [r, c - 1], // left
        [r, c + 1]  // right
    ];
}

/**
 * Checks if two coordinates are adjacent
 * @param {[number, number]} c1 - First coordinate
 * @param {[number, number]} c2 - Second coordinate
 * @returns {boolean} True if adjacent
 */
export function areAdjacent(c1, c2) {
    const dx = Math.abs(c1[0] - c2[0]);
    const dy = Math.abs(c1[1] - c2[1]);
    return (dx + dy) === 1;
}

/**
 * Gets the border direction between two adjacent cells
 * @param {[number, number]} c1 - First coordinate
 * @param {[number, number]} c2 - Second coordinate
 * @returns {string|null} Border direction ('top', 'bottom', 'left', 'right') or null
 */
export function getTangentBorder(c1, c2) {
    const dx = c1[0] - c2[0];
    const dy = c1[1] - c2[1];
    
    if (dx === 1 && dy === 0) return 'top';
    if (dx === -1 && dy === 0) return 'bottom';
    if (dx === 0 && dy === 1) return 'left';
    if (dx === 0 && dy === -1) return 'right';
    return null;
}

/**
 * Deep clones a 2D grid
 * @param {number[][]} grid - Grid to clone
 * @returns {number[][]} Cloned grid
 */
export function cloneGrid(grid) {
    return grid.map(row => [...row]);
}

/**
 * Finds the top-left cell from an array of coordinates
 * @param {[number, number][]} cells - Array of coordinates
 * @returns {[number, number]} Top-left coordinate
 */
export function findTopLeftCell(cells) {
    let best = cells[0];
    for (const cell of cells) {
        if (cell[0] < best[0] || (cell[0] === best[0] && cell[1] < best[1])) {
            best = cell;
        }
    }
    return best;
}

