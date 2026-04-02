import api from "./api";

export const getInventory = async (params = {}) => (await api.get("/inventory", { params })).data;
