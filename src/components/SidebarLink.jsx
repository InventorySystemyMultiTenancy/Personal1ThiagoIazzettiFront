import React from "react";
import { NavLink } from "react-router-dom";

export default function SidebarLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-premium border px-3 py-2.5 text-sm transition ${
          isActive
            ? "border-premium-gold bg-premium-gold text-premium-ink shadow-gold"
            : "border-white/10 text-white/80 hover:border-premium-gold/60 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon size={18} />
      <span className="font-body font-medium">{label}</span>
    </NavLink>
  );
}
