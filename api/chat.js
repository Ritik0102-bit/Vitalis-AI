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

        const systemInstructionText = "You are Vitalis AI, a highly advanced, empathetic, and professional health assistant. Analyze the user's symptoms or medical reports (if an image is provided). Provide a well-structured response using semantic HTML formatting (e.g., <br>, <strong>, <ul>, <li>, <h3>, <h4>). Do NOT use markdown (**). Start with a brief, empathetic acknowledgment. Group your analysis into clear sections like <h3>Possible Causes</h3>, <h3>Recommended Actions</h3>, and <h3>When to Seek Immediate Care</h3>. IMPORTANT: Always include a polite disclaimer that you are an AI and this is not professional medical advice. Finally, suggest 2 to 3 short, relevant follow-up questions that the user can ask YOU (the AI) to get more clarity or information. Format each chip exactly like this: [CHIP: Suggestion 1] [CHIP: Suggestion 2].";

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
