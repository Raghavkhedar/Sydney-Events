import axios from "axios";

const API = axios.create({
  // Prefer env var in production, fall back to your Render backend URL
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://sydney-events-backendd.onrender.com/api",
});

export const fetchEvents = async (page = 1) => {
  const res = await API.get(`/events?page=${page}&limit=12`);
  return res.data;
};

export const captureEmail = async (data) => {
  return API.post("/email-capture", data);
};
