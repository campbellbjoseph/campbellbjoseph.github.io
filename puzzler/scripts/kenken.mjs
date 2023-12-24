import { assign_operators, find_best_cell, are_adjacent, tangent_border, solutions, precompute } from "./generate_kenken.mjs";

var queryString = location.search.substring(1).split("|");
var n = parseInt(queryString[0]);
var diff = parseInt(queryString[1]);
var mod = parseInt(queryString[2]);
var gcd = parseInt(queryString[3]);
var lcm = parseInt(queryString[4]);
var zero_allowed = parseInt(queryString[5]);
var need_special = mod + gcd + lcm;
var special = [mod, gcd, lcm, zero_allowed]

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
var lastInsertion = null;
var affectedTiles = null;
var given = new Array();
var used_notes = false;
var paused = false;

var notes = new Map();

window.onload = function() {
    setGame();
    
}

function stopwatch() {
    if (won == false && paused == false) {
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

function do_outputs(m, cc, cov, p, z) {
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
    return solutions(m, JSON.parse(JSON.stringify(initial_array)), cc, cov, p, z);
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
    var out = assign_operators(n, diff, special);
    var grid = out[0];
    var cage_grid = out[1];
    var cage_cells = out[2];
    var cage_operators_values = out[3];
    var at_least_one_special = out[4];
    var p = precompute(n, cage_cells, cage_operators_values, zero_allowed);
    //console.log(out)
    //console.log(need_special)
    //console.log(need_special > 0 && at_least_one_special == false)
    let s = do_outputs(n, cage_cells, cage_operators_values, p, zero_allowed);
    //console.log(p)
    //console.log(s)

    let att = 1;
    while ((s != 1 || (need_special > 0 && at_least_one_special == false))) {
        if (s != 1) {
            console.log("Attempt " + att.toString() + ": Failed due to multiple solutions")
        } else {
            console.log("Attempt " + att.toString() + ": Failed due to lack of special")
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
    }
    //console.log(s)
    //console.log(p)
    solution = grid;
    console.log(grid);
    console.log(att);
    //console.log(grid);
    //console.log(cage_grid);
    //console.log(cage_cells);
    //console.log(cage_operators_values);
    //console.log(simulate(n, 100))
    for (let i = 1-zero_allowed; i <= n-zero_allowed; i++) {
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
            given.push(tile);
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
                    if (data[0] == "gcd" || data[0] == "lcm") {
                        inst.innerText = data[0] + "(" + data[1].toString() + ")";
                    } else {
                        inst.innerText = data[1].toString() + data[0];
                    }
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
    submit.classList.add("submit");
    submit.addEventListener("click", checkMistakes);
    submit.addEventListener("mouseenter", hoverSubmit);
    submit.addEventListener("mouseleave", exitSubmit);
    document.getElementById("buttons").append(submit);
    add_check();

    let del = document.createElement("div");
    del.id = "del";
    del.classList.add("del");
    del.addEventListener("mouseenter", hoverDel);
    del.addEventListener("mouseleave", exitDel);
    del.addEventListener("click", startDeleting);
    document.getElementById("buttons").append(del);
    add_trash();

    let note = document.createElement("div");
    note.id = "note";
    note.innerText = ""
    note.classList.add("noteButton");
    note.addEventListener("mouseenter", hoverNote);
    note.addEventListener("mouseleave", exitNote);
    note.addEventListener("click", takeNotes);
    document.getElementById("buttons").append(note);
    add_pencil();

    let reset = document.createElement("div");
    reset.id = "reset";
    reset.innerText = "";
    reset.classList.add("reset");
    reset.addEventListener("mouseenter", hoverReset);
    reset.addEventListener("mouseleave", exitReset);
    reset.addEventListener("click", resetBoard);
    document.getElementById("buttons").append(reset);
    add_reset();

    let pause = document.createElement("div");
    pause.id = "pause";
    pause.innerText = "";
    pause.classList.add("pause");
    pause.addEventListener("mouseenter", hoverReset);
    pause.addEventListener("mouseleave", exitReset);
    document.getElementById("title").append(pause);
    add_pause();

    window.addEventListener("keydown", function(event) {
        if (tileHovered != null && event.code.slice(0, 5) == "Digit") {
            if (zero_allowed) {
                if (parseInt(event.code[5]) <= n-1) {
                    updateTile(tileHovered, parseInt(event.code[5]));
                }
            }
            if (zero_allowed == false && event.code != "Digit0") {
                if (parseInt(event.code[5]) <= n) {
                    updateTile(tileHovered, parseInt(event.code[5]));
                }
            }
            
        }
        if (event.code == "ShiftLeft" || event.code == "ShiftRight") {
            resetButtons();
        }
        if (event.code == "Enter") {
            checkMistakes();
        }
        if (event.code == "KeyN" || event.code == "Keyn") {
            takeNotes();
        }
        if (event.code == "KeyD" || event.code == "Keyd") {
            startDeleting();
        }
        if (event.code == "KeyU") {
            undo_insertion();
        }
        if (event.code == "KeyP") {
            master_plus();
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

function add_check() {
    let s = document.getElementById("submit");
    let x = document.getElementById("x_check")
    if (x) {
        x.remove();
    }
    let checkmark_image = document.createElement("img");
    checkmark_image.src = "../puzzler/images/check.png"
    checkmark_image.id = "check";
    s.append(checkmark_image);
}

function add_pause() {
    paused = false;
    let p = document.getElementById("pause");
    p.removeEventListener("click", add_pause);
    let play = document.getElementById("play_image");
    if (play) {
        play.remove();
    }
    let p_image = document.createElement("img");
    p_image.src = "../puzzler/images/pause.png"
    p_image.id = "pause_image";
    p.addEventListener("click", pause_time);
    p.append(p_image);
    stopwatch();
}

function pause_time() {
    let p = document.getElementById("pause");
    p.removeEventListener("click", pause_time);
    paused = true;
    document.getElementById("pause_image").remove();
    let p_image = document.createElement("img");
    p_image.src = "../puzzler/images/play.png"
    p_image.id = "play_image";
    
    p.append(p_image);
    p.addEventListener("click", add_pause);
}

function add_x(b) {
    let s = null;
    if (b == "check") {
        s = document.getElementById("submit")
        let c = document.getElementById("check");
        if (c) {
            c.remove();
            rem = true;
        }
    }
    if (b == "trash") {
        s = document.getElementById("del")
        let d = document.getElementById("trash");
        if (d) {
            d.remove();
            rem = true
        }
    }
    if (b == "note") {
        s = document.getElementById("note")
        let d = document.getElementById("pencil");
        if (d) {
            d.remove();
            rem = true
        }
    }
    let x_image = document.createElement("img");
    x_image.src = "../puzzler/images/x.png";
    x_image.id = "x_" + b;
    s.append(x_image);
    
}

function add_trash() {
    let d = document.getElementById("del");
    let x = document.getElementById("x_trash")
    if (x) {
        x.remove();
    }
    let trash_image = document.createElement("img");
    trash_image.src = "../puzzler/images/trash.png"
    trash_image.id = "trash"
    d.append(trash_image);
}

function add_undo() {
    let undo = document.createElement("div");
    undo.id = "undo";
    undo.innerText = "";
    undo.classList.add("reset");
    undo.addEventListener("mouseenter", hoverReset);
    undo.addEventListener("mouseleave", exitReset);
    undo.addEventListener("click", undo_insertion);
    let undo_image = document.createElement("img");
    undo_image.src = "../puzzler/images/undo.png"
    undo_image.id = "undo_image"
    undo.append(undo_image);
    document.getElementById("buttons").append(undo);
}

function remove_undo() {
    let undo = document.getElementById("undo");
    undo.remove();
}

function add_reset() {
    let d = document.getElementById("reset");
    let reset_image = document.createElement("img");
    reset_image.src = "../puzzler/images/reset.png"
    reset_image.id = "reset_image"
    d.append(reset_image);
}

function add_pencil() {
    let p = document.getElementById("note");
    let x = document.getElementById("x_note");
    if (x) {
        x.remove();
    }
    let pencil_image = document.createElement("img");
    pencil_image.src = "../puzzler/images/pencil.png"
    pencil_image.id = "pencil"
    p.append(pencil_image);
}

function addNote(tile, note) {
    used_notes = true;
    if (notes.has(tile.id)) {
        let arr = notes.get(tile.id);
        arr.push(note);
        arr.sort();
        notes.set(tile.id, arr);
    } else {
        notes.set(tile.id, [note]);
    }
    resolveTile(tile);
}

function removeNote(tile, note) {
    //console.log("Deleting")
    //console.log(notes.get(tile.id))
    let arr = notes.get(tile.id);
    //console.log(arr.indexOf(parseInt(note)))
    arr.splice(arr.indexOf(parseInt(note)), 1)
    console.log(arr)
    notes.set(tile.id, arr);
    resolveTile(tile);
}

function cleanSlate(tile) {
    //console.log(tile);
    if (notes.has(tile.id)) {
        //console.log(notes.get(tile.id))
        for (let i = 0; i < notes.get(tile.id).length; i++) {
            let prev = document.getElementById(tile.id + ":note" + i.toString());
            prev.remove();
        }
    }
}

function resolveTile(tile) {
    let coords = tile.id.split("-"); //["0", "0"]
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
    let r_val = false;
    //console.log(taken);
    if (notes.has(tile.id) && notes.get(tile.id) != null) {
        let arr = notes.get(tile.id);
        //console.log(arr.length)
        let new_arr = new Array();
        for (let i = 0; i < arr.length; i++) {
            let note = parseInt(arr[i]);
            if (taken.includes(note) == false && new_arr.includes(note) == false) {
                new_arr.push(note);
            }
        }
        if (new_arr.length != arr) {
            r_val = true;
        }
        notes.set(tile.id, new_arr)

        for (let i = 0; i < new_arr.length; i++) {
            let note_div = document.createElement("div");
            note_div.innerText = new_arr[i].toString();
            note_div.id = tile.id + ":note" + i.toString();
            note_div.classList.add("note");
            note_div.style.marginLeft = (i * 13).toString() + "%";
            tile.append(note_div);
        }
    }
    return r_val;
}

function handleNote(tile, number) {
    number = parseInt(number)
    if (notes.has(tile.id)) {
        cleanSlate(tile)
        if ((notes.get(tile.id)).includes(parseInt(number))) {
            removeNote(tile, number);
        } else {
            addNote(tile, number);
        }
    }
    else {
        addNote(tile, number);
    }
}


function updateTile(tile, number) {
    if (takingNotes) {
        handleNote(tile, number);
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
        lastInsertion = [tile, number];
        tile.classList.add("wrong-tile");
        if (document.getElementById("undo") == null) {
            add_undo();
        }
    } 
    else {
        if (tile.classList.contains("wrong-tile")) {
            tile.classList.remove("wrong-tile");
        }
        if (edited) {
            cleanSlate(tile);
            notes.set(tile.id, [])
            affectedTiles = new Array();
            for (let i = 0; i < n; i++) {
                if (i != r) {
                    let t = document.getElementById(i.toString() + "-" + c.toString());
                    cleanSlate(t);
                    let change = resolveTile(t);
                    if (change) {
                        affectedTiles.push(t);
                    }
                }
                if (i != c) {
                    let t = document.getElementById(r.toString() + "-" + i.toString());
                    cleanSlate(t);
                    let change = resolveTile(t);
                    if (change) {
                        affectedTiles.push(t);
                    }
                }
            }
            lastInsertion = [tile, number];
            if (document.getElementById("undo") == null) {
                add_undo();
            }
            //console.log(lastInsertion);
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

function clearTile(tile) {
    if (deleting) {
        if (tile.innerHTML.length > 0 && tile.innerHTML[0] != "<") {
            tile.innerHTML  = tile.innerHTML.slice(1);
            //console.log(this.classList)
            if (tile.classList.contains("wrong-tile")){
                tile.classList.remove("wrong-tile");
            }
        }
    }
}

function selectTile() {
    if (deleting) {
        clearTile(this);
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

function hoverReset() {
    this.classList.add("reset-hovered");
}

function exitReset() {
    this.classList.remove("reset-hovered");
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

function checkMistakes() {
    stopDeleting();
    let mistakeList = findMistakes();
    let mistakes = mistakeList.length;
    
    for (let i = 0; i < mistakes; i++) {
        mistakeList[i].classList.add("wrong-tile");
    }

    let errorList = findErrors();
    let errors = errorList.length;
    if (errors == 0) {
        displayWin();
        return;
    }


    if (mistakes == 0) {
        console.log("Success!");
    } else {
        let check = document.getElementById("submit");
        check.innerText = "";
        check.removeEventListener("click", checkMistakes);
        check.addEventListener("click", clearMistakes);
        add_x("check");
    }
}

function displayWin() {
    let super_fast_messages = ["Super sonic!", "Speed demon!", "Speeeeedy!", "Fast as lightning!", "Speedy Gonzalez!", "Speedster!"]
    let fast_messages = ["Quick!", "Super star!", "Run Forrest run!", "Heroic.", "Legendary!"]
    let messages = ["Winner!", "Champ!", "Woooo!", "Too easy.", "Easy $$$", "Superb!", "Puzzle master!", "Gold star for you!", "Money shot!", "Swish!"];
    let slow_messages = ["Slow and steady wins the race!", "Cool, calm, and collected.", "The glory is in the struggle!", "You showed heart!", "Never give up!", "Way to hang in there"];

    let score = 60 * min + sec;
    let arr = null;
    let speed = 0;

    let sf_cutoff = [0,0,0,15,30,75,120,240,480,600,900,1200,1800]
    let f_cutoff = [0,0,0,30,60,120,180,360,660,900,1200,1800,2400]
    let r_cutoff = [0,0,0,45,100,180,300,480,900,1200,1800,2400,3600]

    let sf = sf_cutoff[n]*(1+0.2*diff+0.2*need_special);
    let f = f_cutoff[n]*(1+0.2*diff+0.2*need_special);
    let r = r_cutoff[n]*(1+0.2*diff+0.2*need_special);
    if (score <= sf) {
        arr = super_fast_messages;
        speed = 2;
    } else if (score <= f) {
        arr = fast_messages;
        speed = 1;
    } else if (score <= r) {
        arr = messages;
    } else {
        speed = -1;
        arr = slow_messages;
    }

    won = true;
    document.getElementById("pause").remove();
    document.getElementById("title").innerHTML += "<h1>" + arr[Math.floor(Math.random() * (arr.length) - 0.0001)] +"</h1>";
    if (speed == 1) {
        document.getElementById("title").innerHTML += "<h1>&#x1F525</h1>"
    } 
    if (speed == 2) {
        document.getElementById("title").innerHTML += "<h1>&#x1F525 &#x1F525</h1>"
    }
    if (speed == -1) {
        document.getElementById("title").innerHTML += "<h1>&#x1F422</h1>"
    }
    if (used_notes == false) {
        document.getElementById("title").innerHTML += "<h2>&#x2B50 Mental Master &#x2B50</h2>"
    }
    let new_game = document.createElement("form");
    new_game.action = "/puzzler/index.html";
    new_game.id = "new_game";
    new_game.classList.add()
    let b = document.createElement("input");
    b.type = "submit";
    b.value = "New game";
    b.classList.add("new_game");
    lock_buttons();
    document.getElementById("buttons").append(new_game);
    document.getElementById("new_game").append(b);
    
}

function lock_buttons() {
    document.getElementById("submit").removeEventListener("click", checkMistakes);
    document.getElementById("del").removeEventListener("click", startDeleting);
    document.getElementById("reset").removeEventListener("click", resetBoard);
    document.getElementById("note").removeEventListener("click", takeNotes);
    document.getElementById("undo").removeEventListener("click", undo_insertion);
}

function clearMistakes() {
    let x = document.getElementById("x_check")
    if (x) {
        let mistakeList = findMistakes();
        let mistakes = mistakeList.length;
        for (let i = 0; i < mistakes; i++) {
            mistakeList[i].classList.remove("wrong-tile");
        }
        let check = document.getElementById("submit"); 
        check.removeEventListener("click", clearMistakes);
        check.innerText = "";
        check.addEventListener("click", checkMistakes);
        add_check()
    }
}

function resetButtons() {
    stopDeleting();
    stopNotes();
    clearMistakes();
}

function startDeleting() {
    if (deleting == false) {
        deleting = true;
        let d = document.getElementById("del");
        d.innerText = "";
        d.removeEventListener("click", startDeleting);
        d.addEventListener("click", stopDeleting);
        add_x("trash");
    }
}

function stopDeleting() {
    if (deleting == true) {
        deleting = false;
        let d = document.getElementById("del");
        d.innerText = "";
        d.removeEventListener("click", stopDeleting);
        d.addEventListener("click", startDeleting);
        add_trash();
    }
}

function hoverNote() {
    this.classList.add("note-hovered");
}

function exitNote() {
    this.classList.remove("note-hovered");
}

function takeNotes() {
    if (takingNotes == false) {
        takingNotes = true;
        let no = document.getElementById("note");
        no.innerText = "";
        no.removeEventListener("click", takeNotes);
        no.addEventListener("click", stopNotes);
        add_x("note");

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
    
}

function add_all() {
    if (tileSelected) {
        cleanSlate(tileSelected);
        notes.set(tileSelected.id, [])
        for (let i = 1-zero_allowed; i <= n-zero_allowed; i++) {
            handleNote(tileSelected, i);
        }
    }
}

function master_plus() {
    if (confirm("Are you sure you want to fill in every tile?")) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                let t = document.getElementById(i.toString() + "-" + j.toString());
                if ((t.innerHTML.length > 0 && t.innerHTML[0] != "<") == false && (notes.has(t.id) == false || notes.get(t.id).length == 0)) {
                    tileSelected = t;
                    add_all();
                }
            }
        }
    }
}

function subtract_all() {
    if (tileSelected) {
        cleanSlate(tileSelected);
        notes.set(tileSelected.id, []);
    }
}

function stopNotes() {
    if (takingNotes == true) {
        takingNotes = false;
        let no = document.getElementById("note");
        no.innerText = "";
        no.removeEventListener("click", stopNotes);
        no.addEventListener("click", takeNotes);
        document.getElementById("+").remove();
        document.getElementById("-").remove();
        add_pencil();
    }
    
}

function resetBoard() {
    if (confirm("Are you sure you want to reset?")) {
        resetButtons();
        startDeleting();
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                let t = document.getElementById(i.toString() + "-" + j.toString());
                t.click();
            }
        }
        stopDeleting();
    }   
    
}

function undo_insertion() {
    if (lastInsertion != null) {
        resetButtons();
        let tile = lastInsertion[0];
        let val = lastInsertion[1];
        startDeleting();
        clearTile(tile);
        stopDeleting();
        if (affectedTiles != null) {
            for (let i = 0; i < affectedTiles.length; i++) {
                let t = affectedTiles[i];
                handleNote(t, val);
            }
        }
        cleanSlate(tile);
        resolveTile(tile);
        lastInsertion = null;
        affectedTiles = null;
        remove_undo();
    }
}