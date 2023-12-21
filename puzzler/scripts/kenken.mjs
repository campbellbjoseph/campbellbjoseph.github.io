import { assign_operators, find_best_cell, are_adjacent, tangent_border, solutions } from "./generate_kenken.mjs";

var queryString = location.search.substring(1).split("|");
var n = parseInt(queryString[0]);
var diff = parseInt(queryString[1]);
var zero_allowed = false;

var numSelected = null;
var tileSelected = null;
var solution = null;
var deleting = false;
var takingNotes = false;
var won = false;
var count = 0;
var sec = 0;
var min = 0;
var tileHovered = null;

var notes = new Map();

window.onload = function() {
    setGame();
    stopwatch();
    
}

function stopwatch() {
    if (won == false) {
        count++;
        if (count == 100) {
            sec++;
            count = 0;
        }
        if (sec == 60) {
            min++;
            sec = 0;
        }
        let secstr = sec;
        let minstr = min;
        if (min < 10) { 
            minstr = "0" + minstr; 
        } 
  
        if (sec < 10) { 
            secstr = "0" + secstr; 
        } 
        document.getElementById('min').innerHTML = minstr; 
        document.getElementById('sec').innerHTML = secstr; 
        setTimeout(stopwatch, 10);
    }
}

function zero2D(k) {
    let arr = Array(k);
    for (let i = 0; i < k; i++) {
        arr[i] = Array(k);
    }
    for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
            arr[i][j] = -1;
        }
    }
    return arr;
  }

function do_outputs(m, cc, cov) {
    //console.log("--------------------------");
    let initial_array = zero2D(m);
    //console.log(initial_array);
    for (let id in cc) {
        if (cc[id].length == 1) {
            initial_array[cc[id][0][0]][cc[id][0][1]] = cov[id][1];
        }
    }
    //console.log(initial_array);
    //console.log("Starting: ");
    return solutions(m, JSON.parse(JSON.stringify(initial_array)), cc, cov);
}

function simulate(n, iter) {
    let arr = [0,0,0,0,0,0,0,0,0,0,0]
    for (let i = 0; i < iter; i++) {
        var out = assign_operators(n, diff);
        var grid = out[0];
        var cage_grid = out[1];
        var cage_cells = out[2];
        var cage_operators_values = out[3];
        arr[do_outputs(n, cage_cells, cage_operators_values)] += 1;
    }
    console.log(arr);
}

function setGame() {
    var out = assign_operators(n, diff);
    var grid = out[0];
    var cage_grid = out[1];
    var cage_cells = out[2];
    var cage_operators_values = out[3];
    let s = do_outputs(n, cage_cells, cage_operators_values);
    let att = 1;
    while (s != 1) {
        att++;
        out = assign_operators(n, diff);
        grid = out[0];
        cage_grid = out[1];
        cage_cells = out[2];
        cage_operators_values = out[3];
        s = do_outputs(n, cage_cells, cage_operators_values);
    }
    solution = grid;
    console.log(att);
    //console.log(grid);
    //console.log(cage_grid);
    //console.log(cage_cells);
    //console.log(cage_operators_values);
    //console.log(simulate(n, 100))
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

    let note = document.createElement("div");
    note.id = "note";
    note.innerText = "Note"
    note.classList.add("noteButton");
    note.addEventListener("mouseenter", hoverNote);
    note.addEventListener("mouseleave", exitNote);
    note.addEventListener("click", takeNotes);
    document.getElementById("buttons").append(note);

    window.addEventListener("keydown", function(event) {
        if (tileHovered != null && event.code.slice(0, 5) == "Digit") {
            if ((zero_allowed == false && event.code != "Digit0") || zero_allowed) {
                if (parseInt(event.code[5]) <= n) {
                    updateTile(tileHovered, parseInt(event.code[5]));
                }
            }
        }
    });

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

function add_note(tile, note) {
    let coords = tile.id.split("-"); //["0", "0"]
    note = parseInt(note);
    let r = parseInt(coords[0]);
    let c = parseInt(coords[1]);
    let taken = new Array();
    for (let i = 0; i < n; i++) {
        if (i != r) {
            let t = document.getElementById(i.toString() + "-" + c.toString());
            if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                taken.push(parseInt(t.innerHTML[0]))
            }
        }
        if (i != c) {
            let t = document.getElementById(r.toString() + "-" + i.toString());
            if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                taken.push(parseInt(t.innerHTML[0]))
            }
        }
    }
    let added = false;
    let removed = false;
    if (taken.includes(note) == false) {
        if (notes.has(tile.id)) {
            let arr = notes.get(tile.id);
            //console.log(arr)
            if (arr.includes(note) == false) {
                arr.push(note);
                arr.sort();
                notes.set(tile.id, arr);
                added = true;
            } else {
                arr.splice(arr.indexOf(note), 1)
                notes.set(tile.id, arr);
                removed = true;
            }
        } else {
            notes.set(tile.id, [note]);
            added = true;
        }
        write_notes(tile, added, removed);
    }
}
function clear_notes(tile, adding, removed) {
    if (notes.has(tile.id)) {
        let tile_notes = notes.get(tile.id)
        let val = 0;
        if (adding) {
            val = tile_notes.length - 1;
        }
        else {
            if (removed) {
                console.log("For some reason we are removing like this")
                val = tile_notes.length + 1;
            } else {
                val = tile_notes.length;
            }
        }
        console.log("-----")
        console.log("Calling clear_notes")
        console.log(tile)
        console.log(val);
        console.log(notes.get(tile.id))
        for (let i = 0; i < val; i++) {
            let prev = document.getElementById(tile.id + ":note" + i.toString());
            prev.remove();
        }
    }
}

function update_all_notes() {
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let t = document.getElementById(i.toString() + "-" + j.toString());
            if (notes.has(t.id)) {
                let k = notes.get(t.id).slice();
                clear_notes(t, false, false);
                for (let q = 0; q < k.length; q++) {
                    console.log(t, k[q])
                    add_note(t, k[q]);
                }
            }
        }
    }
}

function write_notes(tile, adding, removed) {
    let tile_notes = notes.get(tile.id) 
    clear_notes(tile, adding, removed);
    for (let i = 0; i < tile_notes.length; i++) {
        let note_div = document.createElement("div");
        note_div.innerText = tile_notes[i].toString();
        note_div.id = tile.id + ":note" + i.toString();
        note_div.classList.add("note");
        note_div.style.marginLeft = (i * 13).toString() + "%";
        tile.append(note_div);
    }
}


function updateTile(tile, number) {
    if (takingNotes) {
        add_note(tile, number);
        return;
    }
    resetButtons();
    let coords = tile.id.split("-"); //["0", "0"]
    let r = parseInt(coords[0]);
    let c = parseInt(coords[1]);
    let error = false;
    for (let i = 0; i < n; i++) {
        if (i != r) {
            let t = document.getElementById(i.toString() + "-" + c.toString());
            if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                if (t.innerHTML[0] == number) {
                    error = true;
                }
            }
        }
        if (i != c) {
            let t = document.getElementById(r.toString() + "-" + i.toString());
            if (t.innerHTML.length > 0 && t.innerHTML[0] != "<") {
                if (t.innerHTML[0] == number) {
                    error = true;
                }
            }
        }
    }
    let edited = false;
    if (tile.innerHTML.length == 0 || tile.innerHTML[0] == "<") {
        tile.innerHTML  = number + tile.innerHTML;
        edited = true;
    }
    else if (tile.innerHTML.length > 0 && tile.innerHTML[0] != "<") {
        tile.innerHTML  = number + tile.innerHTML.slice(1);
        edited = true;
    }

    if (error) {
        tile.classList.add("wrong-tile");
    } 
    else {
        if (tile.classList.contains("wrong-tile")) {
            tile.classList.remove("wrong-tile");
        }
        if (edited) {
            clear_notes(tile, false, false);
            notes.set(tile.id, [])
            update_all_notes();
        }
    }
}

function selectNumber() {
    stopDeleting()
    if (tileSelected) {
        updateTile(tileSelected, this.id);
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
    if (deleting) {
        if (this.innerHTML.length > 0 && this.innerHTML[0] != "<") {
            this.innerHTML  = this.innerHTML.slice(1);
            //console.log(this.classList)
            if (this.classList.contains("wrong-tile")){
                this.classList.remove("wrong-tile");
            }
        }
    } else {
        if (numSelected) {
            updateTile(this, numSelected.id);
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
}

function hoverTile() {
    this.classList.add("tile-hovered");
    tileHovered = this;
}

function exitTile() {
    this.classList.remove("tile-hovered");
    tileHovered = null;
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
    stopDeleting()
    let errorList = findErrors();
    let errors = errorList.length;
    
    for (let i = 0; i < errors; i++) {
        errorList[i].classList.add("wrong-tile");
    }
    if (errors == 0) {
        let messages = ["You win!", "Woooo!", "Too easy.", "Easy $$$", "Superb!", "Puzzle master!", "Gold star for you!", "Money shot!", "Swish!"];
        won = true;
        document.getElementById("title").innerHTML = "<h1>" + messages[Math.floor(Math.random() * (messages.length - 1))] +"</h1>";
          
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
    stopDeleting();
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

    stopDeleting();
}

function startDeleting() {
    deleting = true;
    let d = document.getElementById("del");
    d.innerText = "Stop";
    d.removeEventListener("click", startDeleting);
    d.addEventListener("click", stopDeleting);
}

function stopDeleting() {
    deleting = false;
    let d = document.getElementById("del");
    d.innerText = "Delete";
    d.removeEventListener("click", stopDeleting);
    d.addEventListener("click", startDeleting);
}

function hoverNote() {
    this.classList.add("note-hovered");
}

function exitNote() {
    this.classList.remove("note-hovered");
}
function takeNotes() {
    takingNotes = true;
    let no = document.getElementById("note");
    no.innerText = "Stop";
    no.removeEventListener("click", takeNotes);
    no.addEventListener("click", stopNotes);

    let plus = document.createElement("div");
    plus.id = "+"
    plus.innerText = "+"
    plus.classList.add("number")
    plus.style.backgroundColor = "gray"
    plus.addEventListener("click", add_all)
    document.getElementById("digits").append(plus);

    let minus = document.createElement("div");
    minus.id = "-"
    minus.innerText = "-"
    minus.classList.add("number")
    minus.style.backgroundColor = "gray"
    minus.addEventListener("click", subtract_all);
    document.getElementById("digits").append(minus);
}

function add_all() {
    if (tileSelected) {
        notes.set(tileSelected, []);
        for (let i = 1; i <= n; i++) {
            add_note(tileSelected, i);
        }
    }
}

function subtract_all() {
    if (tileSelected) {
        clear_notes(tileSelected, false, false);
        notes.set(tileSelected.id, [])
    }
}
function stopNotes() {
    takingNotes = false;
    let no = document.getElementById("note");
    no.innerText = "Note";
    no.removeEventListener("click", stopNotes);
    no.addEventListener("click", takeNotes);
    document.getElementById("+").remove();
    document.getElementById("-").remove();

}