import { assign_operators, precompute } from "./generate_calcudoku.mjs";
import { puzzle_id, do_outputs, evaluate_hidden } from "./calcudoku.mjs"

function getSeededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function generatePuzzleOfTheDay() {
    let today = new Date();
    let seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    let randomValue = getSeededRandom(seed);
    return Math.floor(randomValue * 1000)
}

export function generate_daily_puzzle() {
    let x = generatePuzzleOfTheDay(); // 0 <= x < 1000
    let n = (x % 3) + 6;
    let diff = Math.floor(Math.random() * 3);
    let hidden = (x % 5 == 0);
    let hidden_clues = 0;
    let need_special = 0;
    if (hidden) {
        hidden_clues = 1;
    }
    let special = [0,0,0,0,hidden_clues];

    let out = assign_operators(n, diff, special);
    let grid = out[0];
    let cage_grid = out[1];
    let cage_cells = out[2];
    let cage_operators_values = out[3];
    var at_least_one_special = out[4];
    var p = precompute(n, cage_cells, cage_operators_values, zero_allowed);

    let s = do_outputs(n, cage_cells, cage_operators_values, p, zero_allowed);

    let z = null;
    if (hidden_clues == 1) {
        for (let id in cage_cells) {
            let cells = cage_cells[id];
            let data = cage_operators_values[id];
            if (cells.length == 1 && hidden_clues == 1 && data[0] == "HIDE") {
                hidden_ans = data[1];
                hidden_id = id;
            }
        }
        z = evaluate_hidden(n, cage_cells, cage_operators_values, p, zero_allowed)[0];
    }
    let att = 1;
    while ((s != 1 || (need_special > 0 && at_least_one_special == false)) || (hidden_clues == 1 && z == false)) {
        if (s != 1) {
            console.log("Attempt " + att.toString() + ": Failed due to multiple solutions")
        } else if ((need_special > 0 && at_least_one_special == false)) {
            console.log("Attempt " + att.toString() + ": Failed due to lack of special")
        } else {
            console.log("Attempt " + att.toString() + ": Failed due multiple X's")
        }
        
        att++;
        out = assign_operators(n, diff, special);
        grid = out[0];
        cage_grid = out[1];
        cage_cells = out[2];
        cage_operators_values = out[3];
        at_least_one_special = out[4];
        p = precompute(n, cage_cells, cage_operators_values, zero_allowed);
        s = do_outputs(n, cage_cells, cage_operators_values, p, zero_allowed);
        if (hidden_clues == 1) {
            for (let id in cage_cells) {
                let cells = cage_cells[id];
                let data = cage_operators_values[id];
                if (cells.length == 1 && hidden_clues == 1 && data[0] == "HIDE") {
                    hidden_ans = data[1];
                    hidden_id = id;
                }
            }
            z = evaluate_hidden(n, cage_cells, cage_operators_values, p, zero_allowed)[0];
        }
    }     
        
    let solution = grid;
    let uv = puzzle_id(cage_grid, cage_operators_values);
    return uv;
}

console.log("generate_daily.js loaded!");
