"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { ScorePct } from "@/components/Score";
import { BANDS, bandRange, coefficient, currentScore, departmentScore, isBand, type BandKey } from "@/lib/calc";
import { latinDigits } from "@/lib/dates";
import { num } from "@/lib/format";
import { saveScores } from "../../actions";

type Factor = { id: string; name: string; description: string | null; weight: number };

const BAND_NAMES: Record<BandKey, string> = {
  VERY_HIGH: "Very high",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  VERY_LOW: "Very low",
};

/** The scoring form: 0–5 per factor, and in the current method the effectiveness band and number; totals update as you score. */
export function ScoreForm({
  evaluationId,
  method,
  efficiencyShare,
  shared,
  own,
  ownTitle,
  initial,
  band: initialBand,
  effScore: initialEff,
  notes,
  editable,
}: {
  evaluationId: string;
  method: "CURRENT" | "DEPARTMENT";
  efficiencyShare: number;
  shared: Factor[];
  own: Factor[];
  ownTitle: string;
  initial: Record<string, number>;
  band: string | null;
  effScore: number | null;
  notes: string | null;
  editable: boolean;
}) {
  const t = useT();
  const [scores, setScores] = useState<Record<string, number>>(initial);
  const [band, setBand] = useState<string>(initialBand ?? "");
  const [eff, setEff] = useState<string>(initialEff == null ? "" : String(initialEff));
  const effNum = eff.trim() === "" ? null : Number(latinDigits(eff));
  const item = (f: Factor) => ({ weight: f.weight, score: scores[f.id] ?? null });

  const result = useMemo(() => {
    if (method === "CURRENT") {
      const r = currentScore(shared.map(item), band, effNum, efficiencyShare);
      return { efficiency: r.efficiency, effectiveness: r.effectiveness, total: r.total, percent: r.total, problem: r.problem, range: r.range };
    }
    const r = departmentScore(shared.map(item), own.map(item));
    return { efficiency: r.efficiency, effectiveness: r.effectiveness, total: r.total, percent: r.percent, problem: r.problem, range: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, band, effNum, method, efficiencyShare]);

  const problemText: Record<string, string> = {
    WEIGHTS: t("The factor weights don't add up; ask HR to fix them."),
    WAITING: t("Waiting for efficiency and effectiveness scores."),
    CHOOSE_BAND: t("Choose the effectiveness band."),
    OUT_OF_BAND: result.range
      ? t("Enter an effectiveness number from {min} to {max}.", { min: num(t, result.range.min), max: num(t, result.range.max) })
      : "",
    INCOMPLETE: t("Score every factor."),
  };
  const effMax = 100 - efficiencyShare;

  const table = (title: string, factors: Factor[]) => (
    <section className="card space-y-2 p-0">
      <h2 className="px-4 pt-4 font-semibold">{title}</h2>
      <table className="table table-stack">
        <thead>
          <tr>
            <th className="ps-4">{t("Factor")}</th>
            <th className="text-center">{t("Weight")}</th>
            <th>{t("Score (0–5)")}</th>
          </tr>
        </thead>
        <tbody>
          {factors.map((f) => (
            <tr key={f.id}>
              <td data-label={t("Factor")} className="ps-4">
                <p className="font-medium">{f.name}</p>
                {f.description && <p className="text-xs text-slate-500">{f.description}</p>}
              </td>
              <td data-label={t("Weight")} className="text-center">{num(t, f.weight)}</td>
              <td data-label={t("Score (0–5)")}>
                <input type="hidden" name={`score_${f.id}`} value={scores[f.id] ?? ""} />
                <div className="inline-flex overflow-hidden rounded-md border border-slate-300" role="radiogroup" aria-label={f.name}>
                  {[0, 1, 2, 3, 4, 5].map((n) => {
                    const on = scores[f.id] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!editable}
                        onClick={() => setScores((s) => ({ ...s, [f.id]: n }))}
                        className={`h-9 w-9 border-s border-slate-300 text-sm first:border-s-0 ${on ? "bg-brand-600 font-semibold text-white" : "bg-white text-slate-700 hover:bg-slate-100"} disabled:cursor-default disabled:hover:bg-white ${on ? "disabled:hover:bg-brand-600" : ""}`}
                      >
                        {num(t, n)}
                      </button>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

  return (
    <form action={saveScores} className="space-y-5">
      <input type="hidden" name="evaluationId" value={evaluationId} />
      {table(method === "CURRENT" ? t("Efficiency") : t("Shared efficiency factors"), shared)}
      {method === "DEPARTMENT" && own.length > 0 && table(ownTitle, own)}
      {method === "DEPARTMENT" && own.length === 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("This person's department has no effectiveness factors.")}</p>
      )}

      {method === "CURRENT" && (
        <section className="card space-y-3">
          <h2 className="font-semibold">{t("Effectiveness (of {max})", { max: num(t, effMax) })}</h2>
          <p className="text-sm text-slate-600">{t("How well does this person do their job's duties?")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{t("Band")}</label>
              <select className="input" name="band" value={band} onChange={(e) => setBand(e.target.value)} disabled={!editable}>
                <option value="">—</option>
                {BANDS.map((b) => {
                  const r = bandRange(b.key, effMax);
                  return (
                    <option key={b.key} value={b.key}>
                      {t(BAND_NAMES[b.key])} ({num(t, r.min)}–{num(t, r.max)})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label">{t("Effectiveness score")}</label>
              <input
                className="input"
                name="effectivenessScore"
                inputMode="decimal"
                value={eff}
                onChange={(e) => setEff(e.target.value)}
                disabled={!editable || !isBand(band)}
                placeholder={result.range ? `${num(t, result.range.min)}–${num(t, result.range.max)}` : ""}
              />
            </div>
          </div>
          {/* A disabled box isn't sent with the form; keep its value. */}
          {!editable && <input type="hidden" name="effectivenessScore" value={eff} />}
        </section>
      )}

      <section className="card space-y-3">
        <div>
          <label className="label">{t("Notes")}</label>
          <textarea className="input" name="notes" rows={2} defaultValue={notes ?? ""} disabled={!editable} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">{t("Efficiency")}</p>
            <p className="text-lg font-semibold">{num(t, result.efficiency) || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("Effectiveness")}</p>
            <p className="text-lg font-semibold">{num(t, result.effectiveness) || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("Score (of {max})", { max: num(t, method === "CURRENT" ? 100 : 650) })}</p>
            <p className="text-lg font-semibold">{num(t, result.total) || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("Percent")}</p>
            <p className="text-lg"><ScorePct t={t} value={result.percent} /></p>
            {result.percent != null && (
              <p className="text-xs text-slate-500">{t("Coefficient {c}", { c: num(t, coefficient(result.percent)) })}</p>
            )}
          </div>
        </div>
        {result.problem && <p className="text-sm text-amber-800">{problemText[result.problem]}</p>}
        {editable && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="submit" name="intent" value="save">{t("Save")}</button>
            <button className="btn-primary" type="submit" name="intent" value="submit" disabled={result.total == null}>
              {t("Send for approval")}
            </button>
          </div>
        )}
      </section>
    </form>
  );
}
