// Configuration
const CONFIG = {
    gridSize: 3, // 3x3 grid = 9 pieces
    pieceDisplayTime: 5000, // 5 seconds before floating
    mainImagePath: 'puzzle-image.png', // Path to your main image
    // Audio configuration - set to null to disable, or provide paths
    // Option 1: One audio file per piece (audio/piece-0.mp3, audio/piece-1.mp3, etc.)
    audioPerPiece: true,
    audioBasePath: 'audio/',
    audioExtension: 'mp3', // or 'wav', 'ogg', etc.
    // Option 2: Single audio file for all pieces (set audioPerPiece to false)
    // singleAudioPath: 'audio/unlock.mp3'
    // Final song when puzzle is complete
    finalSongPath: 'final_song.mp3'
};

// Motivational messages that rotate when new pieces are unlocked
const MOTIVATIONAL_MESSAGES = [
    "Давай глубже!",
    "Ну ты жаришь!",
    "Ну ты мастер!"
];

// State
let scannedPieces = new Set();
let puzzlePieces = [];
let floatingPieces = [];
let physicsAnimationId = null;
let currentMessageIndex = 0;
let touchPosition = { x: -1, y: -1 }; // Track touch/mouse position
let isTouching = false;
let audioUnlocked = false; // Track if audio context has been unlocked

// Unlock audio context on first user interaction
function unlockAudioContext() {
    if (audioUnlocked) return;
    
    // Create a silent audio and play it to unlock the audio context
    const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    silentAudio.volume = 0.01;
    silentAudio.play().then(() => {
        audioUnlocked = true;
        console.log('Audio context unlocked');
        silentAudio.pause();
        silentAudio.remove();
    }).catch(err => {
        console.log('Audio unlock attempt:', err);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    loadScannedPieces();
    initializePuzzle();
    updateProgress();
    
    // Unlock audio on any user interaction
    const unlockEvents = ['touchstart', 'touchend', 'click', 'mousedown', 'keydown'];
    const unlockAudioOnce = () => {
        unlockAudioContext();
        unlockEvents.forEach(event => {
            document.removeEventListener(event, unlockAudioOnce);
        });
    };
    unlockEvents.forEach(event => {
        document.addEventListener(event, unlockAudioOnce, { once: true, passive: true });
    });
    
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
    setupResetButton();
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
            
            // Try to unlock audio context immediately when QR code is scanned
            unlockAudioContext();
            
            // Check if we're in a new tab/window
            const isNewTab = window.opener !== null || 
                            (window.history.length === 1 && document.referrer === '');
            
            // Unlock the piece (will sync across tabs via localStorage)
            unlockPiece(pieceNum);
            
            // Check if this is the last piece AFTER unlocking
            // Use a small delay to ensure scannedPieces is updated
            setTimeout(() => {
                const totalPieces = CONFIG.gridSize * CONFIG.gridSize;
                const isLastPiece = scannedPieces.size >= totalPieces;
                
                // If this looks like a new tab from QR scan, redirect to main page after audio finishes
                // This keeps all pieces visible in one tab
                // BUT: Don't redirect if this is the last piece - let showCompletePuzzle handle it
                const isLikelyQRScan = window.history.length <= 2 && document.referrer === '';
                
                if (isLikelyQRScan && !isLastPiece) {
                    // Wait for audio to finish before redirecting
                    const checkAudioAndRedirect = () => {
                        // Check if there's an audio playing (use currentPieceAudio or find in array)
                        const currentAudio = window.currentPieceAudio || 
                            (window.unlockAudios && window.unlockAudios.find(a => {
                                return !a.paused && !a.ended;
                            }));
                        
                        if (currentAudio && !currentAudio.ended) {
                            console.log('Waiting for audio to finish before redirecting...');
                            console.log('Audio duration:', currentAudio.duration, 'seconds');
                            
                            // Wait for audio to end
                            const onAudioEnd = () => {
                                console.log('✅ Audio finished, now redirecting to main page');
                                // Small delay to ensure everything is processed
                                setTimeout(() => {
                                    window.location.href = window.location.pathname;
                                }, 200);
                            };
                            currentAudio.addEventListener('ended', onAudioEnd, { once: true });
                            
                            // Fallback: if audio doesn't end, use duration + buffer
                            const audioDuration = currentAudio.duration || 0;
                            if (audioDuration > 0 && !isNaN(audioDuration) && isFinite(audioDuration)) {
                                const fallbackTime = (audioDuration * 1000) + 2000; // Add 2 second buffer
                                console.log('Setting fallback redirect timeout:', fallbackTime, 'ms');
                                setTimeout(() => {
                                    if (!currentAudio.ended) {
                                        console.warn('⚠️ Audio did not end, redirecting anyway after', fallbackTime, 'ms');
                                        window.location.href = window.location.pathname;
                                    }
                                }, fallbackTime);
                            } else {
                                // If we can't get duration, wait a reasonable time
                                console.log('Audio duration not available, using 10 second fallback');
                                setTimeout(() => {
                                    if (!currentAudio.ended) {
                                        console.warn('⚠️ Redirecting after 10 second timeout');
                                        window.location.href = window.location.pathname;
                                    }
                                }, 10000); // 10 seconds max wait
                            }
                        } else {
                            // No audio playing, redirect after a short delay
                            console.log('No audio playing, redirecting after short delay');
                            setTimeout(() => {
                                window.location.href = window.location.pathname;
                            }, 3000);
                        }
                    };
                    
                    // Wait a bit for audio to start and unlock message to appear
                    setTimeout(checkAudioAndRedirect, 1000);
                } else if (!isLastPiece) {
                    // Normal navigation - just clean URL
                    setTimeout(() => {
                        const cleanUrl = window.location.pathname + (window.location.hash ? window.location.hash : '');
                        window.history.replaceState({}, document.title, cleanUrl);
                    }, 500);
                }
                // If it's the last piece, don't redirect - showCompletePuzzle will handle the display
            }, 100); // Small delay to ensure scannedPieces is updated
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
    // Trigger storage event for cross-tab synchronization
    localStorage.setItem('scannedPiecesUpdate', Date.now().toString());
    // Also dispatch custom event for same-tab listeners
    window.dispatchEvent(new Event('scannedPiecesUpdated'));
}

// Listen for storage changes (cross-tab synchronization)
window.addEventListener('storage', (e) => {
    if (e.key === 'scannedPieces') {
        const saved = e.newValue;
        if (saved) {
            scannedPieces = new Set(JSON.parse(saved));
            updateProgress();
            displayExistingPieces();
            updateInstructionMessage();
        }
    } else if (e.key === 'scannedPiecesUpdate') {
        // Reload scanned pieces when another tab updates them
        loadScannedPieces();
        updateProgress();
        displayExistingPieces();
    }
});

// Also listen for same-tab updates (using custom event)
window.addEventListener('scannedPiecesUpdated', () => {
    loadScannedPieces();
    updateProgress();
    displayExistingPieces();
});

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
    const totalPieces = CONFIG.gridSize * CONFIG.gridSize;
    console.log('Scanned pieces:', scannedPieces.size, 'Total needed:', totalPieces);
    
    if (scannedPieces.size === totalPieces) {
        console.log('🎉 Все части собраны! Вот готовая картинка...');
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

// Play audio when a piece is unlocked
// Returns the audio object so we can track its duration
function playUnlockAudio(pieceId) {
    // Check if audio is disabled
    if (!CONFIG.audioPerPiece && !CONFIG.singleAudioPath) {
        return null;
    }
    
    let audioPath;
    
    if (CONFIG.audioPerPiece) {
        // Use per-piece audio files
        audioPath = `${CONFIG.audioBasePath}piece-${pieceId}.${CONFIG.audioExtension}`;
    } else if (CONFIG.singleAudioPath) {
        // Use single audio file for all pieces
        audioPath = CONFIG.singleAudioPath;
    } else {
        return null;
    }
    
    console.log('Playing unlock audio for piece', pieceId, ':', audioPath);
    
    // Create and play audio
    const audio = new Audio(audioPath);
    
    // Preload the audio
    audio.preload = 'auto';
    
    // Set volume (0.0 to 1.0)
    audio.volume = 1;
    
    // Load the audio file
    audio.load();
    
    // Add load event listener
    audio.addEventListener('loadeddata', () => {
        console.log('Audio loaded successfully:', audioPath);
        console.log('Audio duration:', audio.duration, 'seconds');
    });
    
    // Handle errors gracefully
    audio.onerror = function() {
        console.warn('Failed to load audio:', audioPath);
        // Try alternative paths if per-piece audio
        if (CONFIG.audioPerPiece) {
            const altPaths = [
                `./${audioPath}`,
                `/${audioPath}`,
                `${CONFIG.audioBasePath}piece-${pieceId}.wav`,
                `${CONFIG.audioBasePath}piece-${pieceId}.ogg`
            ];
            let currentPathIndex = 0;
            const tryNextPath = () => {
                if (currentPathIndex < altPaths.length) {
                    audio.src = altPaths[currentPathIndex];
                    currentPathIndex++;
                    audio.load();
                    audio.play().catch(err => {
                        console.warn('Failed to play audio from:', altPaths[currentPathIndex - 1]);
                        tryNextPath();
                    });
                }
            };
            tryNextPath();
        }
    };
    
    // Play audio with retry logic
    const playAudio = (retryCount = 0) => {
        const maxRetries = 5;
        audio.play().then(() => {
            console.log('✅ Audio playing successfully for piece', pieceId);
            console.log('Audio duration:', audio.duration, 'seconds');
            console.log('Audio currentTime:', audio.currentTime);
        }).catch(err => {
            console.warn('Could not play audio (attempt', retryCount + 1, '):', err);
            
            // If audio context not unlocked, try to unlock it
            if (!audioUnlocked) {
                unlockAudioContext();
            }
            
            // Retry with exponential backoff
            if (retryCount < maxRetries) {
                const delay = Math.min(100 * Math.pow(2, retryCount), 1000);
                setTimeout(() => {
                    playAudio(retryCount + 1);
                }, delay);
            } else {
                // After max retries, wait for user interaction
                const playOnInteraction = () => {
                    unlockAudioContext();
                    setTimeout(() => {
                        audio.play().then(() => {
                            console.log('✅ Audio started after user interaction');
                        }).catch(e => console.warn('Audio failed after interaction:', e));
                    }, 100);
                    document.removeEventListener('touchstart', playOnInteraction);
                    document.removeEventListener('click', playOnInteraction);
                };
                document.addEventListener('touchstart', playOnInteraction, { once: true });
                document.addEventListener('click', playOnInteraction, { once: true });
            }
        });
    };
    
    // Try to play immediately
    playAudio();
    
    // Add event listeners to track audio state
    audio.addEventListener('play', () => {
        console.log('▶️ Audio started playing for piece', pieceId);
    });
    
    audio.addEventListener('pause', () => {
        console.log('⏸️ Audio paused for piece', pieceId);
    });
    
    audio.addEventListener('ended', () => {
        console.log('⏹️ Audio ended for piece', pieceId, '- total duration was:', audio.duration);
    });
    
    audio.addEventListener('error', (e) => {
        console.error('❌ Audio error for piece', pieceId, ':', e);
    });
    
    // Store reference globally so redirect logic can access it
    if (!window.unlockAudios) {
        window.unlockAudios = [];
    }
    window.unlockAudios.push(audio);
    
    // Also store the current piece's audio for easy access
    window.currentPieceAudio = audio;
    
    // Clean up after audio finishes
    audio.addEventListener('ended', () => {
        console.log('Audio finished playing for piece', pieceId);
        const index = window.unlockAudios.indexOf(audio);
        if (index > -1) {
            window.unlockAudios.splice(index, 1);
        }
        // Clear current piece audio reference
        if (window.currentPieceAudio === audio) {
            window.currentPieceAudio = null;
        }
    });
    
    // Return audio object so caller can track duration
    return audio;
}

// Play final song when puzzle is complete
function playFinalSong() {
    if (!CONFIG.finalSongPath) {
        console.log('No final song configured');
        return;
    }
    
    console.log('Playing final song:', CONFIG.finalSongPath);
    
    // Create and play audio
    const audio = new Audio(CONFIG.finalSongPath);
    
    // Preload the audio
    audio.preload = 'auto';
    
    // Set volume (0.0 to 1.0) - slightly louder for celebration
    audio.volume = 1;
    
    // Load the audio file
    audio.load();
    
    // Add load event listener
    audio.addEventListener('loadeddata', () => {
        console.log('Final song loaded successfully:', CONFIG.finalSongPath);
    });
    
    // Handle errors gracefully
    audio.onerror = function() {
        console.warn('Failed to load final song:', CONFIG.finalSongPath);
        // Try alternative paths
        const altPaths = [
            `./${CONFIG.finalSongPath}`,
            `/${CONFIG.finalSongPath}`,
            `audio/${CONFIG.finalSongPath}`,
            `./audio/${CONFIG.finalSongPath}`,
            `/audio/${CONFIG.finalSongPath}`
        ];
        let currentPathIndex = 0;
        this.onerror = function() {
            currentPathIndex++;
            if (currentPathIndex < altPaths.length) {
                console.log('Trying alternative path for final song:', altPaths[currentPathIndex]);
                this.src = altPaths[currentPathIndex];
                this.load();
            } else {
                console.error('All paths failed for final song');
            }
        };
        this.src = altPaths[0];
        this.load();
    };
    
    // Play audio with retry logic
    const playAudio = (retryCount = 0) => {
        const maxRetries = 5;
        audio.play().then(() => {
            console.log('Final song playing successfully');
        }).catch(err => {
            console.warn('Could not play final song (attempt', retryCount + 1, '):', err);
            
            // If audio context not unlocked, try to unlock it
            if (!audioUnlocked) {
                unlockAudioContext();
            }
            
            // Retry with exponential backoff
            if (retryCount < maxRetries) {
                const delay = Math.min(100 * Math.pow(2, retryCount), 1000);
                setTimeout(() => {
                    playAudio(retryCount + 1);
                }, delay);
            } else {
                // After max retries, wait for user interaction
                const playOnInteraction = () => {
                    unlockAudioContext();
                    setTimeout(() => {
                        audio.play().catch(e => console.warn('Final song failed after interaction:', e));
                    }, 100);
                    document.removeEventListener('touchstart', playOnInteraction);
                    document.removeEventListener('click', playOnInteraction);
                };
                document.addEventListener('touchstart', playOnInteraction, { once: true });
                document.addEventListener('click', playOnInteraction, { once: true });
            }
        });
    };
    
    // Try to unlock audio context first
    unlockAudioContext();
    
    // Try to play immediately
    playAudio();
    
    // Store reference globally so it can be stopped if needed
    window.finalSongAudio = audio;
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
        // Try alternative extension (pieces 0-5 are .jpg, 6-8 are .jpeg)
        const altExtension = pieceId <= 5 ? 'jpeg' : 'jpg';
        const altPaths = [
            `pieces/${pieceId}.${altExtension}`,
            `./pieces/${pieceId}.${altExtension}`,
            `/pieces/${pieceId}.${altExtension}`
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
    
    // Make the unlock message clickable to unlock audio if needed
    // This helps when scanning QR codes (which don't count as user interaction)
    unlockMessage.style.cursor = 'pointer';
    const unlockAudioOnMessageClick = () => {
        unlockAudioContext();
        unlockMessage.removeEventListener('click', unlockAudioOnMessageClick);
        unlockMessage.removeEventListener('touchstart', unlockAudioOnMessageClick);
    };
    unlockMessage.addEventListener('click', unlockAudioOnMessageClick, { once: true });
    unlockMessage.addEventListener('touchstart', unlockAudioOnMessageClick, { once: true });
    
    // Try to unlock audio immediately when message is shown
    // This helps with QR code scans
    unlockAudioContext();
    
    // Play unlock audio and get audio object to track duration
    const audio = playUnlockAudio(pieceId);
    
    // Ensure image becomes visible after a short delay
    setTimeout(() => {
        img.style.opacity = '1';
        img.style.visibility = 'visible';
    }, 50);
    
    // Function to hide message and show piece
    const showPiece = () => {
        unlockMessage.style.display = 'none';
        displayPiece(pieceId, false, audio); // Pass audio to displayPiece
    };
    
    // If we have audio, wait for it to finish before hiding message and showing piece
    if (audio) {
        // Wait for audio to finish playing
        const onAudioEnd = () => {
            console.log('Audio finished, hiding unlock message and showing piece');
            showPiece();
        };
        
        // Listen for audio end event
        audio.addEventListener('ended', onAudioEnd, { once: true });
        
        // Also wait for audio metadata to load for fallback timing
        const onAudioReady = () => {
            const audioDuration = audio.duration || 0;
            console.log('Audio duration:', audioDuration, 'seconds');
            
            // Fallback: if audio doesn't end (e.g., error), use duration + buffer
            if (audioDuration > 0) {
                const fallbackTime = (audioDuration * 1000) + 1000; // Add 1 second buffer
                setTimeout(() => {
                    // Check if audio is still playing or if we haven't shown piece yet
                    if (!audio.ended && unlockMessage.style.display !== 'none') {
                        console.warn('Audio did not fire ended event, using fallback timing');
                        showPiece();
                        audio.removeEventListener('ended', onAudioEnd);
                    }
                }, fallbackTime);
            }
        };
        
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            onAudioReady();
        } else {
            audio.addEventListener('loadedmetadata', onAudioReady, { once: true });
            // Fallback: if metadata doesn't load, wait a bit then show piece
            setTimeout(() => {
                if (audio.readyState < 2 && unlockMessage.style.display !== 'none') {
                    console.warn('Audio metadata not loaded, using fallback timing');
                    showPiece();
                    audio.removeEventListener('ended', onAudioEnd);
                }
            }, 3000); // Wait 3 seconds as fallback
        }
    } else {
        // No audio, use default timing (show piece after 2.5 seconds)
        setTimeout(() => {
            unlockMessage.style.display = 'none';
            displayPiece(pieceId, false);
        }, 2500);
    }
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
// audio: optional audio object - if provided, piece stays visible until audio finishes
function displayPiece(pieceId, skipAnimation = false, audio = null) {
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
        // Try alternative extension (pieces 0-5 are .jpg, 6-8 are .jpeg)
        const altExtension = pieceId <= 5 ? 'jpeg' : 'jpg';
        this.src = `pieces/${pieceId}.${altExtension}`;
        this.onerror = function() {
            // Try with relative path prefix
            this.src = `./pieces/${pieceId}.${altExtension}`;
            this.onerror = function() {
                // Try absolute path
                this.src = `/pieces/${pieceId}.${altExtension}`;
                this.onerror = function() {
                    console.error('Failed to load with all alternative paths');
                };
            };
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
    
    // Function to make piece float
    const makePieceFloat = () => {
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
    };
    
    // If skipAnimation, make it float immediately
    if (skipAnimation) {
        makePieceFloat();
        return;
    }
    
    // If we have audio, wait for it to finish before making piece float
    if (audio) {
        const startFloatWhenAudioEnds = () => {
            const audioDuration = audio.duration || 0;
            console.log('Waiting for audio to finish. Duration:', audioDuration, 'seconds');
            
            // Listen for audio end event
            const onAudioEnd = () => {
                console.log('Audio finished, making piece float');
                makePieceFloat();
                audio.removeEventListener('ended', onAudioEnd);
            };
            
            audio.addEventListener('ended', onAudioEnd);
            
            // Fallback: if audio doesn't end (e.g., error), use duration or default timeout
            const fallbackTimeout = audioDuration > 0 
                ? (audioDuration * 1000) + 500 // Add 500ms buffer
                : CONFIG.pieceDisplayTime;
            
            setTimeout(() => {
                // Check if audio is still playing
                if (!audio.paused && !audio.ended) {
                    console.warn('Audio still playing after expected duration, making piece float anyway');
                    makePieceFloat();
                    audio.removeEventListener('ended', onAudioEnd);
                }
            }, fallbackTimeout);
        };
        
        // Wait for audio metadata to be loaded
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            startFloatWhenAudioEnds();
        } else {
            audio.addEventListener('loadedmetadata', startFloatWhenAudioEnds, { once: true });
            // Fallback if metadata never loads
            setTimeout(() => {
                if (audio.readyState < 2) {
                    console.warn('Audio metadata not loaded, using default timing');
                    setTimeout(makePieceFloat, CONFIG.pieceDisplayTime);
                }
            }, 1000);
        }
    } else {
        // No audio, use default timing
        setTimeout(makePieceFloat, CONFIG.pieceDisplayTime);
    }
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
        // Try alternative extension (pieces 0-5 are .jpg, 6-8 are .jpeg)
        const altExtension = pieceId <= 5 ? 'jpeg' : 'jpg';
        this.src = `./pieces/${pieceId}.${altExtension}`;
        this.onerror = function() {
            this.src = `pieces/${pieceId}.${altExtension}`;
            console.error('Failed to load with alternative extension');
        };
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
    // Pieces 0-5 use .jpg, pieces 6-8 use .jpeg
    const extension = pieceId <= 5 ? 'jpg' : 'jpeg';
    const path = `pieces/${pieceId}.${extension}`;
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
    console.log('showCompletePuzzle called');
    const container = document.getElementById('complete-puzzle');
    const piecesContainer = document.getElementById('pieces-container');
    
    if (!container) {
        console.error('complete-puzzle container not found!');
        return;
    }
    
    // Stop physics animation
    if (physicsAnimationId !== null) {
        cancelAnimationFrame(physicsAnimationId);
        physicsAnimationId = null;
    }
    
    // Calculate center position and piece size for the final puzzle
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const puzzleSize = Math.min(viewportWidth * 0.85, viewportHeight * 0.7);
    const pieceSize = puzzleSize / CONFIG.gridSize;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    console.log('Animating pieces to form puzzle. Puzzle size:', puzzleSize, 'Piece size:', pieceSize);
    
    // Animate floating pieces to their correct positions in the puzzle
    floatingPieces.forEach(p => {
        if (p.element) {
            // Calculate target position for this piece in the grid
            // For 3x3 grid: col 0,1,2 -> offset -1,0,1
            const offsetX = (p.col - (CONFIG.gridSize - 1) / 2) * pieceSize;
            const targetX = centerX + offsetX;
            const offsetY = (p.row - (CONFIG.gridSize - 1) / 2) * pieceSize;
            const targetY = centerY + offsetY;
            
            // Get current position relative to viewport
            const currentRect = p.element.getBoundingClientRect();
            const currentX = currentRect.left + currentRect.width / 2;
            const currentY = currentRect.top + currentRect.height / 2;
            
            console.log(`Piece ${p.id} (row ${p.row}, col ${p.col}): moving from (${currentX}, ${currentY}) to (${targetX}, ${targetY})`);
            
            // Remove floating class and set up for animation
            p.element.classList.remove('floating');
            p.element.style.position = 'fixed';
            p.element.style.left = currentX + 'px';
            p.element.style.top = currentY + 'px';
            p.element.style.width = pieceSize + 'px';
            p.element.style.height = pieceSize + 'px';
            p.element.style.marginLeft = '-' + (pieceSize / 2) + 'px';
            p.element.style.marginTop = '-' + (pieceSize / 2) + 'px';
            p.element.style.zIndex = '9999';
            p.element.style.transition = 'all 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
            p.element.style.transform = 'rotate(0deg)';
            
            // Animate to target position
            requestAnimationFrame(() => {
                p.element.style.left = targetX + 'px';
                p.element.style.top = targetY + 'px';
                p.element.style.transform = 'rotate(0deg)';
            });
        }
    });
    
    // After pieces are in position, show the complete puzzle overlay
    setTimeout(() => {
        console.log('Pieces should be in position now');
        
        // Show success message first
        showSuccessMessage();
        
        // Wait a bit more, then fade pieces and show complete image
        setTimeout(() => {
            console.log('Showing complete puzzle container');
            console.log('Image path:', CONFIG.mainImagePath);
            container.style.display = 'flex';
            
            // Play final song when complete puzzle is shown
            playFinalSong();
            
            // Create complete image
            const img = document.createElement('img');
            img.style.display = 'block';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.src = CONFIG.mainImagePath;
            img.alt = 'Complete Puzzle';
            
            // Add error handler
            img.onerror = function() {
                console.error('Failed to load complete puzzle image:', this.src);
                // Try alternative paths
                const altPaths = [
                    `./${CONFIG.mainImagePath}`,
                    `/${CONFIG.mainImagePath}`,
                    `../${CONFIG.mainImagePath}`,
                    CONFIG.mainImagePath
                ];
                let currentPathIndex = 0;
                const originalOnError = this.onerror;
                this.onerror = function() {
                    currentPathIndex++;
                    if (currentPathIndex < altPaths.length) {
                        console.log('Trying alternative path:', altPaths[currentPathIndex]);
                        this.src = altPaths[currentPathIndex];
                    } else {
                        console.error('All image paths failed for complete puzzle');
                        container.innerHTML = '<p style="color: white; font-size: 24px; text-align: center;">Puzzle Complete! 🎉<br><small>Image not found: ' + CONFIG.mainImagePath + '</small></p>';
                    }
                };
                this.src = altPaths[0];
            };
            
            img.onload = function() {
                console.log('✅ Complete puzzle image loaded successfully:', this.src);
                console.log('Image dimensions:', this.naturalWidth, 'x', this.naturalHeight);
            };
            
            container.innerHTML = '';
            container.appendChild(img);
            
            // Force a reflow to ensure display
            container.offsetHeight;
            
            // Fade out the individual pieces
            floatingPieces.forEach(p => {
                if (p.element) {
                    p.element.style.transition = 'opacity 1.5s ease-out';
                    p.element.style.opacity = '0';
                }
            });
            
            // Clear pieces container after fade
            setTimeout(() => {
                if (piecesContainer) {
                    piecesContainer.innerHTML = '';
                }
                floatingPieces = [];
            }, 1500);
        }, 2000); // Wait 2 seconds after pieces are in position
    }, 2500); // Wait for pieces to animate into position (2.5s animation + buffer)
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.innerHTML = `
        <h2>🎉 Ты собрала все части! 🎉</h2>
        <p>Ты разблокировала всю картинку!</p>
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
        progressMessage.textContent = 'И Беги покупать беговые кроссовки:)';
    }
    
    // Update title if needed
    if (foundCount === totalPieces) {
        progressTitle.textContent = 'Пакуй трусишки в Порто!';
    }
}

// Setup reset button
function setupResetButton() {
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Confirm before resetting
            if (confirm('Точно хочешь начать заново? Все найденные картинки будут удалены.')) {
                resetPuzzle();
            }
        });
    }
}

// Reset function - clears all scanned pieces and reloads the page
// Call this from browser console: resetPuzzle()
function resetPuzzle() {
    localStorage.removeItem('scannedPieces');
    localStorage.removeItem('scannedPiecesUpdate');
    location.reload();
}

// Make resetPuzzle available globally for console access
window.resetPuzzle = resetPuzzle;
