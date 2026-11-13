"use client";
import { cashAccounts, type CashAccount } from "@/data/cash";

export default function AccountSelect({
  value,
  onChange,
}: {
  value: CashAccount;
  onChange: (value: CashAccount) => void;
}) {
  return (
    <label>
      Cuenta del movimiento
      <select
        aria-label="Cuenta del movimiento"
        value={value}
        onChange={(event) => onChange(event.target.value as CashAccount)}
      >
        {cashAccounts.map((account) => (
          <option key={account}>{account}</option>
        ))}
      </select>
    </label>
  );
}
