import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  // Game uses window/localStorage extensively — render client-only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Index />;
}
