import { getT } from "@/lib/i18n/server";
import { parseMsg } from "@/lib/i18n/message";

/** Shows a notice or error from the URL, translated. */
export async function Flash({ error, notice }: { error?: string; notice?: string }) {
  const t = await getT();
  const show = (s: string) => {
    const { key, vars } = parseMsg(s);
    return t(key, vars);
  };
  if (error) return <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{show(error)}</p>;
  if (notice) return <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{show(notice)}</p>;
  return null;
}
