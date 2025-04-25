document.addEventListener('DOMContentLoaded', function() {
    console.log("Global chat loaded");
    
    // Get username from the hidden element
    const username = document.getElementById('username-data').getAttribute('data-username');
    console.log("Username:", username);
    
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const wordCount = document.getElementById('word-count');
    const sendButton = document.getElementById('send-button');
    
    // Initialize
    loadMessages();
    
    // Set up polling to refresh messages
    setInterval(loadMessages, 10000); // Refresh every 10 seconds
    
    // Event Listeners
    messageInput.addEventListener('input', updateWordCount);
    
    sendButton.addEventListener('click', function() {
        sendMessage();
    });
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Functions
    function updateWordCount() {
        const text = messageInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        
        wordCount.textContent = words;
        
        // Update UI based on word count
        if (words > 50) {
            wordCount.parentElement.classList.add('limit-reached');
            sendButton.classList.add('disabled');
            sendButton.disabled = true;
        } else {
            wordCount.parentElement.classList.remove('limit-reached');
            sendButton.classList.remove('disabled');
            sendButton.disabled = false;
        }
    }
    
    function sendMessage() {
        const text = messageInput.value.trim();
        
        if (!text) {
            return;
        }
        
        const words = text.split(/\s+/).length;
        
        if (words > 50) {
            alert('Message exceeds the 50 word limit. Please shorten your message.');
            return;
        }
        
        // Disable send button and show loading state
        sendButton.disabled = true;
        sendButton.innerHTML = '<div class="loader"></div> Sending...';
        
        fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: text
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Clear input
                messageInput.value = '';
                updateWordCount();
                
                // Reload messages
                loadMessages();
            } else {
                alert('Error sending message: ' + data.error);
            }
            
            // Restore send button
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error sending message. Please try again.');
            
            // Restore send button
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
        });
    }
    
    function loadMessages() {
        fetch('/get_messages')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderMessages(data.messages);
                } else {
                    console.error('Error loading messages:', data.error);
                }
            })
            .catch(error => {
                console.error('Error loading messages:', error);
            });
    }
    
    function renderMessages(messages) {
        // Clear loading indicator
        chatMessages.innerHTML = '';
        
        if (messages.length === 0) {
            // Show empty state
            chatMessages.innerHTML = `
                <div class="empty-chat">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet. Be the first to start the conversation!</p>
                </div>
            `;
            return;
        }
        
        // Render each message
        messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${msg.username === username ? 'self' : 'other'}`;
            
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(msg.timestamp).toLocaleDateString();
            
            messageEl.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${msg.username}</span>
                    <span class="message-time">${date} ${time}</span>
                </div>
                <div class="message-content">${msg.message}</div>
            `;
            
            chatMessages.appendChild(messageEl);
        });
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
