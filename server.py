#!/usr/bin/env python3
"""
Simple HTTP server for testing the Blink & Bloom game with gaze detection
Run with: python server.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys

def main():
    PORT = 8000
    
    # Change to the directory containing the HTML files
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = http.server.SimpleHTTPRequestHandler
    
    # Add CORS headers for MediaPipe
    class CORSHTTPRequestHandler(Handler):
        def end_headers(self):
            self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
            super().end_headers()
    
    try:
        with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
            print(f"🌱 Blink & Bloom server starting at http://localhost:{PORT}")
            print(f"📁 Serving files from: {os.getcwd()}")
            print("\nAvailable pages:")
            print(f"  🎮 Main Game: http://localhost:{PORT}/index.html")
            print(f"  👁️  Gaze Test: http://localhost:{PORT}/gaze_test.html")
            print("\n⚠️  Note: Camera access requires HTTPS in production")
            print("💡 For HTTPS, use: python -m http.server --bind 127.0.0.1 --protocol HTTPS")
            print("\nPress Ctrl+C to stop the server")
            
            # Auto-open browser
            if len(sys.argv) > 1 and sys.argv[1] == '--no-browser':
                pass
            else:
                webbrowser.open(f"http://localhost:{PORT}/index.html")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use")
            print("Try a different port or stop the existing server")
        else:
            print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    main()