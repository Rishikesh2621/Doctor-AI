import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Mic, Camera, Activity, ShieldCheck, HeartPulse, X, Check, RefreshCcw, Upload, FileUp, Send, User, Bot, Loader2, Volume2, VolumeX, FileDown, Menu } from 'lucide-react';
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from 'framer-motion';
import { generateMedicalAdvice } from './services/groq';
import Sidebar from './components/Sidebar';
import ProfileModal from './components/ProfileModal';

function App() {

    // --- State & Refs ---
    const [isListening, setIsListening] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [imgSrc, setImgSrc] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: 'Hello! I am Dr. AI, your virtual health assistant. How can I help you today? You can speak to me, describe your symptoms, or upload an image.' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [speakingMessageId, setSpeakingMessageId] = useState(null);

    // Profile State
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [userDetails, setUserDetails] = useState({
        name: '',
        age: '',
        gender: '',
        medicalHistory: ''
    });

    // Image Modal State
    const [imageInputText, setImageInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // For viewing full size images
    const [activeInput, setActiveInput] = useState('chat'); // 'chat' or 'modal'
    const activeInputRef = useRef('chat');

    const webcamRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const silenceTimer = useRef(null);
    const latestAutoSubmit = useRef(null);

    // --- Voice Support & TTS ---
    const recognitionRef = useRef(null);
    const synth = window.speechSynthesis;

    // --- Sidebar & Persistence State ---
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    // Default open on desktop (width > 768px)
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

    // Initial Load
    useEffect(() => {
        const storedSessions = localStorage.getItem('doctor_ai_sessions');
        const storedCurrentId = localStorage.getItem('doctor_ai_active_session_id');
        const storedUser = localStorage.getItem('doctor_ai_user_details');

        if (storedUser) {
            setUserDetails(JSON.parse(storedUser));
        }

        if (storedSessions) {
            const parsedSessions = JSON.parse(storedSessions);
            setSessions(parsedSessions);

            if (storedCurrentId && parsedSessions.find(s => s.id === storedCurrentId)) {
                setCurrentSessionId(storedCurrentId);
                const currentSession = parsedSessions.find(s => s.id === storedCurrentId);
                if (currentSession) setMessages(currentSession.messages);
            } else if (parsedSessions.length > 0) {
                // Default to first (most recent) if active ID not found
                setCurrentSessionId(parsedSessions[0].id);
                setMessages(parsedSessions[0].messages);
            } else {
                createNewChat();
            }
        } else {
            createNewChat(); // First time ever
        }
    }, []);

    // Persist Session Updates
    useEffect(() => {
        if (!currentSessionId) return;

        setSessions(prev => {
            const index = prev.findIndex(s => s.id === currentSessionId);
            if (index === -1) return prev; // Should not happen

            // Only update if messages changed
            if (JSON.stringify(prev[index].messages) === JSON.stringify(messages)) return prev;

            const updatedSessions = [...prev];
            updatedSessions[index] = {
                ...updatedSessions[index],
                messages: messages,
                // Update title based on first user message if still default
                title: messages.find(m => m.type === 'user')?.text?.slice(0, 30) || updatedSessions[index].title || "New Consultation",
                timestamp: Date.now() // Update timestamp on activity
            };

            localStorage.setItem('doctor_ai_sessions', JSON.stringify(updatedSessions));
            return updatedSessions;
        });
    }, [messages, currentSessionId]);

    // Save Active ID
    useEffect(() => {
        if (currentSessionId) {
            localStorage.setItem('doctor_ai_active_session_id', currentSessionId);
        }
    }, [currentSessionId]);

    const handleSaveProfile = (details) => {
        setUserDetails(details);
        localStorage.setItem('doctor_ai_user_details', JSON.stringify(details));
    };

    const createNewChat = () => {
        const newSession = {
            id: crypto.randomUUID(),
            title: 'New Consultation',
            timestamp: Date.now(),
            messages: [{ id: 1, type: 'bot', text: 'Hello! I am Dr. AI, your virtual health assistant. How can I help you today? You can speak to me, describe your symptoms, or upload an image.' }]
        };

        // 1. Update Sessions
        setSessions(prev => [newSession, ...prev]);

        // 2. Set Active ID
        setCurrentSessionId(newSession.id);

        // 3. Reset Messages
        setMessages(newSession.messages);

        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const selectChat = (id) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
            setCurrentSessionId(id);
            setMessages(session.messages);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
    };

    const deleteChat = (id) => {
        const updatedSessions = sessions.filter(s => s.id !== id);
        setSessions(updatedSessions);
        localStorage.setItem('doctor_ai_sessions', JSON.stringify(updatedSessions));

        if (id === currentSessionId) {
            if (updatedSessions.length > 0) {
                setCurrentSessionId(updatedSessions[0].id);
                setMessages(updatedSessions[0].messages);
            } else {
                createNewChat();
            }
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);



    useEffect(() => {
        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                // Reset silence timer on every result
                if (silenceTimer.current) clearTimeout(silenceTimer.current);

                let final_transcript = '';
                let interim_transcript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final_transcript += event.results[i][0].transcript;
                    } else {
                        interim_transcript += event.results[i][0].transcript;
                    }
                }

                if (final_transcript) {
                    if (activeInputRef.current === 'chat') {
                        setInputText(prev => prev + (prev ? ' ' : '') + final_transcript);
                    } else if (activeInputRef.current === 'modal') {
                        setImageInputText(prev => prev + (prev ? ' ' : '') + final_transcript);
                    }
                }

                // Set new silence timer (3 seconds)
                silenceTimer.current = setTimeout(() => {
                    recognitionRef.current.stop();
                    setIsListening(false);
                    // Use ref to access latest state logic
                    if (latestAutoSubmit.current) {
                        latestAutoSubmit.current();
                    }
                }, 3000);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = (target = 'chat') => {
        if (isListening) {
            recognitionRef.current?.stop();
            if (silenceTimer.current) clearTimeout(silenceTimer.current);
            setIsListening(false);
        } else {
            setActiveInput(target);
            activeInputRef.current = target;
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    // Keep auto-submit logic fresh
    useEffect(() => {
        latestAutoSubmit.current = () => {
            if (activeInputRef.current === 'chat') {
                // We need to access the LATEST inputText here. 
                // State updates are async, but since the timer is 3s AFTER the last result, state should be settled.
                // However, 'inputText' in this scope is fresh because this useEffect runs on render.
                if (inputText.trim()) {
                    processAI(inputText);
                    setInputText('');
                }
            } else if (activeInputRef.current === 'modal') {
                // For modal, we check if we have an image and text
                if (imgSrc) {
                    analyzeImage();
                }
            }
        };
    });

    useEffect(() => {
        // Pre-load voices to avoid empty list on first usage
        const loadVoices = () => {
            const voices = synth.getVoices();
            if (voices.length > 0) {
                // console.log("Voices loaded");
            }
        };
        loadVoices();
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = loadVoices;
        }
    }, []);

    const speak = (text, messageId = null) => {
        // Cancel any current speech
        synth.cancel();

        // Strip markdown characters and URLS for smoother speech
        // Removes: *, #, _, and [text](link) formats, keeping just the text
        let cleanText = text.replace(/[*#_`]/g, '');
        cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Select a pleasant voice (prefer Google US English or standard English)
        const voices = synth.getVoices();
        const preferredVoice = voices.find(voice =>
            voice.name.includes('Google US English') ||
            voice.name.includes('Samantha') ||
            voice.lang.startsWith('en-US')
        );

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onstart = () => setSpeakingMessageId(messageId);
        utterance.onerror = (e) => {
            console.error("Speech error:", e);
            setSpeakingMessageId(null);
        };

        synth.speak(utterance);
    };

    const stopSpeaking = () => {
        synth.cancel();
        setSpeakingMessageId(null);
    };

    const handleDownloadPDF = async () => {
        try {
            const doc = new jsPDF();
            let yPos = 20; // Start Y position

            // Helper to check page bounds and add new page if needed
            const checkPageBreak = (height = 10) => {
                if (yPos + height > 280) {
                    doc.addPage();
                    yPos = 20; // Reset Y for new page
                    return true;
                }
                return false;
            };

            // Header
            doc.setFontSize(22);
            doc.setTextColor(40, 40, 40);
            doc.text("AI Doctor - Medical Report", 20, yPos);
            yPos += 10;

            // Subheader/Timestamp
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPos);
            yPos += 5;
            doc.line(20, yPos, 190, yPos); // Horizontal line
            yPos += 10;

            // Content - Iterate through all messages
            doc.setFontSize(10);

            for (const msg of messages) {
                // Sender Label
                checkPageBreak(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 51, 102); // Dark blue for headers
                const sender = msg.type === 'user' ? "Patient:" : "Dr. AI:";
                doc.text(sender, 20, yPos);
                yPos += 7;

                // Image Handling
                if (msg.image) {
                    checkPageBreak(80); // Estimate image space
                    try {
                        const imgProps = doc.getImageProperties(msg.image);
                        const pdfWidth = 100; // Fixed width for PDF
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                        doc.addImage(msg.image, 'JPEG', 20, yPos, pdfWidth, pdfHeight);
                        yPos += pdfHeight + 5;
                    } catch (err) {
                        console.error("Error adding image to PDF:", err);
                        doc.setFont("helvetica", "italic");
                        doc.setTextColor(200, 0, 0);
                        doc.text("[Image could not be loaded]", 20, yPos);
                        yPos += 7;
                    }
                }

                // Text Handling
                if (msg.text) {
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(0, 0, 0);

                    // 1. Strip Markdown symbols
                    let cleanText = msg.text.replace(/[*#_`]/g, '');
                    // 2. Strip Emojis & Non-ASCII characters
                    cleanText = cleanText.replace(/[^\x20-\x7E\n]/g, '');

                    const splitText = doc.splitTextToSize(cleanText, 170);
                    const textHeight = splitText.length * 5; // Approx 5 units per line

                    // Check if whole text block fits, otherwise split it?
                    // For simplicity, if it's huge, we might need finer control, but checkPageBreak helps.
                    if (checkPageBreak(textHeight)) {
                        // If we added a page, re-print sender label? Optional. 
                        // For now just continue text on new page.
                    }

                    doc.text(splitText, 20, yPos);
                    yPos += textHeight + 5; // Add some spacing after text
                }

                yPos += 5; // Spacing between messages
            }

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Disclaimer: AI-generated advice. Consult a doctor for serious concerns.', 20, 290);
                doc.text(`Page ${i} of ${pageCount}`, 180, 290);
            }

            // Save the PDF -> triggering download
            doc.save(`DrAI_Complete_Report_${Date.now()}.pdf`);

            // Also try to open it in a new tab for better UX
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');

        } catch (error) {
            console.error("PDF Generation Failed:", error);
            alert("Could not generate PDF. Please ensure the response text is valid.");
        }
    };

    // ---------------------------

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
        setImageInputText(''); // Reset text when new image is captured
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
    };

    const closeCamera = () => {
        setIsCameraOpen(false);
        setImgSrc(null);
    };

    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImgSrc(reader.result);
                setImageInputText(''); // Reset text when new image is uploaded
                setIsCameraOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileUpload = (event) => {
        handleFile(event.target.files[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    // Global Paste Handler
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        handleFile(file);
                        e.preventDefault(); // Prevent default paste behavior if we handled an image
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    // Process message with AI
    const processAI = async (text, image = null) => {
        setIsLoading(true);
        try {
            // Check for image generation request
            const lowerText = text.toLowerCase();
            const isImageGeneration = lowerText.startsWith("generate image") ||
                lowerText.startsWith("generate an image") ||
                lowerText.startsWith("create image") ||
                lowerText.startsWith("create an image") ||
                lowerText.startsWith("draw") ||
                (lowerText.includes("image") && lowerText.includes("generate"));

            if (isImageGeneration) {
                // Extract prompt
                let prompt = text.replace(/generate image|create image|draw|generate an image|create an image/gi, '').trim();
                // If the user just says "generate image" without a prompt, ask for more details? Or just generate something random?
                // Let's assume there is a prompt, if empty, default to "medical illustration"
                if (!prompt) prompt = "medical illustration";

                const encodedPrompt = encodeURIComponent(prompt);
                const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 10000)}&model=flux`;

                // Simulate slight network delay for realism (and to let the image API verify)
                await new Promise(resolve => setTimeout(resolve, 1000));

                const botResponse = {
                    id: Date.now() + 1,
                    type: 'bot',
                    text: `Here is the image you requested: **"${prompt}"**`,
                    generatedImage: imageUrl
                };
                setMessages(prev => [...prev, botResponse]);
                speak(`Here is the image you requested: ${prompt}`, botResponse.id);

            } else {
                // Normal text/vision request
                const response = await generateMedicalAdvice(text, image, messages, userDetails);
                const botResponse = {
                    id: Date.now() + 1,
                    type: 'bot',
                    text: response
                };
                setMessages(prev => [...prev, botResponse]);

                // Auto-speak response
                speak(response, botResponse.id);
            }

        } catch (error) {
            const errorResponse = {
                id: Date.now() + 1,
                type: 'bot',
                text: error.message || "I'm having trouble connecting. Please check your internet or API key."
            };
            setMessages(prev => [...prev, errorResponse]);
            speak("I encountered an error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const analyzeImage = () => {
        if (imgSrc) {
            const description = imageInputText.trim() ? imageInputText : "Analyze this medical image using strict protocols. Identify visible symptoms, potential causes, and suggest immediate first aid.";

            // Add User Image Message
            const newMessage = {
                id: Date.now(),
                type: 'user',
                image: imgSrc,
                text: imageInputText.trim() ? `[Image Analysis Request]: ${imageInputText}` : null
            };
            setMessages(prev => [...prev, newMessage]);

            const imageToAnalyze = imgSrc;
            const textToAnalyze = description;

            // Close Camera and reset
            setIsCameraOpen(false);
            setImgSrc(null);
            setImageInputText('');

            // Call AI
            processAI(textToAnalyze, imageToAnalyze);
        }
    };

    const toggleProfile = () => setShowProfileModal(prev => !prev);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        // Add User Text Message
        const textToSend = inputText;
        const newMessage = { id: Date.now(), type: 'user', text: textToSend };
        setMessages(prev => [...prev, newMessage]);
        setInputText('');

        // Call AI
        processAI(textToSend);
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden">
            <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={createNewChat}
                onSelectChat={selectChat}
                onDeleteChat={deleteChat}
                isOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                onOpenProfile={toggleProfile}
                userName={userDetails.name}
            />
            <div
                className="flex-1 flex flex-col relative h-full w-full overflow-hidden transition-all duration-300"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >

                {/* Background Ambience */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
                </div>

                {/* Header */}
                <header className="flex-none p-4 flex items-center justify-between border-b border-slate-800 z-10 bg-black/80 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        {!isSidebarOpen && (
                            <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                                <Menu className="w-6 h-6" />
                            </button>
                        )}
                        <div
                            className="flex items-center gap-2 text-white font-bold text-xl tracking-wider uppercase cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowAboutModal(true)}
                            title="About Doctor AI"
                        >
                            <Activity className="w-6 h-6" />
                            <span>AI Doctor</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleProfile}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                            title="Edit Profile"
                        >
                            <User className="w-4 h-4 text-slate-300" />
                            <span className="text-xs font-medium text-slate-300 hidden sm:inline">
                                {userDetails.name ? userDetails.name.split(' ')[0] : 'Profile'}
                            </span>
                        </button>
                        {speakingMessageId && (
                            <button
                                onClick={stopSpeaking}
                                className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800 hover:bg-blue-900/60 transition-colors animate-pulse"
                            >
                                <VolumeX className="w-3 h-3" /> <span className="text-xs font-medium">Stop AI Voice</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <p className="text-[10px] text-slate-400 font-medium">PRO MODE</p>
                        </div>
                    </div>
                </header >

                <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 z-10 scroll-smooth">
                    {
                        messages.map(msg => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-[85%] gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div
                                        className={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center flex-shrink-0 ${msg.type === 'user' ? 'bg-slate-700 cursor-pointer hover:bg-slate-600 transition-colors' : 'bg-slate-800'}`}
                                        onClick={() => msg.type === 'user' && toggleProfile()}
                                        title={msg.type === 'user' ? "Edit Profile" : "AI Assistant"}
                                    >
                                        {msg.type === 'user' ? <User className="w-5 h-5 text-slate-300" /> : <Bot className="w-5 h-5 text-white" />}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`p-4 rounded-2xl ${msg.type === 'user' ? 'bg-white text-slate-900 rounded-tr-none' : 'bg-transparent border border-slate-700 text-slate-200 rounded-tl-none'}`}>
                                        {msg.image && (
                                            <img
                                                src={msg.image}
                                                alt="User upload or generated"
                                                className="max-w-sm rounded-lg mb-2 border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setSelectedImage(msg.image)}
                                            />
                                        )}
                                        {msg.text && (
                                            <div className={`leading-relaxed prose prose-sm max-w-none ${msg.type === 'user' ? 'prose-slate' : 'prose-invert'}`}>
                                                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                            </div>
                                        )}
                                        {/* Bot Generated Image */}
                                        {msg.generatedImage && (
                                            <div className="mt-2">
                                                <img
                                                    src={msg.generatedImage}
                                                    alt="AI Generated"
                                                    className="max-w-sm rounded-lg border border-slate-700 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                    onLoad={() => scrollToBottom()}
                                                    onClick={() => setSelectedImage(msg.generatedImage)}
                                                />
                                            </div>
                                        )}
                                        {msg.type === 'bot' && (
                                            <div className="mt-2 flex justify-start gap-2">
                                                {speakingMessageId === msg.id ? (
                                                    <button
                                                        onClick={stopSpeaking}
                                                        className="p-1 rounded-full bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 transition-colors flex items-center gap-1 pr-2"
                                                        title="Stop Speaking"
                                                    >
                                                        <div className="w-2 h-2 bg-current rounded-sm ml-1" />
                                                        <span className="text-xs font-medium">Stop</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => speak(msg.text, msg.id)}
                                                        className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center gap-1 pr-2"
                                                        title="Read Aloud"
                                                    >
                                                        <Volume2 className="w-4 h-4" />
                                                        <span className="text-xs font-medium">Read</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDownloadPDF()}
                                                    className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center gap-1 pl-2 border-l border-slate-700 ml-1"
                                                    title="Download Full Report"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                    <span className="text-xs font-medium">PDF</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    }

                    {
                        isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex w-full justify-start"
                            >
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-none flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        <span className="text-sm text-slate-400">Dr. AI is analyzing...</span>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    }
                    <div ref={chatEndRef} />
                </main >

                {/* Input Area */}
                <footer className="flex-none p-4 bg-black/80 backdrop-blur-md border-t border-slate-800 z-10">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 items-end">

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => toggleListening('chat')}
                                className={`p-3 rounded-xl transition-all ${isListening && activeInput === 'chat' ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                title="Voice Input"
                            >
                                <Mic className="w-5 h-5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsCameraOpen(true)}
                                className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                                title="Open Camera"
                            >
                                <Camera className="w-5 h-5" />
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current.click()}
                                className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                                title="Upload Image"
                            >
                                <Upload className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all flex items-center">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={isListening ? "Listening..." : "Describe symptoms..."}
                                disabled={isLoading}
                                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 p-3 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim() || isLoading}
                                className="p-3 text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </footer>

            </div>

            <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                userDetails={userDetails}
                onSave={handleSaveProfile}
            />

            {/* About Modal */}
            <AnimatePresence>
                {showAboutModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000]"
                            onClick={() => setShowAboutModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
                            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed top-1/2 left-1/2 w-full max-w-lg max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[1001] flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 flex-shrink-0 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Activity className="w-6 h-6 text-primary" />
                                    About Doctor AI
                                </h2>
                                <button onClick={() => setShowAboutModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar p-6 space-y-6 text-slate-300">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                            <Bot className="w-5 h-5 text-primary" /> What is Doctor AI?
                                        </h3>
                                        <p className="text-sm leading-relaxed">
                                            Doctor AI is an advanced virtual health assistant powered by state-of-the-art Large Language Models (LLMs) and computer vision technology. It is designed to provide immediate, preliminary medical analysis and guidance.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                                <Camera className="w-4 h-4 text-accent" /> Visual Analysis
                                            </h4>
                                            <p className="text-xs">
                                                Upload or capture images of visible symptoms (rashes, wounds, X-rays) for instant analysis.
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                                <Mic className="w-4 h-4 text-green-400" /> Voice Support
                                            </h4>
                                            <p className="text-xs">
                                                Hands-free interaction. Speak your symptoms naturally and listen to the AI's response.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-900/50">
                                        <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4" /> Privacy First
                                        </h4>
                                        <p className="text-xs text-blue-300">
                                            Your personal health data (like name and age) is stored <strong>locally on your device</strong>. It is never saved to our servers permanently.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-red-900/20 border border-red-900/50">
                                        <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                                            <HeartPulse className="w-4 h-4" /> Medical Disclaimer
                                        </h4>
                                        <p className="text-xs text-red-300">
                                            Doctor AI is an educational and informational tool. <strong>It is not a substitute for professional medical advice, diagnosis, or treatment.</strong> Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                                        </p>
                                    </div>

                                    <div className="text-center pt-4">
                                        <p className="text-xs text-slate-500">
                                            Version 1.0.0 • Powered by Llama 3 & Groq High-Speed Inference
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Drag Overlay */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center border-4 border-dashed border-primary m-4 rounded-3xl"
                    >
                        <FileUp className="w-24 h-24 text-primary animate-bounce" />
                        <h2 className="text-2xl font-bold text-white mt-4">Drop Image Here</h2>
                        <p className="text-slate-400 mt-2">Release to analyze</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Camera Modal */}
            <AnimatePresence>
                {isCameraOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl"
                        >
                            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                                <span className="text-white font-medium flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-accent" /> Vision Input
                                </span>
                                <button onClick={closeCamera} className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative aspect-video bg-black flex items-center justify-center">
                                {imgSrc ? (
                                    <img src={imgSrc} alt="Captured" className="w-full h-full object-cover" />
                                ) : (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>

                            <div className="p-6 flex justify-center gap-4 bg-slate-900 border-t border-slate-800">
                                {imgSrc ? (
                                    <>
                                        <div className="w-full flex-col gap-3">
                                            {/* Image Description Input */}
                                            <div className="flex gap-2 mb-4 w-full">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleListening('modal')}
                                                    className={`p-3 rounded-xl transition-all flex-shrink-0 ${isListening && activeInput === 'modal' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                                    title="Voice Input"
                                                >
                                                    <Mic className="w-5 h-5" />
                                                </button>
                                                <input
                                                    type="text"
                                                    value={imageInputText}
                                                    onChange={(e) => setImageInputText(e.target.value)}
                                                    placeholder="Describe the problem or symptoms (optional)..."
                                                    className="flex-1 bg-slate-800 rounded-xl border border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary text-white px-4 py-2 placeholder-slate-500"
                                                />
                                            </div>

                                            <div className="flex justify-center gap-4">
                                                <button onClick={retake} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors font-medium">
                                                    <RefreshCcw className="w-4 h-4" /> Retake
                                                </button>
                                                <button onClick={analyzeImage} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/25">
                                                    <Check className="w-4 h-4" /> Analyze
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <button onClick={capture} className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent text-white hover:bg-accent/90 transition-all hover:scale-105 shadow-lg shadow-accent/30">
                                        <div className="w-3 h-3 rounded-full bg-white animate-pulse" /> Capture
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Screen Image Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={selectedImage}
                            alt="Full screen"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

export default App
