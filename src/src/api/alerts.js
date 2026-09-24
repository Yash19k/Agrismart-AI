import api from '../services/api';

export const getAlerts = () => api.get('/alerts/').then(r => r.data);
export const getUnreadCount = () => api.get('/alerts/unread-count/').then(r => r.data);
export const markAlertRead = (id) => api.post(`/alerts/${id}/mark-read/`).then(r => r.data);
export const markAllAlertsRead = () => api.post('/alerts/mark-all-read/').then(r => r.data);
