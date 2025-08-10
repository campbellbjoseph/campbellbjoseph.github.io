let playerNames = [];
let numWeeks = 0;
let courtsPerWeek = 0;
let nameToNumberMap = {};
let numberToNameMap = {};
let originalWorkbook = null;
let currentFile = null;
let captainAssignments = {}; // Track captain assignments: {weekIndex: {courtIndex: captainName}}

async function processData() {
    // Clear previous errors
    clearErrors();
    
    // Get names from textarea or file
    const namesInput = document.getElementById('names-input').value.trim();
    const fileInput = document.getElementById('file-input');
    
    if (namesInput) {
        playerNames = namesInput.split(',').map(name => name.trim()).filter(name => name);
    } else if (currentFile) {
        try {
            const arrayBuffer = await readFileAsArrayBuffer(currentFile);
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            
            // Store the original workbook for later use
            originalWorkbook = workbook;
            
            // Get the first worksheet
            const firstWorksheet = workbook.worksheets[0];
            
            if (!firstWorksheet) {
                showError('file-error', 'No worksheets found in the Excel file.');
                return;
            }
            
            // Extract names from first column, filtering out empty cells
            playerNames = [];
            firstWorksheet.eachRow((row, rowNumber) => {
                const firstCell = row.getCell(1);
                if (firstCell.value && typeof firstCell.value === 'string') {
                    const name = firstCell.value.trim();
                    if (name) {
                        playerNames.push(name);
                    }
                }
            });
            
            if (playerNames.length === 0) {
                showError('file-error', 'No valid names found in the Excel file. Please ensure names are in the first column.');
                return;
            }
            
            continueProcessing();
        } catch (error) {
            console.error('Error processing Excel file:', error);
            showError('file-error', 'Error processing Excel file. Please ensure it\'s a valid Excel file with names in the first column.');
            updateFileDisplay(null); // Clear the file display on error
        }
        return;
    } else {
        showError('names-error', 'Please enter names or upload a file');
        return;
    }
    
    continueProcessing();
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function() {
            reject(new Error('Error reading the file. Please try again.'));
        };
        reader.readAsArrayBuffer(file);
    });
}

function continueProcessing() {
    // Get weeks and courts
    numWeeks = parseInt(document.getElementById('weeks-input').value);
    courtsPerWeek = parseInt(document.getElementById('courts-input').value);
    
    // Validate inputs
    if (!validateInputs()) {
        console.log("not valid");
        return;
    }
    
    // Calculate K = 4 * courts per week
    const K = 4 * courtsPerWeek;
    const N = playerNames.length;
    
    // Display processed data
    displayProcessedData(N, K);
    
    // Create random mapping from names to numbers [0, ..., N-1]
    createRandomMapping();
    
    // Show generate button
    document.getElementById('generate-btn').style.display = 'block';
}

function findValidCombinations(n, desiredCourts, desiredWeeks) {
    const combinations = [];
    // We'll look for combinations up to n/4 courts and 16 weeks
    for (let courts = 1; courts <= n/4; courts++) {
        for (let weeks = 1; weeks <= 16; weeks++) {
            if ((4 * courts * weeks) % n === 0) {
                // Calculate how far this combination is from the desired values
                // We use a weighted score where courts and weeks are equally important
                const courtsDiff = Math.abs(courts - desiredCourts);
                const weeksDiff = Math.abs(weeks - desiredWeeks);
                const distanceScore = courtsDiff + weeksDiff;
                
                combinations.push({ 
                    courts, 
                    weeks,
                    distanceScore,
                    playersPerWeek: 4 * courts
                });
            }
        }
    }
    
    // Sort by distance score (closest to desired values first)
    return combinations.sort((a, b) => a.distanceScore - b.distanceScore);
}

function validateInputs() {
    let isValid = true;
    
    if (playerNames.length === 0) {
        showError('names-error', 'Please enter at least one name');
        isValid = false;
    }
    
    if (!numWeeks || numWeeks < 1) {
        showError('weeks-error', 'Please enter a valid number of weeks');
        isValid = false;
    }
    
    if (!courtsPerWeek || courtsPerWeek < 1) {
        showError('courts-error', 'Please enter a valid number of courts');
        isValid = false;
    }

    if (numWeeks > 16) {
        showError('weeks-error', 'Please enter a valid number of weeks. There are at most 16 weeks in a season.');
        isValid = false;
    }

    if (playerNames.length > 50) {
        showError('weeks-error', 'Please enter a valid number of players. There are at most 50 players possible.');
        isValid = false;
    }

    let n = playerNames.length;
    let k = 4 * courtsPerWeek;
    let w = numWeeks;

    if (k > n) {
        showError('courts-error', `Please enter a valid number of courts. There are only ${n} players.`);
        isValid = false;
    }
    
    if ((k * w) % n != 0) {
        const validCombinations = findValidCombinations(n, courtsPerWeek, numWeeks);
        let suggestionsHtml = '<div class="suggestions">';
        suggestionsHtml += `<p>Invalid combination. Here are the closest valid options to ensure everyone plays an equal number of matches (assuming you wish to have ${n} players):</p>`;
        suggestionsHtml += '<table class="suggestions-table">';
        suggestionsHtml += '<tr><th>Number of Weeks</th><th>Courts per Week</th></tr>';
        
        // Show up to 5 suggestions, sorted by distance from input
        const suggestions = validCombinations.slice(0, 5);
        
        for (const combo of suggestions) {
            const courtsDiff = Math.abs(combo.courts - courtsPerWeek);
            const weeksDiff = Math.abs(combo.weeks - numWeeks);
            const diffText = courtsDiff + weeksDiff === 0 ? 'Exact match' : 
                           `${courtsDiff} court${courtsDiff !== 1 ? 's' : ''}, ${weeksDiff} week${weeksDiff !== 1 ? 's' : ''}`;
            
            suggestionsHtml += `<tr>
                <td>${combo.weeks}</td>
                <td>${combo.courts}</td>
            </tr>`;
        }
        
        suggestionsHtml += '</table>';
        suggestionsHtml += '<p>Please adjust your inputs to match one of these combinations.</p>';
        suggestionsHtml += '</div>';
        
        // Show the suggestions in a new error element
        const errorDiv = document.createElement('div');
        errorDiv.id = 'schedule-error';
        errorDiv.className = 'error';
        errorDiv.innerHTML = suggestionsHtml;
        
        // Remove any existing schedule error
        const existingError = document.getElementById('schedule-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Insert the error after the courts input
        const courtsInput = document.getElementById('courts-input');
        courtsInput.parentNode.insertBefore(errorDiv, courtsInput.nextSibling);
        
        isValid = false;
    }
    
    return isValid;
}

function createRandomMapping() {
    const N = playerNames.length;
    const numbers = Array.from({length: N}, (_, i) => i);
    
    // Shuffle the numbers array using Fisher-Yates algorithm
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    // Create mappings
    nameToNumberMap = {};
    numberToNameMap = {};
    
    for (let i = 0; i < N; i++) {
        nameToNumberMap[playerNames[i]] = numbers[i];
        numberToNameMap[numbers[i]] = playerNames[i];
    }
}

function displayProcessedData(N, K) {
    document.getElementById('name-count').textContent = `Total Players: ${N}`;
    document.getElementById('name-list').innerHTML = `
        <strong>Players:</strong> ${playerNames.join(', ')}
    `;
    document.getElementById('schedule-params').innerHTML = `
        <strong>Weeks:</strong> ${numWeeks}<br>
        <strong>Courts per week:</strong> ${courtsPerWeek}<br>
        <strong>Players per week:</strong> ${K}<br>
    `;
    document.getElementById('result-container').style.display = 'block';
}

async function generateSchedule() {
    const N = playerNames.length;
    const K = 4 * courtsPerWeek;
    const templateFile = `${N}-${K}-${numWeeks}.csv`;
    
    try {
        // Load the CSV template
        const response = await fetch(`tennis_templates/${templateFile}`);
        
        if (!response.ok) {
            throw new Error(`Template file ${templateFile} not found`);
        }
        
        const csvContent = await response.text();
        
        // Parse the CSV and generate the schedule
        const schedule = parseAndGenerateSchedule(csvContent);
        
        // Display the schedule
        displaySchedule(schedule);
        
    } catch (error) {
        console.error('Error generating schedule:', error);
        document.getElementById('schedule-output').innerHTML = `
            <div class="error">Error: ${error.message}</div>
        `;
        document.getElementById('schedule-output').style.display = 'block';
    }
}

function parseAndGenerateSchedule(csvContent) {
    const lines = csvContent.trim().split('\n');
    const schedule = [];
    let currentWeek = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('Week ')) {
            // New week header
            currentWeek = {
                week: trimmedLine,
                matches: []
            };
            schedule.push(currentWeek);
        } else if (trimmedLine && currentWeek) {
            // Match line with player numbers
            const playerNumbers = trimmedLine.split(',').map(num => parseInt(num.trim()));
            
            // Convert numbers to names using our mapping
            const playerNamesForMatch = playerNumbers.map(num => numberToNameMap[num]);
            
            currentWeek.matches.push(playerNamesForMatch);
        }
    }
    
    return schedule;
}

function assignCaptains(schedule) {
    // Initialize captain count for each player
    const captainCount = {};
    playerNames.forEach(name => captainCount[name] = 0);
    
    // Reset captain assignments
    captainAssignments = {};
    
    // Create a list of all court slots that need captains
    const courtSlots = [];
    for (let weekIndex = 0; weekIndex < schedule.length; weekIndex++) {
        const week = schedule[weekIndex];
        for (let courtIndex = 0; courtIndex < week.matches.length; courtIndex++) {
            courtSlots.push({
                weekIndex,
                courtIndex,
                players: week.matches[courtIndex]
            });
        }
    }
    
    // Assign captains to ensure fair distribution
    for (const slot of courtSlots) {
        const { weekIndex, courtIndex, players } = slot;
        
        if (!captainAssignments[weekIndex]) {
            captainAssignments[weekIndex] = {};
        }
        
        // Find the player with the lowest captain count among the 4 players on this court
        let selectedCaptain = null;
        let minCount = Infinity;
        
        for (const player of players) {
            if (captainCount[player] < minCount) {
                minCount = captainCount[player];
                selectedCaptain = player;
            }
        }
        
        // If multiple players have the same low count, pick the first one
        if (selectedCaptain) {
            captainAssignments[weekIndex][courtIndex] = selectedCaptain;
            captainCount[selectedCaptain]++;
        }
    }
    
    console.log('Captain assignments:', captainAssignments);
    console.log('Final captain counts:', captainCount);
}

function displaySchedule(schedule) {
    // Assign captains before displaying
    assignCaptains(schedule);
    
    let html = '<h3>🎾 Generated Schedule</h3>';
    
    // Add download button at the top
    html += '<div class="download-section">';
    html += '<button class="btn download-btn" onclick="downloadExcel()">📊 Download Excel File</button>';
    html += '</div>';
    
    for (let weekIndex = 0; weekIndex < schedule.length; weekIndex++) {
        const week = schedule[weekIndex];
        html += `<div class="week-section">`;
        html += `<h4>${week.week}</h4>`;
        
        for (let courtIndex = 0; courtIndex < week.matches.length; courtIndex++) {
            const match = week.matches[courtIndex];
            const captain = captainAssignments[weekIndex][courtIndex];
            
            // Format player names with captain in bold
            const formattedPlayers = match.map(player => 
                player === captain ? `<strong>${player}</strong>` : player
            );
            
            html += `<div class="match">`;
            html += `<strong>Court ${courtIndex + 1}:</strong> ${formattedPlayers.join(', ')}`;
            html += `</div>`;
        }
        
        html += `</div>`;
    }
    
    document.getElementById('schedule-output').innerHTML = html;
    document.getElementById('schedule-output').style.display = 'block';
    
    // Store schedule globally for Excel export
    window.currentSchedule = schedule;
}

function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error');
    errorElements.forEach(element => element.textContent = '');
}

async function downloadExcel() {
    if (!window.currentSchedule) {
        alert('No schedule data available. Please generate a schedule first.');
        return;
    }
    
    try {
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        
        // Set workbook properties
        workbook.creator = 'RallyReady';
        workbook.lastModifiedBy = 'RallyReady';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // If we have the original workbook, copy its first sheet
        if (originalWorkbook && originalWorkbook.worksheets.length > 0) {
            const originalSheet = originalWorkbook.worksheets[0];
            const newSheet = workbook.addWorksheet(originalSheet.name || 'Players');
            
            // Copy data from original sheet
            originalSheet.eachRow((row, rowNumber) => {
                const newRow = newSheet.getRow(rowNumber);
                row.eachCell((cell, colNumber) => {
                    newRow.getCell(colNumber).value = cell.value;
                });
            });
        }
        
        // Create Schedule worksheet
        await createScheduleSheet(workbook);
        
        // Create Scores worksheet
        await createScoresSheet(workbook);
        
        // Create Results worksheet
        await createResultsSheet(workbook);
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `Tennis_Schedule_${timestamp}.xlsx`;
        
        // Download the file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error creating Excel file:', error);
        alert('Error creating Excel file. Please try again.');
    }
}

async function createScheduleSheet(workbook) {
    const worksheet = workbook.addWorksheet('Schedule');
    
    // Add header information
    worksheet.getCell('A1').value = `Total Players: ${playerNames.length}`;
    worksheet.getCell('A2').value = `Weeks: ${numWeeks}`;
    worksheet.getCell('A3').value = `Courts per week: ${courtsPerWeek}`;
    
    // Create column headers
    const headerRow = worksheet.getRow(5);
    headerRow.getCell(1).value = 'Week';
    for (let i = 1; i <= courtsPerWeek; i++) {
        headerRow.getCell(i + 1).value = `Court ${i}`;
    }
    headerRow.getCell(courtsPerWeek + 2).value = 'Not Playing';
    
    // Style the header row
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add schedule data by week
    for (let weekIndex = 0; weekIndex < window.currentSchedule.length; weekIndex++) {
        const week = window.currentSchedule[weekIndex];
        const row = worksheet.getRow(weekIndex + 6);
        
        row.getCell(1).value = `Week ${weekIndex + 1}`;
        
        // Collect all players playing this week
        const playersThisWeek = new Set();
        
        // Add each court's players as comma-separated values
        for (let courtIndex = 0; courtIndex < week.matches.length; courtIndex++) {
            const match = week.matches[courtIndex];
            const captain = captainAssignments[weekIndex] ? captainAssignments[weekIndex][courtIndex] : null;
            
            // Create rich text with captain in bold
            if (captain) {
                const richText = [];
                for (let i = 0; i < match.length; i++) {
                    const player = match[i];
                    if (i > 0) {
                        richText.push({ text: ', ' });
                    }
                    if (player === captain) {
                        richText.push({ text: player, font: { bold: true } });
                    } else {
                        richText.push({ text: player });
                    }
                }
                row.getCell(courtIndex + 2).value = { richText: richText };
            } else {
                row.getCell(courtIndex + 2).value = match.join(', ');
            }
            
            // Add players to the set of players playing this week
            match.forEach(player => playersThisWeek.add(player));
        }
        
        // Find players not playing this week
        const notPlaying = playerNames.filter(player => !playersThisWeek.has(player));
        row.getCell(courtsPerWeek + 2).value = notPlaying.join(', ');
    }
    
    // Add footer information
    const footerStartRow = window.currentSchedule.length + 7;
    worksheet.getCell(`A${footerStartRow}`).value = "The following schedules are generated by a computer algorithm to ensure fairness.";
    worksheet.getCell(`A${footerStartRow + 1}`).value = "All players play an equal number of matches, and courts are assigned in such a way as to minimize the number of times players play against the same opponent.";
    worksheet.getCell(`A${footerStartRow + 2}`).value = "Captains are automatically assigned (shown in bold) to ensure each player serves as captain an equal number of times.";
    worksheet.getCell(`A${footerStartRow + 3}`).value = "Note that making use of substitutes will alter the balance of the schedule, so please keep that in mind.";
    worksheet.getCell(`A${footerStartRow + 4}`).value = "Generated by RallyReady, visit https://campbellbjoseph.com/scheduling for more details.";
    
    // Set column widths
    worksheet.getColumn(1).width = 12; // Week column
    for (let i = 2; i <= courtsPerWeek + 1; i++) {
        worksheet.getColumn(i).width = 35; // Court columns
    }
    worksheet.getColumn(courtsPerWeek + 2).width = 30; // Not Playing column
}

async function createScoresSheet(workbook) {
    const worksheet = workbook.addWorksheet('Scores');
    
    let currentRow = 1;
    
    for (let weekIndex = 0; weekIndex < window.currentSchedule.length; weekIndex++) {
        const week = window.currentSchedule[weekIndex];
        
        // Week header with formula reference to Schedule sheet
        const headerRow = worksheet.getRow(currentRow);
        headerRow.getCell(1).value = { formula: `Schedule!A${weekIndex + 6}` };
        headerRow.getCell(2).value = 'Players';
        headerRow.getCell(3).value = 'Total Score';
        
        // Style header row
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' }
        };
        
        currentRow++;
        
        for (let courtIndex = 0; courtIndex < week.matches.length; courtIndex++) {
            const match = week.matches[courtIndex];
            
            // Create 4 rows for the 4 players on this court
            for (let playerIndex = 0; playerIndex < match.length; playerIndex++) {
                const row = worksheet.getRow(currentRow);
                
                // Only put court label on the first player's row
                if (playerIndex === 0) {
                    row.getCell(1).value = `Court ${courtIndex + 1}:`;
                }
                
                row.getCell(2).value = match[playerIndex];
                
                // Only put score input on the last player's row
                if (playerIndex === match.length - 1) {
                    row.getCell(3).value = ''; // Empty score cell
                }
                
                currentRow++;
            }
        }
        
        // Empty row between weeks
        currentRow++;
    }
    
    // Set column widths
    worksheet.getColumn(1).width = 15; // Court column
    worksheet.getColumn(2).width = 40; // Players column
    worksheet.getColumn(3).width = 15; // Score column
}



async function createResultsSheet(workbook) {
    const worksheet = workbook.addWorksheet('Results');
    
    // Header row
    const headerRow = worksheet.getRow(1);
    headerRow.getCell(1).value = 'Players';
    for (let i = 1; i <= numWeeks; i++) {
        headerRow.getCell(i + 1).value = { formula: `Schedule!A${i + 5}` };
    }
    headerRow.getCell(numWeeks + 2).value = 'Total points';
    
    // Style header row
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add each player with formulas
    for (let playerIndex = 0; playerIndex < playerNames.length; playerIndex++) {
        const playerName = playerNames[playerIndex];
        const row = worksheet.getRow(playerIndex + 2);
        
        row.getCell(1).value = playerName;
        
        // Add week formulas
        for (let weekNum = 1; weekNum <= numWeeks; weekNum++) {
            const r = playerIndex + 2;
            const st = 2 + (courtsPerWeek * 4 + 2) * (weekNum - 1);
            const end = st + courtsPerWeek * 4 - 1;
            const formula = `SUMIF(Scores!$B${st}:$B${end}, A${r}, Scores!$C${st}:$C${end})`;
            row.getCell(weekNum + 1).value = { formula: formula };
        }
        
        // Total points formula (sum of all week columns for this row)
        const startCol = 'B';
        const endCol = String.fromCharCode(66 + numWeeks - 1); // Last week column
        const rowNum = playerIndex + 2;
        const totalFormula = `SUM(${startCol}${rowNum}:${endCol}${rowNum})`;
        row.getCell(numWeeks + 2).value = { formula: totalFormula };
    }
    
    // Add weekly totals row
    const weeklyTotalsRow = worksheet.getRow(playerNames.length + 2);
    weeklyTotalsRow.getCell(1).value = 'Weekly Totals';
    weeklyTotalsRow.font = { bold: true };
    weeklyTotalsRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
    };
    
    // Add formulas to sum each week's total points
    for (let weekNum = 1; weekNum <= numWeeks; weekNum++) {
        const col = String.fromCharCode(66 + weekNum - 1); // B, C, D, etc.
        const startRow = 2;
        const endRow = playerNames.length + 1;
        const formula = `SUM(${col}${startRow}:${col}${endRow})`;
        weeklyTotalsRow.getCell(weekNum + 1).value = { formula: formula };
    }
    
    // Add footer note
    const footerRow = worksheet.getRow(playerNames.length + 4);
    footerRow.getCell(1).value = "If the formulas are not working, it is likely that two players have the same name or one's player name is a substring of another's player name (e.g. 'Beth and Bethany'). Please make the names unique and reload the scheduling, or fix the formulas manually.";
    
    // Set column widths
    worksheet.getColumn(1).width = 15; // Players column
    for (let i = 2; i <= numWeeks + 1; i++) {
        worksheet.getColumn(i).width = 12; // Week columns
    }
    worksheet.getColumn(numWeeks + 2).width = 15; // Total points column
}

function updateFileDisplay(file) {
    const fileUpload = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadedFileName = document.getElementById('uploaded-file-name');
    const removeFileBtn = document.getElementById('remove-file');
    
    if (file) {
        currentFile = file;
        fileUpload.classList.add('has-file');
        uploadedFileName.textContent = file.name;
        fileNameDisplay.classList.add('show');
        
        // Update the label text
        document.querySelector('.file-upload-label').textContent = '📁 Click to change file';
    } else {
        currentFile = null;
        fileUpload.classList.remove('has-file');
        fileNameDisplay.classList.remove('show');
        uploadedFileName.textContent = '';
        
        // Reset the label text
        document.querySelector('.file-upload-label').textContent = '📁 Click to upload an Excel file (.xlsx or .xls) with names in the first column';
        
        // Clear the file input
        document.getElementById('file-input').value = '';
    }
}

// Add event listener setup
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const removeFileBtn = document.getElementById('remove-file');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            updateFileDisplay(file);
        }
    });
    
    removeFileBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        updateFileDisplay(null);
        clearErrors();
    });
});
