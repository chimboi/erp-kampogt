"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  Megaphone,
  Truck,
  Users,
  Handshake,
  ChartNoAxesCombined,
  ChartPie,
  Wallet,
  LogOut,
  Menu,
  ChevronLeft,
} from "lucide-react";
const groups = [
  {
    label: "GENERAL",
    items: [["/inicio", "Control de caja", LayoutDashboard]],
  },
  {
    label: "CRM",
    items: [
      ["/crm/mensajes", "Mensajes", MessageCircle],
      ["/crm/campanas", "Campañas", Megaphone],
    ],
  },
  {
    label: "ERP",
    items: [
      ["/erp/pedidos", "Rentabilidad pedidos", Truck],
      ["/erp/saldo-clientes", "Saldo clientes", Users],
      ["/erp/saldo-proveedores", "Saldo proveedores", Handshake],
    ],
  },
  {
    label: "REPORTES",
    items: [
      ["/reportes/resultados", "Edo Resultados", ChartPie],
      ["/reportes/flujo-efectivo", "Flujo de efectivo", Wallet],
      ["/reportes/ingresos", "Análisis de ingresos", ChartNoAxesCombined],
    ],
  },
] as const;
export default function Sidebar({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter(),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false);
  return (
    <div className={"shell " + (collapsed ? "collapsed" : "")}>
      <button
        className="mobile-menu"
        aria-label="Abrir menú"
        onClick={() => setMobile(!mobile)}
      >
        <Menu />
      </button>
      {mobile && (
        <button
          aria-label="Cerrar menú"
          className="nav-overlay"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
        <div className="brand">
          <Image src="/logo.png" alt="Kampo" width={42} height={42} />
          <div>
            <strong>KAMPO GT</strong>
            <small>PRODUCTOS DEL CAMPO</small>
          </div>
          <button
            aria-label="Contraer menú"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <nav>
          {groups.map((g) => (
            <div key={g.label}>
              <p className="nav-label">{g.label}</p>
              {g.items.map(([href, label, Icon]) => (
                <Link
                  title={label}
                  className={path === href ? "selected" : ""}
                  href={href}
                  key={href}
                  onClick={() => setMobile(false)}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">JG</span>
            <div>
              <strong>Jorge García</strong>
              <small>Administrador</small>
            </div>
          </div>
          <button
            onClick={async () => {
              const r = await fetch("/api/logout", { method: "POST" });
              if (r.ok) {
                router.replace("/entrar");
                router.refresh();
              }
            }}
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <main className="page-content">{children}</main>
        <footer>
          Productos del Kampo GT{" "}
          <span>
            Datos de demostración · Cambios guardados en este navegador
          </span>
        </footer>
      </div>
    </div>
  );
}
