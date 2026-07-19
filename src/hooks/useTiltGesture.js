"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTiltDetector, normalizeTilt } from "@/lib/heads-up/tiltEngine.mjs";

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
      const screenAngle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
      const gesture = detectorRef.current.update(normalizeTilt({ beta: event.beta, gamma: event.gamma, screenAngle }));
      if (gesture) callbackRef.current?.(gesture);
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [enabled, permission]);

  return { permission, requestPermission };
}
