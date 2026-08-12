export type AnnatorTodoItem = {
  id: string;
  title: string;
  done: boolean;
};

export type AnnatorTodoSection = {
  id: number;
  title: string;
  items: AnnatorTodoItem[];
};

export const annatorTodo: AnnatorTodoSection[] = [
  {
    id: 1,
    title: "Annator backend / Hugging Face Space",
    items: [
      { id: "1-1", title: "Paranda HF Space build error", done: false },
      { id: "1-2", title: "Kinnita Dockerfile repo juurkaustas", done: false },
      { id: "1-3", title: "Kinnita sdk: docker ja app_port: 7860", done: false },
      { id: "1-4", title: "Tee lokaalne Docker build", done: false },
      { id: "1-5", title: "Smoke test /health", done: false },
      { id: "1-6", title: "Deploy HF Space'i ja kinnita RUNNING", done: false },
    ],
  },
  {
    id: 2,
    title: "Neon",
    items: [
      { id: "2-1", title: "Backend → Neon ühendus", done: false },
      { id: "2-2", title: "Kontrolli users/applications/cases/documents/audit_log/notifications", done: false },
      { id: "2-3", title: "Hoia Neon credentials ainult backendis", done: false },
    ],
  },
  {
    id: 3,
    title: "Kliendi taotlus",
    items: [
      { id: "3-1", title: "POST /api/intake/submit", done: false },
      { id: "3-2", title: "Loo application_id", done: false },
      { id: "3-3", title: "Salvesta klient/case", done: false },
      { id: "3-4", title: "Status SUBMITTED, source aimoneyflow-web", done: false },
    ],
  },
  {
    id: 4,
    title: "Dokumendid",
    items: [
      { id: "4-1", title: "XLSX/PDF/CSV private object storage", done: false },
      { id: "4-2", title: "Neonisse metadata", done: false },
      { id: "4-3", title: "Seo fail application_id külge", done: false },
    ],
  },
  {
    id: 5,
    title: "XLSX parser",
    items: [
      { id: "5-1", title: "Parseeri finantsandmed", done: false },
      { id: "5-2", title: "Puhasta numbrid", done: false },
      { id: "5-3", title: "Salvesta normaliseeritud andmed Neonisse", done: false },
    ],
  },
  {
    id: 6,
    title: "Halduri teavitus",
    items: [
      { id: "6-1", title: "NEW_APPLICATION notification", done: false },
      { id: "6-2", title: "ATOM unread badge", done: false },
      { id: "6-3", title: "Email haldurile", done: false },
      { id: "6-4", title: "Retry ebaõnnestumisel", done: false },
      { id: "6-5", title: "Emaili viga ei katkesta case'i salvestamist", done: false },
    ],
  },
  {
    id: 7,
    title: "ATOM / Annator admin",
    items: [
      { id: "7-1", title: "Admin UI avaneb", done: false },
      { id: "7-2", title: "GET /api/admin/applications", done: false },
      { id: "7-3", title: "Uus case nähtav", done: false },
      { id: "7-4", title: "Case detail, dokumendid ja staatused", done: false },
    ],
  },
  {
    id: 8,
    title: "Õigused",
    items: [
      { id: "8-1", title: "Klient näeb ainult enda case'i", done: false },
      { id: "8-2", title: "Haldur näeb lubatud case'e", done: false },
      { id: "8-3", title: "Admin näeb kogu süsteemi", done: false },
      { id: "8-4", title: "Failid pole public URL-iga", done: false },
    ],
  },
  {
    id: 9,
    title: "Audit",
    items: [
      { id: "9-1", title: "APPLICATION_CREATED", done: false },
      { id: "9-2", title: "APPLICATION_SUBMITTED", done: false },
      { id: "9-3", title: "DOCUMENT_UPLOADED", done: false },
      { id: "9-4", title: "MANAGER_NOTIFIED", done: false },
      { id: "9-5", title: "CASE_OPENED", done: false },
      { id: "9-6", title: "STATUS_CHANGED", done: false },
    ],
  },
  {
    id: 10,
    title: "E2E test",
    items: [
      { id: "10-1", title: "Sünteetiline klient", done: false },
      { id: "10-2", title: "Case Neonisse", done: false },
      { id: "10-3", title: "Dokumendid storage'i", done: false },
      { id: "10-4", title: "XLSX parser", done: false },
      { id: "10-5", title: "Halduri teavitus", done: false },
      { id: "10-6", title: "Case ATOM-is ja audit log olemas", done: false },
    ],
  },
  {
    id: 11,
    title: "Frontend polish",
    items: [
      { id: "11-1", title: "Avaleht", done: false },
      { id: "11-2", title: "Intake UX", done: false },
      { id: "11-3", title: "Dashboard", done: false },
      { id: "11-4", title: "6 panga kontroll", done: false },
      { id: "11-5", title: "AI tulemused", done: false },
    ],
  },
];
