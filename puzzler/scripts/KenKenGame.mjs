/**
 * KenKen Game - Main entry point
 * Orchestrates puzzle generation, rendering, and gameplay
 */

import { generatePuzzle, generateDailyPuzzle } from './kenken/KenKenGenerator.mjs';
import { encode, decode, parseQueryString, createNewPuzzleUrl } from './kenken/KenKenSerializer.mjs';
import { GameState } from './ui/GameState.mjs';
import { BoardRenderer } from './ui/BoardRenderer.mjs';
import { Controls } from './ui/Controls.mjs';

/**
 * Main game controller
 */
export class KenKenGame {
    constructor() {
        this.puzzle = null;
        this.state = null;
        this.renderer = null;
        this.controls = null;
        this.timerInterval = null;
    }

    /**
     * Initializes the game from URL parameters
     */
    init() {
        const queryString = location.search.substring(1);
        const parsed = parseQueryString(queryString);
        
        switch (parsed.mode) {
            case 'daily':
                this._handleDailyPuzzle();
                break;
            case 'load':
                this._loadPuzzle(parsed.params.puzzleId);
                break;
            case 'generate':
                this._generatePuzzle(parsed.params);
                break;
            case 'error':
                alert(parsed.params.message || 'Invalid puzzle configuration');
                location.href = 'index.html';
                break;
            default:
                console.error('Unknown puzzle mode');
                location.href = 'index.html';
        }
    }

    /**
     * Handles daily puzzle mode
     */
    _handleDailyPuzzle() {
        const today = new Date().toDateString();
        const storedDate = localStorage.getItem('puzzleDate');
        const storedPuzzle = localStorage.getItem('puzzleOfTheDay');
        
        if (storedDate === today && storedPuzzle) {
            // Use cached daily puzzle
            location.href = `puzzle.html?0|${storedPuzzle}`;
        } else {
            // Generate new daily puzzle
            const puzzle = generateDailyPuzzle();
            const puzzleId = encode(puzzle);
            
            localStorage.setItem('puzzleOfTheDay', puzzleId);
            localStorage.setItem('puzzleDate', today);
            
            location.href = `puzzle.html?0|${puzzleId}`;
        }
    }

    /**
     * Loads a puzzle from encoded ID
     * @param {string} puzzleId 
     */
    _loadPuzzle(puzzleId) {
        console.log('Loading puzzle from ID:', puzzleId.substring(0, 10) + '...');
        this.puzzle = decode(puzzleId);
        this._startGame(puzzleId);
    }

    /**
     * Generates a new puzzle
     * @param {object} params 
     */
    _generatePuzzle(params) {
        console.log('Generating puzzle with params:', params);
        
        const specialFlags = {
            mod: params.mod,
            gcd: params.gcd,
            lcm: params.lcm,
            zero: params.zero,
            hidden: params.hidden
        };
        
        this.puzzle = generatePuzzle(params.n, params.difficulty, specialFlags);
        
        if (!this.puzzle) {
            alert('Failed to generate puzzle. Please try again.');
            location.href = 'index.html';
            return;
        }
        
        const puzzleId = encode(this.puzzle);
        this._startGame(puzzleId);
    }

    /**
     * Starts the game with a loaded/generated puzzle
     * @param {string} puzzleId 
     */
    _startGame(puzzleId) {
        // Initialize state
        this.state = new GameState(this.puzzle);
        
        // Initialize renderer
        this.renderer = new BoardRenderer(this.puzzle, this.state);
        
        // Initialize controls
        this.controls = new Controls(this.state, this.renderer);
        
        // Set up win handler
        this.controls.onWin = (stats) => this._handleWin(stats);
        
        // Render everything
        this._render(puzzleId);
        
        // Start timer
        this._startTimer();
        
        console.log('Game started:', this.puzzle);
    }

    /**
     * Renders all game elements
     * @param {string} puzzleId 
     */
    _render(puzzleId) {
        const boardEl = document.getElementById('board');
        const digitsEl = document.getElementById('digits');
        const buttonsEl = document.getElementById('buttons');
        const solvingEl = document.getElementById('solving');
        const titleEl = document.getElementById('title');
        
        // Initialize and render board
        this.renderer.initBoard(boardEl);
        this.renderer.renderBoard();
        
        // Render digits
        this.renderer.renderDigits(digitsEl);
        
        // Render controls
        this.renderer.renderControls(buttonsEl, {
            onSubmit: () => this.controls.checkMistakes(),
            onDelete: () => {
                if (this.state.isDeleting) {
                    this.controls._stopDeleting();
                } else {
                    this.controls.startDeleting();
                }
            },
            onNote: () => {
                if (this.state.isTakingNotes) {
                    this.controls._stopNotes();
                } else {
                    this.controls.startNotes();
                }
            },
            onHover: () => this.controls.toggleHoverMode(),
            onReset: () => this.controls.reset()
        });
        
        // Render pause button
        this.renderer.renderPauseButton(titleEl, () => this.controls.pause());
        
        // Render puzzle ID
        this.renderer.renderPuzzleId(solvingEl, puzzleId);
        
        // Render hidden clue input if needed
        if (this.puzzle.specialFlags.hidden) {
            this.renderer.renderHiddenClueInput(solvingEl);
        }
        
        // Initialize controls
        this.controls.init();
        
        // Set up copy button
        this._setupCopyButton(puzzleId);
    }

    /**
     * Sets up the copy puzzle ID button
     * @param {string} puzzleId 
     */
    _setupCopyButton(puzzleId) {
        const copyButton = document.getElementById('copybutton');
        if (copyButton) {
            copyButton.onclick = () => {
                navigator.clipboard.writeText(puzzleId);
                copyButton.textContent = 'Copied!';
            };
        }
    }

    /**
     * Starts the game timer
     */
    _startTimer() {
        this.state.startTimer();
        
        this.timerInterval = setInterval(() => {
            if (!this.state.isWon && !this.state.isPaused) {
                const time = this.state.getFormattedTime();
                this.renderer.updateTimer(time.minutes, time.seconds);
            }
        }, 1000);
    }

    /**
     * Handles win condition
     * @param {object} stats 
     */
    _handleWin(stats) {
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Clean up controls
        this.controls.destroy();
        
        // Show win screen
        this.renderer.showWinScreen(
            stats,
            () => this._playAgain(),
            () => this._tryAgain()
        );
    }

    /**
     * Plays again with same settings
     */
    _playAgain() {
        location.href = createNewPuzzleUrl(this.puzzle);
    }

    /**
     * Tries the same puzzle again
     */
    _tryAgain() {
        const puzzleId = document.getElementById('uid')?.dataset?.value;
        if (puzzleId) {
            location.href = `puzzle.html?0|${puzzleId}`;
        }
    }
}

// Auto-initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const game = new KenKenGame();
    game.init();
});

