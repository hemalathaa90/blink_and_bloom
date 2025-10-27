🗂️ README.md

# 🌱 Blink & Bloom

**Blink & Bloom** is a cozy, health-driven browser game that blends *eye-yoga*, *bio-feedback*, and *AI vision tracking* into a mindful daily ritual.  
Each blink, gaze, or relaxation exercise nurtures your virtual plants and helps relieve real-world eye strain — turning screen time into digital self-care.

Developed for the **Health AI Gamification Hackathon**, this project explores how web-based AI and game design can promote healthier on-screen behavior.

---

## 🧩 Core Idea
Most people blink 50–60 % less while using screens, causing dryness and fatigue.  
**Blink & Bloom** gently retrains blinking and gaze flexibility by turning healthy eye habits into nurturing actions in a pixel-art garden.  
Your **eyes** are the controller — the webcam detects blink rhythm, gaze direction, and strain patterns (on-device only).  
The calmer and healthier your eyes, the lusher your garden grows.

---

## 🌿 Gameplay Loop
1. **Morning Phase – Garden Prep**  
   Choose seeds, decorations, and a goal for the day. Quick calibration learns your neutral gaze and blink pattern.
2. **Day Phase – Active Play**  
   1–2 minute sessions.  
   - Blinks = watering  
   - Gaze shifts = sunlight boosts  
   - Controlled blinking = wind calm  
   - Eye-strain detector ensures you don’t overdo it
3. **Mini-Games / Eye-Yoga Quests**  
   Between days, play short gaze- or blink-controlled micro-exercises (see `MINIGAMES.md`).
4. **Evening Phase – Reflection**  
   End-of-day stats: blink rate, relaxation, focus stability. Earn “Dew Drops” to plant new species.
5. **Garden Growth**  
   Healthy eye behavior unlocks new plants, weather, and decorations.

---

## 🤖 AI & Health Components
| Function | Implementation |
|-----------|----------------|
| **Blink Detection** | MediaPipe FaceMesh + custom EAR-based algorithm |
| **Gaze Detection** | Iris vector zones (L/R/U/D/C) |
| **Eye-Strain Estimation** | Rule-based + optional TF.js logistic model |
| **Adaptive Difficulty** | Auto-shorten sessions if strain ↑ |
| **Bio-feedback Insights** | Blink rate trend + focus stability (anonymous) |

---

## 🧘 Health Principles
- Encourage 15–20 blinks / min  
- Include vertical & horizontal gaze motions (eye-yoga)  
- Apply 20-20-20 rule micro-breaks  
- Use ambient visuals to guide relaxation  

---

## 🎨 Design Overview
- **Style:** Pixel-art (32 × 32) with soft pastels  
- **Perspective:** Top-down garden scene  
- **Palette:** Greens #7fbf7f, browns #a67c52, sky #cdebf6, petal #ffb3ba  
- **Soundscape:** Lo-fi nature loops, blink chimes  
- **Mood:** Calm, cozy, mindful  

---

## ⚙️ Technology Stack
| Layer | Technology | Purpose |
|--------|-------------|----------|
| **Frontend** | HTML5 + CSS3 + Vanilla JS (ES6) | Structure, styling, game logic |
| **Web APIs** | MediaDevices / Canvas / Web Audio | Camera access, video frames, sound |
| **Computer Vision** | MediaPipe (via CDN) | Eye landmarks for blink & gaze |
| **Machine Learning (optional)** | TensorFlow.js (via CDN) | Eye-strain scoring |
| **Server** | `python -m http.server` or `server.py` | Local static hosting |
| **Assets** | 32 × 32 PNG sprites + CSS sprites | Pixel art pipeline |
| **No frameworks, no build tools** | — | Direct file serving for speed and simplicity |

---

## 💡 Educational Impact
- Raises awareness about digital-eye health  
- Encourages breaks & blink habits through play  
- Demonstrates ethical AI for personal wellness  

---

## 🌻 Team & Credits
**NeuroNudge (Hema & Queby)**  
Health AI Gamification Hackathon  ·  Theme: *Health × AI × Gamification*
