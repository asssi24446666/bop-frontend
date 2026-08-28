import { HashRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Home } from "@/pages/Home";
import { Markets } from "@/pages/Markets";
import { Signals } from "@/pages/Signals";
import { History } from "@/pages/History";
import { Settings } from "@/pages/Settings";
import { useSignalMonitor } from "@/hooks/useSignalMonitor";
import { setupPushNotifications } from "@/lib/pushSetup";
import "@/styles/theme.css";

export default function App() {
  // Runs for the lifetime of the app (any tab) — watches every ACTIVE
  // signal against live price and resolves PROFIT/LOSS automatically.
  useSignalMonitor();

  useEffect(() => {
    setupPushNotifications();
  }, []);

  return (
    <HashRouter>
      <div className="app-shell">
        <div className="top-bar">
          <div className="brand">
            <div className="mark">BOP<span>.</span></div>
            <div className="full-name">BANK OF PROFIT</div>
          </div>
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
}
