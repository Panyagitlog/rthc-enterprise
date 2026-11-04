import { createContext, useContext } from "react";
import type { RTSRMPProfile } from "./types";

export const RTSRMPProfileContext = createContext<RTSRMPProfile | null>(null);

export function useRTSRMPProfile(): RTSRMPProfile {
  const profile = useContext(RTSRMPProfileContext);
  if (!profile) throw new Error("RTSRMP profile context is unavailable.");
  return profile;
}
