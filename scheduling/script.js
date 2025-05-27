let playerNames = [];
let numWeeks = 0;
let courtsPerWeek = 0;
let nameToNumberMap = {};
let numberToNameMap = {};

function processData() {
    // Clear previous errors
    clearErrors();
    
    // Get names from textarea or file
    const namesInput = document.getElementById('names-input').value.trim();
    const fileInput = document.getElementById('file-input');
    
    if (namesInput) {
        playerNames = namesInput.split(',').map(name => name.trim()).filter(name => name);
    } else if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            playerNames = content.split(',').map(name => name.trim()).filter(name => name);
            continueProcessing();
        };
        reader.readAsText(file);
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
        <strong>Players per week (K):</strong> ${K}<br>
        <strong>Template file:</strong> ${N}-${K}-${numWeeks}.csv
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
    
    // Add download button
    html += '<div class="download-section">';
    html += '<button class="btn download-btn" onclick="downloadExcel()">📊 Download Excel File</button>';
    html += '</div>';
    
    // Add mapping information
    html += '<div class="mapping-section">';
    html += '<h4>🔀 Player Number Mapping</h4>';
    html += '<div class="mapping-grid">';
    
    for (const [name, number] of Object.entries(nameToNumberMap)) {
        html += `<div class="mapping-item">${name} → ${number}</div>`;
    }
    
    html += '</div>';
    html += '</div>';
    
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
    
    // Create mapping worksheet
    const mappingData = [];
    mappingData.push(['Player Name to Number Mapping']);
    mappingData.push(['']); // Empty row
    mappingData.push(['Player Name', 'Assigned Number']);
    
    for (const [name, number] of Object.entries(nameToNumberMap)) {
        mappingData.push([name, number]);
    }
    
    const mappingWs = XLSX.utils.aoa_to_sheet(mappingData);
    
    // Set column widths for mapping sheet
    mappingWs['!cols'] = [
        { width: 25 }, // Player name
        { width: 15 }  // Number
    ];
    
    XLSX.utils.book_append_sheet(wb, mappingWs, 'Player Mapping');
    
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Tennis_Schedule_${timestamp}.xlsx`;
    
    // Download the file
    XLSX.writeFile(wb, filename);
}
