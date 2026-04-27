# Proposly — Estilos y Referencia

## Tokens de estilo
| Token | Valor |
|-------|-------|
| Fondo páginas | `#f8f7f4` |
| Topbar | `#0f0f0f` |
| Negro principal | `#0f0f0f` |
| Borde | `#e8e3dc` |
| Input bg | `#f5f4f0` |
| Texto secundario | `#888` / `#aaa` |
| Botón primario | bg `#0f0f0f` / text `#fff` |
| Botón enviar | bg `#059669` / text `#fff` |
| Títulos | Georgia, serif |
| Body | sans-serif |
| Estilos | Solo inline styles, sin Tailwind |

## Formato blocks (jsonb)
```json
[
  { "id": "uuid", "type": "header",    "content": "Título" },
  { "id": "uuid", "type": "text",      "content": "Párrafo" },
  { "id": "uuid", "type": "image",     "url": "https://...", "caption": "Leyenda" },
  { "id": "uuid", "type": "separator" },
  { "id": "uuid", "type": "services",  "content": [{ "name": "Servicio", "price": 1000 }] }
]
```

## Estado de features
✅ Login / Registro / Cerrar sesión / Restablecer contraseña
✅ Dashboard con stats y gráficos
✅ Editor por bloques (header, text, image, separator, services)
✅ Editar / Eliminar propuesta
✅ Plantillas por sector
✅ Vista pública /p/[id]
✅ Tracking apertura + email Resend
✅ Firma básica del cliente
✅ Enviar propuesta por email
✅ Settings con logo y nombre de agencia
✅ Logo agencia en vista pública y páginas internas
✅ Responsive móvil
⏳ Bucket `images` en Supabase Storage
⏳ Landing page pública
⏳ Recordatorios automáticos
⏳ Stripe plan gratis/pro
⏳ Múltiples usuarios (Fase 3)