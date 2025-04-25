from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os
import json
from datetime import datetime, timedelta
from eth_account.messages import encode_defunct
from web3 import Web3
from web3.auto import w3
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Generate a random secret key

# File to store user data
USERS_FILE = 'users.json'
JOURNALS_DIR = r'C:\Users\yosoy\OneDrive\Desktop\HCI test\journals'
# Ensure directories exist
os.makedirs(JOURNALS_DIR, exist_ok=True)

# Load users or create empty users file
if os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'r') as f:
        users = json.load(f)
else:
    users = {}
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)

# Helper functions
def save_users():
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)

def get_user_journal_file(username):
    return os.path.join(JOURNALS_DIR, f"{username}.json")



def load_user_journals(username):
    journal_file = get_user_journal_file(username)
    if os.path.exists(journal_file):
        with open(journal_file, 'r') as f:
            return json.load(f)
    return {}

def save_user_journals(username, journals):
    """Save user journals to file with error handling"""
    journal_file = get_user_journal_file(username)
    try:
        # Ensure the directory exists
        os.makedirs(JOURNALS_DIR, exist_ok=True)
        
        logger.info(f"Saving journal for {username} to {journal_file}")
        
        # Write to the file
        with open(journal_file, 'w') as f:
            json.dump(journals, f, indent=2)
        
        # Verify the file was created
        if os.path.exists(journal_file):
            logger.info(f"Successfully saved journal for {username}")
            return True
        else:
            logger.error(f"File not found after save: {journal_file}")
            return False
    except Exception as e:
        logger.error(f"Error saving journal for {username}: {e}")
        return False





def verify_signature(message, signature, address):
    """Verify that the signature was created by the address owner"""
    try:
        # Ensure the message is properly formatted
        if isinstance(message, str):
            message_bytes = message.encode('utf-8')
        else:
            message_bytes = message
            
        # Create the message hash
        message_hash = encode_defunct(text=message)
        
        # Recover the address from the signature
        recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
        
        # Compare addresses (case-insensitive)
        is_valid = recovered_address.lower() == address.lower()
        
        logger.info(f"Signature verification: Expected {address}, Recovered {recovered_address}, Valid: {is_valid}")
        
        return is_valid
    except ValueError as e:
        # Handle specific ValueError exceptions
        logger.error(f"ValueError in signature verification: {str(e)}")
        if "Invalid signature" in str(e):
            logger.error("The signature format is invalid")
        elif "Incorrect recovery id" in str(e):
            logger.error("The recovery ID in the signature is incorrect")
        return False
    except TypeError as e:
        # Handle TypeError exceptions (often related to input format)
        logger.error(f"TypeError in signature verification: {str(e)}")
        return False
    except Exception as e:
        # Catch all other exceptions
        logger.error(f"Unexpected error in signature verification: {str(e)}")
        return False

def calculate_streak(journals):
    """Calculate the current streak of journal entries"""
    if not journals:
        return 0
    
    # Get all dates with entries
    dates = sorted([datetime.strptime(date, '%Y-%m-%d') for date in journals.keys()])
    
    if not dates:
        return 0
    
    # Check if there's an entry for today
    today = datetime.now().date()
    latest_entry = dates[-1].date()
    
    # If the latest entry is not from today or yesterday, streak is 0
    if (today - latest_entry).days > 1:
        return 0
    
    # Count consecutive days
    streak = 1
    for i in range(len(dates) - 1, 0, -1):
        if (dates[i].date() - dates[i-1].date()).days == 1:
            streak += 1
        else:
            break
    
    return streak

# Routes
@app.route('/login')
def index():
    if 'username' in session and 'wallet_address' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/index')
@app.route('/')
def landing():
    """Landing page"""
    if 'username' in session and 'wallet_address' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    wallet_address = data.get('walletAddress')
    signature = data.get('signature')
    message = data.get('message')
    
    # Validate input
    if not username or not wallet_address:
        return jsonify({'error': 'Username and wallet address are required'}), 400
    
    # Verify signature if provided
    if signature and message:
        if not verify_signature(message, signature, wallet_address):
            return jsonify({'error': 'Invalid signature'}), 400
    
    # Check if username already exists
    for user_data in users.values():
        if user_data.get('username') == username:
            return jsonify({'error': 'Username already exists'}), 400
    
    # Check if wallet already exists
    if wallet_address in users:
        return jsonify({'error': 'Wallet address already registered'}), 400
    
    # Register new user
    users[wallet_address] = {
        'username': username,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    save_users()
    
    # Set session
    session['username'] = username
    session['wallet_address'] = wallet_address
    
    return jsonify({'success': True, 'message': 'Registration successful'}), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    wallet_address = data.get('walletAddress')
    signature = data.get('signature')
    message = data.get('message')
    
    # Validate input
    if not wallet_address:
        return jsonify({'error': 'Wallet address is required'}), 400
    
    # Check if wallet exists
    if wallet_address not in users:
        return jsonify({'error': 'Wallet not registered. Please sign up first.'}), 404
    
    # Verify signature if provided
    if signature and message:
        if not verify_signature(message, signature, wallet_address):
            return jsonify({'error': 'Invalid signature'}), 400
    
    # Set session
    session['username'] = users[wallet_address]['username']
    session['wallet_address'] = wallet_address
    
    return jsonify({'success': True, 'message': 'Login successful'}), 200

@app.route('/logout')
def logout():
    session.pop('username', None)
    session.pop('wallet_address', None)
    return redirect(url_for('index'))

@app.route('/check_session')
def check_session():
    """Endpoint to check if user is still logged in"""
    if 'username' in session and 'wallet_address' in session:
        return jsonify({
            'loggedIn': True, 
            'username': session['username'],
            'walletAddress': session['wallet_address']
        })
    return jsonify({'loggedIn': False})

@app.route('/dashboard')
def dashboard():
    if 'username' not in session or 'wallet_address' not in session:
        return redirect(url_for('index'))
    
    username = session['username']
    wallet_address = session['wallet_address']
    
    return render_template('dashboard.html', username=username, wallet_address=wallet_address)

# We no longer need these routes since we're using localStorage
# @app.route('/get_journal_data')
# @app.route('/save_journal', methods=['POST'])

@app.route('/nft')
def nft():
    """NFT rewards page"""
    if 'username' not in session:
        return redirect(url_for('index'))
    
    username = session['username']
    wallet_address = session['wallet_address']
    
    return render_template('nft.html', username=username, wallet_address=wallet_address)

@app.route('/get_journal_data')
def get_journal_data():
    """Endpoint to get journal data for the current user"""
    if 'username' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    username = session['username']
    
    try:
        journals = load_user_journals(username)
        
        # Calculate streak
        streak = calculate_streak(journals)
        
        return jsonify({
            'journal': journals,
            'streak': f"{streak} days"
        })
    except Exception as e:
        print(f"Error loading journal data: {e}")
        return jsonify({'error': 'Failed to load journal data', 'details': str(e)}), 500

@app.route('/save_journal', methods=['POST'])
def save_journal():
    """Endpoint to save journal entry"""
    if 'username' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    logger.info(f"Received save request with data: {data}")
    
    date = data.get('date')
    content = data.get('content')
    
    if not date:
        return jsonify({'error': 'Date is required'}), 400
    
    username = session['username']
    logger.info(f"Attempting to save journal for user {username} on date {date}")
    
    try:
        # Load existing journals
        journals = load_user_journals(username)
        logger.info(f"Loaded existing journals for {username}: {journals}")
        
        # Update or create journal entry
        if date in journals:
            journals[date]['content'] = content
            journals[date]['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            logger.info(f"Updated existing entry for {date}")
        else:
            journals[date] = {
                'content': content,
                'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            logger.info(f"Created new entry for {date}")
        
        # Save the updated journals
        save_success = save_user_journals(username, journals)
        
        if save_success:
            logger.info(f"Successfully saved journal entry for {username} on {date}")
            return jsonify({'success': True})
        else:
            logger.error(f"Failed to save journal entry to disk for {username}")
            return jsonify({'error': 'Failed to save journal entry to disk'}), 500
    except Exception as e:
        logger.error(f"Error saving journal: {e}")
        return jsonify({'error': 'Failed to save journal entry', 'details': str(e)}), 500



@app.route('/verify_signature', methods=['POST'])
def verify_signature_route():
    """Endpoint to verify wallet signature for accessing past journal entries"""
    if 'username' not in session or 'wallet_address' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    wallet_address = data.get('walletAddress')
    signature = data.get('signature')
    message = data.get('message')
    date = data.get('date')
    
    if not wallet_address or not signature or not message or not date:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Verify that the wallet address matches the session
    if wallet_address.lower() != session['wallet_address'].lower():
        return jsonify({'error': 'Wallet address does not match session'}), 403
    
    # Verify signature
    if not verify_signature(message, signature, wallet_address):
        return jsonify({'error': 'Invalid signature'}), 400
    
    logger.debug(f"Signature verified successfully for {wallet_address} to access {date}")
    return jsonify({'success': True})


@app.route('/vent', methods=['GET', 'POST'])
def vent():
    """Endpoint for the venting feature"""
    if 'username' not in session:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        data = request.json
        content = data.get('content')
        
        if not content:
            return jsonify({'error': 'Content is required'}), 400
        
        username = session['username']
        journals = load_user_journals(username)
        
        # Get today's date
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Add vent to today's journal
        if today in journals:
            journals[today]['vent'] = content
            journals[today]['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        else:
            journals[today] = {
                'content': '',
                'vent': content,
                'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        
        save_user_journals(username, journals)
        
        return jsonify({'success': True})
    
    return render_template('vent.html', username=session['username'])
import os
from datetime import datetime

# File to store global messages
GLOBAL_MESSAGES_FILE = 'globalmsgs.txt'

@app.route('/global')
def global_chat():
    """Global chat page"""
    if 'username' not in session:
        return redirect(url_for('index'))
    
    username = session['username']
    wallet_address = session['wallet_address']
    
    return render_template('global.html', username=username, wallet_address=wallet_address)

@app.route('/send_message', methods=['POST'])
def send_message():
    """Endpoint to send a message to the global chat"""
    if 'username' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    
    # Check word count (max 50 words)
    word_count = len(message.split())
    if word_count > 50:
        return jsonify({'error': 'Message exceeds the 50 word limit'}), 400
    
    username = session['username']
    timestamp = datetime.now().isoformat()
    
    # Format: username - timestamp - message
    message_line = f"{username} - {timestamp} - {message}\n"
    
    try:
        # Append to file
        with open(GLOBAL_MESSAGES_FILE, 'a', encoding='utf-8') as f:
            f.write(message_line)
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error saving message: {e}")
        return jsonify({'error': 'Failed to save message'}), 500

@app.route('/get_messages')
def get_messages():
    """Endpoint to get all global chat messages"""
    if 'username' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        messages = []
        
        # Create file if it doesn't exist
        if not os.path.exists(GLOBAL_MESSAGES_FILE):
            open(GLOBAL_MESSAGES_FILE, 'w').close()
            return jsonify({'success': True, 'messages': messages})
        
        # Read messages from file
        with open(GLOBAL_MESSAGES_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Parse each line into a message object
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            parts = line.split(' - ', 2)  # Split into 3 parts: username, timestamp, message
            if len(parts) == 3:
                username, timestamp, message = parts
                messages.append({
                    'username': username,
                    'timestamp': timestamp,
                    'message': message
                })
        
        # Sort messages by timestamp (newest first)
        messages.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Limit to the most recent 100 messages
        messages = messages[:100]
        
        return jsonify({'success': True, 'messages': messages})
    except Exception as e:
        print(f"Error getting messages: {e}")
        return jsonify({'error': 'Failed to get messages'}), 500
@app.route('/rewards')
def rewards():
    """Rewards page"""
    if 'username' not in session:
        return redirect(url_for('index'))
    
    username = session['username']
    wallet_address = session['wallet_address']
    
    return render_template('rewards.html', username=username, wallet_address=wallet_address)

if __name__ == '__main__':
    app.run(debug=True)
