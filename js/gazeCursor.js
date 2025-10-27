/**
 * GazeCursor - Full-screen gaze tracking cursor with visual feedback
 * Shows exactly where the user is looking on the entire page
 */

class GazeCursor {
    constructor() {
        this.cursor = null;
        this.trail = [];
        this.maxTrailLength = 8;
        this.isVisible = false;
        this.smoothingFactor = 0.3;
        this.currentPosition = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.confidence = 0;
        
        // Interaction feedback
        this.interactionRipples = [];
        this.lastInteractionTime = 0;
        
        this.initialize();
    }
    
    initialize() {
        this.createCursor();
        this.createStyles();
        this.startAnimationLoop();
        console.log('🎯 GazeCursor initialized');
    }
    
    createCursor() {
        // Main cursor element
        this.cursor = document.createElement('div');
        this.cursor.id = 'gaze-cursor';
        this.cursor.className = 'gaze-cursor';
        
        // Inner dot
        const innerDot = document.createElement('div');
        innerDot.className = 'gaze-cursor-dot';
        this.cursor.appendChild(innerDot);
        
        // Outer ring
        const outerRing = document.createElement('div');
        outerRing.className = 'gaze-cursor-ring';
        this.cursor.appendChild(outerRing);
        
        // Confidence indicator
        const confidenceRing = document.createElement('div');
        confidenceRing.className = 'gaze-cursor-confidence';
        this.cursor.appendChild(confidenceRing);
        
        // Add to page
        document.body.appendChild(this.cursor);
        
        // Create trail container
        this.trailContainer = document.createElement('div');
        this.trailContainer.id = 'gaze-trail-container';
        document.body.appendChild(this.trailContainer);
        
        // Create ripple container
        this.rippleContainer = document.createElement('div');
        this.rippleContainer.id = 'gaze-ripple-container';
        document.body.appendChild(this.rippleContainer);
    }
    
    createStyles() {
        const style = document.createElement('style');
        style.id = 'gaze-cursor-styles';
        style.textContent = `
            .gaze-cursor {
                position: fixed;
                width: 40px;
                height: 40px;
                pointer-events: none;
                z-index: 9999;
                transition: opacity 0.3s ease;
                opacity: 0;
            }
            
            .gaze-cursor.visible {
                opacity: 1;
            }
            
            .gaze-cursor-dot {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 8px;
                height: 8px;
                background: #ff4444;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 8px rgba(255, 68, 68, 0.6);
            }
            
            .gaze-cursor-ring {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 32px;
                height: 32px;
                border: 2px solid rgba(255, 68, 68, 0.4);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: gazePulse 2s infinite ease-in-out;
            }
            
            .gaze-cursor-confidence {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 24px;
                height: 24px;
                border: 2px solid transparent;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: border-color 0.2s ease;
            }
            
            @keyframes gazePulse {
                0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
            }
            
            .gaze-trail-point {
                position: fixed;
                width: 6px;
                height: 6px;
                background: rgba(255, 68, 68, 0.3);
                border-radius: 50%;
                pointer-events: none;
                z-index: 9998;
                transition: opacity 0.5s ease-out, transform 0.5s ease-out;
            }
            
            .gaze-interaction-ripple {
                position: fixed;
                border: 2px solid #44ff44;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9997;
                animation: gazeRipple 1s ease-out forwards;
            }
            
            @keyframes gazeRipple {
                0% {
                    width: 20px;
                    height: 20px;
                    opacity: 1;
                }
                100% {
                    width: 100px;
                    height: 100px;
                    opacity: 0;
                }
            }
            
            /* High confidence styling */
            .gaze-cursor.high-confidence .gaze-cursor-dot {
                background: #44ff44;
                box-shadow: 0 0 12px rgba(68, 255, 68, 0.8);
            }
            
            .gaze-cursor.high-confidence .gaze-cursor-ring {
                border-color: rgba(68, 255, 68, 0.6);
            }
            
            .gaze-cursor.high-confidence .gaze-cursor-confidence {
                border-color: #44ff44;
            }
            
            /* Low confidence styling */
            .gaze-cursor.low-confidence .gaze-cursor-dot {
                background: #ffaa44;
                box-shadow: 0 0 6px rgba(255, 170, 68, 0.4);
            }
            
            .gaze-cursor.low-confidence .gaze-cursor-ring {
                border-color: rgba(255, 170, 68, 0.3);
            }
            
            /* Interaction state */
            .gaze-cursor.interacting .gaze-cursor-dot {
                background: #44ffff;
                box-shadow: 0 0 15px rgba(68, 255, 255, 0.9);
                animation: gazeInteract 0.3s ease-out;
            }
            
            @keyframes gazeInteract {
                0% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.5); }
                100% { transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    updatePosition(gazeData, screenCoordinates) {
        if (!gazeData || !screenCoordinates) {
            console.warn('🎯 Missing gaze data or screen coordinates:', { gazeData, screenCoordinates });
            return;
        }
        
        // Validate screen coordinates
        if (isNaN(screenCoordinates.x) || isNaN(screenCoordinates.y)) {
            console.warn('🎯 Invalid screen coordinates:', screenCoordinates);
            return;
        }
        
        // Update target position
        this.targetPosition.x = screenCoordinates.x;
        this.targetPosition.y = screenCoordinates.y;
        this.confidence = gazeData.confidence || 0.5;
        
        // Always ensure cursor is visible when receiving valid data
        if (!this.isVisible) {
            this.show();
            console.log('🎯 Showing gaze cursor at:', screenCoordinates);
        }
        
        // Update confidence styling
        this.updateConfidenceDisplay();
        
        // Add to trail
        this.addTrailPoint();
        
        // Debug log for troubleshooting
        if (Math.random() < 0.01) { // Only log 1% of the time to avoid spam
            console.log('🎯 Gaze cursor update:', {
                gaze: gazeData,
                screen: screenCoordinates,
                confidence: this.confidence,
                visible: this.isVisible
            });
        }
    }
    
    updateConfidenceDisplay() {
        this.cursor.classList.remove('high-confidence', 'low-confidence');
        
        if (this.confidence > 0.8) {
            this.cursor.classList.add('high-confidence');
        } else if (this.confidence < 0.4) {
            this.cursor.classList.add('low-confidence');
        }
        
        // Update confidence ring opacity
        const confidenceRing = this.cursor.querySelector('.gaze-cursor-confidence');
        if (confidenceRing) {
            confidenceRing.style.opacity = this.confidence;
        }
    }
    
    addTrailPoint() {
        // Create trail point
        const trailPoint = document.createElement('div');
        trailPoint.className = 'gaze-trail-point';
        trailPoint.style.left = this.currentPosition.x + 'px';
        trailPoint.style.top = this.currentPosition.y + 'px';
        trailPoint.style.transform = 'translate(-50%, -50%)';
        
        this.trailContainer.appendChild(trailPoint);
        this.trail.push({ element: trailPoint, timestamp: Date.now() });
        
        // Remove old trail points
        while (this.trail.length > this.maxTrailLength) {
            const oldPoint = this.trail.shift();
            if (oldPoint.element.parentNode) {
                oldPoint.element.remove();
            }
        }
        
        // Fade out trail points
        this.trail.forEach((point, index) => {
            const age = Date.now() - point.timestamp;
            const opacity = Math.max(0, 1 - (age / 2000)); // Fade over 2 seconds
            const scale = Math.max(0.3, 1 - (age / 3000));
            point.element.style.opacity = opacity;
            point.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
        });
    }
    
    startAnimationLoop() {
        const animate = () => {
            if (this.isVisible) {
                // Smooth movement using lerp
                this.currentPosition.x += (this.targetPosition.x - this.currentPosition.x) * this.smoothingFactor;
                this.currentPosition.y += (this.targetPosition.y - this.currentPosition.y) * this.smoothingFactor;
                
                // Update cursor position
                this.cursor.style.left = this.currentPosition.x + 'px';
                this.cursor.style.top = this.currentPosition.y + 'px';
                this.cursor.style.transform = 'translate(-50%, -50%)';
            }
            
            requestAnimationFrame(animate);
        };
        animate();
    }
    
    show() {
        this.isVisible = true;
        this.cursor.classList.add('visible');
    }
    
    hide() {
        this.isVisible = false;
        this.cursor.classList.remove('visible');
        
        // Clear trail
        this.trail.forEach(point => {
            if (point.element.parentNode) {
                point.element.remove();
            }
        });
        this.trail = [];
    }
    
    setSmoothing(smoothing) {
        this.smoothingFactor = Math.max(0.1, Math.min(1.0, smoothing));
        console.log('🎯 Cursor smoothing updated:', this.smoothingFactor);
    }
    
    showInteraction(element = null) {
        this.cursor.classList.add('interacting');
        
        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'gaze-interaction-ripple';
        ripple.style.left = this.currentPosition.x + 'px';
        ripple.style.top = this.currentPosition.y + 'px';
        ripple.style.transform = 'translate(-50%, -50%)';
        
        this.rippleContainer.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.remove();
            }
        }, 1000);
        
        // Remove interaction class
        setTimeout(() => {
            this.cursor.classList.remove('interacting');
        }, 300);
        
        console.log('👁️ Gaze interaction detected at:', this.currentPosition);
    }
    
    // Convert gaze coordinates to screen coordinates
    gazeToScreen(gazeX, gazeY) {
        // This is a simplified mapping - should be calibrated properly
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Map gaze coordinates (typically -0.1 to 0.1) to screen coordinates
        const x = (gazeX + 0.1) * (screenWidth / 0.2);
        const y = (gazeY + 0.1) * (screenHeight / 0.2);
        
        // Clamp to screen bounds
        return {
            x: Math.max(0, Math.min(screenWidth, x)),
            y: Math.max(0, Math.min(screenHeight, y))
        };
    }
    
    // Get element at current gaze position
    getElementAtGaze() {
        const elements = document.elementsFromPoint(this.currentPosition.x, this.currentPosition.y);
        return elements.filter(el => 
            el !== this.cursor && 
            !el.classList.contains('gaze-trail-point') &&
            !el.classList.contains('gaze-interaction-ripple')
        )[0];
    }
    
    // Clean up
    destroy() {
        if (this.cursor && this.cursor.parentNode) {
            this.cursor.remove();
        }
        if (this.trailContainer && this.trailContainer.parentNode) {
            this.trailContainer.remove();
        }
        if (this.rippleContainer && this.rippleContainer.parentNode) {
            this.rippleContainer.remove();
        }
        
        const styles = document.getElementById('gaze-cursor-styles');
        if (styles) {
            styles.remove();
        }
        
        this.isVisible = false;
    }
}