# Blink & Bloom - Bloomlands Garden Game

A calm, health-themed browser game that promotes healthy screen habits through playful interaction. Players use their webcam to detect blinks in real time, with each blink watering plants in their magical garden while encouraging regular look-away breaks.

## 🌱 Game Features

- **Real-time Blink Detection**: Uses face-api.js for accurate blink detection via webcam
- **Interactive Garden**: 10 plant slots that grow from seeds to blooming flowers
- **Health Mechanics**: Plants wilt without regular watering (blinking)
- **Look-Away Breaks**: Manual or automatic breaks that trigger rain effects
- **Session Tracking**: 3-minute game sessions with performance summaries
- **Eye Health Scoring**: Promotes healthy blinking patterns and screen breaks

## 🎮 How to Play

1. **Start a Session**: Click "Start Garden Session" and allow camera access
2. **Blink Naturally**: Each blink waters your plants and helps them grow
3. **Take Breaks**: Use "Take a Look-Away Break" or look away for 3+ seconds
4. **Watch Your Garden**: Keep plants healthy for the full 3-minute session
5. **Review Results**: See your eye health score and garden statistics

## 🛠️ Technical Implementation

### Architecture
- **HTML5**: Semantic structure with game containers and controls
- **CSS3**: Responsive design with plant growth animations
- **Vanilla JavaScript**: Modular ES6 classes for game components
- **face-api.js**: Machine learning library for facial landmark detection

### Key Components

#### BlinkDetector (`js/blinkDetector.js`)
- Initializes face-api.js models for facial landmark detection
- Calculates Eye Aspect Ratio (EAR) for blink detection
- Handles camera stream and real-time processing
- Optimized for performance with configurable detection intervals

#### Garden (`js/garden.js`)
- Manages 10 plant slots with growth stages (seed → bloom)
- Health decay system for realistic plant care mechanics
- Visual effects for watering and rain
- Statistics tracking for session summaries

#### Game (`js/game.js`)
- Main game controller coordinating all systems
- Session management with 3-minute timer
- Look-away break detection and rewards
- Performance metrics and health scoring

### Plant Growth System
```
🌱 → 🌿 → 🍀 → 🌺 → 🌸
Seed  Sprout  Young  Flower  Bloom
```

### Health Mechanics
- Plants start at 100% health
- Health decays 0.5% per second without watering
- Plants wilt at 30% health, die at 0%
- Blinks restore 15% health and chance for growth
- Look-away breaks trigger rain (full restoration + guaranteed growth)

## 🚀 Getting Started

### Prerequisites
- Modern web browser with webcam support
- HTTPS connection (required for camera access)

### Local Development
1. Clone or download the project files
2. Serve files via local HTTP server (required for camera access):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser
4. Allow camera permissions when prompted

### Deployment
Ready for deployment to:
- **itch.io**: Upload as HTML5 game
- **GitHub Pages**: Enable HTTPS for camera access
- **Netlify/Vercel**: Automatic HTTPS deployment
- **Any web hosting**: Ensure HTTPS for camera functionality

## 📁 Project Structure
```
blink-bloom/
├── index.html          # Main game page
├── styles.css          # Game styling and animations
├── js/
│   ├── blinkDetector.js # Blink detection system
│   ├── garden.js        # Garden management
│   └── game.js          # Main game controller
└── README.md           # This file
```

## 🎨 Customization

### Adding Your Own Assets
Replace emoji placeholders in `garden.js`:
```javascript
// Current emoji system
this.plantStages = ['🌱', '🌿', '🍀', '🌺', '🌸'];

// Replace with your sprite images
this.plantStages = [
    '<img src="assets/seed.png">',
    '<img src="assets/sprout.png">',
    '<img src="assets/young.png">',
    '<img src="assets/bloom.png">'
];
```

### Adjusting Game Balance
Key parameters in respective classes:
- `sessionDuration`: Game session length (default: 3 minutes)
- `eyeAspectRatioThreshold`: Blink sensitivity (default: 0.25)
- `healthDecayRate`: Plant health decay speed (default: 0.5%/second)
- `lookAwayDuration`: Break duration (default: 5 seconds)

### Styling Customization
Main CSS variables for theming:
- Garden colors: `#87CEEB` (sky) to `#98FB98` (grass) gradient
- Plant health: `#32CD32` (healthy) to `#FF6347` (unhealthy)
- UI elements: Rounded corners with `border-radius: 15-25px`

## 🔧 Browser Compatibility

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Requirements
- WebRTC support for camera access
- ES6 JavaScript features
- CSS Grid and Flexbox
- Canvas 2D context

## 🎯 Health Benefits

The game promotes:
- **Regular Blinking**: Prevents dry eyes during screen time
- **Conscious Breaks**: Reduces eye strain and mental fatigue
- **Posture Awareness**: Look-away breaks encourage movement
- **Mindful Computing**: Gamifies healthy screen habits

## 🐛 Troubleshooting

### Camera Issues
- Ensure HTTPS connection (required for camera access)
- Check browser camera permissions
- Try refreshing the page if detection stops
- Use good lighting for better face detection

### Performance Issues
- Close other camera-using applications
- Try a different browser if lag occurs
- Reduce browser tab count for better performance

### Detection Issues
- Ensure face is well-lit and centered
- Adjust `eyeAspectRatioThreshold` for sensitivity
- Check console for error messages

## 📝 License

This project is open source and available under the MIT License. Feel free to modify and distribute for your own hackathon projects or educational purposes.

## 🌟 Future Enhancements

Potential additions for extended development:
- Multiple garden themes
- Achievement system
- Daily streak tracking
- Social sharing of garden screenshots
- Accessibility features for users who can't blink normally
- Mobile device support with touch alternatives

---

Built for Health x AI x Gamification hackathons. Promote healthy screen habits through playful interaction! 🌱✨