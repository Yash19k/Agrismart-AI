import React from 'react';
import { Bot, Sparkles, MessageSquare, ArrowRight, ShieldAlert, Droplets, Sun, HelpCircle } from 'lucide-react';

const getCropEmoji = (crop) => {
  const c = (crop || '').toLowerCase();
  if (c.includes('tomato')) return '🍅';
  if (c.includes('corn') || c.includes('maize')) return '🌽';
  if (c.includes('potato')) return '🥔';
  if (c.includes('grape')) return '🍇';
  if (c.includes('apple')) return '🍎';
  if (c.includes('pepper') || c.includes('bell')) return '🫑';
  if (c.includes('cherry')) return '🍒';
  if (c.includes('peach')) return '🍑';
  if (c.includes('strawberry')) return '🍓';
  if (c.includes('orange') || c.includes('citrus')) return '🍊';
  if (c.includes('soybean')) return '🌱';
  if (c.includes('squash')) return '🎃';
  if (c.includes('blueberry') || c.includes('raspberry')) return '🫐';
  return '🌿';
};

/**
 * AgriSmartAgronomistCard
 *
 * Prominent feature card on Disease Result Dashboard (Section 18).
 * Teases the AI Agronomist with active case signals and 1-click quick queries.
 */
export default function AgriSmartAgronomistCard({
  prediction,
  cropHealth,
  severity,
  spreadRisk,
  weather,
  onOpenAssistant,
  onQuickQuery,
}) {
  const crop = prediction?.cropName || 'Tomato';
  const disease = prediction?.diseaseName || 'Early Blight';
  const confidence = prediction?.confidencePercent
    ? prediction.confidencePercent
    : (prediction?.confidence != null
        ? (typeof prediction.confidence === 'number' && prediction.confidence <= 1
            ? `${(prediction.confidence * 100).toFixed(1)}%`
            : `${prediction.confidence}%`)
        : '87.3%');
  const isHealthy = Boolean(prediction?.isHealthy);
  const riskLevel = spreadRisk?.level || 'High';

  const quickPrompts = [
    { label: 'What should I do today?', icon: Sparkles },
    { label: 'Should I irrigate today?', icon: Droplets },
    { label: `Why is the risk ${riskLevel.toLowerCase()}?`, icon: ShieldAlert },
    { label: "🌅 Today's Farm Brief", icon: Sun },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-7 shadow-xl border border-emerald-700/50">
      {/* Background Decorative Graphic */}
      <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-10 top-6 text-emerald-400/15 pointer-events-none select-none">
        <Bot className="w-36 h-36" />
      </div>

      <div className="relative z-10 max-w-2xl">
        {/* Header Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            Grounded AI Agronomist
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-emerald-100 backdrop-blur-xs">
            {getCropEmoji(crop)} {crop} • {disease} ({confidence})
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold backdrop-blur-xs ${
              riskLevel === 'High' || riskLevel === 'Severe'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            ● {riskLevel} Risk
          </span>
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>🌱 AgriSmart Agronomist</span>
        </h3>
        <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 leading-relaxed">
          Your AI farming assistant — understand your crop, ask follow-up questions, and get evidence-backed actions grounded in ICAR, TNAU, and live weather telemetry.
        </p>

        {/* Quick Action Prompt Chips */}
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Recommended Questions:
          </p>

          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onQuickQuery ? onQuickQuery(item.label) : onOpenAssistant()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-xs active:scale-95 cursor-pointer backdrop-blur-xs hover:border-emerald-300"
                >
                  <Icon className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAssistant}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer group"
          >
            <MessageSquare className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
            <span>Open AI Agronomist</span>
            <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <span className="text-[11px] text-emerald-200/80 font-medium hidden sm:inline">
            Supports English • ગુજરાતી • हिन्दी & Voice
          </span>
        </div>
      </div>
    </div>
  );
}
