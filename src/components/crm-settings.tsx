"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Clock3 } from "lucide-react";
import { useTomorrowDate } from "@/lib/crm-date";
import { usePersistentState } from "@/lib/store";
import { DEFAULT_PROMPT } from "@/lib/agent/system-prompt";
import {
  DEFAULT_AUTOMATION,
  reminderClients,
  reminderText,
  type Automation,
  type ClientSchedule,
  WEEKDAYS,
} from "@/data/crm-automation";
import { DataTable, type Column } from "./data-table";
import { clients, type Contact } from "@/data";
import "./messages.css";

import { FRIENDLY_PROMPT } from "@/data/crm-agent-prompt";

export default function CrmSettings() {
  const [tab, setTab] = useState("agent");
  const [storedSystem, setSystem] = usePersistentState(
    "kampo-system-v1",
    DEFAULT_PROMPT,
  );
  const system =
    storedSystem === DEFAULT_PROMPT ? FRIENDLY_PROMPT : storedSystem;
  const [automation, setAutomation] = usePersistentState<Automation>(
    "kampo-automation-v1",
    DEFAULT_AUTOMATION,
  );
  const patch = (value: Partial<Automation>) =>
    setAutomation((a) => ({ ...a, ...value }));
  const [schedule, setSchedule] = usePersistentState<ClientSchedule>(
    "kampo-client-schedule-v1",
    {},
  );
  const updateClient = (c: Contact, patch: Partial<ClientSchedule[string]>) =>
    setSchedule((previous) => ({
      ...previous,
      [c.id]: {
        days: previous[c.id]?.days ?? c.days,
        phone: previous[c.id]?.phone ?? c.phone,
        ...patch,
      },
    }));
  const columns: Column<Contact>[] = [
    {
      id: "client",
      label: "Cliente",
      value: (c) => c.name,
      render: (c) => <strong>{c.name}</strong>,
    },
    ...WEEKDAYS.map((day, i): Column<Contact> => ({
      id: `day-${i}`,
      label: day,
      value: (c) => ((schedule[c.id]?.days ?? c.days).includes(i) ? 1 : 0),
      filterValue: (c) =>
        (schedule[c.id]?.days ?? c.days).includes(i)
          ? "X Sí Programado"
          : "No Sin programar",
      render: (c) => {
        const selected = (schedule[c.id]?.days ?? c.days).includes(i);
        return (
          <button
            className={"crm-day-cell " + (selected ? "marked" : "")}
            aria-label={`${day} · ${c.name}`}
            aria-pressed={selected}
            onClick={() => {
              const days = schedule[c.id]?.days ?? c.days;
              updateClient(c, {
                days: selected
                  ? days.filter((d) => d !== i)
                  : [...days, i].sort(),
              });
            }}
          >
            {selected ? "X" : <span aria-hidden="true">·</span>}
          </button>
        );
      },
    })),
    {
      id: "phone",
      label: "Contacto",
      value: (c) => schedule[c.id]?.phone ?? c.phone,
      render: (c) => (
        <input
          className="crm-contact-input"
          aria-label={`Contacto · ${c.name}`}
          placeholder="Agregar contacto"
          value={schedule[c.id]?.phone ?? c.phone}
          onChange={(e) => updateClient(c, { phone: e.target.value })}
        />
      ),
    },
  ];
  const tomorrow = useTomorrowDate();
  const recipients = reminderClients(tomorrow, "loading", schedule);
  const example = recipients[0] ?? clients[0];
  return (
    <div
      className={
        "crm-agent-settings " +
        (tab === "automation" ? "crm-schedule-settings" : "")
      }
    >
      <Link href="/crm/mensajes" className="text-link">
        <ArrowLeft size={16} /> Volver a Mensajes
      </Link>
      <div className="page-title">
        <div>
          <h1>Configuración</h1>
          <p className="muted">
            Tu asistente y el seguimiento de tus clientes, a tu manera.
          </p>
        </div>
      </div>
      <div
        className="segmented crm-settings-tabs"
        role="tablist"
        aria-label="Configuración CRM"
      >
        <button
          id="agent-tab"
          role="tab"
          aria-selected={tab === "agent"}
          aria-controls="agent-panel"
          className={tab === "agent" ? "active" : ""}
          onClick={() => setTab("agent")}
        >
          <Bot size={17} /> Agente
        </button>
        <button
          id="automation-tab"
          role="tab"
          aria-selected={tab === "automation"}
          aria-controls="automation-panel"
          className={tab === "automation" ? "active" : ""}
          onClick={() => setTab("automation")}
        >
          <Clock3 size={17} /> Automatizaciones
        </button>
      </div>
      {tab === "agent" ? (
        <section
          id="agent-panel"
          role="tabpanel"
          aria-labelledby="agent-tab"
          className="card"
        >
          <h2>¿Cómo quieres que atienda tu agente?</h2>
          <p className="muted">
            Escribe como si le explicaras el trabajo a alguien nuevo. Puedes
            cambiar el tono, las preguntas que debe hacer y cuándo debe pedir tu
            autorización.
          </p>
          <label className="field">
            Instrucciones del agente · System message
            <textarea
              rows={20}
              maxLength={12000}
              value={system}
              onChange={(e) => setSystem(e.target.value)}
            />
          </label>
          <div className="crm-settings-actions">
            <span className="muted">
              Guardado automáticamente en este navegador · {system.length}/12000
            </span>
            <button
              className="secondary"
              onClick={() => setSystem(FRIENDLY_PROMPT)}
            >
              Usar instrucciones sugeridas
            </button>
          </div>
          <p className="crm-settings-hint">
            Ejemplo: “Antes de cotizar, pregunta cuántos kilos necesita. Si pide
            descuento, deja la propuesta para Jorge”. Las respuestas de los
            recordatorios son una simulación preparada; estas instrucciones se
            usan al probar el agente conectado.
          </p>
        </section>
      ) : (
        <section
          id="automation-panel"
          role="tabpanel"
          aria-labelledby="automation-tab"
          className="card"
        >
          <div className="crm-settings-actions">
            <div>
              <h2>Recordatorios de venta</h2>
              <p className="muted">
                Anticípate a las cargas de mañana y pregunta qué necesita cada
                cliente.
              </p>
            </div>
            <button
              className="crm-switch"
              role="switch"
              aria-label="Activar automatización"
              aria-checked={automation.enabled}
              onClick={() => patch({ enabled: !automation.enabled })}
            >
              <span className="switch-track" />
              {automation.enabled ? "Activada" : "Pausada"}
            </button>
          </div>
          <div className="crm-automation-fields">
            <label className="field">
              Hora de envío
              <input
                aria-label="Hora de envío"
                type="time"
                required
                value={automation.time}
                onChange={(e) => {
                  if (e.target.value) patch({ time: e.target.value });
                }}
              />
              <small>Hora de Ciudad de México</small>
            </label>
          </div>
          <div className="crm-schedule-heading">
            <h3>Agenda semanal de clientes</h3>
            <p>
              Marca con una X los días de carga, como en la hoja de Jorge. El
              recordatorio se prepara el día anterior. Haz clic en una celda
              para cambiarla; el contacto se edita directamente.
            </p>
          </div>
          <div className="crm-schedule-matrix">
            <DataTable
              rows={clients}
              columns={columns}
              rowId={(c) => c.id}
              pageSize={60}
              initialSort={{ id: "client", direction: "asc" }}
            />
          </div>
          <p className="muted">
            {recipients.length} clientes con carga mañana · Cambios guardados
            automáticamente.
          </p>
          <label className="field">
            Mensaje de recordatorio
            <textarea
              aria-label="Mensaje de recordatorio"
              rows={4}
              maxLength={1500}
              value={automation.message}
              onChange={(e) => patch({ message: e.target.value })}
            />
            <small>
              Usa {"{nombre}"} para el cliente y {"{fecha}"} para la fecha de
              mañana.
            </small>
          </label>
          <p className="crm-settings-hint">
            La demo tiene dos pasos: primero envía una muestra de 20
            recordatorios; después pulsa “Probar IA” para iniciar las
            respuestas. La selección prioriza los clientes marcados para mañana.
          </p>
          <div className="crm-message-preview">
            <strong>Así lo verá {example.name}</strong>
            <p>
              {reminderText(automation.message, example, tomorrow) ||
                "Escribe un mensaje para ver la vista previa."}
            </p>
            <small>
              {recipients.length} clientes en la selección para mañana.
            </small>
          </div>
          <p role="status" className="crm-settings-hint">
            {!automation.enabled
              ? "Automatización pausada."
              : `Horario configurado: ${automation.time} · Ciudad de México.`}{" "}
            Configuración guardada en este navegador. En esta demo, inicia los
            envíos con “Enviar recordatorios venta” en Mensajes; no hay envíos
            automáticos en segundo plano ni mensajes reales a WhatsApp.
          </p>
        </section>
      )}
    </div>
  );
}
