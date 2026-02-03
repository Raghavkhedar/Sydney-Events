import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

export const fetchEvents = async (page = 1) => {
  const res = await API.get(`/events?page=${page}&limit=12`);
  return res.data;
};

export const captureEmail = async (data) => {
  return API.post("/email-capture", data);
};
