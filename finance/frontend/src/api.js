import axios from "axios";

const BASE = "http://localhost:5050/api";

export const getInstitutions = (country = "IT") =>
  axios.get(`${BASE}/institutions`, { params: { country } }).then((r) => r.data);

export const connectBank = (institution_id, redirect_url) =>
  axios.post(`${BASE}/connect`, { institution_id, redirect_url }, { withCredentials: true }).then((r) => r.data);

export const getAccounts = (requisition_id) =>
  axios.get(`${BASE}/accounts`, { params: { requisition_id }, withCredentials: true }).then((r) => r.data);

export const getAnalysis = (account_id, date_from, date_to) =>
  axios.get(`${BASE}/analysis`, { params: { account_id, date_from, date_to } }).then((r) => r.data);

export const getTransactions = (account_id, date_from, date_to) =>
  axios.get(`${BASE}/transactions`, { params: { account_id, date_from, date_to } }).then((r) => r.data);

export const getInsights = (analysisData) =>
  axios.post(`${BASE}/insights`, analysisData).then((r) => r.data);
