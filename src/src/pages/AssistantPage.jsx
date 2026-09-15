import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Terminal,
  X,
  AlertTriangle,
  RotateCcw,
  Menu,
} from 'lucide-react';

import AppSidebar from '../components/common/AppSidebar';
import AdvisoryDomains from '../components/assistant/AdvisoryDomains';
import CommonInquiries from '../components/assistant/CommonInquiries';
import FieldAdvisoryMemo from '../components/assistant/FieldAdvisoryMemo';
import ChatComposer from '../components/assistant/ChatComposer';
import {
  sendChatMessage,
  getAssistantContext,
  clearAssistantContext,
  getSuggestedQuestions,
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
  const [errorState, setErrorState] = useState(null);

  // Development telemetry inspector
  const [showDevInspector, setShowDevInspector] = useState(false);
  const [lastDevTelemetry, setLastDevTelemetry] = useState(null);

  // Audio / Speech
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState(null);

  // Dynamic suggested queries for the composer
  const [suggestedQueries, setSuggestedQueries] = useState([
    'Tomato watering frequency',
    'Prevent fungal diseases',
    'What to check before watering?',
    'Explain rainfall forecast',
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

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

        // Populate crop-specific suggested questions
        setSuggestedQueries([
          `What should I do today for ${normalized.crop}?`,
          `Should I irrigate my ${normalized.crop} field today?`,
          `Why is the ${normalized.disease} risk ${normalized.risk?.level || 'high'}?`,
          'What if it rains in the next 24 hours?',
        ]);

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
            setSuggestedQueries([
              `What should I do today for ${remoteCtx.crop}?`,
              `Should I irrigate my ${remoteCtx.crop} field today?`,
              `Why is the ${remoteCtx.disease} risk ${remoteCtx.risk?.level || 'high'}?`,
              'What if it rains in the next 24 hours?',
            ]);
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
      recognition.lang = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';

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
        recognitionRef.current.lang =
          language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
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
    utterance.lang = language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
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
    setSuggestedQueries([
      'Tomato watering frequency',
      'Prevent fungal diseases',
      'What to check before watering?',
      'Explain rainfall forecast',
    ]);
  };

  // Reset conversation to initial state
  const handleNewInquiry = () => {
    setMessages([]);
    setErrorState(null);
  };

  // Send message pipeline
  const handleSendMessage = async (textToSend = null, activeCtx = cropContext, allowOffline = false) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    if (!textToSend) setInputValue('');
    setErrorState(null);

    // Append user message
    const userMsg = {
      role: 'user',
      text: query,
      timestamp: new Date(),
      contextSnapshot: activeCtx ? { ...activeCtx } : null,
    };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    setLoadingStage('Preparing field advisory...');

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
          message: response.message || 'Unable to prepare the advisory right now. Please try again.',
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

      // Update suggested follow-ups if provided by backend
      if (response.suggested_questions?.length > 0) {
        setSuggestedQueries(response.suggested_questions);
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
        message: err.friendlyMessage || 'Unable to prepare the advisory right now. Please try again.',
        can_retry: true,
        can_use_offline: true,
        lastQuery: query,
      });
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  // Format time display (e.g. 09:00 AM)
  const formatTime = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-[#FBFBF8] text-[#1A2E26] font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <AppSidebar
        activeItem="assistant"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FBFBF8] overflow-hidden">
        {/* Top Header Bar */}
        <header
          className="h-16 px-4 sm:px-8 bg-white border-b border-[#E2E8E0] flex items-center justify-between sticky top-0 z-20 flex-shrink-0"
          data-purpose="top-navigation-bar"
        >
          {/* Left Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-[#718479] hover:text-[#123F32] hover:bg-[#F4F7F3]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="w-2.5 h-2.5 rounded-full bg-[#123F32] flex-shrink-0 hidden sm:block" />
            <div className="truncate">
              <h1 className="text-base font-medium text-[#123F32] tracking-tight font-serif truncate">
                AgriSmart AI Agronomist
              </h1>
              <p className="text-[11px] text-[#465E52] hidden md:block">
                Evidence-backed conversational agricultural decision support
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* New Inquiry button when conversation exists */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewInquiry}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#123F32] hover:bg-[#EAF3EC] border border-[#D6E7DC] rounded-lg transition-colors cursor-pointer"
                title="Start a new advisory consultation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Inquiry</span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-[#F7FAF7] rounded-lg border border-[#E2E8E0] p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-white text-[#123F32] font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-[#123F32]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('gu')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  language === 'gu'
                    ? 'bg-white text-[#123F32] font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-[#123F32]'
                }`}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  language === 'hi'
                    ? 'bg-white text-[#123F32] font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-[#123F32]'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Telemetry Inspector Button */}
            <button
              type="button"
              onClick={() => setShowDevInspector(!showDevInspector)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                showDevInspector
                  ? 'bg-[#123F32] text-white border-[#123F32]'
                  : 'bg-white text-slate-600 border-[#E2E8E0] hover:bg-[#F7FAF7]'
              }`}
              title="Toggle Technical Telemetry Inspector"
            >
              <Terminal className="w-3.5 h-3.5 text-[#465E52]" />
              <span className="hidden sm:inline">Inspector</span>
            </button>

            {/* Engine Status Badge */}
            <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EAF3EC] text-[#123F32] border border-[#D6E7DC]">
              <span className="w-2 h-2 rounded-full bg-[#2A5A43]" />
              <span>Groq gpt-oss-120b Active</span>
            </div>
          </div>
        </header>

        {/* Development Inspector Drawer */}
        {showDevInspector && (
          <div className="bg-slate-900 text-slate-100 px-4 py-2.5 text-xs border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Engine: {lastDevTelemetry?.engine || 'Groq'}
              </span>
              <span className="text-slate-500">|</span>
              <span>
                Model: <strong className="text-white">{lastDevTelemetry?.model || 'openai/gpt-oss-120b'}</strong>
              </span>
              <span className="text-slate-500">|</span>
              <span>
                Tools: <strong className="text-amber-300">{(lastDevTelemetry?.tools_executed || ['knowledge_rag', 'weather_tool']).join(', ')}</strong>
              </span>
              <span className="text-slate-500">|</span>
              <span>
                RAG Sources: <strong className="text-cyan-300">{lastDevTelemetry?.rag_sources_count ?? 3}</strong>
              </span>
              <span className="text-slate-500">|</span>
              <span>
                Latency: <strong className="text-emerald-300">{lastDevTelemetry?.latency_ms ? `${lastDevTelemetry.latency_ms} ms` : 'Live'}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDevInspector(false)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Context Telemetry Strip (Mode A vs Mode B) */}
        <section
          className="bg-[#F7FAF7] border-b border-[#E2E8E0] px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#465E52]"
          data-purpose="telemetry-banner"
        >
          {cropContext?.has_disease ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#123F32]" />
              <span className="font-semibold text-[#123F32]">Mode B: Grounded Crop Advisory</span>
              <span className="text-slate-400">—</span>
              <span className="text-slate-700">
                {cropContext.crop} · {cropContext.disease} ({cropContext.confidence}%) · {cropContext.risk?.level || 'High'} Spread Risk
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2A5A43]" />
              <span className="font-medium text-slate-700">Mode A: General Agricultural Advisor</span>
              <span className="text-slate-400">—</span>
              <span className="hidden sm:inline">No leaf scan active. Inquiring on live agronomic parameters, crops, irrigation, or pest prevention.</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {cropContext?.has_disease ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/disease')}
                  className="font-semibold text-[#123F32] hover:text-[#0c2b22] transition underline underline-offset-4 decoration-[#B8D3C0] hover:decoration-[#123F32] cursor-pointer"
                >
                  View Analysis →
                </button>
                <button
                  type="button"
                  onClick={handleClearContext}
                  className="text-slate-500 hover:text-red-700 transition cursor-pointer"
                  title="Switch to General Advisory mode"
                >
                  Clear Context
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/disease')}
                className="inline-flex items-center gap-1 font-semibold text-[#123F32] hover:text-[#0c2b22] transition underline underline-offset-4 decoration-[#B8D3C0] hover:decoration-[#123F32] cursor-pointer"
              >
                <span>Upload Leaf Scan</span>
                <span className="text-sm">→</span>
              </button>
            )}
          </div>
        </section>

        {/* Main Advisory Content Viewport */}
        <main
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 flex flex-col justify-between custom-scrollbar"
          data-purpose="agronomist-desk-container"
        >
          <div className="max-w-5xl w-full mx-auto space-y-10 flex-1">
            {/* ════ SCREEN 1: INITIAL CHATBOT STATE (No messages yet) ════ */}
            {messages.length === 0 && (
              <>
                {/* 1. HERO COMPOSITION */}
                <section
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2"
                  data-purpose="editorial-hero"
                >
                  <div className="lg:col-span-8 space-y-4">
                    <p className="text-[11px] font-semibold tracking-widest text-[#718479] uppercase">
                      Agricultural Advisory
                    </p>
                    <h2 className="font-serif text-4xl sm:text-5xl font-medium text-[#123F32] tracking-tight leading-[1.12]">
                      AI Agronomist
                    </h2>
                    <p className="text-[#4D6357] text-base leading-relaxed font-normal pt-1 max-w-2xl">
                      Practical guidance for crop health, irrigation schedules, weather telemetry, soil nutrition, and disease mitigation.
                    </p>

                    {/* Understated Mode / Context Strip */}
                    <div className="pt-3 flex flex-wrap items-center gap-3 text-xs">
                      {cropContext?.has_disease ? (
                        <span className="inline-flex items-center gap-2 text-[#123F32] bg-[#EAF3EC] px-3 py-1.5 rounded-md border border-[#D6E7DC]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#123F32]" />
                          <span>
                            {cropContext.crop} · {cropContext.disease} ({cropContext.confidence}%)
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-[#465E52] bg-[#EAF3EC] px-3 py-1.5 rounded-md border border-[#D6E7DC]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2A5A43]" />
                          <span>General advisory · No crop scan attached</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => navigate('/disease')}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#123F32] hover:text-[#0c2b22] px-2 py-1.5 transition underline underline-offset-4 decoration-[#B8D3C0] hover:decoration-[#123F32] cursor-pointer"
                        id="upload-scan-trigger"
                      >
                        <span>Upload Leaf Scan</span>
                        <span className="text-sm">→</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Clean Editorial Accent Line */}
                  <div className="hidden lg:block lg:col-span-4">
                    <div className="w-full border-t border-[#E2E8E0] my-auto" />
                  </div>
                </section>

                {/* 2. AGRICULTURAL ADVISORY DOMAINS (6 Editorial Cards) */}
                <AdvisoryDomains onSelectDomain={handleSendMessage} />

                {/* 3. COMMON AGRICULTURAL INQUIRIES (Hairline Divider Rows) */}
                <CommonInquiries
                  onSelectInquiry={handleSendMessage}
                  cropContext={cropContext}
                />
              </>
            )}

            {/* ════ SCREEN 2: RESPONSE STATE (Field Advisory Memo Viewport) ════ */}
            {messages.length > 0 && (
              <div className="space-y-10" data-purpose="consultation-viewport">
                {messages.map((msg, index) => (
                  <div key={index} className="space-y-8">
                    {msg.role === 'user' ? (
                      /* Understated User Field Inquiry Row */
                      <div className="flex items-baseline justify-between border-b border-[#E2E8E0] pb-4 pt-1">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold tracking-wider uppercase text-[#465E52]">
                            YOU · FIELD INQUIRY
                          </span>
                          <p className="text-lg font-medium text-[#123F32] tracking-tight">
                            {msg.text}{' '}
                            <span className="text-slate-400 font-normal">
                              — {cropContext?.crop || 'Field Advisory'}
                            </span>
                          </p>
                        </div>
                        <div className="text-xs text-slate-400 font-mono tracking-tight whitespace-nowrap pl-4">
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    ) : msg.role === 'system' ? (
                      /* Clean System Notification Row */
                      <div className="py-2 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#EAF3EC] text-[#123F32] border border-[#D6E7DC]">
                          {msg.text}
                        </span>
                      </div>
                    ) : (
                      /* Editorial Field Advisory Memo */
                      <FieldAdvisoryMemo
                        msg={msg}
                        cropContext={cropContext}
                        index={index}
                        speakingMsgIndex={speakingMsgIndex}
                        onSpeak={handleSpeak}
                      />
                    )}
                  </div>
                ))}

                {/* Error State Banner */}
                {errorState && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>AI Assistant Notice</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-normal">
                      {errorState.message}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {errorState.can_retry && (
                        <button
                          type="button"
                          onClick={() => handleSendMessage(errorState.lastQuery)}
                          className="px-3 py-1.5 rounded-lg bg-[#123F32] hover:bg-[#0c2b22] text-white text-xs font-medium transition-all shadow-2xs cursor-pointer"
                        >
                          Retry Groq
                        </button>
                      )}
                      {errorState.can_use_offline && (
                        <button
                          type="button"
                          onClick={() => handleSendMessage(errorState.lastQuery, cropContext, true)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-medium transition-all cursor-pointer"
                        >
                          View Offline Guidance
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Meaningful Loading State */}
                {loading && (
                  <div className="space-y-4 pt-4 animate-fadeIn border-t border-[#E2E8E0]">
                    <div className="flex items-center gap-2.5 text-xs text-[#465E52]">
                      <span className="w-2 h-2 rounded-full bg-[#123F32] animate-ping" />
                      <span className="font-serif italic text-base text-[#123F32]">
                        {loadingStage || 'Preparing field advisory...'}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 4. AGRICULTURAL WORKSPACE INPUT UNIT (Anchored at Bottom) */}
          <div className="max-w-5xl w-full mx-auto">
            <ChatComposer
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSend={handleSendMessage}
              loading={loading}
              isRecording={isRecording}
              onToggleRecording={toggleRecording}
              language={language}
              suggestedQueries={suggestedQueries}
              showSuggestions={messages.length > 0}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
