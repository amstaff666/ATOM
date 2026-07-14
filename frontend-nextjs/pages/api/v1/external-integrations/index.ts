import type { NextApiRequest, NextApiResponse } from "next";

const externalIntegrations = [
  {
    name: "@annator/piece-gmail",
    displayName: "Gmail",
    logoUrl: "",
    actions: {
      send_email: {
        name: "send_email",
        displayName: "Saada e-kiri",
        description: "Saada kliendile või haldurile e-kiri.",
      },
    },
    triggers: {
      new_email: {
        name: "new_email",
        displayName: "Uus e-kiri",
        description: "Käivita töövoog uue kirja saabumisel.",
      },
    },
  },
  {
    name: "@annator/piece-webhook",
    displayName: "Webhook",
    logoUrl: "",
    actions: {
      call_endpoint: {
        name: "call_endpoint",
        displayName: "Kutsu endpoint",
        description: "Saada andmed välisele teenusele.",
      },
    },
    triggers: {
      incoming_request: {
        name: "incoming_request",
        displayName: "Sissetulev päring",
        description: "Käivita töövoog sissetuleva HTTP päringu peale.",
      },
    },
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json(externalIntegrations);
}
