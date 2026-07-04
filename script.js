document.addEventListener("DOMContentLoaded", () => {
    
    // --- AUTH & LOGIN LOGIC ---
    const loginScreen = document.getElementById('login-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const userProfileCard = document.getElementById('user-profile-card');
    const displayUserName = document.getElementById('display-user-name');
    const displayUserEmail = document.getElementById('display-user-email');
    const displayUserPhoto = document.getElementById('display-user-photo');
    const displayUserAge = document.getElementById('display-user-age');
    const displayUserGender = document.getElementById('display-user-gender');
    const googleSignoutBtn = document.getElementById('google-signout-btn');
    const toast = document.getElementById("toast");

    // Onboarding Modal Elements
    const onboardingModal = document.getElementById('onboarding-modal');
    const onboardingAge = document.getElementById('onboarding-age');
    const onboardingGender = document.getElementById('onboarding-gender');
    const saveOnboardingBtn = document.getElementById('save-onboarding-btn');

    let currentUser = null;
    let currentChatHistory = [];
    let currentSessionId = crypto.randomUUID();
    
    // UI Elements for Sessions
    const sessionList = document.getElementById('session-list');
    const newChatBtn = document.getElementById('new-chat-btn');

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    async function checkAndShowOnboarding(user) {
        // Fetch age/gender from NeonDB via our Vercel API
        try {
            const response = await fetch(`/api/getUser?id=${user.uid}`);
            if (response.ok) {
                const data = await response.json();
                if (data.age && data.gender) {
                    displayUserAge.textContent = data.age;
                    displayUserGender.textContent = data.gender;
                    return false; // No onboarding needed
                }
            }
        } catch (e) {
            console.error("Error fetching user data", e);
        }
        
        // Show modal if missing data
        onboardingModal.classList.add("active");
        return true;
    }

    saveOnboardingBtn.addEventListener("click", async () => {
        const age = onboardingAge.value;
        const gender = onboardingGender.value;

        if (!age || !gender) {
            showToast("Please fill in both Age and Gender.");
            return;
        }

        if (currentUser) {
            try {
                const response = await fetch('/api/saveUser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: currentUser.uid,
                        name: currentUser.displayName,
                        email: currentUser.email,
                        age: age,
                        gender: gender
                    })
                });
                
                if (response.ok) {
                    displayUserAge.textContent = age;
                    displayUserGender.textContent = gender;
                    onboardingModal.classList.remove("active");
                    showToast("Profile updated successfully!");
                } else {
                    showToast("Failed to save profile.");
                }
            } catch (e) {
                console.error("Error saving user data", e);
                showToast("Connection error while saving.");
            }
        }
    });

    // Function to transition to the main app dashboard
    async function showAppDashboard(user) {
        currentUser = user;
        // Fade out login screen
        loginScreen.style.opacity = '0';
        
        setTimeout(() => {
            loginScreen.style.display = 'none';
            // Trigger the app wrapper entrance animation
            appWrapper.classList.add('loaded');
        }, 500);

        // Populate User Details
        if (user) {
            displayUserName.textContent = user.displayName || "User";
            displayUserEmail.textContent = user.email || "";
            if (user.photoURL) {
                displayUserPhoto.src = user.photoURL;
            }
            userProfileCard.style.display = 'block';
            
            checkAndShowOnboarding(user);
            loadChatHistory(user);
        }
    }

    // Wait for Firebase to initialize then check auth state
    const checkFirebaseInterval = setInterval(() => {
        if (window.firebaseAuth) {
            clearInterval(checkFirebaseInterval);
            
            window.firebaseAuth.onAuthStateChanged(window.firebaseAuth.auth, (user) => {
                if (user) {
                    showAppDashboard(user);
                } else {
                    loginScreen.style.display = 'flex';
                }
            });
        }
    }, 50);

    // Manual Sign In Button Click
    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', async () => {
            if (!window.firebaseAuth) {
                showToast("Authentication service is not loaded yet.");
                return;
            }
            try {
                await window.firebaseAuth.signInWithPopup(window.firebaseAuth.auth, window.firebaseAuth.provider);
                // onAuthStateChanged will handle the dashboard transition
            } catch (error) {
                console.error("Google Sign-In Error:", error);
                showToast("Sign in failed or was cancelled.");
            }
        });
    }

    // Manual Sign Out Button Click
    if (googleSignoutBtn) {
        googleSignoutBtn.addEventListener('click', async () => {
            if (window.firebaseAuth) {
                await window.firebaseAuth.signOut(window.firebaseAuth.auth);
            }
            window.location.reload(); 
        });
    }

    async function loadChatHistory(user) {
        try {
            const response = await fetch(`/api/getHistory?user_id=${user.uid}`);
            if (response.ok) {
                const sessions = await response.json();
                renderSessionList(sessions);
            }
        } catch (e) {
            console.error("Error loading sessions", e);
        }
    }

    function renderSessionList(sessions) {
        if (!sessionList) return;
        sessionList.innerHTML = "";
        if (sessions.length === 0) {
            sessionList.innerHTML = "<p class='text-sm' style='padding: 10px; text-align: center; color: var(--text-muted);'>No past consultations.</p>";
            return;
        }

        sessions.forEach(session => {
            const item = document.createElement("div");
            item.className = "session-item";
            if (session.session_id === currentSessionId) item.classList.add("active");
            
            const date = new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const title = session.title || "New Consultation";
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 4px;">
                        <div class="session-title">${title}</div>
                        <div class="session-date">${date}</div>
                    </div>
                    <div class="session-actions" onclick="event.stopPropagation();">
                        <button class="session-action-btn edit-btn" title="Rename Session"><i class="fa-solid fa-pen"></i></button>
                        <button class="session-action-btn delete-btn" title="Delete Session"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            
            // Delete Logic
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!confirm("Are you sure you want to delete this chat session?")) return;
                try {
                    await fetch('/api/deleteChat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: currentUser.uid, session_id: session.session_id })
                    });
                    if (session.session_id === currentSessionId) startNewSession();
                    loadChatHistory(currentUser);
                } catch (err) { console.error(err); }
            });

            // Rename Logic
            const editBtn = item.querySelector('.edit-btn');
            const titleDiv = item.querySelector('.session-title');
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const input = document.createElement("input");
                input.className = "session-title-input";
                input.value = title;
                titleDiv.replaceWith(input);
                input.focus();

                const saveRename = async () => {
                    const newName = input.value.trim();
                    if (newName && newName !== title) {
                        try {
                            await fetch('/api/renameChat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: currentUser.uid, session_id: session.session_id, session_name: newName })
                            });
                        } catch (err) { console.error(err); }
                    }
                    loadChatHistory(currentUser);
                };

                input.addEventListener("blur", saveRename);
                input.addEventListener("keypress", (ev) => {
                    if (ev.key === "Enter") {
                        ev.preventDefault();
                        input.blur();
                    }
                });
                input.addEventListener("click", ev => ev.stopPropagation());
            });

            item.addEventListener("click", () => {
                document.querySelectorAll(".session-item").forEach(el => el.classList.remove("active"));
                item.classList.add("active");
                fetchSessionMessages(session.session_id);
            });
            
            sessionList.appendChild(item);
        });
    }

    async function fetchSessionMessages(sessionId) {
        if (!currentUser) return;
        currentSessionId = sessionId;
        currentChatHistory = [];
        chatMessages.innerHTML = "";
        if (emptyState) emptyState.style.display = "none";
        
        try {
            const response = await fetch(`/api/getHistory?user_id=${currentUser.uid}&session_id=${sessionId}`);
            if (response.ok) {
                const messages = await response.json();
                for (const msg of messages) {
                    currentChatHistory.push({ role: msg.sender, content: msg.text });
                    
                    const msgDiv = document.createElement("div");
                    msgDiv.classList.add("message");
                    msgDiv.classList.add(msg.sender === "user" ? "user-msg" : "bot-msg");
                    
                    let safeText = String(msg.text || "");
                    safeText = safeText.replace(/\\n/g, "\n"); 
                    let parsedText = safeText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                    parsedText = parsedText.replace(/\n/g, "<br>");
                    
                    msgDiv.innerHTML = parsedText;
                    chatMessages.appendChild(msgDiv);
                }
                scrollToBottom();
            }
        } catch (e) {
            console.error("Error loading session messages", e);
        }
    }

    if (newChatBtn) {
        newChatBtn.addEventListener("click", () => {
            startNewSession();
        });
    }

    function startNewSession() {
        if (isGenerating && currentAbortController) {
            currentAbortController.abort();
        }
        currentSessionId = crypto.randomUUID();
        currentChatHistory = [];
        chatMessages.innerHTML = "";
        
        document.querySelectorAll(".session-item").forEach(el => el.classList.remove("active"));

        if (emptyState) {
            chatMessages.appendChild(emptyState);
            emptyState.style.display = "flex";
            setTimeout(() => { emptyState.style.opacity = "1"; }, 50);
        }
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

    // --- CUSTOM LLM API INTEGRATION ---
    async function fetchAiDiagnosis(symptomsText, base64ImageRaw, mimeType, signal, history) {
        try {
            const selectedLanguage = document.getElementById("language-select") ? document.getElementById("language-select").value : "English";
            
            const payload = {
                message: symptomsText,
                language: selectedLanguage,
                image: base64ImageRaw || null,
                history: history || []
            };

            const abortPromise = new Promise((resolve) => {
                if (signal) {
                    if (signal.aborted) resolve(null);
                    signal.addEventListener('abort', () => resolve(null));
                }
            });

            // We will call our Hugging Face Space directly to bypass Vercel timeouts!
            const apiPromise = fetch('https://ritik0102-vitalis-api.hf.space/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: signal
            }).then(async res => {
                if (!res.ok) {
                    throw new Error("API responded with status: " + res.status);
                }
                // Support both streaming text chunks and standard JSON responses
                const contentType = res.headers.get("content-type") || "";
                if (contentType.includes("text/plain") || contentType.includes("text/event-stream")) {
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder("utf-8");
                    let resultText = "";
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        resultText += decoder.decode(value, { stream: true });
                    }
                    return resultText.trim();
                } else {
                    const data = await res.json();
                    return data.output || data.response;
                }
            }).catch(e => {
                if (e.name === 'AbortError') return null;
                console.error("Custom AI API Error:", e);
                return `<span style='color: #F87171;'><i class='fa-solid fa-triangle-exclamation'></i> Connection Error: ${e.message}</span>`;
            });

            const responseText = await Promise.race([apiPromise, abortPromise]);

            if (signal && signal.aborted) {
                return null;
            }

            return responseText || "I'm sorry, I couldn't process the diagnosis.";

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
        
        currentChatHistory.push({ role: "user", content: text });
        if (currentUser) {
            const isFirstMessage = currentChatHistory.length === 1;
            fetch('/api/saveMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.uid, session_id: currentSessionId, sender: 'user', text: text })
            }).then(() => {
                if (isFirstMessage) loadChatHistory(currentUser); // Refresh session list
            }).catch(e => console.error("Error saving message", e));
        }

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
            let responseHTML = await fetchAiDiagnosis(text, imageToDisplay, attachedMimeType, currentAbortController.signal, currentChatHistory);
            
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
                
                currentChatHistory.push({ role: "assistant", content: responseHTML });
                if (currentUser) {
                    fetch('/api/saveMessage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: currentUser.uid, session_id: currentSessionId, sender: 'assistant', text: responseHTML })
                    }).catch(e => console.error("Error saving message", e));
                }

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
        startNewSession();
        showToast("Session cleared successfully.");
    });
});