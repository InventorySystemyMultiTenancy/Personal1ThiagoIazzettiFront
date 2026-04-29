import React from "react";

export default function PlaceholderPage({ title, subtitle }) {
  return (
    <section className="rounded-premium border border-black/10 bg-white p-5 shadow-soft">
      <h1 className="font-title text-3xl text-premium-gold">{title}</h1>
      <p className="mt-2 font-body text-sm text-premium-anthracite/70">
        {subtitle}
      </p>
    </section>
  );
}
