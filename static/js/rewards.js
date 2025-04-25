document.addEventListener('DOMContentLoaded', function() {
    console.log("Rewards page loaded");
    
    // DOM Elements
    const totalPointsEl = document.getElementById('total-points');
    const currentStreakEl = document.getElementById('current-streak-display');
    const todayPointsEl = document.getElementById('today-points');
    const longestStreakEl = document.getElementById('longest-streak');
    const streakProgressBar = document.getElementById('streak-progress-bar');
    const pointsHistoryEl = document.getElementById('points-history');
    const dayElements = document.querySelectorAll('.day');
    
    // Get username from the hidden element or from the script variable
    const username = document.getElementById('username-data').getAttribute('data-username') || username;
    console.log("Username:", username);
    
    // Constants
    const POINTS_PER_STREAK_DAY = 20;
    const MAX_STREAK_DAYS = 7;
    
    // Load rewards data
    loadRewardsData();
    
    // Functions
    function loadRewardsData() {
        console.log("Loading rewards data");
        
        // Try to get existing rewards data from localStorage
        const storageKey = `rewards_${username}`;
        const storedData = localStorage.getItem(storageKey);
        
        let rewardsData;
        
        if (storedData) {
            try {
                rewardsData = JSON.parse(storedData);
                console.log("Loaded rewards data:", rewardsData);
            } catch (error) {
                console.error("Error parsing stored rewards data:", error);
                rewardsData = initializeRewardsData();
            }
        } else {
            console.log("No existing rewards data found");
            rewardsData = initializeRewardsData();
        }
        
        // Get journal data to calculate streak
        const journalStorageKey = `journal_${username}`;
        const journalData = localStorage.getItem(journalStorageKey);
        
        if (journalData) {
            try {
                const parsedJournalData = JSON.parse(journalData);
                console.log("Loaded journal data:", parsedJournalData);
                
                // Calculate streak from journal data
                const streak = calculateStreak(parsedJournalData);
                
                // Update rewards based on streak
                updateRewardsBasedOnStreak(rewardsData, streak);
                
                // Save updated rewards data
                localStorage.setItem(storageKey, JSON.stringify(rewardsData));
            } catch (error) {
                console.error("Error processing journal data:", error);
            }
        }
        
        // Update UI with rewards data
        updateRewardsUI(rewardsData);
    }
    
    function initializeRewardsData() {
        return {
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastUpdated: null,
            pointsHistory: []
        };
    }
    
    function calculateStreak(journalData) {
        if (!journalData || Object.keys(journalData).length === 0) {
            return 0;
        }
        
        // Get all dates with journal entries
        const dates = Object.keys(journalData).sort();
        
        // Check if there's an entry for today
        const today = formatDate(new Date());
        const hasEntryToday = dates.includes(today);
        
        if (!hasEntryToday) {
            return 0;
        }
        
        // Count consecutive days
        let streak = 1;
        let currentDate = new Date(today);
        
        for (let i = 1; i <= MAX_STREAK_DAYS; i++) {
            // Check previous day
            currentDate.setDate(currentDate.getDate() - 1);
            const prevDate = formatDate(currentDate);
            
            if (dates.includes(prevDate)) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    function updateRewardsBasedOnStreak(rewardsData, streak) {
        const today = formatDate(new Date());
        
        // If already updated today, don't update again
        if (rewardsData.lastUpdated === today) {
            return;
        }
        
        // Update streak
        rewardsData.currentStreak = streak;
        
        // Update longest streak if current streak is longer
        if (streak > rewardsData.longestStreak) {
            rewardsData.longestStreak = streak;
        }
        
        // Calculate points earned today
        const pointsEarned = streak > 0 ? POINTS_PER_STREAK_DAY : 0;
        
        // Add points if streak is maintained
        if (pointsEarned > 0) {
            rewardsData.totalPoints += pointsEarned;
            
            // Add to points history
            rewardsData.pointsHistory.unshift({
                date: today,
                action: "Daily Streak",
                points: pointsEarned
            });
            
            // Limit history to last 10 entries
            if (rewardsData.pointsHistory.length > 10) {
                rewardsData.pointsHistory = rewardsData.pointsHistory.slice(0, 10);
            }
        }
        
        // Update last updated date
        rewardsData.lastUpdated = today;
    }
    
    function updateRewardsUI(rewardsData) {
        // Update total points
        totalPointsEl.textContent = rewardsData.totalPoints;
        
        // Update current streak
        currentStreakEl.textContent = `${rewardsData.currentStreak} days`;
        
        // Update today's points
        const today = formatDate(new Date());
        const todayPoints = rewardsData.pointsHistory.find(entry => entry.date === today)?.points || 0;
        todayPointsEl.textContent = todayPoints;
        
        // Update longest streak
        longestStreakEl.textContent = `${rewardsData.longestStreak} days`;
        
        // Update streak progress bar
        const progressPercentage = (rewardsData.currentStreak / MAX_STREAK_DAYS) * 100;
        streakProgressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
        
        // Update day indicators
        dayElements.forEach(dayEl => {
            const day = parseInt(dayEl.dataset.day);
            if (day <= rewardsData.currentStreak) {
                dayEl.classList.add('active');
            } else {
                dayEl.classList.remove('active');
            }
        });
        
        // Update points history
        updatePointsHistory(rewardsData.pointsHistory);
    }
    
    function updatePointsHistory(history) {
        if (history.length === 0) {
            pointsHistoryEl.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>Your points history will appear here</p>
                </div>
            `;
            return;
        }
        
        pointsHistoryEl.innerHTML = '';
        
        history.forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const date = new Date(entry.date);
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            
            historyItem.innerHTML = `
                <span class="history-date">${formattedDate}</span>
                <span class="history-action">${entry.action}</span>
                <span class="history-points">+${entry.points}</span>
            `;
            
            pointsHistoryEl.appendChild(historyItem);
        });
    }
    
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});
