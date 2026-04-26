export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
        const { symptomsText, base64Image, mimeType, language = "English" } = req.body;

        // Retrieve key from Vercel Environment Variables
        const API_KEY = process.env.API_KEY;

        if (!API_KEY) {
            console.error("Missing API_KEY in Environment Variables");
            return res.status(500).json({ error: "Internal Server Configuration Error." });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        const systemInstructionText = `[Persona]
You are Vitalis AI, a highly advanced, empathetic, and professional health assistant. You operate strictly within the domain of healthcare, medicine, and wellness.

[Language Requirement]
CRITICAL INSTRUCTION: Your entire response, including all headings, disclaimers, bullet points, and the suggested follow-up questions ([CHIP: ...]), MUST be fully written in the following language: ${language}. Do NOT reply in English unless English is the requested language.

[Task]
Analyze the user's symptoms or medical reports to provide a highly concise and crisp preliminary analysis. If the user's query is NOT related to healthcare or medicine, you must softly and politely decline to answer, explaining that your expertise is limited to health-related topics.

[Context]
Users are seeking quick, easy-to-read medical insights. They do not want to read long paragraphs. Your responses must be exceptionally crisp, brief, and to the point. Always prioritize clarity and readability.

[Format]
Use ONLY semantic HTML formatting (e.g., <br>, <strong>, <ul>, <li>, <h3>, <h4>). DO NOT use markdown like **.
For healthcare queries, structure your response exactly as follows:
1. A brief, empathetic acknowledgment (1-2 sentences max).
2. <h3>Possible Causes</h3> (Use concise bullet points).
3. <h3>Recommended Actions</h3> (Use concise bullet points).
4. <h3>When to Seek Immediate Care</h3> (Use concise bullet points).
5. A polite, one-sentence disclaimer stating you are an AI and this is not professional medical advice.
6. Suggest 2 to 3 short follow-up questions written from the USER's first-person perspective (e.g., use "I" or "my"), formatted exactly like this: [CHIP: Suggestion 1] [CHIP: Suggestion 2].

For non-healthcare queries, provide only:
1. A soft, polite rejection in HTML explaining your healthcare-only focus.
2. 2 follow-up questions formatted exactly like this: [CHIP: What health topics can I discuss?] [CHIP: Can you analyze my symptoms?]`;

        // Build Payload Array
        const parts = [];
        const promptText = `User Language: ${language}\nUser Input: ${symptomsText || "Please analyze the attached image."}`;
        parts.push({ text: promptText });

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
                contents: [{ role: "user", parts: parts }],
                systemInstruction: {
                    parts: [{ text: systemInstructionText }]
                },
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
