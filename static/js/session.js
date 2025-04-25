// Check session status periodically
function checkSession() {
    fetch('/check_session')
        .then(response => response.json())
        .then(data => {
            if (!data.loggedIn) {
                // User is not logged in, redirect to login page
                window.location.href = '/';
            }
        })
        .catch(error => console.error('Error checking session:', error));
}

// Check session every 30 seconds
setInterval(checkSession, 30000);

// Also check when the page loads
document.addEventListener('DOMContentLoaded', checkSession);
