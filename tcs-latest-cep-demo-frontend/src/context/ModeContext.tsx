import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Mode = "platform" | "customer";

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const MODE_STORAGE_KEY = "ltc-app-mode";

const ModeContext = createContext<ModeContextType | undefined>(undefined);

function loadInitialMode(): Mode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === "platform" || stored === "customer") return stored;
  return "customer";
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(loadInitialMode);

  function setMode(nextMode: Mode) {
    setModeState(nextMode);
    localStorage.setItem(MODE_STORAGE_KEY, nextMode);
  }

  const value = useMemo<ModeContextType>(() => ({ mode, setMode }), [mode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextType {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used within ModeProvider");
  }
  return ctx;
}
