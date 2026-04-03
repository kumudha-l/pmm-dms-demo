import api from "./api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

export const createCheckIn = async (payload) => (await api.post("/check-ins", payload)).data;
export const getCheckIns = async (limit = 10) => (await api.get(`/check-ins?limit=${limit}`)).data;
export const getCheckInEntryPassUrl = (checkInId) => `${API_BASE}/check-ins/${checkInId}/entry-pass`;
