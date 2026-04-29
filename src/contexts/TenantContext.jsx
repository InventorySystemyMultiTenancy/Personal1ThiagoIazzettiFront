import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TenantContext = createContext(null);

export function TenantProvider({ initialPersonalId, children }) {
  const [personalId, setPersonalId] = useState(initialPersonalId || "");

  useEffect(() => {
    setPersonalId(initialPersonalId || "");
  }, [initialPersonalId]);

  const value = useMemo(
    () => ({
      personalId,
      setPersonalId,
    }),
    [personalId],
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
