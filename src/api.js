import axios from "axios";
import CryptoJS from "crypto-js";

export const apiUrl = import.meta.env.VITE_API;
const imgUrl = (import.meta.env.VITE_IMG || "").replace(/\/+$/, "");

const TOKEN_KEY = "egate-admin-token";
export const AUTH_EXPIRED_EVENT = "admin:authExpired";
// Fired after a company's status changes so the sidebar's pending badge reloads.
export const COUNTS_CHANGED_EVENT = "admin:countsChanged";
export const refreshCounts = () => window.dispatchEvent(new Event(COUNTS_CHANGED_EVENT));

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked: the login only lasts for this tab
  }
};

export const logoUrl = (companyLogo) =>
  companyLogo ? `${imgUrl}/uploads/CompanyLogo/${encodeURIComponent(companyLogo)}` : null;

// AES payloads both ways, same key as the backend: bodies and GET params go as { data: "<cipher>" },
// and the `data` of a successful reply comes back encrypted
const SECRET = import.meta.env.VITE_SECRETKEY;
const encrypt = (value) => CryptoJS.AES.encrypt(JSON.stringify(value ?? {}), SECRET).toString();
const decrypt = (cipher) => JSON.parse(CryptoJS.AES.decrypt(cipher, SECRET).toString(CryptoJS.enc.Utf8));

const http = axios.create({ baseURL: apiUrl, headers: { "Content-Type": "application/json" } });

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data !== undefined) config.data = { data: encrypt(config.data) };
  if (config.params && Object.keys(config.params).length) config.params = { data: encrypt(config.params) };
  return config;
});

http.interceptors.response.use((res) => {
  if (typeof res.data?.data === "string") res.data.data = decrypt(res.data.data);
  return res;
});

// 401 on anything but the login call = token expired or admin disabled: back to the login page.
http.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.endsWith("/login")) {
    setToken(null);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: error.response.data?.Message }));
  }
  throw error;
});

const data = (res) => res.data.data;

// Message from the server, or a fallback for network errors.
export const errorMessage = (error) =>
  error?.response?.data?.Message || (error?.response ? "Something went wrong." : "Cannot reach the server.");

const api = {
  login: (email, password) => http.post("/login", { email, password }).then(data),
  me: () => http.get("/me").then(data),
  changePassword: (currentPassword, newPassword) =>
    http.post("/changePassword", { currentPassword, newPassword }).then(data),

  stats: () => http.get("/stats").then(data),
  companies: (params) => http.get("/companies", { params }).then(data),
  company: (id) => http.get(`/companies/${id}`).then(data),
  // plan: { planId, months } when approving (else the company starts on the free trial)
  setCompanyStatus: (id, status, reason, plan) => http.post(`/companies/${id}/status`, { status, reason, plan }).then(data),
  subscription: (id) => http.get(`/companies/${id}/subscription`).then(data),
  // body: { action: "assign" | "extend" | "cancel", planId, months | endDate, startDate, payment, note, graceDays }
  setSubscription: (id, body) => http.post(`/companies/${id}/subscription`, body).then(data),

  plans: () => http.get("/plans").then(data),
  savePlan: (plan) => http.post("/plans", plan).then(data),
  // Refused (409) while a company is on the plan
  deletePlan: (id) => http.delete(`/plans/${id}`).then(data),


  // Landing page content (VMS home page): draft / publish
  siteContent: () => http.get("/siteContent").then(data),
  saveSiteContent: (content, publish) => http.post("/siteContent", { content, publish }).then(data),
  resetSiteContent: () => http.post("/siteContent/reset", {}).then(data),

  admins: () => http.get("/admins").then(data),
  createAdmin: (body) => http.post("/admins", body).then(data),
  updateAdmin: (id, body) => http.post(`/admins/${id}`, body).then(data),
  deleteAdmin: (id) => http.delete(`/admins/${id}`).then(data),
  setAdminActive: (id, isActive) => http.post(`/admins/${id}/active`, { isActive }).then(data),
};

export default api;
