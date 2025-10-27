/**
 * GazeDetector - Web-based gaze estimation using MediaPipe Face Landmarker
 * Based on the principles from the eye gaze estimation article
 * Adapted for web implementation using JavaScript and MediaPipe
 */

class GazeDetector {
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
        
        // 3D model points for head pose estimation (from the article)
        this.modelPoints = [
            [0.0, 0.0, 0.0],         // Nose tip
            [0, -63.6, -12.5],       // Chin
            [-43.3, 32.7, -26],      // Left eye left corner
            [43.3, 32.7, -26],       // Right eye right corner
            [-28.9, -28.9, -24.1],   // Left Mouth corner
            [28.9, -28.9, -24.1]     // Right mouth corner
        ];
        
        // Eye ball center points (from the article)
        this.eyeBallCenterRight = [-29.05, 32.7, -39.5];
        this.eyeBallCenterLeft = [29.05, 32.7, -39.5];
        
        // Camera matrix parameters
        this.focalLength = 0;
        this.cameraCenter = [0, 0];
        this.cameraMatrix = null;
        
        // Gaze tracking variables
        this.currentGaze = { x: 0, y: 0 };
        this.gazeHistory = [];
        this.maxHistoryLength = 10;
        
        // Sensitivity settings (user-adjustable)
        this.sensitivity = {
            horizontal: 0.5,   // How sensitive horizontal gaze movement is (higher = more responsive)
            vertical: 0.5,     // How sensitive vertical gaze movement is (higher = more responsive)
            smoothing: 0.3,    // Smoothing factor (0 = no smoothing, 1 = max smoothing)
            confidence: 0.5    // Minimum confidence threshold for gaze detection
        };
        
        // Calibration and thresholds
        this.gazeThresholds = {
            x: 0.02,  // Much smaller threshold for horizontal movement
            y: 0.02   // Much smaller threshold for vertical movement
        };
        this.calibrationData = {
            center: { x: 0, y: 0 },
            samples: [],
            isCalibrating: false,
            minSamples: 30
        };
        this.adaptiveThresholds = true;
        
        // Debug and visualization
        this.debugMode = true;
        this.showGazeLine = true;
        
        // Callbacks
        this.onGazeDetected = null;
        this.onHeadPoseChanged = null;
        this.onHeadDirectionChanged = null; // New callback for wind direction gameplay
        this.onError = null;
        
        // Head direction tracking for wind gameplay
        this.currentHeadDirection = 'center';
        this.headDirectionHistory = [];
        this.headDirectionStable = false;
        this.directionChangeThreshold = 3; // Frames before direction change is confirmed
        
        // MediaPipe landmark indices (key facial landmarks)
        this.landmarkIndices = {
            noseTip: 4,
            chin: 152,
            leftEyeLeftCorner: 263,
            rightEyeRightCorner: 33,
            leftMouthCorner: 287,
            rightMouthCorner: 57,
            leftEyeCenter: 468, // Iris landmarks when available
            rightEyeCenter: 473,
            leftPupil: 468,
            rightPupil: 473
        };
        
        // Initialize screen calibration
        this.initializeScreenCalibration();
    }
    
    async initialize() {
        try {
            console.log('Initializing GazeDetector with MediaPipe...');
            
            // Import MediaPipe vision tasks
            const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3');
            const { FaceLandmarker, FilesetResolver } = vision;
            
            // Create the FilesetResolver
            const filesetResolver = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
            );
            
            // Create FaceLandmarker with iris landmarks for better gaze detection
            this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                    delegate: 'GPU'
                },
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: true,
                runningMode: this.runningMode,
                numFaces: 1
            });
            
            this.isInitialized = true;
            console.log('GazeDetector initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize GazeDetector:', error);
            if (this.onError) {
                this.onError('Failed to initialize gaze detection: ' + error.message);
            }
            return false;
        }
    }
    
    setupCamera(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // Wait for video to load and then sync canvas size
        const syncCanvasSize = () => {
            if (videoElement.videoWidth && videoElement.videoHeight) {
                // Get video display size from CSS
                const videoRect = videoElement.getBoundingClientRect();
                const displayWidth = videoRect.width;
                const displayHeight = videoRect.height;
                
                // Set canvas size to match video display size exactly
                canvasElement.width = displayWidth;
                canvasElement.height = displayHeight;
                
                // Set canvas size and positioning to match video exactly (like blink detection does)
                canvasElement.width = displayWidth;
                canvasElement.height = displayHeight;
                
                // Calculate the correct positioning relative to the container
                const container = videoElement.parentElement;
                const containerRect = container.getBoundingClientRect();
                const videoOffsetX = videoRect.x - containerRect.x;
                const videoOffsetY = videoRect.y - containerRect.y;
                
                // Position canvas to overlay video perfectly (accounting for border)
                canvasElement.style.cssText = `
                    position: absolute;
                    top: ${videoOffsetY + 3}px;
                    left: ${videoOffsetX + 3}px;
                    width: ${displayWidth}px;
                    height: ${displayHeight}px;
                    pointer-events: none;
                    z-index: 15;
                    border-radius: 15px;
                `;

                
                // Calculate scaling factors for coordinate transformation
                this.videoScaleX = displayWidth / videoElement.videoWidth;
                this.videoScaleY = displayHeight / videoElement.videoHeight;
                
                console.log('📺 Canvas synced to video display:', {
                    canvasSize: { width: canvasElement.width, height: canvasElement.height },
                    videoDisplaySize: { width: displayWidth, height: displayHeight },
                    videoNativeSize: { width: videoElement.videoWidth, height: videoElement.videoHeight },
                    scaleFactors: { x: this.videoScaleX, y: this.videoScaleY },
                    videoRect: videoRect
                });
                
                // Initialize camera matrix based on canvas dimensions
                this.focalLength = this.canvas.width;
                this.cameraCenter = [this.canvas.width / 2, this.canvas.height / 2];
                this.cameraMatrix = [
                    [this.focalLength, 0, this.cameraCenter[0]],
                    [0, this.focalLength, this.cameraCenter[1]],
                    [0, 0, 1]
                ];
            }
        };
        
        // Sync size immediately and on resize
        syncCanvasSize();
        videoElement.addEventListener('loadedmetadata', syncCanvasSize);
        window.addEventListener('resize', syncCanvasSize);
        
        // Also sync when video size changes (e.g., camera switch)
        videoElement.addEventListener('loadeddata', syncCanvasSize);
    }
    
    startDetection() {
        if (!this.isInitialized || !this.video) {
            console.error('GazeDetector not properly initialized');
            return false;
        }
        
        this.isDetecting = true;
        this.detectGaze();
        return true;
    }
    
    stopDetection() {
        this.isDetecting = false;
        
        // Clear the canvas when stopping
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            console.log('🧹 Cleared gaze detection canvas');
        }
    }
    
    async detectGaze() {
        if (!this.isDetecting) return;
        
        try {
            const videoTime = performance.now();
            
            // Only process if we have a new frame
            if (videoTime !== this.lastVideoTime) {
                this.lastVideoTime = videoTime;
                
                // Detect face landmarks
                const results = this.faceLandmarker.detectForVideo(this.video, videoTime);
                
                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    const landmarks = results.faceLandmarks[0];
                    await this.processGaze(landmarks);
                }
                
                // Draw debug information if enabled
                if (this.debugMode) {
                    this.drawDebugInfo(results);
                }
            }
            
        } catch (error) {
            console.error('Error during gaze detection:', error);
        }
        
        // Continue detection
        if (this.isDetecting) {
            requestAnimationFrame(() => this.detectGaze());
        }
    }
    
    async processGaze(landmarks) {
        try {
            // Store current landmarks for use in calculations
            this.currentLandmarks = landmarks;
            
            // Convert normalized landmarks to pixel coordinates
            const imagePoints = this.getImagePoints(landmarks);
            
            // Estimate head pose using PnP-like approach (simplified for web)
            const headPose = this.estimateHeadPose(imagePoints);
            
            // Track head direction for wind gameplay
            this.updateHeadDirection(headPose.direction);
            
            // Get pupil positions (using iris landmarks if available)
            const leftPupil = this.getPupilPosition(landmarks, 'left');
            const rightPupil = this.getPupilPosition(landmarks, 'right');
            
            if (leftPupil && rightPupil) {
                // Calculate gaze direction for both eyes
                const leftGaze = this.calculateGazeDirection(leftPupil, 'left', headPose);
                const rightGaze = this.calculateGazeDirection(rightPupil, 'right', headPose);
                
                // Average the gaze directions
                const averageGaze = {
                    x: (leftGaze.x + rightGaze.x) / 2,
                    y: (leftGaze.y + rightGaze.y) / 2
                };
                
                // Update gaze history for smoothing
                this.updateGazeHistory(averageGaze);
                
                // Get smoothed gaze
                const smoothedGaze = this.getSmoothedGaze();
                this.currentGaze = smoothedGaze;
                
                // Add to calibration if calibrating
                this.addCalibrationSample(smoothedGaze);
                
                // Trigger callback
                if (this.onGazeDetected) {
                    this.onGazeDetected(smoothedGaze, {
                        leftGaze,
                        rightGaze,
                        headPose,
                        confidence: this.calculateGazeConfidence(leftPupil, rightPupil),
                        debugInfo: this.getDebugInfo()
                    });
                }
            }
            
        } catch (error) {
            console.error('Error processing gaze:', error);
        }
    }
    
    getImagePoints(landmarks) {
        const imagePoints = [];
        const indices = [
            this.landmarkIndices.noseTip,
            this.landmarkIndices.chin,
            this.landmarkIndices.leftEyeLeftCorner,
            this.landmarkIndices.rightEyeRightCorner,
            this.landmarkIndices.leftMouthCorner,
            this.landmarkIndices.rightMouthCorner
        ];
        
        indices.forEach(index => {
            const landmark = landmarks[index];
            imagePoints.push([
                landmark.x * this.canvas.width,
                landmark.y * this.canvas.height
            ]);
        });
        
        return imagePoints;
    }
    
    estimateHeadPose(imagePoints) {
        // Enhanced head pose estimation for wind direction gameplay
        const noseTip = imagePoints[0];
        const chin = imagePoints[1];
        const leftEyeCorner = imagePoints[2];
        const rightEyeCorner = imagePoints[3];
        const leftMouthCorner = imagePoints[4];
        const rightMouthCorner = imagePoints[5];
        
        // Calculate head tilt for cardinal directions
        const faceWidth = Math.abs(rightEyeCorner[0] - leftEyeCorner[0]);
        const faceHeight = Math.abs(noseTip[1] - chin[1]);
        
        // Horizontal tilt (east/west) - based on eye level asymmetry
        const eyeLevelDiff = (rightEyeCorner[1] - leftEyeCorner[1]) / faceWidth;
        
        // Vertical tilt (north/south) - based on nose-chin distance and head position
        const headVerticalPosition = (noseTip[1] - this.cameraCenter[1]) / this.canvas.height;
        
        // Calculate basic head orientation
        const headVector = [
            noseTip[0] - chin[0],
            noseTip[1] - chin[1]
        ];
        const angle = Math.atan2(headVector[1], headVector[0]);
        
        return {
            pitch: headVerticalPosition, // Negative = looking up (north), Positive = looking down (south)
            yaw: angle,
            roll: eyeLevelDiff, // Negative = tilted left (west), Positive = tilted right (east)
            translation: [noseTip[0] - this.cameraCenter[0], noseTip[1] - this.cameraCenter[1]],
            // Wind direction detection
            direction: this.calculateWindDirection(eyeLevelDiff, headVerticalPosition)
        };
    }
    
    calculateWindDirection(rollTilt, pitchTilt) {
        // Thresholds for direction detection (adjust based on testing)
        const rollThreshold = 0.015; // Sensitivity for left/right head tilt
        const pitchThreshold = 0.1;   // Sensitivity for up/down head position
        
        // Prioritize the more pronounced movement
        if (Math.abs(rollTilt) > Math.abs(pitchTilt)) {
            if (rollTilt > rollThreshold) return 'east';
            if (rollTilt < -rollThreshold) return 'west';
        } else {
            if (pitchTilt < -pitchThreshold) return 'north'; // Looking up
            if (pitchTilt > pitchThreshold) return 'south';  // Looking down
        }
        
        return 'center'; // Neutral position
    }
    
    updateHeadDirection(newDirection) {
        // Add to history for stability checking
        this.headDirectionHistory.push(newDirection);
        if (this.headDirectionHistory.length > this.directionChangeThreshold * 2) {
            this.headDirectionHistory.shift();
        }
        
        // Check if direction has been stable for enough frames
        const recentFrames = this.headDirectionHistory.slice(-this.directionChangeThreshold);
        const isStable = recentFrames.length >= this.directionChangeThreshold && 
                        recentFrames.every(dir => dir === newDirection);
        
        // Update current direction if stable and different
        if (isStable && this.currentHeadDirection !== newDirection) {
            const previousDirection = this.currentHeadDirection;
            this.currentHeadDirection = newDirection;
            this.headDirectionStable = true;
            
            // Trigger callback for wind gameplay
            if (this.onHeadDirectionChanged) {
                this.onHeadDirectionChanged(newDirection, previousDirection, {
                    stability: isStable,
                    confidence: recentFrames.length / this.directionChangeThreshold
                });
            }
            
            console.log(`🧭 Head direction changed: ${previousDirection} → ${newDirection}`);
        }
    }
    
    getPupilPosition(landmarks, eye) {
        // Enhanced pupil detection using multiple iris landmarks for better accuracy
        if (eye === 'left') {
            // Left iris landmarks: center (468) and surrounding points
            const irisLandmarks = [468, 469, 470, 471, 472]; // Left iris landmarks
            const validLandmarks = irisLandmarks.filter(idx => landmarks[idx]);
            
            if (validLandmarks.length > 0) {
                // Calculate average position of valid iris landmarks
                const avgX = validLandmarks.reduce((sum, idx) => sum + landmarks[idx].x, 0) / validLandmarks.length;
                const avgY = validLandmarks.reduce((sum, idx) => sum + landmarks[idx].y, 0) / validLandmarks.length;
                
                // Ensure canvas dimensions are current
                const canvasWidth = this.canvas ? this.canvas.width : 320;
                const canvasHeight = this.canvas ? this.canvas.height : 240;
                
                return {
                    x: avgX * canvasWidth,
                    y: avgY * canvasHeight,
                    confidence: validLandmarks.length / irisLandmarks.length,
                    normalized: { x: avgX, y: avgY } // Keep normalized coords for debugging
                };
            }
        } else {
            // Right iris landmarks: center (473) and surrounding points
            const irisLandmarks = [473, 474, 475, 476, 477]; // Right iris landmarks
            const validLandmarks = irisLandmarks.filter(idx => landmarks[idx]);
            
            if (validLandmarks.length > 0) {
                // Calculate average position of valid iris landmarks
                const avgX = validLandmarks.reduce((sum, idx) => sum + landmarks[idx].x, 0) / validLandmarks.length;
                const avgY = validLandmarks.reduce((sum, idx) => sum + landmarks[idx].y, 0) / validLandmarks.length;
                
                // Ensure canvas dimensions are current
                const canvasWidth = this.canvas ? this.canvas.width : 320;
                const canvasHeight = this.canvas ? this.canvas.height : 240;
                
                return {
                    x: avgX * canvasWidth,
                    y: avgY * canvasHeight,
                    confidence: validLandmarks.length / irisLandmarks.length,
                    normalized: { x: avgX, y: avgY } // Keep normalized coords for debugging
                };
            }
        }
        
        // Fallback: estimate pupil position from eye corners with lower confidence
        const eyeCorners = eye === 'left' ? 
            [landmarks[263], landmarks[362]] : // Left eye corners
            [landmarks[33], landmarks[133]];   // Right eye corners
            
        if (eyeCorners[0] && eyeCorners[1]) {
            const avgX = (eyeCorners[0].x + eyeCorners[1].x) / 2;
            const avgY = (eyeCorners[0].y + eyeCorners[1].y) / 2;
            const canvasWidth = this.canvas ? this.canvas.width : 320;
            const canvasHeight = this.canvas ? this.canvas.height : 240;
            
            return {
                x: avgX * canvasWidth,
                y: avgY * canvasHeight,
                confidence: 0.3, // Lower confidence for fallback method
                normalized: { x: avgX, y: avgY }
            };
        }
        
        return null;
    }
    
    calculateGazeDirection(pupil, eye, headPose) {
        // Enhanced gaze calculation with better mapping and head pose correction
        if (!pupil) return { x: 0, y: 0, confidence: 0 };
        
        // Get eye center position for reference
        const landmarks = this.currentLandmarks; // We'll need to store this
        const eyeCenterIdx = eye === 'left' ? 468 : 473; // Iris center
        
        let eyeCenter = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        if (landmarks && landmarks[eyeCenterIdx]) {
            eyeCenter = {
                x: landmarks[eyeCenterIdx].x * this.canvas.width,
                y: landmarks[eyeCenterIdx].y * this.canvas.height
            };
        }
        
        // Calculate relative pupil position within the eye
        const pupilOffset = {
            x: pupil.x - eyeCenter.x,
            y: pupil.y - eyeCenter.y
        };
        
        // Convert to normalized gaze direction using user-adjustable sensitivity
        // Higher sensitivity = larger cursor movements (more responsive)
        const scaleX = this.sensitivity.horizontal * 2.0; // Amplify horizontal movement
        const scaleY = this.sensitivity.vertical * 2.0;   // Amplify vertical movement
        
        let gazeX = (pupilOffset.x / this.canvas.width) * scaleX;
        let gazeY = (pupilOffset.y / this.canvas.height) * scaleY;
        
        // Apply head pose correction
        if (headPose && headPose.translation) {
            const headCorrection = {
                x: (headPose.translation[0] / this.canvas.width) * 0.05,
                y: (headPose.translation[1] / this.canvas.height) * 0.05
            };
            
            gazeX -= headCorrection.x;
            gazeY -= headCorrection.y;
        }
        
        // Apply calibration offset if available
        if (this.calibrationData.center) {
            gazeX -= this.calibrationData.center.x;
            gazeY -= this.calibrationData.center.y;
        }
        
        return {
            x: gazeX,
            y: gazeY,
            confidence: pupil.confidence || 0.5,
            raw: { pupilOffset, eyeCenter }
        };
    }
    
    updateGazeHistory(gaze) {
        this.gazeHistory.push(gaze);
        if (this.gazeHistory.length > this.maxHistoryLength) {
            this.gazeHistory.shift();
        }
    }
    
    getSmoothedGaze() {
        if (this.gazeHistory.length === 0) return { x: 0, y: 0 };
        
        const sum = this.gazeHistory.reduce((acc, gaze) => ({
            x: acc.x + gaze.x,
            y: acc.y + gaze.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / this.gazeHistory.length,
            y: sum.y / this.gazeHistory.length
        };
    }
    
    calculateGazeConfidence(leftPupil, rightPupil) {
        // Simple confidence calculation based on pupil detection quality
        if (!leftPupil || !rightPupil) return 0.5;
        
        // Higher confidence if both pupils are detected and reasonably positioned
        const distance = Math.sqrt(
            Math.pow(leftPupil.x - rightPupil.x, 2) + 
            Math.pow(leftPupil.y - rightPupil.y, 2)
        );
        
        // Normal interpupillary distance in pixels (rough estimate)
        const normalDistance = this.canvas.width * 0.1;
        const distanceRatio = Math.min(distance / normalDistance, 2);
        
        return Math.max(0.1, Math.min(1.0, distanceRatio));
    }
    
    drawDebugInfo(results) {
        if (!this.ctx || !results.faceLandmarks) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set canvas to match video if needed
        if (this.video && this.video.videoWidth && this.video.videoHeight) {
            const videoRect = this.video.getBoundingClientRect();
            if (this.canvas.width !== videoRect.width || this.canvas.height !== videoRect.height) {
                this.canvas.width = videoRect.width;
                this.canvas.height = videoRect.height;
            }
        }
        
        if (results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            
            // Draw only key landmarks for head/neck tracking (simplified)
            const keyIndices = [
                4,   // Nose tip
                152, // Chin
                10,  // Forehead
                33,  // Right eye corner
                263, // Left eye corner
                287, // Left mouth corner
                57   // Right mouth corner
            ];
            
            this.ctx.fillStyle = '#00FF00';
            keyIndices.forEach(index => {
                if (landmarks[index]) {
                    const landmark = landmarks[index];
                    const x = landmark.x * this.canvas.width;
                    const y = landmark.y * this.canvas.height;
                    
                    // Draw larger landmark point
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    // Draw landmark labels
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.font = '12px Arial';
                    const labels = {
                        4: 'N', 152: 'C', 10: 'F', 33: 'RE', 263: 'LE', 287: 'LM', 57: 'RM'
                    };
                    this.ctx.fillText(labels[index] || index, x + 5, y - 5);
                    this.ctx.fillStyle = '#00FF00';
                }
            });
            
            // Highlight key landmarks (eyes, nose, mouth)
            this.drawKeyLandmarks(landmarks);
            
            // Gaze line disabled for simplified head tracking
            
            // Draw gaze information
            this.drawGazeInfo();
        }
    }
    
    isKeyLandmark(index) {
        // Check if this is a key landmark we want to label
        const keyIndices = [
            4,   // nose tip
            152, // chin
            263, 468, // left eye
            33, 473,  // right eye
            287, 57   // mouth corners
        ];
        return keyIndices.includes(index);
    }
    
    drawKeyLandmarks(landmarks) {
        // Draw only 3 essential landmarks for head tracking
        const keyLandmarks = [
            { index: 4, color: '#00FF00', size: 4 },   // Nose tip (green)
            { index: 263, color: '#00FFFF', size: 3 }, // Left eye corner (cyan)
            { index: 33, color: '#00FFFF', size: 3 }   // Right eye corner (cyan)
        ];
        
        keyLandmarks.forEach(key => {
            if (landmarks[key.index]) {
                const landmark = landmarks[key.index];
                const x = landmark.x * this.canvas.width;
                const y = landmark.y * this.canvas.height;
                
                // Draw simple small dot
                this.ctx.fillStyle = key.color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, key.size, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        });
    }
    
    drawGazeLine(landmarks) {
        const leftPupil = this.getPupilPosition(landmarks, 'left');
        const rightPupil = this.getPupilPosition(landmarks, 'right');
        
        if (leftPupil && rightPupil) {
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
            
            // Draw gaze line from eye center
            const eyeCenter = {
                x: (leftPupil.x + rightPupil.x) / 2,
                y: (leftPupil.y + rightPupil.y) / 2
            };
            
            const gazeEndX = eyeCenter.x + (this.currentGaze.x * 200);
            const gazeEndY = eyeCenter.y + (this.currentGaze.y * 200);
            
            this.ctx.beginPath();
            this.ctx.moveTo(eyeCenter.x, eyeCenter.y);
            this.ctx.lineTo(gazeEndX, gazeEndY);
            this.ctx.stroke();
            
            // Draw gaze point
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(gazeEndX, gazeEndY, 5, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }
    
    drawGazeInfo() {
        // Don't draw text directly on canvas - use separate overlay instead
        this.updateGazeInfoOverlay();
    }
    
    updateGazeInfoOverlay() {
        // Create or update a separate text overlay that doesn't interfere with canvas positioning
        let overlay = document.getElementById('gaze-info-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gaze-info-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                white-space: nowrap;
            `;
            
            // Add to the same parent as the canvas
            if (this.canvas && this.canvas.parentElement) {
                this.canvas.parentElement.appendChild(overlay);
            } else {
                document.body.appendChild(overlay);
            }
        }
        
        // Update the text content
        const confidence = this.currentGaze.confidence || 0;
        const region = this.getGazeRegion();
        overlay.innerHTML = `
            Gaze: (${this.currentGaze.x.toFixed(3)}, ${this.currentGaze.y.toFixed(3)})<br>
            Region: ${region} | Conf: ${confidence.toFixed(2)}
        `;
    }
    
    // Interactive Calibration System
    startCalibration() {
        console.log('🎯 Starting interactive gaze calibration...');
        this.calibrationData.isCalibrating = true;
        this.calibrationData.samples = [];
        this.calibrationStep = 0;
        
        // Define calibration points (screen positions)
        this.calibrationPoints = [
            { name: 'center', x: 0.5, y: 0.5, label: 'Center' },
            { name: 'top', x: 0.5, y: 0.15, label: 'Top' },
            { name: 'bottom', x: 0.5, y: 0.85, label: 'Bottom' },
            { name: 'left', x: 0.15, y: 0.5, label: 'Left' },
            { name: 'right', x: 0.85, y: 0.5, label: 'Right' }
        ];
        
        this.showInteractiveCalibration();
    }

    showInteractiveCalibration() {
        // Create calibration overlay
        const overlay = document.createElement('div');
        overlay.id = 'calibration-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            cursor: crosshair;
        `;
        
        // Add ESC key listener for canceling calibration
        const escListener = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelCalibration();
                document.removeEventListener('keydown', escListener);
            }
        };
        document.addEventListener('keydown', escListener);
        
        // Store the listener for cleanup
        overlay.escListener = escListener;
        
        // Create instruction panel
        const instructions = document.createElement('div');
        instructions.id = 'calibration-instructions';
        instructions.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.95);
            color: black;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-size: 18px;
            max-width: 500px;
        `;
        
        overlay.appendChild(instructions);
        document.body.appendChild(overlay);
        
        this.showCalibrationPoint();
    }
    
    showCalibrationPoint() {
        if (this.calibrationStep >= this.calibrationPoints.length) {
            this.finishCalibration();
            return;
        }
        
        const point = this.calibrationPoints[this.calibrationStep];
        const overlay = document.getElementById('calibration-overlay');
        const instructions = document.getElementById('calibration-instructions');
        
        // Update instructions
        instructions.innerHTML = `
            <h3>🎯 Gaze Calibration</h3>
            <p>Step ${this.calibrationStep + 1} of ${this.calibrationPoints.length}</p>
            <p><strong>Look at the ${point.label.toUpperCase()} target and click it</strong></p>
            <p>The target will turn green when you click it</p>
            <p style="color: #ffaa00; margin-top: 15px;"><small>Press ESC to cancel calibration</small></p>
        `;
        
        // Remove previous target
        const oldTarget = document.getElementById('calibration-target');
        if (oldTarget) oldTarget.remove();
        
        // Create new target
        const target = document.createElement('div');
        target.id = 'calibration-target';
        target.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            background: #ff4444;
            border: 3px solid white;
            border-radius: 50%;
            cursor: pointer;
            left: ${point.x * 100}%;
            top: ${point.y * 100}%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            animation: pulse 1.5s infinite;
        `;
        
        target.textContent = this.calibrationStep + 1;
        
        // Add pulsing animation
        if (!document.getElementById('calibration-styles')) {
            const style = document.createElement('style');
            style.id = 'calibration-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.2); }
                    100% { transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Handle target click
        target.addEventListener('click', () => {
            // Change target color to indicate success
            target.style.background = '#44ff44';
            target.style.animation = 'none';
            
            // Collect samples for this point (simulate looking at it)
            this.collectCalibrationPoint(point);
            
            // Move to next point after short delay
            setTimeout(() => {
                this.calibrationStep++;
                this.showCalibrationPoint();
            }, 800);
        });
        
        overlay.appendChild(target);
        
        console.log(`📍 Showing calibration point: ${point.label} at (${point.x}, ${point.y})`);
    }
    
    collectCalibrationPoint(point) {
        // Wait for a moment to collect stable gaze data
        const collectSamples = () => {
            return new Promise((resolve) => {
                const samples = [];
                const collectCount = 15; // Collect more samples
                let collected = 0;
                
                const collectInterval = setInterval(() => {
                    let actualGaze = this.currentGaze;
                    
                    // If we have actual gaze data, use it; otherwise use expected position
                    if (!actualGaze || (Math.abs(actualGaze.x) < 0.001 && Math.abs(actualGaze.y) < 0.001)) {
                        // Use expected gaze position based on screen point
                        actualGaze = {
                            x: (point.x - 0.5) * 0.08, // Reduced range for better mapping
                            y: (point.y - 0.5) * 0.08
                        };
                        console.log(`📍 Using expected gaze for ${point.label}:`, actualGaze);
                    } else {
                        console.log(`👁️ Using actual gaze for ${point.label}:`, actualGaze);
                    }
                    
                    samples.push({
                        x: actualGaze.x,
                        y: actualGaze.y,
                        timestamp: Date.now(),
                        point: point.name,
                        screenX: point.x * window.innerWidth,
                        screenY: point.y * window.innerHeight
                    });
                    
                    collected++;
                    if (collected >= collectCount) {
                        clearInterval(collectInterval);
                        resolve(samples);
                    }
                }, 50); // Collect every 50ms
            });
        };
        
        // Collect samples and add to calibration data
        collectSamples().then(samples => {
            this.calibrationData.samples.push(...samples);
            
            const avgGaze = {
                x: samples.reduce((sum, s) => sum + s.x, 0) / samples.length,
                y: samples.reduce((sum, s) => sum + s.y, 0) / samples.length
            };
            
            console.log(`✅ Collected ${samples.length} samples for ${point.label}:`, {
                averageGaze: avgGaze,
                screenPoint: { x: point.x, y: point.y },
                actualScreenCoords: { x: point.x * window.innerWidth, y: point.y * window.innerHeight }
            });
        });
    }
    
    cancelCalibration() {
        console.log('❌ Calibration cancelled by user');
        
        // Remove calibration overlay
        const overlay = document.getElementById('calibration-overlay');
        if (overlay) {
            // Remove ESC listener
            if (overlay.escListener) {
                document.removeEventListener('keydown', overlay.escListener);
            }
            overlay.remove();
        }
        
        const styles = document.getElementById('calibration-styles');
        if (styles) styles.remove();
        
        // Reset calibration state
        this.calibrationData.isCalibrating = false;
        this.calibrationStep = 0;
        
        this.showCalibrationResult('❌ Calibration cancelled');
    }
    
    finishCalibration() {
        // Remove calibration overlay
        const overlay = document.getElementById('calibration-overlay');
        if (overlay) {
            // Remove ESC listener
            if (overlay.escListener) {
                document.removeEventListener('keydown', overlay.escListener);
            }
            overlay.remove();
        }
        
        const styles = document.getElementById('calibration-styles');
        if (styles) styles.remove();
        
        this.calibrationData.isCalibrating = false;
        
        // Calculate improved screen mapping from collected data
        if (this.calibrationData.samples.length >= 10) {
            this.calculateScreenCalibration();
            
            // Validate calibration results
            if (this.validateCalibration()) {
                const xValues = this.calibrationData.samples.map(s => s.x);
                const yValues = this.calibrationData.samples.map(s => s.y);
                
                const xRange = Math.max(...xValues) - Math.min(...xValues);
                const yRange = Math.max(...yValues) - Math.min(...yValues);
                
                // Set thresholds as percentage of observed range
                this.gazeThresholds.x = Math.max(0.005, xRange * 0.3);
                this.gazeThresholds.y = Math.max(0.005, yRange * 0.3);
                
                // Calculate center point
                this.calibrationData.center = {
                    x: xValues.reduce((a, b) => a + b, 0) / xValues.length,
                    y: yValues.reduce((a, b) => a + b, 0) / yValues.length
                };
                
                this.showCalibrationResult('✅ Calibration complete! Gaze detection is now calibrated for your setup.');
                console.log('✅ Interactive calibration complete:', {
                    center: this.calibrationData.center,
                    thresholds: this.gazeThresholds,
                    samples: this.calibrationData.samples.length,
                    screenCalibration: this.screenCalibration
                });
            } else {
                // Reset calibration if validation failed
                this.resetCalibration();
                this.showCalibrationResult('⚠️ Calibration produced invalid results, using default mapping.');
            }
        } else {
            this.showCalibrationResult('⚠️ Calibration incomplete - not enough data collected.');
        }
    }
    
    validateCalibration() {
        if (!this.screenCalibration) return false;
        
        const { scaleX, scaleY, offsetX, offsetY } = this.screenCalibration;
        
        // Check for NaN or infinite values
        if (isNaN(scaleX) || isNaN(scaleY) || isNaN(offsetX) || isNaN(offsetY)) {
            console.warn('🎯 Calibration contains NaN values');
            return false;
        }
        
        if (!isFinite(scaleX) || !isFinite(scaleY) || !isFinite(offsetX) || !isFinite(offsetY)) {
            console.warn('🎯 Calibration contains infinite values');
            return false;
        }
        
        // Check for reasonable scale values (not too extreme)
        if (Math.abs(scaleX) > 50000 || Math.abs(scaleY) > 50000) {
            console.warn('🎯 Calibration scale too extreme:', { scaleX, scaleY });
            return false;
        }
        
        // Check for zero scale (would prevent movement)
        if (Math.abs(scaleX) < 0.1 || Math.abs(scaleY) < 0.1) {
            console.warn('🎯 Calibration scale too small:', { scaleX, scaleY });
            return false;
        }
        
        console.log('✅ Calibration validation passed');
        return true;
    }
    
    resetCalibration() {
        console.log('🔄 Resetting calibration to defaults');
        this.screenCalibration = {
            scaleX: window.innerWidth * 1.2,
            scaleY: window.innerHeight * 1.2,
            offsetX: window.innerWidth / 2,
            offsetY: window.innerHeight / 2,
            isCalibrated: false
        };
        
        this.calibrationData = {
            center: { x: 0, y: 0 },
            samples: [],
            isCalibrating: false,
            minSamples: 30
        };
    }
    
    calculateScreenCalibration() {
        // Group samples by calibration points
        const pointGroups = {};
        
        this.calibrationData.samples.forEach(sample => {
            if (!pointGroups[sample.point]) {
                pointGroups[sample.point] = [];
            }
            pointGroups[sample.point].push(sample);
        });
        
        // Calculate average gaze position for each screen point
        const gazeToScreenMapping = [];
        
        Object.keys(pointGroups).forEach(pointName => {
            const samples = pointGroups[pointName];
            const avgGaze = {
                x: samples.reduce((sum, s) => sum + s.x, 0) / samples.length,
                y: samples.reduce((sum, s) => sum + s.y, 0) / samples.length
            };
            
            // Find corresponding screen point
            const screenPoint = this.calibrationPoints.find(p => p.name === pointName);
            if (screenPoint) {
                gazeToScreenMapping.push({
                    gaze: avgGaze,
                    screen: {
                        x: screenPoint.x * window.innerWidth,
                        y: screenPoint.y * window.innerHeight
                    }
                });
            }
        });
        
        // Calculate linear transformation parameters
        if (gazeToScreenMapping.length >= 3) {
            // Use least squares to find best fit transformation
            const { scaleX, scaleY, offsetX, offsetY } = this.calculateLinearTransform(gazeToScreenMapping);
            
            this.screenCalibration = {
                scaleX,
                scaleY,
                offsetX,
                offsetY,
                isCalibrated: true
            };
            
            console.log('📊 Screen calibration calculated:', this.screenCalibration);
        }
    }
    
    calculateLinearTransform(mapping) {
        console.log('🧮 Calculating linear transform with mapping:', mapping);
        
        if (mapping.length < 3) {
            console.warn('🧮 Not enough mapping points for calibration');
            return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
        }
        
        // Validate mapping data
        const validMapping = mapping.filter(m => 
            !isNaN(m.gaze.x) && !isNaN(m.gaze.y) && 
            !isNaN(m.screen.x) && !isNaN(m.screen.y)
        );
        
        if (validMapping.length < 3) {
            console.warn('🧮 Not enough valid mapping points');
            return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
        }
        
        // Use simple linear regression approach for more stable results
        const n = validMapping.length;
        
        // Calculate means
        const meanGazeX = validMapping.reduce((sum, m) => sum + m.gaze.x, 0) / n;
        const meanGazeY = validMapping.reduce((sum, m) => sum + m.gaze.y, 0) / n;
        const meanScreenX = validMapping.reduce((sum, m) => sum + m.screen.x, 0) / n;
        const meanScreenY = validMapping.reduce((sum, m) => sum + m.screen.y, 0) / n;
        
        // Calculate variances and covariances
        let sumGazeXVar = 0, sumGazeYVar = 0;
        let sumGazeXScreenX = 0, sumGazeYScreenY = 0;
        
        validMapping.forEach(m => {
            const gazeXDiff = m.gaze.x - meanGazeX;
            const gazeYDiff = m.gaze.y - meanGazeY;
            const screenXDiff = m.screen.x - meanScreenX;
            const screenYDiff = m.screen.y - meanScreenY;
            
            sumGazeXVar += gazeXDiff * gazeXDiff;
            sumGazeYVar += gazeYDiff * gazeYDiff;
            sumGazeXScreenX += gazeXDiff * screenXDiff;
            sumGazeYScreenY += gazeYDiff * screenYDiff;
        });
        
        // Calculate scale factors
        let scaleX = window.innerWidth * 1.2; // Default scale
        let scaleY = window.innerHeight * 1.2; // Default scale
        
        if (sumGazeXVar > 0.001) {
            scaleX = sumGazeXScreenX / sumGazeXVar;
        }
        if (sumGazeYVar > 0.001) {
            scaleY = sumGazeYScreenY / sumGazeYVar;
        }
        
        // Calculate offsets
        const offsetX = meanScreenX - (scaleX * meanGazeX);
        const offsetY = meanScreenY - (scaleY * meanGazeY);
        
        // Validate and clamp results
        const finalScaleX = isNaN(scaleX) ? window.innerWidth * 1.2 : Math.max(-20000, Math.min(20000, scaleX));
        const finalScaleY = isNaN(scaleY) ? window.innerHeight * 1.2 : Math.max(-20000, Math.min(20000, scaleY));
        const finalOffsetX = isNaN(offsetX) ? window.innerWidth / 2 : Math.max(-window.innerWidth * 2, Math.min(window.innerWidth * 3, offsetX));
        const finalOffsetY = isNaN(offsetY) ? window.innerHeight / 2 : Math.max(-window.innerHeight * 2, Math.min(window.innerHeight * 3, offsetY));
        
        const result = { 
            scaleX: finalScaleX, 
            scaleY: finalScaleY, 
            offsetX: finalOffsetX, 
            offsetY: finalOffsetY 
        };
        
        console.log('🧮 Calculated transform:', {
            result,
            means: { gazeX: meanGazeX, gazeY: meanGazeY, screenX: meanScreenX, screenY: meanScreenY },
            variances: { gazeX: sumGazeXVar, gazeY: sumGazeYVar },
            validPoints: validMapping.length
        });
        
        return result;
    }
    
    stopCalibration() {
        this.calibrationData.isCalibrating = false;
        
        // Remove calibration message
        const message = document.getElementById('calibration-message');
        if (message) message.remove();
        
        if (this.calibrationData.samples.length < 10) {
            console.warn('Not enough calibration samples');
            this.showCalibrationResult('⚠️ Calibration failed - not enough data. Try again.');
            return;
        }
        
        // Calculate improved thresholds
        const xValues = this.calibrationData.samples.map(s => s.x);
        const yValues = this.calibrationData.samples.map(s => s.y);
        
        const xRange = Math.max(...xValues) - Math.min(...xValues);
        const yRange = Math.max(...yValues) - Math.min(...yValues);
        
        // Set thresholds as a percentage of the observed range
        this.gazeThresholds.x = Math.max(0.005, xRange * 0.25); // 25% of observed horizontal range
        this.gazeThresholds.y = Math.max(0.005, yRange * 0.25); // 25% of observed vertical range
        
        // Calculate center point
        this.calibrationData.center = {
            x: xValues.reduce((a, b) => a + b, 0) / xValues.length,
            y: yValues.reduce((a, b) => a + b, 0) / yValues.length
        };
        
        this.showCalibrationResult('✅ Calibration complete! Gaze detection should be more accurate now.');
        
        console.log('✅ Calibration complete:', {
            center: this.calibrationData.center,
            thresholds: this.gazeThresholds,
            xRange: xRange,
            yRange: yRange,
            samples: this.calibrationData.samples.length
        });
    }

    showCalibrationResult(message) {
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 0, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
        `;
        resultDiv.textContent = message;
        document.body.appendChild(resultDiv);
        
        setTimeout(() => resultDiv.remove(), 3000);
    }
    
    calculateGazeVariance(samples) {
        if (samples.length < 2) return { x: 0.02, y: 0.02 };
        
        const mean = samples.reduce((acc, sample) => ({
            x: acc.x + sample.x,
            y: acc.y + sample.y
        }), { x: 0, y: 0 });
        
        mean.x /= samples.length;
        mean.y /= samples.length;
        
        const variance = samples.reduce((acc, sample) => ({
            x: acc.x + Math.pow(sample.x - mean.x, 2),
            y: acc.y + Math.pow(sample.y - mean.y, 2)
        }), { x: 0, y: 0 });
        
        return {
            x: Math.sqrt(variance.x / samples.length),
            y: Math.sqrt(variance.y / samples.length)
        };
    }
    
    addCalibrationSample(gaze) {
        if (this.calibrationData.isCalibrating) {
            this.calibrationData.samples.push({ ...gaze });
        }
    }
    
    // Utility methods for game integration
    getGazeDirection() {
        return this.currentGaze;
    }
    
    isLookingLeft() {
        const adjustedX = this.currentGaze.x - this.calibrationData.center.x;
        return adjustedX < -this.gazeThresholds.x;
    }
    
    isLookingRight() {
        const adjustedX = this.currentGaze.x - this.calibrationData.center.x;
        return adjustedX > this.gazeThresholds.x;
    }
    
    isLookingUp() {
        const adjustedY = this.currentGaze.y - this.calibrationData.center.y;
        return adjustedY < -this.gazeThresholds.y;
    }
    
    isLookingDown() {
        const adjustedY = this.currentGaze.y - this.calibrationData.center.y;
        return adjustedY > this.gazeThresholds.y;
    }
    
    isLookingCenter() {
        const adjustedX = this.currentGaze.x - this.calibrationData.center.x;
        const adjustedY = this.currentGaze.y - this.calibrationData.center.y;
        return Math.abs(adjustedX) < this.gazeThresholds.x && Math.abs(adjustedY) < this.gazeThresholds.y;
    }
    
    getGazeRegion() {
        const adjustedX = this.currentGaze.x - this.calibrationData.center.x;
        const adjustedY = this.currentGaze.y - this.calibrationData.center.y;
        
        // Check if within center threshold
        if (Math.abs(adjustedX) < this.gazeThresholds.x && Math.abs(adjustedY) < this.gazeThresholds.y) {
            return 'center';
        }
        
        // Determine dominant direction
        if (Math.abs(adjustedX) > Math.abs(adjustedY)) {
            return adjustedX > 0 ? 'right' : 'left';
        } else {
            return adjustedY > 0 ? 'down' : 'up';
        }
    }
    
    // Convert gaze coordinates to screen coordinates
    gazeToScreenCoordinates(gaze) {
        if (!gaze || (gaze.x === undefined || gaze.y === undefined)) {
            console.warn('🎯 Invalid gaze data for screen conversion:', gaze);
            return { x: window.innerWidth / 2, y: window.innerHeight / 2, confidence: 0 };
        }
        
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        let screenX, screenY;
        
        // Apply calibration if available and properly calibrated
        if (this.screenCalibration && this.screenCalibration.isCalibrated) {
            // Use calibrated transformation
            screenX = (gaze.x * this.screenCalibration.scaleX) + this.screenCalibration.offsetX;
            screenY = (gaze.y * this.screenCalibration.scaleY) + this.screenCalibration.offsetY;
            
            // Debug calibrated mapping occasionally
            if (Math.random() < 0.01) { // 1% chance to log
                console.log('🎯 Using calibrated mapping:', {
                    gazeX: gaze.x, gazeY: gaze.y,
                    screenX: screenX, screenY: screenY,
                    calibration: this.screenCalibration
                });
            }
            
            // Validate calibrated results
            if (isNaN(screenX) || isNaN(screenY)) {
                console.warn('🎯 Calibrated mapping produced NaN, falling back to default');
                // Fall back to default mapping
                const centerX = screenWidth * 0.5;
                const centerY = screenHeight * 0.5;
                const scaleX = screenWidth * 1.2;
                const scaleY = screenHeight * 1.2;
                screenX = centerX + (gaze.x * scaleX);
                screenY = centerY + (gaze.y * scaleY);
            }
        } else {
            // Use default mapping - improved from original
            const centerX = screenWidth * 0.5;
            const centerY = screenHeight * 0.5;
            
            // Better default scaling - more responsive
            const scaleX = screenWidth * 1.2; // Increased from 0.8 to 1.2
            const scaleY = screenHeight * 1.2; // Increased from 0.8 to 1.2
            
            screenX = centerX + (gaze.x * scaleX);
            screenY = centerY + (gaze.y * scaleY);
        }
        
        // Clamp to screen bounds with small buffer
        const buffer = 50; // Allow cursor to go slightly off-screen
        screenX = Math.max(-buffer, Math.min(screenWidth + buffer, screenX));
        screenY = Math.max(-buffer, Math.min(screenHeight + buffer, screenY));
        
        return {
            x: screenX,
            y: screenY,
            confidence: gaze.confidence || 0.5
        };
    }
    
    // Initialize screen calibration
    initializeScreenCalibration() {
        this.screenCalibration = {
            offsetX: 0,
            offsetY: 0,
            scaleX: 1,
            scaleY: 1,
            isCalibrated: false
        };
    }
    
    // Sensitivity adjustment methods
    setSensitivity(horizontal, vertical) {
        this.sensitivity.horizontal = Math.max(0.01, Math.min(1.0, horizontal));
        this.sensitivity.vertical = Math.max(0.01, Math.min(1.0, vertical));
        console.log('🎯 Sensitivity updated:', this.sensitivity);
    }
    
    setSmoothing(smoothing) {
        this.sensitivity.smoothing = Math.max(0.1, Math.min(1.0, smoothing));
        console.log('🎯 Smoothing updated:', this.sensitivity.smoothing);
    }
    
    setConfidenceThreshold(threshold) {
        this.sensitivity.confidence = Math.max(0.1, Math.min(1.0, threshold));
        console.log('🎯 Confidence threshold updated:', this.sensitivity.confidence);
    }
    
    getSensitivity() {
        return { ...this.sensitivity };
    }
    
    // Get debug information including calibration status
    getDebugInfo() {
        return {
            currentGaze: this.currentGaze,
            calibrationCenter: this.calibrationData.center,
            thresholds: this.gazeThresholds,
            sensitivity: this.sensitivity,
            adjustedGaze: {
                x: this.currentGaze.x - this.calibrationData.center.x,
                y: this.currentGaze.y - this.calibrationData.center.y
            },
            region: this.getGazeRegion(),
            isCalibrating: this.calibrationData.isCalibrating,
            calibrationSamples: this.calibrationData.samples.length,
            gazeHistory: this.gazeHistory.length,
            screenCalibration: this.screenCalibration
        };
    }
}