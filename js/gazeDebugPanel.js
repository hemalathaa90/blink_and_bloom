/**
 * GazeDebugPanel - Real-time debugging interface for gaze detection
 * Shows raw data, confidence levels, and allows parameter tuning
 */

class GazeDebugPanel {
    constructor(gazeDetector) {
        this.gazeDetector = gazeDetector;
        this.isVisible = false;
        this.updateInterval = null;
        this.panel = null;
        
        this.initialize();
    }
    
    initialize() {
        this.createPanel();
        this.setupEventListeners();
        console.log('🔍 GazeDebugPanel initialized');
    }
    
    createPanel() {
        // Create main panel
        this.panel = document.createElement('div');
        this.panel.id = 'gaze-debug-panel';
        this.panel.className = 'gaze-debug-panel';
        
        this.panel.innerHTML = `
            <div class="debug-header">
                <h3>👁️ Gaze Detection Debug</h3>
                <button class="debug-toggle" id="debug-hide-btn">Hide</button>
            </div>
            
            <div class="debug-content">
                <div class="debug-section">
                    <h4>📊 Real-time Data</h4>
                    <div class="debug-grid">
                        <div class="debug-item">
                            <label>Raw Gaze X:</label>
                            <span id="debug-gaze-x">0.000</span>
                        </div>
                        <div class="debug-item">
                            <label>Raw Gaze Y:</label>
                            <span id="debug-gaze-y">0.000</span>
                        </div>
                        <div class="debug-item">
                            <label>Confidence:</label>
                            <span id="debug-confidence">0.00</span>
                        </div>
                        <div class="debug-item">
                            <label>Screen X:</label>
                            <span id="debug-screen-x">0</span>
                        </div>
                        <div class="debug-item">
                            <label>Screen Y:</label>
                            <span id="debug-screen-y">0</span>
                        </div>
                        <div class="debug-item">
                            <label>Region:</label>
                            <span id="debug-region">center</span>
                        </div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>🎯 Calibration Status</h4>
                    <div class="debug-grid">
                        <div class="debug-item">
                            <label>Is Calibrated:</label>
                            <span id="debug-calibrated">No</span>
                        </div>
                        <div class="debug-item">
                            <label>Center X:</label>
                            <span id="debug-center-x">0.000</span>
                        </div>
                        <div class="debug-item">
                            <label>Center Y:</label>
                            <span id="debug-center-y">0.000</span>
                        </div>
                        <div class="debug-item">
                            <label>Samples:</label>
                            <span id="debug-samples">0</span>
                        </div>
                    </div>
                    <button class="debug-btn" onclick="gazeDebugPanel.startCalibration()">Start Calibration</button>
                </div>
                
                <div class="debug-section">
                    <h4>⚙️ Parameters</h4>
                    <div class="debug-controls">
                        <div class="debug-control">
                            <label>Smoothing Factor:</label>
                            <input type="range" id="smoothing-slider" min="0.1" max="1" step="0.1" value="0.3">
                            <span id="smoothing-value">0.3</span>
                        </div>
                        <div class="debug-control">
                            <label>X Threshold:</label>
                            <input type="range" id="threshold-x-slider" min="0.005" max="0.1" step="0.005" value="0.02">
                            <span id="threshold-x-value">0.02</span>
                        </div>
                        <div class="debug-control">
                            <label>Y Threshold:</label>
                            <input type="range" id="threshold-y-slider" min="0.005" max="0.1" step="0.005" value="0.02">
                            <span id="threshold-y-value">0.02</span>
                        </div>
                        <div class="debug-control">
                            <label>Scale X:</label>
                            <input type="range" id="scale-x-slider" min="0.5" max="3" step="0.1" value="1">
                            <span id="scale-x-value">1.0</span>
                        </div>
                        <div class="debug-control">
                            <label>Scale Y:</label>
                            <input type="range" id="scale-y-slider" min="0.5" max="3" step="0.1" value="1">
                            <span id="scale-y-value">1.0</span>
                        </div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>🎯 Sensitivity Settings</h4>
                    <div class="debug-controls">
                        <div class="debug-control">
                            <label>Horizontal:</label>
                            <input type="range" id="sensitivity-h-slider" min="0.1" max="1.0" step="0.05" value="0.5">
                            <span id="sensitivity-h-value">0.5</span>
                            <small>Higher = more responsive</small>
                        </div>
                        <div class="debug-control">
                            <label>Vertical:</label>
                            <input type="range" id="sensitivity-v-slider" min="0.1" max="1.0" step="0.05" value="0.5">
                            <span id="sensitivity-v-value">0.5</span>
                            <small>Higher = more responsive</small>
                        </div>
                        <div class="debug-control">
                            <label>Cursor Smoothing:</label>
                            <input type="range" id="cursor-smoothing-slider" min="0.1" max="1" step="0.05" value="0.3">
                            <span id="cursor-smoothing-value">0.30</span>
                        </div>
                        <div class="debug-control">
                            <label>Min Confidence:</label>
                            <input type="range" id="confidence-threshold-slider" min="0.1" max="1" step="0.05" value="0.5">
                            <span id="confidence-threshold-value">0.50</span>
                        </div>
                    </div>
                    <div class="debug-actions">
                        <button class="debug-btn" onclick="gazeDebugPanel.resetSensitivity()">Reset to Defaults</button>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>📈 History</h4>
                    <div class="debug-chart" id="gaze-history-chart">
                        <canvas id="gaze-chart-canvas" width="300" height="150"></canvas>
                    </div>
                    <div class="debug-stats">
                        <span>History Length: <span id="debug-history-length">0</span></span>
                        <span>Avg Confidence: <span id="debug-avg-confidence">0.00</span></span>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>🔧 Actions</h4>
                    <div class="debug-actions">
                        <button class="debug-btn" onclick="gazeDebugPanel.resetCalibration()">Reset Calibration</button>
                        <button class="debug-btn" onclick="gazeDebugPanel.exportData()">Export Data</button>
                        <button class="debug-btn" onclick="gazeDebugPanel.clearHistory()">Clear History</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        this.createStyles();
        
        // Add to page (initially hidden)
        document.body.appendChild(this.panel);
        this.panel.style.display = 'none';
    }
    
    createStyles() {
        const style = document.createElement('style');
        style.id = 'gaze-debug-styles';
        style.textContent = `
            .gaze-debug-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 350px;
                max-height: 90vh;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                border-radius: 10px;
                padding: 15px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10002;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }
            
            .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #333;
                padding-bottom: 10px;
            }
            
            .debug-header h3 {
                margin: 0;
                color: #00ff00;
            }
            
            .debug-toggle {
                background: #333;
                color: white;
                border: 1px solid #555;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
            }
            
            .debug-toggle:hover {
                background: #555;
            }
            
            .debug-section {
                margin-bottom: 20px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 5px;
            }
            
            .debug-section h4 {
                margin: 0 0 10px 0;
                color: #ffaa00;
                font-size: 13px;
            }
            
            .debug-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .debug-item {
                display: flex;
                justify-content: space-between;
                padding: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }
            
            .debug-item label {
                font-weight: bold;
                color: #ccc;
            }
            
            .debug-item span {
                color: #00ff00;
                font-weight: bold;
            }
            
            .debug-controls {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .debug-control {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .debug-control label {
                min-width: 100px;
                font-size: 11px;
            }
            
            .debug-control input[type="range"] {
                flex: 1;
                height: 20px;
            }
            
            .debug-control span {
                min-width: 40px;
                text-align: right;
                color: #00ff00;
                font-weight: bold;
            }
            
            .debug-btn {
                background: #0066cc;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                margin: 2px;
            }
            
            .debug-btn:hover {
                background: #0088ff;
            }
            
            .debug-chart {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                padding: 10px;
                text-align: center;
            }
            
            #gaze-chart-canvas {
                border: 1px solid #333;
                background: #000;
            }
            
            .debug-stats {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
                font-size: 10px;
            }
            
            .debug-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Hide button
        const hideBtn = this.panel.querySelector('#debug-hide-btn');
        hideBtn?.addEventListener('click', () => this.toggle());
        
        // Parameter sliders
        const smoothingSlider = this.panel.querySelector('#smoothing-slider');
        const thresholdXSlider = this.panel.querySelector('#threshold-x-slider');
        const thresholdYSlider = this.panel.querySelector('#threshold-y-slider');
        const scaleXSlider = this.panel.querySelector('#scale-x-slider');
        const scaleYSlider = this.panel.querySelector('#scale-y-slider');
        
        smoothingSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.gazeDetector.smoothingFactor = value;
            this.panel.querySelector('#smoothing-value').textContent = value.toFixed(1);
        });
        
        thresholdXSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.gazeDetector.gazeThresholds.x = value;
            this.panel.querySelector('#threshold-x-value').textContent = value.toFixed(3);
        });
        
        thresholdYSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.gazeDetector.gazeThresholds.y = value;
            this.panel.querySelector('#threshold-y-value').textContent = value.toFixed(3);
        });
        
        scaleXSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.gazeDetector.screenCalibration) {
                this.gazeDetector.screenCalibration.scaleX = value;
            }
            this.panel.querySelector('#scale-x-value').textContent = value.toFixed(1);
        });
        
        scaleYSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.gazeDetector.screenCalibration) {
                this.gazeDetector.screenCalibration.scaleY = value;
            }
            this.panel.querySelector('#scale-y-value').textContent = value.toFixed(1);
        });
        
        // Sensitivity sliders
        const sensitivityHSlider = this.panel.querySelector('#sensitivity-h-slider');
        const sensitivityVSlider = this.panel.querySelector('#sensitivity-v-slider');
        const cursorSmoothingSlider = this.panel.querySelector('#cursor-smoothing-slider');
        const confidenceThresholdSlider = this.panel.querySelector('#confidence-threshold-slider');
        
        sensitivityHSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.gazeDetector.sensitivity.horizontal = value;
            this.panel.querySelector('#sensitivity-h-value').textContent = value.toFixed(2);
        });
        
        sensitivityVSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.gazeDetector.sensitivity.vertical = value;
            this.panel.querySelector('#sensitivity-v-value').textContent = value.toFixed(2);
        });
        
        cursorSmoothingSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.gazeDetector.sensitivity.smoothing = value;
            // Also update cursor smoothing if it exists
            if (window.gazeCursor) {
                window.gazeCursor.setSmoothing(value);
            }
            this.panel.querySelector('#cursor-smoothing-value').textContent = value.toFixed(2);
        });
        
        confidenceThresholdSlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.gazeDetector.sensitivity.confidence = value;
            this.panel.querySelector('#confidence-threshold-value').textContent = value.toFixed(2);
        });
    }
    
    show() {
        this.isVisible = true;
        this.panel.style.display = 'block';
        this.startUpdating();
        
        // Update slider positions
        this.updateSliders();
    }
    
    hide() {
        this.isVisible = false;
        this.panel.style.display = 'none';
        this.stopUpdating();
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    updateSliders() {
        const smoothingSlider = this.panel.querySelector('#smoothing-slider');
        const thresholdXSlider = this.panel.querySelector('#threshold-x-slider');
        const thresholdYSlider = this.panel.querySelector('#threshold-y-slider');
        
        if (smoothingSlider) {
            smoothingSlider.value = this.gazeDetector.smoothingFactor || 0.3;
            this.panel.querySelector('#smoothing-value').textContent = (this.gazeDetector.smoothingFactor || 0.3).toFixed(1);
        }
        
        if (thresholdXSlider) {
            thresholdXSlider.value = this.gazeDetector.gazeThresholds?.x || 0.02;
            this.panel.querySelector('#threshold-x-value').textContent = (this.gazeDetector.gazeThresholds?.x || 0.02).toFixed(3);
        }
        
        if (thresholdYSlider) {
            thresholdYSlider.value = this.gazeDetector.gazeThresholds?.y || 0.02;
            this.panel.querySelector('#threshold-y-value').textContent = (this.gazeDetector.gazeThresholds?.y || 0.02).toFixed(3);
        }
        
        // Update sensitivity sliders
        const sensitivity = this.gazeDetector.getSensitivity();
        
        const sensitivityHSlider = this.panel.querySelector('#sensitivity-h-slider');
        if (sensitivityHSlider) {
            sensitivityHSlider.value = sensitivity.horizontal;
            this.panel.querySelector('#sensitivity-h-value').textContent = sensitivity.horizontal.toFixed(2);
        }
        
        const sensitivityVSlider = this.panel.querySelector('#sensitivity-v-slider');
        if (sensitivityVSlider) {
            sensitivityVSlider.value = sensitivity.vertical;
            this.panel.querySelector('#sensitivity-v-value').textContent = sensitivity.vertical.toFixed(2);
        }
        
        const cursorSmoothingSlider = this.panel.querySelector('#cursor-smoothing-slider');
        if (cursorSmoothingSlider) {
            cursorSmoothingSlider.value = sensitivity.smoothing;
            this.panel.querySelector('#cursor-smoothing-value').textContent = sensitivity.smoothing.toFixed(2);
        }
        
        const confidenceThresholdSlider = this.panel.querySelector('#confidence-threshold-slider');
        if (confidenceThresholdSlider) {
            confidenceThresholdSlider.value = sensitivity.confidence;
            this.panel.querySelector('#confidence-threshold-value').textContent = sensitivity.confidence.toFixed(2);
        }
    }
    
    startUpdating() {
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 100); // Update 10 times per second
    }
    
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateDisplay() {
        if (!this.isVisible || !this.gazeDetector) return;
        
        const debugInfo = this.gazeDetector.getDebugInfo();
        const currentGaze = this.gazeDetector.currentGaze || { x: 0, y: 0 };
        const screenCoords = this.gazeDetector.gazeToScreenCoordinates(currentGaze);
        
        // Update real-time data
        this.updateElement('#debug-gaze-x', currentGaze.x.toFixed(3));
        this.updateElement('#debug-gaze-y', currentGaze.y.toFixed(3));
        this.updateElement('#debug-confidence', (currentGaze.confidence || 0).toFixed(2));
        this.updateElement('#debug-screen-x', Math.round(screenCoords.x));
        this.updateElement('#debug-screen-y', Math.round(screenCoords.y));
        this.updateElement('#debug-region', debugInfo.region || 'center');
        
        // Update calibration status
        this.updateElement('#debug-calibrated', debugInfo.screenCalibration?.isCalibrated ? 'Yes' : 'No');
        this.updateElement('#debug-center-x', (debugInfo.calibrationCenter?.x || 0).toFixed(3));
        this.updateElement('#debug-center-y', (debugInfo.calibrationCenter?.y || 0).toFixed(3));
        this.updateElement('#debug-samples', debugInfo.calibrationSamples || 0);
        
        // Update history stats
        this.updateElement('#debug-history-length', debugInfo.gazeHistory || 0);
        
        if (this.gazeDetector.gazeHistory && this.gazeDetector.gazeHistory.length > 0) {
            const avgConfidence = this.gazeDetector.gazeHistory.reduce((sum, gaze) => 
                sum + (gaze.confidence || 0.5), 0) / this.gazeDetector.gazeHistory.length;
            this.updateElement('#debug-avg-confidence', avgConfidence.toFixed(2));
        }
        
        // Update chart
        this.updateChart();
    }
    
    updateElement(selector, value) {
        const element = this.panel.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateChart() {
        const canvas = this.panel.querySelector('#gaze-chart-canvas');
        if (!canvas || !this.gazeDetector.gazeHistory) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * width;
            const y = (i / 10) * height;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
        
        // Draw center lines
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width/2, 0);
        ctx.lineTo(width/2, height);
        ctx.moveTo(0, height/2);
        ctx.lineTo(width, height/2);
        ctx.stroke();
        
        // Draw gaze history
        const history = this.gazeDetector.gazeHistory.slice(-50); // Last 50 points
        if (history.length > 1) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            history.forEach((gaze, index) => {
                const x = ((gaze.x + 0.1) / 0.2) * width;
                const y = ((gaze.y + 0.1) / 0.2) * height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // Draw current position
            if (history.length > 0) {
                const current = history[history.length - 1];
                const x = ((current.x + 0.1) / 0.2) * width;
                const y = ((current.y + 0.1) / 0.2) * height;
                
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    
    startCalibration() {
        if (this.gazeDetector && this.gazeDetector.startCalibration) {
            this.gazeDetector.startCalibration();
        }
    }
    
    resetCalibration() {
        if (this.gazeDetector) {
            this.gazeDetector.calibrationData = {
                center: { x: 0, y: 0 },
                samples: [],
                isCalibrating: false,
                minSamples: 30
            };
            this.gazeDetector.initializeScreenCalibration();
            console.log('🔄 Calibration reset');
        }
    }
    
    exportData() {
        const data = {
            calibration: this.gazeDetector.calibrationData,
            screenCalibration: this.gazeDetector.screenCalibration,
            thresholds: this.gazeDetector.gazeThresholds,
            history: this.gazeDetector.gazeHistory?.slice(-100) || []
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gaze-debug-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📥 Gaze debug data exported');
    }
    
    clearHistory() {
        if (this.gazeDetector && this.gazeDetector.gazeHistory) {
            this.gazeDetector.gazeHistory = [];
            console.log('🧹 Gaze history cleared');
        }
    }
    
    resetSensitivity() {
        if (this.gazeDetector) {
            // Reset to default values
            this.gazeDetector.sensitivity = {
                horizontal: 0.5,
                vertical: 0.5,
                smoothing: 0.3,
                confidence: 0.5
            };
            
            // Update cursor smoothing
            if (window.gazeCursor) {
                window.gazeCursor.setSmoothing(0.3);
            }
            
            // Update sliders
            this.updateSliders();
            
            console.log('🔄 Sensitivity reset to defaults');
        }
    }
    
    destroy() {
        this.stopUpdating();
        if (this.panel && this.panel.parentNode) {
            this.panel.remove();
        }
        
        const styles = document.getElementById('gaze-debug-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Global reference for button onclick handlers
let gazeDebugPanel = null;