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
        let promptText = `You are Vitalis, an advanced Medical AI Assistant. 
The patient is reporting the following query/symptoms: "${symptomsText || "Please analyze the attached image."}"

`;
        if (base64Image) {
            promptText += `An image of a medical report, prescription, or relevant health context is attached. First, extract and summarize the key findings or text from the image. Then, provide your medical insights. `;
        }
        
        promptText += `
Please provide your response following these rules:
1. Extract/Analyze Image (if provided)
2. Potential Condition(s): Give a list of likely conditions based on text and image.
3. Precautions & Recommendations: Suggest safe home remedies or immediate steps.
4. Medical Disclaimer.

Use ONLY clean HTML for formatting (<strong>, <ul>, <li>, <br>). No markdown! Make it look like a professional health report.`;

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
