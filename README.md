# 🏥 Doctor AI - Virtual Medical Assistant

![Doctor AI Banner](https://img.shields.io/badge/Status-Active-success) ![Version](https://img.shields.io/badge/Version-1.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

**Doctor AI** is an advanced virtual health assistant designed to provide immediate, preliminary medical analysis and guidance. Powered by state-of-the-art Large Language Models (LLMs) and computer vision technology, it offers a seamless interface for users to describe symptoms, upload medical images, and receive structured medical advice.

---

## 🚀 Key Features

### 🤖 Intelligent Medical Consultation
- **Advanced LLM Integration**: Uses Groq's high-speed inference engine with Llama 3 models for instant, accurate medical responses.
- **Structured Advice**: Responses are formatted into **Observation**, **Potential Causes**, **Immediate Relief**, and **Recommendations**.

### 👁️ Visual Symptom Analysis
- **Computer Vision**: Upload images of rashes, wounds, or X-rays.
- **Image Recognition**: Automatically analyzes visual symptoms and provides targeted advice.
- **Webcam Support**: Capture images directly within the app.

### 🎙️ Hands-Free Voice Interaction
- **Speech-to-Text**: Speak your symptoms naturally instead of typing.
- **Text-to-Speech (TTS)**: The AI doctor "speaks" its response back to you for a conversational experience.

### 📄 Comprehensive Reports
- **PDF Generation**: Download a complete consultation report with one click.
- **Session History**: Automatically saves your chat history for future reference.

### 👤 Personalized Profile
- **User Health Data**: Stores age, gender, and medical history locally to tailor advice.
- **Privacy First**: All personal data is stored in your browser's local storage, ensuring privacy.

---

## 🛠️ Technology Stack

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (Animations)
- **AI/LLM**: [Groq Cloud API](https://groq.com/) (Llama 3 & Vision Models)
- **State Management**: React Hooks + Local Storage
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📦 Installation & Setup

Follow these steps to run the project locally:

### 1. Clone the Repository
```bash
git clone https://github.com/Rishikesh2621/Doctor-AI.git
cd Doctor-AI
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add your Groq API key:

```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```
> **Note**: You can get a free API key from [Groq Cloud Console](https://console.groq.com/).

### 4. Run the Application
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## ⚠️ Medical Disclaimer

**Doctor AI is an educational and informational tool. It is NOT a substitute for professional medical advice, diagnosis, or treatment.**

- Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
- Never disregard professional medical advice or delay in seeking it because of something you have read on this application.
- In case of a medical emergency, call your local emergency services immediately.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Made with ❤️ by [Rishikesh Thakare](https://github.com/Rishikesh2621)
