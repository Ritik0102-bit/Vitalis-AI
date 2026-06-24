module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, language, image, history } = req.body;

  // WARNING: This is a placeholder for your hosted Custom LLM endpoint
  const CUSTOM_LLM_URL = process.env.CUSTOM_LLM_URL;

  if (!CUSTOM_LLM_URL) {
    // If the LLM URL isn't set yet, return a mock response indicating they need to finish Phase 3
    return res.status(200).json({ 
      response: `[System]: Your custom AI is not connected yet. You need to complete Phase 3 to train and host your LLM. You sent: "${message}"` 
    });
  }

  const langMap = {
    "English": "en",
    "Spanish": "es",
    "French": "fr",
    "Hindi": "hi",
    "Chinese": "zh-CN",
    "Arabic": "ar"
  };
  
  const targetCode = langMap[language] || "en";

  // Free, fast translation helper using Google Translate API endpoint
  async function translateText(text, sourceCode, targetCode) {
    if (!text || sourceCode === targetCode) return text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      return data[0].map(x => x[0]).join('');
    } catch (e) {
      console.error("Translation error:", e);
      return text;
    }
  }

  try {
    // 1. Translate user message to English for the LLM
    let englishInput = await translateText(message, targetCode, "en");
    
    // Explicitly force LLM to respond in English
    let finalInput = `Respond EXCLUSIVELY in English. ` + englishInput;

    // Call your own custom LLM API (e.g. RunPod / Hugging Face endpoint)
    const response = await fetch(CUSTOM_LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CUSTOM_LLM_API_KEY}` // If you set one up
      },
      body: JSON.stringify({ 
        input: finalInput, 
        language: "English", // We handle translation manually now
        image: image,
        history: history || []
      })
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok || (contentType && contentType.includes("text/html"))) {
      const text = await response.text();
      console.error("HF API returned an error or HTML:", text.substring(0, 200));
      return res.status(200).json({ response: "The AI server is currently building or waking up. Please wait a few minutes and try again!" });
    }

    const data = await response.json();
    
    // Scrub the "Chat Doctor" training data bias and replace it with Vitalis AI
    let finalOutput = data.output;
    if (finalOutput) {
      finalOutput = finalOutput.replace(/Chat Doctor/gi, "Vitalis AI");
      finalOutput = finalOutput.replace(/ChatDoctor/gi, "Vitalis AI");
    }

    // 2. Translate LLM English response back to user's selected language
    let translatedOutput = await translateText(finalOutput, "en", targetCode);
    
    res.status(200).json({ response: translatedOutput });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to connect to Custom LLM' });
  }
};
