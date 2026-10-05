"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Latest result wins; identical in-flight requests are shared, never duplicated.
export default function useApiRequest() {
  const current = useRef(null);
  const [state, setState] = useState({ data: null, status: "idle", error: "" });

  useEffect(() => () => {
    current.current?.controller.abort();
    current.current = null;
  }, []);

  const request = useCallback((url) => {
    if (current.current?.url === url) return current.current.promise;
    current.current?.controller.abort();
    const operation = { url, controller: new AbortController(), promise: null };
    current.current = operation;
    setState((previous) => ({ ...previous, status: "loading", error: "" }));

    operation.promise = (async () => {
      try {
        const response = await fetch(url, { signal: operation.controller.signal });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "No se pudo completar la solicitud. Intenta de nuevo.");
        if (operation.controller.signal.aborted || current.current !== operation) return null;
        setState({ data: json, status: "success", error: "" });
        return json;
      } catch (error) {
        if (!operation.controller.signal.aborted && current.current === operation) {
          const message = error instanceof TypeError || error instanceof SyntaxError
            ? "No se pudo completar la solicitud. Revisa tu conexión e intenta de nuevo."
            : error.message || "Revisa tu conexión e intenta de nuevo.";
          setState({ data: null, status: "error", error: message });
        }
        return null;
      } finally {
        if (current.current === operation) current.current = null;
      }
    })();
    return operation.promise;
  }, []);

  return { ...state, request };
}
