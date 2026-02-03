import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api", // change after deployment
});

export const fetchEvents = async (page = 1) => {
  const res = await API.get(`/events?page=${page}&limit=12`);
  return res.data;
};

export const captureEmail = async (data) => {
  return API.post("/email-capture", data);
};
