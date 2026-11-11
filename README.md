# Kampo GT

Demo CRM + ERP de Productos del Kampo GT. Next.js 16, React, Tailwind, Recharts y AI SDK 7. Interfaz en español, importes MXN.

## Ejecutar

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Acceso de demostración: `jorge.garcia` / `cebollasmoradas`.

```sh
npm run lint
npm run check:data
npm run build
```

## Pantallas

- Inicio: periodo, indicadores, gráfica por producto y pedidos con estatus editable.
- CRM / Mensajes: 14 conversaciones, filtros, ficha de contacto, mensajes locales y agente con streaming. Con el agente activo, se escribe como cliente. La herramienta propone un pedido; **Crear pedido** lo añade a Inicio, con protección contra duplicados.
- CRM / Campañas: creación y edición por destinatarios, calendario y mensaje; selección de clientes o proveedores, búsqueda, selección múltiple, días generales y excepciones por contacto. Recordatorios por día de carga y cobranza con umbral editable. Simulación manual de envíos. No hay conexión a WhatsApp ni tareas programadas reales.
- ERP: proveedores y clientes separados por embarque; edición de ventas y siete gastos (compra, flete, descarga, tres básculas y maniobra), con actualización de Caja, Inicio y KPIs; caja con filtros/exportación CSV/registro de venta, estados de cuenta con seis meses de cargos y abonos y resumen mensual.
- KPIs: ingresos por producto, cliente o plaza; resultados; ranking y matriz de embarques por cliente.

## Datos y persistencia

La fecha de referencia del demo es **10 de noviembre de 2026**. Los 66 embarques y sus ventas son deterministas, de enero a noviembre. Las vistas de caja e ingresos comparten las ventas; la rentabilidad agrupa esas mismas ventas por embarque. Los saldos son un libro de movimientos de demostración independiente de la caja. No se calculan impuestos.

Nombres y días de carga proceden de `context/3. DATOS CLIENTES IA.xlsx`, hoja `Dia de carga`; el archivo JSON extraído contiene únicamente nombres, contactos y días. Los importes, ciudades asignadas, ventas y embarques son ejemplos, no una migración contable. El saldo inicial de Abel Aguayo sigue la referencia del plan. Los libros originales están excluidos de Git.

Pedidos, embarques, ventas, movimientos, campañas y conversaciones se guardan en `localStorage` de este navegador. No hay base de datos ni sincronización entre dispositivos. Borrar los datos del sitio restaura el demo. La sesión es un acceso de demostración, no un sistema de autenticación para operación real.

## Agente y Vercel

Configurar `ANTHROPIC_API_KEY` en Vercel y volver a desplegar. `ANTHROPIC_MODEL` es opcional (por defecto `claude-sonnet-5-5`); debe estar disponible en la cuenta de Anthropic. Sin clave se muestra **Agente sin conectar**, sin bloquear los demás módulos. El endpoint del agente requiere sesión. La clave nunca llega al navegador.

El repositorio usa `main` y el plan prevé despliegue automático en Vercel mediante push. Variables de ejemplo en `.env.example`. Las instrucciones del agente se pueden editar y restaurar desde Mensajes.
