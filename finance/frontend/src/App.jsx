import { useEffect, useState } from "react";
import ConnectBank from "./components/ConnectBank";
import Dashboard from "./components/Dashboard";
import "./App.css";

export default function App() {
  const [requisitionId, setRequisitionId] = useState(null);

  useEffect(() => {
    // Check if returning from bank OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const stored = localStorage.getItem("requisition_id");

    if (stored && (ref || window.location.pathname === "/callback")) {
      setRequisitionId(stored);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  return (
    <div className="app">
      {requisitionId ? (
        <Dashboard requisitionId={requisitionId} />
      ) : (
        <ConnectBank onConnected={setRequisitionId} />
      )}
    </div>
  );
}
