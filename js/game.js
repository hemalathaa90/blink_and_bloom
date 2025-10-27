/**
 * Game - Main game controller for Blink & Bloom
 * Coordinates blink detection, garden management, and game sessions
 */

class BlinkBloomGame {
    constructor() {
        this.blinkDetector = new BlinkDetector();
        this.gazeDetector = new GazeDetector();
        this.cameraUtils = new CameraUtils();
        this.garden = new Garden();
        this.gazeCursor = new GazeCursor();
        this.gazeDebugPanel = null;
        this.audioManager = new AudioManager();
        this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'complete'
        
        // Game session tracking
        this.sessionStartTime = null;
        this.sessionDuration = 3 * 60 * 1000; // 3 minutes in milliseconds
        this.sessionTimer = null;
        this.gameTimer = null;
        this.pauseStartTime = null;
        this.totalPauseTime = 0;
        
        // Blink tracking
        this.totalBlinks = 0;
        this.sessionBlinks = 0;
        this.lastBlinkTime = 0;
        
        // Look-away tracking
        this.lookAwayBreaks = 0;
        this.lastLookAwayTime = 0;
        this.lookAwayDuration = 5000; // 5 seconds
        this.lookAwayTimer = null;
        this.isOnLookAwayBreak = false;
        
        // Face detection tracking
        this.faceDetectionLost = 0;
        this.consecutiveFaceLoss = 0;
        this.faceDetectionThreshold = 3000; // 3 seconds without face = look-away
        
        // Performance tracking
        this.blinkRate = 0; // Blinks per minute
        this.averageBlinkInterval = 0;
        this.blinkIntervals = [];
        
        // Plant tracking for session summary
        this.sessionPlantsGrown = 0;
        this.sessionPlantsWilted = 0;
        
        // Gaze tracking
        this.gazeEnabled = false;
        this.currentGazeRegion = 'center';
        this.gazeInteractions = 0;
        
        // Daily Quest System
        this.dailyQuests = [
            {
                id: 'grow_plants',
                icon: '🌱',
                text: 'Grow 5 plants',
                target: 5,
                current: 0,
                completed: false,
                type: 'plant_growth'
            },
            {
                id: 'bloom_flowers',
                icon: '🌸',
                text: 'Bloom 3 flowers',
                target: 3,
                current: 0,
                completed: false,
                type: 'plant_bloom'
            },
            {
                id: 'garden_health',
                icon: '💚',
                text: 'Maintain 80% garden health',
                target: 80,
                current: 0,
                completed: false,
                type: 'garden_health'
            },
            {
                id: 'neck_exercise',
                icon: '🧭',
                text: 'Complete 3 wind exercises',
                target: 3,
                current: 0,
                completed: false,
                type: 'wind_alignment'
            }
        ];
        this.gazeTargetedPlants = new Set();
        
        this.initializeEventListeners();
        this.setupCallbacks();
        this.initializeCameraSystem();
        
        // Initialize quest display after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.updateQuestDisplay();
        }, 100);
    }
    
    initializeEventListeners() {
        // Menu buttons
        document.getElementById('start-game-btn').addEventListener('click', () => this.showGameScreen());
        document.getElementById('mini-game-btn').addEventListener('click', () => this.showMiniGameScreen());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('menu-btn').addEventListener('click', () => this.showMainMenu());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.showMainMenu());
        
        // Start tips rotation
        this.initializeTips();
        
        // Control buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.pauseGame();
            } else if (this.gameState === 'paused') {
                this.resumeGame();
            }
        });
        document.getElementById('look-away-btn').addEventListener('click', () => this.startLookAwayBreak());
        document.getElementById('new-session-btn').addEventListener('click', () => this.resetGame());
        
        // Add toggle-gaze-btn event listener only if element exists
        const toggleGazeBtn = document.getElementById('toggle-gaze-btn');
        if (toggleGazeBtn) {
            toggleGazeBtn.addEventListener('click', () => this.toggleGazeDetection());
        }
        
        // Camera controls (if they exist)
        const refreshBtn = document.getElementById('refresh-cameras-btn');
        const diagnosticsBtn = document.getElementById('camera-diagnostics-btn');
        const cameraSelect = document.getElementById('camera-select');
        
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshCameras());
        if (diagnosticsBtn) diagnosticsBtn.addEventListener('click', () => this.runCameraDiagnostics());
        if (cameraSelect) cameraSelect.addEventListener('change', (e) => this.switchCamera(e.target.value));
        
        // Add debug panel button if it exists
        const debugBtn = document.getElementById('gaze-debug-btn');
        if (debugBtn) {
            debugBtn.addEventListener('click', () => this.toggleGazeDebug());
        }
        
        // Add calibration button if it exists
        const calibrateBtn = document.getElementById('calibrate-gaze-btn');
        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => this.toggleGazeCalibration());
        }
        
        // Add close settings button
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ': // Spacebar for pause/resume
                    e.preventDefault();
                    if (this.gameState === 'playing') {
                        this.pauseGame();
                    } else if (this.gameState === 'paused') {
                        this.resumeGame();
                    }
                    break;
                case 'l': // L for look-away break
                    if (this.gameState === 'playing') {
                        this.startLookAwayBreak();
                    }
                    break;
            }
        });
    }
    
    // Screen Navigation Methods
    showMainMenu() {
        this.hideAllScreens();
        document.getElementById('main-menu').classList.remove('hidden');
        
        // Stop any active game
        if (this.gameState === 'playing') {
            this.pauseGame();
        }
    }
    
    showGameScreen() {
        this.hideAllScreens();
        document.getElementById('game-screen').classList.remove('hidden');
        
        // Initialize audio on first interaction
        this.audioManager.initializeOnUserInteraction();
        
        // Initialize camera system when entering game
        this.initializeCameraSystem();
    }
    
    showMiniGameScreen() {
        this.hideAllScreens();
        document.getElementById('mini-game-screen').classList.remove('hidden');
        
        // Load the selected mini-game
        this.loadMiniGame();
    }
    
    showSettings() {
        // Show debug panels
        const debugPanels = document.getElementById('debug-panels');
        debugPanels.classList.remove('hidden');
    }
    
    hideSettings() {
        // Hide debug panels
        const debugPanels = document.getElementById('debug-panels');
        debugPanels.classList.add('hidden');
    }
    
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    }
    
    // Mini-Game: Blink Symphony
    loadMiniGame() {
        const container = document.getElementById('mini-game-container');
        container.innerHTML = `
            <div class="mini-game-panel">
                <h2>🎵 Blink Symphony</h2>
                <p class="mini-game-description">
                    Blink on-beat to create raindrops! <br>
                    Follow the rhythm and fill your rain meter.
                </p>
                
                <div id="symphony-game-area">
                    <div id="rhythm-bar">
                        <div id="beat-indicator"></div>
                        <div id="rhythm-track"></div>
                    </div>
                    
                    <div id="rain-meter">
                        <div id="rain-fill"></div>
                        <span>Rain: <span id="rain-percentage">0%</span></span>
                    </div>
                    
                    <div id="symphony-canvas-container">
                        <canvas id="raindrop-canvas" width="400" height="300"></canvas>
                        <div id="symphony-camera">
                            <video id="symphony-video" autoplay muted></video>
                            <canvas id="symphony-detection"></canvas>
                        </div>
                    </div>
                    
                    <div id="symphony-score">
                        <span>Score: <span id="symphony-points">0</span></span>
                        <span>Combo: <span id="symphony-combo">0</span></span>
                    </div>
                </div>
                
                <div class="mini-game-controls">
                    <button id="symphony-start" class="menu-btn primary">🎵 Start Symphony</button>
                    <button id="symphony-stop" class="menu-btn" disabled>⏹️ Stop</button>
                    <button id="back-to-menu" class="menu-btn">🏠 Back to Menu</button>
                </div>
            </div>
        `;
        
        // Add event listeners for mini-game
        document.getElementById('symphony-start').addEventListener('click', () => this.startBlinkSymphony());
        document.getElementById('symphony-stop').addEventListener('click', () => this.stopBlinkSymphony());
        document.getElementById('back-to-menu').addEventListener('click', () => this.showMainMenu());
        
        // Initialize mini-game systems
        this.initializeBlinkSymphony();
    }
    
    initializeBlinkSymphony() {
        this.symphonyState = {
            isActive: false,
            bpm: 45, // 45 beats per minute for more relaxed blinking
            beatInterval: null,
            currentBeat: 0,
            score: 0,
            combo: 0,
            rainLevel: 0,
            lastBlinkTime: 0,
            beatTolerance: 600, // 600ms tolerance window (more forgiving)
            raindrops: []
        };
        
        this.symphonyCanvas = document.getElementById('raindrop-canvas');
        this.symphonyCtx = this.symphonyCanvas.getContext('2d');
        this.symphonyVideo = document.getElementById('symphony-video');
        this.symphonyDetectionCanvas = document.getElementById('symphony-detection');
        
        // Setup camera for mini-game
        this.setupSymphonyCamera();
    }
    
    async setupSymphonyCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 160, height: 120 } 
            });
            this.symphonyVideo.srcObject = stream;
            
            // Setup blink detection for symphony
            this.blinkDetector.setupCamera(this.symphonyVideo, this.symphonyDetectionCanvas);
            
        } catch (error) {
            console.error('Failed to setup symphony camera:', error);
        }
    }
    
    startBlinkSymphony() {
        this.symphonyState.isActive = true;
        this.symphonyState.score = 0;
        this.symphonyState.combo = 0;
        this.symphonyState.rainLevel = 0;
        this.symphonyState.currentBeat = 0;
        
        // Start beat tracking
        const beatDuration = 60000 / this.symphonyState.bpm; // Convert BPM to milliseconds
        this.symphonyState.beatInterval = setInterval(() => {
            this.onSymphonyBeat();
        }, beatDuration);
        
        // Start blink detection
        this.blinkDetector.startDetection();
        
        // Start animation loop
        this.symphonyAnimationLoop();
        
        // Update UI
        document.getElementById('symphony-start').disabled = true;
        document.getElementById('symphony-stop').disabled = false;
        
        console.log('🎵 Blink Symphony started!');
    }
    
    stopBlinkSymphony() {
        this.symphonyState.isActive = false;
        
        if (this.symphonyState.beatInterval) {
            clearInterval(this.symphonyState.beatInterval);
        }
        
        this.blinkDetector.stopDetection();
        
        // Update UI
        document.getElementById('symphony-start').disabled = false;
        document.getElementById('symphony-stop').disabled = true;
        
        // Show final score
        this.showSymphonyResults();
        
        console.log('🎵 Blink Symphony stopped!');
    }
    
    onSymphonyBeat() {
        this.symphonyState.currentBeat++;
        
        // Play beat sound
        this.audioManager.playBeatSound();
        
        // Visual beat indicator
        const beatIndicator = document.getElementById('beat-indicator');
        beatIndicator.style.animation = 'none';
        setTimeout(() => {
            beatIndicator.style.animation = 'beat-pulse 0.2s ease-out';
        }, 10);
        
        // Add beat marker to rhythm track
        this.addBeatMarker();
    }
    
    onSymphonyBlink() {
        if (!this.symphonyState.isActive) return;
        
        const currentTime = Date.now();
        const timeSinceLastBeat = currentTime % (60000 / this.symphonyState.bpm);
        
        // Always provide visual feedback for blink detection
        this.createBlinkFeedback();
        
        // Check if blink is within tolerance of beat
        if (timeSinceLastBeat < this.symphonyState.beatTolerance || 
            timeSinceLastBeat > (60000 / this.symphonyState.bpm) - this.symphonyState.beatTolerance) {
            
            // Perfect timing!
            this.symphonyState.score += 10 + this.symphonyState.combo;
            this.symphonyState.combo++;
            this.symphonyState.rainLevel = Math.min(100, this.symphonyState.rainLevel + 5);
            
            // Play perfect timing sound
            this.audioManager.playPerfectSound();
            
            // Create sparkle effect
            this.createSymphonySparkle();
            
            // Create raindrop effect
            this.createRaindrop(Math.random() * this.symphonyCanvas.width, 0);
            
        } else {
            // Missed the beat - still give some feedback
            this.symphonyState.combo = 0;
            this.symphonyState.score += 1; // Small points for blinking
            
            // Play softer sound for missed beat
            this.audioManager.playMissedBeatSound();
        }
        
        this.updateSymphonyUI();
    }
    
    symphonyAnimationLoop() {
        if (!this.symphonyState.isActive) return;
        
        // Clear canvas
        this.symphonyCtx.clearRect(0, 0, this.symphonyCanvas.width, this.symphonyCanvas.height);
        
        // Draw raindrops
        this.updateRaindrops();
        
        // Continue animation
        requestAnimationFrame(() => this.symphonyAnimationLoop());
    }
    
    createRaindrop(x, y) {
        this.symphonyState.raindrops.push({
            x: x,
            y: y,
            speed: 2 + Math.random() * 3,
            size: 2 + Math.random() * 4,
            alpha: 1
        });
    }
    
    updateRaindrops() {
        for (let i = this.symphonyState.raindrops.length - 1; i >= 0; i--) {
            const drop = this.symphonyState.raindrops[i];
            
            // Update position
            drop.y += drop.speed;
            drop.alpha = Math.max(0, drop.alpha - 0.01);
            
            // Draw raindrop
            this.symphonyCtx.save();
            this.symphonyCtx.globalAlpha = drop.alpha;
            this.symphonyCtx.fillStyle = '#6B8F71';
            this.symphonyCtx.beginPath();
            this.symphonyCtx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
            this.symphonyCtx.fill();
            this.symphonyCtx.restore();
            
            // Remove if off screen or faded
            if (drop.y > this.symphonyCanvas.height || drop.alpha <= 0) {
                this.symphonyState.raindrops.splice(i, 1);
            }
        }
    }
    
    updateSymphonyUI() {
        document.getElementById('symphony-points').textContent = this.symphonyState.score;
        document.getElementById('symphony-combo').textContent = this.symphonyState.combo;
        document.getElementById('rain-percentage').textContent = Math.round(this.symphonyState.rainLevel) + '%';
        document.getElementById('rain-fill').style.width = this.symphonyState.rainLevel + '%';
    }
    
    addBeatMarker() {
        // Simple visual indicator for now
        const track = document.getElementById('rhythm-track');
        const marker = document.createElement('div');
        marker.className = 'beat-marker';
        track.appendChild(marker);
        
        // Remove after animation
        setTimeout(() => {
            if (track.contains(marker)) {
                track.removeChild(marker);
            }
        }, 2000);
    }
    
    createSymphonySparkle() {
        const container = document.getElementById('symphony-canvas-container');
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle-effect';
        sparkle.textContent = '✨';
        sparkle.style.left = Math.random() * 80 + 10 + '%';
        sparkle.style.top = Math.random() * 80 + 10 + '%';
        
        container.appendChild(sparkle);
        
        setTimeout(() => {
            if (container.contains(sparkle)) {
                container.removeChild(sparkle);
            }
        }, 600);
    }
    
    createBlinkFeedback() {
        // Visual feedback - flash the camera overlay briefly
        const cameraOverlay = document.getElementById('symphony-camera');
        if (cameraOverlay) {
            cameraOverlay.style.background = 'rgba(255, 215, 0, 0.3)';
            setTimeout(() => {
                cameraOverlay.style.background = 'transparent';
            }, 150);
        }
        
        // Add a subtle pulse effect to beat indicator
        const beatIndicator = document.getElementById('beat-indicator');
        if (beatIndicator) {
            beatIndicator.classList.add('blink-detected');
            setTimeout(() => {
                beatIndicator.classList.remove('blink-detected');
            }, 200);
        }
    }
    
    showSymphonyResults() {
        const finalScore = this.symphonyState.score;
        const finalCombo = this.symphonyState.combo;
        const finalRain = Math.round(this.symphonyState.rainLevel);
        
        // Play success sound
        this.audioManager.playSuccessSound();
        
        // Update modal content
        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('final-combo').textContent = finalCombo;
        document.getElementById('final-rain').textContent = finalRain + '%';
        
        // Determine performance rating
        let rating = "Good effort!";
        if (finalScore > 100) rating = "Great performance!";
        if (finalScore > 200) rating = "Excellent rhythm!";
        if (finalScore > 300) rating = "Master conductor!";
        if (finalRain >= 80) rating = "Perfect harmony! ✨";
        
        document.getElementById('performance-rating').textContent = rating;
        
        // Show custom modal
        document.getElementById('symphony-results').classList.remove('hidden');
        
        // Add event listeners for modal buttons
        document.getElementById('symphony-play-again').onclick = () => {
            document.getElementById('symphony-results').classList.add('hidden');
            this.startBlinkSymphony();
        };
        
        document.getElementById('symphony-back-menu').onclick = () => {
            document.getElementById('symphony-results').classList.add('hidden');
            this.showMainMenu();
        };
    }
    
    // Tips System
    initializeTips() {
        this.tips = [
            "Blink naturally to water your plants! 🌱",
            "Take regular look-away breaks for rain bonuses ☔",
            "Healthy plants grow faster with consistent watering 🌿",
            "Try the mini-game for rhythm-based blinking practice 🎵",
            // "Gaze detection lets you target specific plants 👁️",
            "Aim for 15-20 blinks per minute for eye health 💧"
        ];
        this.currentTipIndex = 0;
        
        // Start tip rotation
        setInterval(() => {
            this.rotateTip();
        }, 8000); // Change tip every 8 seconds
    }
    
    rotateTip() {
        const tipElement = document.getElementById('current-tip');
        if (tipElement) {
            // Fade out
            tipElement.style.opacity = '0.5';
            
            setTimeout(() => {
                this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
                tipElement.textContent = this.tips[this.currentTipIndex];
                tipElement.style.opacity = '1';
            }, 300);
        }
    }
    
    updateSidebarStats(gardenStats) {
        // Update plant count
        const plantCountElement = document.getElementById('plant-count');
        if (plantCountElement) {
            plantCountElement.textContent = `${gardenStats.totalPlants}/9`;
        }
        
        // Update blink rate
        const blinkRateElement = document.getElementById('blink-rate');
        if (blinkRateElement) {
            blinkRateElement.textContent = `${Math.round(this.blinkRate)}/min`;
        }
        
        // Update break count
        const breakCountElement = document.getElementById('break-count');
        if (breakCountElement) {
            breakCountElement.textContent = this.lookAwayBreaks.toString();
        }
    }
    
    updateGardenStatusText(gardenStats) {
        const statusElement = document.getElementById('garden-status-text');
        if (!statusElement) return;
        
        let statusText = "Your garden is getting started...";
        
        if (gardenStats.totalPlants === 0) {
            statusText = "Start blinking to plant your first seeds! 🌱";
        } else if (gardenStats.totalPlants < 3) {
            statusText = "Your garden is taking root! Keep blinking! 🌿";
        } else if (gardenStats.bloomingPlants === 0) {
            statusText = "Plants are growing! Keep them watered! 💧";
        } else if (gardenStats.overallHealth < 30) {
            statusText = "Your plants need more water! Blink more often! ⚠️";
        } else if (gardenStats.overallHealth < 60) {
            statusText = "Garden is doing okay, but could use more care! 🌱";
        } else if (gardenStats.overallHealth < 80) {
            statusText = "Your garden is healthy and growing well! 🌿";
        } else if (gardenStats.bloomingPlants < 3) {
            statusText = "Garden is thriving! More blooms coming soon! 🌺";
        } else {
            statusText = "Perfect garden paradise! Your eyes are healthy! ✨🌸";
        }
        
        statusElement.textContent = statusText;
    }

    setupCallbacks() {
        // Blink detection callback
        console.log('🔧 Setting up blink detection callback...', {
            blinkDetectorExists: !!this.blinkDetector,
            blinkDetectorId: this.blinkDetector?.constructor?.name
        });
        this.blinkDetector.onBlinkDetected = () => {
            console.log('🔥 onBlinkDetected callback triggered');
            this.handleBlink();
            
            // Also handle mini-game blinks
            if (this.symphonyState && this.symphonyState.isActive) {
                this.onSymphonyBlink();
            }
        };
        console.log('✅ Blink detection callback set:', {
            hasCallback: !!this.blinkDetector.onBlinkDetected,
            callbackType: typeof this.blinkDetector.onBlinkDetected,
            blinkDetectorInstance: this.blinkDetector
        });
        
        // Face detection callback
        this.blinkDetector.onFaceDetected = (faceDetected, eyeAspectRatio) => {
            this.handleFaceDetection(faceDetected, eyeAspectRatio);
        };
        
        // Error handling
        this.blinkDetector.onError = (error) => {
            this.handleError(error);
        };
        
        // Gaze detection callbacks
        this.gazeDetector.onGazeDetected = (gaze, details) => {
            this.handleGazeDetection(gaze, details);
        };
        
        // Head direction callback for wind gameplay
        this.gazeDetector.onHeadDirectionChanged = (newDirection, previousDirection, details) => {
            this.handleHeadDirectionChange(newDirection, previousDirection, details);
        };
        
        this.gazeDetector.onError = (error) => {
            console.warn('Gaze detection error:', error);
            // Don't stop the game for gaze errors, just log them
        };
        
        // Garden callbacks for tracking session stats
        this.garden.onPlantGrown = (plant) => {
            if (plant.stage === 1) { // New plant grown from seed
                this.sessionPlantsGrown++;
                console.log('🌱 New plant grown! Total:', this.sessionPlantsGrown);
            }
        };
        
        this.garden.onPlantDied = (plant) => {
            this.sessionPlantsWilted++;
            console.log('💀 Plant died! Total wilted:', this.sessionPlantsWilted);
        };
    }
    
    async startGame() {
        console.log('Starting Blink & Bloom game...');
        console.log('🔄 UPDATED VERSION - setupCamera should be called before startDetection');
        
        // Initialize blink detector if not already done
        if (!this.blinkDetector.isInitialized) {
            const initialized = await this.blinkDetector.initialize();
            if (!initialized) {
                this.handleError('Failed to initialize blink detection');
                return;
            }
        }
        
        // Initialize gaze detector if enabled
        if (this.gazeEnabled && !this.gazeDetector.isInitialized) {
            const gazeInitialized = await this.gazeDetector.initialize();
            if (gazeInitialized) {
                console.log('Gaze detection initialized successfully');
                
                // Initialize debug panel
                if (!this.gazeDebugPanel) {
                    this.gazeDebugPanel = new GazeDebugPanel(this.gazeDetector);
                    window.gazeDebugPanel = this.gazeDebugPanel; // Global reference
                }
            } else {
                console.warn('Gaze detection failed to initialize, continuing without it');
                this.gazeEnabled = false;
            }
        }
        
        // Start camera using enhanced camera system
        const video = document.getElementById('camera-feed');
        const selectedDeviceId = document.getElementById('camera-select').value || null;
        
        this.updateCameraStatus('Starting camera...');
        const cameraStarted = await this.cameraUtils.startCamera(video, selectedDeviceId);
        
        if (!cameraStarted) {
            this.handleError('Failed to start camera');
            return;
        }
        
        this.updateCameraStatus(`Active: ${this.cameraUtils.getCurrentDevice()?.label || 'Default camera'}`);
        
        // Setup gaze detector with same video feed if enabled
        if (this.gazeEnabled && this.gazeDetector.isInitialized) {
            const gazeCanvas = document.getElementById('gaze-canvas') || this.createGazeCanvas();
            this.gazeDetector.setupCamera(video, gazeCanvas);
        }
        
        // Reset game state
        this.sessionStartTime = Date.now();
        this.sessionBlinks = 0;
        this.totalBlinks = 0;
        this.lookAwayBreaks = 0;
        this.blinkIntervals = [];
        this.gameState = 'playing';
        
        console.log('🔥 REACHED SETUP SECTION - About to setup blink detector camera');
        
        // Setup blink detector with the video feed BEFORE resetting garden
        const blinkCanvas = document.getElementById('detection-canvas');
        console.log('🔍 About to call setupCamera with:', {
            video: video ? 'present' : 'null',
            videoId: video?.id,
            canvas: blinkCanvas ? 'present' : 'null',
            canvasId: blinkCanvas?.id
        });
        this.blinkDetector.setupCamera(video, blinkCanvas);
        console.log('✅ setupCamera called successfully');
        
        // Reset garden
        this.garden.reset();
        
        // Set up garden callbacks for quest tracking
        this.garden.onPlantBloomed = (plant) => {
            console.log('🌸 Plant bloomed!', plant);
            this.updateQuestProgress('plant_bloom', 1);
        };
        
        this.garden.onWindAlignmentSuccess = () => {
            console.log('🧭 Successful wind alignment - neck exercise completed!');
            this.updateQuestProgress('wind_alignment', 1);
        };
        
        // Start garden health decay when session begins
        this.garden.startHealthDecay();
        
        // Ensure callbacks are set before starting detection
        console.log('🔄 Re-ensuring blink detection callback before starting detection...');
        this.blinkDetector.onBlinkDetected = () => {
            console.log('🔥 onBlinkDetected callback triggered');
            this.handleBlink();
            
            // Also handle mini-game blinks
            if (this.symphonyState && this.symphonyState.isActive) {
                this.onSymphonyBlink();
            }
        };
        console.log('✅ Callback verification before detection:', {
            hasCallback: !!this.blinkDetector.onBlinkDetected,
            callbackType: typeof this.blinkDetector.onBlinkDetected
        });
        
        // Start detection and timers
        this.blinkDetector.startDetection();
        
        // Auto-enable gaze detection for head/neck tracking
        if (!this.gazeEnabled) {
            this.toggleGazeDetection(); // This will enable and initialize gaze detection
        }
        
        if (this.gazeEnabled && this.gazeDetector.isInitialized) {
            this.gazeDetector.startDetection();
            // Start wind system for neck exercise gameplay
            this.startWindSystem();
        }
        this.startGameTimer();
        this.startSessionTimer();
        
        // Update UI
        this.updateUI();
        this.hideElement('session-summary');
        
        // Initialize quest display
        this.updateQuestDisplay();
        
        console.log('Game started successfully!');
    }
    
    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.gameState = 'paused';
        this.pauseStartTime = Date.now();
        this.blinkDetector.stopDetection();
        this.garden.stopHealthDecay();
        this.stopWindSystem(); // Stop wind system when paused
        
        // Clear timers
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        this.updateUI();
        console.log('Game paused');
    }
    
    resumeGame() {
        if (this.gameState !== 'paused') return;
        
        // Calculate pause duration
        if (this.pauseStartTime) {
            this.totalPauseTime += Date.now() - this.pauseStartTime;
            this.pauseStartTime = null;
        }
        
        this.gameState = 'playing';
        // Only start detection if blink detector has camera set up
        if (this.blinkDetector.video && this.blinkDetector.canvas) {
            this.blinkDetector.startDetection();
        }
        // Restart gaze detection and wind system if enabled
        if (this.gazeEnabled && this.gazeDetector.isInitialized) {
            this.gazeDetector.startDetection();
            this.startWindSystem();
        }
        this.garden.startHealthDecay();
        this.startGameTimer();
        
        // Restart session timer with remaining time
        this.restartSessionTimer();
        
        this.updateUI();
        console.log('Game resumed');
    }
    
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.updateGameTimer();
        }, 1000);
    }
    
    updateGameTimer() {
        if (this.gameState !== 'playing') return;
        
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.sessionStartTime - this.totalPauseTime;
        const remainingTime = this.sessionDuration - elapsedTime;
        
        // Update timer display with remaining time
        const minutes = Math.floor(Math.max(0, remainingTime) / 60000);
        const seconds = Math.floor((Math.max(0, remainingTime) % 60000) / 1000);
        document.getElementById('session-timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update day clock progress
        const progressPercent = Math.max(0, remainingTime / this.sessionDuration * 100);
        const clockFill = document.getElementById('clock-fill');
        if (clockFill) {
            clockFill.style.width = `${progressPercent}%`;
        }
        
        // Check if session is complete
        if (elapsedTime >= this.sessionDuration) {
            this.endGame();
        }
    }
    
    startSessionTimer() {
        this.sessionTimer = setTimeout(() => {
            this.endGame();
        }, this.sessionDuration);
    }
    
    restartSessionTimer() {
        // Calculate remaining time
        const elapsedTime = Date.now() - this.sessionStartTime - this.totalPauseTime;
        const remainingTime = this.sessionDuration - elapsedTime;
        
        if (remainingTime > 0) {
            this.sessionTimer = setTimeout(() => {
                this.endGame();
            }, remainingTime);
            console.log(`Session timer restarted with ${remainingTime/1000}s remaining`);
        } else {
            // Session should have ended already
            this.endGame();
        }
    }
    
    handleBlink() {
        console.log('🔍 handleBlink called - gameState:', this.gameState, 'isOnLookAwayBreak:', this.isOnLookAwayBreak, 'sessionBlinks before:', this.sessionBlinks);
        
        if (this.gameState !== 'playing' || this.isOnLookAwayBreak) {
            console.log('🚫 Blink ignored - gameState:', this.gameState, 'isOnLookAwayBreak:', this.isOnLookAwayBreak);
            return;
        }
        
        const currentTime = Date.now();
        this.sessionBlinks++;
        this.totalBlinks++;
        console.log('✅ Blink counted! Session blinks after increment:', this.sessionBlinks);
        
        // Track blink intervals for health metrics
        if (this.lastBlinkTime > 0) {
            const interval = currentTime - this.lastBlinkTime;
            this.blinkIntervals.push(interval);
            
            // Keep only recent intervals (last 20 blinks)
            if (this.blinkIntervals.length > 20) {
                this.blinkIntervals.shift();
            }
            
            // Calculate average interval
            this.averageBlinkInterval = this.blinkIntervals.reduce((a, b) => a + b, 0) / this.blinkIntervals.length;
        }
        
        this.lastBlinkTime = currentTime;
        
        // Water plants in garden
        const plantsWatered = this.garden.waterPlants();
        
        // Play audio feedback
        this.audioManager.playBlinkSound();
        if (plantsWatered > 0) {
            setTimeout(() => this.audioManager.playWaterSound(), 100);
        }
        
        // Calculate blink rate (blinks per minute)
        const sessionTime = (currentTime - this.sessionStartTime) / 60000; // minutes
        this.blinkRate = sessionTime > 0 ? this.sessionBlinks / sessionTime : 0;
        
        // Update UI
        this.updateUI();
        
        // Log for debugging
        console.log(`Blink detected! Total: ${this.sessionBlinks}, Plants watered: ${plantsWatered}`);
    }
    
    handleFaceDetection(faceDetected, blinkIntensity) {
        if (this.gameState !== 'playing') return;
        
        if (!faceDetected) {
            this.consecutiveFaceLoss += 100; // Approximate detection delay
            
            // Auto-trigger look-away break if face lost for too long
            if (this.consecutiveFaceLoss >= this.faceDetectionThreshold && !this.isOnLookAwayBreak) {
                console.log('Auto-triggering look-away break due to face detection loss');
                this.startLookAwayBreak();
            }
        } else {
            this.consecutiveFaceLoss = 0;
        }
    }
    
    startLookAwayBreak() {
        if (this.gameState !== 'playing' || this.isOnLookAwayBreak) return;
        
        this.isOnLookAwayBreak = true;
        this.lookAwayBreaks++;
        this.lastLookAwayTime = Date.now();
        
        // Pause blink detection during break
        this.blinkDetector.stopDetection();
        
        // Show look-away break UI
        this.showLookAwayBreakUI();
        
        // Set timer for break duration
        this.lookAwayTimer = setTimeout(() => {
            this.endLookAwayBreak();
        }, this.lookAwayDuration);
        
        console.log('Look-away break started');
    }
    
    endLookAwayBreak() {
        if (!this.isOnLookAwayBreak) return;
        
        this.isOnLookAwayBreak = false;
        
        // Resume blink detection (only if camera is set up)
        if (this.blinkDetector.video && this.blinkDetector.canvas) {
            this.blinkDetector.startDetection();
        }
        
        // Trigger rain effect as reward
        this.garden.triggerRainEffect();
        
        // Play rain sound effect
        this.audioManager.playRainSound();
        
        // Hide look-away break UI
        this.hideLookAwayBreakUI();
        
        // Clear timer
        if (this.lookAwayTimer) {
            clearTimeout(this.lookAwayTimer);
            this.lookAwayTimer = null;
        }
        
        console.log('Look-away break ended - Rain effect triggered!');
    }
    
    showLookAwayBreakUI() {
        const lookAwayBtn = document.getElementById('look-away-btn');
        lookAwayBtn.textContent = 'Looking Away... ✨';
        lookAwayBtn.style.background = '#4169E1';
        lookAwayBtn.style.color = 'white';
        lookAwayBtn.disabled = true;
        
        // Show countdown if desired
        let countdown = this.lookAwayDuration / 1000;
        const countdownInterval = setInterval(() => {
            countdown--;
            lookAwayBtn.textContent = `Looking Away... ${countdown}s ✨`;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    hideLookAwayBreakUI() {
        const lookAwayBtn = document.getElementById('look-away-btn');
        lookAwayBtn.textContent = 'Take a Look-Away Break';
        lookAwayBtn.style.background = '#87CEEB';
        lookAwayBtn.style.color = '#2F4F2F';
        lookAwayBtn.disabled = false;
    }
    
    endGame() {
        console.log('Game session complete!');
        
        this.gameState = 'complete';
        
        // Stop all timers and detection
        this.blinkDetector.stopDetection();
        this.garden.stopHealthDecay();
        this.stopWindSystem(); // Stop wind system when game ends
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        if (this.lookAwayTimer) {
            clearTimeout(this.lookAwayTimer);
            this.isOnLookAwayBreak = false;
        }
        
        // Show session summary
        this.showSessionSummary();
        this.updateUI();
    }
    
    showSessionSummary() {
        const summary = document.getElementById('session-summary');
        const statsContainer = document.getElementById('summary-stats');
        
        // Calculate session stats
        const sessionDurationMinutes = (Date.now() - this.sessionStartTime) / 60000;
        const gardenStats = this.garden.getGardenStats();
        const windStats = this.garden.getWindStats();
        const healthScore = this.calculateHealthScore();
        
        // Generate summary HTML with organized multi-column sections
        statsContainer.innerHTML = `
            <!-- Eye Health Section -->
            <div class="summary-section">
                <h3>👁️ Eye Health</h3>
                <div class="summary-stat">
                    <h4>Total Blinks</h4>
                    <div class="value">${this.sessionBlinks}</div>
                </div>
                <div class="summary-stat">
                    <h4>Look-Away Breaks</h4>
                    <div class="value">${this.lookAwayBreaks}</div>
                </div>
                <div class="summary-stat">
                    <h4>Health Score</h4>
                    <div class="value">${healthScore}</div>
                </div>
            </div>
            
            <!-- Garden Section -->
            <div class="summary-section">
                <h3>🌿 Garden Progress</h3>
                <div class="summary-stat">
                    <h4>Plants Grown</h4>
                    <div class="value">${this.sessionPlantsGrown}</div>
                </div>
                <div class="summary-stat">
                    <h4>Currently Blooming</h4>
                    <div class="value">${gardenStats.bloomingPlants}</div>
                </div>
                <div class="summary-stat">
                    <h4>Plants Wilted</h4>
                    <div class="value">${this.sessionPlantsWilted}</div>
                </div>
                <div class="summary-stat">
                    <h4>Final Health</h4>
                    <div class="value">${gardenStats.overallHealth}%</div>
                </div>
            </div>
            
            <!-- Exercise Section -->
            <div class="summary-section">
                <h3>🧭 Exercise Stats</h3>
                <div class="summary-stat">
                    <h4>Wind Events</h4>
                    <div class="value">${windStats.totalWindEvents}</div>
                </div>
                <div class="summary-stat">
                    <h4>Neck Exercise Success</h4>
                    <div class="value">${(windStats.recentAlignmentRate * 100).toFixed(0)}%</div>
                </div>
            </div>
        `;
        
        // Add daily quest summary
        const completedQuests = this.dailyQuests.filter(q => q.completed).length;
        const totalQuests = this.dailyQuests.length;
        
        statsContainer.innerHTML += `
            <!-- Daily Quests Section -->
            <div class="summary-section quest-section">
                <div class="summary-stat quest-header">
                    <h4>📋 Daily Quests Complete</h4>
                    <div class="value">${completedQuests}/${totalQuests}</div>
                </div>
                <div class="quest-details">
                    ${this.dailyQuests.map(quest => {
                        const statusIcon = quest.completed ? '✅' : '❌';
                        const progressText = quest.type === 'garden_health' ? `${quest.current}%` : `${quest.current}/${quest.target}`;
                        return `
                            <div class="quest-item-summary">
                                <span>${statusIcon} ${quest.icon} ${quest.text}</span>
                                <span class="quest-progress">${progressText}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        this.showElement('session-summary');
    }
    
    calculateHealthScore() {
        // Calculate a health score based on blink rate and look-away breaks
        const idealBlinkRate = 15; // blinks per minute
        const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
        const currentBlinkRate = sessionMinutes > 0 ? this.sessionBlinks / sessionMinutes : 0;
        
        // Score components
        let blinkScore = Math.max(0, 100 - Math.abs(currentBlinkRate - idealBlinkRate) * 5);
        let breakScore = Math.min(100, this.lookAwayBreaks * 25);
        let gardenScore = this.garden.getGardenStats().overallHealth;
        
        // Weighted average
        const healthScore = Math.round((blinkScore * 0.4 + breakScore * 0.3 + gardenScore * 0.3));
        
        return Math.max(0, Math.min(100, healthScore));
    }
    
    updateUI() {
        // Update blink counter with explicit logging for debugging
        const blinkCounterElement = document.getElementById('blink-counter');
        if (blinkCounterElement) {
            blinkCounterElement.textContent = `Blinks: ${this.sessionBlinks}`;
            console.log('UI updated - Session blinks:', this.sessionBlinks);
        } else {
            console.warn('Blink counter element not found!');
        }
        
        // Update garden health progress bar
        const gardenStats = this.garden.getGardenStats();
        const healthElement = document.getElementById('plant-health');
        if (healthElement) {
            const progressBar = healthElement.querySelector('.flower-progress');
            const textElement = healthElement.querySelector('.flower-progress ~ *') || healthElement.lastChild;
            
            if (progressBar) {
                const healthPercent = Math.round(gardenStats.overallHealth / 25) * 25; // Round to nearest 25%
                progressBar.setAttribute('data-progress', healthPercent.toString());
            }
            
            // Update text (check if it's a text node)
            if (textElement && textElement.nodeType === Node.TEXT_NODE) {
                textElement.textContent = `Garden: ${gardenStats.overallHealth}%`;
            } else if (textElement) {
                textElement.textContent = `Garden: ${gardenStats.overallHealth}%`;
            }
            
            // Add visual effects based on health
            if (gardenStats.overallHealth < 30) {
                healthElement.classList.add('fatigue-warning');
            } else {
                healthElement.classList.remove('fatigue-warning');
            }
            
            // Update garden status text
            this.updateGardenStatusText(gardenStats);
        }
        
        // Update sidebar stats
        this.updateSidebarStats(gardenStats);
        
        // Update quest progress based on current garden state
        if (this.gameState === 'playing') {
            // Track garden health quest (this one uses current value)
            this.updateQuestProgress('garden_health', gardenStats.overallHealth);
            
            // Track blooming plants quest (current count, not cumulative)
            this.updateQuestProgress('plant_bloom', gardenStats.bloomingPlants);
            
            // Track plant growth quest (current count of living plants, not cumulative)
            this.updateQuestProgress('plant_growth', gardenStats.totalPlants);
        }
        
        // Update button states
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const lookAwayBtn = document.getElementById('look-away-btn');
        
        switch (this.gameState) {
            case 'menu':
                startBtn.textContent = 'Start Garden Session';
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                lookAwayBtn.disabled = true;
                break;
            case 'playing':
                startBtn.textContent = 'Restart Session';
                startBtn.disabled = false;
                pauseBtn.textContent = 'Pause';
                pauseBtn.disabled = false;
                lookAwayBtn.disabled = this.isOnLookAwayBreak;
                break;
            case 'paused':
                pauseBtn.textContent = 'Resume';
                pauseBtn.disabled = false;
                lookAwayBtn.disabled = true;
                break;
            case 'complete':
                startBtn.textContent = 'Start New Session';
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                lookAwayBtn.disabled = true;
                break;
        }
        
        // Update gaze info display
        const gazeInfo = document.getElementById('gaze-info');
        const calibrateBtn = document.getElementById('calibrate-gaze-btn');
        
        if (gazeInfo) {
            if (this.gazeEnabled) {
                gazeInfo.style.display = 'block';
                const statusDiv = gazeInfo.querySelector('div:nth-child(2)');
                if (statusDiv) {
                    statusDiv.textContent = 
                        this.gazeDetector.isInitialized && this.gameState === 'playing' ? 
                        'Status: Active' : 'Status: Enabled (not detecting)';
                }
                
                // Show calibration button when gaze is enabled and active
                if (calibrateBtn) {
                    if (this.gazeDetector.isInitialized && this.gameState === 'playing') {
                        calibrateBtn.style.display = 'inline-block';
                        calibrateBtn.textContent = this.gazeDetector.calibrationData?.isCalibrating ? 
                            'Stop Calibration' : 'Calibrate Gaze';
                    } else {
                        calibrateBtn.style.display = 'none';
                    }
                }
            } else {
                gazeInfo.style.display = 'none';
                if (calibrateBtn) {
                    calibrateBtn.style.display = 'none';
                }
            }
        }
    }
    
    resetGame() {
        // Clean up current session
        if (this.gameTimer) clearInterval(this.gameTimer);
        if (this.sessionTimer) clearTimeout(this.sessionTimer);
        if (this.lookAwayTimer) clearTimeout(this.lookAwayTimer);
        
        this.blinkDetector.stopDetection();
        this.garden.reset();
        
        // Reset state
        this.gameState = 'menu';
        this.sessionBlinks = 0;
        this.totalBlinks = 0;
        this.lookAwayBreaks = 0;
        this.isOnLookAwayBreak = false;
        this.blinkIntervals = [];
        
        // Reset session plant counters
        this.sessionPlantsGrown = 0;
        this.sessionPlantsWilted = 0;
        
        // Reset daily quests progress (but not completion status)
        this.dailyQuests.forEach(quest => {
            quest.current = 0;
        });
        
        // Reset UI
        this.hideElement('session-summary');
        this.hideLookAwayBreakUI();
        this.updateUI();
        
        // Reset timer display
        document.getElementById('session-timer').textContent = '3:00';
        
        // Reset day clock
        const clockFill = document.getElementById('clock-fill');
        if (clockFill) {
            clockFill.style.width = '100%';
        }
        
        console.log('Game reset to menu state');
    }
    
    handleError(message) {
        console.error('Game Error:', message);
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #FFE4B5;
            border: 2px solid #DDA0DD;
            padding: 15px 20px;
            border-radius: 10px;
            max-width: 500px;
            text-align: center;
            z-index: 1000;
            font-weight: bold;
            color: #8B4513;
        `;
        errorDiv.innerHTML = `
            <div style="margin-bottom: 10px;">⚠️ ${message}</div>
            <button onclick="this.parentElement.remove()" style="
                background: #DDA0DD;
                border: none;
                padding: 5px 15px;
                border-radius: 5px;
                cursor: pointer;
                color: white;
                font-weight: bold;
            ">OK</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }
    
    // Gaze Detection Methods
    async toggleGazeDetection() {
        this.gazeEnabled = !this.gazeEnabled;
        const button = document.getElementById('toggle-gaze-btn');
        
        if (this.gazeEnabled) {
            if (button) {
                button.textContent = 'Disable Gaze Detection';
                button.style.background = 'rgba(255, 100, 100, 0.8)';
            }
            console.log('🎯 Gaze detection enabled');
            
            // Show gaze controls
            const calibrateBtn = document.getElementById('calibrate-gaze-btn');
            const debugBtn = document.getElementById('gaze-debug-btn');
            if (calibrateBtn) calibrateBtn.style.display = 'inline-block';
            if (debugBtn) debugBtn.style.display = 'inline-block';
            
            // Initialize gaze detection immediately if possible
            try {
                if (!this.gazeDetector.isInitialized) {
                    this.updateGazeStatus('Initializing gaze detection...');
                    const initialized = await this.gazeDetector.initialize();
                    if (!initialized) {
                        throw new Error('Failed to initialize gaze detector');
                    }
                }
                
                // Start camera and gaze detection even if game isn't running
                const video = document.getElementById('camera-feed');
                
                // If no existing video stream, start camera
                if (!video.srcObject) {
                    this.updateGazeStatus('Starting camera for gaze detection...');
                    const selectedDeviceId = document.getElementById('camera-select').value || null;
                    const cameraStarted = await this.cameraUtils.startCamera(video, selectedDeviceId);
                    
                    if (!cameraStarted) {
                        throw new Error('Failed to start camera for gaze detection');
                    }
                    
                    this.updateCameraStatus(`Active: ${this.cameraUtils.getCurrentDevice()?.label || 'Default camera'}`);
                }
                
                // Initialize gaze detection
                await this.initializeGazeDetection();
                this.updateGazeStatus('Gaze detection active');
                
            } catch (error) {
                console.error('❌ Error initializing gaze detection:', error);
                this.updateGazeStatus('Failed to initialize gaze detection');
                this.gazeEnabled = false;
                button.textContent = 'Enable Gaze Detection';
                button.style.background = '';
            }
        } else {
            if (button) {
                button.textContent = '🎯 Enable Gaze';
                button.style.background = '';
            }
            this.gazeDetector.stopDetection();
            this.updateGazeStatus('Gaze detection disabled');
            
            // Hide gaze cursor and clear any overlays
            if (this.gazeCursor) {
                this.gazeCursor.hide();
            }
            
            // Clear gaze canvas
            const gazeCanvas = document.getElementById('gaze-canvas');
            if (gazeCanvas) {
                const ctx = gazeCanvas.getContext('2d');
                ctx.clearRect(0, 0, gazeCanvas.width, gazeCanvas.height);
            }
            
            // Hide gaze controls
            const calibrateBtn = document.getElementById('calibrate-gaze-btn');
            const debugBtn = document.getElementById('gaze-debug-btn');
            if (calibrateBtn) calibrateBtn.style.display = 'none';
            if (debugBtn) debugBtn.style.display = 'none';
            
            console.log('⏹️ Gaze detection disabled');
        }
        
        this.updateUI();
    }
    
    updateGazeStatus(status) {
        const gazeInfo = document.getElementById('gaze-info');
        if (gazeInfo) {
            const statusDiv = gazeInfo.querySelector('div:nth-child(2)');
            if (statusDiv) {
                statusDiv.textContent = `Status: ${status}`;
            }
        }
    }
    
    async initializeGazeDetection() {
        if (!this.gazeDetector.isInitialized) {
            const initialized = await this.gazeDetector.initialize();
            if (!initialized) {
                console.warn('Failed to initialize gaze detection');
                this.gazeEnabled = false;
                return;
            }
        }
        
        const video = document.getElementById('camera-feed');
        const gazeCanvas = document.getElementById('gaze-canvas') || this.createGazeCanvas();
        this.gazeDetector.setupCamera(video, gazeCanvas);
        this.gazeDetector.startDetection();
    }
    
    createGazeCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'gaze-canvas';
        
        // Get video element for reference
        const video = document.getElementById('camera-feed');
        
        // Set canvas dimensions to match CSS-defined size (320x240)
        canvas.width = 320;
        canvas.height = 240;
        
        // Don't override CSS positioning - let the CSS handle it
        // The CSS already defines the correct positioning to match detection-canvas
        canvas.style.zIndex = '15'; // Just set z-index to be above detection canvas
        
        const cameraContainer = document.getElementById('camera-container');
        cameraContainer.appendChild(canvas);
        
        console.log('🎯 Created gaze canvas with CSS positioning:', { 
            canvasSize: { width: canvas.width, height: canvas.height },
            cssPositioning: 'Using CSS rules for consistent alignment with detection-canvas'
        });
        return canvas;
    }
    
    handleGazeDetection(gaze, details) {
        if (!this.gazeEnabled || this.gameState !== 'playing') return;
        
        const newRegion = this.gazeDetector.getGazeRegion();
        
        // Convert gaze to screen coordinates
        const screenCoords = this.gazeDetector.gazeToScreenCoordinates(gaze);
        
        // Gaze cursor disabled for head/neck tracking mode
        // if (this.gazeDetector.sensitivity) {
        //     this.gazeCursor.setSmoothing(this.gazeDetector.sensitivity.smoothing);
        // }
        // 
        // this.gazeCursor.updatePosition({
        //     ...gaze,
        //     confidence: details.confidence || 0.5
        // }, screenCoords);
        
        // Update current gaze region
        if (newRegion !== this.currentGazeRegion) {
            this.currentGazeRegion = newRegion;
            this.onGazeRegionChanged(newRegion, gaze, details);
        }
        
        // Update gaze visualization
        this.updateGazeVisualization(gaze, newRegion);
        
        // Handle gaze-based plant interactions
        this.handleGazeBasedPlantInteraction(gaze, details, screenCoords);
    }
    
    onGazeRegionChanged(region, gaze, details) {
        this.gazeInteractions++;
        console.log(`Gaze moved to ${region}`, gaze);
        
        // Visual feedback
        this.showGazeRegionFeedback(region);
        
        // Special interactions based on gaze region
        switch (region) {
            case 'up':
                // Looking up could trigger rain clouds
                this.garden.addBonusRain(0.1);
                break;
            case 'down':
                // Looking down could focus on ground plants
                this.garden.focusOnGroundPlants();
                break;
            case 'left':
            case 'right':
                // Looking left/right could spread water horizontally
                this.garden.addHorizontalWatering(region);
                break;
        }
    }
    
    handleGazeBasedPlantInteraction(gaze, details, screenCoords) {
        // Check if gaze is over the garden area
        const gardenElement = document.getElementById('garden-grid');
        if (!gardenElement) return;
        
        const gardenRect = gardenElement.getBoundingClientRect();
        const isOverGarden = screenCoords.x >= gardenRect.left && 
                           screenCoords.x <= gardenRect.right && 
                           screenCoords.y >= gardenRect.top && 
                           screenCoords.y <= gardenRect.bottom;
        
        if (isOverGarden && details.confidence > 0.6) {
            // Calculate which plant cell the gaze is over
            const cellX = Math.floor((screenCoords.x - gardenRect.left) / (gardenRect.width / this.garden.gridSize));
            const cellY = Math.floor((screenCoords.y - gardenRect.top) / (gardenRect.height / this.garden.gridSize));
            
            if (cellX >= 0 && cellX < this.garden.gridSize && cellY >= 0 && cellY < this.garden.gridSize) {
                const plant = this.garden.getPlantAt(cellY, cellX);
                
                if (plant && !this.gazeTargetedPlants.has(plant.id)) {
                    // Give extra attention to gazed-at plants
                    plant.addGazeBonus();
                    this.gazeTargetedPlants.add(plant.id);
                    
                    // Visual feedback
                    this.showGazePlantInteraction(plant, cellX, cellY);
                    
                    // Show interaction on cursor
                    this.gazeCursor.showInteraction();
                    
                    // Clear the set periodically to allow re-targeting
                    setTimeout(() => {
                        this.gazeTargetedPlants.delete(plant.id);
                    }, 3000);
                    
                    console.log(`👁️🌱 Gaze interaction with plant at (${cellX}, ${cellY}):`, plant);
                }
                
                // Highlight the cell being gazed at
                this.highlightGazedCell(cellX, cellY);
            }
        }
    }
    
    mapGazeToGardenPosition(gaze) {
        // Simple mapping of gaze coordinates to garden grid
        // This would need calibration in a real implementation
        const rows = 4;
        const cols = 6;
        
        // Convert gaze coordinates (-1 to 1) to grid positions
        const normalizedX = (gaze.x + 1) / 2; // 0 to 1
        const normalizedY = (gaze.y + 1) / 2; // 0 to 1
        
        const col = Math.floor(normalizedX * cols);
        const row = Math.floor(normalizedY * rows);
        
        // Clamp to valid range
        return {
            row: Math.max(0, Math.min(rows - 1, row)),
            col: Math.max(0, Math.min(cols - 1, col))
        };
    }
    
    showGazeRegionFeedback(region) {
        // Create or update gaze region indicator
        let indicator = document.getElementById('gaze-region-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'gaze-region-indicator';
            indicator.style.position = 'fixed';
            indicator.style.top = '10px';
            indicator.style.right = '10px';
            indicator.style.padding = '10px';
            indicator.style.background = 'rgba(0, 255, 0, 0.8)';
            indicator.style.color = 'white';
            indicator.style.borderRadius = '5px';
            indicator.style.fontSize = '14px';
            indicator.style.zIndex = '1000';
            indicator.style.transition = 'all 0.3s ease';
            document.body.appendChild(indicator);
        }
        
        indicator.textContent = `👁️ Gaze: ${region}`;
        indicator.style.opacity = '1';
        
        // Fade out after 2 seconds
        setTimeout(() => {
            indicator.style.opacity = '0.3';
        }, 2000);
    }
    
    showGazePlantInteraction(plant, cellX, cellY) {
        console.log(`👁️🌱 Gaze interaction with plant: ${plant.id} at cell (${cellX}, ${cellY})`);
        
        // Find the plant element in the garden grid
        const gardenGrid = document.getElementById('garden-grid');
        if (!gardenGrid) return;
        
        const cellIndex = cellY * this.garden.gridSize + cellX;
        const cellElement = gardenGrid.children[cellIndex];
        
        if (cellElement) {
            // Add glow effect to the plant
            cellElement.classList.add('gaze-targeted');
            
            // Create sparkle effect
            this.createSparkleEffect(cellElement);
            
            // Remove effect after delay
            setTimeout(() => {
                cellElement.classList.remove('gaze-targeted');
            }, 2000);
            
            // Show interaction popup
            this.showGazeInteractionPopup(plant, cellElement);
        }
    }
    
    highlightGazedCell(cellX, cellY) {
        // Remove previous highlights
        const previousHighlights = document.querySelectorAll('.gaze-highlight');
        previousHighlights.forEach(el => el.classList.remove('gaze-highlight'));
        
        // Add highlight to current cell
        const gardenGrid = document.getElementById('garden-grid');
        if (!gardenGrid) return;
        
        const cellIndex = cellY * this.garden.gridSize + cellX;
        const cellElement = gardenGrid.children[cellIndex];
        
        if (cellElement) {
            cellElement.classList.add('gaze-highlight');
        }
    }
    
    createSparkleEffect(element) {
        const sparkleCount = 5;
        const rect = element.getBoundingClientRect();
        
        for (let i = 0; i < sparkleCount; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'gaze-sparkle';
            sparkle.style.position = 'absolute';
            sparkle.style.left = (rect.left + Math.random() * rect.width) + 'px';
            sparkle.style.top = (rect.top + Math.random() * rect.height) + 'px';
            sparkle.style.width = '6px';
            sparkle.style.height = '6px';
            sparkle.style.background = '#ffff00';
            sparkle.style.borderRadius = '50%';
            sparkle.style.pointerEvents = 'none';
            sparkle.style.zIndex = '10000';
            sparkle.style.animation = 'sparkle 1s ease-out forwards';
            
            document.body.appendChild(sparkle);
            
            setTimeout(() => {
                if (sparkle.parentNode) {
                    sparkle.remove();
                }
            }, 1000);
        }
        
        // Add sparkle animation CSS if not already present
        if (!document.getElementById('sparkle-styles')) {
            const style = document.createElement('style');
            style.id = 'sparkle-styles';
            style.textContent = `
                @keyframes sparkle {
                    0% { transform: scale(0) rotate(0deg); opacity: 1; }
                    50% { transform: scale(1.5) rotate(180deg); opacity: 0.8; }
                    100% { transform: scale(0) rotate(360deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    showGazeInteractionPopup(plant, element) {
        // Create interaction popup
        const popup = document.createElement('div');
        popup.className = 'gaze-interaction-popup';
        popup.innerHTML = `
            <div>🌱 ${plant.type.charAt(0).toUpperCase() + plant.type.slice(1)}</div>
            <div>Growth: ${Math.round(plant.growthStage * 100)}%</div>
            <div>💧 +Gaze Bonus!</div>
        `;
        
        const rect = element.getBoundingClientRect();
        popup.style.position = 'absolute';
        popup.style.left = (rect.left + rect.width / 2) + 'px';
        popup.style.top = (rect.top - 50) + 'px';
        popup.style.transform = 'translateX(-50%)';
        popup.style.background = 'rgba(68, 255, 68, 0.9)';
        popup.style.color = 'white';
        popup.style.padding = '8px 12px';
        popup.style.borderRadius = '8px';
        popup.style.fontSize = '12px';
        popup.style.fontWeight = 'bold';
        popup.style.zIndex = '10001';
        popup.style.pointerEvents = 'none';
        popup.style.animation = 'popupFade 2s ease-out forwards';
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 2000);
        
        // Add popup animation CSS if not already present
        if (!document.getElementById('popup-styles')) {
            const style = document.createElement('style');
            style.id = 'popup-styles';
            style.textContent = `
                @keyframes popupFade {
                    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0px); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0px); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    updateGazeVisualization(gaze, region) {
        // Update gaze information in UI if present
        const gazeInfo = document.getElementById('gaze-info');
        if (gazeInfo) {
            const debugInfo = this.gazeDetector.getDebugInfo ? this.gazeDetector.getDebugInfo() : {};
            gazeInfo.innerHTML = `
                <h4>👁️ Gaze Detection</h4>
                <div>Status: ${this.gazeEnabled ? 'Active' : 'Disabled'}</div>
                <div>Region: ${region}</div>
                <div>Coordinates: (${gaze.x.toFixed(3)}, ${gaze.y.toFixed(3)})</div>
                <div>Interactions: ${this.gazeInteractions}</div>
                <div id="gaze-debug" style="font-size: 12px; margin-top: 5px; font-family: monospace;">
                    History: ${this.gazeDetector.gazeHistory ? this.gazeDetector.gazeHistory.length : 0} points
                </div>
            `;
        }
    }

    // === WIND DIRECTION SYSTEM - HEAD TRACKING ===
    
    handleHeadDirectionChange(newDirection, previousDirection, details) {
        if (this.gameState !== 'playing') return;
        
        console.log(`🧭 Head direction: ${previousDirection} → ${newDirection}`, details);
        
        // Update garden with player's head direction
        this.garden.updatePlayerDirection(newDirection);
        
        // Check if this completed a wind alignment (successful neck exercise)
        if (this.garden.windSystem && this.garden.windSystem.checkAlignment && this.garden.windSystem.checkAlignment()) {
            this.updateQuestProgress('wind_alignment', 1);
        }
        
        // Update UI indicator if present
        this.updateHeadDirectionUI(newDirection, details);
        
        // Track head direction changes for statistics
        if (!this.headDirectionStats) {
            this.headDirectionStats = {
                changes: 0,
                directions: { north: 0, south: 0, east: 0, west: 0, center: 0 }
            };
        }
        
        this.headDirectionStats.changes++;
        this.headDirectionStats.directions[newDirection]++;
    }
    
    updateHeadDirectionUI(direction, details) {
        // Update head direction indicator in UI if present
        const headDirectionInfo = document.getElementById('head-direction-info');
        if (headDirectionInfo) {
            const directionEmoji = {
                north: '⬆️', south: '⬇️', east: '➡️', west: '⬅️', center: '🎯'
            };
            
            headDirectionInfo.innerHTML = `
                <h4>🧭 Head Direction</h4>
                <div>Current: ${directionEmoji[direction]} ${direction.charAt(0).toUpperCase() + direction.slice(1)}</div>
                <div>Stability: ${details.stability ? '✅' : '⏳'}</div>
                <div>Confidence: ${(details.confidence * 100).toFixed(1)}%</div>
                <div>Wind Status: ${this.garden.windSystem.active ? 
                    (this.garden.windSystem.isAligned ? '✅ Aligned' : '⚠️ Misaligned') : 
                    '💤 No Wind'}</div>
            `;
        }
    }
    
    startWindSystem() {
        // Start the wind direction gameplay system
        console.log('🌪️ Attempting to start wind system...', {
            gameState: this.gameState,
            gazeEnabled: this.gazeEnabled,
            gazeInitialized: this.gazeDetector.isInitialized
        });
        
        if (this.gameState === 'playing' && this.gazeEnabled) {
            this.garden.windSystem.active = true;
            this.garden.startWindSystem();
            console.log('🌪️ Wind system activated for neck exercise gameplay');
        } else {
            console.warn('🌪️ Wind system not started - requirements not met');
        }
    }
    
    stopWindSystem() {
        this.garden.stopWindSystem();
        console.log('🌪️ Wind system deactivated');
    }

    toggleGazeCalibration() {
        if (!this.gazeEnabled || !this.gazeDetector.isInitialized) {
            console.warn('Gaze detection must be enabled first');
            return;
        }

        if (this.gazeDetector.calibrationData.isCalibrating) {
            this.gazeDetector.stopCalibration();
            console.log('✅ Gaze calibration completed');
        } else {
            this.gazeDetector.startCalibration();
            console.log('🎯 Gaze calibration started - look at center and keep still');
        }
    }

    // Camera Management Methods
    async initializeCameraSystem() {
        console.log('🔧 Initializing camera system...');
        await this.refreshCameras();
    }

    async refreshCameras() {
        try {
            console.log('🔄 Refreshing camera list...');
            this.updateCameraStatus('Testing camera access...');
            
            // First test if camera access is possible at all
            const cameraAvailable = await this.cameraUtils.testCameraAvailability();
            if (!cameraAvailable) {
                this.updateCameraStatus('Camera access denied or unavailable');
                return;
            }
            
            this.updateCameraStatus('Detecting cameras...');
            const devices = await this.cameraUtils.enumerateDevices();
            this.populateCameraSelect(devices);
            
            if (devices.length > 0) {
                this.updateCameraStatus(`Found ${devices.length} camera(s)`);
            } else {
                this.updateCameraStatus('No cameras found');
            }
            
        } catch (error) {
            console.error('❌ Error refreshing cameras:', error);
            this.updateCameraStatus('Error detecting cameras');
        }
    }
    
    toggleGazeDebug() {
        if (!this.gazeDebugPanel) {
            // Initialize debug panel if not already created
            this.gazeDebugPanel = new GazeDebugPanel(this.gazeDetector);
            window.gazeDebugPanel = this.gazeDebugPanel; // Global reference
        }
        
        this.gazeDebugPanel.toggle();
        console.log('🔍 Gaze debug panel toggled');
    }

    async runCameraDiagnostics() {
        const diagnosticsDiv = document.getElementById('camera-diagnostics');
        diagnosticsDiv.style.display = 'block';
        diagnosticsDiv.innerHTML = '🔬 Running diagnostics...';
        
        try {
            const diagnostics = await this.cameraUtils.runDiagnostics();
            
            let html = '<strong>Camera Diagnostics:</strong><br>';
            html += `🌐 Browser Support: ${diagnostics.browserSupport ? '✅' : '❌'}<br>`;
            html += `🔒 Secure Context: ${diagnostics.httpsSecure ? '✅' : '❌'}<br>`;
            html += `🎥 Permissions: ${diagnostics.permissions === 'granted' ? '✅ Granted' : '❌ ' + diagnostics.permissions}<br>`;
            html += `📷 Devices Found: ${diagnostics.devicesFound}<br>`;
            
            if (diagnostics.errors.length > 0) {
                html += '<br><strong>Errors:</strong><br>';
                diagnostics.errors.forEach(error => {
                    html += `❌ ${error}<br>`;
                });
                
                // Add troubleshooting suggestions
                html += '<br><strong>Troubleshooting:</strong><br>';
                if (!diagnostics.httpsSecure) {
                    html += '• Use HTTPS or localhost<br>';
                }
                if (diagnostics.permissions !== 'granted') {
                    html += '• Grant camera permissions<br>';
                    html += '• Check browser settings<br>';
                    html += '• Try refreshing the page<br>';
                }
                if (diagnostics.devicesFound === 0) {
                    html += '• Check camera is connected<br>';
                    html += '• Try different USB port<br>';
                    html += '• Restart browser<br>';
                }
            }
            
            diagnosticsDiv.innerHTML = html;
            
        } catch (error) {
            diagnosticsDiv.innerHTML = `❌ Diagnostics failed: ${error.message}`;
        }
    }

    populateCameraSelect(devices) {
        const select = document.getElementById('camera-select');
        
        // Clear existing options except default
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add camera options
        devices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            select.appendChild(option);
        });
        
        console.log(`📷 Populated ${devices.length} camera options`);
    }

    async switchCamera(deviceId) {
        if (this.gameState === 'playing') {
            console.log('🔄 Switching camera during gameplay...', deviceId);
            
            const video = document.getElementById('camera-feed');
            const success = await this.cameraUtils.startCamera(video, deviceId || null);
            
            if (success) {
                this.updateCameraStatus(`Active: ${this.cameraUtils.getCurrentDevice()?.label || 'Default camera'}`);
                
                // Restart gaze detection with new camera if enabled
                if (this.gazeEnabled && this.gazeDetector.isInitialized) {
                    const gazeCanvas = document.getElementById('gaze-canvas') || this.createGazeCanvas();
                    this.gazeDetector.setupCamera(video, gazeCanvas);
                }
            } else {
                this.updateCameraStatus('Failed to switch camera');
            }
        } else {
            console.log('💾 Camera selection saved for next session');
            this.updateCameraStatus('Camera selection saved');
        }
    }

    updateCameraStatus(status) {
        const statusElement = document.getElementById('camera-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    
    showElement(elementId) {
        document.getElementById(elementId).classList.remove('hidden');
    }
    
    hideElement(elementId) {
        document.getElementById(elementId).classList.add('hidden');
    }
    
    // Method to update quest progress
    updateQuestProgress(questType, amount = 1) {
        this.dailyQuests.forEach(quest => {
            if (quest.type === questType && !quest.completed) {
                if (questType === 'garden_health') {
                    // For garden health, set the current value directly
                    quest.current = amount;
                } else if (questType === 'plant_bloom' || questType === 'plant_growth') {
                    // For plant counts, set to current count from garden (not cumulative)
                    quest.current = amount;
                } else {
                    // For counting quests, increment the current value
                    quest.current = Math.min(quest.current + amount, quest.target);
                }
                
                if (quest.current >= quest.target) {
                    quest.completed = true;
                    console.log(`✅ Quest completed: ${quest.text}`);
                    // Add visual feedback for quest completion
                    this.showQuestCompletionNotification(quest);
                }
            }
        });
        this.updateQuestDisplay();
    }
    
    // Method to update quest display in UI
    updateQuestDisplay() {
        const questItems = document.querySelectorAll('.quest-item');
        questItems.forEach((item, index) => {
            if (index < this.dailyQuests.length) {
                const quest = this.dailyQuests[index];
                const progressText = item.querySelector('.quest-progress');
                const questElement = item;
                
                if (progressText) {
                    // Special display format for garden health quest
                    if (quest.type === 'garden_health') {
                        progressText.textContent = `${quest.current}%`;
                    } else {
                        progressText.textContent = `${quest.current}/${quest.target}`;
                    }
                }
                
                if (quest.completed) {
                    questElement.classList.add('completed');
                } else {
                    questElement.classList.remove('completed');
                }
            }
        });
    }
    
    // Show quest completion notification
    showQuestCompletionNotification(quest) {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #6B8F71 0%, #7A9B76 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${quest.icon}</span>
                <div>
                    <div style="font-weight: bold;">Quest Complete!</div>
                    <div style="font-size: 12px; opacity: 0.9;">${quest.text}</div>
                </div>
            </div>
        `;
        
        // Add animation keyframes if not already added
        if (!document.querySelector('#quest-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'quest-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Cleanup method
    destroy() {
        if (this.gameTimer) clearInterval(this.gameTimer);
        if (this.sessionTimer) clearTimeout(this.sessionTimer);
        if (this.lookAwayTimer) clearTimeout(this.lookAwayTimer);
        
        this.blinkDetector.destroy();
        this.garden.destroy();
    }
}

// Initialize game when page loads
let game;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Blink & Bloom game...');
    game = new BlinkBloomGame();
    
    // Add visibility change handler to pause game when tab is not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.gameState === 'playing') {
            game.pauseGame();
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (game) {
        game.destroy();
    }
});