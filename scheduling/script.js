let playerNames = [];
let numWeeks = 0;
let courtsPerWeek = 0;
let nameToNumberMap = {};
let numberToNameMap = {};
let originalWorkbook = null;
let currentFile = null;

function processData() {
    // Clear previous errors
    clearErrors();
    
    // Get names from textarea or file
    const namesInput = document.getElementById('names-input').value.trim();
    const fileInput = document.getElementById('file-input');
    
    if (namesInput) {
        playerNames = namesInput.split(',').map(name => name.trim()).filter(name => name);
    } else if (currentFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                originalWorkbook = XLSX.read(data, { type: 'array' });
                
                // Get the first worksheet
                const firstSheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
                
                // Convert to JSON and extract names from first column
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Extract names from first column, filtering out empty cells
                playerNames = jsonData
                    .map(row => row[0]) // Get first column
                    .filter(name => name && typeof name === 'string') // Filter out empty cells and non-strings
                    .map(name => name.trim()) // Trim whitespace
                    .filter(name => name); // Filter out empty strings after trimming
                
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
        };
        reader.onerror = function() {
            showError('file-error', 'Error reading the file. Please try again.');
            updateFileDisplay(null); // Clear the file display on error
        };
        reader.readAsArrayBuffer(currentFile);
        return;
    } else {
        showError('names-error', 'Please enter names or upload a file');
        return;
    }
    
    continueProcessing();
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

    let n = playerNames.length;
    let k = 4 * courtsPerWeek;
    let w = numWeeks;
    
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

function displaySchedule(schedule) {
    let html = '<h3>🎾 Generated Schedule</h3>';
    
    // Add download button at the top
    html += '<div class="download-section">';
    html += '<button class="btn download-btn" onclick="downloadExcel()">📊 Download Excel File</button>';
    html += '</div>';
    
    for (const week of schedule) {
        html += `<div class="week-section">`;
        html += `<h4>${week.week}</h4>`;
        
        for (let i = 0; i < week.matches.length; i++) {
            const match = week.matches[i];
            html += `<div class="match">`;
            html += `<strong>Court ${i + 1}:</strong> ${match.join(' vs ')}`;
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

function downloadExcel() {
    if (!window.currentSchedule) {
        alert('No schedule data available. Please generate a schedule first.');
        return;
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // If we have the original workbook, copy its first sheet
    if (originalWorkbook) {
        const originalSheetName = originalWorkbook.SheetNames[0];
        const originalSheet = originalWorkbook.Sheets[originalSheetName];
        
        // Create a new sheet with the same name and data
        const newSheet = XLSX.utils.aoa_to_sheet(XLSX.utils.sheet_to_json(originalSheet, { header: 1 }));
        XLSX.utils.book_append_sheet(wb, newSheet, originalSheetName);
    }
    
    // Create schedule worksheet
    const scheduleData = [];
    
    // Add header
    scheduleData.push(['Tennis Tournament Schedule']);
    scheduleData.push(['']); // Empty row
    scheduleData.push([`Total Players: ${playerNames.length}`]);
    scheduleData.push([`Weeks: ${numWeeks}`]);
    scheduleData.push([`Courts per week: ${courtsPerWeek}`]);
    scheduleData.push(['']); // Empty row
    
    // Add schedule data
    for (const week of window.currentSchedule) {
        scheduleData.push([week.week]);
        
        for (let i = 0; i < week.matches.length; i++) {
            const match = week.matches[i];
            scheduleData.push([`Court ${i + 1}`, ...match]);
        }
        
        scheduleData.push(['']); // Empty row between weeks
    }
    
    const scheduleWs = XLSX.utils.aoa_to_sheet(scheduleData);
    
    // Set column widths
    scheduleWs['!cols'] = [
        { width: 15 }, // Court column
        { width: 20 }, // Player 1
        { width: 20 }, // Player 2
        { width: 20 }, // Player 3
        { width: 20 }  // Player 4
    ];
    
    XLSX.utils.book_append_sheet(wb, scheduleWs, 'Schedule');
    
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Tennis_Schedule_${timestamp}.xlsx`;
    
    // Download the file
    XLSX.writeFile(wb, filename);
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
