"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteStatus } from "@/lib/domain";

const labels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Cambios solicitados",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["CANCELLED"],
  SENT: ["IN_REVIEW", "CHANGES_REQUESTED", "EXPIRED", "CANCELLED"],
  IN_REVIEW: ["CHANGES_REQUESTED", "CANCELLED"],
  CHANGES_REQUESTED: ["CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

const colors: Record<QuoteStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-50 text-blue-700",
  IN_REVIEW: "bg-amber-50 text-amber-800",
  CHANGES_REQUESTED: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-orange-50 text-orange-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function QuoteStatusControl({ id, status }: { id: string; status: QuoteStatus }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function changeStatus(nextStatus: QuoteStatus) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/quotes/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "No se pudo cambiar el estado.";
        throw new Error(message);
      }
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cambiar el estado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[status]}`}>
        {labels[status]}
      </span>
      {transitions[status].length > 0 && (
        <select
          aria-label="Cambiar estado de la cotización"
          value=""
          disabled={pending}
          onChange={(event) => {
            const nextStatus = transitions[status].find((candidate) => candidate === event.target.value);
            if (nextStatus) void changeStatus(nextStatus);
          }}
          className="mt-1 block max-w-[130px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 disabled:opacity-50"
        >
          <option value="">{pending ? "Actualizando..." : "Cambiar estado"}</option>
          {transitions[status].map((nextStatus) => (
            <option key={nextStatus} value={nextStatus}>{labels[nextStatus]}</option>
          ))}
        </select>
      )}
      {error && <span role="alert" className="mt-1 block max-w-[140px] text-[10px] text-red-700">{error}</span>}
    </div>
  );
}
