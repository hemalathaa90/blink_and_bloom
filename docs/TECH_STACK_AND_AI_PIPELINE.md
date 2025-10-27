🧱 TECH_STACK_AND_AI_PIPELINE.md

# 🔧 Tech Stack & AI Pipeline (HTML5 / JS Edition)

Everything runs locally in the browser using vanilla JavaScript and MediaPipe.  
No frameworks, no build tools — ideal for rapid hackathon iteration.

---

## 1. System Overview

Camera (MediaDevices) → Canvas (pre-processing) → MediaPipe FaceMesh (via CDN) → Custom Blink/Gaze Detection (JS) → Game Logic (Garden Canvas) → UI + Sound (Web Audio)

Optional TF.js model adds eye-strain score.  
Local HTTP server (`python -m http.server`) serves static files.

---

## 2. Frontend Technologies
| Layer | Tool | Role |
|--------|------|------|
| Structure | **HTML5** | Canvas + UI layout |
| Styling | **CSS3** | Pixel-art theme & animations |
| Logic | **Vanilla JS (ES6)** | Game loop & AI pipeline |
| Camera | **MediaDevices API** | Access webcam |
| Frames | **Canvas API** | Draw & analyze video frames |
| Sound | **Web Audio API** | Ambient music & FX |
| Vision | **MediaPipe FaceMesh (CDN)** | Eye landmarks |
| ML (optional) | **TensorFlow.js (CDN)** | Strain estimation |
| Server | **Python HTTP** | Local static hosting |

---

## 3. Folder Structure

/blinkbloom │ index.html │ style.css │ ├ /scripts │  ├ main.js │  ├ garden.js │  ├ blinkDetector.js │  ├ gazeDetector.js │  ├ cameraUtils.js │  └ worker.js (optional) │ ├ /assets (32×32 PNG sprites) └ server.py

---

## 4. JS Modules
| Module | Purpose |
|---------|----------|
| **BlinkBloomGame** | Main controller + state loop |
| **Garden** | Plant growth & hydration |
| **BlinkDetector** | EAR + temporal blink logic |
| **GazeDetector** | Iris vector → zones |
| **CameraUtils** | Stream setup + calibration |

---

## 5. AI Pipeline

### 5.1 Frame Processing
- Capture 360p video at ~30 FPS.  
- Draw to hidden Canvas → pass to MediaPipe.  
- Landmarks → eye contours & iris center.

### 5.2 Blink Detection
- Compute Eye Aspect Ratio (EAR).  
- Temporal smoothing 150–250 ms.  
- Emit `{t:'blink', strength:x}` events.  
- Double blink < 400 ms → special action.

### 5.3 Gaze Detection
- Normalize iris position → 5 zones (L/R/U/D/C).  
- Apply hysteresis (N frames before zone switch).  
- Emit `{t:'gaze_zone', zone:'L'}`.

### 5.4 Eye-Strain Scoring (optional)
Features (rolling 30 s): blink rate, PERCLOS, fixation length, irregularity.  
Rule-based or TF.js model outputs `strain_score 0–1`.

---

## 6. Performance Optimizations
- Run CV in Web Worker + `OffscreenCanvas`.  
- Landmark fps ≈ 25–30; classifier every 3 s.  
- Target UI 60 FPS (main thread).  
- Auto-throttle under CPU load.

---

## 7. Event Bridge
```js
function handleCvEvent(e){
  switch(e.t){
    case 'blink': garden.water(e.strength); break;
    case 'gaze_zone': if(e.zone==='U') garden.sunBoost(); break;
    case 'strain': if(e.band==='high') ui.promptRest(10); break;
  }
}


---

8. Asset Pipeline

PNG sprites 32×32 for plants & UI

CSS sprites for backgrounds

Audio (.ogg/.wav) for feedback

No bundler needed; direct serving via Python HTTP



---

9. Privacy & Consent

Camera access prompt required

No video frames stored or uploaded

Opt-out mode = Click-to-Water

All inference runs on-device



---

10. Performance Targets

Metric	Goal

Video Resolution	640×360
Processing FPS	≥ 25
Blink Latency	≤ 200 ms
Memory Use	< 150 MB
Session Length	60–120 s



---

11. Evaluation Plan

Measure FPS & CPU load

Compare blink precision vs manual labels

Post-session comfort survey

Engagement metrics (streak days / avg session len)



---

12. Future Work

Pupil dilation proxy for fatigue

Posture cue via MediaPipe Pose

Progressive Web App build

Optional Supabase save for garden state