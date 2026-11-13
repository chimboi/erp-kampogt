"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Scale, ShoppingBasket, Truck } from "lucide-react";

const bullets = [
  {
    icon: ShoppingBasket,
    title: "Compras al día",
    text: "Precios de cada proveedor, por zona y temporada.",
  },
  {
    icon: Scale,
    title: "Ventas y cobranza",
    text: "Lo que se vendió, en efectivo o a crédito, y quién debe.",
  },
  {
    icon: Truck,
    title: "Rentabilidad por pedido",
    text: "Cada viaje con su compra, flete, gastos y resultado.",
  },
];

export default function EntrarPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/inicio");
        router.refresh();
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-kampo-800 px-16 py-14 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-peach/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-leaf/20 blur-3xl" />
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/5 py-1.5 pl-1.5 pr-5">
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-cover object-top"
            />
          </span>
          <span className="text-sm font-semibold tracking-[0.2em]">
            KAMPO GT
          </span>
        </div>

        <div className="relative my-auto max-w-lg">
          <h1 className="text-6xl font-extrabold leading-[1.02] tracking-tight">
            La cebolla, cuadrada día con día.
          </h1>
          <ul className="mt-14 space-y-7">
            {bullets.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
                  <Icon className="h-5 w-5 text-peach" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dot-grid flex items-center justify-center bg-white px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <Image
            src="/logo.png"
            alt="Productos del Kampo GT"
            width={160}
            height={110}
            className="mb-8 lg:hidden"
          />
          <h2 className="text-4xl font-extrabold tracking-tight text-kampo-800">
            Bienvenido de nuevo
          </h2>
          <p className="mt-3 text-[#5b6b63]">
            Entra al control de Productos del Kampo GT.
          </p>

          <label className="label-caps mt-10 block" htmlFor="username">
            Usuario
          </label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[#dfe5e1] bg-[#f3f7f4] px-4 py-3.5 text-[15px] outline-none transition focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/15"
            placeholder="jorge.garcia"
            required
          />

          <label className="label-caps mt-7 block" htmlFor="password">
            Contraseña
          </label>
          <div className="relative mt-2">
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#dfe5e1] bg-[#f3f7f4] px-4 py-3.5 pr-12 text-[15px] outline-none transition focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/15"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#5b6b63] hover:text-kampo-800"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-brand-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-leaf py-3.5 font-semibold text-white shadow-sm transition hover:bg-leaf-600 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
