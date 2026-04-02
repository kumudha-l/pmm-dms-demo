import { useState } from "react";
import { extractOdometer, extractPlate } from "../services/mockAiService";

export function useExtraction() {
  const [loading, setLoading] = useState(false);

  const runPlateExtraction = async (plateFile) => {
    setLoading(true);
    try {
      return plateFile ? await extractPlate(plateFile) : null;
    } finally {
      setLoading(false);
    }
  };

  const runOdometerExtraction = async (odometerFile) => {
    setLoading(true);
    try {
      return odometerFile ? await extractOdometer(odometerFile) : null;
    } finally {
      setLoading(false);
    }
  };

  const runExtraction = async (plateFile, odometerFile) => {
    setLoading(true);
    try {
      const [plate, odometer] = await Promise.all([
        plateFile ? extractPlate(plateFile) : Promise.resolve(null),
        odometerFile ? extractOdometer(odometerFile) : Promise.resolve(null),
      ]);
      return { plate, odometer };
    } finally {
      setLoading(false);
    }
  };

  return { loading, runExtraction, runPlateExtraction, runOdometerExtraction };
}
