import React from "react";
import { NavLink } from "react-router-dom";

export default function SidebarLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-white/[0.07] text-white"
            : "text-white/40 hover:bg-white/[0.04] hover:text-white/75"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#d9b341]" />
          )}
          <span
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
              isActive
                ? "bg-[#d9b341]/15 text-[#d9c179]"
                : "text-white/35 group-hover:text-white/70"
            }`}
          >
            <Icon size={15} strokeWidth={2} />
          </span>
          <span className="text-[13px] tracking-wide">{label}</span>
        </>
      )}
    </NavLink>
  );
}
