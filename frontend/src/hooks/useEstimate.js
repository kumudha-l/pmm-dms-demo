import { useState } from "react";
import { recomputeEstimate } from "../services/jobCardService";

export function useEstimate() {
  const [loading, setLoading] = useState(false);

  const calculate = async (jobCardId, payload) => {
    setLoading(true);
    try {
      return await recomputeEstimate(jobCardId, payload);
    } finally {
      setLoading(false);
    }
  };

  return { loading, calculate };
}
