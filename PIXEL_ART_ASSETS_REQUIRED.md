# Pixel Art Asset Requirements for Blink & Bloom Garden Game

## Asset Specifications
- **Size**: 32x32 pixels for all tiles and sprites
- **Style**: Pixel art with muted pastel palette
- **Format**: PNG with transparency where needed
- **Color Palette**: As specified in design recipe

## Required Assets by Category

### 1. Plant Sprites (`/assets/plants/`)
All plants should follow the growth progression and use the muted pastel colors:

#### Base Plant Stages (4 stages):
- `seed.png` - Small brown seed in soil (Soil color: #7A5840)
- `sprout.png` - Green sprout emerging (Stem color: #6B8F71)  
- `young.png` - Small plant with 2-3 leaves
- `bloom.png` - Fully bloomed flower

#### Dead State:
- `dead.png` - Dead brown leaves (#8C6A89 tinted)

**Note**: Empty soil patches will use your existing `dark_earth.png` and `light_earth.png` tiles from `/environment/`

### 2. UI Elements (`/assets/ui/`)

#### Panel Backgrounds:
- `panel_large.png` - 320x240px panel background (#D8C5A0 with #BCA37F border)
- `panel_medium.png` - 256x128px panel background  
- `panel_small.png` - 128x64px panel background
- `panel_button.png` - 96x32px button background

#### Progress Indicators (24x24px):
- `flower_progress_empty.png` - Empty flower-shaped progress ring
- `flower_progress_25.png` - 25% filled flower progress
- `flower_progress_50.png` - 50% filled flower progress  
- `flower_progress_75.png` - 75% filled flower progress
- `flower_progress_100.png` - 100% filled flower progress

#### Icons (16x16px):
- `icon_blink.png` - Eye/blink icon
- `icon_time.png` - Clock/timer icon
- `icon_health.png` - Heart/health icon
- `icon_pause.png` - Pause symbol
- `icon_play.png` - Play symbol
- `icon_stop.png` - Stop symbol
- `icon_gaze.png` - Target/crosshair for gaze

### 3. Environment Tiles (Already Provided - ✅)
You already have these in `/environment/`:
- ✅ `dark_earth.png` - Dark soil base
- ✅ `light_earth.png` - Light soil base
- ✅ Grass tiles in `/grass/` folder
- ✅ Flower decorations in `/flowers/` folder

### 4. Effects & Particles (`/assets/effects/`)

#### Weather Effects:
- `raindrop.png` - Single raindrop sprite (8x8px)
- `water_splash.png` - Small water splash effect (16x16px)
- `sparkle.png` - Growth sparkle effect (16x16px)

#### Visual Feedback:
- `glow_ring.png` - Glowing ring for gaze targeting (32x32px)
- `selection_border.png` - Selection border overlay (32x32px)
- `growth_burst.png` - Growth animation burst (32x32px)

### 5. Decorative Elements (`/assets/decorations/`)

#### Garden Decorations:
- `small_rock.png` - Small decorative rock
- `mushroom.png` - Small mushroom decoration
- `butterfly.png` - Butterfly sprite (for thriving garden effect)
- `bee.png` - Bee sprite (for flower interaction)



### 6. Backgrounds (`/assets/backgrounds/`)

#### Sky Gradients (320x240px):
- `sky_morning.png` - Morning sky gradient (#A8D5E2 → #F0EBD8)
- `sky_day.png` - Daytime sky gradient
- `sky_evening.png` - Evening sky gradient  
- `sky_night.png` - Night sky gradient

#### Texture Overlays:
- `paper_texture.png` - Subtle paper texture for UI (#F0EBD8)
- `wood_texture.png` - Wood texture for panels (#BCA37F)

## Animation Frames (Optional Enhancement)

### Plant Growth Animation:
- `seed_to_sprout_01.png` through `seed_to_sprout_04.png` - Growth transition frames
- `bloom_sway_01.png` through `bloom_sway_03.png` - Gentle flower swaying
- `water_absorb_01.png` through `water_absorb_03.png` - Plant drinking water

### UI Animations:
- `button_press_01.png` through `button_press_03.png` - Button press animation
- `progress_fill_01.png` through `progress_fill_05.png` - Progress bar filling

## Implementation Notes

### File Organization:
```
/assets/
  /plants/
  /ui/
  /effects/
  /decorations/
  /backgrounds/
  /animations/
```

### CSS Integration:
- All sprites will be referenced in CSS using `background-image: url('./assets/...')`
- Use `image-rendering: pixelated` for crisp pixel art display
- Implement sprite animations using CSS `@keyframes` for smooth transitions

### Color Consistency:
- Use provided hex values for all assets
- Keep saturation low as specified in design recipe
- Test all assets against the muted pastel background

### Priority Order:
1. **High Priority**: Plant sprites (seed → bloom stages)
2. **Medium Priority**: UI panels and progress indicators  
3. **Low Priority**: Decorative elements and animations

This pixel art approach will create a cohesive, eye-friendly garden simulation that matches your design vision perfectly!