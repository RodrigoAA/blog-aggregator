# Features Descartadas

Documentacion de features que se desarrollaron pero se descartaron, junto con el motivo y como recuperarlas.

---

## Post de la Semana

**Fecha:** Enero 2026
**Commits:** `674a7bb`, `b39ab2c`
**Revert:** `c8106dd`

### Descripcion

Banner hero en la parte superior del Inbox que mostraba automaticamente el post mas relevante de los ultimos 7 dias, basado en el `recommendation_score='high'` generado por el sistema de resumenes con IA.

**Caracteristicas:**
- Ilustracion SVG decorativa (estilo Editorial Noir)
- Titulo, blog, fecha y resumen TL;DR del articulo
- Boton "Leer articulo" que abria el reader
- Diseño responsive para movil
- Se integraba en el grid del Inbox (grid-column: 1 / -1)

### Motivo del descarte

El sistema de seleccion tenia un problema fundamental de diseño: **solo podia recomendar articulos que el usuario ya habia abierto**, porque el `recommendation_score` se genera cuando se solicita el resumen con IA (al abrir el articulo en el reader).

Esto hacia que la feature fuera poco util - recomendaba contenido ya leido en lugar de descubrir contenido nuevo.

**Alternativas consideradas:**
1. Generar resumenes proactivamente (coste extra en API OpenAI)
2. Fallback al post mas reciente si no hay score
3. Analisis local de keywords vs intereses

Ninguna alternativa justificaba la complejidad añadida.

### Como recuperar

```bash
# Ver el codigo completo de la feature
git show 674a7bb

# Recuperar la feature (crear branch para probar)
git checkout -b feature/weekly-post 674a7bb

# O cherry-pick a main
git cherry-pick 674a7bb
```

### Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `www/index.html` | Tab "Semanal" (descartado por banner) |
| `www/js/app.js` | `getWeeklyPost()`, `getWeeklyPostBannerHtml()`, `displayWeeklyPost()`, `attachWeeklyBannerHandler()`, `openWeeklyArticle()`, `getWeeklyIllustrationSVG()`, `getSummaryForPost()` |
| `www/css/styles.css` | `.weekly-banner`, `.weekly-banner-*` (~200 lineas) |

### Codigo relevante (resumen)

```javascript
// Logica de seleccion del post de la semana
async function getWeeklyPost() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filtrar posts de ultimos 7 dias
    const recentPosts = allPosts.filter(post => new Date(post.date) >= sevenDaysAgo);

    // Buscar posts con recommendation_score='high'
    for (const post of recentPosts) {
        const summary = await getSummaryForPost(post.link);
        if (summary?.recommendation?.score === 'high') {
            return { post, summary };
        }
    }
    return null;
}

// HTML del banner
`<div class="weekly-banner">
    <div class="weekly-banner-illustration">${svg}</div>
    <div class="weekly-banner-content">
        <div class="weekly-banner-label">Post de la Semana</div>
        <h2 class="weekly-banner-title">${title}</h2>
        <p class="weekly-banner-summary">${tldr}</p>
        <button class="weekly-banner-btn">Leer articulo</button>
    </div>
</div>`
```

### Posible futuro

Si se quisiera retomar esta feature, habria que resolver el problema de seleccion:

1. **Generar resumenes en background** - Usar un worker o cron que genere resumenes de posts nuevos automaticamente
2. **Criterio hibrido** - Si hay posts con score high, usarlos. Si no, usar heuristicas locales (palabras clave en titulo vs intereses)
3. **Integracion con RSS** - Algunos feeds incluyen tags/categorias que podrian usarse para matching

---

*Ultima actualizacion: Enero 2026*
