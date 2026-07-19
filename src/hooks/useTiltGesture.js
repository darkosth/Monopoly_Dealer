"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTiltDetector, projectForeheadTilt } from "@/lib/heads-up/tiltEngine.mjs";

export function useTiltGesture({ enabled, onGesture }) {
  const [permission, setPermission] = useState("unknown");
  const detectorRef = useRef(createTiltDetector());
  const callbackRef = useRef(onGesture);

  useEffect(() => { callbackRef.current = onGesture; }, [onGesture]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || typeof window.DeviceOrientationEvent === "undefined") {
      setPermission("unsupported");
      return false;
    }
    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
        const result = await window.DeviceOrientationEvent.requestPermission();
        setPermission(result);
        return result === "granted";
      }
      setPermission("granted");
      return true;
    } catch {
      setPermission("denied");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || permission !== "granted") return undefined;
    detectorRef.current = createTiltDetector();
    const handleOrientation = (event) => {
      const tilt = projectForeheadTilt({ beta: event.beta, gamma: event.gamma });
      if (tilt === null) return;
      const gesture = detectorRef.current.update(tilt);
      if (gesture) callbackRef.current?.(gesture);
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [enabled, permission]);

  return { permission, requestPermission };
}
