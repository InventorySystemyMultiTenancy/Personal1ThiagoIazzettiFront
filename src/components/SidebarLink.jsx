import React from "react";
import { NavLink } from "react-router-dom";

export default function SidebarLink({ to, icon: Icon, label, activeHint }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition ${
          isActive
            ? "border-[#d4af37] bg-[#d4af37] text-black shadow-[0_12px_30px_rgba(212,175,55,0.24)]"
            : "border-white/10 text-white/72 hover:border-[#d4af37]/60 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon size={18} />
      <span className="font-body font-medium">{label}</span>
      {activeHint ? (
        <span className="ml-auto h-2 w-2 rounded-full bg-current" />
      ) : null}
    </NavLink>
  );
}
