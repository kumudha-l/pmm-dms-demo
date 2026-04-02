import api from "./api";

export const getVehicleByRegNo = async (regNo) => (await api.get(`/vehicles/${regNo}`)).data;
export const getVehicleHistory = async (regNo) => (await api.get(`/vehicles/${regNo}/history`)).data;
