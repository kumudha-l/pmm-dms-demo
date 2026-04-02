import { useEffect, useState } from "react";
import { getJobCard } from "../services/jobCardService";

export function useJobCard(jobCardId) {
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(Boolean(jobCardId));

  useEffect(() => {
    if (!jobCardId) return;
    let cancelled = false;
    setLoading(true);
    getJobCard(jobCardId)
      .then((data) => {
        if (!cancelled) setJobCard(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobCardId]);

  return { jobCard, setJobCard, loading };
}
