import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldAlert,
  Droplets,
  CloudSun,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sun,
  Activity,
  User,
  Bot
} from 'lucide-react';
import { sendChatMessage, getTodayBrief, getSuggestedQuestions } from '../../api/assistant';

/**
 * AgronomistDrawer Component
 *
 * Full-featured interactive AI agronomist conversational interface.
 * Grounded in disease context, weather telemetry, deterministic risk, and ICAR/TNAU RAG citations.
 */
export default function AgronomistDrawer({
  isOpen,
  onClose,
  contextData,
  initialQuery = null,
}) {
  const [language, setLanguage] = useState('en'); // 'en' | 'gu' | 'hi'
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [sessionId] = useState(() => 'sess_' + Date.now());

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  const crop = contextData?.prediction?.cropName || contextData?.crop || 'Tomato';
  const disease = contextData?.prediction?.diseaseName || contextData?.disease || 'Early Blight';
  const confidence = contextData?.prediction?.confidence != null ? `${contextData.prediction.confidence}%` : '91.4%';
  const riskLevel = contextData?.spreadRisk?.level || 'High';
  const healthScore = contextData?.cropHealth?.score ?? 72;
  const isHealthy = Boolean(contextData?.prediction?.isHealthy);

  // Progressive loading text sequence
  const loadingSteps = [
    '🧠 Understanding your question...',
    '📚 Checking agricultural guidance...',
    '🌦️ Checking current conditions...',
    '✍️ Preparing evidence-backed recommendation...',
  ];

  // Initialize or fetch suggested questions
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const questions = await getSuggestedQuestions({
          crop,
          disease,
          risk: riskLevel,
          lang: language,
          healthy: isHealthy,
        });
        if (questions && questions.length > 0) {
          setSuggestedQuestions(questions);
        }
      } catch (err) {
        console.warn('Could not load suggestions:', err);
      }
    }
    loadSuggestions();
  }, [crop, disease, riskLevel, language, isHealthy]);

  // Handle initial query if opened with one (e.g. from quick chips)
  useEffect(() => {
    if (isOpen && initialQuery) {
      handleSendMessage(initialQuery);
    } else if (isOpen && messages.length === 0) {
      // Welcome message
      const welcomeEn = `Hello! I'm your **AgriSmart Agronomist**. I have verified your **${crop}** scan showing **${disease}** (${confidence} confidence) with **${riskLevel}** spread risk. How can I help you manage your field today?`;
      const welcomeGu = `નમસ્તે! હું તમારો **AgriSmart કૃષિ સલાહકાર** છું. મેં તમારા **${crop}** પાકમાં **${disease}** (${confidence}) અને **${riskLevel}** જોખમનું વિશ્લેષણ કર્યું છે. હું આજે તમને ખેતી વ્યવસ્થાપનમાં કેવી રીતે મદદ કરી શકું?`;
      const welcomeHi = `नमस्ते! मैं आपका **AgriSmart कृषि सलाहकार** हूँ। मैंने आपकी **${crop}** फसल में **${disease}** (${confidence}) और **${riskLevel}** जोखिम का विश्लेषण किया है। आज आपकी क्या सहायता करूँ?`;

      const welcomeText = language === 'gu' ? welcomeGu : (language === 'hi' ? welcomeHi : welcomeEn);

      setMessages([
        {
          id: 'msg_welcome',
          sender: 'assistant',
          text: welcomeText,
          why: [
            `Active Crop: ${crop}`,
            `Diagnosis: ${disease} (${confidence})`,
            `Spread Risk: ${riskLevel}`,
            `Crop Health Score: ${healthScore}/100`,
          ],
          actions: [
            { phase: 'Suggested', action: 'Ask: "Should I irrigate today?"' },
            { phase: 'Suggested', action: 'Ask: "What should I do now?"' },
          ],
          citations: [
            {
              id: 1,
              title: 'Integrated Crop Protection & Diagnostic Manual',
              source: 'ICAR / TNAU Agritech',
              url: 'https://agritech.tnau.ac.in',
              topic: 'agronomy',
            },
          ],
          suggestedQuestions: [
            'What should I do today?',
            'Should I irrigate today?',
            'Why is the risk high?',
            'How can I prevent it from spreading?',
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, initialQuery]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cycle progressive loading steps
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 700);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Setup Web Speech API for voice input
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsRecording(false);
        if (transcript.trim()) {
          handleSendMessage(transcript.trim());
        }
      };

      recognition.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition is not supported by your browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      // Set speech language
      if (language === 'gu') {
        recognitionRef.current.lang = 'gu-IN';
      } else if (language === 'hi') {
        recognitionRef.current.lang = 'hi-IN';
      } else {
        recognitionRef.current.lang = 'en-IN';
      }

      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Text-To-Speech
  const handleListen = (msgId, text) => {
    if (!('speechSynthesis' in window)) {
      alert('Text to speech is not supported in this browser.');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (language === 'gu') {
      utterance.lang = 'gu-IN';
    } else if (language === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Send message to backend
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text || !text.trim() || loading) return;

    const userMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await sendChatMessage({
        message: text.trim(),
        sessionId,
        context: {
          crop,
          disease,
          confidence: parseFloat(confidence) || 91.4,
          severity: contextData?.severity?.level || 'Moderate',
          health_score: healthScore,
          is_healthy: isHealthy,
          weather: contextData?.weather,
          spread_risk: contextData?.spreadRisk,
        },
        language,
      });

      const assistantMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        why: response.why || [],
        actions: response.actions || [],
        risk: response.risk,
        citations: response.citations || [],
        contextUsed: response.context_used,
        decisionFactors: response.decision_factors,
        historyTrend: response.history_trend,
        suggestedQuestions: response.suggested_questions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (response.suggested_questions && response.suggested_questions.length > 0) {
        setSuggestedQuestions(response.suggested_questions);
      }
    } catch (err) {
      console.error('Assistant error:', err);
      const errorMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'The assistant is temporarily busy or reconnecting. Your diagnostic scan and weather intelligence remain active. Please retry in a moment.',
        why: ['Network communication delay or service busy'],
        citations: [],
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Daily Farm Brief
  const handleTriggerBrief = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const brief = await getTodayBrief({
        context: {
          crop,
          disease,
          confidence: parseFloat(confidence) || 91.4,
          severity: contextData?.severity?.level || 'Moderate',
          health_score: healthScore,
          weather: contextData?.weather,
        },
        language,
      });

      const briefText = `🌅 **${brief.headline}**\n\n🔴 **HIGH PRIORITY:** ${brief.high_priority}\n\n🟡 **WATCH:** ${brief.watch}\n\n🟢 **LATER:** ${brief.later}`;

      const briefMessage = {
        id: `brief_${Date.now()}`,
        sender: 'assistant',
        text: briefText,
        why: [
          `Crop: ${brief.crop}`,
          `Detected Disease: ${brief.disease}`,
          `Risk Level: ${brief.risk_level}`,
          `Live Temperature: ${brief.temperature}°C`,
          `Humidity: ${brief.humidity}%`,
        ],
        actions: [
          { phase: 'Do now', action: 'Delay irrigation and prune heavily spotted foliage.' },
          { phase: 'Next 24h', action: 'Inspect perimeter rows for chlorotic spots.' },
        ],
        citations: [
          {
            id: 1,
            title: 'AgriSmart Daily Agronomic Telemetry Feed',
            source: 'Integrated Farm Intelligence',
            url: 'https://agritech.tnau.ac.in',
            topic: 'farm_brief',
          },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, briefMessage]);
    } catch (err) {
      console.error('Failed to generate brief:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-emerald-100 transform transition-transform duration-300">
        {/* ── Top Header ── */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-1.5">
                  <span>🌱 AgriSmart Agronomist</span>
                </h2>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Grounded crop pathology & agricultural decision assistant
              </p>
            </div>

            {/* Language Selector + Close */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15 text-xs font-bold">
                {[
                  { id: 'en', label: 'EN' },
                  { id: 'gu', label: 'ગુજરાતી' },
                  { id: 'hi', label: 'हिन्दी' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLanguage(item.id)}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      language === item.id
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-emerald-100 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Case Context Strip */}
          <div className="mt-3.5 pt-3 border-t border-emerald-700/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-200 font-bold flex items-center gap-1">
              🍅 <span>{crop}</span>
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-200 font-bold flex items-center gap-1">
              🦠 <span>{disease}</span> ({confidence})
            </span>

            <span
              className={`px-2.5 py-1 rounded-lg font-bold border ${
                riskLevel === 'High' || riskLevel === 'Severe'
                  ? 'bg-red-950/60 text-red-200 border-red-500/40'
                  : 'bg-amber-950/60 text-amber-200 border-amber-500/40'
              }`}
            >
              ● {riskLevel} Risk
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 font-bold">
              💚 Health: {healthScore}/100
            </span>
          </div>
        </div>

        {/* ── Quick Proactive Actions Bar ── */}
        <div className="bg-emerald-50/60 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2 overflow-x-auto text-xs font-bold text-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={handleTriggerBrief}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs transition-all cursor-pointer flex-shrink-0"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>🌅 Today's Farm Brief</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage('What should I do now?')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs transition-all cursor-pointer flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>🌱 What should I do now?</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage(`Why is my disease spread risk ${riskLevel.toLowerCase()}?`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs transition-all cursor-pointer flex-shrink-0"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>🔍 Why this risk level?</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage('Is my crop getting better?')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs transition-all cursor-pointer flex-shrink-0"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>📈 Crop Health Journey</span>
          </button>
        </div>

        {/* ── Chat Messages Scroll Area ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onListen={() => handleListen(msg.id, msg.text)}
              isSpeaking={speakingMsgId === msg.id}
              onQuickFollowUp={(q) => handleSendMessage(q)}
            />
          ))}

          {/* Loading Indicator with Progressive Stage Messages */}
          {loading && (
            <div className="flex items-start gap-2.5 animate-fadeIn">
              <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none p-4 border border-emerald-100 shadow-sm max-w-[85%] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>{loadingSteps[loadingStep]}</span>
                </div>
                <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggested Questions Chips ── */}
        {suggestedQuestions.length > 0 && !loading && (
          <div className="px-4 py-2 bg-white border-t border-gray-100 overflow-x-auto flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex-shrink-0 mr-1">
              Suggested:
            </span>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-100 transition-all flex-shrink-0 cursor-pointer text-left"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Bar ── */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                language === 'gu'
                  ? 'પાક, સિંચાઈ અથવા રોગ વિશે પ્રશ્ન પૂછો...'
                  : language === 'hi'
                  ? 'फसल, सिंचाई या रोग के बारे में पूछें...'
                  : 'Ask about irrigation, symptoms, or actions...'
              }
              disabled={loading}
              className="flex-1 text-xs sm:text-sm px-4 py-3 rounded-2xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none bg-gray-50/70"
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={loading}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-500 text-white border-red-600 animate-pulse'
                  : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-800 border-gray-200'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Ask by voice'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * MessageItem Component
 * Renders user query or structured agronomist answer with Why-card, Action plan, and Citations.
 */
function MessageItem({ message, onListen, isSpeaking, onQuickFollowUp }) {
  const [whyExpanded, setWhyExpanded] = useState(false);
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-emerald-800 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] shadow-xs text-xs sm:text-sm font-medium leading-relaxed">
          <p>{message.text}</p>
          <span className="block text-[10px] text-emerald-200/80 text-right mt-1 font-mono">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
        <Bot className="w-4 h-4" />
      </div>

      <div className="flex-1 bg-white rounded-2xl rounded-tl-none p-4 sm:p-5 border border-gray-200/80 shadow-sm space-y-3.5 max-w-[92%]">
        {/* Main Answer Header + Listen CTA */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-relaxed whitespace-pre-line">
            {message.text}
          </p>

          <button
            type="button"
            onClick={onListen}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
              isSpeaking
                ? 'bg-emerald-700 text-white border-emerald-700 animate-pulse'
                : 'bg-gray-50 text-gray-500 hover:text-emerald-800 border-gray-200'
            }`}
            title={isSpeaking ? 'Stop audio' : 'Listen to answer'}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* ── SECTION 1: WHY? (Telemetry breakdown) ── */}
        {message.why && message.why.length > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <button
              type="button"
              onClick={() => setWhyExpanded(!whyExpanded)}
              className="w-full flex items-center justify-between text-xs font-bold text-emerald-950 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-700" />
                <span>🔍 Why this recommendation?</span>
              </div>
              {whyExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
              )}
            </button>

            {whyExpanded && (
              <ul className="mt-2.5 pt-2.5 border-t border-emerald-100/70 space-y-1.5 text-xs text-emerald-900">
                {message.why.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── SECTION 2: WHAT TO DO NOW (Structured Action Plan) ── */}
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Recommended Action Plan:
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {message.actions.map((act, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                >
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 flex-shrink-0">
                    {act.phase || 'Action'}
                  </span>
                  <span className="text-gray-800 font-medium leading-tight">{act.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 3: CITATIONS & EVIDENCE (Verifiable Sources) ── */}
        {message.citations && message.citations.length > 0 && (
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-emerald-600" />
                Verified Evidence Sources ({message.citations.length}):
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.citations.map((cite) => (
                <a
                  key={cite.id}
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-emerald-100 hover:border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/70 transition-all text-left group block shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">
                      {cite.source}
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-emerald-700 flex-shrink-0 transition-colors" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 line-clamp-1 mt-0.5">
                    {cite.title}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-medium inline-block mt-1">
                    View source →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 font-mono">
          <span>{message.contextUsed?.model_engine === 'groq' ? '⚡ Groq Grounded' : '🌿 Agronomic Synthesis Engine'}</span>
          <span>{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
