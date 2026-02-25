// ============================================================
// Vercel Serverless Function — Gemini API Proxy
// Döljer API-nyckeln från klienten.
// Deploy: nyckeln sätts som env-variabel GEMINI_API_KEY i Vercel Dashboard.
// ============================================================

export default async function handler(req, res) {
    // Bara POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY saknas i environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // Modell kan skickas som query-param, default till gemini-2.5-flash
    const model = req.query.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: 'Failed to reach Gemini API' });
    }
}
