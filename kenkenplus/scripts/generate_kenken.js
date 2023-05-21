function shuffleArray(arr) {
    arr.sort(() => Math.random() - 0.5);
}

function transpose(arr, n) {
    let grid = Array(n);
    for (let i = 0; i < n; i++) {
        grid[i] = Array(n);
    }

    for(let x = 0; x < n; x++) {
        for(let y = 0; y < n; y++) {
            grid[x][y] = arr[y][x];
        }
    }
    return grid;
}

function generate_grid(n) {
    let grid = Array(n);
    for (let i = 0; i < n; i++) {
        grid[i] = Array(n);
    }

    for (let i = 1; i < n + 1; i++) {
        for (let j = 1; j < n + 1; j++) {
            grid[i - 1][j - 1] = (i + j) % n + 1;
        }
    }

    shuffleArray(grid);
    grid = transpose(grid, n);
    shuffleArray(grid);
    return grid;
}

function add_coords(t1, t2) {
    return [t1[0] + t2[0], t1[1] + t2[1]];
}

function valid(coord, n) {
    return coord[0] >= 0 && coord[0] < n && coord[1] >= 0 && coord[1] < n;
}

function create_puzzle(n, difficulty) {
    var difficult = [[1,1,1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,4,4,5],
              [1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4],
              [1,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,5,5]]
    var grid = generate_grid(n)
    var cage_grid = Array(n);
    for (let i = 0; i < n; i++) {
        cage_grid[i] = Array(n);
        for (let j = 0; j < n; j++) {
            cage_grid[i][j] = -1;
        }
    }
    var slots_left = n*n;
    var curr_cage_id = 0;
    var cage_cells = {};
    while (slots_left > 0) {
        var cage_contents = [];
        var d = difficult[difficulty];
        var next_size = d[Math.floor(Math.random() * (d.length - 1))]
        
        var root = -1;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (cage_grid[i][j] == -1 && root == -1) {
                    root = [i, j]
                }
            }
        }

        //console.log(root);
        var directions = [[-1,0],[0,-1],[1,0],[0,1]]
        var queue = [root]
        var cells_caged = 0
        while (queue.length > 0 && cells_caged < next_size) {
            var curr = queue.shift();
            //console.log(curr_cage_id, queue, curr, next_size, cells_caged);
            cage_contents.push(curr);
            cage_grid[curr[0]][curr[1]] = curr_cage_id;
            cells_caged++;

            var up = add_coords(curr, directions[0]);
            var left = add_coords(curr, directions[1]);
            var down = add_coords(curr, directions[2]);
            var right = add_coords(curr, directions[3]);
            var dir = [up, left, down, right];
            var order = [0,1,2,3];
            shuffleArray(order);

            for (let i = 0; i < order.length; i++) {
                var curr_dir = dir[order[i]];
                if (valid(curr_dir, n)) {
                    if (cage_grid[curr_dir[0]][curr_dir[1]] == -1) {
                        queue.push(curr_dir);
                    }
                }
            }
        }
        cage_cells[curr_cage_id] = cage_contents;
        curr_cage_id++;
        slots_left -= cells_caged;
    }
    return [grid, cage_grid, cage_cells];

}

function are_adjacent(c1, c2) {
    let dx = Math.abs(c1[0] - c2[0]);
    let dy = Math.abs(c1[1] - c2[1]);
    return (dx + dy) < 2;
}

function tangent_border(c1, c2) {
    let dx = c1[0] - c2[0];
    let dy = c1[1] - c2[1];
    if (dx == 1 && dy == 0) {
        return "top";
    }
    else if (dx == -1 && dy == 0) {
        return "bottom";
    }
    else if (dx == 0 && dy == 1) {
        return "left";
    }
    else if (dx == 0 && dy == -1) {
        return "right";
    }
}

function find_value(grid, operator, cells) {
    if (operator == "+") {
        ans = 0;
        for (let i = 0; i < cells.length; i++) {
            let cell = cells[i];
            ans += grid[cell[0]][cell[1]];
        }
        return ans;
    } 

    else if (operator == "-") {
        let c0 = cells[0];
        let c1 = cells[1];
        let v0 = grid[c0[0]][c0[1]];
        let v1 = grid[c1[0]][c1[1]];
        let big = Math.max(v0, v1);
        let small = Math.min(v0, v1);
        return big - small;
    }

    else if (operator == "÷") {
        c0 = cells[0];
        c1 = cells[1];
        v0 = grid[c0[0]][c0[1]];
        v1 = grid[c1[0]][c1[1]];
        let big = Math.max(v0, v1);
        let small = Math.min(v0, v1);
        if (big % small != 0) {
            return -1;
        }
        return big / small;
    }

    else {
        ans = 1
        for (let i = 0; i < cells.length; i++) {
            let cell = cells[i];
            ans *= grid[cell[0]][cell[1]];
        }
        return ans
    }
}

function is_top_left_cell(coord, cells) {
    console.log(coord, cells);
    
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        if (coord[0] > cell[0] || coord[1] > cell[1]) {
            return false;
        }
    }
    return true;
}

function find_best_cell(cells) {
    let best = cells[0];
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        if (best[0] > cell[0]) {
            best = cell;
        }
        else if (best[0] == cell[0] && best[1] > cell[1]) {
            best = cell;
        }
    }
    //console.log(cells, best);
    return best;
}

function assign_operators(n, difficulty) {
    var out = create_puzzle(n, difficulty);
    var grid = out[0];
    var cage_grid = out[1];
    var cage_cells = out[2];

    var cage_operators_values = {};
    for (let id in cage_cells) {
        let cells = cage_cells[id];
        let op = ["+", "x"];
        if (cells.length == 2) {
            op.push("-");
            op.push("÷");
        }
        let operation = op[Math.floor(Math.random() * op.length)];
        let val = find_value(grid, operation, cells);
        if (val == -1) {
            operation = op[Math.floor(Math.random() * 3)];
            val = find_value(grid, operation, cells);
        }
        console.log
        cage_operators_values[id] = [operation, val];
    }
    return [grid, cage_grid, cage_cells, cage_operators_values];
}