import api from "./api";

export const getSalesCatalog = async () => (await api.get("/sales/catalog")).data;
export const getSalesLeads = async () => (await api.get("/sales/leads")).data;
export const getSalesLead = async (leadId) => (await api.get(`/sales/leads/${leadId}`)).data;
export const createSalesLead = async (payload) => (await api.post("/sales/leads", payload)).data;
export const updateSalesLead = async (leadId, payload) => (await api.put(`/sales/leads/${leadId}`, payload)).data;
export const saveSalesTestDrive = async (leadId, payload) => (await api.post(`/sales/leads/${leadId}/test-drive`, payload)).data;
export const saveSalesFeedback = async (leadId, payload) => (await api.post(`/sales/leads/${leadId}/feedback`, payload)).data;
export const getSalesAvailability = async (model) => (await api.get(`/sales/availability/${encodeURIComponent(model)}`)).data;
export const saveSalesEstimate = async (leadId, payload) => (await api.post(`/sales/leads/${leadId}/estimate`, payload)).data;
export const saveSalesBooking = async (leadId, payload) => (await api.post(`/sales/leads/${leadId}/booking`, payload)).data;
