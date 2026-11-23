import http.server, functools, os
# Serves the repo root on 127.0.0.1:8765 for the capture scripts.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(H, directory=ROOT)).serve_forever()
