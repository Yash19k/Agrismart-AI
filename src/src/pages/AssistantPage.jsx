import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Droplets,
  Sun,
  ShieldAlert,
  HelpCircle,
  X,
  ArrowRight,
  Info,
  Calendar,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Sprout
} from 'lucide-react';

import AppSidebar from '../components/common/AppSidebar';
import AppHeader from '../components/common/AppHeader';
import {
  sendChatMessage,
  getAssistantContext,
  clearAssistantContext,
  getTodayBrief,
  getSuggestedQuestions
} from '../api/assistant';

export default function AssistantPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' | 'gu' | 'hi'
  const [sessionId] = useState(() => 'sess_' + Date.now());

  // Active crop context (Mode B vs Mode A)
  const [cropContext, setCropContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Chat conversation
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorState, setErrorState] = useState(null); // { message, can_retry, can_use_offline, lastQuery }

  // Development inspector
  const [showDevInspector, setShowDevInspector] = useState(false);
  const [lastDevTelemetry, setLastDevTelemetry] = useState(null);

  // Audio / Speech
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll smoothly to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load context on mount (from location.state or backend session)
  useEffect(() => {
    async function initContext() {
      setContextLoading(true);

      // Check if context was passed via navigation state from /disease
      if (location.state?.assessmentContext) {
        const passed = location.state.assessmentContext;
        const normalized = {
          has_disease: true,
          crop: passed.prediction?.cropName || passed.crop || 'Tomato',
          disease: passed.prediction?.diseaseName || passed.disease || 'Early Blight',
          confidence: passed.prediction?.confidence || passed.confidence || 91.4,
          severity: passed.severity?.level || passed.severity || 'Moderate',
          health_score: passed.cropHealth?.score || passed.health_score || 72,
          risk: passed.spreadRisk || { level: 'High', score: 82 },
          weather: passed.weather || {},
          scan_date: passed.analyzedAt || 'Today',
        };
        setCropContext(normalized);

        // If an initial query was passed (e.g. from 1-click button), auto-send
        if (location.state.initialQuery) {
          handleSendMessage(location.state.initialQuery, normalized);
        }
      } else {
        // Fetch from backend
        try {
          const remoteCtx = await getAssistantContext(sessionId);
          if (remoteCtx?.has_disease) {
            setCropContext(remoteCtx);
          } else {
            setCropContext(null); // Mode A
          }
        } catch (err) {
          console.warn('Could not fetch assistant context:', err);
          setCropContext(null);
        }
      }
      setContextLoading(false);
    }

    initContext();
  }, [location.state]);

  // Setup Web Speech API for voice input
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'gu' ? 'gu-IN' : (language === 'hi' ? 'hi-IN' : 'en-IN');

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(transcript);
          setIsRecording(false);
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Voice speech recognition is not supported in this browser.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.lang = language === 'gu' ? 'gu-IN' : (language === 'hi' ? 'hi-IN' : 'en-IN');
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Speech recognition error:', e);
      }
    }
  };

  // Text to Speech playback
  const handleSpeak = (text, idx) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech audio is not supported in this browser.');
      return;
    }
    if (speakingMsgIndex === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'gu' ? 'gu-IN' : (language === 'hi' ? 'hi-IN' : 'en-US');
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingMsgIndex(null);
    utterance.onerror = () => setSpeakingMsgIndex(null);
    setSpeakingMsgIndex(idx);
    window.speechSynthesis.speak(utterance);
  };

  // Clear Context handler (switches to Mode A)
  const handleClearContext = async () => {
    try {
      await clearAssistantContext(sessionId);
    } catch (err) {
      console.warn('Failed to clear context on backend:', err);
    }
    setCropContext(null);
    setMessages((prev) => [
      ...prev,
      {
        role: 'system',
        text: '🌱 Crop assessment context cleared. Operating in General Agricultural Assistant mode.',
      },
    ]);
  };

  // Send message pipeline
  const handleSendMessage = async (textToSend = null, activeCtx = cropContext, allowOffline = false) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    if (!textToSend) setInputValue('');
    setErrorState(null);

    // Append user message
    const userMsg = { role: 'user', text: query, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    setLoadingStage('Analyzing agricultural question...');

    try {
      const response = await sendChatMessage({
        message: query,
        sessionId,
        context: activeCtx,
        language,
        allowOffline,
      });

      // Handle backend Groq unavailable or error states
      if (response?.error) {
        setErrorState({
          error: response.error,
          message: response.message,
          can_retry: response.can_retry,
          can_use_offline: response.can_use_offline,
          lastQuery: query,
        });
        if (response.dev_telemetry) setLastDevTelemetry(response.dev_telemetry);
        setLoading(false);
        return;
      }

      // Record telemetry
      if (response.dev_telemetry) {
        setLastDevTelemetry(response.dev_telemetry);
      }

      const botMsg = {
        role: 'assistant',
        text: response.answer,
        why: response.why || [],
        actions: response.actions || [],
        citations: response.citations || [],
        decisionFactors: response.decision_factors || [],
        modelUsed: response.model_used,
        engine: response.engine,
        offlineNotice: response.offline_notice,
        hasDisease: response.has_disease,
        devTelemetry: response.dev_telemetry,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setErrorState({
        error: 'NETWORK_ERROR',
        message: err.friendlyMessage || 'Unable to communicate with the AgriSmart AI Agronomist server.',
        can_retry: true,
        can_use_offline: true,
        lastQuery: query,
      });
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  // Proactive Today's Farm Brief
  const handleTriggerBrief = async () => {
    handleSendMessage("Please give me today's farm brief and critical action priorities.");
  };

  // What Should I Do Now action
  const handleWhatShouldIDoNow = () => {
    handleSendMessage("What should I do now? Give me an actionable phased farming plan.");
  };

  return (
    <div className="flex h-screen bg-[#f8faf8] text-[#17231B] font-sans antialiased overflow-hidden">
      {/* Unified Navigation Sidebar */}
      <AppSidebar
        activeItem="assistant"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Full-Page Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
        {/* Top Header */}
        <AppHeader
          moduleId="assistant"
          title="🌱 AgriSmart AI Agronomist"
          subtitle="Evidence-backed conversational agricultural decision support"
          onMenuClick={() => setMobileSidebarOpen(true)}
          badgeText="Groq gpt-oss-120b Active"
          badgeType="emerald"
          centerContent={
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('gu')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'gu'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  language === 'hi'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                हिन्दी
              </button>
            </div>
          }
          rightActions={
            <button
              type="button"
              onClick={() => setShowDevInspector(!showDevInspector)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showDevInspector
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title="Toggle Development Telemetry & Model Inspector"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Inspector</span>
            </button>
          }
        />

        {/* Development Telemetry Drawer / Header Bar */}
        {showDevInspector && (
          <div className="bg-slate-900 text-slate-100 px-4 py-2.5 text-xs border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner animate-fadeIn">
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Engine: {lastDevTelemetry?.engine || 'Groq'}
              </span>
              <span className="text-slate-400">|</span>
              <span>Model: <strong className="text-white">{lastDevTelemetry?.model || 'openai/gpt-oss-120b'}</strong></span>
              <span className="text-slate-400">|</span>
              <span>
                Tools: <strong className="text-amber-300">{(lastDevTelemetry?.tools_executed || ['knowledge_rag', 'weather_tool']).join(', ')}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span>RAG Sources: <strong className="text-cyan-300">{lastDevTelemetry?.rag_sources_count ?? 3}</strong></span>
              <span className="text-slate-400">|</span>
              <span>Latency: <strong className="text-emerald-300">{lastDevTelemetry?.latency_ms ? `${lastDevTelemetry.latency_ms} ms` : 'Live'}</strong></span>
            </div>
            <button
              onClick={() => setShowDevInspector(false)}
              className="text-slate-400 hover:text-white text-xs font-bold p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Dynamic Context Indicator Banner (Section 5) ── */}
        <div className="px-4 sm:px-6 py-2.5 bg-emerald-50/70 border-b border-emerald-100/90 flex flex-wrap items-center justify-between gap-3">
          {cropContext?.has_disease ? (
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                Current Crop Context:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className="bg-white border border-emerald-200 px-2.5 py-0.5 rounded-full text-emerald-900 shadow-2xs">
                  🍅 {cropContext.crop}
                </span>
                <span className="bg-white border border-emerald-200 px-2.5 py-0.5 rounded-full text-emerald-900 shadow-2xs">
                  🦠 {cropContext.disease} ({cropContext.confidence}%)
                </span>
                <span className="bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full text-amber-900 shadow-2xs">
                  ⚠️ {cropContext.risk?.level || 'High'} Disease Spread Risk
                </span>
                {cropContext.health_score && (
                  <span className="bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full text-emerald-900 shadow-2xs">
                    💚 Health: {cropContext.health_score}/100
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Mode A: General Agricultural Advisor — No leaf scan active. You can ask anything about crops, irrigation, or prevention.</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {cropContext?.has_disease ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/disease')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors"
                >
                  View Analysis
                </button>
                <button
                  type="button"
                  onClick={handleClearContext}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-gray-600 hover:text-red-700 hover:bg-red-50 border border-gray-200 transition-colors"
                  title="Switch back to General Assistant mode"
                >
                  Clear Context
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/disease')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors flex items-center gap-1"
              >
                <span>Upload Leaf Scan</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── Main Conversation Scroll Area ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-radial from-emerald-50/20 via-white to-[#fbfdfb]">
          {/* Welcome Card when no messages exist */}
          {messages.length === 0 && (
            <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-6">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-7 sm:p-9 shadow-xl border border-emerald-700/60 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 max-w-xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    Powered by Groq · openai/gpt-oss-120b
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {cropContext?.has_disease
                      ? `Your Personal AI Agronomist for ${cropContext.crop}`
                      : "Welcome to AgriSmart AI Agronomist"}
                  </h2>

                  <p className="text-sm text-emerald-100 leading-relaxed font-normal">
                    {cropContext?.has_disease
                      ? `I am continuously analyzing your detected ${cropContext.disease}, live meteorological observations, and disease spread risk to provide evidence-backed management decisions.`
                      : "I am your personal agricultural decision-support companion. Ask me anything about crop cultivation, irrigation schedules, weather impacts, disease symptoms, and pest management."}
                  </p>

                  {/* Proactive Action Buttons */}
                  <div className="pt-2 flex flex-wrap gap-2.5">
                    {cropContext?.has_disease ? (
                      <>
                        <button
                          type="button"
                          onClick={handleWhatShouldIDoNow}
                          className="px-4 py-2 rounded-xl bg-white text-emerald-950 text-xs font-black hover:bg-emerald-50 transition-all shadow-sm flex items-center gap-2 active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>🌱 What should I do now?</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTriggerBrief}
                          className="px-4 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-bold border border-emerald-500/40 transition-all flex items-center gap-2"
                        >
                          <Sun className="w-3.5 h-3.5 text-amber-300" />
                          <span>🌅 Today's Farm Brief</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendMessage("How often should tomatoes generally be watered?")}
                          className="px-4 py-2 rounded-xl bg-white text-emerald-950 text-xs font-black hover:bg-emerald-50 transition-all shadow-sm flex items-center gap-2"
                        >
                          <Droplets className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tomato watering frequency</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendMessage("How can I prevent fungal leaf diseases in field crops?")}
                          className="px-4 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-bold border border-emerald-500/40 transition-all flex items-center gap-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                          <span>Prevent fungal diseases</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sample Guidance Questions Grid */}
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  {cropContext?.has_disease ? "Recommended Inquiries for this Diagnosis:" : "Common Agricultural Inquiries:"}
                </span>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {(cropContext?.has_disease
                    ? [
                        "Should I irrigate my crop today?",
                        "Why is the disease spread risk high?",
                        "What if it rains in the next 24 hours?",
                        "Can I apply organic Trichoderma or copper spray?",
                      ]
                    : [
                        "How often should tomatoes generally be watered?",
                        "What should I check in the soil before watering?",
                        "How can I prevent fungal disease spread in humidity?",
                        "What are common symptoms of foliar leaf blight?",
                      ]
                  ).map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="p-3 rounded-2xl border border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition-all group flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-900">
                        {q}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-700 transition-transform group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, index) => (
              <React.Fragment key={index}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-tr-none px-4 sm:px-5 py-3 bg-emerald-800 text-white shadow-sm font-semibold text-sm leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : msg.role === 'system' ? (
                  <div className="flex justify-center my-2">
                    <div className="px-4 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
                      <Bot className="w-4 h-4" />
                    </div>

                    <div className="flex-1 space-y-3 max-w-[90%]">
                      {/* Main Answer Bubble */}
                      <div className="bg-white rounded-3xl rounded-tl-none p-5 sm:p-6 border border-gray-200 shadow-sm space-y-4">
                        {msg.offlineNotice && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                            <span>{msg.offlineNotice}</span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-normal text-gray-800 leading-relaxed whitespace-pre-line">
                            {msg.text}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSpeak(msg.text, index)}
                            className="text-gray-400 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0"
                            title={speakingMsgIndex === index ? "Stop audio" : "Listen (Text-to-Speech)"}
                          >
                            {speakingMsgIndex === index ? (
                              <VolumeX className="w-4 h-4 text-emerald-700 animate-pulse" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Explainability / Telemetry: "Why am I seeing this?" (Section 21 & 22) */}
                        {msg.why?.length > 0 && (
                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-emerald-700" />
                              Why this recommendation? (Decision Factors)
                            </span>
                            <ul className="space-y-1.5 pl-2">
                              {msg.why.map((bullet, bIdx) => (
                                <li key={bIdx} className="text-xs text-gray-700 font-medium flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 4-Phase Action Plan (Section 20) */}
                        {msg.actions?.length > 0 && (
                          <div className="pt-3 border-t border-gray-100 space-y-2.5">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              Action Plan Timeline:
                            </span>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {msg.actions.map((act, aIdx) => {
                                const phaseStr = act.phase || 'Action';
                                const isNow = phaseStr.toLowerCase().includes('now');
                                const is24h = phaseStr.toLowerCase().includes('24');
                                const isDays = phaseStr.toLowerCase().includes('3');
                                return (
                                  <div
                                    key={aIdx}
                                    className={`p-3 rounded-2xl border text-xs font-medium space-y-1 ${
                                      isNow
                                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                                        : is24h
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                        : isDays
                                        ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                    }`}
                                  >
                                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                                      {phaseStr}
                                    </span>
                                    <p className="leading-snug">{act.action}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Verifiable Citations & Sources (Section 12 & 13) */}
                        {msg.citations?.length > 0 && (
                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                              📚 Verified Evidence Sources ({msg.citations.length}):
                            </span>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {msg.citations.map((c, cIdx) => (
                                <a
                                  key={cIdx}
                                  href={c.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-all flex flex-col justify-between group"
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                                      <span>{c.source}</span>
                                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-emerald-700" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-900 mt-1 line-clamp-2 leading-snug">
                                      {c.title}
                                    </p>
                                  </div>
                                  <span className="text-[10px] text-emerald-700 font-bold mt-2 inline-flex items-center gap-1 group-hover:underline">
                                    View official source →
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Engine Tag */}
                      <div className="px-2 flex items-center justify-between text-[10px] font-semibold text-gray-400">
                        <span>Engine: {msg.engine === 'groq' ? `Groq (${msg.modelUsed})` : 'Offline Rules'}</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Error State Banner with Retry & Offline Guidance buttons (Section 36) */}
            {errorState && (
              <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>⚠️ AI Assistant Temporarily Unavailable</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-normal">
                  {errorState.message}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {errorState.can_retry && (
                    <button
                      type="button"
                      onClick={() => handleSendMessage(errorState.lastQuery)}
                      className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-all shadow-2xs"
                    >
                      Retry Groq
                    </button>
                  )}
                  {errorState.can_use_offline && (
                    <button
                      type="button"
                      onClick={() => handleSendMessage(errorState.lastQuery, cropContext, true)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all"
                    >
                      View Offline Guidance
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Meaningful Loading State (Section 37) */}
            {loading && (
              <div className="flex items-start gap-3 animate-fadeIn">
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white rounded-3xl rounded-tl-none p-4 border border-emerald-100 shadow-sm max-w-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    <span>{loadingStage || 'Consulting Groq Agronomist & ICAR knowledge...'}</span>
                  </div>
                  <div className="w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 animate-pulse w-2/3" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Bottom Input & Action Bar ── */}
        <div className="p-4 sm:p-5 bg-white border-t border-gray-100 max-w-3xl w-full mx-auto">
          {/* Suggested Quick Inquiries Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
            {(cropContext?.has_disease
              ? [
                  "What should I do today?",
                  "Should I irrigate today?",
                  "Why is the risk high?",
                  "What if it rains tomorrow?",
                  "🌅 Today's Farm Brief",
                ]
              : [
                  "Tomato watering frequency",
                  "Prevent fungal diseases",
                  "What to check before watering?",
                  "Explain rainfall forecast",
                ]
            ).map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 border border-emerald-100 transition-all flex-shrink-0 cursor-pointer text-left"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Form input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 relative"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  language === 'gu'
                    ? "પાક, રોગ, ખાતર અથવા સિંચાઈ વિશે પૂછો..."
                    : language === 'hi'
                    ? "फसल, रोग, खाद या सिंचाई के बारे में पूछें..."
                    : "Ask about your crop, disease, weather, or irrigation..."
                }
                disabled={loading}
                className="w-full pl-4 pr-12 py-3 rounded-2xl border border-gray-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm placeholder:text-gray-400 focus:outline-none transition-all"
              />

              {/* Voice button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-gray-400 hover:text-emerald-800 hover:bg-gray-100'
                }`}
                title={isRecording ? "Listening... click to stop" : "Speak question (Voice input)"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="w-11 h-11 rounded-2xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white flex items-center justify-center transition-all shadow-xs flex-shrink-0 cursor-pointer"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
