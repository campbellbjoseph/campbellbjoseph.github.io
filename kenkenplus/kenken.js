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
//var out = assign_operators(6, 0);

var queryString = location.search.substring(1).split("|");
var n = parseInt(queryString[0]);
var diff = parseInt(queryString[1]);

var numSelected = null;
var tileSelected = null;
var solution = null;

window.onload = function() {
    setGame();
}

function setGame() {
    var out = assign_operators(n, diff);
    var grid = out[0];
    var cage_grid = out[1];
    var cage_cells = out[2];
    var cage_operators_values = out[3];
    solution = grid;

    for (let i = 1; i <= n; i++) {
        //<div id="1" class="number">1</div>
        let number = document.createElement("div");
        number.id = i
        number.innerText = i;
        number.addEventListener("click", selectNumber);
        number.addEventListener("mouseenter", hoverNumber);
        number.addEventListener("mouseleave", exitNumber);
        number.classList.add("number");
        document.getElementById("digits").appendChild(number);
    }
    var tiles = []
    for (let id in cage_cells) {
        let cells = cage_cells[id];
        //console.log(cage_operators_values);
        let data = cage_operators_values[id];
        
        if (cells.length == 1) {
            let tile = document.createElement("div");
            let inst = document.createElement("div");

            tile.id = cells[0][0].toString() + "-" + cells[0][1].toString();
            inst.id = tile.id + ":" + data[1].toString() + data[0];
            inst.innerText = data[1].toString();
            inst.classList.add("instruction");
            tile.classList.add("thick-top");
            tile.classList.add("thick-bottom");
            tile.classList.add("thick-right");
            tile.classList.add("thick-left");
            tile.innerText = data[1];
            tile.classList.add("tile");
            tile.append(inst);
            if (cells[0][0] == 0) {
                tile.classList.add("thicc-top");
            }
            if (cells[0][0] == n - 1) {
                tile.classList.add("thicc-bottom");
            }
            if (cells[0][1] == 0) {
                tile.classList.add("thicc-left");
            }
            if (cells[0][1] == n - 1) {
                tile.classList.add("thicc-right");
            }
            tiles.push(tile);
        }
        else {
            let best = find_best_cell(cells);
            for (let i = 0; i < cells.length; i++) {
                let tile = document.createElement("div");
                tile.id = cells[i][0].toString() + "-" + cells[i][1].toString();
                let thick = ["bottom", "top", "left", "right"];
                let thin = [];
                for (let j = 0; j < cells.length; j++) {
                    if (i != j && are_adjacent(cells[i], cells[j])) {
                        let border = tangent_border(cells[i], cells[j]);
                        thick.splice(thick.indexOf(border), 1);
                    }
                }
                if (thick.indexOf("bottom") != -1) {
                    tile.classList.add("thick-bottom");
                }
                if (thick.indexOf("top") != -1) {
                    tile.classList.add("thick-top");
                }
                if (thick.indexOf("left") != -1) {
                    tile.classList.add("thick-left");
                }
                if (thick.indexOf("right") != -1) {
                    tile.classList.add("thick-right");
                }
                if (cells[i][0] == 0) {
                    tile.classList.add("thicc-top");
                }
                if (cells[i][0] == n - 1) {
                    tile.classList.add("thicc-bottom");
                }
                if (cells[i][1] == 0) {
                    tile.classList.add("thicc-left");
                }
                if (cells[i][1] == n - 1) {
                    tile.classList.add("thicc-right");
                }
                tile.classList.add("tile");
                if (cells[i][0] == best[0] && cells[i][1] == best[1]) {
                    let inst = document.createElement("div");
                    inst.id = tile.id + ":" + data[1].toString() + data[0];
                    inst.innerText = data[1].toString() + data[0];
                    inst.classList.add("instruction");
                    tile.append(inst);
                }
                tile.addEventListener("click", selectTile);
                tile.addEventListener("mouseenter", hoverTile);
                tile.addEventListener("mouseleave", exitTile);
                tiles.push(tile);
            }
        }
    } 
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            let this_id = r.toString() + "-" + c.toString();
            for (let i = 0; i < tiles.length; i++) {
                if (tiles[i].id == this_id) {
                    document.getElementById("board").append(tiles[i]);
                    tiles.splice(i, 1);
                }
            }
        }
    }

    let submit = document.createElement("div");
    submit.id = "submit";
    submit.innerText = "Submit";
    submit.classList.add("submit");
    submit.addEventListener("click", checkPuzzle);
    submit.addEventListener("mouseenter", hoverSubmit);
    submit.addEventListener("mouseleave", exitSubmit);
    document.getElementById("buttons").append(submit);

    let check = document.createElement("div");
    check.id = "check";
    check.innerText = "Check";
    check.classList.add("check");
    check.addEventListener("click", checkMistakes);
    check.addEventListener("mouseenter", hoverCheck);
    check.addEventListener("mouseleave", exitCheck);
    document.getElementById("buttons").append(check);

    if (n <= 10) {
        document.getElementById("board").style.width = 75*n;
        document.getElementById("board").style.height = 75*n;
        document.getElementById("digits").style.width = 75*n;
        document.getElementById("buttons").style.width = 75*n;
    } else {
        if (n > 12) {
            n = 12;
        }
        document.getElementById("board").style.width = 65*n;
        document.getElementById("board").style.height = 65*n;
        document.getElementById("digits").style.width = 65*n;
        document.getElementById("buttons").style.width = 65*n;

        tiles = document.querySelectorAll(".tile");
        tiles.forEach(tile => {
            tile.style.width = 65;
            tile.style.height = 65;
            tile.style.fontSize = 28;
        });

        insts = document.querySelectorAll(".instruction");
        insts.forEach(inst => {
            inst.style.fontSize = 13;
        })
    }
}

function selectNumber() {
    if (numSelected == this) {
        numSelected.classList.remove("number-selected");
        numSelected = null;
    }
    else {
        if (numSelected != null) {
            numSelected.classList.remove("number-selected");
        } 
        numSelected = this;
        numSelected.classList.add("number-selected");
    }
}

function selectTile() {
    if (numSelected) {
        resetButtons();
        let coords = this.id.split("-"); //["0", "0"]
        let r = parseInt(coords[0]);
        let c = parseInt(coords[1]);
        let error = false;
        for (let i = 0; i < n; i++) {
            if (i != r) {
                let t = document.getElementById(i.toString() + "-" + c.toString());
                if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                    if (t.innerHTML[0] == numSelected.id) {
                        error = true;
                    }
                }
            }
            if (i != c) {
                let t = document.getElementById(r.toString() + "-" + i.toString());
                if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                    if (t.innerHTML[0] == numSelected.id) {
                        error = true;
                    }
                }
            }
        }

        if (this.innerHTML.length == 0 || this.innerHTML[0] == "<") {
            this.innerHTML  = numSelected.id + this.innerHTML;
        }
        else if (this.innerHTML.length > 0 && this.innerHTML[0] != "<") {
            this.innerHTML  = numSelected.id + this.innerHTML.slice(1);
        }

        if (error) {
            this.classList.add("wrong-tile");
        } 
        else {
            if (this.classList.contains("wrong-tile")) {
                this.classList.remove("wrong-tile");
            }
        }
    } 
}

function hoverTile() {
    this.classList.add("tile-hovered");
}

function exitTile() {
    this.classList.remove("tile-hovered");
}

function hoverSubmit() {
    this.classList.add("submit-hovered");
}

function exitSubmit() {
    this.classList.remove("submit-hovered");
}

function hoverCheck() {
    this.classList.add("check-hovered");
}

function exitCheck() {
    this.classList.remove("check-hovered");
}

function hoverNumber() {
    if (numSelected != this) {
        this.classList.add("number-hovered");
    }
}

function exitNumber() {
    this.classList.remove("number-hovered");
}

function findErrors() {
    let errorList = [];
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            let this_id = r.toString() + "-" + c.toString();
            let tile = document.getElementById(this_id);
            if (tile.innerHTML.length > 0 && tile.innerHTML[0] != "<") {
                if (parseInt(tile.innerHTML.split("<")[0]) != solution[r][c]) {
                    errorList.push(tile);
                }
            } else {
                errorList.push(tile);
            }
        }
    }
    return errorList;
}

function findMistakes() {
    let mistakeList = [];
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            let this_id = r.toString() + "-" + c.toString();
            let tile = document.getElementById(this_id);
            if (tile.innerHTML.length > 0 && tile.innerHTML[0] != "<") {
                if (parseInt(tile.innerHTML.split("<")[0]) != solution[r][c]) {
                    mistakeList.push(tile);
                }
            }
        }
    }
    return mistakeList;
}

function checkPuzzle() {
    let errorList = findErrors();
    let errors = errorList.length;
    
    for (let i = 0; i < errors; i++) {
        errorList[i].classList.add("wrong-tile");
    }
    if (errors == 0) {
        document.getElementById("title").innerText = "You win!";
    } else {
        console.log(errors);
        let submit = document.getElementById("submit");
        submit.innerText = "Clear";
        submit.removeEventListener("click", checkPuzzle);
        submit.addEventListener("click", clearErrors);
    }
}

function clearErrors() {
    let errorList = findErrors();
    let errors = errorList.length;
    for (let i = 0; i < errors; i++) {
        errorList[i].classList.remove("wrong-tile");
    }

    this.removeEventListener("click", clearErrors);
    this.innerText = "Submit";
    this.addEventListener("click", checkPuzzle);
}

function checkMistakes() {
    let mistakeList = findMistakes();
    let mistakes = mistakeList.length;
    
    for (let i = 0; i < mistakes; i++) {
        mistakeList[i].classList.add("wrong-tile");
    }

    if (mistakes == 0) {
        console.log("Success!");
    } else {
        console.log(mistakes);
        let check = document.getElementById("check");
        check.innerText = "Clear";
        check.removeEventListener("click", checkMistakes);
        check.addEventListener("click", clearMistakes);
    }
}

function clearMistakes() {
    let mistakeList = findMistakes();
    let mistakes = mistakeList.length;
    for (let i = 0; i < mistakes; i++) {
        mistakeList[i].classList.remove("wrong-tile");
    }

    this.removeEventListener("click", clearMistakes);
    this.innerText = "Check";
    this.addEventListener("click", checkMistakes);
}

function resetButtons() {
    let submit = document.getElementById("submit");
    if (submit.innerText == "Clear") {
        submit.removeEventListener("click", clearErrors);
        submit.innerText = "Submit";
        submit.addEventListener("click", checkPuzzle);
    }

    let check = document.getElementById("check");
    if (check.innerText == "Clear") {
        check.removeEventListener("click", clearMistakes);
        check.innerText = "Check";
        check.addEventListener("click", checkMistakes);
    }
}