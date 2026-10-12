"""Optional local server: python server.py [port]  ->  http://localhost:8000 (only reachable from this computer)"""
import http.server, socketserver, sys, webbrowser
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), http.server.SimpleHTTPRequestHandler) as s:
    print(f"IntelliSpell running at http://localhost:{PORT}  (Ctrl+C to stop)")
    webbrowser.open(f"http://localhost:{PORT}")
    try: s.serve_forever()
    except KeyboardInterrupt: print("\nStopped.")
