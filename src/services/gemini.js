import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(API_KEY);

export const generateMedicalAdvice = async (text, imageBase64 = null) => {
    if (!API_KEY) {
        throw new Error("API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: imageBase64 ? "gemini-1.5-flash" : "gemini-pro" });

        const prompt = `
      You are **Dr. AI**, an empathetic, professional, and advanced virtual medical assistant. 
      Your goal is to analyze the user's queries or images and provide helpful preliminary health insights, strictly as a first-aid and informational guide.

      **CRITICAL PROTOCOLS:**
      1. **Disclaimer First**: ALways start with a concise disclaimer: *"I am an AI, not a doctor. Please consult a professional for medical advice."*
      2. **Structure**: 
         - **Observation**: Briefly summarize what you see or understand.
         - **Potential Causes**: List 2-3 possible reasons (medical or environmental).
         - **Immediate Relief**: Suggest safe, non-invasive first-aid steps.
         - **Recommendation**: Advise if they should see a doctor immediately.
      3. **Tone**: Be calm, reassuring, professional, and clear. Avoid jargon without explanation.

      User Query: ${text}
      
      ${imageBase64 ? "The user has provided an image for visual analysis. Carefully examine visible symptoms (e.g., redness, swelling, rash)." : ""}
    `;

        let result;
        if (imageBase64) {
            // Extract mime type from data URL (e.g., "data:image/png;base64,...")
            const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
            if (!matches || matches.length < 3) {
                throw new Error("Invalid image format.");
            }

            const mimeType = matches[1];
            const data = matches[2];

            const image = {
                inlineData: {
                    data: data,
                    mimeType: mimeType,
                },
            };
            result = await model.generateContent([prompt, image]);
        } else {
            result = await model.generateContent(prompt);
        }

        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        // Improve error feedback
        const errorMessage = error.message || "Unknown error occurred";
        if (errorMessage.includes("403")) {
            throw new Error("Quota exceeded. Please check your billing or use a new API key.");
        } else if (errorMessage.includes("key")) {
            throw new Error("Invalid API Key. Please verify your .env file.");
        } else {
            throw new Error(`Gemini Error: ${errorMessage}`);
        }
    }
};
