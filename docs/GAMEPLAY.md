🎮 GAMEPLAY.md

# Gameplay Mechanics

## Main Loop
1. **Calibration**
   - Player centers face; MediaPipe FaceMesh learns baseline blink rate & gaze zones.
2. **Active Session**
   - **Blink → Water** plants  
   - **Slow Blink → Calm Wind**  
   - **Double Blink → Clear Weeds**  
   - **Gaze Up → Sunlight Boost**  
   - **Strain ↑ → Prompt Rest**
   - Or a fixed set of "quests" or "missions" that will be evaluated by the end of the "game day"
3. **Feedback**
   - Bloom animation = healthy rhythm  
   - Wilt animation = needs break  
4. **Summary**
   - Blink Consistency · Focus Flexibility · Relaxation Score

---

## Interaction Mapping
| Input | Source | In-Game Effect |
|--------|---------|----------------|
| Blink | MediaPipe eye closure | Water plants |
| Slow Blink > 350 ms | EAR duration | Calm weather |
| Double Blink < 400 ms | Temporal pattern | Clear weeds |
| Gaze Direction | Iris vector | Control mini-games / sunlight |
| Strain ↑ | TF.js score > 0.6 | Trigger rest animation |

---

## Health Integration
- Mirrors eye-yoga patterns (vertical + horizontal gaze)  
- Bio-feedback loop nudges healthy frequency  
- Auto-adapts session length if strain rises  

---

## Rewards & Progression
- **Dew Drops:** earned for healthy sessions  
- **Species Unlocks:** reward long-term consistency  
- **Decorations:** bought with Dew Drops  
- **Achievements:** “Hydration Master,” “Zen Gardener”

---

## Player Flow
Title → Daily Garden → Active Session → Summary → Rest → Mini-Game → Next Day