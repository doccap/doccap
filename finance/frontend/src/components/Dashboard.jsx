import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";
import { getAccounts, getAnalysis, getInsights, getTransactions } from "../api";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
const fmt = (n) => `€${Number(n).toFixed(2)}`;

export default function Dashboard({ tokenId, onDisconnect }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAccounts(tokenId)
      .then((accs) => {
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccount(accs[0].id);
      })
      .catch(() => setError("Sessione scaduta. Riconnetti il tuo conto."));
  }, [tokenId]);

  const loadData = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    try {
      const [an, txs] = await Promise.all([
        getAnalysis(tokenId, selectedAccount, dateFrom, dateTo),
        getTransactions(tokenId, selectedAccount, dateFrom, dateTo),
      ]);
      setAnalysis(an);
      setTransactions(txs);
      setInsights(null);
    } catch {
      setError("Errore nel caricamento dei dati.");
    }
    setLoading(false);
  }, [tokenId, selectedAccount, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGetInsights = async () => {
    setLoadingInsights(true);
    try {
      const result = await getInsights(analysis);
      setInsights(result?.suggerimenti || []);
      setActiveTab("insights");
    } catch {
      setError("Errore nell'analisi AI.");
    }
    setLoadingInsights(false);
  };

  const categoryData = analysis
    ? Object.entries(analysis.by_category).map(([name, value]) => ({ name, value: +value.toFixed(2) }))
    : [];

  const trendData = analysis
    ? Object.entries(analysis.monthly_trends).map(([month, value]) => ({ month, spese: +value.toFixed(2) }))
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Finance Dashboard</h1>
        <div className="controls">
          {accounts.length > 0 && (
            <select value={selectedAccount || ""} onChange={(e) => setSelectedAccount(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name || a.iban || a.id}
                </option>
              ))}
            </select>
          )}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ color: "#94a3b8" }}>→</span>
          <input type="date" value={dateTo} readOnly />
          <button className="btn-primary" onClick={loadData}>Aggiorna</button>
          <button className="btn-secondary" onClick={onDisconnect}>Disconnetti</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Caricamento dati...</div>}

      {analysis && !loading && (
        <>
          <div className="kpi-row">
            <div className="kpi-card kpi-red">
              <span className="kpi-label">Spese totali</span>
              <span className="kpi-value">{fmt(analysis.total_expenses)}</span>
            </div>
            <div className="kpi-card kpi-green">
              <span className="kpi-label">Entrate totali</span>
              <span className="kpi-value">{fmt(analysis.total_income)}</span>
            </div>
            <div className="kpi-card kpi-blue">
              <span className="kpi-label">Saldo periodo</span>
              <span className="kpi-value">{fmt(analysis.total_income - analysis.total_expenses)}</span>
            </div>
            <div className="kpi-card kpi-purple">
              <span className="kpi-label">Transazioni</span>
              <span className="kpi-value">{analysis.transaction_count}</span>
            </div>
          </div>

          <div className="tabs">
            {["overview", "trends", "recurring", "transactions", "insights"].map((tab) => (
              <button key={tab} className={`tab${activeTab === tab ? " active" : ""}`} onClick={() => setActiveTab(tab)}>
                {{ overview: "Categorie", trends: "Trend", recurring: "Ricorrenti", transactions: "Movimenti", insights: "Ottimizzazioni AI" }[tab]}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="tab-content two-col">
              <div className="chart-card">
                <h3>Spese per categoria</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3>Top categorie</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categoryData.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `€${v}`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "trends" && (
            <div className="tab-content">
              <div className="chart-card full">
                <h3>Spese mensili</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `€${v}`} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="spese" stroke="#6366f1" strokeWidth={2} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "recurring" && (
            <div className="tab-content">
              <h3>Spese ricorrenti rilevate</h3>
              <p className="hint">Pagamenti identificati automaticamente come periodici</p>
              <table className="data-table">
                <thead>
                  <tr><th>Descrizione</th><th>Categoria</th><th>Importo medio</th><th>Occorrenze</th><th>Costo annuo est.</th><th>Ultima data</th></tr>
                </thead>
                <tbody>
                  {analysis.recurring.map((r, i) => (
                    <tr key={i}>
                      <td>{r.description}</td>
                      <td><span className="badge">{r.category}</span></td>
                      <td>{fmt(r.avg_amount)}</td>
                      <td>{r.frequency}</td>
                      <td className="bold">{fmt(r.annual_cost)}</td>
                      <td>{r.last_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="tab-content">
              <h3>Movimenti ({transactions.length})</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th>Importo</th></tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={i}>
                      <td>{tx.date}</td>
                      <td>{tx.description}</td>
                      <td><span className="badge">{tx.category}</span></td>
                      <td className={tx.amount < 0 ? "amount-neg" : "amount-pos"}>{fmt(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "insights" && (
            <div className="tab-content">
              {!insights ? (
                <div className="insights-cta">
                  <h3>Ottimizzazioni AI</h3>
                  <p>Claude analizza le tue spese e suggerisce dove puoi risparmiare concretamente.</p>
                  <button className="btn-primary btn-large" onClick={handleGetInsights} disabled={loadingInsights}>
                    {loadingInsights ? "Analisi in corso..." : "Analizza con AI"}
                  </button>
                </div>
              ) : (
                <div>
                  <h3>Suggerimenti di ottimizzazione</h3>
                  <div className="insights-grid">
                    {insights.map((s, i) => (
                      <div key={i} className={`insight-card priority-${s.priorita}`}>
                        <div className="insight-header">
                          <span className="insight-category">{s.categoria}</span>
                          <span className={`priority-badge ${s.priorita}`}>{s.priorita}</span>
                        </div>
                        <p className="insight-action">{s.azione}</p>
                        <div className="insight-saving">
                          Risparmio stimato: <strong>{fmt(s.risparmio_mensile_eur)}/mese</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-secondary" onClick={handleGetInsights} disabled={loadingInsights}>
                    Rigenera suggerimenti
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
