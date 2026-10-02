import { useServerConfig } from "@/hooks/query/use-server-config";

export function EnvironmentWatermark() {
  const { data: serverConfig } = useServerConfig();
  const branch = serverConfig?.branch;

  if (!branch || branch === "production") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
    >
      <span className="-rotate-24 text-center text-[clamp(3.5rem,16vw,14rem)] leading-none font-black tracking-[0.18em] text-foreground/[0.035] uppercase select-none">
        {branch}
      </span>
    </div>
  );
}
