/**
 * BlinkDetector - Real-time blink detection using MediaPipe Face Landmarker
 * Optimized for the Blink & Bloom game
 */

class BlinkDetector {
    constructor() {
        this.isInitialized = false;
        this.isDetecting = false;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        
        // MediaPipe Face Landmarker
        this.faceLandmarker = null;
        this.runningMode = "VIDEO";
        this.lastVideoTime = -1;
        this.drawingUtils = null;
        
        // Debug mode
        this.debugMode = true; // Enable debugging by default
        this.debugInfo = document.createElement('div');
        
        // Fallback mode for when MediaPipe fails
        this.fallbackMode = false;
        this.fallbackInterval = null;
        
        // Blink detection parameters using blend shapes
        this.eyeBlinkThreshold = 0.3; // Lowered threshold - MediaPipe is more sensitive
        this.blinkFrameThreshold = 2;
        this.consecutiveFrames = 0;
        this.isBlinking = false;
        this.lastBlinkTime = 0;
        this.blinkCooldown = 200; // Minimum ms between blinks
        
        // Callbacks
        this.onBlinkDetected = null;
        this.onFaceDetected = null;
        this.onError = null;
        
        // Debug tracking
        this.currentLandmarks = null;
        this.currentEAR = null;
        this.lastFaceDetected = false;
        
        // Performance optimization
        this.detectionActive = false;
        this.lastDebugUpdate = 0;
    }

    updateDebugInfo(message) {
        // Always update the new debug panel (not just in debug mode)
        const blinkDebugContent = document.getElementById('blink-debug-content');
        if (blinkDebugContent) {
            this.updateBlinkDebugPanel();
        }
        
        if (this.debugMode) {
            const debugElement = document.querySelector('#debug-info, .debug-info');
            if (debugElement) {
                debugElement.textContent = message;
            }
            
            // Also update our debug panel if it exists
            const debugContent = this.debugInfo?.querySelector('#debug-content');
            if (debugContent && typeof message === 'string') {
                debugContent.innerHTML = message;
            }
        }
        console.log(`🔍 BlinkDetector: ${message}`);
    }
    
    async initialize() {
        try {
            console.log('🔄 Initializing MediaPipe Face Landmarker...');
            this.updateDebugInfo('Loading MediaPipe models...');
            
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('MediaPipe initialization timeout (30s)')), 30000);
            });
            
            // Create initialization promise
            const initPromise = (async () => {
                // Import MediaPipe vision tasks
                console.log('📦 Importing MediaPipe vision tasks...');
                const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3');
                const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
                console.log('✅ MediaPipe vision tasks imported');
                
                // Create the FilesetResolver
                console.log('🔧 Creating FilesetResolver...');
                this.updateDebugInfo('Loading WASM files...');
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
                );
                console.log('✅ FilesetResolver created');
                
                // Create FaceLandmarker with blend shapes for blink detection
                console.log('🤖 Creating FaceLandmarker...');
                this.updateDebugInfo('Loading face landmarker model...');
                
                // Try GPU first, then CPU fallback
                try {
                    this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                        baseOptions: {
                            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                            delegate: 'GPU'
                        },
                        outputFaceBlendshapes: true,
                        runningMode: this.runningMode,
                        numFaces: 1
                    });
                    console.log('✅ FaceLandmarker created successfully with GPU');
                } catch (gpuError) {
                    console.warn('⚠️ GPU delegate failed, trying CPU fallback:', gpuError);
                    // Fallback to CPU if GPU fails
                    this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                        baseOptions: {
                            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                            delegate: 'CPU'
                        },
                        outputFaceBlendshapes: true,
                        runningMode: this.runningMode,
                        numFaces: 1
                    });
                    console.log('✅ FaceLandmarker created with CPU fallback');
                }
                
                // Store DrawingUtils for debugging
                this.DrawingUtils = DrawingUtils;
                
                return true;
            })();
            
            // Race between initialization and timeout
            await Promise.race([initPromise, timeoutPromise]);
            
            console.log('MediaPipe Face Landmarker loaded successfully');
            this.isInitialized = true;
            this.setupDebugUI();
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize MediaPipe:', error);
            
            // Show detailed error information
            let errorMessage = 'MediaPipe initialization failed: ';
            if (error.message.includes('Loading failed')) {
                errorMessage += 'Network error - check internet connection or try refreshing the page.';
            } else if (error.message.includes('not supported')) {
                errorMessage += 'Your browser may not support WebGL or WebAssembly.';
            } else {
                errorMessage += error.message;
            }
            
            this.updateDebugInfo(`Error: ${errorMessage}`);
            
            console.log('🔄 Falling back to demo mode with simulated blinks...');
            
            // Enable fallback mode for testing
            this.fallbackMode = true;
            this.isInitialized = true;
            
            if (this.onError) {
                this.onError(errorMessage + ' Running in demo mode - click the camera area to simulate blinks!');
            }
            
            return true; // Still return true so game can start in demo mode
        }
    }
    
    async startCamera() {
        try {
            // Get video element
            this.video = document.getElementById('camera-feed');
            this.canvas = document.getElementById('detection-canvas');
            this.ctx = this.canvas.getContext('2d');
            
            if (this.fallbackMode) {
                return this.setupFallbackMode();
            }
            
            // Diagnose camera issues first
            const issues = await CameraUtils.diagnoseCameraIssues();
            if (issues.length > 0) {
                console.warn('Camera issues detected:', issues);
            }
            
            // Use improved camera request with fallback
            console.log('Requesting camera access with fallback...');
            const stream = await CameraUtils.requestCameraWithFallback();
            
            this.video.srcObject = stream;
            console.log('Camera stream assigned to video element');
            
            // Wait for video to be ready with timeout
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video metadata loading timeout'));
                }, 5000); // 5 second timeout for metadata
                
                this.video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    console.log('Video metadata loaded:', this.video.videoWidth, 'x', this.video.videoHeight);
                    
                    // Force canvas to exact 320x240 dimensions to match video CSS display size
                    const targetWidth = 320;
                    const targetHeight = 240;
                    
                    this.canvas.width = targetWidth;
                    this.canvas.height = targetHeight;
                    
                    // Also set CSS size to ensure proper overlay alignment
                    this.canvas.style.width = targetWidth + 'px';
                    this.canvas.style.height = targetHeight + 'px';
                    
                    console.log('Canvas synced to display size:', {
                        canvasSize: { width: this.canvas.width, height: this.canvas.height },
                        targetSize: { width: targetWidth, height: targetHeight },
                        videoNativeSize: { width: this.video.videoWidth, height: this.video.videoHeight }
                    });
                    
                    // Initialize drawing utils for debugging
                    if (this.DrawingUtils && this.debugMode) {
                        this.drawingUtils = new this.DrawingUtils(this.ctx);
                    }
                    
                    console.log('Camera initialization successful');
                    resolve(true);
                };
                
                // Also handle potential errors
                this.video.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(new Error('Video element error: ' + error.message));
                };
            });
        } catch (error) {
            console.error('Camera access failed:', error);
            
            // Show detailed error information
            const issues = await CameraUtils.diagnoseCameraIssues();
            const cameraContainer = document.getElementById('camera-container');
            CameraUtils.showCameraError(cameraContainer, error.message, issues);
            
            // Fall back to demo mode
            console.log('Switching to demo/fallback mode...');
            this.fallbackMode = true;
            return this.setupFallbackMode();
        }
    }
    
    setupFallbackMode() {
        // In fallback mode, show a placeholder and add click listener
        this.video.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        this.video.style.display = 'flex';
        this.video.style.alignItems = 'center';
        this.video.style.justifyContent = 'center';
        this.video.innerHTML = '<div style="text-align: center; color: white; font-weight: bold; padding: 20px;">📷 Demo Mode<br><br>👁️ Click to Simulate Blinks!<br><br><small>Camera not available</small></div>';
        this.video.style.cursor = 'pointer';
        
        // Add click listener for simulated blinks
        this.video.addEventListener('click', () => {
            this.simulateBlink();
        });
        
        // Set canvas dimensions
        this.canvas.width = 320;
        this.canvas.height = 240;
        
        return true;
    }
    
    setupCamera(videoElement, canvasElement) {
        console.log('🔧 BlinkDetector.setupCamera called with:', {
            video: videoElement ? 'present' : 'null',
            canvas: canvasElement ? 'present' : 'null',
            videoId: videoElement?.id,
            canvasId: canvasElement?.id,
            videoSrc: videoElement?.srcObject ? 'has stream' : 'no stream',
            videoWidth: videoElement?.videoWidth,
            videoHeight: videoElement?.videoHeight
        });
        
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        console.log('🔧 BlinkDetector camera setup completed:', {
            hasVideo: !!this.video,
            hasCanvas: !!this.canvas,
            hasCtx: !!this.ctx
        });
        
        // Wait for video to load and then sync canvas size
        const syncCanvasSize = () => {
            if (videoElement.videoWidth && videoElement.videoHeight) {
                // Force canvas to exact 320x240 dimensions to match video CSS display size
                const targetWidth = 320;
                const targetHeight = 240;
                
                this.canvas.width = targetWidth;
                this.canvas.height = targetHeight;
                
                // Also set CSS size to ensure proper overlay alignment
                this.canvas.style.width = targetWidth + 'px';
                this.canvas.style.height = targetHeight + 'px';
                
                console.log('📺 Blink Canvas synced to video size:', {
                    canvasSize: { width: this.canvas.width, height: this.canvas.height },
                    targetSize: { width: targetWidth, height: targetHeight },
                    videoNativeSize: { width: videoElement.videoWidth, height: videoElement.videoHeight }
                });
                
                // Initialize drawing utils for debugging
                if (this.DrawingUtils && this.debugMode) {
                    this.drawingUtils = new this.DrawingUtils(this.ctx);
                }
            }
        };
        
        // Sync size immediately and on resize
        syncCanvasSize();
        videoElement.addEventListener('loadedmetadata', syncCanvasSize);
        window.addEventListener('resize', syncCanvasSize);
    }
    
    startDetection() {
        console.log('🚀 BlinkDetector.startDetection called:', {
            isInitialized: this.isInitialized,
            detectionActive: this.detectionActive,
            hasVideo: !!this.video,
            hasCanvas: !!this.canvas
        });
        
        if (!this.isInitialized || this.detectionActive) return;
        
        // Check if camera is set up
        if (!this.video || !this.canvas) {
            console.error('❌ BlinkDetector: Camera not set up. Call setupCamera() first.');
            console.trace('Stack trace for startDetection call:');
            return;
        }
        
        this.detectionActive = true;
        
        // Update debug UI to show detection is active
        if (this.debugMode && this.debugInfo) {
            const debugContent = this.debugInfo.querySelector('#debug-content');
            if (debugContent) {
                if (this.fallbackMode) {
                    debugContent.innerHTML = '🎮 Demo Mode Active<br>Click camera to simulate blinks!';
                } else {
                    debugContent.innerHTML = '✅ Detection Active<br>Looking for faces...';
                }
            }
        }
        
        if (this.fallbackMode) {
            this.startFallbackDetection();
        } else {
            this.detectBlinks();
        }
    }
    
    startFallbackDetection() {
        // In fallback mode, simulate occasional random blinks for demo
        // But mainly rely on user clicks
        console.log('Starting fallback detection mode...');
        
        // Notify that "face" is always detected in demo mode
        if (this.onFaceDetected) {
            this.onFaceDetected(true, 0.3); // Simulate normal eye aspect ratio
        }
        
        // Optional: Add very occasional auto-blinks for demo
        this.fallbackInterval = setInterval(() => {
            if (Math.random() < 0.05) { // 5% chance every 2 seconds
                this.simulateBlink();
            }
        }, 2000);
    }
    
    setupDebugUI() {
        if (!this.debugMode) return;
        
        // Create debug info panel
        this.debugInfo.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 12px;
            max-width: 300px;
            z-index: 1000;
            max-height: 400px;
            overflow-y: auto;
        `;
        // Debug panel now integrated into game UI - no need for separate overlay
        this.debugInfo.innerHTML = '<div id="debug-content">✅ Initialized - Ready to detect</div>';
        // Don't append to body - use integrated panel instead
    }
    
    updateDetectionDebugInfo(results) {
        if (!this.debugMode || !this.debugInfo) return;
        
        const debugContent = this.debugInfo.querySelector('#debug-content');
        if (!debugContent) return;
        
        let info = '';
        
        if (results.error) {
            info = `❌ Detection Error: ${results.error}`;
        } else if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const blendShapes = results.faceBlendshapes[0].categories;
            
            // Find eye-related blend shapes
            const eyeShapes = blendShapes.filter(shape => 
                shape.categoryName.includes('eye') || 
                shape.categoryName.includes('blink')
            );
            
            info += '<strong>👁️ Eye Blend Shapes:</strong><br>';
            eyeShapes.forEach(shape => {
                const intensity = (shape.score * 100).toFixed(1);
                const bar = '█'.repeat(Math.floor(shape.score * 10));
                info += `${shape.categoryName}: ${intensity}% ${bar}<br>`;
            });
            
            // Show key blink detection values
            const leftBlink = blendShapes.find(s => s.categoryName === 'eyeBlinkLeft')?.score || 0;
            const rightBlink = blendShapes.find(s => s.categoryName === 'eyeBlinkRight')?.score || 0;
            const avgBlink = (leftBlink + rightBlink) / 2;
            
            info += '<br><strong>🎯 Detection Status:</strong><br>';
            info += `Left Blink: ${(leftBlink * 100).toFixed(1)}%<br>`;
            info += `Right Blink: ${(rightBlink * 100).toFixed(1)}%<br>`;
            info += `Average: ${(avgBlink * 100).toFixed(1)}%<br>`;
            info += `Threshold: ${(this.eyeBlinkThreshold * 100).toFixed(1)}%<br>`;
            info += `Status: ${avgBlink > this.eyeBlinkThreshold ? '👁️ BLINKING' : '👀 OPEN'}<br>`;
            info += `Frames: ${this.consecutiveFrames}/${this.blinkFrameThreshold}<br>`;
            
        } else {
            info = '❌ No face detected';
        }
        
        debugContent.innerHTML = info;
    }
    
    simulateBlink() {
        const currentTime = Date.now();
        
        // Check cooldown to prevent spam clicking
        if (currentTime - this.lastBlinkTime < this.blinkCooldown) {
            console.log('🚫 Simulated blink blocked by cooldown');
            return;
        }
        
        console.log('🎯 Simulated blink detected! About to call callback...');
        console.log('🔍 Callback details:', {
            hasCallback: !!this.onBlinkDetected,
            callbackType: typeof this.onBlinkDetected
        });
        
        this.lastBlinkTime = currentTime;
        
        if (this.onBlinkDetected) {
            console.log('📞 Calling onBlinkDetected callback...');
            this.onBlinkDetected();
            console.log('✅ onBlinkDetected callback completed');
        } else {
            console.log('❌ No onBlinkDetected callback set!');
        }
        
        // Visual feedback
        this.showBlinkIndicator();
    }
    
    stopDetection() {
        this.detectionActive = false;
        if (this.detectionInterval) {
            clearTimeout(this.detectionInterval);
        }
        if (this.fallbackInterval) {
            clearInterval(this.fallbackInterval);
        }
        
        // Clear the detection canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            console.log('🧹 Cleared blink detection canvas');
        }
    }
    
    async detectBlinks() {
        if (!this.detectionActive || !this.video || this.video.paused) {
            // Schedule next detection even if conditions aren't met
            if (this.detectionActive) {
                requestAnimationFrame(() => this.detectBlinks());
            }
            return;
        }
        
        // Skip real detection in fallback mode
        if (this.fallbackMode) {
            if (this.detectionActive) {
                requestAnimationFrame(() => this.detectBlinks());
            }
            return;
        }
        
        try {
            const startTimeMs = performance.now();
            
            // Detect face landmarks and blend shapes every frame
            const results = this.faceLandmarker.detectForVideo(this.video, startTimeMs);
            
            // Debug logging every 30 frames (about once per second)
            if (Math.random() < 0.03) {
                console.log('🔍 BlinkDetector Detection Results:', {
                    faceLandmarks: results.faceLandmarks?.length || 0,
                    faceBlendshapes: results.faceBlendshapes?.length || 0,
                    videoTime: startTimeMs,
                    videoPlaying: !this.video.paused,
                    videoDimensions: { width: this.video.videoWidth, height: this.video.videoHeight },
                    canvasDimensions: { width: this.canvas.width, height: this.canvas.height }
                });
            }
            
            // Clear canvas for new frame
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                // Store current landmarks for debug info
                this.currentLandmarks = results.faceLandmarks[0];
                
                // Draw face landmarks if in debug mode
                if (this.debugMode && this.drawingUtils) {
                    this.drawFaceMesh(results.faceLandmarks[0]);
                }
                
                // Process blend shapes if available
                if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                    const blendShapes = results.faceBlendshapes[0].categories;
                    
                    // Find eye blink blend shapes
                    const leftEyeBlink = blendShapes.find(shape => 
                        shape.categoryName === 'eyeBlinkLeft')?.score || 0;
                    const rightEyeBlink = blendShapes.find(shape => 
                        shape.categoryName === 'eyeBlinkRight')?.score || 0;
                    
                    // Average blink intensity
                    const avgBlinkIntensity = (leftEyeBlink + rightEyeBlink) / 2;
                    
                    // Debug logging every 30 frames (about once per second)
                    if (Math.random() < 0.03) {
                        console.log(`Detection running - Left: ${(leftEyeBlink*100).toFixed(1)}%, Right: ${(rightEyeBlink*100).toFixed(1)}%, Avg: ${(avgBlinkIntensity*100).toFixed(1)}%, Threshold: ${(this.eyeBlinkThreshold*100).toFixed(1)}%`);
                    }
                    
                    // Process blink using blend shape intensity
                    this.processBlinkWithBlendShapes(avgBlinkIntensity);
                    
                    // Store for debug info
                    this.lastFaceDetected = true;
                    this.currentEAR = avgBlinkIntensity; // Using blend shape intensity as EAR equivalent
                    
                    // Notify that face is detected
                    if (this.onFaceDetected) {
                        this.onFaceDetected(true, avgBlinkIntensity);
                    }
                }
                
                // Update debug info with current results
                this.updateDetectionDebugInfo(results);
                this.updateBlinkDebugPanel();
            } else {
                // No face detected
                this.lastFaceDetected = false;
                this.currentEAR = null;
                this.currentLandmarks = null;
                
                this.updateDetectionDebugInfo({ faceBlendshapes: [], faceLandmarks: [] });
                this.updateBlinkDebugPanel();
                if (this.onFaceDetected) {
                    this.onFaceDetected(false, 0);
                }
            }
        } catch (error) {
            console.error('Detection error:', error);
            // Update debug with error info
            this.updateDetectionDebugInfo({ error: error.message });
        }
        
        // Continue detection loop
        if (this.detectionActive) {
            requestAnimationFrame(() => this.detectBlinks());
        }
    }
    
    drawFaceMesh(landmarks) {
        if (!this.drawingUtils || !landmarks) return;
        
        // Import face landmark connections from MediaPipe
        // For now, let's just draw the eye landmarks
        this.drawEyeLandmarks(landmarks);
    }
    
    drawEyeLandmarks(landmarks) {
        if (!this.drawingUtils || !landmarks) return;
        
        // MediaPipe face landmark indices for eyes
        // Left eye: indices 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
        // Right eye: indices 362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398
        
        const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
        const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
        
        // Draw left eye (green)
        this.ctx.strokeStyle = '#30FF30';
        this.ctx.lineWidth = 2;
        this.drawEyeContour(landmarks, leftEyeIndices);
        
        // Draw right eye (red)
        this.ctx.strokeStyle = '#FF3030';
        this.ctx.lineWidth = 2;
        this.drawEyeContour(landmarks, rightEyeIndices);
        
        // Draw eye centers
        this.ctx.fillStyle = '#FFD700';
        const leftCenter = this.getEyeCenter(landmarks, leftEyeIndices);
        const rightCenter = this.getEyeCenter(landmarks, rightEyeIndices);
        
        this.ctx.beginPath();
        this.ctx.arc(leftCenter.x * this.canvas.width, leftCenter.y * this.canvas.height, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(rightCenter.x * this.canvas.width, rightCenter.y * this.canvas.height, 3, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawEyeContour(landmarks, eyeIndices) {
        if (eyeIndices.length === 0) return;
        
        this.ctx.beginPath();
        const firstPoint = landmarks[eyeIndices[0]];
        this.ctx.moveTo(firstPoint.x * this.canvas.width, firstPoint.y * this.canvas.height);
        
        for (let i = 1; i < eyeIndices.length; i++) {
            const point = landmarks[eyeIndices[i]];
            this.ctx.lineTo(point.x * this.canvas.width, point.y * this.canvas.height);
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    getEyeCenter(landmarks, eyeIndices) {
        let avgX = 0, avgY = 0;
        for (const index of eyeIndices) {
            avgX += landmarks[index].x;
            avgY += landmarks[index].y;
        }
        return { x: avgX / eyeIndices.length, y: avgY / eyeIndices.length };
    }
    
    // Calibration method to adjust sensitivity
    calibrateBlinkThreshold(newThreshold) {
        this.eyeBlinkThreshold = newThreshold;
        console.log(`Blink threshold calibrated to: ${newThreshold}`);
    }
    
    processBlinkWithBlendShapes(blinkIntensity) {
        const currentTime = Date.now();
        
        // Check if eyes are closed (blend shape intensity above threshold)
        if (blinkIntensity > this.eyeBlinkThreshold) {
            this.consecutiveFrames++;
        } else {
            // Eyes are open
            if (this.consecutiveFrames >= this.blinkFrameThreshold && !this.isBlinking) {
                // Blink detected - check cooldown to avoid double counting
                if (currentTime - this.lastBlinkTime > this.blinkCooldown) {
                    this.isBlinking = true;
                    this.lastBlinkTime = currentTime;
                    
                    console.log(`Blink detected! Intensity: ${blinkIntensity.toFixed(3)}`);
                    console.log('🔍 About to call onBlinkDetected callback:', {
                        hasCallback: !!this.onBlinkDetected,
                        callbackType: typeof this.onBlinkDetected
                    });
                    
                    if (this.onBlinkDetected) {
                        console.log('📞 Calling onBlinkDetected callback...');
                        this.onBlinkDetected();
                        console.log('✅ onBlinkDetected callback completed');
                    } else {
                        console.log('❌ No onBlinkDetected callback set!');
                    }
                    
                    // Visual feedback
                    this.showBlinkIndicator();
                }
            }
            
            this.consecutiveFrames = 0;
            this.isBlinking = false;
        }
    }
    
    // Legacy method for compatibility (not used with MediaPipe)
    processBlink(eyeAspectRatio) {
        // This method is kept for fallback compatibility
        this.processBlinkWithBlendShapes(eyeAspectRatio > 0.3 ? 0 : 1);
    }
    
    showBlinkIndicator() {
        const indicator = document.getElementById('blink-indicator');
        indicator.style.opacity = '1';
        indicator.style.transform = 'scale(1.2)';
        
        setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transform = 'scale(0.5)';
        }, 300);
    }
    

    
    // Get current detection stats
    getStats() {
        return {
            isInitialized: this.isInitialized,
            isDetecting: this.detectionActive,
            threshold: this.eyeBlinkThreshold,
            lastBlinkTime: this.lastBlinkTime,
            fallbackMode: this.fallbackMode
        };
    }
    
    updateBlinkDebugPanel() {
        const blinkDebugContent = document.getElementById('blink-debug-content');
        if (!blinkDebugContent) return;
        
        const status = this.isDetecting ? 'Active' : 
                      this.isInitialized ? 'Ready' : 'Initializing...';
        
        const statusClass = this.isDetecting ? 'debug-success' : 
                           this.isInitialized ? 'debug-status' : 'debug-error';
        
        // Add face mesh alignment debugging
        let faceMeshInfo = '';
        if (this.currentLandmarks && this.video) {
            const leftEye = this.currentLandmarks[33]; // Right eye right corner
            const rightEye = this.currentLandmarks[263]; // Left eye left corner
            const nose = this.currentLandmarks[1]; // Nose tip
            
            if (leftEye && rightEye && nose) {
                faceMeshInfo = `
                    <div>👁️ Left Eye: (${(leftEye.x * this.video.videoWidth).toFixed(0)}, ${(leftEye.y * this.video.videoHeight).toFixed(0)})</div>
                    <div>👁️ Right Eye: (${(rightEye.x * this.video.videoWidth).toFixed(0)}, ${(rightEye.y * this.video.videoHeight).toFixed(0)})</div>
                    <div>👃 Nose: (${(nose.x * this.video.videoWidth).toFixed(0)}, ${(nose.y * this.video.videoHeight).toFixed(0)})</div>
                `;
            }
        }
        
        blinkDebugContent.innerHTML = `
            <div class="${statusClass}">Status: ${status}</div>
            <div>Mode: ${this.runningMode}</div>
            <div>EAR: ${this.currentEAR ? this.currentEAR.toFixed(3) : 'N/A'}</div>
            <div>Threshold: ${this.blinkThreshold}</div>
            <div>Face Detected: ${this.lastFaceDetected ? '✅' : '❌'}</div>
            <div>Video: ${this.video ? `${this.video.videoWidth}x${this.video.videoHeight}` : 'None'}</div>
            ${faceMeshInfo}
        `;
        
        // console.log('🔍 Face Mesh Debug - Current landmarks:', {
        //     leftEye: this.currentLandmarks ? this.currentLandmarks[33] : null,
        //     rightEye: this.currentLandmarks ? this.currentLandmarks[263] : null,
        //     nose: this.currentLandmarks ? this.currentLandmarks[1] : null,
        //     videoSize: this.video ? { w: this.video.videoWidth, h: this.video.videoHeight } : null
        // });
    }
    
    // Cleanup
    destroy() {
        this.stopDetection();
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}

// Export for use in other modules
window.BlinkDetector = BlinkDetector;