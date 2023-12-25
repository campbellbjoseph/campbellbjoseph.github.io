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

function create_puzzle(n, difficulty, zero_allowed) {
    var difficult = [[1,2,2,2,2,3,3,3,3,4],
              [1,2,2,2,2,2,3,3,3,3,3,4,4,5],
              [1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,5,5,5,6]]
    var grid = generate_grid(n)
    var cage_grid = Array(n);
    if (zero_allowed == 1) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                grid[i][j] -= 1;
            }
        }
    }
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

export function are_adjacent(c1, c2) {
    let dx = Math.abs(c1[0] - c2[0]);
    let dy = Math.abs(c1[1] - c2[1]);
    return (dx + dy) < 2;
}

export function tangent_border(c1, c2) {
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
        let ans = 0;
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

    else if (operator == "/") {
        let c0 = cells[0];
        let c1 = cells[1];
        let v0 = grid[c0[0]][c0[1]];
        let v1 = grid[c1[0]][c1[1]];
        let big = Math.max(v0, v1);
        let small = Math.min(v0, v1);
        if (big * small == 0) {
            return -1;
        }
        if (big % small != 0) {
            return -1;
        }
        return big / small;
    }

    else if (operator == "x") {
        let ans = 1
        for (let i = 0; i < cells.length; i++) {
            let cell = cells[i];
            ans *= grid[cell[0]][cell[1]];
        }
        return ans
    } 

    else if (operator == "%") {
        let c0 = cells[0];
        let c1 = cells[1];
        let v0 = grid[c0[0]][c0[1]];
        let v1 = grid[c1[0]][c1[1]];
        let big = Math.max(v0, v1);
        let small = Math.min(v0, v1);
        if (big * small == 0) {
            return -1;
        }
        if (big % small == 0) {
            if (Math.random() > 0.2) {
                return big % small;
            } else {
                return -1;
            }
        }
        return big % small;
    }

    else if (operator == "gcd") {
        let ans = grid[cells[0][0]][cells[0][1]];
        for (let i = 0; i < cells.length; i++) {
            let cell = cells[i];
            if (grid[cell[0]][cell[1]] == 0){
                return -1;
            }
            ans = gcd(ans, grid[cell[0]][cell[1]]);
        }
        if (ans == 1) {
            if (Math.random() > 0.2) {
                return ans;
            }
            return -1;
        }
        return ans;
    }

    else if (operator == "lcm") {
        let ans = grid[cells[0][0]][cells[0][1]];
        for (let i = 0; i < cells.length; i++) {
            let cell = cells[i];
            if (grid[cell[0]][cell[1]] == 0){
                return -1;
            }
            ans = lcm(ans, grid[cell[0]][cell[1]]);
        }
        return ans;
    }
    return -1;
}

function gcd(x, y) {
    if ((typeof x !== 'number') || (typeof y !== 'number')) 
      return false;
    x = Math.abs(x);
    y = Math.abs(y);
    while(y) {
      var t = y;
      y = x % y;
      x = t;
    }
    return x;
  }

function lcm(x, y) {
    if ((typeof x !== 'number') || (typeof y !== 'number')) 
      return false;
    x = Math.abs(x);
    y = Math.abs(y);
    return (x * y)/(gcd(x,y));
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

export function find_best_cell(cells) {
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

export function assign_operators(n, difficulty, special) {
    var out = create_puzzle(n, difficulty, special[3]);
    var solo_clue = false;
    var solo_loc = null;
    let c = null;
    for (let i in out[2]) {
        if (out[2][i].length == 1) {
            c = out[2][i][0];
            //console.log(c)
            if ((c[0] == 0 || c[0] == n-1 || c[1] == 0 || c[1] == n-1) == false) {
                solo_clue = true;
                solo_loc = i;
            }
        }
    }
    while (solo_clue == false) {
        out = create_puzzle(n, difficulty, special[3]);
        solo_clue = false;
        solo_loc = null;
        for (let i in out[2]) {
            if (out[2][i].length == 1) {
                c = out[2][i][0];
                if ((c[0] == 0 || c[0] == n-1 || c[1] == 0 || c[1] == n-1) == false) {
                    solo_clue = true;
                    solo_loc = i;
                }
            }
        }
    }
    var grid = out[0];
    var cage_grid = out[1];
    var cage_cells = out[2];

    var cage_operators_values = {};
    var at_least_one_special = false;
    var hidden = false;
    for (let id in cage_cells) {
        let cells = cage_cells[id];
        let op = ["+", "x"];
        if (cells.length == 2) {
            op.push("+");
            op.push("x");
            op.push("-");
            op.push("-");
            op.push("-");
            op.push("/");
            op.push("/");
            op.push("/");
            if (special[0] == 1) {
                op.push("%");
                op.push("%");
                op.push("%");
            }
            if (special[1] == 1) {
                op.push("+");
                op.push("x");
                op.push("gcd");
                op.push("gcd");
            }
        }
        if (special[2] == 1) {
            op.push("+");
            op.push("x");
            op.push("lcm");
            op.push("lcm");
        }
        if (cells.includes(0)) {
            op = ["+", "-", "x"]
        }
        let operation = op[Math.floor(Math.random() * op.length)];
        let val = find_value(grid, operation, cells);
        while (val == -1) {
            operation = op[Math.floor(Math.random() * op.length)];
            val = find_value(grid, operation, cells);
        }
        cage_operators_values[id] = [operation, val];
        if (id == solo_loc && hidden == false) {
            cage_operators_values[id] = ["HIDE", val];
            hidden = true;
        }
        if ((operation == "%" || operation == "gcd" || operation == "lcm") && cells.length > 1) {
            at_least_one_special = true;
        }
    }
    return [grid, cage_grid, cage_cells, cage_operators_values, at_least_one_special];
}

function safe_row_col(n, cur_grid, coord, val) {
    for (let i = 0; i < n; i++) { 
        if (i != coord[1] && val == cur_grid[coord[0]][i]) {
            return false;
        }
        if (i != coord[0] && val == cur_grid[i][coord[1]]) {
            return false;
        }
    }
    return true;
}

function coord_equal(c1, c2) {
    return (c1[0] == c2[0] && c1[1] == c2[1])
}

function twoD_contains(twoD, oneD) {
    for (let i = 0; i < twoD.length; i++) {
        if (coord_equal(twoD[i], oneD)) {
            //console.log(twoD[i].toString() + " == " + oneD.toString())
            return true;
        }
    }
    return false;
}



function safe_cage(n, cur_grid, cage_cells, cage_operators_values, coord, val, zero_allowed) {
    let cur_cage = 0;
    for (let i = 0; i < Object.keys(cage_cells).length; i++) {
        if (twoD_contains(cage_cells[i], coord)) {
            cur_cage = i;
            break;
        }
    }

    let op = cage_operators_values[cur_cage];
    let vals = [val];
    let current_cell = cage_cells[cur_cage];
    for (let i = 0; i < current_cell.length; i++) {
        let c = current_cell[i];
        if (cur_grid[c[0]][c[1]] != -1) {
            vals.push(cur_grid[c[0]][c[1]]);
        }
    }
    //console.log("----")
    //console.log(cur_grid)
    //console.log(coord, val)
    //console.log(vals)
    if (zero_allowed == 0 || op[1] != 0) {
        if (op[0] == "+") {
            let ans = vals.reduce((a,b) => a + b, 0);
            if (ans > op[1]) {
                //console.log("FAILED")
                //console.log(op)
                return false;
            }
            if (vals.length == cage_cells[cur_cage].length && ans != op[1]) {
                //console.log("FAILED")
                //console.log(op)
                return false;
            }
        }
        else if (op[0] == "x") {
            let ans = vals.reduce((a,b) => a*b, 1);
            if (ans > op[1]) {
                //console.log("FAILED")
                //console.log(op)
                return false;
            }
            if (op[1] % ans != 0) {
                return false;
            }
            if (vals.length == cage_cells[cur_cage].length && ans != op[1]) {
                //console.log("FAILED")
                //console.log(op)
                return false;
            }
        } 
        else if (op[0] == "-") {
            if (vals.length == 2) {
                let big = Math.max(vals[0], vals[1]);
                let small = Math.min(vals[0], vals[1]);
                //console.log("SUB");
                //console.log([big, small]);
                if (big - small != op[1]) {
                    //console.log("FAILED")
                    //console.log(op)
                    return false;
                }
            }
            else if (vals.length == 1) {
                let a = vals[0] + op[1];
                let b = vals[0] - op[1];
                if (vals[0] != 0) {
                    if (a > n && b < 1) {
                        return false;
                    }
                }
                
            }
        }
        else if (op[0] == "/") {
            if (vals.length == 2) {
                let big = Math.max(vals[0], vals[1]);
                let small = Math.min(vals[0], vals[1]);
                //console.log("DIV");
                //console.log([big, small]);
                if (big % small != 0 || big / small != op[1]) {
                    //console.log("FAILED")
                    //console.log(op)
                    return false;
                }
            } 
            else if (vals.length == 1) {
                if (val % op[1] != 0 && val * op[1] > n) {
                    return false;
                }
            }
        }
        else if (op[0] == "%") {
            if (vals.length == 2) {
                let big = Math.max(vals[0], vals[1]);
                let small = Math.min(vals[0], vals[1]);
                //console.log("------")
                //console.log("MOD");
                //console.log([big, small]);
                if (big % small != op[1]) {
                    //console.log("FAILED")
                    //console.log(op)
                    return false;
                }
            } 
        }
        else if (op[0] == "gcd") {
            let ans = vals[0];
            for (let i = 0; i < vals.length; i++) {
                ans = gcd(ans, vals[i]);
            }
            if (ans % op[1] != 0) {
                return false;
            }
            if (vals.length == cage_cells[cur_cage].length && ans != op[1]) {
                return false;
            }
        }
        else if (op[0] == "lcm") {
            let ans = vals[0];
            for (let i = 0; i < vals.length; i++) {
                ans = lcm(ans, vals[i]);
            }
            if (op[1] % ans != 0) {
                return false;
            }
            if (vals.length == cage_cells[cur_cage].length && ans != op[1]) {
                return false;
            }
        }
    }
    else {
        if (vals.includes(0)) {
            if (op[0] == "/" || op[0] == "%" || op[0] == "gcd" || op[0] == "lcm") {
                return false;
            }
        }
        if (op[0] == "x") {
            let ans = vals.reduce((a,b) => a*b, 1);
            if (vals.length == cage_cells[cur_cage].length && ans != op[1]) {
                return false;
            }
        }
    }
    
    //console.log("proceeding...")
    return true;
}

function cur_op(n, cage_cells, cage_operators_values, coord) {
    let cur_cage = 0;
    for (let i = 0; i < Object.keys(cage_cells).length; i++) {
        if (twoD_contains(cage_cells[i], coord)) {
            cur_cage = i;
            break;
        }
    }

    let op = cage_operators_values[cur_cage];
    return [op, cage_cells[cur_cage].length];
}

export function precompute(n, cage_cells, cage_operators_values, zero_allowed) {
    let ans = new Map();
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            let out = cur_op(n, cage_cells, cage_operators_values, [r,c])
            let cop = out[0];
            let clen = out[1]
            let possible_vals = p_vals(n, cop, clen, zero_allowed);
            ans.set(r.toString() + "-" + c.toString(), possible_vals);
        }
    }
    return ans;
}

export function solutions(n, cur_grid, cage_cells, cage_operators_values, precomp, zero_allowed) {
    let r = 0;
    let c = 0;
    let incomplete = false;
    for (r = 0; r < n; r++) {
        for (c = 0; c < n; c++) {
            if (cur_grid[r][c] == -1) {
                incomplete = true;
                break;
            }
        }
        if (incomplete) {
            break;
        }
    }

    if (incomplete == false) {
        return 1;
    }

    let ans = 0;
    //console.log(precomp)
    let possible_vals = precomp.get(r.toString() + "-" + c.toString());
    //console.log(precomp)
    for (let j = 0; j <= possible_vals.length; j++) {
        let i = possible_vals[j];
        if (safe_row_col(n, cur_grid, [r,c], i) && safe_cage(n, cur_grid, cage_cells, cage_operators_values, [r,c], i, zero_allowed) && i != null) {
            let next_grid = JSON.parse(JSON.stringify(cur_grid));
            next_grid[r][c] = i;
            //console.log(next_grid);
            ans += solutions(n, next_grid, cage_cells, cage_operators_values, precomp, zero_allowed);
            //if (ans > 1) {
            //    return ans; // no longer accurate, cutting search short to save time
            //}
        }
    }
    return ans;
}

function p_vals(n, oper, len, zero_allowed) {
    let func = oper[0];
    let val = oper[1];
    let ans = new Array();
    for (let i = 1-zero_allowed; i <= n-zero_allowed; i++) {
        if (func == "x") {
            if ((val == 0 && i == 0) || val % i == 0) {
                ans.push(i);
            }
        }
        else if (func == "/") {
            if (i != 0 && (i * val <= n || i % val == 0)) {
                ans.push(i)
            }
        }
        else if (func == "gcd") {
            if (i != 0 && i % val == 0) {
                ans.push(i)
            }
        }
        else if (func == "lcm") {
            if (i != 0 && val % i == 0) {
                ans.push(i)
            }
        }
        else if (func == "%") {
            if (i != 0 && i > val) {
                ans.push(i)
            }
        }
        else {
            ans.push(i)
        }
    }
    return ans;
}