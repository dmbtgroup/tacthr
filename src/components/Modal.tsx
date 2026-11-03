"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/I18nProvider";

/** A button that opens its children in a modal overlay (closes with ✕, Esc or a click on the backdrop). */
export function Modal({
  buttonLabel,
  buttonAriaLabel,
  buttonClassName = "btn-primary",
  title,
  defaultOpen = false,
  wide = false,
  children,
}: {
  buttonLabel: React.ReactNode;
  /** The button's accessible name, when its label is an icon. */
  buttonAriaLabel?: string;
  buttonClassName?: string;
  title: string;
  defaultOpen?: boolean;
  /** Room for a table, e.g. an import preview. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();

  // Focus the dialog itself rather than its first button, so Safari doesn't outline the ✕ on open.
  function open() {
    ref.current?.showModal();
    ref.current?.focus();
  }

  useEffect(() => {
    if (defaultOpen) open();
  }, [defaultOpen]);

  return (
    <>
      <button type="button" className={buttonClassName} onClick={open} aria-label={buttonAriaLabel} title={buttonAriaLabel}>
        {buttonLabel}
      </button>
      <dialog
        ref={ref}
        tabIndex={-1}
        className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} whitespace-normal rounded-lg p-0 text-start font-normal shadow-xl outline-none backdrop:bg-slate-900/40`}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              className="ms-auto rounded px-2 text-xl leading-none text-slate-500 outline-none hover:text-slate-900 focus-visible:bg-slate-100 focus-visible:text-slate-900"
              aria-label={t("Close")}
              onClick={() => ref.current?.close()}
            >
              ×
            </button>
          </div>
          {/* The × above closes it; popups have no Cancel button. */}
          {children}
        </div>
      </dialog>
    </>
  );
}
