/**
 * Game state management for puzzle games
 */

/**
 * Manages all mutable game state
 */
export class GameState {
    /**
     * @param {import('../kenken/KenKenGenerator.mjs').KenKenPuzzle} puzzle 
     */
    constructor(puzzle) {
        this.puzzle = puzzle;
        this.n = puzzle.n;
        
        // Selection state
        this.selectedTile = null;
        this.selectedNumber = null;
        this.hoveredTile = null;
        
        // Board state - map of "row-col" to placed value
        this.board = new Map();
        
        // Notes - map of "row-col" to Set of candidate values
        this.notes = new Map();
        
        // Given cells (pre-filled single-cell cages)
        this.givenCells = new Set();
        this._initializeGivenCells();
        
        // Undo state
        this.lastAction = null;
        this.affectedTiles = [];
        
        // Save state
        this.savedState = null;
        
        // Game status
        this.isWon = false;
        this.usedNotes = false;
        
        // Timer
        this.startTime = null;
        this.pausedTime = 0;
        this.isPaused = false;
        this.timerInterval = null;
        
        // Mode flags
        this.isDeleting = false;
        this.isTakingNotes = false;
        this.isHoverMode = false;
        this.hoveredCageCells = [];
    }

    /**
     * Toggles hover mode (highlight entire cage on hover)
     * @returns {boolean} New hover mode state
     */
    toggleHoverMode() {
        this.isHoverMode = !this.isHoverMode;
        return this.isHoverMode;
    }

    /**
     * Gets the cage at a given tile
     * @param {string} tileId - "row-col" format
     * @returns {object|null} The cage containing this tile, or null
     */
    getCageAtTile(tileId) {
        const [row, col] = tileId.split('-').map(Number);
        return this.puzzle.cages.find(cage => 
            cage.cells.some(([r, c]) => r === row && c === col)
        ) || null;
    }

    /**
     * Initialize given cells from single-cell cages
     */
    _initializeGivenCells() {
        for (const cage of this.puzzle.cages) {
            if (cage.cells.length === 1) {
                const [r, c] = cage.cells[0];
                const key = `${r}-${c}`;
                this.givenCells.add(key);
                // Don't set board value for hidden cells (they show 'X')
                if (cage.operator !== 'HIDE') {
                    this.board.set(key, cage.target);
                }
            }
        }
    }

    /**
     * Checks if a cell is editable (not a given)
     * @param {string} tileId - "row-col" format
     * @returns {boolean}
     */
    isEditable(tileId) {
        return !this.givenCells.has(tileId);
    }

    /**
     * Gets value at a cell
     * @param {string} tileId 
     * @returns {number|null}
     */
    getValue(tileId) {
        return this.board.get(tileId) ?? null;
    }

    /**
     * Places a value on a cell
     * @param {string} tileId 
     * @param {number} value 
     * @returns {{success: boolean, isError: boolean, clearedNotes: string[]}}
     */
    placeValue(tileId, value) {
        if (!this.isEditable(tileId)) {
            return { success: false, isError: false, clearedNotes: [] };
        }

        const [row, col] = tileId.split('-').map(Number);
        
        // Check for row/column conflicts
        let isError = false;
        for (let i = 0; i < this.n; i++) {
            if (i !== col) {
                const otherVal = this.board.get(`${row}-${i}`);
                if (otherVal === value) isError = true;
            }
            if (i !== row) {
                const otherVal = this.board.get(`${i}-${col}`);
                if (otherVal === value) isError = true;
            }
        }
        
        // Check for box conflicts (Sudoku only)
        if (this.puzzle.boxRows && this.puzzle.boxCols) {
            const boxRowStart = Math.floor(row / this.puzzle.boxRows) * this.puzzle.boxRows;
            const boxColStart = Math.floor(col / this.puzzle.boxCols) * this.puzzle.boxCols;
            for (let r = boxRowStart; r < boxRowStart + this.puzzle.boxRows; r++) {
                for (let c = boxColStart; c < boxColStart + this.puzzle.boxCols; c++) {
                    if (r === row && c === col) continue;
                    const otherVal = this.board.get(`${r}-${c}`);
                    if (otherVal === value) isError = true;
                }
            }
        }
        
        // Check for diagonal conflicts (Sudoku X only)
        if (this.puzzle.specialFlags?.sudokuX) {
            // Main diagonal (row === col)
            if (row === col) {
                for (let i = 0; i < this.n; i++) {
                    if (i !== row) {
                        const otherVal = this.board.get(`${i}-${i}`);
                        if (otherVal === value) isError = true;
                    }
                }
            }
            // Anti-diagonal (row + col === n - 1)
            if (row + col === this.n - 1) {
                for (let i = 0; i < this.n; i++) {
                    if (i !== row) {
                        const otherVal = this.board.get(`${i}-${this.n - 1 - i}`);
                        if (otherVal === value) isError = true;
                    }
                }
            }
        }

        // Store for undo (including any notes that were on this cell)
        const previousNotes = this.notes.has(tileId) 
            ? [...this.notes.get(tileId)] 
            : [];
        this.lastAction = { tileId, value, previousValue: this.board.get(tileId), previousNotes };
        
        // Place value
        this.board.set(tileId, value);
        
        // Clear notes on this cell
        this.notes.delete(tileId);
        
        // Clear conflicting notes in row/column
        const clearedNotes = [];
        if (!isError) {
            for (let i = 0; i < this.n; i++) {
                if (i !== col) {
                    const otherKey = `${row}-${i}`;
                    if (this.removeNoteValue(otherKey, value)) {
                        clearedNotes.push(otherKey);
                    }
                }
                if (i !== row) {
                    const otherKey = `${i}-${col}`;
                    if (this.removeNoteValue(otherKey, value)) {
                        clearedNotes.push(otherKey);
                    }
                }
            }
            
            // Clear conflicting notes in box (Sudoku only)
            if (this.puzzle.boxRows && this.puzzle.boxCols) {
                const boxRowStart = Math.floor(row / this.puzzle.boxRows) * this.puzzle.boxRows;
                const boxColStart = Math.floor(col / this.puzzle.boxCols) * this.puzzle.boxCols;
                for (let r = boxRowStart; r < boxRowStart + this.puzzle.boxRows; r++) {
                    for (let c = boxColStart; c < boxColStart + this.puzzle.boxCols; c++) {
                        if (r === row && c === col) continue;
                        const otherKey = `${r}-${c}`;
                        if (this.removeNoteValue(otherKey, value)) {
                            // Only add if not already in clearedNotes (avoid duplicates from row/col)
                            if (!clearedNotes.includes(otherKey)) {
                                clearedNotes.push(otherKey);
                            }
                        }
                    }
                }
            }
            
            // Clear conflicting notes on diagonals (Sudoku X only)
            if (this.puzzle.specialFlags?.sudokuX) {
                // Main diagonal (row === col)
                if (row === col) {
                    for (let i = 0; i < this.n; i++) {
                        if (i !== row) {
                            const otherKey = `${i}-${i}`;
                            if (this.removeNoteValue(otherKey, value)) {
                                if (!clearedNotes.includes(otherKey)) {
                                    clearedNotes.push(otherKey);
                                }
                            }
                        }
                    }
                }
                // Anti-diagonal (row + col === n - 1)
                if (row + col === this.n - 1) {
                    for (let i = 0; i < this.n; i++) {
                        if (i !== row) {
                            const otherKey = `${i}-${this.n - 1 - i}`;
                            if (this.removeNoteValue(otherKey, value)) {
                                if (!clearedNotes.includes(otherKey)) {
                                    clearedNotes.push(otherKey);
                                }
                            }
                        }
                    }
                }
            }
        }
        // Always set affectedTiles (empty if error, populated if not)
        // This prevents undo from using stale data from previous actions
        this.affectedTiles = clearedNotes;

        return { success: true, isError, clearedNotes };
    }

    /**
     * Clears a cell value
     * @param {string} tileId 
     * @returns {boolean} True if cell was cleared
     */
    clearValue(tileId) {
        if (!this.isEditable(tileId)) return false;
        if (!this.board.has(tileId)) return false;
        
        this.board.delete(tileId);
        return true;
    }

    /**
     * Gets notes for a cell
     * @param {string} tileId 
     * @returns {number[]} Sorted array of note values
     */
    getNotes(tileId) {
        const noteSet = this.notes.get(tileId);
        return noteSet ? [...noteSet].sort((a, b) => a - b) : [];
    }

    /**
     * Adds a note to a cell
     * @param {string} tileId 
     * @param {number} value 
     * @returns {boolean} True if note was added
     */
    addNote(tileId, value) {
        if (!this.isEditable(tileId)) return false;
        if (this.board.has(tileId)) return false;
        
        // Check if value already exists in same row or column
        const [row, col] = tileId.split('-').map(Number);
        for (let i = 0; i < this.n; i++) {
            if (i !== col) {
                const otherVal = this.board.get(`${row}-${i}`);
                if (otherVal === value) return false;
            }
            if (i !== row) {
                const otherVal = this.board.get(`${i}-${col}`);
                if (otherVal === value) return false;
            }
        }
        
        // Check if value already exists in same box (Sudoku only)
        if (this.puzzle.boxRows && this.puzzle.boxCols) {
            const boxRowStart = Math.floor(row / this.puzzle.boxRows) * this.puzzle.boxRows;
            const boxColStart = Math.floor(col / this.puzzle.boxCols) * this.puzzle.boxCols;
            for (let r = boxRowStart; r < boxRowStart + this.puzzle.boxRows; r++) {
                for (let c = boxColStart; c < boxColStart + this.puzzle.boxCols; c++) {
                    if (r === row && c === col) continue;
                    const otherVal = this.board.get(`${r}-${c}`);
                    if (otherVal === value) return false;
                }
            }
        }
        
        // Check if value already exists on same diagonal (Sudoku X only)
        if (this.puzzle.specialFlags?.sudokuX) {
            // Main diagonal (row === col)
            if (row === col) {
                for (let i = 0; i < this.n; i++) {
                    if (i !== row) {
                        const otherVal = this.board.get(`${i}-${i}`);
                        if (otherVal === value) return false;
                    }
                }
            }
            // Anti-diagonal (row + col === n - 1)
            if (row + col === this.n - 1) {
                for (let i = 0; i < this.n; i++) {
                    if (i !== row) {
                        const otherVal = this.board.get(`${i}-${this.n - 1 - i}`);
                        if (otherVal === value) return false;
                    }
                }
            }
        }
        
        this.usedNotes = true;
        
        if (!this.notes.has(tileId)) {
            this.notes.set(tileId, new Set());
        }
        this.notes.get(tileId).add(value);
        return true;
    }

    /**
     * Removes a note from a cell
     * @param {string} tileId 
     * @param {number} value 
     * @returns {boolean} True if note was removed
     */
    removeNote(tileId, value) {
        const noteSet = this.notes.get(tileId);
        if (!noteSet) return false;
        return noteSet.delete(value);
    }

    /**
     * Removes a note value (used when placing values in row/col)
     * @param {string} tileId 
     * @param {number} value 
     * @returns {boolean} True if note existed and was removed
     */
    removeNoteValue(tileId, value) {
        const noteSet = this.notes.get(tileId);
        if (!noteSet || !noteSet.has(value)) return false;
        noteSet.delete(value);
        return true;
    }

    /**
     * Toggles a note on a cell
     * @param {string} tileId 
     * @param {number} value 
     * @returns {boolean} True if note now exists
     */
    toggleNote(tileId, value) {
        const noteSet = this.notes.get(tileId);
        if (noteSet && noteSet.has(value)) {
            noteSet.delete(value);
            return false;
        } else {
            this.addNote(tileId, value);
            return true;
        }
    }

    /**
     * Fills all possible notes for a cell
     * @param {string} tileId 
     */
    fillAllNotes(tileId) {
        if (!this.isEditable(tileId)) return;
        if (this.board.has(tileId)) return;
        
        this.notes.set(tileId, new Set());
        const start = this.puzzle.specialFlags.zero ? 0 : 1;
        const end = this.puzzle.specialFlags.zero ? this.n - 1 : this.n;
        
        for (let i = start; i <= end; i++) {
            this.toggleNote(tileId, i);
        }
    }

    /**
     * Clears all notes for a cell
     * @param {string} tileId 
     */
    clearNotes(tileId) {
        this.notes.delete(tileId);
    }

    /**
     * Undoes the last action
     * @returns {{tileId: string, restoredNotes: string[], cellNotesRestored: boolean}|null}
     */
    undo() {
        if (!this.lastAction) return null;
        
        const { tileId, value, previousValue, previousNotes } = this.lastAction;
        
        // Restore previous value (or clear)
        if (previousValue !== undefined) {
            this.board.set(tileId, previousValue);
        } else {
            this.board.delete(tileId);
        }
        
        // Restore notes that were on this cell before the value was placed
        let cellNotesRestored = false;
        if (previousNotes && previousNotes.length > 0) {
            this.notes.set(tileId, new Set(previousNotes));
            cellNotesRestored = true;
        }
        
        // Restore affected notes in other cells (row/column/box)
        const restoredNotes = [];
        for (const affectedTileId of this.affectedTiles) {
            this.addNote(affectedTileId, value);
            restoredNotes.push(affectedTileId);
        }
        
        this.lastAction = null;
        this.affectedTiles = [];
        
        return { tileId, restoredNotes, cellNotesRestored };
    }

    /**
     * Saves current state
     */
    saveState() {
        this.savedState = {
            board: new Map(this.board),
            notes: new Map(
                [...this.notes.entries()].map(([k, v]) => [k, new Set(v)])
            )
        };
    }

    /**
     * Restores saved state
     * @returns {boolean} True if state was restored
     */
    restoreState() {
        if (!this.savedState) return false;
        
        this.board = new Map(this.savedState.board);
        this.notes = new Map(
            [...this.savedState.notes.entries()].map(([k, v]) => [k, new Set(v)])
        );
        this.savedState = null;
        
        return true;
    }

    /**
     * Checks if current board matches solution
     * @returns {{isComplete: boolean, mistakes: string[]}}
     */
    checkSolution() {
        const mistakes = [];
        let isComplete = true;
        
        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                const key = `${r}-${c}`;
                const value = this.board.get(key);
                const solution = this.puzzle.solution[r][c];
                
                if (value === undefined) {
                    isComplete = false;
                } else if (value !== solution) {
                    mistakes.push(key);
                    isComplete = false;
                }
            }
        }
        
        return { isComplete, mistakes };
    }

    /**
     * Checks hidden clue answer
     * @param {number} guess 
     * @returns {boolean}
     */
    checkHiddenAnswer(guess) {
        return guess === this.puzzle.hiddenValue;
    }

    /**
     * Resets the board to initial state
     */
    reset() {
        this.board.clear();
        this.notes.clear();
        this._initializeGivenCells();
        this.lastAction = null;
        this.affectedTiles = [];
        this.isWon = false;
    }

    /**
     * Gets elapsed time in seconds
     * @returns {number}
     */
    getElapsedTime() {
        if (!this.startTime) return 0;
        if (this.isPaused) return this.pausedTime;
        return Math.floor((Date.now() - this.startTime) / 1000) + this.pausedTime;
    }

    /**
     * Starts the timer
     */
    startTimer() {
        this.startTime = Date.now();
        this.isPaused = false;
    }

    /**
     * Pauses the timer
     */
    pauseTimer() {
        if (!this.isPaused && this.startTime) {
            this.pausedTime = this.getElapsedTime();
            this.isPaused = true;
        }
    }

    /**
     * Resumes the timer
     */
    resumeTimer() {
        if (this.isPaused) {
            this.startTime = Date.now();
            this.isPaused = false;
        }
    }

    /**
     * Formats elapsed time as MM:SS
     * @returns {{minutes: string, seconds: string}}
     */
    getFormattedTime() {
        const total = this.getElapsedTime();
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return {
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0')
        };
    }

    /**
     * Adds a time penalty to the timer
     * @param {number} seconds - Number of seconds to add
     */
    addTimePenalty(seconds) {
        this.pausedTime += seconds;
    }

    /**
     * Gets a random empty tile (not filled, not a given)
     * @returns {string|null} Tile ID in "row-col" format, or null if no empty tiles
     */
    getRandomEmptyTile() {
        const emptyTiles = [];
        
        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                const tileId = `${r}-${c}`;
                // Skip given cells and filled cells
                if (this.givenCells.has(tileId)) continue;
                if (this.board.has(tileId)) continue;
                
                emptyTiles.push(tileId);
            }
        }
        
        if (emptyTiles.length === 0) return null;
        
        // Return a random empty tile
        const randomIndex = Math.floor(Math.random() * emptyTiles.length);
        return emptyTiles[randomIndex];
    }

    /**
     * Gets the correct value for a tile from the solution
     * @param {string} tileId - "row-col" format
     * @returns {number|null} The solution value, or null if invalid
     */
    getCorrectValue(tileId) {
        const [row, col] = tileId.split('-').map(Number);
        if (row < 0 || row >= this.n || col < 0 || col >= this.n) return null;
        return this.puzzle.solution[row][col];
    }
}

