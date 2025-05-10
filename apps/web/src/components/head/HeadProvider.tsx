import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import ReactDOM from "react-dom";

type HeadElement = React.ReactElement<
  any,
  string | React.JSXElementConstructor<any>
>;

interface HeadContextType {
  addElements: (id: string, elements: HeadElement[]) => void;
  removeElements: (id: string) => void;
}

const HeadContext = createContext<HeadContextType | undefined>(undefined);

export const useHead = () => {
  const context = useContext(HeadContext);
  if (!context) {
    throw new Error("useHead must be used within a HeadProvider");
  }
  return context;
};

interface HeadProviderProps {
  children: ReactNode;
}

interface ManagedElements {
  [id: string]: HeadElement[];
}

export function HeadProvider({ children }: HeadProviderProps) {
  const [managedElements, setManagedElements] = useState<ManagedElements>({});
  const [headContainer, setHeadContainer] = useState<HTMLHeadElement | null>(
    null
  );

  useEffect(() => {
    setHeadContainer(document.head);
  }, []);

  const addElements = (id: string, elements: HeadElement[]) => {
    setManagedElements((prev) => ({ ...prev, [id]: elements }));
  };

  const removeElements = (id: string) => {
    setManagedElements((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <HeadContext.Provider value={{ addElements, removeElements }}>
      {children}
      {headContainer &&
        Object.values(managedElements)
          .flat()
          .map((element, index) =>
            ReactDOM.createPortal(
              React.cloneElement(element, { key: `head-elem-${index}` }),
              headContainer
            )
          )}
    </HeadContext.Provider>
  );
}
