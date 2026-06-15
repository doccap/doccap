import { useEffect, useState } from "react";
import ConnectBank from "./components/ConnectBank";
import Dashboard from "./components/Dashboard";
import { exchangeCode } from "./api";
import "./App.css";

export default function App() {
  const [tokenId, setTokenId] = useState(() => localStorage.getItem("token_id"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code) return;

    // Clean URL immediately
    window.history.replaceState({}, "", "/");
    setLoading(true);

    exchangeCode(code, state)
      .then(({ token_id }) => {
        localStorage.setItem("token_id", token_id);
        setTokenId(token_id);
      })
      .catch(() => alert("Errore durante l'autenticazione. Riprova."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading" style={{ paddingTop: 120 }}>Autenticazione in corso...</div>;

  return (
    <div className="app">
      {tokenId ? (
        <Dashboard
          tokenId={tokenId}
          onDisconnect={() => { localStorage.removeItem("token_id"); setTokenId(null); }}
        />
      ) : (
        <ConnectBank onDemo={(id) => { localStorage.setItem("token_id", id); setTokenId(id); }} />
      )}
    </div>
  );
}
