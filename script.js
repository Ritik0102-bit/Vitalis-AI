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
    const emptyState = document.getElementById("empty-state");

    // FIX 3: Heart icon as sidebar toggle
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const leftSidebar = document.getElementById("left-sidebar");
    const mobileOverlay = document.getElementById("mobile-overlay");
    const closeSidebarBtn = document.getElementById("close-sidebar-btn");
    const quickPromptBtns = document.querySelectorAll(".quick-prompt-btn");

    const bodyMapBtn = document.getElementById("body-map-btn");
    const bodyMapModal = document.getElementById("body-map-modal");
    const painBtn = document.getElementById("pain-btn");
    const painModal = document.getElementById("pain-slider-modal");
    const closeBtns = document.querySelectorAll(".close-modal-btn");
    const bodyParts = document.querySelectorAll(".body-part");

    const painSlider = document.getElementById("pain-slider");
    const painFace = document.getElementById("pain-face-indicator");
    const painValueText = document.getElementById("pain-value-text");
    const submitPainBtn = document.getElementById("submit-pain-btn");

    const suggestionChips = document.getElementById("suggestion-chips");

    let currentBase64Image = null;
    let currentMimeType = null;
    let isLightMode = false;
    let sidebarOpen = false;

    const apiKey = "";

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // FIX 4: Sidebar toggle — only on mobile/tablet
    function openSidebar() {
        if (window.innerWidth > 1100) return;
        leftSidebar.classList.add("active");
        mobileOverlay.classList.add("active");
        closeSidebarBtn.style.display = "flex";
        sidebarOpen = true;
    }

    function closeSidebar() {
        leftSidebar.classList.remove("active");
        mobileOverlay.classList.remove("active");
        closeSidebarBtn.style.display = "none";
        sidebarOpen = false;
    }

    function toggleSidebar() {
        if (sidebarOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    // FIX 3: Heart icon triggers sidebar on mobile
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
    if (mobileOverlay) mobileOverlay.addEventListener("click", closeSidebar);

    quickPromptBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const presetText = btn.getAttribute("data-text");
            if (!presetText) return;
            if (window.innerWidth <= 1100) closeSidebar();
            userInput.value = presetText;
            handleSend();
        });
    });

    function openModal(modal) { if(modal) modal.classList.add("active"); }
    function closeModal(modal) { if(modal) modal.classList.remove("active"); }

    if (bodyMapBtn) bodyMapBtn.addEventListener("click", () => openModal(bodyMapModal));
    if (painBtn) painBtn.addEventListener("click", () => openModal(painModal));

    if (closeBtns) {
        closeBtns.forEach(btn => {
            btn.addEventListener("click", (e) => closeModal(e.target.closest(".modal-overlay")));
        });
    }

    if (bodyParts) {
        bodyParts.forEach(part => {
            part.addEventListener("click", (e) => {
                const partName = e.target.getAttribute("data-part");
                userInput.value = `I am experiencing pain or symptoms in my ${partName}.`;
                closeModal(bodyMapModal);
                handleSend();
            });
        });
    }

    const faces = ["🙂", "😐", "😕", "😟", "😣", "😖", "😫", "😩", "😭", "🤬"];
    if (painSlider) {
        painSlider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value);
            if(painFace) painFace.textContent = faces[val - 1] || faces[9];
            let severity = "Mild";
            if (val > 3) severity = "Moderate";
            if (val > 6) severity = "Severe";
            if (val > 8) severity = "Excruciating";
            if(painValueText) painValueText.textContent = `Level ${val} (${severity})`;
        });
        if (submitPainBtn) {
            submitPainBtn.addEventListener("click", () => {
                const val = painSlider.value;
                userInput.value = `My current pain intensity is ${val}/10.`;
                closeModal(painModal);
                handleSend();
            });
        }
    }

    function renderChips(chips) {
        if (!suggestionChips) return;
        suggestionChips.innerHTML = "";
        if (!chips || chips.length === 0) {
            suggestionChips.style.display = "none";
            return;
        }
        suggestionChips.style.display = "flex";
        chips.forEach(chipText => {
            const btn = document.createElement("button");
            btn.className = "chip-btn";
            btn.textContent = chipText;
            btn.addEventListener("click", () => {
                userInput.value = chipText;
                suggestionChips.style.display = "none";
                handleSend();
            });
            suggestionChips.appendChild(btn);
        });
    }

    // FIX 1: Instant theme toggle — no lag
    themeToggleBtn.addEventListener("click", () => {
        // Add no-transition class to suppress all transitions instantly
        document.body.classList.add("no-transition");

        isLightMode = !isLightMode;
        if (isLightMode) {
            document.body.classList.add("light-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.remove("light-theme");
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }

        // Remove no-transition after a single frame so future animations work
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.remove("no-transition");
            });
        });
    });

    downloadPdfBtn.addEventListener("click", () => {
        if (chatMessages.children.length === 0 || (chatMessages.children.length === 1 && emptyState)) {
            showToast("The session is empty. Nothing to download!");
            return;
        }
        showToast("Generating PDF... Please wait.");
        const opt = {
            margin: 10,
            filename: 'Vitalis-AI-Diagnoses-Session.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(chatMessages).save().then(() => {
            showToast("PDF downloaded successfully!");
        }).catch((err) => {
            console.error("PDF generation failed:", err);
            showToast("Failed to generate PDF.");
        });
    });

    function addMessage(text, sender, isHTML = false, imageSrc = null) {
        if (emptyState && emptyState.style.display !== "none") {
            emptyState.style.opacity = "0";
            setTimeout(() => emptyState.style.display = "none", 400);
        }

        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message");
        msgDiv.classList.add(sender === "user" ? "user-msg" : "bot-msg");

        let content = "";
        if (imageSrc) {
            content += `<img src="${imageSrc}" class="user-img-attachment">`;
        }

        let parsedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        if (isHTML || sender === "bot") {
            msgDiv.innerHTML = content + parsedText;
        } else {
            if (imageSrc) {
                msgDiv.innerHTML = content;
                msgDiv.appendChild(document.createTextNode(text));
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

        const loaderContainer = document.createElement("div");
        loaderContainer.classList.add("dna-loader");

        for (let i = 0; i < 4; i++) {
            const span = document.createElement("span");
            loaderContainer.appendChild(span);
        }

        indicatorDiv.appendChild(loaderContainer);
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

    uploadBtn.addEventListener("click", () => { fileInput.click(); });

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

    async function fetchAiDiagnosisWithRetry(payload, retries = 5) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const delays = [1000, 2000, 4000, 8000, 16000];

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(res => setTimeout(res, delays[i]));
            }
        }
    }

    async function fetchAiDiagnosis(symptomsText, base64Image, mimeType) {
        try {
            const selectedLanguage = document.getElementById("language-select") ? document.getElementById("language-select").value : "English";

            const parts = [];
            const promptText = `User Language: ${selectedLanguage}\nUser Input: ${symptomsText || "Please analyze the attached image."}`;
            parts.push({ text: promptText });

            if (base64Image && mimeType) {
                const rawBase64 = base64Image.split(',')[1];
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: rawBase64
                    }
                });
            }

            const payload = {
                contents: [{ role: "user", parts: parts }],
                systemInstruction: {
                    parts: [{
                        text: "You are Vitalis AI, a highly advanced, empathetic, and professional health assistant. Analyze the user's symptoms or medical reports (if an image is provided). Provide a well-structured response using semantic HTML formatting (e.g., <br>, <strong>, <ul>, <li>, <h3>, <h4>). Do NOT use markdown (**). Start with a brief, empathetic acknowledgment. Group your analysis into clear sections like <h3>Possible Causes</h3>, <h3>Recommended Actions</h3>, and <h3>When to Seek Immediate Care</h3>. IMPORTANT: Always include a polite disclaimer that you are an AI and this is not professional medical advice. Finally, suggest 2 to 3 short, relevant follow-up actions or questions for the user as chips at the very end of your response. Format each chip exactly like this: [CHIP: Suggestion 1] [CHIP: Suggestion 2]."
                    }]
                }
            };

            const data = await fetchAiDiagnosisWithRetry(payload);
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (replyText) {
                return replyText;
            } else {
                return "I'm sorry, I couldn't formulate a diagnosis framework.";
            }

        } catch (error) {
            console.error("Error making API request:", error);
            return "<span style='color: #F87171;'><i class='fa-solid fa-triangle-exclamation'></i> Connection Error. The AI brain is currently unreachable. Please verify your connection or API configuration.</span>";
        }
    }

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

        let responseHTML = await fetchAiDiagnosis(text, imageToDisplay, attachedMimeType);

        const chipRegex = /\[CHIP:\s*(.*?)\]/g;
        let match;
        let chips = [];
        while ((match = chipRegex.exec(responseHTML)) !== null) {
            chips.push(match[1]);
        }

        responseHTML = responseHTML.replace(chipRegex, "").trim();

        removeTypingIndicator();
        addMessage(responseHTML, "bot", true);
        renderChips(chips);

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
            if(emptyState) {
                chatMessages.appendChild(emptyState);
                emptyState.style.display = "flex";
                setTimeout(() => { emptyState.style.opacity = "1"; }, 50);
            }
            setTimeout(() => {
                showToast("Session reset successfully.");
            }, 300);
        }, 300);
    });
});