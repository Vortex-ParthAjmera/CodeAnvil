export type Route =
  | { name: "landing" }
  | { name: "auth" }
  | { name: "dashboard" }
  | { name: "lab"; exampleId?: string; stepIndex?: number }
  | { name: "saved" }
  | { name: "atlas"; section?: "structure" | "topic"; itemId?: string }
  | { name: "roadmap" }
  | { name: "arena" }
  | { name: "visualize" }
  | { name: "story" }
  | { name: "duel" };

export function parseHash(): Route {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [seg, id, step] = parts;
  if (seg === "lab") {
    const parsedStep = step !== undefined ? Number(step) : undefined;
    return {
      name: "lab",
      exampleId: id,
      stepIndex:
        parsedStep !== undefined && Number.isFinite(parsedStep)
          ? parsedStep
          : undefined,
    };
  }
  if (seg === "auth") return { name: "auth" };
  if (seg === "saved") return { name: "saved" };
  if (seg === "atlas") {
    if ((id === "structure" || id === "topic") && step) {
      return { name: "atlas", section: id, itemId: decodeURIComponent(step) };
    }
    return { name: "atlas" };
  }
  if (seg === "roadmap") return { name: "roadmap" };
  if (seg === "dashboard") return { name: "dashboard" };
  if (seg === "arena") return { name: "arena" };
  if (seg === "visualize") return { name: "visualize" };
  if (seg === "story") return { name: "story" };
  if (seg === "duel") return { name: "duel" };
  // "" or "#/" → landing page
  return { name: "landing" };
}

export function navigate(route: Route): void {
  if (route.name === "lab") {
    const base = route.exampleId ? `#/lab/${route.exampleId}` : "#/lab";
    location.hash =
      route.stepIndex !== undefined ? `${base}/${route.stepIndex}` : base;
  } else if (route.name === "auth") {
    location.hash = "#/auth";
  } else if (route.name === "saved") {
    location.hash = "#/saved";
  } else if (route.name === "atlas") {
    location.hash = route.section && route.itemId
      ? `#/atlas/${route.section}/${encodeURIComponent(route.itemId)}`
      : "#/atlas";
  } else if (route.name === "roadmap") {
    location.hash = "#/roadmap";
  } else if (route.name === "dashboard") {
    location.hash = "#/dashboard";
  } else if (route.name === "arena") {
    location.hash = "#/arena";
  } else if (route.name === "visualize") {
    location.hash = "#/visualize";
  } else if (route.name === "story") {
    location.hash = "#/story";
  } else if (route.name === "duel") {
    location.hash = "#/duel";
  } else {
    location.hash = "#/";
  }
}
