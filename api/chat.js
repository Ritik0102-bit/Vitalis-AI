export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
        const { symptomsText, base64Image, mimeType } = req.body;

        // Retrieve key from Vercel Environment Variables
        const API_KEY = process.env.API_KEY;

        if (!API_KEY) {
            console.error("Missing API_KEY in Environment Variables");
            return res.status(500).json({ error: "Internal Server Configuration Error." });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        // Construct the prompt
        let promptText = `**Persona:** You are Vitalis, a highly efficient, empathetic, and professional Medical AI Assistant. Keep your descriptions concise and avoid unnecessary jargon or lengthy paragraphs.
**Context:** The patient is reporting the following symptoms/query: "${symptomsText || "Please analyze the attached image."}"
`;
        if (base64Image) {
            promptText += `Additional Context: An image of a medical document, prescription, or physical symptom is attached.
`;
        }

        promptText += `**Task:** Analyze the provided context. Provide a brief, highly readable, and structured medical assessment.

Please output your response strictly using clean HTML (do not use markdown). Follow this exact structure to ensure it is good-looking and readable:

<div class="vitalis-report">
    ${base64Image ? "<h4>📋 Image Findings</h4><p><em>Brief summary of extracted text or key findings from the image.</em></p>" : ""}
    <h4>🩺 Potential Conditions</h4>
    <ul>
        <li><strong>[Condition Name]:</strong> Brief 1-2 sentence description.</li>
    </ul>
    <h4>🛡️ Actionable Recommendations</h4>
    <ul>
        <li>[Clear, brief, and safe actionable step or home remedy]</li>
    </ul>
    <br>
    <div style="background: rgba(255, 77, 79, 0.1); border-left: 4px solid #ff4d4f; padding: 12px; border-radius: 4px; font-size: 0.9em;">
        <strong>⚠️ Medical Disclaimer:</strong> I am an AI, not a doctor. Please consult a healthcare professional for an accurate diagnosis and treatment.
    </div>
</div>`;

        // Build Payload Array
        const parts = [{ text: promptText }];

        if (base64Image && mimeType) {
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            });
        }

        // Fetch to Google Gemini API
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: parts }],
                generationConfig: { temperature: 0.2 }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error("Gemini API Error:", errData);
            return res.status(response.status).json({ error: "Upstream API Error", details: errData });
        }

        const data = await response.json();

        // Parse the response
        if (data && data.candidates && data.candidates.length > 0) {
            let aiResponse = data.candidates[0].content.parts[0].text;
            // Clean markdown HTML blocks if the LLM adds them
            aiResponse = aiResponse.replace(/```html/gi, "").replace(/```/gi, "").trim();

            // Return back to the client-side frontend
            return res.status(200).json({ reply: aiResponse });
        } else {
            return res.status(500).json({ error: "Empty response from Gemini." });
        }

    } catch (error) {
        console.error("Serverless Function Runtime Error:", error);
        return res.status(500).json({ error: "Internal Server Error." });
    }
}
