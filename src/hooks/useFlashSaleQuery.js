import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getFlashSaleState } from "../api/flashSaleApi";

export function useFlashSaleQuery(options = {}) {
  const queryClient = useQueryClient();
  const previousStateKeyRef = useRef("");
  const query = useQuery({
    queryKey: ["flash-sale"],
    queryFn: getFlashSaleState,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 15,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...options,
  });

  useEffect(() => {
    const stateKey = [
      Boolean(query.data?.isEnabled),
      Boolean(query.data?.isActive),
      String(query.data?.currentCampaignId ?? "").trim(),
      String(query.data?.startsAt ?? "").trim(),
      String(query.data?.endsAt ?? "").trim(),
    ].join("|");

    if (!stateKey || stateKey === previousStateKeyRef.current) {
      return;
    }

    previousStateKeyRef.current = stateKey;
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [
    query.data?.currentCampaignId,
    query.data?.endsAt,
    query.data?.isActive,
    query.data?.isEnabled,
    query.data?.startsAt,
    queryClient,
  ]);

  return query;
}
