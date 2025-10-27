/**
 * Garden - Manages the magical Bloomlands garden
 * Handles plant growth, health, and visua    isPlantable(plantId) {
        // Check if this slot is in the dark earth planting area
        const earthTilePositions = [
            34, 35, 36, // Row 4 (slots 34-36)
            44, 45, 46, // Row 5 (slots 44-46)
            54, 55, 56  // Row 6 (slots 54-56)
        ];
        return earthTilePositions.includes(plantId);
    }
 */

class Garden {
    constructor() {
        this.plants = [];
        this.gardenGrid = document.getElementById('garden-grid');
        this.gridWidth = 10;
        this.gridHeight = 8;
        this.maxPlants = 20; // Increase plants for larger grid
        this.baseHealth = 100;
        this.currentHealth = this.baseHealth;
        this.healthDecayRate = 0.5; // Health lost per second without blinks
        this.healthDecayInterval = null;
        
        // Plant growth stages with pixel art sprites (4 stages total)
        this.plantStages = [
            { sprite: 'seed', emoji: '🌱' },      // Stage 1: Seed
            { sprite: 'sprout', emoji: '🌿' },   // Stage 2: Sprout  
            { sprite: 'young', emoji: '🍀' },    // Stage 3: Young plant
            { sprite: 'bloom', emoji: '🌸' }     // Stage 4: Full bloom
        ];
        
        // Dead state (1 stage)
        this.deadStage = { sprite: 'dead', emoji: '🍂' };
        

        
        this.rainEffectActive = false;
        this.lastWaterTime = 0;
        this.previousBloomCount = 0; // Track blooms for quest progress
        
        // Wind direction system for neck exercise gameplay
        this.windSystem = {
            active: false,
            currentDirection: null,
            windTimer: null,
            warningTimer: null,
            alignmentTimer: null,
            warningDuration: 3000,  // 3 seconds warning
            windDuration: 5000,     // 5 seconds active wind
            playerDirection: 'center',
            isAligned: false,
            alignmentBonus: 1.0,
            windHistory: []
        };
        
        this.initializeGarden();
    }
    
    initializeGarden() {
        // Clear existing garden
        this.gardenGrid.innerHTML = '';
        this.plants = [];
        
        // Create plant slots in a tile-based grid
        const totalSlots = this.gridWidth * this.gridHeight;
        for (let i = 0; i < totalSlots; i++) {
            const row = Math.floor(i / this.gridWidth);
            const col = i % this.gridWidth;
            
            const plant = {
                id: i,
                row: row,
                col: col,
                stage: 0, // 0 = empty, 1-4 = growth stages (seed, sprout, young, bloom)
                health: 100,
                lastWatered: Date.now(),
                isWilting: false,
                element: null,
                gazeBonus: 0,

                addGazeBonus: function() {
                    this.gazeBonus += 5;
                    this.health = Math.min(100, this.health + 3);
                    this.lastWatered = Date.now();
                    
                    // Increased growth chance with gaze attention
                    if (this.stage < 4 && this.stage > 0 && Math.random() < 0.4) {
                        const oldStage = this.stage;
                        this.stage++;
                        
                        // Note: Bloom callback will be handled in the garden's updateGardenHealth method
                        // since we can't access the garden instance from here
                    }
                }
            };
            
            const plantElement = this.createPlantElement(plant);
            this.gardenGrid.appendChild(plantElement);
            
            plant.element = plantElement;
            this.plants.push(plant);
        }
        
        // Start with a few seeds in the earth patches
        this.plantSeeds(3);
        // Health decay will be started when the game session begins
    }
    
    createPlantElement(plant) {
        const element = document.createElement('div');
        element.className = 'plant-slot';
        element.dataset.plantId = plant.id;
        
        // Add click listener for manual planting (only in earth areas)
        element.addEventListener('click', () => {
            if (plant.stage === 0 && this.isPlantable(plant.id)) {
                this.plantSeed(plant.id);
            }
        });
        
        this.updatePlantVisual(plant);
        return element;
    }
    
    isPlantable(plantId) {
        // Check if this slot is in the dark earth planting area (3x3 grid inside border)
        // Using 1-based indexing to match CSS nth-child selectors
        const earthTilePositions = [
            33, 34, 35, // Row 4 (inside the border) - CSS nth-child(34-36)
            43, 44, 45, // Row 5 (inside the border) - CSS nth-child(44-46)
            53, 54, 55  // Row 6 (inside the border) - CSS nth-child(54-56)
        ];
        return earthTilePositions.includes(plantId);
    }
    
    updatePlantVisual(plant) {
        if (!plant.element) return;
        
        // Remove existing classes and sprites
        plant.element.classList.remove('planted', 'wilting', 'growing');
        plant.element.classList.remove('plant-sprite', 'seed', 'sprout', 'young', 'bloom', 'dead');
        
        if (plant.stage === 0) {
            // Empty slot - keep existing CSS background (grass/earth tiles)
            plant.element.textContent = '';
            if (this.isPlantable(plant.id)) {
                plant.element.title = 'Click to plant a seed, or blink to water!';
            } else {
                plant.element.title = 'Grass area - cannot plant here. Find the dark earth patch!';
            }
        } else if (plant.isWilting) {
            // Dead plant - use pixel art sprite
            plant.element.classList.add('plant-sprite', this.deadStage.sprite);
            plant.element.textContent = ''; // Hide emoji when using sprites
            plant.element.classList.add('wilting');
            plant.element.title = `Dead plant - Health: ${plant.health.toFixed(0)}%`;
        } else {
            // Healthy growing plant - use pixel art sprite or emoji fallback
            const visualStage = Math.min(plant.stage - 1, this.plantStages.length - 1);
            const stageData = this.plantStages[visualStage];
            
            // Use pixel art sprite and hide emoji text
            plant.element.classList.add('plant-sprite', stageData.sprite);
            plant.element.textContent = ''; // Hide emoji when using sprites
            plant.element.classList.add('planted');
            plant.element.title = `Healthy plant - Stage ${plant.stage}, Health: ${plant.health.toFixed(0)}%`;
        }
    }
    
    plantSeeds(count) {
        let planted = 0;
        // Only allow planting in the central dark earth rectangle (3x3 = 9 spots)
        // Using 0-based indexing for JavaScript array access (CSS nth-child is 1-based)
        const earthTilePositions = [
            33, 34, 35, // Row 4 (inside the border) - maps to CSS nth-child(34-36)
            43, 44, 45, // Row 5 (inside the border) - maps to CSS nth-child(44-46)
            53, 54, 55  // Row 6 (inside the border) - maps to CSS nth-child(54-56)
        ];
        
        // Shuffle the earth positions for random planting
        const shuffledPositions = earthTilePositions.sort(() => Math.random() - 0.5);
        
        for (let pos of shuffledPositions) {
            if (planted >= count) break;
            if (pos < this.plants.length && this.plants[pos].stage === 0) {
                this.plantSeed(pos);
                planted++;
            }
        }
    }
    
    plantSeed(plantId) {
        const plant = this.plants[plantId];
        if (plant.stage === 0) {
            plant.stage = 1;
            plant.health = 100;
            plant.lastWatered = Date.now();
            plant.lastGrowthTime = Date.now(); // Mark that this plant was grown
            plant.isWilting = false;
            this.updatePlantVisual(plant);
            
            // Growing animation
            plant.element.classList.add('growing');
            setTimeout(() => {
                plant.element.classList.remove('growing');
            }, 500);
            
            // Trigger callback if available
            if (this.onPlantGrown) {
                this.onPlantGrown(plant);
            }
        }
    }
    
    waterPlants() {
        const currentTime = Date.now();
        let plantsWatered = 0;
        
        // Water all plants
        this.plants.forEach(plant => {
            if (plant.stage > 0) {
                // Restore health
                plant.health = Math.min(100, plant.health + 15);
                plant.lastWatered = currentTime;
                plant.isWilting = false;
                
                // Growth chance
                if (plant.stage < this.plantStages.length && Math.random() < 0.3) {
                    const oldStage = plant.stage;
                    plant.stage++;
                    plant.element.classList.add('growing');
                    setTimeout(() => {
                        plant.element.classList.remove('growing');
                    }, 500);
                    
                    // Check if plant just reached blooming stage (stage 4)
                    if (oldStage < 4 && plant.stage >= 4 && this.onPlantBloomed) {
                        this.onPlantBloomed(plant);
                    }
                }
                
                // Show water effect
                this.showWaterEffect(plant.element);
                this.updatePlantVisual(plant);
                plantsWatered++;
            }
        });
        
        // Plant new seeds if there's room
        if (plantsWatered > 0 && Math.random() < 0.4) {
            this.plantSeeds(1);
        }
        
        this.lastWaterTime = currentTime;
        this.updateGardenHealth();
        
        return plantsWatered;
    }
    
    showWaterEffect(plantElement) {
        const waterDrop = document.createElement('div');
        waterDrop.className = 'water-effect';
        waterDrop.textContent = '💧';
        
        plantElement.appendChild(waterDrop);
        
        setTimeout(() => {
            if (waterDrop.parentNode) {
                waterDrop.parentNode.removeChild(waterDrop);
            }
        }, 1000);
    }
    
    triggerRainEffect() {
        if (this.rainEffectActive) return;
        
        this.rainEffectActive = true;
        
        // Create rain overlay
        const rainOverlay = document.createElement('div');
        rainOverlay.className = 'rain-effect';
        this.gardenGrid.appendChild(rainOverlay);
        
        // Water all plants with bonus
        this.plants.forEach(plant => {
            if (plant.stage > 0) {
                plant.health = 100; // Full restoration
                plant.isWilting = false;
                
                // Guaranteed growth for healthy plants
                if (plant.stage < this.plantStages.length && plant.health > 80) {
                    plant.stage++;
                }
                
                this.updatePlantVisual(plant);
            }
        });
        
        // Plant multiple new seeds
        this.plantSeeds(2);
        
        setTimeout(() => {
            if (rainOverlay.parentNode) {
                rainOverlay.parentNode.removeChild(rainOverlay);
            }
            this.rainEffectActive = false;
        }, 1000);
        
        this.updateGardenHealth();
        console.log('🌧️ Rain effect triggered! Garden restored!');
    }
    
    startHealthDecay() {
        this.healthDecayInterval = setInterval(() => {
            const currentTime = Date.now();
            const timeSinceLastWater = currentTime - this.lastWaterTime;
            
            // Start decay after 10 seconds without watering
            if (timeSinceLastWater > 10000) {
                this.plants.forEach(plant => {
                    if (plant.stage > 0) {
                        plant.health -= this.healthDecayRate;
                        
                        if (plant.health <= 30) {
                            plant.isWilting = true;
                        }
                        
                        if (plant.health <= 0) {
                            // Plant dies, becomes empty slot
                            const wasPreviouslyAlive = plant.stage > 0;
                            plant.stage = 0;
                            plant.health = 100;
                            plant.isWilting = false;
                            
                            // Trigger callback if plant actually died (was alive before)
                            if (wasPreviouslyAlive && this.onPlantDied) {
                                this.onPlantDied(plant);
                            }
                        }
                        
                        this.updatePlantVisual(plant);
                    }
                });
                
                this.updateGardenHealth();
            }
        }, 1000);
    }
    
    stopHealthDecay() {
        if (this.healthDecayInterval) {
            clearInterval(this.healthDecayInterval);
            this.healthDecayInterval = null;
        }
    }
    
    updateGardenHealth() {
        // Calculate overall garden health
        const plantedCount = this.plants.filter(p => p.stage > 0).length;
        if (plantedCount === 0) {
            this.currentHealth = 100;
        } else {
            const totalHealth = this.plants
                .filter(p => p.stage > 0)
                .reduce((sum, p) => sum + p.health, 0);
            this.currentHealth = totalHealth / plantedCount;
        }
        
        // Check for new blooms and trigger callback if needed
        const currentBloomCount = this.plants.filter(p => p.stage >= 4).length;
        if (currentBloomCount > this.previousBloomCount && this.onPlantBloomed) {
            const newBlooms = currentBloomCount - this.previousBloomCount;
            for (let i = 0; i < newBlooms; i++) {
                this.onPlantBloomed({ stage: 4 }); // Call for each new bloom
            }
        }
        this.previousBloomCount = currentBloomCount;
        
        // Update UI
        const healthDisplay = document.getElementById('plant-health');
        if (healthDisplay) {
            healthDisplay.textContent = `Garden Health: ${Math.round(this.currentHealth)}%`;
            
            // Change color based on health
            if (this.currentHealth > 70) {
                healthDisplay.style.color = '#32CD32';
            } else if (this.currentHealth > 40) {
                healthDisplay.style.color = '#FFD700';
            } else {
                healthDisplay.style.color = '#FF6347';
            }
        }
    }
    
    getGardenStats() {
        const plantedCount = this.plants.filter(p => p.stage > 0).length;
        const bloomingCount = this.plants.filter(p => p.stage >= 4).length;
        const wiltingCount = this.plants.filter(p => p.isWilting).length;
        const deadCount = this.plants.filter(p => p.stage === 0 && p.hasOwnProperty('lastGrowthTime')).length; // Plants that were planted but died
        const averageStage = plantedCount > 0 ? 
            this.plants.filter(p => p.stage > 0).reduce((sum, p) => sum + p.stage, 0) / plantedCount : 0;
        
        return {
            totalPlants: plantedCount,
            bloomingPlants: bloomingCount,
            wiltingPlants: wiltingCount,
            deadPlants: deadCount,
            averageGrowthStage: averageStage.toFixed(1),
            overallHealth: Math.round(this.currentHealth),
            maxPossiblePlants: this.maxPlants
        };
    }
    
    // Gaze-based interaction methods
    getPlantAt(row, col) {
        // Convert row/col to plant index (simple grid mapping)
        const index = row * 6 + col; // Assuming 6 columns
        if (index >= 0 && index < this.plants.length) {
            return this.plants[index];
        }
        return null;
    }
    
    addBonusRain(amount = 0.1) {
        // Add bonus rain effect when looking up
        this.plants.forEach(plant => {
            if (plant.stage > 0) {
                plant.health = Math.min(100, plant.health + amount * 10);
                plant.lastWatered = Date.now();
            }
        });
        
        this.showRainEffect();
    }
    
    focusOnGroundPlants() {
        // Enhance ground-level plants when looking down
        this.plants.forEach(plant => {
            if (plant.stage > 0 && plant.stage <= 2) { // Young plants
                plant.health = Math.min(100, plant.health + 2);
                this.waterPlant(plant);
            }
        });
    }
    
    addHorizontalWatering(direction) {
        // Spread water horizontally based on gaze direction
        const startIndex = direction === 'left' ? 0 : Math.floor(this.plants.length / 2);
        const endIndex = direction === 'left' ? Math.floor(this.plants.length / 2) : this.plants.length;
        
        for (let i = startIndex; i < endIndex; i++) {
            const plant = this.plants[i];
            if (plant && plant.stage > 0) {
                plant.health = Math.min(100, plant.health + 1);
                plant.lastWatered = Date.now();
            }
        }
        
        this.updateGardenDisplay();
    }
    
    showRainEffect() {
        // Visual rain effect
        if (this.rainEffectActive) return;
        
        this.rainEffectActive = true;
        const rainDrops = [];
        
        for (let i = 0; i < 20; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.cssText = `
                position: absolute;
                width: 2px;
                height: 10px;
                background: #4a90e2;
                left: ${Math.random() * 100}%;
                top: -10px;
                animation: rainFall 1s linear;
                pointer-events: none;
                z-index: 100;
            `;
            
            this.gardenGrid.appendChild(drop);
            rainDrops.push(drop);
        }
        
        // Add rain animation CSS if not already present
        if (!document.getElementById('rain-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'rain-animation-styles';
            style.textContent = `
                @keyframes rainFall {
                    to {
                        top: 100%;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Clean up rain drops
        setTimeout(() => {
            rainDrops.forEach(drop => drop.remove());
            this.rainEffectActive = false;
        }, 1000);
    }
    
    reset() {
        this.stopHealthDecay();
        this.currentHealth = this.baseHealth;
        this.lastWaterTime = Date.now();
        this.initializeGarden();
    }
    
    updateGardenDisplay() {
        // Update the visual display of all plants
        this.plants.forEach(plant => {
            this.updatePlantVisual(plant);
        });
        
        // Update stats if needed
        if (window.game && window.game.updateStats) {
            window.game.updateStats();
        }
    }

    destroy() {
        this.stopHealthDecay();
        this.stopWindSystem();
    }
    
    // === WIND DIRECTION SYSTEM FOR NECK EXERCISE GAMEPLAY ===
    
    startWindSystem() {
        if (this.windSystem.active) {
            console.log('🌪️ Wind system already active');
            return;
        }
        
        console.log('🌪️ Starting wind direction system for neck exercise');
        this.windSystem.active = true;
        
        // Schedule first wind event after a delay
        this.scheduleNextWind();
    }
    
    stopWindSystem() {
        this.windSystem.active = false;
        
        // Clear all wind timers
        if (this.windSystem.windTimer) clearTimeout(this.windSystem.windTimer);
        if (this.windSystem.warningTimer) clearTimeout(this.windSystem.warningTimer);
        if (this.windSystem.alignmentTimer) clearTimeout(this.windSystem.alignmentTimer);
        
        // Remove wind UI elements
        this.removeWindEffects();
        console.log('🌪️ Wind system stopped');
    }
    
    scheduleNextWind() {
        if (!this.windSystem.active) {
            console.log('🌪️ Cannot schedule wind - system not active');
            return;
        }
        
        // Shorter interval for testing - first wind in 5-10 seconds, then 15-30 seconds
        const isFirstWind = this.windSystem.windHistory.length === 0;
        const interval = isFirstWind ? 
            (5000 + Math.random() * 5000) :    // 5-10 seconds for first wind
            (15000 + Math.random() * 15000);   // 15-30 seconds for subsequent winds
        
        console.log(`🌪️ Next wind scheduled in ${(interval/1000).toFixed(1)} seconds (isFirstWind: ${isFirstWind})`);
        
        this.windSystem.windTimer = setTimeout(() => {
            console.log('🌪️ Wind timer triggered - calling triggerRandomWind()');
            this.triggerRandomWind();
        }, interval);
    }
    
    triggerRandomWind() {
        const directions = ['north', 'south', 'east', 'west'];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)];
        console.log(`🌪️ triggerRandomWind() - selected direction: ${randomDirection}`);
        this.triggerDirectionalWind(randomDirection);
    }
    
    triggerDirectionalWind(direction) {
        if (this.windSystem.active && this.windSystem.currentDirection) {
            console.log('⚠️ Wind already active, skipping new wind');
            return;
        }
        
        console.log(`🌪️ Triggering ${direction} wind`);
        
        this.windSystem.currentDirection = direction;
        this.windSystem.isAligned = false;
        this.windSystem.alignmentBonus = 1.0;
        
        // Phase 1: Warning (3 seconds)
        this.showWindWarning(direction);
        
        this.windSystem.warningTimer = setTimeout(() => {
            // Phase 2: Active wind (5 seconds)
            this.showWindEffect(direction);
            this.startWindAlignment(direction);
            
            this.windSystem.alignmentTimer = setTimeout(() => {
                // Phase 3: Wind ends
                this.endWind();
            }, this.windSystem.windDuration);
        }, this.windSystem.warningDuration);
    }
    
    showWindWarning(direction) {
        console.log(`⚠️ showWindWarning called for ${direction} direction`);
        
        // Create wind warning overlay
        const warningOverlay = document.createElement('div');
        warningOverlay.className = 'wind-warning';
        warningOverlay.id = 'wind-warning';
        
        const directionEmoji = {
            north: '⬆️',
            south: '⬇️', 
            east: '➡️',
            west: '⬅️'
        };
        
        const directionName = {
            north: 'North',
            south: 'South',
            east: 'East', 
            west: 'West'
        };
        
        warningOverlay.innerHTML = `
            <div class="wind-warning-content">
                <div class="wind-direction-arrow">${directionEmoji[direction]}</div>
                <div class="wind-warning-text">${directionName[direction]} Wind Approaching!</div>
                <div class="wind-instruction">Look ${direction} to help your plants</div>
            </div>
        `;
        
        console.log(`🌪️ Adding wind warning to garden grid:`, {
            hasGardenGrid: !!this.gardenGrid,
            gardenGridId: this.gardenGrid?.id,
            warningElement: warningOverlay
        });
        
        this.gardenGrid.appendChild(warningOverlay);
        console.log(`⚠️ Wind warning displayed: ${direction}`);
    }
    
    showWindEffect(direction) {
        console.log(`🌪️ showWindEffect called for ${direction} direction`);
        
        // Remove warning
        const warningElement = document.getElementById('wind-warning');
        if (warningElement) {
            console.log('🧹 Removing wind warning element');
            warningElement.remove();
        }
        
        // Create active wind overlay
        const windOverlay = document.createElement('div');
        windOverlay.className = `wind-effect wind-${direction}`;
        windOverlay.id = 'wind-effect';
        
        console.log(`🌪️ Adding wind effect overlay:`, {
            className: windOverlay.className,
            id: windOverlay.id
        });
        
        this.gardenGrid.appendChild(windOverlay);
        
        // Add swaying effect to plants
        this.addPlantSwayEffect(direction);
        
        console.log(`🌪️ Active wind effect displayed: ${direction}`);
    }
    
    addPlantSwayEffect(direction) {
        // Add CSS class to make plants sway in wind direction
        this.plants.forEach(plant => {
            if (plant.element && plant.stage > 0) {
                plant.element.classList.add(`sway-${direction}`);
            }
        });
    }
    
    startWindAlignment(direction) {
        // This will be called by the game when head direction changes
        // For now, just set up the monitoring
        this.windSystem.active = true;
    }
    
    updatePlayerDirection(playerDirection) {
        // Called by game when head direction changes
        this.windSystem.playerDirection = playerDirection;
        
        // Check alignment if wind is active
        if (this.windSystem.currentDirection) {
            const wasAligned = this.windSystem.isAligned;
            this.windSystem.isAligned = (playerDirection === this.windSystem.currentDirection);
            
            // Show alignment feedback
            this.showAlignmentFeedback(this.windSystem.isAligned);
            
            // If just became aligned, start bonus effects
            if (!wasAligned && this.windSystem.isAligned) {
                this.startAlignmentBonus();
                
                // Trigger wind alignment quest callback
                if (this.onWindAlignmentSuccess) {
                    this.onWindAlignmentSuccess();
                }
            }
        }
    }
    
    showAlignmentFeedback(isAligned) {
        // Visual feedback for alignment
        const windEffect = document.getElementById('wind-effect');
        if (!windEffect) return;
        
        if (isAligned) {
            windEffect.classList.add('aligned');
            windEffect.classList.remove('misaligned');
        } else {
            windEffect.classList.add('misaligned');
            windEffect.classList.remove('aligned');
        }
    }
    
    startAlignmentBonus() {
        // Apply bonus effects when player aligns with wind
        this.windSystem.alignmentBonus = 1.5; // 50% bonus
        
        // Visual success effect
        const successEffect = document.createElement('div');
        successEffect.className = 'wind-success-effect';
        successEffect.textContent = '✨ Perfect Alignment! ✨';
        this.gardenGrid.appendChild(successEffect);
        
        setTimeout(() => successEffect.remove(), 2000);
        
        // Apply bonus to plants
        this.applyWindBonus();
        
        console.log('✨ Wind alignment bonus activated!');
    }
    
    applyWindBonus() {
        // Give growth bonus to all plants when aligned with wind
        this.plants.forEach(plant => {
            if (plant.stage > 0 && plant.stage < this.plantStages.length) {
                // Increase health and chance of growth
                plant.health = Math.min(100, plant.health + 20);
                
                // Higher chance of growth progression
                if (Math.random() < 0.4) { // 40% chance instead of normal growth chance
                    plant.stage = Math.min(this.plantStages.length, plant.stage + 1);
                }
                
                this.updatePlantVisual(plant);
            }
        });
        
        // Plant new seeds with bonus
        this.plantSeeds(1);
    }
    
    endWind() {
        // Clean up wind effects
        this.removeWindEffects();
        
        // Reset wind system state
        this.windSystem.currentDirection = null;
        this.windSystem.isAligned = false;
        this.windSystem.alignmentBonus = 1.0;
        
        // Record wind event for statistics
        this.windSystem.windHistory.push({
            direction: this.windSystem.currentDirection,
            wasAligned: this.windSystem.isAligned,
            timestamp: Date.now()
        });
        
        // Schedule next wind
        this.scheduleNextWind();
        
        console.log('🌪️ Wind ended');
    }
    
    removeWindEffects() {
        // Remove wind UI elements
        const windWarning = document.getElementById('wind-warning');
        if (windWarning) windWarning.remove();
        
        const windEffect = document.getElementById('wind-effect');
        if (windEffect) windEffect.remove();
        
        // Remove plant sway effects
        this.plants.forEach(plant => {
            if (plant.element) {
                plant.element.classList.remove('sway-north', 'sway-south', 'sway-east', 'sway-west');
            }
        });
        
        // Remove success effects
        document.querySelectorAll('.wind-success-effect').forEach(el => el.remove());
    }
    
    getWindStats() {
        const recentWinds = this.windSystem.windHistory.slice(-10); // Last 10 wind events
        const alignedCount = recentWinds.filter(w => w.wasAligned).length;
        
        return {
            totalWindEvents: this.windSystem.windHistory.length,
            recentAlignmentRate: recentWinds.length ? (alignedCount / recentWinds.length) : 0,
            currentWindDirection: this.windSystem.currentDirection,
            isCurrentlyAligned: this.windSystem.isAligned
        };
    }
}

// Export for use in other modules
window.Garden = Garden;