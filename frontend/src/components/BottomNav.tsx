import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "HOME", icon: "\u2302" },
  { to: "/markets", label: "MARKETS", icon: "\u25C8" },
  { to: "/signals", label: "SIGNALS", icon: "\u26A1" },
  { to: "/history", label: "HISTORY", icon: "\u25A4" },
  { to: "/settings", label: "SETTINGS", icon: "\u2699" }
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
