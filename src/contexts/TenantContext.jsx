import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TenantContext = createContext(null);

export function getTenantFromHost() {
  try {
    const host = window?.location?.hostname || "";
    const domain = "selfmachine.com.br";

    if (!host) return null;

    // If host is exactly the domain, no subdomain present.
    if (host === domain || host.endsWith(`.${domain}`) === false) {
      // also treat localhost and plain hostnames as no-subdomain
      return null;
    }

    // Extract the left-most label as tenant id (e.g. thiagoiazzetti.selfmachine.com.br -> thiagoiazzetti)
    const parts = host.split(".");
    if (parts.length < 3) return null;

    const subdomain = parts[0];
    if (!subdomain || subdomain === "www") return null;
    return subdomain;
  } catch {
    return null;
  }
}

export function TenantProvider({ initialTenantId, children }) {
  const detected = initialTenantId || getTenantFromHost() || "";
  const [tenantId, setTenantId] = useState(detected);

  useEffect(() => {
    setTenantId(initialTenantId || getTenantFromHost() || "");
  }, [initialTenantId]);

  const value = useMemo(
    () => ({
      tenantId,
      setTenantId,
    }),
    [tenantId],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}
