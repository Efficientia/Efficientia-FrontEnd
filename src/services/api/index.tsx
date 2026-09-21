import axios from "axios";

export function api() {
  const baseURL = import.meta.env.VITE_BASE_URL;

  if (!baseURL) {
    throw new Error("VITE_BASE_URL is not configured");
  }

  const instance = axios.create({
    baseURL,
    timeout: 5000,
  });
  return instance;
}
