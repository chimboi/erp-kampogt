"use client";
import { useState } from "react";
import { date } from "@/data";
import {
  cashAccount,
  cashMoney,
  cashOpening,
  cashSummary,
  type CashRow,
} from "@/data/cash";
import { DataTable, type Column } from "./data-table";
import { Modal } from "./ui";
import "./cash-accounts.css";

type BalanceRow = {
  label: string;
  cash: number;
  bank: number;
  total: number;
  tone: string;
};
export default function CashAccounts({
  rows,
  period,
  onClose,
}: {
  rows: CashRow[];
  period: { start: string; end: string };
  onClose: () => void;
}) {
  const [detail, setDetail] = useState(true);
  const cash = cashSummary(
    rows.filter((row) => cashAccount(row) === "Efectivo"),
    period,
    cashOpening,
  );
  const bank = cashSummary(
    rows.filter((row) => cashAccount(row) === "Banorte"),
    period,
    { ...cashOpening, amount: 0 },
  );
  const balanceRows: BalanceRow[] = [
    {
      label: "Saldo inicial",
      cash: cash.initial,
      bank: bank.initial,
      total: cash.initial + bank.initial,
      tone: "opening",
    },
    {
      label: "Entradas",
      cash: cash.income,
      bank: bank.income,
      total: cash.income + bank.income,
      tone: "income",
    },
    ...(detail
      ? [
          {
            label: "Ventas recibidas",
            cash: cash.sales,
            bank: bank.sales,
            total: cash.sales + bank.sales,
            tone: "detail income",
          },
          {
            label: "Cobros recibidos",
            cash: cash.collections,
            bank: bank.collections,
            total: cash.collections + bank.collections,
            tone: "detail income",
          },
        ]
      : []),
    {
      label: "Salidas",
      cash: -cash.expenses,
      bank: -bank.expenses,
      total: -cash.expenses - bank.expenses,
      tone: "expense",
    },
    {
      label: "Saldo periodo",
      cash: cash.net,
      bank: bank.net,
      total: cash.net + bank.net,
      tone: "net",
    },
    {
      label: "Saldo final",
      cash: cash.final,
      bank: bank.final,
      total: cash.final + bank.final,
      tone: "closing",
    },
  ];
  const columns: Column<BalanceRow>[] = [
    {
      id: "label",
      label: "Concepto",
      value: (row) => row.label,
      render: (row) => (
        <span className={`account-value ${row.tone}`}>{row.label}</span>
      ),
    },
    ...(
      [
        ["cash", "Efectivo"],
        ["bank", "Banorte"],
        ["total", "Total"],
      ] as const
    ).map(([id, label]): Column<BalanceRow> => ({
      id,
      label,
      value: (row) => row[id],
      render: (row) => (
        <span
          className={`account-value ${row.tone} ${id === "total" ? "account-total" : ""}`}
        >
          {cashMoney(row[id])}
        </span>
      ),
    })),
  ];
  return (
    <Modal title="Cuentas · Corte de caja" onClose={onClose}>
      <div className="account-cut">
        <div className="account-cut-heading">
          <div>
            <span className="account-cut-badge">● CORTE POR CUENTA</span>
            <p>
              {date(period.start)}
              {period.end !== period.start ? ` — ${date(period.end)}` : ""}
            </p>
          </div>
          <button className="secondary" onClick={() => setDetail(!detail)}>
            {detail ? "Ocultar detalle" : "Mostrar detalle"}
          </button>
        </div>
        <DataTable
          rows={balanceRows}
          columns={columns}
          rowId={(row) => row.label}
        />
        <p className="account-cut-note">
          Los cobros y pagos se registran en la cuenta que seleccionas. Los
          movimientos anteriores sin cuenta y el saldo de apertura se consideran
          efectivo.
        </p>
      </div>
    </Modal>
  );
}
