import Groq from "groq-sdk";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const groq = new Groq({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true // Required for client-side usage
});

export const generateMedicalAdvice = async (text, imageBase64 = null, history = [], userDetails = {}) => {
    if (!API_KEY) {
        throw new Error("API Key is missing. Please check your .env file.");
    }

    try {
        let systemContent = `You are **Dr. AI**, an empathetic and professional virtual medical assistant.`;

        // Add User Context if available
        if (userDetails && (userDetails.name || userDetails.age || userDetails.medicalHistory)) {
            systemContent += `\n\n**PATIENT CONTEXT**:
      - Name: ${userDetails.name || "Unknown"}
      - Age: ${userDetails.age || "Unknown"}
      - Gender: ${userDetails.gender || "Unknown"}
      - Medical History: ${userDetails.medicalHistory || "None provided"}
      
      *Please take this patient context into account when providing advice.*`;
        }

        systemContent += `\n\n**INSTRUCTIONS:**
      1. **For Medical Queries/Symptoms**: strictly follow this structure:
         - **Observation**: Summary of the issue.
         - **Potential Causes**: Possible reasons.
         - **Immediate Relief**: First-aid steps.
         - **Recommendation**: Medical advice (and disclaimer).

      2. **For Image Analysis**: 
         - **If the user provides an image**: Analyze it carefully. 
         - If it shows a medical symptom/issue, use the **Medical Query** structure (Observation, Causes, Relief, Recommendation).
         - If it is a general image, describing it naturally.

      3. **For General Chat/Questions** (e.g., "Hello", "Who are you?", "How does an X-ray work?"): 
         - **Respond naturally** and directly to the question. 
         - **DO NOT** use the medical structure (Observation/Causes/etc.) for general conversation.
         - Be helpful, polite, and engaging.

      **Tone**: Calm, reassuring, and professional. Always prioritize patient safety.`;

        const messages = [
            {
                role: "system",
                content: systemContent
            }
        ];

        // Process history if provided
        // History is expected to be an array of { type: 'user' | 'bot', text: string }
        if (history && history.length > 0) {
            history.forEach(msg => {
                if (msg.text) { // Only add text messages to history for now
                    messages.push({
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    });
                }
            });
        }

        const userContent = [];
        userContent.push({ type: "text", text: `User Query: ${text}` });

        if (imageBase64) {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: imageBase64
                }
            });
        }

        messages.push({
            role: "user",
            content: userContent
        });

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 1024,
            top_p: 1,
            stop: null,
            stream: false
        });

        return completion.choices[0]?.message?.content || "No response received.";
    } catch (error) {
        console.error("Groq API Error Details:", JSON.stringify(error, null, 2));
        const errorMessage = error.message || "Unknown error occurred";
        if (errorMessage.includes("401")) {
            throw new Error("Invalid API Key. Please verify your .env file.");
        } else {
            throw new Error(`Dr. AI is currently overloaded or experiencing a network issue. (${errorMessage})`);
        }
    }
};
