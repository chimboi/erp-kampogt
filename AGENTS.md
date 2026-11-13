<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Preferencias de tablas del MVP

- Todas las tablas nuevas o modificadas deben permitir filtrar por columna y ordenar ascendente/descendente desde sus encabezados. Ordenar importes y cantidades como números y fechas cronológicamente, antes de paginar.
- Favorecer tablas compactas, con edición de celdas al hacer clic, como una hoja de Excel. En pedidos: ID corto primero, fecha y hora juntas en una línea; producto Blanca, Morada o Amarilla; precio antes de costo y venta.
- Estados de pago de ventas: Pendiente, Anticipo y Cobrado (sustituye Liquidado). Los anticipos deben tener un monto explícito y actualizar el saldo restante. No confundirlos con el estado logístico del pedido.
- Base reutilizable: `src/components/data-table.tsx`; edición de pagos: `src/components/payment-cell.tsx`. Extender estas convenciones al trabajar en las otras tablas.

## Corte de caja de Control de caja

- Control de caja prioriza Números (corte diario); gráficas y detalle de pedidos viven en Reporte.
- Saldo periodo = efectivo recibido por ventas + cobros de días anteriores − gastos pagados. Saldo final = saldo inicial + saldo periodo. Arrastrar saldo entre días y rangos; no sumar crédito sin cobrar ni tratar costos devengados de embarques como efectivo pagado.
- Proveedores en Reporte: solo métricas `$Ingresos` y `#ventas`; usar el periodo general, sin pestañas de periodo propias.
- Referencia privada del proceso: context/4.CONTROL DE CAJA IA.xlsx. Mantener datos sensibles fuera del repo y usar importes demo.

- Cada venta muestra KG, precio/kg, venta total, estado de pago, producto y compra de origen. Las compras se identifican visualmente como `Proveedor-1`, `Proveedor-2`, etc.; conservar los IDs internos para las relaciones. El alta de venta usa los mismos campos y fecha explícita, igual que los gastos. Derivar el producto de la compra seleccionada y el total de KG × precio; sumar a caja solo lo recibido.

- Control de caja/Números tiene tres tablas por pestaña: Ventas, Costos y Gastos. No reintroducir Vista tabla/Dos vistas ni el texto «Ventas cobradas + cobros − gastos». Un único botón + abre altas según la pestaña; cobros se conservan dentro del flujo de Ventas.
- Ventas debe mostrar columnas independientes: cliente, producto, compra de origen, KG, precio/kg, venta total, status, recibido y por cobrar. No sustituir estos campos por un concepto compuesto.
- Costos: compras a proveedores, tarimas, fletes y otros costos; Gastos: nómina, renta, servicios, comidas y otros. Compra nueva crea un embarque/pedido de compra seleccionable en las ventas; solo lo pagado afecta caja.

- Cobranza: permitir cobrar desde la fila de venta o seleccionar pendientes de este mes/meses anteriores/todos; ligar el cobro a venta/pedido y registrar fecha real de recepción. Admitir parcial o total, impedir exceder el saldo y evitar duplicar caja al actualizar status.
- Importes demo: ventas diarias oct–nov entre $180k y $320k; conservar los cambios del usuario al migrar semillas. No limitar importes reales ni totales de periodos al rango diario.
- CRM: estados de conversación editables y persistentes; mostrar pendientes de ventas/pedidos del cliente y acceso a cobranza vinculada.
