import axios from "axios";

const BASE = "http://localhost:5050/api";

export const getAuthUrl = () =>
  axios.get(`${BASE}/auth/url`).then((r) => r.data);

export const exchangeCode = (code, state) =>
  axios.post(`${BASE}/auth/callback`, { code, state }, { withCredentials: true }).then((r) => r.data);

export const getAccounts = (token_id) =>
  axios.get(`${BASE}/accounts`, { params: { token_id }, withCredentials: true }).then((r) => r.data);

export const getAnalysis = (token_id, account_id, date_from, date_to) =>
  axios.get(`${BASE}/analysis`, { params: { token_id, account_id, date_from, date_to } }).then((r) => r.data);

export const getTransactions = (token_id, account_id, date_from, date_to) =>
  axios.get(`${BASE}/transactions`, { params: { token_id, account_id, date_from, date_to } }).then((r) => r.data);

export const getInsights = (analysisData) =>
  axios.post(`${BASE}/insights`, analysisData).then((r) => r.data);
