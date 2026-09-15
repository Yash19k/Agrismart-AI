import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, ExternalLink } from 'lucide-react';

export default function FieldAdvisoryMemo({
  msg,
  cropContext,
  index,
  speakingMsgIndex,
  onSpeak,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!msg?.text) return;
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Resolve memo header tag
  const cropTag = cropContext?.has_disease
    ? `${cropContext.crop.toUpperCase()} · ${(cropContext.disease || 'DIAGNOSIS').toUpperCase()}`
    : 'FIELD GENERAL ADVISORY';

  // Format decision factors / why items
  const decisionFactors = msg.why?.length
    ? msg.why
    : msg.decisionFactors?.length
    ? msg.decisionFactors
    : [];

  // Categorize timeline phase
  const getPhaseTone = (phaseStr = '') => {
    const p = phaseStr.toLowerCase();
    if (p.includes('today') || p.includes('immediate') || p.includes('now')) {
      return {
        dotBg: 'bg-rose-600',
        textColor: 'text-rose-800',
        subtext: 'Critical intervention',
        subColor: 'text-rose-700',
      };
    }
    if (p.includes('24') || p.includes('tomorrow') || p.includes('spray')) {
      return {
        dotBg: 'bg-amber-600',
        textColor: 'text-amber-900',
        subtext: 'Weather contingent',
        subColor: 'text-amber-800',
      };
    }
    if (p.includes('3') || p.includes('days') || p.includes('canopy')) {
      return {
        dotBg: 'bg-[#123F32]',
        textColor: 'text-[#123F32]',
        subtext: 'Scouting phase',
        subColor: 'text-[#465E52]',
      };
    }
    return {
      dotBg: 'bg-slate-400',
      textColor: 'text-slate-600',
      subtext: 'Season-long resilience',
      subColor: 'text-slate-500',
    };
  };

  return (
    <article
      className="space-y-8 bg-[#FBFBF8] py-2 transition-all"
      data-purpose="digital-agronomist-field-note"
    >
      {/* 1. Memo Header & Actions */}
      <div className="flex items-start justify-between gap-4 border-b border-[#dbe7df] pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#465E52]">
            FIELD ADVISORY MEMO · {cropTag}
          </p>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#123F32] tracking-tight mt-1.5">
            Field Diagnosis &amp; Immediate Protocol
          </h2>
        </div>

        {/* Quiet Utility Controls */}
        <div className="flex items-center gap-1 flex-shrink-0 pt-1">
          {/* Audio Readout (TTS) */}
          <button
            type="button"
            onClick={() => onSpeak(msg.text, index)}
            aria-label="Listen to voice readout"
            className="p-2 text-[#465E52] hover:text-[#123F32] hover:bg-[#EAF3EC] rounded-lg transition-colors cursor-pointer"
            title={speakingMsgIndex === index ? 'Stop audio' : 'Listen (Audio readout)'}
          >
            {speakingMsgIndex === index ? (
              <VolumeX className="w-4 h-4 text-[#123F32] animate-pulse" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Copy Recommendation text */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy recommendation text"
            className="p-2 text-[#465E52] hover:text-[#123F32] hover:bg-[#EAF3EC] rounded-lg transition-colors cursor-pointer"
            title={copied ? 'Copied to clipboard' : 'Copy note'}
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#123F32]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Offline Alert if active */}
      {msg.offlineNotice && (
        <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs font-medium text-amber-900 leading-relaxed">
          <span className="font-bold">Offline Guidance: </span>
          {msg.offlineNotice}
        </div>
      )}

      {/* 2. Editorial Lead Callout Quote (Primary Recommendation) */}
      <blockquote className="border-l-2 border-[#123F32] pl-6 py-2 my-2">
        <p className="font-serif italic text-lg sm:text-xl md:text-2xl text-slate-800 leading-relaxed whitespace-pre-line">
          “{msg.text}”
        </p>
      </blockquote>

      {/* 3. Decision Logic / Why This Recommendation */}
      {decisionFactors.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#123F32]" />
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#123F32]">
              Why This Recommendation (Decision Factors)
            </h3>
          </div>

          <div className="border-t border-[#dbe7df] divide-y divide-[#e7efe9]">
            {decisionFactors.map((factor, fIdx) => {
              // Check if contains a colon for highlighting
              const colonPos = factor.indexOf(':');
              const hasColon = colonPos > 0 && colonPos < 45;
              const title = hasColon ? factor.slice(0, colonPos) : null;
              const rest = hasColon ? factor.slice(colonPos + 1) : factor;

              return (
                <div key={fIdx} className="py-3 flex items-baseline gap-3">
                  <span className="text-[#123F32] font-serif text-lg leading-none select-none">
                    •
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {hasColon ? (
                      <>
                        <strong className="font-semibold text-slate-900">{title}:</strong>
                        {rest}
                      </>
                    ) : (
                      factor
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Action Plan Timeline */}
      {msg.actions?.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#123F32]" />
              <h3 className="text-xs font-bold tracking-widest uppercase text-[#123F32]">
                Action Plan Timeline
              </h3>
            </div>
            <span className="text-[11px] text-[#465E52]">Priority sequential execution</span>
          </div>

          <div className="border-t border-[#dbe7df] pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {msg.actions.map((act, aIdx) => {
                const phaseStr = act.phase || `Step ${aIdx + 1}`;
                const tone = getPhaseTone(phaseStr);

                return (
                  <div
                    key={aIdx}
                    className="relative flex flex-col space-y-2 border-l border-[#123F32]/40 pl-4 py-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${tone.dotBg}`} />
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${tone.textColor}`}
                      >
                        {phaseStr}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {act.action}
                    </h4>

                    {act.rationale && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {act.rationale}
                      </p>
                    )}

                    <span className={`text-[10px] font-medium ${tone.subColor} pt-2 mt-auto`}>
                      {tone.subtext}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 5. Verified Evidence Sources */}
      {msg.citations?.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#123F32]" />
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#123F32]">
              Verified Evidence Sources ({msg.citations.length} Institutions)
            </h3>
          </div>

          <div className="border-t border-[#dbe7df] divide-y divide-[#e7efe9]">
            {msg.citations.map((c, cIdx) => (
              <div
                key={cIdx}
                className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs font-bold text-[#123F32] min-w-[190px] flex-shrink-0">
                    {c.source}:
                  </span>
                  <span className="text-xs text-slate-700">
                    {c.title}
                  </span>
                </div>

                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-[#123F32] hover:text-emerald-700 inline-flex items-center gap-1 group-hover:underline flex-shrink-0 pt-1 sm:pt-0"
                  >
                    <span>View official source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Subtle Editorial Footer Assurance */}
      <div className="pt-4 border-t border-[#dbe7df] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#465E52]">
        <p>
          AgriSmart · Agricultural advisory grounded in ICAR, TNAU, and live meteorological telemetry.
        </p>
        <span className="font-mono text-slate-400 text-[10px]">
          Engine: {msg.engine === 'groq' ? `Groq (${msg.modelUsed || 'gpt-oss-120b'})` : 'Offline'}
          {msg.devTelemetry?.latency_ms ? ` · Latency ${msg.devTelemetry.latency_ms}ms` : ''}
        </span>
      </div>
    </article>
  );
}
