import { useState } from "react";

export function useAdminSearch(onChange: () => void) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");

  return {
    query,
    formProps: {
      value: draft,
      onChange: setDraft,
      onSubmit: () => {
        setQuery(draft);
        onChange();
      },
      onClear: () => {
        setQuery("");
        setDraft("");
        onChange();
      },
      showClear: Boolean(query),
    },
  };
}
