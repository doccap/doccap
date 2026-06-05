import { useState, useEffect } from "react";
import { getInstitutions, connectBank } from "../api";

export default function ConnectBank({ onConnected }) {
  const [institutions, setInstitutions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInstitutions("IT")
      .then(setInstitutions)
      .catch(() => setError("Errore nel caricamento delle banche"));
  }, []);

  const filtered = institutions.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnect = async (institution) => {
    setLoading(true);
    try {
      const redirect = `${window.location.origin}/callback`;
      const data = await connectBank(institution.id, redirect);
      // Save requisition_id for after redirect
      localStorage.setItem("requisition_id", data.requisition_id);
      window.location.href = data.link;
    } catch (e) {
      setError("Errore nella connessione. Verifica le credenziali API.");
      setLoading(false);
    }
  };

  return (
    <div className="connect-bank">
      <h2>Collega il tuo conto bancario</h2>
      <p className="subtitle">
        Connessione sicura tramite Open Banking PSD2. Le tue credenziali non vengono mai memorizzate.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <input
        className="search-input"
        placeholder="Cerca la tua banca..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="institution-grid">
        {filtered.map((inst) => (
          <button
            key={inst.id}
            className="institution-card"
            onClick={() => handleConnect(inst)}
            disabled={loading}
          >
            {inst.logo && <img src={inst.logo} alt={inst.name} />}
            <span>{inst.name}</span>
          </button>
        ))}
      </div>
      {loading && <div className="loading-overlay">Reindirizzamento alla banca...</div>}
    </div>
  );
}
