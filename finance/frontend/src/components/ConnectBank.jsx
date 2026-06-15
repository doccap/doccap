import { useState } from "react";
import { getAuthUrl, uploadCsv } from "../api";

export default function ConnectBank({ onDemo }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDemo = async () => {
    setLoading(true);
    try {
      const { token_id } = await (await import("axios")).default.get("http://localhost:5050/api/demo").then(r => r.data);
      onDemo(token_id);
    } catch {
      setError("Errore nel caricamento dei dati demo.");
      setLoading(false);
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { token_id } = await uploadCsv(file);
      onDemo(token_id);
    } catch {
      setError("Errore nel caricamento del CSV. Verifica che il file sia un export Hype valido.");
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url, state } = await getAuthUrl();
      sessionStorage.setItem("oauth_state", state);
      window.location.href = url;
    } catch (e) {
      setError("Errore di connessione. Verifica che il backend sia avviato e le credenziali API siano corrette.");
      setLoading(false);
    }
  };

  return (
    <div className="connect-bank">
      <div className="connect-hero">
        <div className="connect-icon">🏦</div>
        <h2>Finance Dashboard</h2>
        <p className="subtitle">
          Connetti il tuo conto bancario tramite <strong>Open Banking PSD2</strong> per analizzare
          le tue spese e ricevere suggerimenti personalizzati su come ottimizzare i costi.
        </p>
        <div className="connect-features">
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>Connessione sicura — le credenziali non vengono mai memorizzate</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🏛️</span>
            <span>Supporto per tutte le principali banche italiane</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🤖</span>
            <span>Analisi AI delle spese con suggerimenti personalizzati</span>
          </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <button className="btn-primary btn-large btn-connect" onClick={handleConnect} disabled={loading}>
          {loading ? "Reindirizzamento alla banca..." : "Collega il tuo conto"}
        </button>
        <label className="btn-secondary btn-large" style={{ marginTop: 12, cursor: "pointer", display: "block", textAlign: "center" }}>
          {loading ? "Caricamento..." : "Importa CSV Hype"}
          <input type="file" accept=".csv" onChange={handleCsvUpload} disabled={loading} style={{ display: "none" }} />
        </label>
        <button className="btn-secondary btn-large" onClick={handleDemo} disabled={loading} style={{ marginTop: 8 }}>
          Prova con dati demo
        </button>
        <p className="powered-by">
          Powered by <strong>TrueLayer</strong> — Open Banking PSD2
        </p>
      </div>
    </div>
  );
}
