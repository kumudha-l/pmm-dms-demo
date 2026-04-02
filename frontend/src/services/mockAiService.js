import api from "./api";

export const extractPlate = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return (await api.post("/mock/extract-plate", formData)).data;
};

export const extractOdometer = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return (await api.post("/mock/extract-odometer", formData)).data;
};

export const parseComplaint = async (payload) => {
  const body = typeof payload === "string" ? { text: payload } : payload;
  return (await api.post("/mock/parse-complaint", body)).data;
};
