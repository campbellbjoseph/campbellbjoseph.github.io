/**
 * User interaction handling for puzzle games
 */

/**
 * Handles all user input and connects to game state
 */
export class Controls {
    /**
     * @param {import('./GameState.mjs').GameState} state 
     * @param {import('./BoardRenderer.mjs').BoardRenderer} renderer 
     */
    constructor(state, renderer) {
        this.state = state;
        this.renderer = renderer;
        
        // Callbacks for game events
        this.onWin = null;
        this.onMistakesFound = null;
        this.onMistakesCleared = null;
        
        // Bound methods for event listeners
        this._handleKeydown = this._handleKeydown.bind(this);
    }

    /**
     * Initializes all controls and event listeners
     */
    init() {
        // Set up renderer callbacks
        this.renderer.onTileClick = this._handleTileClick.bind(this);
        this.renderer.onTileHover = this._handleTileHover.bind(this);
        this.renderer.onTileLeave = this._handleTileLeave.bind(this);
        this.renderer.onNumberClick = this._handleNumberClick.bind(this);
        
        // Set up keyboard listener
        window.addEventListener('keydown', this._handleKeydown);
    }

    /**
     * Cleans up event listeners
     */
    destroy() {
        window.removeEventListener('keydown', this._handleKeydown);
    }

    /**
     * Handles tile click
     * @param {string} tileId 
     */
    _handleTileClick(tileId) {
        if (this.state.isDeleting) {
            this._deleteTile(tileId);
            return;
        }

        if (this.state.selectedNumber !== null) {
            this._placeTileValue(tileId, this.state.selectedNumber);
        } else {
            // Toggle selection
            if (this.state.selectedTile === tileId) {
                this.renderer.setTileSelected(tileId, false);
                this.state.selectedTile = null;
            } else {
                if (this.state.selectedTile) {
                    this.renderer.setTileSelected(this.state.selectedTile, false);
                }
                this.state.selectedTile = tileId;
                this.renderer.setTileSelected(tileId, true);
            }
        }
    }

    /**
     * Handles tile hover
     * @param {string} tileId 
     */
    _handleTileHover(tileId) {
        this.state.hoveredTile = tileId;
        
        if (this.state.isHoverMode) {
            // Highlight entire cage
            const cage = this.state.getCageAtTile(tileId);
            if (cage) {
                this.state.hoveredCageCells = cage.cells.map(([r, c]) => `${r}-${c}`);
                for (const cellId of this.state.hoveredCageCells) {
                    this.renderer.setTileHovered(cellId, true, this.state.isTakingNotes);
                }
            }
        } else {
            // Default: highlight single tile
            this.renderer.setTileHovered(tileId, true, this.state.isTakingNotes);
        }
    }

    /**
     * Handles tile leave
     * @param {string} tileId 
     */
    _handleTileLeave(tileId) {
        this.state.hoveredTile = null;
        
        if (this.state.isHoverMode && this.state.hoveredCageCells.length > 0) {
            // Clear all cage cell highlights
            for (const cellId of this.state.hoveredCageCells) {
                this.renderer.setTileHovered(cellId, false, this.state.isTakingNotes);
            }
            this.state.hoveredCageCells = [];
        } else {
            // Default: clear single tile
            this.renderer.setTileHovered(tileId, false, this.state.isTakingNotes);
        }
    }

    /**
     * Handles number click
     * @param {number} num 
     */
    _handleNumberClick(num) {
        this._stopDeleting();
        
        if (this.state.selectedTile) {
            this._placeTileValue(this.state.selectedTile, num);
        } else {
            // Toggle number selection
            if (this.state.selectedNumber === num) {
                this.renderer.setNumberSelected(num, false);
                this.state.selectedNumber = null;
            } else {
                if (this.state.selectedNumber !== null) {
                    this.renderer.setNumberSelected(this.state.selectedNumber, false);
                }
                this.state.selectedNumber = num;
                this.renderer.setNumberSelected(num, true);
            }
        }
    }

    /**
     * Places a value on a tile
     * @param {string} tileId 
     * @param {number} value 
     */
    _placeTileValue(tileId, value) {
        if (this.state.isTakingNotes) {
            this._toggleNote(tileId, value);
            return;
        }

        this._resetButtons();
        
        const result = this.state.placeValue(tileId, value);
        if (!result.success) return;
        
        // Update display
        this.renderer.updateTile(tileId, value, result.isError);
        this.renderer.clearNotes(tileId);
        
        // Update affected tiles' notes
        for (const affectedId of result.clearedNotes) {
            const notes = this.state.getNotes(affectedId);
            if (notes.length > 0) {
                this.renderer.renderNotes(affectedId, notes);
            }
        }
        
        // Add undo button
        this.renderer.addUndoButton(() => this._undo());
    }

    /**
     * Toggles a note on a tile
     * @param {string} tileId 
     * @param {number} value 
     */
    _toggleNote(tileId, value) {
        this.state.toggleNote(tileId, value);
        const notes = this.state.getNotes(tileId);
        this.renderer.renderNotes(tileId, notes);
    }

    /**
     * Deletes value from a tile
     * @param {string} tileId 
     */
    _deleteTile(tileId) {
        if (!this.state.isDeleting) return;
        
        if (this.state.clearValue(tileId)) {
            this.renderer.updateTile(tileId, null, false);
        }
    }

    /**
     * Undoes the last action
     */
    _undo() {
        const result = this.state.undo();
        if (!result) return;
        
        // Update the tile
        const value = this.state.getValue(result.tileId);
        this.renderer.updateTile(result.tileId, value, false);
        
        // Restore notes
        const notes = this.state.getNotes(result.tileId);
        if (notes.length > 0) {
            this.renderer.renderNotes(result.tileId, notes);
        }
        
        // Update affected tiles
        for (const affectedId of result.restoredNotes) {
            const affectedNotes = this.state.getNotes(affectedId);
            this.renderer.renderNotes(affectedId, affectedNotes);
        }
        
        this.renderer.removeUndoButton();
    }

    /**
     * Checks for mistakes
     */
    checkMistakes() {
        this._stopDeleting();
        
        if (this.state.puzzle.specialFlags.hidden) {
            // Check hidden clue answer
            const input = document.getElementById('submission');
            if (input && this.state.checkHiddenAnswer(parseInt(input.value))) {
                this._handleWin();
            } else {
                alert('Wrong value for X! Try again!');
            }
            return;
        }
        
        const result = this.state.checkSolution();
        
        // Highlight mistakes
        for (const tileId of result.mistakes) {
            this.renderer.updateTile(tileId, this.state.getValue(tileId), true);
        }
        
        if (result.isComplete && result.mistakes.length === 0) {
            this._handleWin();
            return;
        }
        
        if (result.mistakes.length > 0) {
            this.onMistakesFound?.();
        }
    }

    /**
     * Clears mistake highlighting
     */
    clearMistakes() {
        for (let r = 0; r < this.state.n; r++) {
            for (let c = 0; c < this.state.n; c++) {
                const tileId = `${r}-${c}`;
                const value = this.state.getValue(tileId);
                if (value !== null) {
                    this.renderer.updateTile(tileId, value, false);
                }
            }
        }
        this.onMistakesCleared?.();
    }

    /**
     * Handles win condition
     */
    _handleWin() {
        this.state.isWon = true;
        this.state.pauseTimer();
        
        const time = this.state.getElapsedTime();
        const stats = this._calculateWinStats(time);
        
        if (stats.showFireworks) {
            this.renderer.startFireworks();
        }
        
        this.onWin?.(stats);
    }

    /**
     * Calculates win statistics
     * @param {number} time - Elapsed time in seconds
     * @returns {object}
     */
    _calculateWinStats(time) {
        const n = this.state.n;
        const difficulty = this.state.puzzle.difficulty;
        const needSpecial = this.state.puzzle.specialFlags.mod || 
                           this.state.puzzle.specialFlags.gcd || 
                           this.state.puzzle.specialFlags.lcm ? 1 : 0;
        const zeroAllowed = this.state.puzzle.specialFlags.zero ? 1 : 0;
        
        // Time thresholds by grid size
        const fireCutoff = [0,0,0,10,20,60,100,200,420,500,750,1000,1500];
        const sfCutoff = [0,0,0,15,30,75,120,240,480,600,900,1200,1800];
        const fCutoff = [0,0,0,30,60,120,180,360,660,900,1200,1800,2400];
        const rCutoff = [0,0,0,45,100,180,300,480,900,1200,1800,2400,3600];
        const sCutoff = [0,0,0,75,150,240,390,600,1020,1500,2200,2800,4200];
        
        const multiplier = 1 + 0.2 * difficulty + 0.2 * needSpecial + 0.3 * zeroAllowed;
        
        const fire = Math.pow(fireCutoff[n], multiplier);
        const sf = sfCutoff[n] * multiplier;
        const f = fCutoff[n] * multiplier;
        const r = rCutoff[n] * multiplier;
        const s = sCutoff[n] * multiplier;
        
        let speed = 0;
        let messages;
        
        if (time <= sf) {
            speed = 2;
            messages = ["Super sonic!", "Speed demon!", "Speeeeedy!", "Fast as lightning!", "Speedy Gonzalez!", "Speedster!"];
        } else if (time <= f) {
            speed = 1;
            messages = ["Quick!", "Super star!", "Run Forrest run!", "Heroic.", "Legendary!"];
        } else if (time <= r) {
            speed = 0;
            messages = ["Winner!", "Champ!", "Woooo!", "Too easy.", "Easy $$$", "Superb!", "Puzzle master!", "Gold star for you!", "Money shot!", "Swish!"];
        } else if (time <= s) {
            speed = -1;
            messages = ["Slow and steady wins the race!", "Cool, calm, and collected.", "The glory is in the struggle!", "You showed heart!", "Never give up!", "Way to hang in there"];
        } else {
            speed = -2;
            messages = ["Success is 1% inspiration and 99% perspiration!", "You deserve a break after that!"];
        }
        
        if (this.state.puzzle.specialFlags.hidden) {
            messages.push("X marks the spot!!");
        }
        
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        return {
            message,
            speed,
            showFireworks: time <= fire,
            usedNotes: this.state.usedNotes
        };
    }

    /**
     * Starts delete mode
     */
    startDeleting() {
        if (this.state.isDeleting) return;
        
        this.state.isDeleting = true;
        this.renderer.setButtonIcon('del', `${this.renderer.imagePath}/x.png`);
    }

    /**
     * Stops delete mode
     */
    _stopDeleting() {
        if (!this.state.isDeleting) return;
        
        this.state.isDeleting = false;
        this.renderer.setButtonIcon('del', `${this.renderer.imagePath}/trash.png`);
    }

    /**
     * Starts note mode
     */
    startNotes() {
        if (this.state.isTakingNotes) return;
        
        this.state.isTakingNotes = true;
        this.renderer.setButtonActive('note', true);
        this.renderer.setButtonIcon('note', `${this.renderer.imagePath}/x.png`);
        this.renderer.showNoteModeIndicator(document.getElementById('note-div'));
        this.renderer.addNoteButtons(
            () => this._addAllNotes(),
            () => this._removeAllNotes()
        );
    }

    /**
     * Stops note mode
     */
    _stopNotes() {
        if (!this.state.isTakingNotes) return;
        
        this.state.isTakingNotes = false;
        this.renderer.setButtonActive('note', false);
        this.renderer.setButtonIcon('note', `${this.renderer.imagePath}/pencil.png`);
        this.renderer.hideNoteModeIndicator();
        this.renderer.removeNoteButtons();
    }

    /**
     * Adds all possible notes to selected tile
     */
    _addAllNotes() {
        if (!this.state.selectedTile) return;
        
        this.state.fillAllNotes(this.state.selectedTile);
        const notes = this.state.getNotes(this.state.selectedTile);
        this.renderer.renderNotes(this.state.selectedTile, notes);
    }

    /**
     * Removes all notes from selected tile
     */
    _removeAllNotes() {
        if (!this.state.selectedTile) return;
        
        this.state.clearNotes(this.state.selectedTile);
        this.renderer.clearNotes(this.state.selectedTile);
    }

    /**
     * Fills all empty tiles with all possible notes
     */
    masterAddNotes() {
        if (!confirm('Are you sure you want to fill in every tile?')) return;
        
        for (let r = 0; r < this.state.n; r++) {
            for (let c = 0; c < this.state.n; c++) {
                const tileId = `${r}-${c}`;
                // Skip non-editable cells (given values, hidden clue X cells)
                if (!this.state.isEditable(tileId)) continue;
                
                if (!this.state.getValue(tileId) && this.state.getNotes(tileId).length === 0) {
                    this.state.fillAllNotes(tileId);
                    const notes = this.state.getNotes(tileId);
                    this.renderer.renderNotes(tileId, notes);
                }
            }
        }
    }

    /**
     * Removes all notes from all tiles
     */
    masterRemoveNotes() {
        if (!confirm('Are you sure you want to remove all notes?')) return;
        
        for (let r = 0; r < this.state.n; r++) {
            for (let c = 0; c < this.state.n; c++) {
                const tileId = `${r}-${c}`;
                if (this.state.getNotes(tileId).length > 0) {
                    this.state.clearNotes(tileId);
                    this.renderer.clearNotes(tileId);
                }
            }
        }
    }

    /**
     * Resets the board
     */
    reset() {
        if (!confirm('Are you sure you want to reset?')) return;
        
        this._resetButtons();
        this.state.reset();
        
        // Clear all tiles
        for (let r = 0; r < this.state.n; r++) {
            for (let c = 0; c < this.state.n; c++) {
                const tileId = `${r}-${c}`;
                if (!this.state.givenCells.has(tileId)) {
                    this.renderer.updateTile(tileId, null, false);
                    this.renderer.clearNotes(tileId);
                }
            }
        }
    }

    /**
     * Saves current state
     */
    saveState() {
        this._resetButtons();
        
        if (this.state.savedState) {
            if (!confirm('Are you sure you want to overwrite your save?')) return;
        }
        
        this.state.saveState();
        this.renderer.showSaveIndicator(document.getElementById('title'));
    }

    /**
     * Restores saved state
     */
    restoreState() {
        if (!this.state.savedState) return;
        if (!confirm('Are you sure you want to return to the previous save state?')) return;
        
        this._resetButtons();
        this.state.restoreState();
        this.renderer.hideSaveIndicator();
        
        // Update all tiles
        for (let r = 0; r < this.state.n; r++) {
            for (let c = 0; c < this.state.n; c++) {
                const tileId = `${r}-${c}`;
                if (this.state.givenCells.has(tileId)) continue;
                
                const value = this.state.getValue(tileId);
                const notes = this.state.getNotes(tileId);
                
                this.renderer.updateTile(tileId, value, false);
                if (notes.length > 0) {
                    this.renderer.renderNotes(tileId, notes);
                } else {
                    this.renderer.clearNotes(tileId);
                }
            }
        }
    }

    /**
     * Resets all button modes
     */
    _resetButtons() {
        this._stopDeleting();
        this._stopNotes();
        this.clearMistakes();
    }

    /**
     * Handles keyboard input
     * @param {KeyboardEvent} event 
     */
    _handleKeydown(event) {
        // Number input on hovered tile
        if (this.state.hoveredTile && event.code.startsWith('Digit')) {
            const num = parseInt(event.code[5]);
            const start = this.state.puzzle.specialFlags.zero ? 0 : 1;
            const end = this.state.puzzle.specialFlags.zero ? this.state.n - 1 : this.state.n;
            
            if (num >= start && num <= end) {
                this._placeTileValue(this.state.hoveredTile, num);
            }
            return;
        }
        
        switch (event.code) {
            case 'ShiftLeft':
            case 'ShiftRight':
                this._resetButtons();
                break;
            case 'Enter':
                this.checkMistakes();
                break;
            case 'KeyN':
                if (this.state.isTakingNotes) {
                    this._stopNotes();
                } else {
                    this.startNotes();
                }
                break;
            case 'KeyD':
                if (this.state.isDeleting) {
                    this._stopDeleting();
                } else {
                    this.startDeleting();
                }
                break;
            case 'KeyU':
                this._undo();
                break;
            case 'KeyP':
                this.masterAddNotes();
                break;
            case 'KeyM':
                this.masterRemoveNotes();
                break;
            case 'KeyS':
                this.saveState();
                break;
            case 'KeyR':
                this.restoreState();
                break;
            case 'KeyH':
                this.toggleHoverMode();
                break;
        }
    }

    /**
     * Toggles hover mode (highlight entire cage on hover)
     */
    toggleHoverMode() {
        const isActive = this.state.toggleHoverMode();
        this.renderer.setButtonActive('hover-btn', isActive);
    }

    /**
     * Uses a hint to reveal a random empty cell's correct value
     * Adds a 1-minute time penalty
     */
    useHint() {
        // Get a random empty tile
        const tileId = this.state.getRandomEmptyTile();
        
        if (!tileId) {
            alert('No empty cells remaining!');
            return;
        }
        
        // Confirm with user about penalty
        if (!confirm('Use hint? This will add 1 minute to your time.')) {
            return;
        }
        
        // Add time penalty (60 seconds)
        this.state.addTimePenalty(60);
        
        // Get the correct value for this tile
        const correctValue = this.state.getCorrectValue(tileId);
        
        if (correctValue === null) {
            console.error('Could not get correct value for tile:', tileId);
            return;
        }
        
        // Place the value as if the user entered it
        this._placeTileValue(tileId, correctValue);
    }

    /**
     * Pauses the game
     */
    pause() {
        this.state.pauseTimer();
        this.renderer.showPlayButton(() => this.resume());
    }

    /**
     * Resumes the game
     */
    resume() {
        this.state.resumeTimer();
        this.renderer.showPauseButton(() => this.pause());
    }
}

