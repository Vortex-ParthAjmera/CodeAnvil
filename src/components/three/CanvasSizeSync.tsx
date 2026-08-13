import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Keeps React Three Fiber canvases from falling back to the browser default
 * 300x150 drawing buffer when nested in flexible dashboard panes.
 */
export function CanvasSizeSync() {
  const { gl } = useThree();

  useLayoutEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;

    let frame = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastDpr = 0;

    const resize = () => {
      frame = 0;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (width === lastWidth && height === lastHeight && dpr === lastDpr) return;

      lastWidth = width;
      lastHeight = height;
      lastDpr = dpr;
      const canvas = gl.domElement;

      canvas.style.width = "100%";
      canvas.style.height = "100%";
      gl.setPixelRatio(dpr);
      gl.setSize(rect.width, rect.height, false);
      gl.setViewport(0, 0, width, height);
    };

    const scheduleResize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(resize);
    };

    scheduleResize();
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(host);
    window.addEventListener("resize", scheduleResize);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleResize);
    };
  }, [gl]);

  return null;
}
