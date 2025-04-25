document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginSwitch = document.getElementById('login-switch');
    const signupSwitch = document.getElementById('signup-switch');
    const signupContent = document.querySelector('.signup-content');
    const loginContent = document.querySelector('.login-content');
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    const loginWalletBtn = document.getElementById('login-wallet-btn');
    const walletStatus = document.getElementById('wallet-status');
    const loginWalletStatus = document.getElementById('login-wallet-status');
    const usernameInput = document.getElementById('username');

    // Switch between login and signup
    loginSwitch.addEventListener('click', function(e) {
        e.preventDefault();
        signupContent.classList.remove('active');
        loginContent.classList.add('active');
    });

    signupSwitch.addEventListener('click', function(e) {
        e.preventDefault();
        loginContent.classList.remove('active');
        signupContent.classList.add('active');
    });

    // Connect wallet for signup
    // Connect wallet for signup
    connectWalletBtn.addEventListener('click', async function() {
        if (!usernameInput.value.trim()) {
            walletStatus.textContent = 'Please enter a username first';
            walletStatus.style.color = '#e74c3c';
            return;
        }

        try {
            const walletData = await connectWallet(walletStatus);
            if (walletData) {
                const username = usernameInput.value.trim();
                // Send data to server with wallet address, signature and message
                await registerUser(username, walletData);
            }
        } catch (error) {
            console.error(error);
            walletStatus.textContent = 'Failed to connect wallet: ' + error.message;
            walletStatus.style.color = '#e74c3c';
        }
    });


    // Connect wallet for login
    // Connect wallet for login
    loginWalletBtn.addEventListener('click', async function() {
        try {
            const walletData = await connectWallet(loginWalletStatus);
            if (walletData) {
                // Send data to server with wallet address, signature and message
                await loginUser(walletData);
            }
        } catch (error) {
            console.error(error);
            loginWalletStatus.textContent = 'Failed to connect wallet: ' + error.message;
            loginWalletStatus.style.color = '#e74c3c';
        }
    });


    // Function to connect to MetaMask
    // Function to connect to wallet with signature verification
    async function connectWallet(statusElement) {
        // Check if wallet is installed
        const provider = window.ethereum || window.okxwallet;
        
        if (!provider) {
            statusElement.textContent = 'No wallet detected. Please install a wallet extension.';
            statusElement.style.color = '#e74c3c';
            throw new Error('Wallet not installed');
        }
    
        statusElement.textContent = 'Connecting to wallet...';
        statusElement.style.color = 'white';
    
        try {
            // Request account access
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (accounts.length === 0) {
                statusElement.textContent = 'No accounts found. Please create an account in your wallet.';
                statusElement.style.color = '#e74c3c';
                throw new Error('No accounts found');
            }
    
            const walletAddress = accounts[0];
            statusElement.textContent = `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`;
            statusElement.style.color = '#2ecc71';
            
            // Request signature to verify ownership
            statusElement.textContent = 'Please sign the message in your wallet to verify ownership...';
            
            // Create a unique message to sign
            const message = `Sign this message to authenticate with Digital Journal: ${Date.now()}`;
            const msgParams = new TextEncoder().encode(message);
            
            // Request signature
            const signature = await provider.request({
                method: 'personal_sign',
                params: [
                    '0x' + Array.from(msgParams).map(b => b.toString(16).padStart(2, '0')).join(''),
                    walletAddress
                ]
            });
            
            statusElement.textContent = `Wallet verified: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`;
            statusElement.style.color = '#2ecc71';
            
            return { walletAddress, signature, message };
        } catch (error) {
            if (error.code === 4001) {
                // User rejected the request
                statusElement.textContent = 'Connection rejected. Please try again.';
            } else {
                statusElement.textContent = 'Error connecting to wallet: ' + error.message;
            }
            statusElement.style.color = '#e74c3c';
            throw error;
        }
    }
    

    // Function to register a new user
        // Function to register a new user
    async function registerUser(username, walletData) {
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    walletAddress: walletData.walletAddress,
                    signature: walletData.signature,
                    message: walletData.message
                }),
            });

            const data = await response.json();

            if (response.ok) {
                walletStatus.textContent = 'Registration successful! Redirecting...';
                walletStatus.style.color = '#2ecc71';
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                walletStatus.textContent = data.error || 'Registration failed';
                walletStatus.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('Error:', error);
            walletStatus.textContent = 'Server error. Please try again later.';
            walletStatus.style.color = '#e74c3c';
        }
    }

    // Function to login a user
    async function loginUser(walletData) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: walletData.walletAddress,
                    signature: walletData.signature,
                    message: walletData.message
                }),
            });

            const data = await response.json();

            if (response.ok) {
                loginWalletStatus.textContent = 'Login successful! Redirecting...';
                loginWalletStatus.style.color = '#2ecc71';
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                loginWalletStatus.textContent = data.error || 'Login failed';
                loginWalletStatus.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('Error:', error);
            loginWalletStatus.textContent = 'Server error. Please try again later.';
            loginWalletStatus.style.color = '#e74c3c';
        }
    }


    // Listen for wallet disconnect events
    function setupWalletListeners() {
        const provider = window.ethereum || window.okxwallet;
        
        if (provider) {
            // Account changed event
            provider.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected wallet
                    console.log('Wallet disconnected');
                    // Redirect to logout endpoint
                    window.location.href = '/logout';
                }
            });
            
            // Chain changed event
            provider.on('chainChanged', () => {
                // Refresh the page on chain change
                window.location.reload();
            });
            
            // Disconnect event (for some wallets)
            provider.on('disconnect', () => {
                console.log('Wallet disconnected');
                window.location.href = '/logout';
            });
        }
    }

    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        // ... existing code ...
        
        // Setup wallet listeners
        setupWalletListeners();
    });

});
