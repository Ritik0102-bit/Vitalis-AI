document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const clearBtn = document.getElementById("clear-chat");
    const uploadBtn = document.getElementById("upload-btn");
    const fileInput = document.getElementById("file-input");
    const micBtn = document.getElementById("mic-btn");
    const previewContainer = document.getElementById("preview-container");
    const imagePreview = document.getElementById("image-preview");
    const removeImageBtn = document.getElementById("remove-image");
    const toast = document.getElementById("toast");
    const themeToggleBtn = document.getElementById("theme-toggle");
    const downloadPdfBtn = document.getElementById("download-pdf");

    // Existing API Key (Preserved for user)
    const API_KEY = "AIzaSyCbO9rg06monO_rS4x_B1gqaY4dKfE58vw";

    let currentBase64Image = null;
    let currentMimeType = null;
    let isLightMode = false;

    // Toast Notification helper
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // Initial greeting
    setTimeout(() => {
        addTypingIndicator();
        setTimeout(() => {
            removeTypingIndicator();
            addMessage("Systems initialized. 🧬 I am **Vitalis**, your advanced health AI. You can type your symptoms, use your microphone to speak, or upload a medical report for me to analyze.", "bot");
        }, 1200);
    }, 500);

    /* -------------------------------------
       THEME TOGGLE LOGIC
       ------------------------------------- */
    themeToggleBtn.addEventListener("click", () => {
        isLightMode = !isLightMode;
        if (isLightMode) {
            document.body.classList.add("light-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.remove("light-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });

    /* -------------------------------------
       PDF DOWNLOAD LOGIC (html2pdf)
       ------------------------------------- */
    downloadPdfBtn.addEventListener("click", () => {
        if (chatMessages.children.length === 0) {
            showToast("The session is empty. Nothing to download!");
            return;
        }
        
        showToast("Generating PDF... Please wait.");
        
        // We configure html2pdf
        const opt = {
            margin:       10,
            filename:     'Vitalis-AI-Diagnoses-Session.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Target the chat messages container to convert
        html2pdf().set(opt).from(chatMessages).save().then(() => {
            showToast("PDF downloaded successfully!");
        }).catch((err) => {
            console.error("PDF generation failed:", err);
            showToast("Failed to generate PDF.");
        });
    });

    /* -------------------------------------
       UI MESSAGE HELPER
       ------------------------------------- */
    function addMessage(text, sender, isHTML = false, imageSrc = null) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message");
        msgDiv.classList.add(sender === "user" ? "user-msg" : "bot-msg");
        
        let content = "";
        if (imageSrc) {
            content += `<img src="${imageSrc}" class="user-img-attachment">`;
        }
        
        // Quickly parse bold text natively for the intro msg without needing a markdown library
        let parsedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        if (isHTML || sender === "bot") {
            // Because our bot logic also returns parsed HTML, we allow it here.
            msgDiv.innerHTML = content + parsedText;
        } else {
            if (imageSrc) {
                msgDiv.innerHTML = content;
                const textNode = document.createTextNode(text);
                msgDiv.appendChild(textNode);
            } else {
                msgDiv.textContent = text;
            }
        }
        
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function addTypingIndicator() {
        const indicatorDiv = document.createElement("div");
        indicatorDiv.classList.add("message", "bot-msg", "typing-indicator");
        indicatorDiv.id = "typing";
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement("div");
            dot.classList.add("typing-dot");
            indicatorDiv.appendChild(dot);
        }
        chatMessages.appendChild(indicatorDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById("typing");
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /* -------------------------------------
       VOICE RECOGNITION (Web Speech API)
       ------------------------------------- */
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value += (userInput.value ? " " : "") + transcript;
            micBtn.classList.remove("recording");
        };

        recognition.onerror = (event) => {
            showToast("Microphone error: " + event.error);
            micBtn.classList.remove("recording");
        };

        recognition.onend = () => {
            micBtn.classList.remove("recording");
        };
    }

    micBtn.addEventListener("click", () => {
        if (!recognition) {
            showToast("Voice input is not supported in this browser.");
            return;
        }
        if (micBtn.classList.contains("recording")) {
            recognition.stop();
        } else {
            recognition.start();
            micBtn.classList.add("recording");
            showToast("Listening...");
        }
    });

    /* -------------------------------------
       FILE UPLOAD & PREVIEW LOGIC
       ------------------------------------- */
    uploadBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast("Please upload an image file (PNG, JPG, WEBP).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            currentBase64Image = event.target.result;
            currentMimeType = file.type;
            imagePreview.src = currentBase64Image;
            previewContainer.style.display = "flex";
        };
        reader.readAsDataURL(file);
    });

    removeImageBtn.addEventListener("click", () => {
        currentBase64Image = null;
        currentMimeType = null;
        previewContainer.style.display = "none";
        fileInput.value = "";
    });

    /* -------------------------------------
       GEMINI API INTEGRAION (Multimodal)
       ------------------------------------- */
    async function fetchAiDiagnosis(symptomsText, base64Image, mimeType) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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

        // Build Payload
        const parts = [{ text: promptText }];
        
        if (base64Image && mimeType) {
            const b64Data = base64Image.split(',')[1];
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: b64Data
                }
            });
        }

        try {
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
                console.error("API response error:", errData);
                return "<span style='color: #ef4444;'>Connection Error. The AI brain is currently unreachable.</span>";
            }

            const data = await response.json();
            
            if (data && data.candidates && data.candidates.length > 0) {
                let aiResponse = data.candidates[0].content.parts[0].text;
                aiResponse = aiResponse.replace(/```html/gi, "").replace(/```/gi, "").trim();
                return aiResponse;
            } else {
                return "I'm sorry, I couldn't formulate a diagnosis.";
            }

        } catch (error) {
            console.error("Error making API request:", error);
            return "<span style='color: #ef4444;'>Network error: Unable to reach the API server.</span>";
        }
    }

    /* -------------------------------------
       MESSAGE SEND LOGIC
       ------------------------------------- */
    async function handleSend() {
        const text = userInput.value.trim();
        const hasImage = currentBase64Image !== null;
        
        if (text === "" && !hasImage) return;

        const imageToDisplay = currentBase64Image;
        const attachedMimeType = currentMimeType;

        addMessage(text, "user", false, imageToDisplay);
        
        userInput.value = "";
        previewContainer.style.display = "none";
        currentBase64Image = null;
        currentMimeType = null;
        fileInput.value = "";
        
        userInput.disabled = true;
        sendBtn.disabled = true;
        uploadBtn.disabled = true;
        micBtn.disabled = true;

        addTypingIndicator();

        const responseHTML = await fetchAiDiagnosis(text, imageToDisplay, attachedMimeType);
        
        removeTypingIndicator();
        addMessage(responseHTML, "bot", true);

        userInput.disabled = false;
        sendBtn.disabled = false;
        uploadBtn.disabled = false;
        micBtn.disabled = false;
        userInput.focus();
    }

    sendBtn.addEventListener("click", handleSend);
    
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !userInput.disabled) {
            handleSend();
        }
    });

    clearBtn.addEventListener("click", () => {
        const msgs = document.querySelectorAll('.message');
        msgs.forEach(msg => {
            msg.style.transform = "scale(0)";
            msg.style.opacity = "0";
            msg.style.transition = "all 0.3s ease";
        });
        
        setTimeout(() => {
            chatMessages.innerHTML = "";
            setTimeout(() => {
                addMessage("Session reset. Vitalis is ready.", "bot");
            }, 300);
        }, 300);
    });
});
