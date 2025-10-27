# Gaze Detection Integration - Blink & Bloom

## Overview
This integration adds eye gaze detection to the Blink & Bloom game, based on the principles from the eye gaze estimation article. The implementation uses MediaPipe's Face Landmarker to detect facial landmarks and estimate gaze direction in real-time through a web browser.

## Features

### Core Gaze Detection
- **Real-time gaze tracking** using MediaPipe Face Landmarker
- **Head pose estimation** for improved accuracy
- **Iris/pupil detection** for precise gaze calculation
- **Smoothed gaze output** to reduce jitter
- **Confidence scoring** for reliability assessment

### Game Integration
- **Toggle gaze detection** on/off during gameplay
- **Gaze-based plant interactions** - look at specific plants to give them extra attention
- **Directional effects**:
  - Look **up** → Triggers bonus rain for all plants
  - Look **down** → Focuses on ground-level/young plants
  - Look **left/right** → Spreads watering horizontally
- **Visual feedback** showing current gaze region
- **Gaze interaction counter** and statistics

## Files Added/Modified

### New Files
- `js/gazeDetector.js` - Main gaze detection implementation
- `gaze_test.html` - Standalone gaze detection test page

### Modified Files
- `js/game.js` - Added gaze detection integration
- `js/garden.js` - Added gaze-based plant interactions
- `index.html` - Added gaze detection controls and UI

## How It Works

### Technical Implementation
1. **Face Detection**: Uses MediaPipe Face Landmarker to detect 468 facial landmarks
2. **Head Pose Estimation**: Calculates head orientation using key facial points
3. **Pupil/Iris Detection**: Locates eye centers using iris landmarks
4. **Gaze Calculation**: Estimates gaze direction relative to head pose
5. **Coordinate Mapping**: Maps gaze coordinates to game elements

### Game Mechanics
- **Plant Targeting**: Gaze at specific plants to give them growth bonuses
- **Environmental Effects**: Different gaze directions trigger different garden effects
- **Visual Feedback**: Real-time indicators show where you're looking
- **Optional Feature**: Can be enabled/disabled without affecting core gameplay

## Testing and Accuracy

### Using the Test Page
1. Open `gaze_test.html` in your browser
2. Click "Start Gaze Detection" and allow camera access
3. Look around to see gaze tracking in the 3x3 grid
4. Use "Test Accuracy" to check precision with moving targets

### Accuracy Considerations
- **Lighting**: Works best in good lighting conditions
- **Distance**: Optimal distance is 50-70cm from camera
- **Head Position**: Keep head relatively stable for better accuracy
- **Calibration**: Individual differences may affect accuracy
- **Browser Support**: Requires modern browser with WebGL support

## Usage Instructions

### In the Main Game
1. Start the game normally with "Start Garden Session"
2. Click "Enable Gaze Detection" to activate gaze features
3. Look around at different plants and regions
4. Watch for visual feedback showing gaze interactions

### Controls
- **Enable/Disable Gaze Detection**: Toggle button in controls
- **Gaze Region Indicator**: Shows current gaze direction
- **Plant Interactions**: Automatic when looking at plants

## Limitations and Future Improvements

### Current Limitations
- **Simplified calibration**: No per-user calibration system
- **Basic coordinate mapping**: Simple linear mapping to garden grid
- **Distance estimation**: No depth perception for exact gaze points
- **Individual differences**: May not work equally well for all users

### Potential Improvements
1. **Calibration system**: User-specific calibration routine
2. **Better coordinate mapping**: More sophisticated screen coordinate mapping  
3. **Distance estimation**: Using stereo cameras or depth sensors
4. **Eye dominance**: Account for left/right eye dominance
5. **Blink + Gaze**: Combined interactions using both blink and gaze
6. **Accessibility**: Options for users with different eye conditions

## Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Good support
- **Safari**: Limited support (may need WebGL flags)
- **Mobile**: Limited accuracy due to camera positioning

## Performance
- **CPU Usage**: Moderate (MediaPipe optimization)
- **GPU Usage**: Uses WebGL acceleration when available
- **Memory**: ~50MB additional for MediaPipe models
- **Bandwidth**: ~10MB initial model download

## Troubleshooting

### Common Issues
- **"Failed to initialize gaze detection"**: Check WebGL support and camera permissions
- **Poor accuracy**: Adjust lighting and distance from camera
- **High CPU usage**: Disable debug mode or reduce detection frequency
- **No gaze line visible**: Enable debug mode in gaze detector

### Debug Features
- Set `debugMode: true` in GazeDetector constructor
- Use browser developer tools to check console messages
- Test with standalone `gaze_test.html` page first

## References
- Based on "Eye gaze estimation using a webcam" article
- MediaPipe Face Landmarker documentation
- Computer Vision principles for head pose estimation