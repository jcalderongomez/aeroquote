"use client";

import { useState } from "react";

export function ProposalResponseForm({ token }: { token: string }) {
  const [response, setResponse] = useState<"APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(nextResponse: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    setPending(true);
    setMessage("");
    try {
      const result = await fetch(`/api/public/proposals/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: nextResponse, note }),
      });
      const body: unknown = await result.json();
      if (!result.ok) {
        const error = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "No se pudo registrar la respuesta.";
        throw new Error(error);
      }
      setResponse(nextResponse);
      setMessage(nextResponse === "APPROVED"
        ? "Gracias. Tu aprobación quedó registrada para esta versión."
        : nextResponse === "REJECTED"
          ? "Tu respuesta quedó registrada."
          : "Registramos tu solicitud de ajustes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la respuesta.");
    } finally {
      setPending(false);
    }
  }

  if (response) {
    return <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>;
  }

  return (
    <div className="space-y-4">
      <label className="block text-xs font-semibold text-slate-600">
        Comentario (opcional)
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500" />
      </label>
      {message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => void submit("APPROVED")} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          Aprobar propuesta
        </button>
        <button type="button" disabled={pending} onClick={() => void submit("CHANGES_REQUESTED")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Solicitar cambios
        </button>
        <button type="button" disabled={pending} onClick={() => void submit("REJECTED")} className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
          Rechazar
        </button>
      </div>
      {pending && <p role="status" className="text-xs text-slate-500">Registrando respuesta…</p>}
    </div>
  );
}
