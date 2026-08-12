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

    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      const canvas = gl.domElement;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      gl.setPixelRatio(dpr);
      gl.setSize(rect.width, rect.height, false);
      gl.setViewport(0, 0, width, height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const frame = window.requestAnimationFrame(resize);
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [gl]);

  return null;
}
