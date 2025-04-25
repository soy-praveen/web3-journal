document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard loaded");
    
    // Get username and wallet address from template variables
    const username = document.getElementById('username-data').getAttribute('data-username');
    const currentWalletAddress = document.getElementById('wallet-data').getAttribute('data-wallet');
    
    console.log("Username:", username);
    console.log("Wallet address:", currentWalletAddress);
    
    // Test localStorage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        console.log("localStorage is working correctly");
    } catch (e) {
        console.error("localStorage access error:", e);
        alert("Cannot access localStorage. Journal entries won't be saved. This might be due to private browsing mode or browser settings.");
    }
    
    // DOM Elements
    const dateTabs = document.getElementById('date-tabs');
    const currentDateEl = document.getElementById('current-date');
    const journalText = document.getElementById('journal-text');
    const saveButton = document.getElementById('save-journal');
    const ventButton = document.getElementById('vent-button');
    const totalEntriesEl = document.getElementById('total-entries');
    const currentStreakEl = document.getElementById('current-streak');
    
    // Check if DOM elements are found
    console.log("Date tabs found:", dateTabs !== null);
    console.log("Current date element found:", currentDateEl !== null);
    console.log("Journal text found:", journalText !== null);
    console.log("Save button found:", saveButton !== null);
    console.log("Vent button found:", ventButton !== null);
    console.log("Total entries element found:", totalEntriesEl !== null);
    console.log("Current streak element found:", currentStreakEl !== null);
    
    // Modal elements
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.querySelector('.close-modal');
    const signButton = document.getElementById('sign-button');
    const authStatus = document.getElementById('auth-status');
    
    // Variables
    let currentDate = new Date();
    let formattedCurrentDate = formatDate(currentDate);
    let selectedDate = formattedCurrentDate;
    let journalData = {};
    let dateHistory = [];
    
    // Initialize
    loadJournalData();
    
    // Event Listeners
    if (saveButton) {
        console.log("Attaching click event to save button");
        saveButton.addEventListener('click', function(event) {
            console.log("Save button clicked");
            event.preventDefault(); // Prevent any form submission
            saveJournal();
        });
    } else {
        console.error("Save button not found in the DOM!");
    }
    
    if (ventButton) {
        ventButton.addEventListener('click', function(event) {
            event.preventDefault();
            console.log("Vent button clicked");
            window.location.href = '/vent';
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            authModal.style.display = 'none';
        });
    }
    
    if (signButton) {
        signButton.addEventListener('click', authenticateWallet);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
    });
    
    // Functions
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function loadJournalData() {
        console.log("Loading journal data");
        
        if (!username) {
            console.error("Username is undefined when loading journal data!");
            journalData = {};
            dateHistory = [formattedCurrentDate];
            renderDateTabs();
            loadJournalEntry(formattedCurrentDate);
            return;
        }
        
        const storageKey = `journal_${username}`;
        console.log("Storage key for loading:", storageKey);
        
        try {
            // Try to get existing journal data
            const storedData = localStorage.getItem(storageKey);
            console.log("Retrieved from localStorage:", storedData);
            
            if (storedData && storedData !== "undefined" && storedData !== "null") {
                try {
                    journalData = JSON.parse(storedData);
                    console.log("Parsed journal data:", journalData);
                } catch (parseError) {
                    console.error("Error parsing stored data:", parseError);
                    journalData = {};
                }
            } else {
                console.log("No existing journal data found");
                journalData = {};
            }
            
            // Update stats
            updateStats();
            
            // Generate date history (today + previous 4 days)
            dateHistory = [];
            
            // Add today
            dateHistory.push(formattedCurrentDate);
            
            // Add previous 4 days regardless of whether they have entries
            let prevDate = new Date(currentDate);
            for (let i = 1; i <= 4; i++) {
                prevDate.setDate(prevDate.getDate() - 1);
                dateHistory.push(formatDate(prevDate));
            }
            
            console.log("Date history:", dateHistory);
            
            // Render date tabs
            renderDateTabs();
            
            // Load today's journal
            loadJournalEntry(formattedCurrentDate);
        } catch (error) {
            console.error("Error loading journal data:", error);
            journalData = {};
            dateHistory = [formattedCurrentDate];
            renderDateTabs();
            loadJournalEntry(formattedCurrentDate);
        }
    }
    
    function updateStats() {
        console.log("Updating stats");
        console.log("Journal data:", journalData);
        
        // Update total entries
        const entriesCount = Object.keys(journalData).length;
        console.log("Total entries:", entriesCount);
        totalEntriesEl.textContent = entriesCount;
        
        // Calculate streak
        const streak = calculateStreak();
        console.log("Current streak:", streak);
        currentStreakEl.textContent = `${streak} days`;
    }
    
    function calculateStreak() {
        if (Object.keys(journalData).length === 0) {
            return 0;
        }
        
        // Get all dates with entries
        const dates = Object.keys(journalData).sort();
        
        // Check if there's an entry for today
        const today = formatDate(new Date());
        const latestEntry = dates[dates.length - 1];
        
        // If the latest entry is not from today or yesterday, streak is 0
        const latestDate = new Date(latestEntry);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - latestDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
            return 0;
        }
        
        // Count consecutive days
        let streak = 1;
        for (let i = dates.length - 1; i > 0; i--) {
            const currentDate = new Date(dates[i]);
            const prevDate = new Date(dates[i-1]);
            
            const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    function renderDateTabs() {
        if (!dateTabs) {
            console.error("Date tabs element not found!");
            return;
        }
        
        dateTabs.innerHTML = '';
        
        dateHistory.forEach(date => {
            const li = document.createElement('li');
            
            // Format the date for display
            const displayDate = formatDisplayDate(date);
            
            li.textContent = date === formattedCurrentDate ? `Today (${displayDate})` : displayDate;
            li.dataset.date = date;
            
            if (date === selectedDate) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', () => {
                if (date === formattedCurrentDate || date === selectedDate) {
                    // If clicking on today or the already selected date, just load it
                    selectDate(date);
                } else {
                    // For past dates, require authentication
                    showAuthModal(date);
                }
            });
            
            dateTabs.appendChild(li);
        });
    }
    
    function formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    function selectDate(date) {
        selectedDate = date;
        
        // Update active tab
        document.querySelectorAll('#date-tabs li').forEach(li => {
            li.classList.toggle('active', li.dataset.date === date);
        });
        
        // Load journal entry
        loadJournalEntry(date);
    }
    
    function loadJournalEntry(date) {
        // Get the entry or create an empty one if it doesn't exist
        const entry = journalData[date] || { content: '' };
        
        // Update UI
        currentDateEl.textContent = date === formattedCurrentDate 
            ? "Today's Journal" 
            : `Journal for ${formatDisplayDate(date)}`;
        
        journalText.value = entry.content || '';
        
        // Disable editing for past entries
        journalText.readOnly = date !== formattedCurrentDate;
        saveButton.style.display = date === formattedCurrentDate ? 'inline-flex' : 'none';
        
        console.log(`Loaded journal entry for ${date}:`, entry);
    }
    
    function saveJournal() {
        console.log("Save button clicked");
        
        const content = journalText.value.trim();
        console.log("Content to save:", content);
        
        if (!username) {
            console.error("Username is undefined!");
            alert("Cannot save: username is undefined");
            return;
        }
        
        const storageKey = `journal_${username}`;
        console.log("Storage key:", storageKey);
        
        // Show loading animation
        console.log("Adding loading class to save button");
        saveButton.classList.add('loading');
        saveButton.innerHTML = '<div class="loader"></div> Saving...';
        saveButton.disabled = true;
        
        // Simulate saving delay
        setTimeout(() => {
            try {
                // Update local data
                console.log("Current journal data:", journalData);
                
                if (!journalData[selectedDate]) {
                    journalData[selectedDate] = {};
                }
                
                journalData[selectedDate] = {
                    content: content,
                    updated_at: new Date().toISOString()
                };
                
                console.log("Updated journal data:", journalData);
                
                // Save to localStorage
                const dataToSave = JSON.stringify(journalData);
                console.log("Stringified data to save:", dataToSave);
                
                localStorage.setItem(storageKey, dataToSave);
                console.log("Data saved to localStorage with key:", storageKey);
                
                // Verify the save
                const savedData = localStorage.getItem(storageKey);
                console.log("Verification - data retrieved from localStorage:", savedData);
                
                // Update stats
                updateStats();
                
                // Restore button
                saveButton.classList.remove('loading');
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
                saveButton.disabled = false;
                
                // Show success message
                alert('Journal saved successfully!');
            } catch (error) {
                console.error("Error saving journal:", error);
                alert('Error saving journal: ' + error.message);
                
                // Restore button even if there's an error
                saveButton.classList.remove('loading');
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
                saveButton.disabled = false;
            }
        }, 2000);
    }
    
    function showAuthModal(date) {
        selectedDate = date;
        authStatus.textContent = '';
        authStatus.style.color = '';
        authModal.style.display = 'flex';
    }
    
    async function authenticateWallet() {
        authStatus.textContent = 'Requesting wallet signature...';
        authStatus.style.color = 'white';
        
        try {
            const provider = window.ethereum || window.okxwallet;
            
            if (!provider) {
                authStatus.textContent = 'No wallet detected. Please install a wallet extension.';
                authStatus.style.color = '#e74c3c';
                return;
            }
            
            // Request account access
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (accounts.length === 0) {
                authStatus.textContent = 'No accounts found. Please create an account in your wallet.';
                authStatus.style.color = '#e74c3c';
                return;
            }
            
            const walletAddress = accounts[0];
            
            // Create a unique message to sign
            const message = `Sign this message to view journal entry from ${selectedDate}: ${Date.now()}`;
            const msgParams = new TextEncoder().encode(message);
            
            // Request signature
            authStatus.textContent = 'Please sign the message in your wallet...';
            
            const signature = await provider.request({
                method: 'personal_sign',
                params: [
                    '0x' + Array.from(msgParams).map(b => b.toString(16).padStart(2, '0')).join(''),
                    walletAddress
                ]
            });
            
            // Since we're using localStorage, we don't need to verify with the server
            // Just check if the wallet address matches the current session
            if (walletAddress.toLowerCase() === currentWalletAddress.toLowerCase()) {
                authStatus.textContent = 'Authentication successful!';
                authStatus.style.color = '#2ecc71';
                
                // Close modal after a short delay
                setTimeout(() => {
                    authModal.style.display = 'none';
                    
                    // Load the journal entry
                    selectDate(selectedDate);
                }, 1000);
            } else {
                authStatus.textContent = 'Authentication failed: Wallet address does not match session';
                authStatus.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('Error:', error);
            
            if (error.code === 4001) {
                // User rejected the request
                authStatus.textContent = 'Signature request rejected. Please try again.';
            } else {
                authStatus.textContent = 'Error authenticating: ' + error.message;
            }
            
            authStatus.style.color = '#e74c3c';
        }
    }
});
