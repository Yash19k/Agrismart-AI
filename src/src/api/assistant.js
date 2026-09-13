import api from '../services/api';

/**
 * AgriSmart Agronomist Assistant API client
 */

export async function sendChatMessage({
  message,
  sessionId,
  context,
  language = 'en',
  clearContext = false,
  allowOffline = false,
  farmId,
}) {
  const payload = {
    message,
    session_id: sessionId || 'session_default',
    context: clearContext ? null : {
      ...context,
      farm_id: farmId || context?.farm_id,
    },
    clear_context: clearContext,
    allow_offline: allowOffline,
    language,
  };

  const response = await api.post('/assistant/chat/', payload, { timeout: 60000 });
  return response.data;
}

export async function getAssistantContext(sessionId) {
  const params = new URLSearchParams();
  if (sessionId) params.append('session_id', sessionId);
  const response = await api.get(`/assistant/context/?${params.toString()}`);
  return response.data;
}

export async function clearAssistantContext(sessionId) {
  const response = await api.post('/assistant/clear-context/', {
    session_id: sessionId || 'session_default',
  });
  return response.data;
}

export async function getTodayBrief({ context, language = 'en', farmId }) {
  const payload = {
    context: {
      ...context,
      farm_id: farmId || context?.farm_id,
    },
    language,
  };

  const response = await api.post('/assistant/brief/', payload, { timeout: 60000 });
  return response.data;
}

export async function getSuggestedQuestions({ crop, disease, risk, lang = 'en', healthy = false }) {
  const params = new URLSearchParams({
    crop: crop || 'General',
    disease: disease || '',
    risk: risk || 'Low',
    lang,
    healthy: String(healthy),
  });

  const response = await api.get(`/assistant/suggested/?${params.toString()}`);
  return response.data?.suggested_questions || [];
}
