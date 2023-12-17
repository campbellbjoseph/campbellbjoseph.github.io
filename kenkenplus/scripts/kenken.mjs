import { assign_operators, find_best_cell, are_adjacent, tangent_border } from "./generate_kenken.mjs";

var queryString = location.search.substring(1).split("|");
var n = parseInt(queryString[0]);
var diff = parseInt(queryString[1]);

var numSelected = null;
var tileSelected = null;
var solution = null;
var deleting = false;

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

    let del = document.createElement("div");
    del.id = "del";
    del.innerText = "Delete"
    del.classList.add("del");
    del.addEventListener("mouseenter", hoverDel);
    del.addEventListener("mouseleave", exitDel);
    del.addEventListener("click", startDeleting);
    document.getElementById("buttons").append(del);

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
    if (tileSelected) {
        resetButtons();
        let coords = tileSelected.id.split("-"); //["0", "0"]
        let r = parseInt(coords[0]);
        let c = parseInt(coords[1]);
        let error = false;
        for (let i = 0; i < n; i++) {
            if (i != r) {
                let t = document.getElementById(i.toString() + "-" + c.toString());
                if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                    if (t.innerHTML[0] == this.id) {
                        error = true;
                    }
                }
            }
            if (i != c) {
                let t = document.getElementById(r.toString() + "-" + i.toString());
                if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                    if (t.innerHTML[0] == this.id) {
                        error = true;
                    }
                }
            }
        }

        if (tileSelected.innerHTML.length == 0 || tileSelected.innerHTML[0] == "<") {
            tileSelected.innerHTML  = this.id + tileSelected.innerHTML;
        }
        else if (tileSelected.innerHTML.length > 0 && tileSelected.innerHTML[0] != "<") {
            tileSelected.innerHTML  = this.id + tileSelected.innerHTML.slice(1);
        }

        if (error) {
            tileSelected.classList.add("wrong-tile");
        } 
        else {
            if (tileSelected.classList.contains("wrong-tile")) {
                tileSelected.classList.remove("wrong-tile");
            }
        }

    }
    else {
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
    else {
        if (tileSelected == this) {
            tileSelected.classList.remove("tile-selected");
            tileSelected = null;
        }
        else {
            if (tileSelected != null) {
                tileSelected.classList.remove("tile-selected");
            } 
            tileSelected = this;
            tileSelected.classList.add("tile-selected");
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

function hoverDel() {
    this.classList.add("del-hovered");
}

function exitDel() {
    this.classList.remove("del-hovered");
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

function startDeleting() {
    if (!deleting) {
        deleting = true;
    }
}