// Configuration
const CONFIG = {
    gridSize: 3, // 3x3 grid = 9 pieces
    pieceDisplayTime: 5000, // 5 seconds before floating
    mainImagePath: 'puzzle-image.png' // Path to your main image
};

// Motivational messages that rotate when new pieces are unlocked
const MOTIVATIONAL_MESSAGES = [
    "Готова к следующему сюрпризу? 📸✨",
    "Каждый QR — это ещё один кусочек тебя",
    "Продолжай охоту за воспоминаниями 💛"
];

// State
let scannedPieces = new Set();
let puzzlePieces = [];
let floatingPieces = [];
let physicsAnimationId = null;
let currentMessageIndex = 0;
let touchPosition = { x: -1, y: -1 }; // Track touch/mouse position
let isTouching = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    loadScannedPieces();
    initializePuzzle();
    updateProgress();
    
    // Check URL after everything is initialized
    // Use a longer delay to ensure all DOM elements are ready
    setTimeout(() => {
        console.log('Checking URL for piece parameter...');
        checkURLForPiece();
    }, 200);
    
    displayExistingPieces();
    startAnimationLoop();
    setupTouchInteraction();
    setupPieceViewer();
    // Set initial message based on current progress
    if (scannedPieces.size > 0) {
        currentMessageIndex = scannedPieces.size % MOTIVATIONAL_MESSAGES.length;
        updateInstructionMessage();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    const container = document.getElementById('puzzle-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const pieceSize = 200;
    
    floatingPieces.forEach(piece => {
        if (!piece.element) return;
        
        // Keep pieces within container bounds on resize
        if (piece.x + pieceSize > containerWidth) {
            piece.x = Math.max(0, containerWidth - pieceSize);
        }
        if (piece.y + pieceSize > containerHeight) {
            piece.y = Math.max(0, containerHeight - pieceSize);
        }
        
        // Update element position
        piece.element.style.left = piece.x + 'px';
        piece.element.style.top = piece.y + 'px';
    });
});

// Check URL for piece parameter
function checkURLForPiece() {
    // Check both search params and hash (some QR scanners use hash)
    const urlParams = new URLSearchParams(window.location.search);
    let pieceId = urlParams.get('piece');
    
    // Also check hash if search params don't have it
    if (!pieceId && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        pieceId = hashParams.get('piece');
    }
    
    console.log('Full URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    console.log('URL hash:', window.location.hash);
    console.log('Piece ID from URL:', pieceId);
    
    if (pieceId !== null && pieceId !== '') {
        const pieceNum = parseInt(pieceId);
        console.log('Parsed piece number:', pieceNum);
        
        if (!isNaN(pieceNum) && pieceNum >= 0 && pieceNum < 9) {
            console.log('✅ Valid piece number, unlocking piece:', pieceNum);
            unlockPiece(pieceNum);
            // Clean URL (remove parameter) after unlocking
            setTimeout(() => {
                const cleanUrl = window.location.pathname + (window.location.hash ? window.location.hash : '');
                window.history.replaceState({}, document.title, cleanUrl);
            }, 500);
        } else {
            console.warn('❌ Invalid piece number:', pieceNum);
        }
    } else {
        console.log('ℹ️ No piece parameter in URL');
    }
}

// Load previously scanned pieces from localStorage
function loadScannedPieces() {
    const saved = localStorage.getItem('scannedPieces');
    if (saved) {
        scannedPieces = new Set(JSON.parse(saved));
    }
}

// Save scanned pieces to localStorage
function saveScannedPieces() {
    localStorage.setItem('scannedPieces', JSON.stringify([...scannedPieces]));
}

// Initialize puzzle
function initializePuzzle() {
    const totalPieces = CONFIG.gridSize * CONFIG.gridSize;
    
    // Create puzzle pieces structure
    for (let i = 0; i < totalPieces; i++) {
        puzzlePieces.push({
            id: i,
            row: Math.floor(i / CONFIG.gridSize),
            col: i % CONFIG.gridSize,
            scanned: scannedPieces.has(i.toString())
        });
    }
}

// Display existing pieces that were already scanned
function displayExistingPieces() {
    scannedPieces.forEach(pieceId => {
        displayPiece(parseInt(pieceId), true);
    });
}

// Start animation loop for floating pieces
function startAnimationLoop() {
    function animate() {
        const container = document.getElementById('puzzle-container');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const containerLeft = 0; // Relative to container
        const containerTop = 0;
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        floatingPieces.forEach(piece => {
            if (!piece.element) return;
            
            // Apply friction/damping - pieces slow down over time
            const friction = piece.friction || 0.98; // Default friction (0.98 = 2% slowdown per frame)
            piece.vx *= friction;
            piece.vy *= friction;
            
            // If piece was kicked, slow down to normal floating speed
            const currentSpeed = Math.sqrt(piece.vx * piece.vx + piece.vy * piece.vy);
            const normalSpeed = piece.speed || 2; // Normal floating speed
            
            // If speed is below normal, restore to normal floating speed
            if (currentSpeed < normalSpeed && currentSpeed > 0.1) {
                const angle = Math.atan2(piece.vy, piece.vx);
                piece.vx = Math.cos(angle) * normalSpeed;
                piece.vy = Math.sin(angle) * normalSpeed;
                piece.friction = 0.98; // Reset to normal friction
            }
            
            // Minimum speed threshold - maintain minimal movement
            const minSpeed = 0.1;
            if (Math.abs(piece.vx) < minSpeed && Math.abs(piece.vy) < minSpeed) {
                // If very slow, apply minimal random drift to keep floating
                const driftAngle = Math.random() * Math.PI * 2;
                const driftSpeed = 0.5;
                piece.vx = Math.cos(driftAngle) * driftSpeed;
                piece.vy = Math.sin(driftAngle) * driftSpeed;
            }
            
            // Update position
            piece.x += piece.vx;
            piece.y += piece.vy;
            
            // Update rotation for visual effect (continuous rotation)
            if (!piece.rotation) piece.rotation = 0;
            
            // Normal rotation based on movement (no extra rotation from kicks)
            piece.rotation += piece.vx * 0.15;
            
            // Slow down rotation over time (minimal)
            piece.rotation *= 0.9995;
            
            // Get element dimensions
            const width = 200; // Fixed size
            const height = 200;
            
            // Check collision with touch/mouse position
            if (isTouching && touchPosition.x >= 0 && touchPosition.y >= 0) {
                const pieceRect = {
                    left: piece.x,
                    top: piece.y,
                    right: piece.x + width,
                    bottom: piece.y + height,
                    centerX: piece.x + width / 2,
                    centerY: piece.y + height / 2
                };
                
                // Check if touch is within piece bounds (with some padding)
                const touchPadding = 50;
                const touchX = touchPosition.x;
                const touchY = touchPosition.y;
                
                if (touchX >= pieceRect.left - touchPadding &&
                    touchX <= pieceRect.right + touchPadding &&
                    touchY >= pieceRect.top - touchPadding &&
                    touchY <= pieceRect.bottom + touchPadding) {
                    
                    // Calculate distance and direction from touch to piece center
                    const dx = pieceRect.centerX - touchX;
                    const dy = pieceRect.centerY - touchY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0 && distance < width + touchPadding) {
                        // Push piece away from touch position with stronger force
                        const pushForce = 10;
                        const angle = Math.atan2(dy, dx);
                        piece.vx = Math.cos(angle) * pushForce;
                        piece.vy = Math.sin(angle) * pushForce;
                        
                        // Add visual feedback
                        piece.element.style.transition = 'filter 0.2s ease-out';
                        piece.element.style.filter = 'brightness(1.2)';
                        setTimeout(() => {
                            piece.element.style.filter = '';
                            piece.element.style.transition = '';
                        }, 200);
                    }
                }
            }
            
            // Bounce off left and right edges of container
            if (piece.x <= containerLeft) {
                piece.x = containerLeft;
                piece.vx = Math.abs(piece.vx) * 0.8; // Bounce with some energy loss
            } else if (piece.x + width >= containerWidth) {
                piece.x = containerWidth - width;
                piece.vx = -Math.abs(piece.vx) * 0.8; // Bounce with some energy loss
            }
            
            // Bounce off top and bottom edges of container
            if (piece.y <= containerTop) {
                piece.y = containerTop;
                piece.vy = Math.abs(piece.vy) * 0.8; // Bounce with some energy loss
            } else if (piece.y + height >= containerHeight) {
                piece.y = containerHeight - height;
                piece.vy = -Math.abs(piece.vy) * 0.8; // Bounce with some energy loss
            }
            
            // Update element position and rotation
            piece.element.style.left = piece.x + 'px';
            piece.element.style.top = piece.y + 'px';
            piece.element.style.transform = `rotate(${piece.rotation}deg)`;
        });
        
        physicsAnimationId = requestAnimationFrame(animate);
    }
    
    if (physicsAnimationId === null) {
        animate();
    }
}

// Unlock a piece
function unlockPiece(pieceId) {
    console.log('unlockPiece called with:', pieceId, 'Type:', typeof pieceId);
    
    if (scannedPieces.has(pieceId.toString())) {
        // Piece already unlocked
        console.log('Piece already unlocked:', pieceId);
        return;
    }
    
    console.log('Unlocking new piece:', pieceId);
    
    // Add to scanned pieces
    scannedPieces.add(pieceId.toString());
    saveScannedPieces();
    updateProgress();
    
    // Update motivational message
    updateInstructionMessage();
    
    // Show unlock message and piece
    showUnlockMessage(pieceId);
    
    // Check if puzzle is complete
    if (scannedPieces.size === CONFIG.gridSize * CONFIG.gridSize) {
        setTimeout(() => {
            showCompletePuzzle();
        }, CONFIG.pieceDisplayTime + 2000);
    }
}

// Update instruction message with rotation
function updateInstructionMessage() {
    const instructionMessage = document.getElementById('instruction-message');
    if (instructionMessage && scannedPieces.size < CONFIG.gridSize * CONFIG.gridSize) {
        // Rotate through messages
        instructionMessage.textContent = MOTIVATIONAL_MESSAGES[currentMessageIndex];
        currentMessageIndex = (currentMessageIndex + 1) % MOTIVATIONAL_MESSAGES.length;
        
        // Add fade animation
        instructionMessage.style.animation = 'fadeIn 0.5s ease-out';
        setTimeout(() => {
            instructionMessage.style.animation = '';
        }, 500);
    }
}

// Show unlock message with the piece
function showUnlockMessage(pieceId) {
    const unlockMessage = document.getElementById('unlock-message');
    const unlockPreview = document.getElementById('unlock-preview');
    
    if (!unlockMessage || !unlockPreview) {
        console.error('Unlock message elements not found!');
        // Fallback: just display the piece directly
        displayPiece(pieceId, false);
        return;
    }
    
    // Create image element
    const img = document.createElement('img');
    const imagePath = getPieceImagePath(pieceId);
    img.src = imagePath;
    img.alt = `Piece ${pieceId}`;
    img.className = 'unlock-image';
    
    // Ensure image is visible
    img.style.display = 'block';
    img.style.opacity = '0'; // Start invisible, animation will make it visible
    
    // Add error handler for image loading
    img.onerror = function() {
        console.error('Failed to load piece image:', this.src);
        // Try alternative paths
        const altPaths = [
            `./pieces/${pieceId}.jpeg`,
            `/pieces/${pieceId}.jpeg`,
            `pieces/${pieceId}.jpeg`
        ];
        let currentPathIndex = 0;
        this.onerror = function() {
            currentPathIndex++;
            if (currentPathIndex < altPaths.length) {
                console.log('Trying alternative path:', altPaths[currentPathIndex]);
                this.src = altPaths[currentPathIndex];
            } else {
                console.error('All image paths failed');
                this.style.display = 'none';
            }
        };
        this.src = altPaths[0];
    };
    
    // Add load handler to ensure visibility
    img.onload = function() {
        console.log('Unlock image loaded successfully:', imagePath);
        // Force visibility
        this.style.opacity = '1';
        this.style.display = 'block';
    };
    
    unlockPreview.innerHTML = '';
    unlockPreview.appendChild(img);
    
    // Show message
    unlockMessage.style.display = 'flex';
    
    // Enhanced confetti with more particles
    triggerConfetti();
    
    // Ensure image becomes visible after a short delay
    setTimeout(() => {
        img.style.opacity = '1';
        img.style.visibility = 'visible';
    }, 50);
    
    // Hide message and show piece after 2.5 seconds (slightly longer for better feel)
    setTimeout(() => {
        unlockMessage.style.display = 'none';
        displayPiece(pieceId, false);
    }, 2500);
}

// Add blur to background pieces when showing new piece
function blurBackgroundPieces() {
    const container = document.getElementById('pieces-container');
    if (container) {
        container.classList.add('blur-background');
    }
}

// Remove blur from background pieces
function unblurBackgroundPieces() {
    const container = document.getElementById('pieces-container');
    if (container) {
        container.classList.remove('blur-background');
    }
}

// Display a puzzle piece
function displayPiece(pieceId, skipAnimation = false) {
    console.log('displayPiece called with:', pieceId);
    
    const piece = puzzlePieces[pieceId];
    if (!piece) {
        console.error('Piece not found in puzzlePieces array:', pieceId);
        return;
    }
    
    const piecesContainer = document.getElementById('pieces-container');
    if (!piecesContainer) {
        console.error('pieces-container element not found!');
        return;
    }
    
    // Check if piece already exists
    const existingPiece = document.getElementById(`piece-${pieceId}`);
    if (existingPiece) {
        console.log('Piece already displayed:', pieceId);
        return;
    }
    
    // Create piece element
    const pieceElement = document.createElement('div');
    pieceElement.className = 'puzzle-piece full-size';
    pieceElement.id = `piece-${pieceId}`;
    
    // Create image
    const img = document.createElement('img');
    const imagePath = getPieceImagePath(pieceId);
    img.src = imagePath;
    img.alt = `Puzzle piece ${pieceId}`;
    
    // Add error handler
    img.onerror = function() {
        console.error('Failed to load piece image:', this.src);
        // Try alternative paths
        this.src = `./pieces/${pieceId}.jpeg`;
        this.onerror = function() {
            this.src = `/pieces/${pieceId}.jpeg`;
            console.error('Failed to load with alternative paths');
        };
    };
    
    img.onload = function() {
        console.log('Piece image loaded successfully:', imagePath);
    };
    
    pieceElement.appendChild(img);
    
    piecesContainer.appendChild(pieceElement);
    console.log('Piece element added to container:', pieceId);
    
    // Blur background pieces when showing new piece
    if (!skipAnimation) {
        blurBackgroundPieces();
        
        // Start with zoom-in effect (starts small, zooms in)
        pieceElement.style.transform = 'translate(-50%, -50%) scale(0.3)';
        pieceElement.style.opacity = '0';
        
        // Tiny delay before zoom-in animation
        setTimeout(() => {
            pieceElement.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out';
            pieceElement.style.transform = 'translate(-50%, -50%) scale(1.2)';
            pieceElement.style.opacity = '1';
            
            // Settle into final position after zoom
            setTimeout(() => {
                pieceElement.style.transition = 'transform 0.3s ease-out';
                pieceElement.style.transform = 'translate(-50%, -50%) scale(1.2)';
            }, 600);
        }, 100);
    }
    
    // After 5 seconds, make it float
    setTimeout(() => {
        // Remove blur effect
        unblurBackgroundPieces();
        
        // Remove highlight effects from the piece
        pieceElement.style.filter = '';
        pieceElement.style.animation = '';
        pieceElement.style.boxShadow = '';
        pieceElement.style.border = '';
        
        pieceElement.classList.remove('full-size');
        const pieceSize = 200;
        
        // Get container bounds
        const container = document.getElementById('puzzle-container');
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Random position within container bounds
        const randomX = Math.random() * Math.max(0, containerWidth - pieceSize);
        const randomY = Math.random() * Math.max(0, containerHeight - pieceSize);
        
        pieceElement.style.left = randomX + 'px';
        pieceElement.style.top = randomY + 'px';
        pieceElement.style.width = pieceSize + 'px';
        pieceElement.style.height = pieceSize + 'px';
        pieceElement.classList.add('floating');
        
        // Random velocity for floating (slower movement)
        const speed = 1 + Math.random() * 2; // Speed between 1-3 pixels per frame (slower)
        const angle = Math.random() * Math.PI * 2; // Random direction
        
        // Store floating piece info with physics properties
        const pieceData = {
            element: pieceElement,
            id: pieceId,
            row: piece.row,
            col: piece.col,
            x: randomX,
            y: randomY,
            vx: Math.cos(angle) * speed, // Velocity X
            vy: Math.sin(angle) * speed, // Velocity Y
            rotation: (Math.random() - 0.5) * 10, // Initial rotation
            speed: speed, // Store base speed
            friction: 0.98 // Friction for gradual slowdown
        };
        
        floatingPieces.push(pieceData);
        
        // Add click handler to open piece in viewer
        pieceElement.addEventListener('click', (e) => {
            e.stopPropagation();
            openPieceViewer(pieceId);
        });
        
        // Make piece cursor pointer to indicate it's clickable
        pieceElement.style.cursor = 'pointer';
        
        // Start animation loop if not already running
        if (physicsAnimationId === null) {
            startAnimationLoop();
        }
    }, skipAnimation ? 0 : CONFIG.pieceDisplayTime);
}

// Setup touch/mouse interaction for bouncing pieces
function setupTouchInteraction() {
    const container = document.getElementById('puzzle-container');
    if (!container) return;
    
    // Touch events
    container.addEventListener('touchstart', (e) => {
        isTouching = true;
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        touchPosition.x = touch.clientX - rect.left;
        touchPosition.y = touch.clientY - rect.top;
    });
    
    container.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        touchPosition.x = touch.clientX - rect.left;
        touchPosition.y = touch.clientY - rect.top;
    });
    
    container.addEventListener('touchend', () => {
        isTouching = false;
        touchPosition.x = -1;
        touchPosition.y = -1;
    });
    
    // Mouse events (for desktop)
    container.addEventListener('mousedown', (e) => {
        isTouching = true;
        const rect = container.getBoundingClientRect();
        touchPosition.x = e.clientX - rect.left;
        touchPosition.y = e.clientY - rect.top;
    });
    
    container.addEventListener('mousemove', (e) => {
        if (isTouching) {
            const rect = container.getBoundingClientRect();
            touchPosition.x = e.clientX - rect.left;
            touchPosition.y = e.clientY - rect.top;
        }
    });
    
    container.addEventListener('mouseup', () => {
        isTouching = false;
        touchPosition.x = -1;
        touchPosition.y = -1;
    });
    
    container.addEventListener('mouseleave', () => {
        isTouching = false;
        touchPosition.x = -1;
        touchPosition.y = -1;
    });
}

// Setup piece viewer modal
function setupPieceViewer() {
    const closeButton = document.getElementById('close-viewer');
    const viewer = document.getElementById('piece-viewer');
    
    if (closeButton) {
        closeButton.addEventListener('click', closePieceViewer);
    }
    
    if (viewer) {
        // Close when clicking outside the image
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer) {
                closePieceViewer();
            }
        });
        
        // Close with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && viewer.style.display !== 'none') {
                closePieceViewer();
            }
        });
    }
}

// Open piece in viewer modal
function openPieceViewer(pieceId) {
    const viewer = document.getElementById('piece-viewer');
    const imageContainer = document.getElementById('viewer-image-container');
    
    if (!viewer || !imageContainer) {
        console.error('Piece viewer elements not found');
        return;
    }
    
    // Create image element
    const img = document.createElement('img');
    img.src = getPieceImagePath(pieceId);
    img.alt = `Piece ${pieceId}`;
    img.className = 'viewer-image';
    
    // Add error handler
    img.onerror = function() {
        console.error('Failed to load piece image for viewer:', this.src);
        this.src = `./pieces/${pieceId}.jpeg`;
    };
    
    imageContainer.innerHTML = '';
    imageContainer.appendChild(img);
    
    // Show viewer
    viewer.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Close piece viewer modal
function closePieceViewer() {
    const viewer = document.getElementById('piece-viewer');
    if (viewer) {
        viewer.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Get the image path for a specific piece
function getPieceImagePath(pieceId) {
    // Try relative path first, fallback to absolute if needed
    // For GitHub Pages, relative paths should work from root
    const path = `pieces/${pieceId}.jpeg`;
    console.log('Getting image path for piece', pieceId, ':', path);
    return path;
}

// Trigger enhanced confetti animation
function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const confettiCount = 250; // More confetti for bigger celebration
    
    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * confettiCount,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncrement: Math.random() * 0.07 + 0.05,
            tiltAngle: 0
        });
    }
    
    let animationId;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((c, i) => {
            ctx.beginPath();
            ctx.lineWidth = c.r;
            ctx.strokeStyle = c.color;
            ctx.moveTo(c.x + c.tilt + c.r, c.y);
            ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
            ctx.stroke();
            
            c.tiltAngle += c.tiltAngleIncrement;
            c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
            c.tilt = Math.sin(c.tiltAngle - i / 3) * 15;
            
            if (c.y > canvas.height) {
                confetti[i] = {
                    x: Math.random() * canvas.width,
                    y: -20,
                    r: c.r,
                    d: c.d,
                    color: c.color,
                    tilt: Math.floor(Math.random() * 10) - 10,
                    tiltAngleIncrement: c.tiltAngleIncrement,
                    tiltAngle: 0
                };
            }
        });
        
        animationId = requestAnimationFrame(draw);
        
        // Stop after 4 seconds (longer celebration)
        setTimeout(() => {
            cancelAnimationFrame(animationId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 4000);
    }
    
    draw();
}

// Show complete puzzle
function showCompletePuzzle() {
    const container = document.getElementById('complete-puzzle');
    container.style.display = 'flex';
    
    // Stop physics animation
    if (physicsAnimationId !== null) {
        cancelAnimationFrame(physicsAnimationId);
        physicsAnimationId = null;
    }
    
    // Animate floating pieces to center
    floatingPieces.forEach(p => {
        if (p.element) {
            p.element.style.transition = 'all 2s ease-out';
            p.element.style.transform = `translate(${(p.col - CONFIG.gridSize/2 + 0.5) * 150}px, ${(p.row - CONFIG.gridSize/2 + 0.5) * 150}px) scale(0.3)`;
            p.element.style.opacity = '0';
        }
    });
    
    setTimeout(() => {
        // Create complete image
        const img = document.createElement('img');
        img.src = CONFIG.mainImagePath;
        img.alt = 'Complete Puzzle';
        container.innerHTML = '';
        container.appendChild(img);
        
        // Clear pieces container
        document.getElementById('pieces-container').innerHTML = '';
        
        // Clear floating pieces array
        floatingPieces = [];
        
        // Show success message
        showSuccessMessage();
    }, 2000);
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.innerHTML = `
        <h2>🎉 Puzzle Complete! 🎉</h2>
        <p>You've revealed the entire picture!</p>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 5000);
}

// Update progress display with emotional journey
function updateProgress() {
    const totalPieces = CONFIG.gridSize * CONFIG.gridSize;
    const foundCount = scannedPieces.size;
    const remaining = totalPieces - foundCount;
    
    const progressBar = document.getElementById('progress-bar');
    const progressSlider = document.getElementById('progress-slider');
    const sliderImage = document.getElementById('slider-image');
    const progressMessage = document.getElementById('progress-message');
    const progressTitle = document.getElementById('progress-title');
    
    // Calculate progress percentage
    const progressPercent = (foundCount / totalPieces) * 100;
    
    // Update progress bar width
    progressBar.style.width = progressPercent + '%';
    
    // Update slider position (moves along the track)
    progressSlider.style.left = progressPercent + '%';
    
    // Animate slider when progress changes
    if (foundCount > 0) {
        sliderImage.style.animation = 'sliderBounce 0.5s ease-out';
        setTimeout(() => {
            sliderImage.style.animation = '';
        }, 500);
    }
    
    // Update emotional messages
    if (foundCount === 0) {
        progressMessage.textContent = 'Осталось 9 сюрпризов 💫';
    } else if (foundCount < totalPieces / 2) {
        progressMessage.textContent = `Осталось ${remaining} сюрпризов 💫`;
    } else if (foundCount === Math.floor(totalPieces / 2)) {
        progressMessage.textContent = 'Ты уже в середине пути 🧡';
        progressMessage.style.animation = 'pulse 1s ease-in-out';
        setTimeout(() => {
            progressMessage.style.animation = '';
        }, 1000);
    } else if (foundCount < totalPieces) {
        progressMessage.textContent = `Осталось ${remaining} сюрпризов 💫`;
    } else {
        progressMessage.textContent = 'Все сюрпризы найдены! 🎉';
    }
    
    // Update title if needed
    if (foundCount === totalPieces) {
        progressTitle.textContent = '🎁 Подарок готов!';
    }
}
