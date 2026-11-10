import { withBase } from "@/lib/paths";

/** The tactHR logo (the two figures and the wordmark), for light backgrounds. */
export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={withBase("/tacthr-logo.png")} alt="tactHR" className={className} />;
}

/** For the dark side menu: the figures, with "tact" in white and "HR" in orange. */
export function LogoOnDark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={withBase("/tacthr-mark.png")} alt="" className={className} />
      <span className="text-lg font-bold leading-none tracking-tight">
        <span className="text-white">tact</span>
        <span className="text-brand-500">HR</span>
      </span>
    </span>
  );
}
