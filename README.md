<div align="center">
  <img src="./assets/vitalis.png" alt="Vitalis AI Banner" width="100%" />
  
  # 🧬 Vitalis AI
  
  **An intelligent, futuristic healthcare assistant powered by a custom fine-tuned Large Language Model (Llama-3).**
  
  [![Powered by Llama 3](https://img.shields.io/badge/Powered%20by-Llama%203-blue?style=for-the-badge)](https://ai.meta.com/llama/)
  [![Hosted on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
  ![GitHub stars](https://img.shields.io/github/stars/Ritik0102-bit/Vitalis-AI?style=for-the-badge)
  ![License](https://img.shields.io/github/license/Ritik0102-bit/Vitalis-AI?style=for-the-badge)
</div>

<br />

Vitalis AI is a clinical-grade, modern healthcare chatbot designed to help users analyze symptoms, interact with medical reports, and receive immediate, AI-driven health insights. Built with a premium glassmorphism UI, it is powered by a custom-trained Llama-3 model specifically fine-tuned on the ChatDoctor dataset, providing highly accurate and empathetic medical advice.

🚀 **Live Demo:** [Available via Vercel Deployment]

---

## 📸 Dashboard Preview

![App Screenshot](./assets/screenshot.png)  

---

## ✨ Core Features

*   🔐 **Secure Authentication:** Google Sign-In powered by Firebase Authentication.
*   🗄️ **User Demographics Data:** Saves and retrieves user profiles (Age, Gender) using NeonDB (Serverless PostgreSQL).
*   🧠 **Custom Healthcare AI:** Powered by a fine-tuned Llama-3 8B model (trained via Unsloth on the ChatDoctor dataset).
*   ☁️ **Serverless Inference:** AI model compressed to GGUF format and hosted 24/7 on Hugging Face Spaces via FastAPI.
*   🧍 **Interactive Body Map:** Pinpoint exactly where it hurts using a clickable SVG human anatomy map.
*   🌡️ **Dynamic Pain Scale:** Log symptom severity with a visual 1-10 slider featuring animated emoji feedback.
*   💬 **Smart Suggestion Chips:** Context-aware follow-up questions generated to guide the conversation.
*   🎤 **Voice Input:** Speak directly to the AI for a hands-free diagnostic experience using the Web Speech API.
*   ⚡ **Quick Action Prompts:** Instantly analyze common issues (Headache, Fever, Cold, etc.) with a single click.
*   🌍 **Multilingual Support:** Chat seamlessly in English, Spanish, French, Hindi, Chinese, or Arabic.
*   🌓 **Dynamic Theme:** Beautiful dark mode (Carbon Black) and a sleek light mode (Porcelain Base) with smooth CSS transitions.
*   🖨️ **Export Session:** Download your entire diagnostic session as a clean, formatted PDF for personal records.

---

## 🛠️ Tech Stack

**Frontend Architecture:**
*   **HTML5 & CSS3:** Semantic markup, CSS Custom Properties (Variables), Glassmorphism, and advanced keyframe animations.
*   **Vanilla JavaScript (ES6+):** Modular DOM manipulation, asynchronous API handling, and event-driven architecture.
*   **Firebase:** Google OAuth Authentication.

**Backend & API:**
*   **Vercel Serverless Functions:** Node.js API routes (`/api/chat`, `/api/saveUser`, `/api/getUser`).
*   **NeonDB:** Serverless PostgreSQL database for persistent user data storage.

**Artificial Intelligence:**
*   **Base Model:** Meta Llama-3 (8 Billion Parameters).
*   **Training & Fine-tuning:** LoRA fine-tuning using Unsloth & Google Colab on the Hugging Face `ChatDoctor` dataset.
*   **Inference Engine:** `llama.cpp` (GGUF compression).
*   **AI Hosting:** Hugging Face Spaces (Docker, FastAPI, Uvicorn) for a free, 24/7 endpoint.

---

## 📂 Project Structure
```text
Vitalis-AI/
├── api/                 # Vercel Serverless Functions (Node.js/Postgres/Fetch)
│   ├── chat.js          # Proxies chat requests to Hugging Face Space
│   ├── getUser.js       # Fetches user demographics from NeonDB
│   └── saveUser.js      # Saves new Google Auth users into NeonDB
├── assets/              # Logos, demo GIFs, and screenshot images
├── index.html           # Main UI dashboard and modal layouts
├── script.js            # Core frontend logic, Firebase Auth, and DOM interactions
├── style.css            # Responsive styles, theme variables, and animations
├── package.json         # Backend dependencies (pg, dotenv)
├── vercel.json          # Deployment configuration (optional)
└── README.md            # Project documentation
```

---

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Ritik0102-bit/Vitalis-AI.git
cd Vitalis-AI
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your credentials:
```env
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require"
CUSTOM_LLM_URL="https://your-huggingface-space.hf.space/chat"
```
*(Also ensure your Firebase config keys are updated in `index.html`).*

### 3. Run Locally (Vercel Dev)
Because this project uses Serverless APIs, you must run it using the Vercel CLI:
```bash
npm i -g vercel
vercel dev
```
The app will be available at `http://localhost:3000`.

### 4. Deploy to Production
To deploy your application publicly:
```bash
vercel --prod
```
*Make sure to add your Environment Variables to the Vercel Dashboard, and whitelist your new Vercel domain in your Firebase Auth settings!*

---

## 💡 Usage Guide
*   **Sign In:** Authenticate securely using the Google Sign-In popup.
*   **Onboarding:** Enter your Age and Gender upon first login (saved to NeonDB).
*   **Describe Symptoms:** Type your symptoms into the chat box, or click the Microphone icon to dictate them.
*   **Visual Tools:** Click the Child Icon for the Body Map or the Thermometer for the pain scale.
*   **Interact:** Receive hyper-accurate, medical-focused responses generated directly from your Custom Llama-3 AI server.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!
Feel free to check out the issues page.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

## ✍️ Author
**Ritik Rana**
* GitHub: [@Ritik0102-bit](https://github.com/Ritik0102-bit)
