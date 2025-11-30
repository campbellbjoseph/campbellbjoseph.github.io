/**
 * DOM rendering for puzzle board and UI elements
 */

import { findTopLeftCell, areAdjacent, getTangentBorder } from '../core/Grid.mjs';

/**
 * Renders the puzzle board and UI elements
 */
export class BoardRenderer {
    /**
     * @param {import('../kenken/KenKenGenerator.mjs').KenKenPuzzle} puzzle
     * @param {import('./GameState.mjs').GameState} state
     * @param {object} options - Optional configuration
     */
    constructor(puzzle, state, options = {}) {
        this.puzzle = puzzle;
        this.state = state;
        this.n = puzzle.n;
        
        // Sudoku box dimensions (if applicable)
        this.boxRows = puzzle.boxRows || null;
        this.boxCols = puzzle.boxCols || null;
        
        // Image base path (for different folder structures)
        this.imagePath = options.imagePath || '../puzzler/images';
        
        // DOM element references
        this.boardEl = null;
        this.digitsEl = null;
        this.buttonsEl = null;
        this.timerEl = null;
        
        // Callbacks
        this.onTileClick = null;
        this.onTileHover = null;
        this.onTileLeave = null;
        this.onNumberClick = null;
    }

    /**
     * Initializes the board container
     * @param {HTMLElement} boardContainer 
     */
    initBoard(boardContainer) {
        this.boardEl = boardContainer;
        this.boardEl.innerHTML = '';
        
        // Set board size
        const tileSize = this.n <= 10 ? 75 : 65;
        this.boardEl.style.width = `${tileSize * this.n}px`;
        this.boardEl.style.height = `${tileSize * this.n}px`;
    }

    /**
     * Renders all tiles on the board
     */
    renderBoard() {
        const tiles = [];
        
        for (const cage of this.puzzle.cages) {
            const cageTiles = this._createCageTiles(cage);
            tiles.push(...cageTiles);
        }
        
        // Sort tiles by position and append
        tiles.sort((a, b) => {
            const [ar, ac] = a.id.split('-').map(Number);
            const [br, bc] = b.id.split('-').map(Number);
            return ar !== br ? ar - br : ac - bc;
        });
        
        for (const tile of tiles) {
            this.boardEl.appendChild(tile);
        }
    }

    /**
     * Creates tiles for a cage
     * @param {import('../kenken/KenKenGenerator.mjs').Cage} cage 
     * @returns {HTMLElement[]}
     */
    _createCageTiles(cage) {
        const tiles = [];
        const isSingleCell = cage.cells.length === 1;
        const isHidden = cage.operator === 'HIDE';
        const bestCell = findTopLeftCell(cage.cells);
        
        for (const [r, c] of cage.cells) {
            const tile = document.createElement('div');
            tile.id = `${r}-${c}`;
            tile.classList.add('tile');
            
            // Determine borders
            const thickBorders = this._getCageBorders(cage.cells, [r, c]);
            for (const border of thickBorders) {
                tile.classList.add(`thick-${border}`);
            }
            
            // Edge borders
            if (r === 0) tile.classList.add('thicc-top');
            if (r === this.n - 1) tile.classList.add('thicc-bottom');
            if (c === 0) tile.classList.add('thicc-left');
            if (c === this.n - 1) tile.classList.add('thicc-right');
            
            // Sudoku box borders (if applicable)
            if (this.boxRows && this.boxCols) {
                const boxBorders = this._getBoxBorders(r, c);
                for (const border of boxBorders) {
                    tile.classList.add(`box-${border}`);
                }
            }
            
            // Diagonal cell styling (Sudoku X only)
            if (this.puzzle.specialFlags?.sudokuX) {
                const isOnMainDiagonal = r === c;
                const isOnAntiDiagonal = r + c === this.n - 1;
                if (isOnMainDiagonal || isOnAntiDiagonal) {
                    tile.classList.add('diagonal-cell');
                }
            }
            
            // Single-cell cages show their value
            if (isSingleCell) {
                if (isHidden) {
                    tile.textContent = 'X';
                } else {
                    tile.textContent = cage.target.toString();
                }
            }
            
            // Add instruction label to top-left cell of cage
            if (r === bestCell[0] && c === bestCell[1]) {
                const instruction = this._createInstruction(cage, isSingleCell, isHidden);
                tile.appendChild(instruction);
            }
            
            // Add event listeners for non-given tiles
            if (!isSingleCell) {
                tile.addEventListener('click', () => this.onTileClick?.(tile.id));
                tile.addEventListener('mouseenter', () => this.onTileHover?.(tile.id));
                tile.addEventListener('mouseleave', () => this.onTileLeave?.(tile.id));
            }
            
            tiles.push(tile);
        }
        
        return tiles;
    }

    /**
     * Gets thick border directions for a cell in a cage
     * @param {[number, number][]} cageCells 
     * @param {[number, number]} cell 
     * @returns {string[]}
     */
    _getCageBorders(cageCells, cell) {
        const borders = ['top', 'bottom', 'left', 'right'];
        
        for (const other of cageCells) {
            if (cell[0] === other[0] && cell[1] === other[1]) continue;
            if (areAdjacent(cell, other)) {
                const border = getTangentBorder(cell, other);
                const idx = borders.indexOf(border);
                if (idx !== -1) {
                    borders.splice(idx, 1);
                }
            }
        }
        
        return borders;
    }

    /**
     * Gets box border directions for a cell in a Sudoku grid
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {string[]} Borders at box boundaries
     */
    _getBoxBorders(row, col) {
        const borders = [];
        
        // Check if at bottom edge of a box (but not the grid edge)
        if ((row + 1) % this.boxRows === 0 && row < this.n - 1) {
            borders.push('bottom');
        }
        
        // Check if at right edge of a box (but not the grid edge)
        if ((col + 1) % this.boxCols === 0 && col < this.n - 1) {
            borders.push('right');
        }
        
        // Check if at top edge of a box (but not the grid edge)
        if (row % this.boxRows === 0 && row > 0) {
            borders.push('top');
        }
        
        // Check if at left edge of a box (but not the grid edge)
        if (col % this.boxCols === 0 && col > 0) {
            borders.push('left');
        }
        
        return borders;
    }

    /**
     * Creates instruction label element
     * @param {import('../kenken/KenKenGenerator.mjs').Cage} cage 
     * @param {boolean} isSingleCell 
     * @param {boolean} isHidden 
     * @returns {HTMLElement}
     */
    _createInstruction(cage, isSingleCell, isHidden) {
        const inst = document.createElement('div');
        inst.classList.add('instruction');
        
        if (isSingleCell) {
            inst.textContent = isHidden ? '' : cage.target.toString();
        } else if (!cage.operator) {
            // Killer Sudoku - just show the sum
            inst.textContent = cage.target.toString();
        } else if (cage.operator === 'gcd' || cage.operator === 'lcm') {
            inst.textContent = `${cage.operator}(${cage.target})`;
        } else {
            inst.textContent = `${cage.target}${cage.operator}`;
        }
        
        return inst;
    }

    /**
     * Renders the digit selector
     * @param {HTMLElement} container 
     */
    renderDigits(container) {
        this.digitsEl = container;
        container.innerHTML = '';
        
        const start = this.puzzle.specialFlags.zero ? 0 : 1;
        const end = this.puzzle.specialFlags.zero ? this.n - 1 : this.n;
        
        for (let i = start; i <= end; i++) {
            const digit = document.createElement('div');
            digit.id = i.toString();
            digit.textContent = i.toString();
            digit.classList.add('number');
            digit.addEventListener('click', () => this.onNumberClick?.(i));
            container.appendChild(digit);
        }
        
        // Set container width
        const tileSize = this.n <= 10 ? 75 : 65;
        container.style.width = `${tileSize * this.n}px`;
    }

    /**
     * Renders control buttons
     * @param {HTMLElement} container 
     * @param {object} callbacks 
     */
    renderControls(container, callbacks) {
        this.buttonsEl = container;
        container.innerHTML = '';
        
        // Submit button
        const submit = this._createButton('submit', 'submit', `${this.imagePath}/check.png`, callbacks.onSubmit);
        container.appendChild(submit);
        
        // Delete button
        const del = this._createButton('del', 'del', `${this.imagePath}/trash.png`, callbacks.onDelete);
        container.appendChild(del);
        
        // Note button
        const note = this._createButton('note', 'noteButton', `${this.imagePath}/pencil.png`, callbacks.onNote);
        container.appendChild(note);
        
        // Hover mode button
        const hover = this._createButton('hover-btn', 'hoverButton', `${this.imagePath}/eye.png`, callbacks.onHover);
        container.appendChild(hover);
        
        // Reset button
        const reset = this._createButton('reset', 'reset', `${this.imagePath}/reset.png`, callbacks.onReset);
        container.appendChild(reset);
        
        // Set container width
        const tileSize = this.n <= 10 ? 75 : 65;
        container.style.width = `${tileSize * this.n}px`;
    }

    /**
     * Sets a button's active state
     * @param {string} buttonId 
     * @param {boolean} isActive 
     */
    setButtonActive(buttonId, isActive) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        if (isActive) {
            button.classList.add('button-active');
        } else {
            button.classList.remove('button-active');
        }
    }

    /**
     * Creates a control button
     * @param {string} id 
     * @param {string} className 
     * @param {string} imageSrc 
     * @param {Function} onClick 
     * @returns {HTMLElement}
     */
    _createButton(id, className, imageSrc, onClick) {
        const button = document.createElement('div');
        button.id = id;
        button.classList.add(className);
        
        const img = document.createElement('img');
        img.src = imageSrc;
        img.id = `${id}_image`;
        button.appendChild(img);
        
        button.addEventListener('click', onClick);
        button.addEventListener('mouseenter', () => button.classList.add(`${className}-hovered`));
        button.addEventListener('mouseleave', () => button.classList.remove(`${className}-hovered`));
        
        return button;
    }

    /**
     * Adds undo button
     * @param {Function} onUndo 
     */
    addUndoButton(onUndo) {
        if (document.getElementById('undo')) return;
        
        const undo = this._createButton('undo', 'reset', `${this.imagePath}/undo.png`, onUndo);
        this.buttonsEl.appendChild(undo);
    }

    /**
     * Removes undo button
     */
    removeUndoButton() {
        const undo = document.getElementById('undo');
        if (undo) undo.remove();
    }

    /**
     * Renders pause button
     * @param {HTMLElement} container 
     * @param {Function} onPause 
     */
    renderPauseButton(container, onPause) {
        const pause = document.createElement('div');
        pause.id = 'pause';
        pause.classList.add('pause');
        
        const img = document.createElement('img');
        img.src = `${this.imagePath}/pause.png`;
        img.id = 'pause_image';
        pause.appendChild(img);
        
        pause.addEventListener('click', onPause);
        container.appendChild(pause);
    }

    /**
     * Updates pause button to show play icon
     * @param {Function} onPlay 
     */
    showPlayButton(onPlay) {
        const pause = document.getElementById('pause');
        if (!pause) return;
        
        pause.innerHTML = '';
        const img = document.createElement('img');
        img.src = `${this.imagePath}/play.png`;
        img.id = 'play_image';
        pause.appendChild(img);
        
        pause.onclick = onPlay;
    }

    /**
     * Updates play button to show pause icon
     * @param {Function} onPause 
     */
    showPauseButton(onPause) {
        const pause = document.getElementById('pause');
        if (!pause) return;
        
        pause.innerHTML = '';
        const img = document.createElement('img');
        img.src = `${this.imagePath}/pause.png`;
        img.id = 'pause_image';
        pause.appendChild(img);
        
        pause.onclick = onPause;
    }

    /**
     * Updates a tile's display
     * @param {string} tileId 
     * @param {number|null} value 
     * @param {boolean} isError 
     */
    updateTile(tileId, value, isError = false) {
        const tile = document.getElementById(tileId);
        if (!tile) return;
        
        // Preserve instruction if exists
        const instruction = tile.querySelector('.instruction');
        
        if (value !== null) {
            tile.textContent = value.toString();
            if (instruction) tile.appendChild(instruction);
        } else {
            tile.textContent = '';
            if (instruction) tile.appendChild(instruction);
        }
        
        // Handle error state
        if (isError) {
            tile.classList.add('wrong-tile');
        } else {
            tile.classList.remove('wrong-tile');
        }
    }

    /**
     * Renders notes on a tile
     * @param {string} tileId 
     * @param {number[]} notes 
     */
    renderNotes(tileId, notes) {
        const tile = document.getElementById(tileId);
        if (!tile) return;
        
        // Clear existing notes
        this.clearNotes(tileId);
        
        // Clear value display
        const instruction = tile.querySelector('.instruction');
        tile.textContent = '';
        if (instruction) tile.appendChild(instruction);
        
        // Create a container for notes
        const notesContainer = document.createElement('div');
        notesContainer.id = `${tileId}:notes-container`;
        notesContainer.classList.add('notes-container');
        
        // Add note elements
        for (let i = 0; i < notes.length; i++) {
            const noteEl = document.createElement('div');
            noteEl.textContent = notes[i].toString();
            noteEl.id = `${tileId}:note${i}`;
            noteEl.classList.add('note');
            notesContainer.appendChild(noteEl);
        }
        
        tile.appendChild(notesContainer);
    }

    /**
     * Clears notes display from a tile
     * @param {string} tileId 
     */
    clearNotes(tileId) {
        const tile = document.getElementById(tileId);
        if (!tile) return;
        
        // Remove notes container if it exists
        const container = document.getElementById(`${tileId}:notes-container`);
        if (container) {
            container.remove();
            return;
        }
        
        // Fallback: remove individual notes (for backwards compatibility)
        let i = 0;
        let noteEl = document.getElementById(`${tileId}:note${i}`);
        while (noteEl) {
            noteEl.remove();
            i++;
            noteEl = document.getElementById(`${tileId}:note${i}`);
        }
    }

    /**
     * Sets tile selection state
     * @param {string} tileId 
     * @param {boolean} selected 
     */
    setTileSelected(tileId, selected) {
        const tile = document.getElementById(tileId);
        if (!tile) return;
        
        if (selected) {
            tile.classList.add('tile-selected');
        } else {
            tile.classList.remove('tile-selected');
        }
    }

    /**
     * Sets tile hover state
     * @param {string} tileId 
     * @param {boolean} hovered 
     */
    setTileHovered(tileId, hovered) {
        const tile = document.getElementById(tileId);
        if (!tile) return;
        
        if (hovered) {
            tile.classList.add('tile-hovered');
        } else {
            tile.classList.remove('tile-hovered');
        }
    }

    /**
     * Sets number selection state
     * @param {number} num 
     * @param {boolean} selected 
     */
    setNumberSelected(num, selected) {
        const numEl = document.getElementById(num.toString());
        if (!numEl) return;
        
        if (selected) {
            numEl.classList.add('number-selected');
        } else {
            numEl.classList.remove('number-selected');
        }
    }

    /**
     * Updates button icon
     * @param {string} buttonId 
     * @param {string} imageSrc 
     */
    setButtonIcon(buttonId, imageSrc) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const img = button.querySelector('img');
        if (img) {
            img.src = imageSrc;
        }
    }

    /**
     * Updates timer display
     * @param {string} minutes 
     * @param {string} seconds 
     */
    updateTimer(minutes, seconds) {
        const minEl = document.getElementById('min');
        const secEl = document.getElementById('sec');
        if (minEl) minEl.textContent = minutes;
        if (secEl) secEl.textContent = seconds;
    }

    /**
     * Renders the puzzle ID display
     * @param {HTMLElement} container 
     * @param {string} puzzleId 
     */
    renderPuzzleId(container, puzzleId) {
        const uidDiv = document.createElement('div');
        uidDiv.id = 'uid';
        uidDiv.style.fontSize = '15px';
        uidDiv.dataset.value = puzzleId;
        uidDiv.innerHTML = `<b>Unique Puzzle ID:</b> ${puzzleId.substring(0, 10)}...`;
        container.appendChild(uidDiv);
    }

    /**
     * Renders hidden clue input
     * @param {HTMLElement} container 
     */
    renderHiddenClueInput(container) {
        const label = document.createElement('label');
        label.innerHTML = '<b>X = </b>';
        label.style.fontSize = '20px';
        label.style.paddingLeft = '30px';
        container.appendChild(label);
        
        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'submission';
        input.style.width = '50px';
        input.style.height = '50px';
        
        const start = this.puzzle.specialFlags.zero ? 0 : 1;
        const end = this.puzzle.specialFlags.zero ? this.n - 1 : this.n;
        input.min = start.toString();
        input.max = end.toString();
        
        container.appendChild(input);
    }

    /**
     * Adds note mode indicator
     * @param {HTMLElement} container 
     */
    showNoteModeIndicator(container) {
        if (document.getElementById('note-taking')) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'note-taking';
        indicator.style.paddingBottom = '5px';
        indicator.style.fontSize = '25px';
        indicator.textContent = 'Taking notes.';
        container.appendChild(indicator);
    }

    /**
     * Removes note mode indicator
     */
    hideNoteModeIndicator() {
        const indicator = document.getElementById('note-taking');
        if (indicator) indicator.remove();
    }

    /**
     * Adds +/- buttons for note mode
     * @param {Function} onAdd 
     * @param {Function} onSubtract 
     */
    addNoteButtons(onAdd, onSubtract) {
        const plus = document.createElement('div');
        plus.id = '+';
        plus.textContent = '+';
        plus.classList.add('number');
        plus.style.backgroundColor = 'gray';
        plus.addEventListener('click', onAdd);
        this.digitsEl.appendChild(plus);
        
        const minus = document.createElement('div');
        minus.id = '-';
        minus.textContent = '-';
        minus.classList.add('number');
        minus.style.backgroundColor = 'gray';
        minus.addEventListener('click', onSubtract);
        this.digitsEl.appendChild(minus);
    }

    /**
     * Removes +/- buttons
     */
    removeNoteButtons() {
        document.getElementById('+')?.remove();
        document.getElementById('-')?.remove();
    }

    /**
     * Shows save state indicator
     * @param {HTMLElement} container 
     */
    showSaveIndicator(container) {
        if (document.getElementById('sav')) return;
        
        const sav = document.createElement('div');
        sav.id = 'sav';
        sav.style.fontSize = '40px';
        sav.textContent = 'Game state saved. Press R to return.';
        container.appendChild(sav);
    }

    /**
     * Hides save state indicator
     */
    hideSaveIndicator() {
        document.getElementById('sav')?.remove();
    }

    /**
     * Displays win screen
     * @param {object} stats 
     * @param {Function} onPlayAgain 
     * @param {Function} onMenu 
     */
    showWinScreen(stats, onPlayAgain, onMenu) {
        const { message, speed, usedNotes } = stats;
        
        const titleEl = document.getElementById('title');
        document.getElementById('pause')?.remove();
        
        // Add win message
        titleEl.innerHTML += `<h1>${message}</h1>`;
        
        // Add speed indicator
        if (speed === 1) {
            titleEl.innerHTML += '<h1>&#x1F525</h1>';
        } else if (speed === 2) {
            titleEl.innerHTML += '<h1>&#x1F525 &#x1F525</h1>';
        } else if (speed === -1) {
            titleEl.innerHTML += '<h1>&#x1F422</h1>';
        } else if (speed === -2) {
            titleEl.innerHTML += '<h1>&#x1F422 &#x1F422</h1>';
        }
        
        // Mental master badge
        if (!usedNotes) {
            titleEl.innerHTML += '<h2>&#x2B50 Mental Master &#x2B50</h2>';
        }
        
        // Remove game buttons
        document.getElementById('submit')?.remove();
        document.getElementById('del')?.remove();
        document.getElementById('note')?.remove();
        document.getElementById('undo')?.remove();
        
        // Update reset to try again
        const reset = document.getElementById('reset');
        if (reset) {
            reset.onclick = () => {
                if (confirm('Would you like to re-do this puzzle?')) {
                    onMenu();
                }
            };
        }
        
        // Add menu button
        const menu = document.createElement('form');
        menu.action = '/puzzler/index.html';
        menu.id = 'menu';
        
        const menuBtn = document.createElement('input');
        menuBtn.type = 'submit';
        menuBtn.value = 'Menu';
        menuBtn.classList.add('menu');
        menu.appendChild(menuBtn);
        
        this.buttonsEl.appendChild(menu);
        
        // Add play again button
        const playAgain = document.createElement('div');
        playAgain.classList.add('menu');
        playAgain.style.backgroundColor = 'blue';
        playAgain.style.width = '120px';
        playAgain.textContent = 'Play again';
        playAgain.addEventListener('click', onPlayAgain);
        
        this.buttonsEl.appendChild(playAgain);
    }

    /**
     * Starts fireworks animation
     */
    startFireworks() {
        const numberOfFireworks = 500;
        for (let i = 0; i < numberOfFireworks; i++) {
            this._createFirework();
        }
        setTimeout(() => this.stopFireworks(), 10000);
    }

    /**
     * Creates a single firework element
     */
    _createFirework() {
        const firework = document.createElement('div');
        firework.className = 'firework';
        document.body.appendChild(firework);
        
        const size = Math.random() * 50 + 50;
        firework.style.width = `${size}px`;
        firework.style.height = `${size}px`;
        
        const posX = Math.random() * (window.innerWidth - size);
        const posY = Math.random() * (window.innerHeight - size);
        firework.style.left = `${posX}px`;
        firework.style.top = `${posY}px`;
        
        const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        firework.style.background = `radial-gradient(circle, ${color} 30%, rgba(255, 255, 255, 0) 60%)`;
        
        firework.style.animationDuration = `${Math.random() * 1 + 0.5}s`;
        firework.style.animationDelay = `${Math.random() * 2}s`;
        
        setTimeout(() => firework.remove(), 4000);
    }

    /**
     * Stops fireworks animation
     */
    stopFireworks() {
        document.querySelectorAll('.firework').forEach(fw => fw.remove());
    }
}

