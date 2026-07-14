const workflows = [
  {
    id: "wf-pdf-editor-llm",
    name: "PDF Editor LLM Orchestrator",
    status: "ready",
    category: "pdf",
    description: "LLM planeerib PDF töö, valib skillid ja ootab halduri kinnitust.",
    steps: [
      { id: "input", type: "trigger", name: "PDF või prompt" },
      { id: "plan", type: "ai", name: "LLM planning" },
      { id: "pdf", type: "tool", name: "PDF Orchestrator" },
      { id: "approval", type: "approval", name: "Halduri kinnitus" }
    ],
    connections: 3
  },
  {
    id: "wf-bank-statement-reader",
    name: "Bank Statement Reader",
    status: "ready",
    category: "finance",
    description: "Loeb pangaväljavõtte, teeb riskikontrolli ja koostab tööplaani.",
    steps: [
      { id: "ocr", type: "tool", name: "PDF OCR" },
      { id: "parse", type: "tool", name: "Transaction Parser" },
      { id: "risk", type: "ai", name: "Risk Check" }
    ],
    connections: 2
  }
];
const services = [
  { id: "ollama", name: "Ollama Local LLM", status: "available", url: "http://127.0.0.1:11434" },
  { id: "openclaw", name: "OpenClaw Gateway", status: "available", url: "http://127.0.0.1:18789" },
  { id: "pdf-orchestrator", name: "PDF Orchestrator", status: "connected" },
  { id: "atom-tools", name: "ATOM Tools", status: "connected" },
  { id: "mock-llm", name: "Mock LLM", status: "connected" }
];
const templates = [
  {
    id: "tpl-pdf-editor-orchestrator",
    name: "PDF Editor LLM Orchestrator",
    description: "PDF editor + LLM planner + approval gate.",
    skills: ["pdf-ocr", "pdf-editor", "pdf-redaction", "llm-orchestrator"],
    services: ["ollama", "pdf-orchestrator", "atom-tools"]
  },
  {
    id: "tpl-bank-statement-flow",
    name: "Bank Statement Flow",
    description: "Pangaväljavõtte OCR, parser ja riskikontroll.",
    skills: ["pdf-ocr", "bank-statement-reader", "llm-orchestrator"],
    services: ["ollama", "pdf-orchestrator"]
  }
];
export { workflows, services, templates };
