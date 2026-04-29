import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TenantContext = createContext(null);

export function TenantProvider({ initialTenantId, children }) {
  const [tenantId, setTenantId] = useState(initialTenantId || "");

  useEffect(() => {
    setTenantId(initialTenantId || "");
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
