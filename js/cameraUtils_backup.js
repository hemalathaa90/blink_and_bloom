/**
 * CameraUtils - Enhanced camera management with device selection and debugging
 */

class CameraUtils {
    constructor() {
        this.availableDevices = [];
        this.currentStream = null;
        this.currentDeviceId = null;
        this.constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };
    }

    async enumerateDevices() {
        try {
            console.log('🔍 Enumerating camera devices...');
            
            // Request permission first to get device labels
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log(`📷 Found ${this.availableDevices.length} camera(s):`, this.availableDevices);
            
            return this.availableDevices;
        } catch (error) {
            console.error('❌ Error enumerating devices:', error);
            this.showCameraError(error);
            return [];
        }
    }
    
    async startCamera(videoElement, deviceId = null) {
        try {
            console.log('🎥 Attempting to start camera...', { deviceId });
            
            // Stop existing stream
            if (this.currentStream) {
                this.stopCamera();
            }

            // Set up constraints
            const constraints = { ...this.constraints };
            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
            }

            console.log('📋 Camera constraints:', constraints);

            // Request camera access with timeout
            const stream = await Promise.race([
                navigator.mediaDevices.getUserMedia(constraints),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Camera access timeout after 10 seconds')), 10000)
                )
            ]);

            console.log('✅ Camera stream obtained:', stream);

            // Set up video element
            videoElement.srcObject = stream;
            this.currentStream = stream;
            this.currentDeviceId = deviceId;

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                videoElement.onloadedmetadata = () => {
                    console.log('📺 Video metadata loaded:', {
                        width: videoElement.videoWidth,
                        height: videoElement.videoHeight
                    });
                    resolve();
                };
                videoElement.onerror = reject;
                
                // Timeout fallback
                setTimeout(() => reject(new Error('Video load timeout')), 5000);
            });

            // Start video playback
            await videoElement.play();
            console.log('▶️ Video playback started');

            return true;

        } catch (error) {
            console.error('❌ Camera start failed:', error);
            this.showCameraError(error);
            return false;
        }
    }

    stopCamera() {
        if (this.currentStream) {
            console.log('⏹️ Stopping camera stream');
            this.currentStream.getTracks().forEach(track => {
                track.stop();
                console.log(`🔴 Stopped ${track.kind} track:`, track.label);
            });
            this.currentStream = null;
            this.currentDeviceId = null;
        }
    }

    getCurrentDevice() {
        if (this.currentDeviceId && this.availableDevices.length > 0) {
            return this.availableDevices.find(device => device.deviceId === this.currentDeviceId);
        }
        return null;
    }
    
    showCameraError(error) {
        let message = 'Unknown camera error';
        let suggestions = [];

        switch (error.name) {
            case 'NotAllowedError':
                message = 'Camera access denied by user';
                suggestions = [
                    'Click the camera icon in your browser address bar',
                    'Select "Always allow" for camera access',
                    'Refresh the page and try again'
                ];
                break;
            case 'NotFoundError':
                message = 'No camera device found';
                suggestions = [
                    'Check if your camera is connected',
                    'Try a different USB port',
                    'Check camera drivers are installed'
                ];
                break;
            case 'NotReadableError':
                message = 'Camera is already in use by another application';
                suggestions = [
                    'Close other apps using the camera (Zoom, Skype, etc.)',
                    'Restart your browser',
                    'Try a different camera if available'
                ];
                break;
            case 'OverconstrainedError':
                message = 'Camera doesn\'t support the requested settings';
                suggestions = [
                    'Try a different camera',
                    'Lower the resolution requirements'
                ];
                break;
            case 'SecurityError':
                message = 'Camera access blocked due to security settings';
                suggestions = [
                    'Make sure you\'re using HTTPS or localhost',
                    'Check browser security settings',
                    'Try a different browser'
                ];
                break;
            default:
                if (error.message.includes('timeout')) {
                    message = 'Camera access timed out';
                    suggestions = [
                        'Check if camera is working in other apps',
                        'Try refreshing the page',
                        'Restart your browser'
                    ];
                } else {
                    message = error.message || 'Camera initialization failed';
                }
                break;
        }

        this.displayErrorMessage(message, suggestions);
    }
    
    displayErrorMessage(message, suggestions = []) {
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.camera-error-message');
        existingErrors.forEach(error => error.remove());

        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'camera-error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        let html = `<strong>📷 Camera Error:</strong><br>${message}`;
        
        if (suggestions.length > 0) {
            html += '<br><br><strong>Try this:</strong><ul style="margin: 5px 0; padding-left: 20px;">';
            suggestions.forEach(suggestion => {
                html += `<li>${suggestion}</li>`;
            });
            html += '</ul>';
        }

        html += '<br><button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Close</button>';

        errorDiv.innerHTML = html;
        document.body.appendChild(errorDiv);

        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 15000);
    }

    // Debug information
    getDebugInfo() {
        return {
            availableDevices: this.availableDevices,
            currentDevice: this.getCurrentDevice(),
            hasStream: !!this.currentStream,
            streamActive: this.currentStream ? this.currentStream.active : false,
            constraints: this.constraints,
            browserSupport: {
                getUserMedia: !!navigator.mediaDevices?.getUserMedia,
                enumerateDevices: !!navigator.mediaDevices?.enumerateDevices,
                mediaDevices: !!navigator.mediaDevices
            }
        };
    }

    logDebugInfo() {
        console.log('🔧 Camera Debug Info:', this.getDebugInfo());
    }
}

// Export for use in other modules
window.CameraUtils = CameraUtils;
            content += `
                <div style="font-size: 14px; margin-bottom: 10px;">Possible solutions:</div>
                <ul style="text-align: left; font-size: 12px;">
            `;
            
            issues.forEach(issue => {
                let solution = '';
                if (issue.includes('HTTPS')) {
                    solution = 'Use HTTPS or run on localhost';
                } else if (issue.includes('permission denied')) {
