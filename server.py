import http.server
import socketserver
import mimetypes
import sys
import json
import os
import urllib.parse

PORT = 8000
FACES_FILE = "registered_faces.json"
PERMANENT_FACES = {"ashwath", "lavith", "saicharan"}

def load_faces():
    if os.path.exists(FACES_FILE):
        try:
            with open(FACES_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_faces(faces):
    with open(FACES_FILE, 'w') as f:
        json.dump(faces, f)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Force disable caching to prevent "hard refresh" issues
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == '/api/faces':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            faces = load_faces()
            self.wfile.write(json.dumps(faces).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == '/api/faces':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                name = data.get('name')
                descriptor = data.get('descriptor')
                if not name or not descriptor:
                    self.send_error(400, "Bad Request: name and descriptor are required")
                    return
                
                faces = load_faces()
                
                # Check if it's a permanent face update
                if name.lower() in PERMANENT_FACES:
                    self.send_error(403, "Forbidden: Cannot register a permanent face name")
                    return

                # Remove existing if any
                faces = [f for f in faces if f['name'] != name]
                faces.append({'name': name, 'descriptor': descriptor})
                save_faces(faces)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            except Exception as e:
                self.send_error(500, f"Internal Server Error: {str(e)}")
        else:
            self.send_error(404, "File not found")

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path.startswith('/api/faces/'):
            name = urllib.parse.unquote(parsed_path.path.split('/')[-1])
            if name.lower() in PERMANENT_FACES:
                self.send_error(403, "Forbidden: Cannot delete a permanent face")
                return
            
            faces = load_faces()
            new_faces = [f for f in faces if f['name'] != name]
            
            if len(faces) == len(new_faces):
                self.send_error(404, "Face not found")
                return
                
            save_faces(new_faces)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "deleted"}).encode('utf-8'))
        else:
            self.send_error(404, "File not found")

# Force standard MIME types because Windows Registry sometimes corrupts them
mimetypes.init()
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/html', '.html')

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Server started at http://localhost:{PORT}")
    print("Serving files with correct MIME types and no-cache headers.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
