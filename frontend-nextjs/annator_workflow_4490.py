from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from urllib.parse import urlparse
def payload_for(path):
    templates = [
        {
            "id": "tpl-pdf-editor-orchestrator",
            "name": "PDF Editor LLM Orchestrator",
            "description": "LLM planeerib PDF töö, valib PDF skillid ja ootab halduri kinnitust.",
            "category": "pdf",
            "skills": ["pdf-ocr", "pdf-editor", "pdf-redaction", "llm-orchestrator"],
            "services": ["ollama", "openclaw", "pdf-orchestrator", "atom-tools"]
        },
        {
            "id": "tpl-bank-statement-flow",
            "name": "Bank Statement Reader Flow",
            "description": "Loeb pangaväljavõtte PDF-ist, teeb OCR/parseri ja riskikontrolli.",
            "category": "finance",
            "skills": ["pdf-ocr", "bank-statement-reader", "llm-orchestrator"],
            "services": ["ollama", "pdf-orchestrator"]
        }
    ]
    workflows = [
        {
            "id": "wf-pdf-editor-llm",
            "name": "PDF Editor LLM Orchestrator",
            "status": "ready",
            "steps": [
                {"id": "input", "type": "trigger", "name": "PDF / prompt input"},
                {"id": "plan", "type": "ai", "name": "LLM plan"},
                {"id": "pdf", "type": "tool", "name": "PDF Orchestrator"},
                {"id": "approval", "type": "approval", "name": "Halduri kinnitus"}
            ],
            "connections": 3
        }
    ]
    services = [
        {"id": "ollama", "name": "Ollama Local LLM", "status": "available", "url": "http://127.0.0.1:11434"},
        {"id": "openclaw", "name": "OpenClaw Gateway", "status": "available", "url": "http://127.0.0.1:18789"},
        {"id": "pdf-orchestrator", "name": "PDF Orchestrator", "status": "connected"},
        {"id": "atom-tools", "name": "ATOM Tools", "status": "connected"}
    ]
    if path.endswith("/api/workflow-templates"):
        return {"ok": True, "templates": templates, "items": templates, "data": templates}
    if path.endswith("/api/workflows/definitions"):
        return {"ok": True, "definitions": workflows, "workflows": workflows, "items": workflows, "data": workflows}
    if path.endswith("/api/workflows/services"):
        return {"ok": True, "services": services, "items": services, "data": services}
    if path.endswith("/api/workflows/executions"):
        return {
            "ok": True,
            "executions": [
                {
                    "id": "exec-demo-001",
                    "workflow_id": "wf-pdf-editor-llm",
                    "status": "mock_ready",
                    "mode": "plan_only"
                }
            ],
            "items": []
        }
    if path.endswith("/healthz") or path.endswith("/api/healthz"):
        return {"ok": True, "status": "healthy", "service": "annator-workflow-4490"}
    return {
        "ok": True,
        "service": "annator-workflow-4490",
        "path": path,
        "templates": templates,
        "workflows": workflows,
        "services": services
    }
class Handler(BaseHTTPRequestHandler):
    def _send(self, code=200, data=None):
        body = json.dumps(data or {}, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_OPTIONS(self):
        self._send(200, {"ok": True})
    def do_GET(self):
        path = urlparse(self.path).path
        self._send(200, payload_for(path))
    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            received = json.loads(raw.decode("utf-8"))
        except Exception:
            received = {}
        data = payload_for(path)
        data["received"] = received
        data["status"] = "mock_completed"
        self._send(200, data)
print("ANNATOR workflow mock service running on http://127.0.0.1:4490")
HTTPServer(("127.0.0.1", 4490), Handler).serve_forever()
