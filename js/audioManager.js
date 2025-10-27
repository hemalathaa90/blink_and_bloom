/**
 * AudioManager - Simple audio system for Blink & Bloom
 * Handles sound effects and ambient music
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.isEnabled = true;
        this.volume = 0.7;
        
        // Initialize Web Audio API
        this.initializeAudio();
        
        // Load sound definitions
        this.soundDefinitions = {
            blink: { frequency: 800, duration: 0.1, type: 'sine' },
            water: { frequency: 400, duration: 0.2, type: 'sine' },
            rain: { frequency: 200, duration: 0.5, type: 'sawtooth' },
            growth: { frequency: 600, duration: 0.3, type: 'triangle' },
            success: { frequency: 1000, duration: 0.4, type: 'square' },
            beat: { frequency: 440, duration: 0.1, type: 'sine' },
            perfect: { frequency: 1200, duration: 0.2, type: 'triangle' }
        };
    }
    
    async initializeAudio() {
        try {
            // Create audio context (requires user interaction first)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Check if context is suspended (common on mobile)
            if (this.audioContext.state === 'suspended') {
                console.log('Audio context suspended, will resume on user interaction');
            }
            
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.isEnabled = false;
        }
    }
    
    async ensureAudioContext() {
        if (!this.audioContext) {
            await this.initializeAudio();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Audio context resumed');
            } catch (error) {
                console.warn('Failed to resume audio context:', error);
            }
        }
    }
    
    // Play a sound effect using Web Audio API
    playSound(soundName, pitch = 1, volume = 1) {
        if (!this.isEnabled || !this.audioContext) return;
        
        const soundDef = this.soundDefinitions[soundName];
        if (!soundDef) {
            console.warn(`Sound "${soundName}" not found`);
            return;
        }
        
        try {
            this.ensureAudioContext().then(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                // Configure oscillator
                oscillator.type = soundDef.type;
                oscillator.frequency.setValueAtTime(
                    soundDef.frequency * pitch, 
                    this.audioContext.currentTime
                );
                
                // Configure gain (volume)
                gainNode.gain.setValueAtTime(
                    this.volume * volume * 0.3, // Keep it gentle
                    this.audioContext.currentTime
                );
                gainNode.gain.exponentialRampToValueAtTime(
                    0.001, 
                    this.audioContext.currentTime + soundDef.duration
                );
                
                // Connect and play
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + soundDef.duration);
            });
        } catch (error) {
            console.warn('Failed to play sound:', error);
        }
    }
    
    // Play specific game sounds
    playBlinkSound() {
        this.playSound('blink', 1 + Math.random() * 0.2, 0.8); // Slight pitch variation
    }
    
    playWaterSound() {
        this.playSound('water', 0.8 + Math.random() * 0.4, 0.6);
    }
    
    playRainSound() {
        // Play multiple rain sounds for richness
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playSound('rain', 0.7 + Math.random() * 0.6, 0.4);
            }, i * 100);
        }
    }
    
    playGrowthSound() {
        this.playSound('growth', 1.2, 0.7);
    }
    
    playSuccessSound() {
        // Ascending chord
        [1, 1.25, 1.5].forEach((pitch, index) => {
            setTimeout(() => {
                this.playSound('success', pitch, 0.5);
            }, index * 100);
        });
    }
    
    playBeatSound() {
        this.playSound('beat', 1, 0.6);
    }
    
    playPerfectSound() {
        this.playSound('perfect', 1, 0.8);
    }
    
    playMissedBeatSound() {
        // Lower, softer sound for missed beats
        this.playSound('blink', 0.5, 0.3);
    }
    
    // Ambient nature sounds (simplified)
    startAmbientMusic() {
        if (!this.isEnabled || !this.audioContext) return;
        
        // Simple ambient loop using oscillators
        this.createAmbientLoop();
    }
    
    createAmbientLoop() {
        if (!this.audioContext || this.ambientLoop) return;
        
        try {
            this.ensureAudioContext().then(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                // Very low frequency drone for ambience
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(55, this.audioContext.currentTime); // Low A
                
                // Heavy filtering for soft ambient sound
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
                filter.Q.setValueAtTime(1, this.audioContext.currentTime);
                
                // Very quiet
                gainNode.gain.setValueAtTime(0.03 * this.volume, this.audioContext.currentTime);
                
                // Connect the chain
                oscillator.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                
                this.ambientLoop = { oscillator, gainNode, filter };
            });
        } catch (error) {
            console.warn('Failed to start ambient music:', error);
        }
    }
    
    stopAmbientMusic() {
        if (this.ambientLoop) {
            try {
                this.ambientLoop.oscillator.stop();
                this.ambientLoop = null;
            } catch (error) {
                console.warn('Failed to stop ambient music:', error);
            }
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.ambientLoop) {
            this.ambientLoop.gainNode.gain.setValueAtTime(
                0.03 * this.volume,
                this.audioContext.currentTime
            );
        }
    }
    
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.stopAmbientMusic();
        }
    }
    
    // Initialize audio on first user interaction
    async initializeOnUserInteraction() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.ensureAudioContext();
            
            // Play a tiny silent sound to "prime" the audio system
            this.playSound('blink', 1, 0.001);
        }
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;