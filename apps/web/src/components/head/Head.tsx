import {
  useEffect,
  useId,
  ReactElement,
  Children,
  ReactNode,
  isValidElement,
} from "react";
import { useHead } from "./HeadProvider";

interface HeadProps {
  children: ReactNode; // Allow more flexible children
}

export function Head({ children }: HeadProps) {
  const { addElements, removeElements } = useHead();
  const id = useId();

  useEffect(() => {
    // Filter out non-element children (like booleans from conditional rendering)
    const elementsArray = Children.toArray(children).filter(
      isValidElement
    ) as ReactElement[];
    addElements(id, elementsArray);

    return () => {
      removeElements(id);
    };
    // A more robust way to track changes to children props might be needed if this proves insufficient.
    // For now, JSON.stringify offers a reasonable heuristic if props are simple.
    // Note: This will not work well for children with functions or complex objects in props.
  }, [
    id,
    addElements,
    removeElements,
    JSON.stringify(
      Children.toArray(children)
        .filter(isValidElement)
        .map((el) => el.props)
    ),
  ]);

  return null;
}
