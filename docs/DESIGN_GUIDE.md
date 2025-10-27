🎨 DESIGN_GUIDE.md

# Art & Interaction Design

## Visual Language
- **Theme:** Pixel-art garden sim  
- **Perspective:** Top-down, parallax layers  
- **Tile Size:** 32 × 32 PNG  
- **Animation:** 3-frame loops for sway / growth  
- **Palette Example:**
  - Leaf #7FBF7F   Sky #CDEBF6   Soil #A67C52   Petal #FFB3BA
Use a muted pastel palette with soft contrast to reduce eye strain.
Target something like:

Element	Hue Range	Example Hex	Comment

Soil / Ground	Warm brown-grey	#7A5840	Ground warmth without harsh red tones
Leaves / Stems	Desaturated green	#6B8F71	Calm botanical base
Bloom Colors	Soft pastel range	#EAC8CA, #A6C8E2, #F1D88C	Easy on eyes, distinct per flower
Sky / Background	Gentle teal-blue gradient	#A8D5E2 → #F0EBD8	Invites depth, matches “eye calm”
UI Frames	Paper beige / wood brown	#D8C5A0, #BCA37F	Vintage botanical-journal feel
Feedback Overlay	Subtle warm light filter	rgba(255,235,200,0.2)	Used when garden “thrives”
Fatigue Warning	Soft dusk purple	#8C6A89	Gentle caution rather than alarming red

---

## UI / UX
- Minimal HUD: hydration meter, focus bar, summary button  
- Rounded pixel font for readability  
- Visual feedback: 
  - Bloom particles for good blink rhythm  
  - Desaturation when over-focused  
- Accessibility: contrast toggle, color-blind filter, sound mute

---

## Ambient Experience
- Lo-fi nature music via Web Audio API  
- Weather transitions linked to eye comfort  
- Rest screen = soft breathing light animation

---

## Branding
- Pixel logo “Blink & Bloom” with soil gradient  
- Keywords: Calm · Nurturing · Mindful · AI × Nature  
- Optional mascot: tiny firefly assistant

---

## Asset Checklist
- Tiles: soil, grass, water, paths  
- Sprites: seedling → bloom, trees, bees, clouds  
- UI icons: blink, sun, water, rest  
- Sounds: drip, wind, rustle  
- Backgrounds: dawn / noon / dusk / night

---

## Implementation Notes
- Render loop = `requestAnimationFrame`  
- Modular classes: `Garden`, `BlinkDetector`, `GazeDetector`  
- Canvas layers: background · plants · UI  
- Optimized for 360p–720p viewport (16:9)