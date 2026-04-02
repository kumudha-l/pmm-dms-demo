import api from "./api";

export const getTechnicians = async () => (await api.get("/technicians")).data;
