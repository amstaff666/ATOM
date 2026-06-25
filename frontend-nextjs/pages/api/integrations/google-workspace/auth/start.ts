import { NextApiRequest, NextApiResponse } from "next";

const PYTHON_API_BASE_URL = process.env.PYTHON_API_SERVICE_BASE_URL || "http://localhost:8000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            // Redirect directly to the backend OAuth initiation endpoint
            // The backend handler will take it from there
            const backendAuthUrl = `${PYTHON_API_BASE_URL}/api/v1/auth/oauth/google/initiate`;
            res.redirect(backendAuthUrl);
        } catch (error) {
            console.error("Failed to initiate Google OAuth:", error);
            res.status(500).json({ error: "Failed to initiate Google OAuth flow" });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
