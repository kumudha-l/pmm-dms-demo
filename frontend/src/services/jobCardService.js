import api from "./api";

export const createJobCard = async (payload) => (await api.post("/job-cards", payload)).data;
export const getJobCard = async (jobCardId) => (await api.get(`/job-cards/${jobCardId}`)).data;
export const updateJobCard = async (jobCardId, payload) => (await api.put(`/job-cards/${jobCardId}`, payload)).data;
export const recomputeEstimate = async (jobCardId, payload) => (await api.post(`/job-cards/${jobCardId}/estimate`, payload)).data;
export const assignTechnicians = async (jobCardId, payload) => (await api.post(`/job-cards/${jobCardId}/assign-technicians`, payload)).data;
export const updateTechnicianChecklist = async (jobCardId, assignmentId, payload) => (await api.put(`/job-cards/${jobCardId}/technicians/${assignmentId}/checklist`, payload)).data;
export const recordPayment = async (jobCardId, payload) => (await api.post(`/job-cards/${jobCardId}/payment`, payload)).data;
export const closeJobCard = async (jobCardId) => (await api.post(`/job-cards/${jobCardId}/close`)).data;
export const sendFeedbackEmail = async (jobCardId) => (await api.post(`/job-cards/${jobCardId}/send-feedback`)).data;
