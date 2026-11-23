# REIMPACTA · App de Salud Nómada

App del paciente y panel de Jone (Método REIMPACTA®). PWA instalable en iPhone y Android.

- `src/domain/` — reglas del método (fases, dolor, regla de fuerza, llamadas cada 15 días…). Con tests.
- `src/data/` — capa de datos. Hoy: datos de ejemplo inventados. Después: Supabase (una línea en `src/data/index.ts`).
- `src/screens/` — pantallas de la paciente y panel de Jone.
- `src/styles/prototype.css` — estilos del prototipo, copiados tal cual.

Comandos: `npm run dev` · `npm test` · `npm run build`. Netlify publica `dist/` (ver `netlify.toml`).

> Los datos de ejemplo son inventados. Nunca se meten datos de pacientes reales en el código.
