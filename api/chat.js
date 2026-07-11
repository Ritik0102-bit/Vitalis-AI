module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, input, language, image, history } = req.body;
  const userMessage = (message || input || "").trim();

  if (!userMessage && !image) {
    return res.status(400).json({ error: "No message provided." });
  }

  const targetLang = language || "English";

  // Check API keys: Prioritize GROQ_API_KEY, or CUSTOM_LLM_API_KEY if it's a Groq key (gsk_...)
  const groqApiKey = process.env.GROQ_API_KEY || (process.env.CUSTOM_LLM_API_KEY && process.env.CUSTOM_LLM_API_KEY.startsWith('gsk_') ? process.env.CUSTOM_LLM_API_KEY : null);
  const customLlmUrl = process.env.CUSTOM_LLM_URL;
  const customLlmKey = process.env.CUSTOM_LLM_API_KEY;

  // 1. If Groq API Key is available (Alternative 1: High Performance, Zero Timeouts, Free Llama-3 70B)
  if (groqApiKey) {
    try {
      const systemPrompt = `You are Vitalis AI, an advanced, empathetic, and clinical healthcare AI assistant created by Ritik and the Vitalis AI Team. You are powered by extensive medical triage protocols and clinical datasets (such as ChatDoctor and clinical counseling guidelines).

YOUR CLINICAL BEHAVIOR & PROTOCOLS:
1. EMPATHY & CLARITY: Always greet the patient warmly, validate their feelings/symptoms, and explain medical terms cleanly and simply.
2. STRUCTURED TRIAGE: When a patient describes symptoms or asks health questions, structure your answer clearly:
   - **Potential Considerations**: Discuss possible causes (from common benign issues to conditions requiring closer monitoring).
   - **Key Questions**: Ask 2-3 targeted clarifying questions (e.g., duration, severity, fever, accompanying symptoms).
   - **Self-Care / Home Relief**: Suggest safe, evidence-based home comfort or lifestyle measures for mild symptoms if appropriate.
   - **When to Seek Immediate Medical Attention**: Highlight critical "red flag" symptoms that require emergency care or a doctor's visit.
3. LANGUAGE REQUIREMENT: The user wants to communicate in ${targetLang}. You MUST respond EXCLUSIVELY, fluently, and naturally in ${targetLang}.
4. INTERACTIVE SUGGESTION CHIPS: At the very end of your response, on a new line, ALWAYS provide exactly 2 or 3 relevant, brief follow-up questions formatted strictly as:
[CHIP: Option 1 text] [CHIP: Option 2 text] [CHIP: Option 3 text]
Example in English: [CHIP: What home remedies help?] [CHIP: Should I see a doctor today?] [CHIP: Explain differential diagnosis]
If replying in another language, translate the chip text to ${targetLang} as well.
5. SAFETY DISCLAIMER: Always remind the patient that your guidance is for educational and clinical triaging purposes and they should consult a qualified healthcare professional for official medical diagnosis or prescriptions.`;

      // Format conversation history for Groq OpenAI-compatible format
      const formattedMessages = [{ role: "system", content: systemPrompt }];

      if (Array.isArray(history)) {
        for (const item of history) {
          const role = (item.role === "assistant" || item.sender === "bot" || item.sender === "assistant") ? "assistant" : "user";
          const content = item.content || item.text || "";
          if (content.trim()) {
            formattedMessages.push({ role, content });
          }
        }
      }

      // Add the current user input
      let finalContent = userMessage;
      if (image) {
        finalContent += `\n[Note: The user attached a medical image/scan to this consultation.]`;
      }
      formattedMessages.push({ role: "user", content: finalContent });

      const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: formattedMessages,
          temperature: 0.5,
          max_tokens: 1024
        })
      });

      if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        console.error("Groq API Error:", groqResponse.status, errText);
        throw new Error(`Groq API returned status ${groqResponse.status}`);
      }

      const groqData = await groqResponse.json();
      const outputText = groqData.choices?.[0]?.message?.content || "I apologize, but I could not generate a response right now. Please try again.";

      return res.status(200).json({ response: outputText, output: outputText });
    } catch (err) {
      console.error("Error calling Groq API:", err);
      return res.status(500).json({ error: "Failed to communicate with Vitalis AI Brain (Groq API)." });
    }
  }

  // 2. Fallback: If using a Custom LLM endpoint that is NOT the old broken Hugging Face Space
  if (customLlmUrl && !customLlmUrl.includes("ritik0102-vitalis-api.hf.space")) {
    try {
      const response = await fetch(customLlmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customLlmKey ? { 'Authorization': `Bearer ${customLlmKey}` } : {})
        },
        body: JSON.stringify({ 
          input: userMessage, 
          message: userMessage,
          language: targetLang,
          image: image,
          history: history || []
        })
      });

      if (!response.ok) {
        throw new Error(`Custom LLM returned status ${response.status}`);
      }

      const data = await response.json();
      let finalOutput = data.output || data.response;
      if (finalOutput) {
        finalOutput = finalOutput.replace(/Chat Doctor/gi, "Vitalis AI");
        finalOutput = finalOutput.replace(/ChatDoctor/gi, "Vitalis AI");
      }
      return res.status(200).json({ response: finalOutput, output: finalOutput });
    } catch (err) {
      console.error("Error calling Custom LLM URL:", err);
      return res.status(500).json({ error: "Failed to connect to Custom LLM." });
    }
  }

  // 3. If no valid API key is configured yet, provide clear, step-by-step instructions
  return res.status(200).json({ 
    response: `[Vitalis AI System Setup Required]\n\nWelcome to your custom **Vitalis AI** chatbot brain! To enable instant **500+ tokens/second** Llama-3 70B medical triaging without timeouts (Alternative 1):\n\n1. Get your **100% Free API Key** at [console.groq.com/keys](https://console.groq.com/keys).\n2. Add the environment variable to Vercel Project Settings (or local \`.env\` file):\n   - **Variable Name:** \`GROQ_API_KEY\`\n   - **Value:** \`gsk_...\` (your key)\n3. Redeploy on Vercel or restart your local server.\n\n*(You sent: "${userMessage}")*`,
    output: `[Vitalis AI System Setup Required]\n\nWelcome to your custom **Vitalis AI** chatbot brain! To enable instant **500+ tokens/second** Llama-3 70B medical triaging without timeouts (Alternative 1):\n\n1. Get your **100% Free API Key** at [console.groq.com/keys](https://console.groq.com/keys).\n2. Add the environment variable to Vercel Project Settings (or local \`.env\` file):\n   - **Variable Name:** \`GROQ_API_KEY\`\n   - **Value:** \`gsk_...\` (your key)\n3. Redeploy on Vercel or restart your local server.\n\n*(You sent: "${userMessage}")*`
  });
};
