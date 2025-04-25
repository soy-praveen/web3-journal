document.addEventListener('DOMContentLoaded', function() {
    console.log("NFT page loaded");
    
    // Get username from the hidden element
    const username = document.getElementById('username-data').getAttribute('data-username');
    console.log("Username:", username);
    
    // DOM Elements
    const nftGrid = document.getElementById('nft-grid');
    const availablePointsEl = document.getElementById('available-points');
    const purchaseModal = document.getElementById('purchase-modal');
    const closeModal = document.querySelector('.close-modal');
    const confirmPurchaseBtn = document.getElementById('confirm-purchase');
    const cancelPurchaseBtn = document.getElementById('cancel-purchase');
    const modalNftImage = document.getElementById('modal-nft-image');
    const modalNftName = document.getElementById('modal-nft-name');
    const modalNftDescription = document.getElementById('modal-nft-description');
    const modalNftCost = document.getElementById('modal-nft-cost');
    
    // NFT Collection Data
    const nftCollection = [
        {
            id: 1,
            name: "Journal Novice",
            description: "Your first step in the journaling journey",
            image: "https://via.placeholder.com/300/9370DB/FFFFFF?text=Journal+Novice",
            cost: 1000,
            rarity: "Common"
        },
        {
            id: 2,
            name: "Thought Keeper",
            description: "For those who consistently record their thoughts",
            image: "https://via.placeholder.com/300/6A5ACD/FFFFFF?text=Thought+Keeper",
            cost: 5000,
            rarity: "Common"
        },
        {
            id: 3,
            name: "Reflection Master",
            description: "A symbol of deep self-reflection and awareness",
            image: "https://via.placeholder.com/300/483D8B/FFFFFF?text=Reflection+Master",
            cost: 10000,
            rarity: "Uncommon"
        },
        {
            id: 4,
            name: "Mindfulness Gem",
            description: "For the truly present and mindful journalers",
            image: "https://via.placeholder.com/300/4B0082/FFFFFF?text=Mindfulness+Gem",
            cost: 25000,
            rarity: "Uncommon"
        },
        {
            id: 5,
            name: "Wisdom Crystal",
            description: "Represents profound insights and personal growth",
            image: "https://via.placeholder.com/300/8A2BE2/FFFFFF?text=Wisdom+Crystal",
            cost: 50000,
            rarity: "Rare"
        },
        {
            id: 6,
            name: "Chronicle Diamond",
            description: "The pinnacle of journaling achievement",
            image: "https://via.placeholder.com/300/9400D3/FFFFFF?text=Chronicle+Diamond",
            cost: 100000,
            rarity: "Rare"
        },
        {
            id: 7,
            name: "Legacy Artifact",
            description: "A legendary token of consistent self-reflection",
            image: "https://via.placeholder.com/300/800080/FFFFFF?text=Legacy+Artifact",
            cost: 500000,
            rarity: "Epic"
        },
        {
            id: 8,
            name: "Infinity Journal",
            description: "The ultimate symbol of journaling mastery",
            image: "https://via.placeholder.com/300/4B0082/FFFFFF?text=Infinity+Journal",
            cost: 1000000,
            rarity: "Legendary"
        }
    ];
    
    // Selected NFT for purchase
    let selectedNft = null;
    
    // Initialize
    loadUserPoints();
    
    // Functions
    function loadUserPoints() {
        // Get user points from localStorage
        const storageKey = `rewards_${username}`;
        const storedData = localStorage.getItem(storageKey);
        
        let userPoints = 0;
        
        if (storedData) {
            try {
                const rewardsData = JSON.parse(storedData);
                userPoints = rewardsData.totalPoints || 0;
            } catch (error) {
                console.error("Error parsing rewards data:", error);
            }
        }
        
        // Update UI
        availablePointsEl.textContent = userPoints;
        
        // Load NFTs after getting user points
        loadNFTs(userPoints);
    }
    
    function loadNFTs(userPoints) {
        // Clear loading indicator
        nftGrid.innerHTML = '';
        
        // Sort NFTs by cost (lowest to highest)
        const sortedNFTs = [...nftCollection].sort((a, b) => a.cost - b.cost);
        
        // Render each NFT
        sortedNFTs.forEach(nft => {
            const isLocked = userPoints < nft.cost;
            const nftCard = document.createElement('div');
            nftCard.className = `nft-card ${isLocked ? 'locked' : ''}`;
            
            nftCard.innerHTML = `
                <img src="${nft.image}" alt="${nft.name}" class="nft-image">
                <div class="nft-content">
                    <div class="nft-name">${nft.name}</div>
                    <div class="nft-description">${nft.description}</div>
                    <div class="nft-rarity">${nft.rarity}</div>
                    <div class="nft-price">
                        <div class="price-tag">
                            <i class="fas fa-star"></i> ${nft.cost.toLocaleString()}
                        </div>
                        <button class="claim-btn ${isLocked ? 'disabled' : ''}" ${isLocked ? 'disabled' : ''} data-nft-id="${nft.id}">
                            <i class="fas fa-shopping-cart"></i> ${isLocked ? 'Locked' : 'Claim'}
                        </button>
                    </div>
                </div>
            `;
            
            // Add click event for unlocked NFTs
            if (!isLocked) {
                const claimBtn = nftCard.querySelector('.claim-btn');
                claimBtn.addEventListener('click', () => {
                    openPurchaseModal(nft);
                });
            }
            
            nftGrid.appendChild(nftCard);
        });
    }
    
    function openPurchaseModal(nft) {
        selectedNft = nft;
        
        // Update modal content
        modalNftImage.src = nft.image;
        modalNftName.textContent = nft.name;
        modalNftDescription.textContent = nft.description;
        modalNftCost.textContent = nft.cost.toLocaleString();
        
        // Show modal
        purchaseModal.style.display = 'flex';
    }
    
    // Event listeners for modal
    closeModal.addEventListener('click', () => {
        purchaseModal.style.display = 'none';
    });
    
    cancelPurchaseBtn.addEventListener('click', () => {
        purchaseModal.style.display = 'none';
    });
    
    confirmPurchaseBtn.addEventListener('click', () => {
        if (selectedNft) {
            purchaseNFT(selectedNft);
        }
    });
    
    function purchaseNFT(nft) {
        // Get current user points
        const storageKey = `rewards_${username}`;
        const storedData = localStorage.getItem(storageKey);
        
        if (!storedData) {
            alert('Error: Could not retrieve your points data.');
            return;
        }
        
        try {
            const rewardsData = JSON.parse(storedData);
            const currentPoints = rewardsData.totalPoints || 0;
            
            // Check if user has enough points
            if (currentPoints < nft.cost) {
                alert('You do not have enough points to claim this NFT.');
                return;
            }
            
            // Deduct points
            rewardsData.totalPoints = currentPoints - nft.cost;
            
            // Add to purchase history
            if (!rewardsData.nftPurchases) {
                rewardsData.nftPurchases = [];
            }
            
            rewardsData.nftPurchases.push({
                nftId: nft.id,
                name: nft.name,
                cost: nft.cost,
                purchasedAt: new Date().toISOString()
            });
            
            // Save updated rewards data
            localStorage.setItem(storageKey, JSON.stringify(rewardsData));
            
            // Redirect to Google (simulating NFT minting process)
            window.location.href = "https://www.google.com";
            
        } catch (error) {
            console.error("Error processing NFT purchase:", error);
            alert('Error processing your purchase. Please try again.');
        }
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === purchaseModal) {
            purchaseModal.style.display = 'none';
        }
    });
});
