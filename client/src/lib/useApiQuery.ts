// client/src/lib/useApiQuery.ts
import { useEffect, useState } from "react";
import { apiFetch, ApiFetchError } from "./api";
import type { ApiError } from "@fluxion/shared";

type QueryState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError };

export function useApiQuery<T>(path: string): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });

  useEffect(() => {
    let ignore = false;                 // closed over by THIS effect run only
    setState({ status: "loading" });    // reset when path changes

    apiFetch<T>(path)
      .then((data) => {
        if (!ignore) setState({ status: "success", data });
      })
      .catch((e) => {
        if (ignore) return;             // superseded run — drop the result
        setState({
          status: "error",
          error: e instanceof ApiFetchError ? e.apiError
            : { type: "internal", code: "INTERNAL_ERROR", message: "Unexpected error" },
        });
      });

    return () => { ignore = true; };     // cleanup marks this run stale
  }, [path]);

  return state;
}