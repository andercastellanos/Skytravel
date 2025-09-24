---
name: Submit a Testimonial
about: Collect a pilgrimage testimonial for the website ( reviewed before publishing)
title: ''
labels: ''
assignees: ''

---

name: Submit a Testimonial
description: Share your pilgrimage experience for our website (reviewed before publishing)
title: "[Testimonial] "
labels: ["testimony"]
body:
  - type: input
    id: name
    attributes:
      label: Your Name (as displayed)
      placeholder: e.g., Maria G.
    validations:
      required: true

  - type: input
    id: trip
    attributes:
      label: Trip / Destination (free text)
      placeholder: e.g., Medjugorje (May 2025)
    validations:
      required: true

  - type: textarea
    id: testimonial
    attributes:
      label: Your Testimonial (3–6 sentences)
      description: Share highlights, moments of grace, logistics (guide/hotel/transport), etc.
    validations:
      required: true

  - type: textarea
    id: photo
    attributes:
      label: Photo (optional)
      description: Drag & drop or paste an image here to upload.
    validations:
      required: false

  - type: input
    id: consent
    attributes:
      label: Consent (required)
      description: Type “I consent” to permit Sky Travel J & M to publish this testimonial.
      placeholder: I consent
    validations:
      required: true
