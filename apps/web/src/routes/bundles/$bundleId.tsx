import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/bundles/$bundleId")({
  component: () => <Outlet />,
});
