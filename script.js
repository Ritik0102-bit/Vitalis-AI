document.addEventListener("DOMContentLoaded", () => {
    
    // --- AUTH & LOGIN LOGIC ---
    const loginScreen = document.getElementById('login-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const puterSigninBtn = document.getElementById('puter-signin-btn');
    const userProfileCard = document.getElementById('user-profile-card');
    const displayUserName = document.getElementById('display-user-name');
    const puterSignoutBtn = document.getElementById('puter-signout-btn');
    const toast = document.getElementById("toast");

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // Function to transition to the main app dashboard
    async function showAppDashboard() {
        // Fade out login screen
        loginScreen.style.opacity = '0';
        
        setTimeout(() => {
            loginScreen.style.display = 'none';
            // Trigger the app wrapper entrance animation
            appWrapper.classList.add('loaded');
        }, 500);

        // Fetch User Details from Puter
        try {
            if (typeof puter === 'undefined') return;
            const user = await puter.auth.getUser();
            let customName = await puter.kv.get('preferred_name');
            
            if (customName) {
                displayUserName.textContent = customName;
            } else if (user && user.username) {
                displayUserName.textContent = user.username;
            }
            userProfileCard.style.display = 'block';
        } catch(e) {
            console.error("Could not fetch user profile", e);
        }
    }

    // Initial check on load
    function initAuthCheck() {
        loginScreen.style.display = 'flex'; // Ensure it's shown immediately
        try {
            if (typeof puter === 'undefined') return;
            puter.auth.isSignedIn().then(signedIn => {
                if (signedIn) {
                    showAppDashboard();
                }
            });
        } catch (e) {
            console.error("Auth initialization failed", e);
        }
    }

    // Poll for puter object to be ready to avoid ReferenceError
    const checkPuterInterval = setInterval(() => {
        if (typeof puter !== 'undefined') {
            clearInterval(checkPuterInterval);
            initAuthCheck();
        }
    }, 50);

    // Manual Sign In Button Click
    puterSigninBtn.addEventListener('click', async () => {
        if (typeof puter === 'undefined') {
            showToast("Authentication service is not loaded yet.");
            return;
        }
        const enteredName = document.getElementById('custom-name-input').value.trim();
        try {
            await puter.auth.signIn();
            if (enteredName) {
                await puter.kv.set('preferred_name', enteredName);
            }
            showAppDashboard();
        } catch (e) {
            showToast("Sign in was cancelled or failed.");
        }
    });

    // Manual Sign Out Button Click
    if (puterSignoutBtn) {
        puterSignoutBtn.addEventListener('click', async () => {
            if (typeof puter !== 'undefined') {
                await puter.auth.signOut();
            }
            window.location.reload(); // Quickest way to safely reset dashboard state
        });
    }
    
    // --- EXISTING DASHBOARD LOGIC ---
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
    const themeToggleBtn = document.getElementById("theme-toggle");
    const downloadPdfBtn = document.getElementById("download-pdf");
    const emptyState = document.getElementById("empty-state");

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
    let isLightMode = true;
    let sidebarOpen = false;
    
    let isGenerating = false;
    let currentAbortController = null;

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
            if (isGenerating) return;
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
                if (isGenerating) return;
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
                const painText = `My current pain intensity is ${val}/10.`;
                if (userInput.value.trim() !== "") {
                    userInput.value = userInput.value.trim() + " " + painText;
                } else {
                    userInput.value = painText;
                }
                closeModal(painModal);
                userInput.focus();
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
                if (isGenerating) return;
                userInput.value = chipText;
                suggestionChips.style.display = "none";
                handleSend();
            });
            suggestionChips.appendChild(btn);
        });
    }

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
        return new Promise((resolve) => {
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

            // --- NEW FORMATTING LOGIC ---
            let safeText = String(text || "");
            
            // 1. Fix escaped newlines if they snuck through
            safeText = safeText.replace(/\\n/g, "\n"); 
            
            // 2. Convert markdown bolding
            let parsedText = safeText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            
            // 3. Convert literal newlines to HTML breaks so the UI formats lists properly
            parsedText = parsedText.replace(/\n/g, "<br>");
            // ----------------------------

            if (sender === "bot") {
                chatMessages.appendChild(msgDiv);
                scrollToBottom();
                
                const tokens = parsedText.match(/(<[^>]+>)|([^<]+)/g) || [];
                let currentHTML = content;
                let tokenIndex = 0;
                let wordIndex = 0;
                let words = [];
                
                function type() {
                    if (currentAbortController && currentAbortController.signal.aborted) {
                        scrollToBottom();
                        resolve();
                        return;
                    }
                    if (tokenIndex >= tokens.length) {
                        scrollToBottom();
                        resolve();
                        return;
                    }
                    const token = tokens[tokenIndex];
                    if (token.startsWith('<')) {
                        currentHTML += token;
                        tokenIndex++;
                        type();
                        return;
                    }
                    if (wordIndex === 0) {
                         words = token.match(/\s*\S+\s*/g) || [];
                         if (words.length === 0) {
                             currentHTML += token;
                             tokenIndex++;
                             type();
                             return;
                         }
                    }
                    if (wordIndex < words.length) {
                        currentHTML += words[wordIndex];
                        msgDiv.innerHTML = currentHTML;
                        scrollToBottom();
                        wordIndex++;
                        setTimeout(type, 20); // Sped up slightly for better UX
                    } else {
                        tokenIndex++;
                        wordIndex = 0;
                        type();
                    }
                }
                type();
            } else {
                if (isHTML) {
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
                resolve();
            }
        });
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
        const indicators = document.querySelectorAll(".typing-indicator");
        indicators.forEach(ind => ind.remove());
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

    // --- REWRITTEN BULLETPROOF PUTER API PARSER ---
    async function fetchAiDiagnosis(symptomsText, base64ImageRaw, mimeType, signal) {
        try {
            const selectedLanguage = document.getElementById("language-select") ? document.getElementById("language-select").value : "English";
            
            const systemPrompt = `Persona: You are Vitalis AI, an advanced and empathetic health assistant.
Task: Analyze the provided symptoms or medical reports. If the user's query is NOT related to healthcare, politely and softly decline to answer (e.g., "I am a medical assistant and can only help with health-related queries.").
Context: You provide educational medical information, but never an official diagnosis.
Format: Keep responses highly crisp, concise, and short. You MUST respond EXCLUSIVELY and ENTIRELY in ${selectedLanguage} (do not mix languages). Use HTML for formatting (convert **bold** to <strong>bold</strong>, format lists). Include 1-3 short follow-up prompts strictly in ${selectedLanguage} wrapped in [CHIP: prompt text] at the very end.`;

            let messages = [
                { role: "system", content: systemPrompt }
            ];

            if (base64ImageRaw) {
                let contentArray = [];
                if (symptomsText) {
                    contentArray.push({ type: "text", text: symptomsText });
                } else {
                    contentArray.push({ type: "text", text: "Please analyze the attached image." });
                }
                contentArray.push({
                    type: "image_url",
                    image_url: { url: base64ImageRaw }
                });
                messages.push({ role: "user", content: contentArray });
            } else {
                messages.push({ role: "user", content: symptomsText });
            }

            const abortPromise = new Promise((resolve) => {
                if (signal) {
                    if (signal.aborted) resolve(null);
                    signal.addEventListener('abort', () => resolve(null));
                }
            });

            // Safely execute the API call and catch network failures IMMEDIATELY
            let apiPromise;
            if (typeof puter !== 'undefined' && puter.ai && typeof puter.ai.chat === 'function') {
                apiPromise = puter.ai.chat(messages).catch(e => {
                    console.error("Puter API Error:", e);
                    return { error_fallback: true, message: e.message || String(e) };
                });
            } else {
                apiPromise = Promise.resolve({ error_fallback: true, message: "Puter AI is not loaded." });
            }

            const response = await Promise.race([apiPromise, abortPromise]);

            if (signal && signal.aborted) {
                return null;
            }

            if (response && response.error_fallback) {
                return `<span style='color: #F87171;'><i class='fa-solid fa-triangle-exclamation'></i> Connection Error: ${response.message}</span>`;
            }

            // SMART PARSER: Extracts text from nested arrays/objects
            function parseAiResponse(res) {
                if (typeof res === 'string') {
                    try {
                        let parsed = JSON.parse(res);
                        return parseAiResponse(parsed); 
                    } catch (e) {
                        return res; 
                    }
                }
                if (Array.isArray(res)) {
                    return res.map(block => block.text || '').join('');
                }
                if (typeof res === 'object' && res !== null) {
                    let target = res.content || (res.message && res.message.content) || res.text;
                    if (target) return parseAiResponse(target); 
                    try { return JSON.stringify(res); } catch(e) { return "Unparseable response"; }
                }
                return String(res);
            }

            let responseText = "";

            if (!response) {
                responseText = "I'm sorry, I received an empty response from the server.";
            } else if (typeof response.text === 'function') {
                try {
                    responseText = parseAiResponse(await response.text());
                } catch (e) {
                    responseText = "Error reading response stream.";
                }
            } else {
                responseText = parseAiResponse(response);
            }

            return responseText || "I'm sorry, I couldn't process the diagnosis framework.";

        } catch (error) {
            if (signal && signal.aborted) {
                return null;
            }
            console.error("Critical error in fetchAiDiagnosis:", error);
            return `<span style='color: #F87171;'><i class='fa-solid fa-triangle-exclamation'></i> Critical Connection Error. Please verify your connectivity.</span>`;
        }
    }

    function resetInputState() {
        isGenerating = false;
        currentAbortController = null;
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        sendBtn.title = "Send Message";
        sendBtn.classList.remove("stop-btn");
        
        userInput.disabled = false;
        uploadBtn.disabled = false;
        micBtn.disabled = false;
        userInput.focus();
    }

    async function handleSend() {
        if (isGenerating) return;

        const text = userInput.value.trim();
        const hasImage = currentBase64Image !== null;
        if (text === "" && !hasImage) return;

        isGenerating = true;
        currentAbortController = new AbortController();

        const imageToDisplay = currentBase64Image;
        const attachedMimeType = currentMimeType;

        // Append user message immediately
        addMessage(text, "user", false, imageToDisplay);

        userInput.value = "";
        previewContainer.style.display = "none";
        currentBase64Image = null;
        currentMimeType = null;
        fileInput.value = "";

        userInput.disabled = true;
        uploadBtn.disabled = true;
        micBtn.disabled = true;

        sendBtn.innerHTML = '<i class="fa-solid fa-circle-stop"></i>';
        sendBtn.title = "Stop Generation";
        sendBtn.classList.add("stop-btn");

        addTypingIndicator();

        try {
            let responseHTML = await fetchAiDiagnosis(text, imageToDisplay, attachedMimeType, currentAbortController.signal);
            
            removeTypingIndicator();

            if (responseHTML !== null) {
                // Safely convert to string
                responseHTML = String(responseHTML);
                
                const chipRegex = /\[CHIP:\s*(.*?)\]/g;
                let match;
                let chips = [];
                while ((match = chipRegex.exec(responseHTML)) !== null) {
                    chips.push(match[1]);
                }

                responseHTML = responseHTML.replace(chipRegex, "").trim();

                await addMessage(responseHTML, "bot", true);
                renderChips(chips);
            }
        } catch (error) {
            console.error("Critical error in handleSend:", error);
            removeTypingIndicator();
            await addMessage("A critical application error occurred. Please try again.", "bot", false);
        } finally {
            // This will ALWAYS run, guaranteeing the UI unfreezes!
            resetInputState();
        }
    }

    sendBtn.addEventListener("click", () => {
        if (isGenerating) {
            if (currentAbortController) {
                currentAbortController.abort();
            }
            return; // Return instantly, let handleSend clean up asynchronously
        }
        handleSend();
    });

    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !userInput.disabled && !isGenerating) {
            handleSend();
        }
    });

    clearBtn.addEventListener("click", () => {
        if (isGenerating && currentAbortController) {
            currentAbortController.abort();
        }
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