import React, { useRef } from 'react';
import { Send, Mic, MicOff, MessageSquare } from 'lucide-react';

export default function ChatComposer({
  inputValue,
  setInputValue,
  onSend,
  loading,
  isRecording,
  onToggleRecording,
  language = 'en',
  suggestedQueries = [],
  showSuggestions = false,
}) {
  const inputRef = useRef(null);

  const getPlaceholder = () => {
    if (isRecording) {
      return language === 'gu'
        ? 'સાંભળી રહ્યા છીએ... તમારો કૃષિ પ્રશ્ન બોલો'
        : language === 'hi'
        ? 'सुन रहे हैं... अपना कृषि प्रश्न बोलें'
        : 'Listening for your farming query...';
    }
    if (language === 'gu') {
      return 'પાક, રોગ, ખાતર અથવા સિંચાઈ વિશે પૂછો...';
    }
    if (language === 'hi') {
      return 'फसल, रोग, खाद या सिंचाई के बारे में पूछें...';
    }
    return 'Ask about your crop, disease, weather, or irrigation schedule...';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;
    onSend();
  };

  return (
    <div
      className="sticky bottom-0 pt-3 pb-4 bg-[#FBFBF8]/95 backdrop-blur-xs space-y-3 z-10"
      data-purpose="chat-input-bar"
    >
      {/* Contextual Suggested Follow-up Inquiries */}
      {showSuggestions && suggestedQueries.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
          <span className="text-[11px] uppercase tracking-wider font-bold text-[#465E52] whitespace-nowrap mr-1">
            Suggested:
          </span>
          {suggestedQueries.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSend(q)}
              className="whitespace-nowrap px-3 py-1 rounded-full bg-white hover:bg-[#EAF3EC] text-slate-700 hover:text-[#123F32] border border-[#dbe7df] text-xs font-medium transition-colors inline-flex items-center gap-1 cursor-pointer focus:outline-none"
            >
              <span>{q}</span>
              <span className="text-[#465E52] text-[10px]">→</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Form Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center rounded-xl bg-white border border-[#D6E7DC] shadow-xs px-3 sm:px-4 py-1.5 sm:py-2 transition-colors focus-within:border-[#123F32] focus-within:ring-1 focus-within:ring-[#123F32]"
        id="agri-chat-form"
      >
        {/* Chat Prompt Icon */}
        <div className="pl-1 pr-2 text-[#718479] hidden sm:block">
          <MessageSquare className="w-4 h-4" />
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={loading}
          className="w-full bg-transparent border-none text-sm text-[#123F32] placeholder-[#718479] focus:ring-0 focus:outline-none px-2 py-2"
          id="agri-input"
        />

        {/* Voice Dictation (Mic) */}
        <button
          type="button"
          onClick={onToggleRecording}
          className={`p-2 rounded-lg transition-colors mr-1 cursor-pointer ${
            isRecording
              ? 'text-rose-600 bg-rose-50 animate-pulse'
              : 'text-[#718479] hover:text-[#123F32] hover:bg-[#F4F7F3]'
          }`}
          title={isRecording ? 'Listening... click to stop' : 'Voice Dictation'}
          id="mic-btn"
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Forest Green Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="bg-[#123F32] hover:bg-[#0c2b22] disabled:opacity-40 text-white rounded-lg px-3.5 sm:px-4 py-2 flex items-center justify-center transition-colors shadow-2xs gap-1.5 cursor-pointer flex-shrink-0"
          title="Submit Question"
        >
          <span className="text-xs font-semibold">Ask</span>
          <Send className="w-3.5 h-3.5 transform -rotate-45 -translate-y-0.5 translate-x-0.5" />
        </button>
      </form>
    </div>
  );
}
