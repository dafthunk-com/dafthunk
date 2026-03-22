import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

const STORAGE_KEY = "assistant-open";

interface AssistantContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === "true"
  );

  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsOpen((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      sessionStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const toggle = useCallback(() => setOpen((prev) => !prev), [setOpen]);
  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);

  return (
    <AssistantContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return ctx;
}
