/**
 * Abstract constraint system for puzzle validation
 */

/**
 * Base Constraint class - all constraints inherit from this
 */
export class Constraint {
    /**
     * Checks if placing a value at a coordinate is valid
     * @param {number[][]} grid - Current grid state
     * @param {[number, number]} coord - [row, col] coordinate
     * @param {number} value - Value to place
     * @param {number} n - Grid size
     * @returns {boolean} True if placement is valid
     */
    canPlace(grid, coord, value, n) {
        throw new Error('canPlace must be implemented by subclass');
    }

    /**
     * Gets possible values for a coordinate
     * @param {number} n - Grid size
     * @param {boolean} zeroAllowed - Whether 0 is a valid value
     * @returns {number[]} Array of possible values
     */
    getPossibleValues(n, zeroAllowed) {
        const start = zeroAllowed ? 0 : 1;
        const end = zeroAllowed ? n - 1 : n;
        return Array.from({ length: n }, (_, i) => start + i);
    }
}

/**
 * Row and column uniqueness constraint (Latin square property)
 */
export class RowColumnUniqueness extends Constraint {
    /**
     * Checks if placing a value at a coordinate maintains row/column uniqueness
     * @param {number[][]} grid - Current grid state
     * @param {[number, number]} coord - [row, col] coordinate
     * @param {number} value - Value to place
     * @param {number} n - Grid size
     * @returns {boolean} True if placement is valid
     */
    canPlace(grid, coord, value, n) {
        const [row, col] = coord;
        
        // Check row
        for (let c = 0; c < n; c++) {
            if (c !== col && grid[row][c] === value) {
                return false;
            }
        }
        
        // Check column
        for (let r = 0; r < n; r++) {
            if (r !== row && grid[r][col] === value) {
                return false;
            }
        }
        
        return true;
    }
}

/**
 * Cage constraint for KenKen-style puzzles
 * Delegates actual math to operator-specific functions
 */
export class CageConstraint extends Constraint {
    /**
     * @param {[number, number][]} cells - Cells in this cage
     * @param {string} operator - Operator (+, -, x, /, %, gcd, lcm, HIDE)
     * @param {number} target - Target value
     * @param {Function} validationFn - Function to validate partial/complete cage
     */
    constructor(cells, operator, target, validationFn) {
        super();
        this.cells = cells;
        this.operator = operator;
        this.target = target;
        this.validationFn = validationFn;
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
            return true; // Not our cage, always valid from our perspective
        }

        // Collect current values in cage plus the new value
        const values = [value];
        for (const cell of this.cells) {
            if (cell[0] === coord[0] && cell[1] === coord[1]) continue;
            if (grid[cell[0]][cell[1]] !== -1) {
                values.push(grid[cell[0]][cell[1]]);
            }
        }

        const isComplete = values.length === this.cells.length;
        return this.validationFn(values, this.operator, this.target, isComplete, n);
    }
}

/**
 * Box/subgrid uniqueness constraint (Sudoku property)
 * Ensures each box contains unique values
 */
export class BoxUniqueness extends Constraint {
    /**
     * @param {number} boxRows - Number of rows per box (e.g., 3 for 9x9 Sudoku)
     * @param {number} boxCols - Number of columns per box (e.g., 3 for 9x9 Sudoku)
     */
    constructor(boxRows, boxCols) {
        super();
        this.boxRows = boxRows;
        this.boxCols = boxCols;
    }

    /**
     * Gets the top-left corner of the box containing a coordinate
     * @param {[number, number]} coord - [row, col] coordinate
     * @returns {[number, number]} Top-left corner of the box
     */
    getBoxOrigin(coord) {
        const [row, col] = coord;
        const boxRow = Math.floor(row / this.boxRows) * this.boxRows;
        const boxCol = Math.floor(col / this.boxCols) * this.boxCols;
        return [boxRow, boxCol];
    }

    /**
     * Checks if placing a value at a coordinate maintains box uniqueness
     * @param {number[][]} grid - Current grid state
     * @param {[number, number]} coord - [row, col] coordinate
     * @param {number} value - Value to place
     * @param {number} n - Grid size
     * @returns {boolean} True if placement is valid
     */
    canPlace(grid, coord, value, n) {
        const [boxRow, boxCol] = this.getBoxOrigin(coord);
        const [row, col] = coord;

        // Check all cells in the same box
        for (let r = boxRow; r < boxRow + this.boxRows; r++) {
            for (let c = boxCol; c < boxCol + this.boxCols; c++) {
                if (r === row && c === col) continue;
                if (grid[r][c] === value) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Gets all cells in the same box as the given coordinate
     * @param {[number, number]} coord - [row, col] coordinate
     * @returns {[number, number][]} Array of coordinates in the box
     */
    getBoxCells(coord) {
        const [boxRow, boxCol] = this.getBoxOrigin(coord);
        const cells = [];
        
        for (let r = boxRow; r < boxRow + this.boxRows; r++) {
            for (let c = boxCol; c < boxCol + this.boxCols; c++) {
                cells.push([r, c]);
            }
        }
        
        return cells;
    }
}

/**
 * Composite constraint that combines multiple constraints
 */
export class CompositeConstraint extends Constraint {
    /**
     * @param {Constraint[]} constraints - Array of constraints to combine
     */
    constructor(constraints = []) {
        super();
        this.constraints = constraints;
    }

    /**
     * Adds a constraint to the composite
     * @param {Constraint} constraint - Constraint to add
     */
    add(constraint) {
        this.constraints.push(constraint);
    }

    /**
     * Checks if all constraints allow the placement
     * @param {number[][]} grid - Current grid state
     * @param {[number, number]} coord - [row, col] coordinate
     * @param {number} value - Value to place
     * @param {number} n - Grid size
     * @returns {boolean} True if all constraints allow placement
     */
    canPlace(grid, coord, value, n) {
        return this.constraints.every(c => c.canPlace(grid, coord, value, n));
    }
}

