🌼 MINIGAMES.md

# Mini-Games & Eye-Yoga Exercises

Short 30–60 second micro-levels appear between garden days to train different visual skills.

---

### 1. Pollinator Path
Guide a bee with your **gaze direction**.  
Promotes smooth ocular motion and focus transitions.

### 2. Focus Bloom
Alternate focus between near (plant) and far (sky) zones using controlled blinks.  
Trains ciliary muscle relaxation.

### 3. Cloud Drift
Slow blinks slow the clouds.  
Encourages gentle blink rhythm and calm breathing.

### 4. Stargazer
Hold your gaze on each star for 2–3 s to connect constellations.  
Improves steady focus without over-staring.

### 5. Shade Garden
Detect wilted plants under strain.  
Classifier suggests looking away to recover points.

### 6. Blink Symphony
Blink on-beat to generate rain drops.  
Synchronizes blink tempo with music.

---

## Implementation Details
- Reuse same canvas and detectors  
- Input mapping:  
  - Gaze zones → directional movement  
  - Blink rhythm → timed actions  
  - Strain score → auto-pause / rest  
- Each session ≤ 60 s to prevent fatigue