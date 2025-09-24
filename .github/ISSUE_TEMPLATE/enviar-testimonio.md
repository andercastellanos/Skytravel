---
name: Enviar Testimonio
about: 'Comparte tu experiencia de peregrinación '
title: Testimonio
labels: ''
assignees: andercastellanos

---

name: Enviar Testimonio
description: Comparte tu experiencia de peregrinación 
title: "[Testimonio] "
labels: ["testimony"]
body:
  - type: input
    id: nombre
    attributes:
      label: Nombre (como será mostrado)
      placeholder: p.ej., María G.
    validations:
      required: true

  - type: input
    id: viaje
    attributes:
      label: Viaje / Destino (texto libre)
      placeholder: p.ej., Medjugorje (Mayo 2025)
    validations:
      required: true

  - type: textarea
    id: testimonio
    attributes:
      label: Tu Testimonio (3–6 oraciones)
      description: Comparte momentos destacados, experiencias de fe, organización (guía/hotel/transporte), etc.
    validations:
      required: true

  - type: textarea
    id: foto
    attributes:
      label: Foto (opcional)
      description: Arrastra y suelta una foto aquí o pégala para subirla.
    validations:
      required: false

  - type: input
    id: consentimiento
    attributes:
      label: Consentimiento (obligatorio)
      description: Escribe “Autorizo” para permitir que Sky Travel J & M publique este testimonio.
      placeholder: Autorizo
    validations:
      required: true
