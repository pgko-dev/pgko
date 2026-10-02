import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

export function Provider({
  children,
  queryClient,
}: Readonly<{ children: React.ReactNode; queryClient: QueryClient }>) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
