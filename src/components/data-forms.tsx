"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCop } from "@/lib/format";
import { calculateQuote } from "@/lib/quotes/calculations";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500";
const labelClass = "block text-xs font-semibold text-slate-600";
const buttonClass =
  "inline-flex items-center justify-center rounded-lg bg-[#1769c2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1259a8] disabled:cursor-wait disabled:opacity-60";

function FormMessage({ message, success }: { message: string; success?: boolean }) {
  if (!message) return null;
  return (
    <p role={success ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {message}
    </p>
  );
}

async function requestJson(url: string, method: "POST" | "PATCH", value: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : "No se pudo completar la operación.";
    throw new Error(message);
  }
  return body;
}

async function postJson(url: string, value: unknown) {
  return requestJson(url, "POST", value);
}

export function ClientCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [createdClientId, setCreatedClientId] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setSuccess(false);
    setCreatedClientId("");
    try {
      const created = await postJson("/api/clients", Object.fromEntries(formData));
      if (typeof created !== "object" || created === null || !("id" in created) || typeof created.id !== "string") {
        throw new Error("No se pudo identificar al cliente creado.");
      }
      setCreatedClientId(created.id);
      setMessage("Cliente creado correctamente.");
      setSuccess(true);
      router.refresh();
      formRef.current?.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el cliente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      <label className={labelClass}>Tipo de cliente
        <select name="type" className={fieldClass} defaultValue="INDIVIDUAL">
          <option value="INDIVIDUAL">Persona natural</option>
          <option value="COMPANY">Empresa</option>
        </select>
      </label>
      <label className={labelClass}>Nombre o razón social *
        <input name="name" required maxLength={160} className={fieldClass} placeholder="Nombre del cliente" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Documento / NIT
          <input name="document" maxLength={40} className={fieldClass} placeholder="Identificación" />
        </label>
        <label className={labelClass}>Ciudad
          <input name="city" maxLength={100} className={fieldClass} placeholder="Ciudad" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Correo electrónico
          <input name="email" type="email" className={fieldClass} placeholder="correo@empresa.com" />
        </label>
        <label className={labelClass}>Teléfono
          <input name="phone" maxLength={40} className={fieldClass} placeholder="+57 ..." />
        </label>
      </div>
      <label className={labelClass}>Dirección
        <input name="address" maxLength={200} className={fieldClass} placeholder="Dirección" />
      </label>
      <label className={labelClass}>Observaciones
        <textarea name="notes" maxLength={1000} rows={3} className={fieldClass} placeholder="Información útil para el equipo" />
      </label>
      <FormMessage message={message} success={success} />
      {createdClientId && (
        <Link
          href={`/quotes/new?clientId=${encodeURIComponent(createdClientId)}`}
          className="block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          Crear cotización para este cliente
        </Link>
      )}
      <button className={buttonClass} disabled={pending}>{pending ? "Guardando..." : "Guardar cliente"}</button>
    </form>
  );
}

export function ClientEditForm({
  client,
}: {
  client: {
    id: string;
    type: "INDIVIDUAL" | "COMPANY";
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setSuccess(false);
    try {
      await requestJson(`/api/clients/${client.id}`, "PATCH", Object.fromEntries(formData));
      setMessage("Cliente actualizado correctamente.");
      setSuccess(true);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el cliente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="text-left">
      <summary className="cursor-pointer text-xs font-semibold text-[#1769c2] hover:underline">Editar</summary>
      <form action={submit} className="mt-4 min-w-[250px] space-y-3 rounded-lg border border-slate-200 bg-white p-3">
        <label className={labelClass}>Tipo de cliente
          <select name="type" defaultValue={client.type} className={fieldClass}>
            <option value="INDIVIDUAL">Persona natural</option>
            <option value="COMPANY">Empresa</option>
          </select>
        </label>
        <label className={labelClass}>Nombre o razón social *
          <input name="name" required maxLength={160} defaultValue={client.name} className={fieldClass} />
        </label>
        <label className={labelClass}>Documento / NIT
          <input name="document" maxLength={40} defaultValue={client.document ?? ""} className={fieldClass} />
        </label>
        <label className={labelClass}>Correo electrónico
          <input name="email" type="email" defaultValue={client.email ?? ""} className={fieldClass} />
        </label>
        <label className={labelClass}>Teléfono
          <input name="phone" maxLength={40} defaultValue={client.phone ?? ""} className={fieldClass} />
        </label>
        <label className={labelClass}>Ciudad
          <input name="city" maxLength={100} defaultValue={client.city ?? ""} className={fieldClass} />
        </label>
        <label className={labelClass}>Dirección
          <input name="address" maxLength={200} defaultValue={client.address ?? ""} className={fieldClass} />
        </label>
        <label className={labelClass}>Observaciones
          <textarea name="notes" maxLength={1000} rows={3} defaultValue={client.notes ?? ""} className={fieldClass} />
        </label>
        <FormMessage message={message} success={success} />
        <button className={buttonClass} disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>
      </form>
    </details>
  );
}

export function ServiceCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setSuccess(false);
    try {
      await postJson("/api/services", Object.fromEntries(formData));
      setMessage("Servicio creado correctamente.");
      setSuccess(true);
      router.refresh();
      formRef.current?.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el servicio.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      <label className={labelClass}>Nombre del servicio *
        <input name="name" required maxLength={160} className={fieldClass} placeholder="Fotografía aérea" />
      </label>
      <label className={labelClass}>Categoría *
        <input name="category" required maxLength={100} className={fieldClass} placeholder="Fotografía y video" />
      </label>
      <label className={labelClass}>Descripción
        <textarea name="description" maxLength={2000} rows={3} className={fieldClass} placeholder="Describe el alcance del servicio" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Unidad de cobro *
          <select name="unit" className={fieldClass} defaultValue="project">
            <option value="project">Proyecto</option>
            <option value="hour">Hora</option>
            <option value="day">Día</option>
            <option value="hectare">Hectárea</option>
            <option value="square_meter">Metro cuadrado</option>
            <option value="photo">Fotografía</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label className={labelClass}>Precio base (COP) *
          <input name="basePrice" type="number" min="0" step="0.01" required className={fieldClass} placeholder="0.00" />
        </label>
      </div>
      <label className={labelClass}>Modalidad de cotización
        <select name="quoteMode" className={fieldClass} defaultValue="EVALUATION">
          <option value="EVALUATION">Evaluación personalizada</option>
          <option value="AUTOMATIC">Cotización automática</option>
        </select>
      </label>
      <FormMessage message={message} success={success} />
      <button className={buttonClass} disabled={pending}>{pending ? "Guardando..." : "Guardar servicio"}</button>
    </form>
  );
}

export function ServiceEditForm({
  service,
}: {
  service: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    unit: string;
    basePrice: string;
    quoteMode: "AUTOMATIC" | "EVALUATION";
    active: boolean;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setSuccess(false);
    try {
      await requestJson(`/api/services/${service.id}`, "PATCH", {
        name: formData.get("name"),
        category: formData.get("category"),
        description: formData.get("description"),
        unit: formData.get("unit"),
        basePrice: formData.get("basePrice"),
        quoteMode: formData.get("quoteMode"),
        active: formData.get("active") === "on",
      });
      setMessage("Servicio actualizado.");
      setSuccess(true);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el servicio.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-[#1769c2]">Editar información y precio</summary>
      <form action={submit} className="space-y-4 border-t border-slate-200 p-4">
        <label className={labelClass}>Nombre
          <input name="name" required maxLength={160} defaultValue={service.name} className={fieldClass} />
        </label>
        <label className={labelClass}>Categoría
          <input name="category" required maxLength={100} defaultValue={service.category} className={fieldClass} />
        </label>
        <label className={labelClass}>Descripción
          <textarea name="description" maxLength={2000} rows={3} defaultValue={service.description ?? ""} className={fieldClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Unidad
            <select name="unit" defaultValue={service.unit} className={fieldClass}>
              <option value="project">Proyecto</option>
              <option value="hour">Hora</option>
              <option value="day">Día</option>
              <option value="hectare">Hectárea</option>
              <option value="square_meter">Metro cuadrado</option>
              <option value="photo">Fotografía</option>
              <option value="video">Video</option>
              <option value="visit">Visita</option>
              <option value="property">Inmueble</option>
              <option value="structure">Estructura</option>
            </select>
          </label>
          <label className={labelClass}>Precio base (COP)
            <input name="basePrice" type="number" min="0" step="0.01" required defaultValue={service.basePrice} className={fieldClass} />
          </label>
        </div>
        <label className={labelClass}>Modalidad de cotización
          <select name="quoteMode" defaultValue={service.quoteMode} className={fieldClass}>
            <option value="EVALUATION">Evaluación personalizada</option>
            <option value="AUTOMATIC">Cotización automática</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input name="active" type="checkbox" defaultChecked={service.active} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Servicio activo y disponible para cotizar
        </label>
        <FormMessage message={message} success={success} />
        <button className={buttonClass} disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</button>
      </form>
    </details>
  );
}

type QuoteClient = { id: string; name: string };
type QuoteService = { id: string; name: string; unit: string; basePrice: string; active: boolean };
type QuoteLine = { serviceId: string; quantity: string; unitPrice: string; discountPercent: string };
type CostLine = { description: string; amount: string };
type QuoteDraft = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  location: string;
  executionTime: string;
  deliveryTime: string;
  paymentTerms: string;
  exclusions: string;
  commercialNotes: string;
  items: QuoteLine[];
  costs: CostLine[];
};

export function QuoteCreateForm({
  clients,
  services,
  taxRate,
  initialQuote,
  initialClientId,
}: {
  clients: QuoteClient[];
  services: QuoteService[];
  taxRate: string;
  initialQuote?: QuoteDraft;
  initialClientId?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<QuoteLine[]>([
    ...(initialQuote?.items ?? [
      { serviceId: services[0]?.id ?? "", quantity: "1", unitPrice: services[0]?.basePrice ?? "0", discountPercent: "0" },
    ]),
  ]);
  const [costs, setCosts] = useState<CostLine[]>(initialQuote?.costs ?? []);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function updateItem(index: number, patch: Partial<QuoteLine>) {
    setItems((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item));
  }

  function addItem() {
    const service = services.find((candidate) => candidate.active);
    if (!service) return;
    setItems((current) => [...current, {
      serviceId: service?.id ?? "",
      quantity: "1",
      unitPrice: service?.basePrice ?? "0",
      discountPercent: "0",
    }]);
  }

  function updateCost(index: number, patch: Partial<CostLine>) {
    setCosts((current) => current.map((cost, currentIndex) => currentIndex === index ? { ...cost, ...patch } : cost));
  }

  let preview: ReturnType<typeof calculateQuote> | null = null;
  let previewError = "";
  try {
    preview = calculateQuote({
      items: items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
      })),
      costs: costs.map((cost) => cost.amount),
      taxRate,
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    previewError = error.message;
  }

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const payload = {
        clientId: formData.get("clientId"),
        title: formData.get("title"),
        description: formData.get("description"),
        location: formData.get("location"),
        executionTime: formData.get("executionTime"),
        deliveryTime: formData.get("deliveryTime"),
        paymentTerms: formData.get("paymentTerms"),
        exclusions: formData.get("exclusions"),
        commercialNotes: formData.get("commercialNotes"),
        items,
        costs,
      };
      const response = await requestJson(initialQuote ? `/api/quotes/${initialQuote.id}` : "/api/quotes", initialQuote ? "PATCH" : "POST", payload);
      if (typeof response !== "object" || response === null || !("id" in response) || typeof response.id !== "string") {
        if (!initialQuote) throw new Error("La respuesta del servidor no contiene el identificador de la cotización.");
      }
      let quoteId = initialQuote?.id;
      if (!quoteId) {
        if (typeof response !== "object" || response === null || !("id" in response) || typeof response.id !== "string") {
          throw new Error("La respuesta del servidor no contiene el identificador de la cotización.");
        }
        quoteId = response.id;
      }
      router.push(`/quotes/${quoteId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la cotización.");
    } finally {
      setPending(false);
    }
  }

  if (clients.length === 0 || services.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        {clients.length === 0 && services.length === 0
          ? "Registra al menos un cliente y un servicio antes de crear cotizaciones."
          : clients.length === 0
            ? "Registra al menos un cliente antes de crear cotizaciones."
            : "Registra al menos un servicio antes de crear cotizaciones."}
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-7">
      <section>
        <h2 className="text-sm font-semibold text-slate-800">Cliente y proyecto</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Cliente *
            <select name="clientId" required defaultValue={initialQuote?.clientId ?? initialClientId ?? clients[0]?.id} className={fieldClass}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>Nombre del proyecto *
            <input name="title" required maxLength={180} defaultValue={initialQuote?.title} className={fieldClass} placeholder="Inspección de cubierta" />
          </label>
          <label className={`${labelClass} md:col-span-2`}>Descripción
            <textarea name="description" maxLength={4000} rows={3} defaultValue={initialQuote?.description} className={fieldClass} placeholder="Alcance y necesidad del cliente" />
          </label>
          <label className={labelClass}>Ubicación del servicio
            <input name="location" maxLength={240} defaultValue={initialQuote?.location} className={fieldClass} placeholder="Ciudad, dirección o coordenadas" />
          </label>
          <label className={labelClass}>Tiempo de ejecución
            <input name="executionTime" maxLength={160} defaultValue={initialQuote?.executionTime} className={fieldClass} placeholder="Ej. 1 jornada de campo" />
          </label>
          <label className={labelClass}>Tiempo de entrega
            <input name="deliveryTime" maxLength={160} defaultValue={initialQuote?.deliveryTime} className={fieldClass} placeholder="Ej. 5 días hábiles" />
          </label>
          <label className={labelClass}>Forma de pago
            <input name="paymentTerms" maxLength={1000} defaultValue={initialQuote?.paymentTerms} className={fieldClass} placeholder="Ej. 50% de anticipo, 50% contra entrega" />
          </label>
          <label className={labelClass}>Exclusiones
            <textarea name="exclusions" maxLength={2000} rows={2} defaultValue={initialQuote?.exclusions} className={fieldClass} placeholder="Conceptos no incluidos" />
          </label>
          <label className={`${labelClass} md:col-span-2`}>Observaciones comerciales
            <textarea name="commercialNotes" maxLength={2000} rows={2} defaultValue={initialQuote?.commercialNotes} className={fieldClass} placeholder="Condiciones adicionales para el cliente" />
          </label>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Servicios cotizados</h2>
            <p className="mt-1 text-xs text-slate-500">Los precios se guardan como una copia en esta cotización.</p>
          </div>
          <button type="button" onClick={addItem} disabled={!services.some((service) => service.active)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">+ Agregar servicio</button>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.5fr)_0.7fr_1fr_0.8fr_auto]">
              <label className={labelClass}>Servicio
                <select
                  value={item.serviceId}
                  onChange={(event) => {
                    const selected = services.find((service) => service.id === event.target.value);
                    updateItem(index, { serviceId: event.target.value, unitPrice: selected?.basePrice ?? "0" });
                  }}
                  className={fieldClass}
                >
                  {services.map((service) => <option key={service.id} value={service.id} disabled={!service.active}>{service.name}{service.active ? "" : " (inactivo)"}</option>)}
                </select>
              </label>
              <label className={labelClass}>Cantidad
                <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className={fieldClass} />
              </label>
              <label className={labelClass}>Precio unitario (COP)
                <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} className={fieldClass} />
              </label>
              <label className={labelClass}>Descuento (%)
                <input type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={(event) => updateItem(index, { discountPercent: event.target.value })} className={fieldClass} />
              </label>
              <div className="flex items-end">
                <button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Quitar servicio ${index + 1}`} className="mb-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white disabled:opacity-40">Quitar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Costos internos</h2>
            <p className="mt-1 text-xs text-slate-500">Información privada de la empresa; no se comparte con el cliente.</p>
          </div>
          <button type="button" onClick={() => setCosts((current) => [...current, { description: "", amount: "0" }])} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50">+ Agregar costo</button>
        </div>
        <div className="mt-3 space-y-3">
          {costs.map((cost, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
              <label className={labelClass}>Concepto
                <input value={cost.description} onChange={(event) => updateCost(index, { description: event.target.value })} maxLength={160} className={fieldClass} placeholder="Transporte, personal, edición..." />
              </label>
              <label className={labelClass}>Valor (COP)
                <input type="number" min="0" step="0.01" value={cost.amount} onChange={(event) => updateCost(index, { amount: event.target.value })} className={fieldClass} />
              </label>
              <button type="button" onClick={() => setCosts((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="mt-5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">Quitar</button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen comercial</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{preview ? formatCop(preview.subtotal) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Descuentos</dt><dd className="font-medium">{preview ? `-${formatCop(preview.discount)}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Impuestos ({taxRate}%)</dt><dd className="font-medium">{preview ? formatCop(preview.taxAmount) : "—"}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="font-semibold">Total</dt><dd className="font-bold text-[#1769c2]">{preview ? formatCop(preview.total) : "—"}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg bg-[#f7f9fc] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Solo para la empresa</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Costos internos</dt><dd className="font-medium">{preview ? formatCop(preview.internalCosts) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Utilidad estimada antes de impuestos</dt><dd className="font-medium">{preview ? formatCop(preview.estimatedProfit) : "—"}</dd></div>
          </dl>
        </div>
      </section>

      {previewError && <p role="status" className="text-xs text-amber-800">{previewError}</p>}
      <FormMessage message={message} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <p className="max-w-xl text-xs leading-5 text-slate-500">
          {initialQuote ? "Los cambios actualizarán el borrador sin alterar versiones ya compartidas." : "Se guardará como borrador; luego podrás compartir una versión segura con el cliente."}
        </p>
        <button className={buttonClass} disabled={pending}>{pending ? "Guardando..." : initialQuote ? "Guardar cambios" : "Guardar borrador"}</button>
      </div>
    </form>
  );
}

export function PublishProposalButton({ quoteId, clientEmail }: { quoteId: string; clientEmail: string | null }) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function publish() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/quotes/${quoteId}/publish`, { method: "POST" });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "No se pudo compartir la propuesta.";
        throw new Error(error);
      }
      if (typeof body !== "object" || body === null || !("url" in body) || typeof body.url !== "string") {
        throw new Error("La respuesta no contiene el enlace seguro.");
      }
      setUrl(body.url);
      setMessage("Versión publicada. Copia el enlace para enviarlo al cliente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo compartir la propuesta.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(`Enlace copiado. Envíalo a ${clientEmail ?? "tu cliente"}.`);
    } catch {
      setMessage("No se pudo copiar automáticamente. Selecciona y copia el enlace.");
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void publish()} disabled={pending} className="w-full rounded-lg bg-[#1769c2] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1259a8] disabled:opacity-50">
        {pending ? "Publicando..." : "Publicar y generar enlace seguro"}
      </button>
      {url && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="break-all text-[11px] leading-5 text-emerald-900">{url}</p>
          <button type="button" onClick={() => void copyLink()} className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
            Copiar enlace
          </button>
        </div>
      )}
      {message && <p role="status" className="text-[11px] leading-5 text-slate-600">{message}</p>}
    </div>
  );
}

export function OrganizationEditForm({
  initialValues,
}: {
  initialValues: {
    name: string;
    taxId: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setSuccess(false);
    try {
      await requestJson("/api/organization", "PATCH", Object.fromEntries(formData));
      setMessage("Información de la empresa actualizada.");
      setSuccess(true);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la empresa.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Razón social *
          <input name="name" required maxLength={160} defaultValue={initialValues.name} className={fieldClass} />
        </label>
        <label className={labelClass}>NIT / documento
          <input name="taxId" maxLength={40} defaultValue={initialValues.taxId} className={fieldClass} />
        </label>
        <label className={labelClass}>Correo electrónico
          <input name="email" type="email" defaultValue={initialValues.email} className={fieldClass} />
        </label>
        <label className={labelClass}>Teléfono
          <input name="phone" maxLength={40} defaultValue={initialValues.phone} className={fieldClass} />
        </label>
        <label className={labelClass}>Ciudad
          <input name="city" maxLength={100} defaultValue={initialValues.city} className={fieldClass} />
        </label>
        <label className={labelClass}>Dirección
          <input name="address" maxLength={200} defaultValue={initialValues.address} className={fieldClass} />
        </label>
      </div>
      <FormMessage message={message} success={success} />
      <button className={buttonClass} disabled={pending}>{pending ? "Guardando..." : "Guardar datos de empresa"}</button>
    </form>
  );
}

export function SettingsForm({
  initialTaxRate,
  initialValidityDays,
}: {
  initialTaxRate: string;
  initialValidityDays: number;
}) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setSuccess(false);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "No se pudo guardar la configuración.";
        throw new Error(error);
      }
      setMessage("Configuración guardada.");
      setSuccess(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>Impuesto aplicado (%)
          <input name="taxRate" type="number" min="0" max="100" step="0.01" required defaultValue={initialTaxRate} className={fieldClass} />
          <span className="mt-1.5 block text-[11px] font-normal text-slate-500">El valor configurado se aplica al subtotal de cada nueva cotización.</span>
        </label>
        <label className={labelClass}>Vigencia predeterminada (días)
          <input name="quoteValidityDays" type="number" min="1" max="365" step="1" required defaultValue={initialValidityDays} className={fieldClass} />
        </label>
      </div>
      <FormMessage message={message} success={success} />
      <button className={buttonClass} disabled={pending}>{pending ? "Guardando..." : "Guardar configuración"}</button>
    </form>
  );
}
