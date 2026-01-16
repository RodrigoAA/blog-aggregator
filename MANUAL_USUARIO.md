# Manual de Usuario - Particulas Elementales

Guia completa para usar tu lector RSS con resumenes inteligentes.

## Indice

1. [Primeros Pasos](#primeros-pasos)
2. [Interfaz Principal](#interfaz-principal)
3. [Gestionar Blogs](#gestionar-blogs)
4. [Leer Articulos](#leer-articulos)
5. [Organizar Lecturas](#organizar-lecturas)
6. [Resumenes con IA](#resumenes-con-ia)
7. [Subrayados](#subrayados)
8. [Twitter Bookmarks](#twitter-bookmarks)
9. [Tinder Mode (Movil)](#tinder-mode-movil)
10. [Guardar Articulos Manualmente](#guardar-articulos-manualmente)
11. [Extension de Chrome](#extension-de-chrome)

---

## Primeros Pasos

### Iniciar Sesion

1. Haz clic en el icono de usuario en la esquina superior derecha
2. Selecciona "Iniciar sesion con Google"
3. Autoriza la aplicacion con tu cuenta de Google

Al iniciar sesion, tus datos se sincronizan automaticamente entre dispositivos.

### Sin Cuenta

Puedes usar la aplicacion sin iniciar sesion. Tus datos se guardaran localmente en el navegador, pero no se sincronizaran con otros dispositivos.

---

## Interfaz Principal

### Cabecera

De izquierda a derecha:

| Icono | Funcion |
|-------|---------|
| Logo | Volver al inicio |
| Lapiz | Abrir pagina de Subrayados |
| Flecha circular | Actualizar feeds |
| Subir archivo | Importar Twitter bookmarks |
| Avatar/Usuario | Menu de usuario |

### Pestanas de Filtro

- **Inbox** - Articulos nuevos de tus blogs
- **Pending** - Articulos guardados para leer despues
- **Favorites** - Articulos favoritos
- **Cleared** - Articulos leidos o descartados
- **Twitter** - Bookmarks importados de Twitter/X

### Lista de Posts

Cada articulo muestra:
- Nombre del blog
- Titulo del articulo
- Fecha de publicacion
- Botones de accion (favorito, pendiente, limpiar)

---

## Gestionar Blogs

### Anadir un Blog

1. Haz clic en **"+ Anadir blog"** en la barra lateral
2. Introduce la URL del blog (ej: `https://ejemplo.com`)
3. La app detectara automaticamente el feed RSS
4. Dale un nombre al blog y confirma

### Eliminar un Blog

1. En la barra lateral, localiza el blog
2. Haz clic en el icono de papelera junto al nombre
3. Confirma la eliminacion

**Nota:** Eliminar un blog no borra los articulos ya guardados como favoritos o pendientes.

### Blogs Soportados

La aplicacion detecta feeds RSS/Atom de:
- Substack
- Medium
- WordPress
- Ghost
- Cualquier sitio con feed estandar

---

## Leer Articulos

### Abrir un Articulo

Haz clic en cualquier articulo de la lista para abrirlo en el lector.

### Controles del Lector

| Boton | Accion |
|-------|--------|
| X (esquina) | Cerrar lector |
| Corazon | Marcar como favorito |
| Reloj | Guardar para despues |
| Papelera | Marcar como leido/limpiar |
| Enlace externo | Abrir en sitio original |

### Navegacion

- **Scroll** - Navega por el articulo
- **ESC** - Cierra el lector
- **Clic fuera** - Cierra el lector

---

## Organizar Lecturas

### Flujo de Trabajo

```
Inbox (nuevo) --> Pending (leer despues) --> Favorite (guardar)
                                         --> Cleared (leido)
```

### Acciones Rapidas

Desde la lista de posts (sin abrir el articulo):

- **Corazon** - Mover a Favoritos
- **Reloj** - Mover a Pendientes
- **Check** - Mover a Cleared (leido)

### Mover Entre Categorias

Un articulo puede moverse entre categorias en cualquier momento. Simplemente usa los botones de accion.

---

## Resumenes con IA

### Obtener un Resumen

1. Abre un articulo en el lector
2. Haz clic en **"Generar resumen"**
3. Espera unos segundos mientras la IA procesa el contenido

### Contenido del Resumen

Cada resumen incluye:

- **TL;DR** - Resumen en 2-3 oraciones
- **Puntos clave** - Lista de ideas principales
- **Recomendacion** - Nivel de relevancia basado en tus intereses

### Indicador de Relevancia

| Icono | Significado |
|-------|-------------|
| 3 llamas | Muy relevante para ti |
| 2 llamas | Algo relevante |
| 1 llama | Poco relevante |

### Configurar Intereses

1. Abre el menu de usuario (icono avatar)
2. Selecciona **"Configuracion"**
3. En el campo de intereses, describe tus temas preferidos
4. Guarda los cambios

**Ejemplo de intereses:**
> "Tecnologia, startups, inteligencia artificial, productividad personal, diseno de producto"

Los resumenes usaran tus intereses para calcular la relevancia de cada articulo.

---

## Subrayados

### Crear un Subrayado

1. Abre un articulo en el lector
2. Selecciona texto con el cursor
3. El texto quedara subrayado automaticamente

### Ver Subrayados

1. Haz clic en el icono de lapiz en la cabecera
2. Se abrira la pagina de Subrayados
3. Cada subrayado muestra:
   - El texto subrayado
   - El articulo de origen
   - Fecha de creacion

### Acciones en Subrayados

- **Clic en un subrayado** - Abre el articulo original
- **Icono papelera** - Elimina el subrayado
- **Borrar todo** - Elimina todos los subrayados

### Eliminar un Subrayado desde el Lector

En el lector, haz clic sobre cualquier texto subrayado para eliminarlo.

---

## Twitter Bookmarks

### Exportar Bookmarks de Twitter

1. Instala la extension [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter)
2. Ve a tus [bookmarks de Twitter](https://twitter.com/i/bookmarks)
3. Usa la extension para exportar como JSON
4. Guarda el archivo

### Importar a Particulas

1. Haz clic en el icono de subir archivo en la cabecera
2. Selecciona el archivo JSON exportado
3. Espera a que se procesen los tweets

### Organizar con Carpetas

1. Ve a la pestana **Twitter**
2. Haz clic en **"Gestionar carpetas"**
3. Crea carpetas (ej: "Hilos interesantes", "Recursos", "Memes")
4. Asigna tweets a carpetas usando el selector en cada tweet

### Caracteristicas de Twitter

- Imagen de perfil del autor
- Indicador de hilo (si es un thread)
- Estadisticas de engagement
- Clic abre directamente en Twitter

---

## Tinder Mode (Movil)

Interfaz de deslizamiento para procesar rapidamente tu Inbox desde el movil.

### Activar Tinder Mode

1. Abre la app en un dispositivo movil (< 768px)
2. Ve a la pestana **Inbox**
3. Aparecera un boton flotante en la esquina inferior derecha
4. Toca el boton para activar

### Gestos

| Gesto | Accion |
|-------|--------|
| Deslizar izquierda | Descartar (Cleared) |
| Deslizar derecha | Guardar (Pending) |
| Tocar la tarjeta | Abrir en lector |

### Contenido de la Tarjeta

Cada tarjeta muestra:
- Nombre del blog
- Titulo del articulo
- Tiempo de lectura estimado
- Resumen TL;DR (se carga automaticamente)
- Indicador de llamas (relevancia)
- Fecha

### Salir de Tinder Mode

- Toca la X en la esquina superior
- O procesa todos los articulos del Inbox

---

## Guardar Articulos Manualmente

### Desde el Navegador (Desktop)

1. Copia la URL del articulo
2. Haz clic en **"+ Anadir articulo"** en la app
3. Pega la URL
4. Confirma

### Desde el Movil (Acceso Rapido)

Configura un acceso directo para guardar articulos en 3 toques:

#### Configuracion (una vez)

1. Abre `https://particulas-elementales.pages.dev/add.html` en tu movil
2. **iOS Safari:** Compartir > "Agregar a pantalla de inicio"
3. **Android Chrome:** Menu > "Agregar a pantalla de inicio"

#### Uso

1. Encuentra un articulo interesante
2. Copia la URL (Compartir > Copiar enlace)
3. Toca el acceso directo en tu pantalla de inicio
4. La pagina detecta automaticamente la URL
5. Toca **"Guardar en Inbox"**

---

## Extension de Chrome

### Instalar

1. Ve a `chrome://extensions/`
2. Activa "Modo desarrollador"
3. Haz clic en "Cargar descomprimida"
4. Selecciona la carpeta `extension/`

### Usar

Al visitar cualquier pagina web:

1. Haz clic en el icono de la extension
2. **Guardar articulo** - Anade la pagina actual a tu Inbox
3. **Suscribirse al RSS** - Si el sitio tiene feed, te suscribe automaticamente

---

## Preguntas Frecuentes

### Los resumenes tardan mucho

El backend puede estar dormido (servicio gratuito). La primera solicitud tarda 30-60 segundos mientras se activa.

### No puedo iniciar sesion en movil

Intenta borrar la cache del navegador y volver a intentarlo.

### Mis datos no se sincronizan

Verifica que has iniciado sesion con la misma cuenta de Google en todos los dispositivos.

### Un blog no se detecta

Algunos sitios no tienen feed RSS publico. Intenta buscar manualmente la URL del feed (suele ser `/feed`, `/rss`, o `/atom.xml`).

### Perdi mis datos locales

Si no tenias sesion iniciada, los datos locales se pierden al borrar la cache del navegador. Inicia sesion para evitar esto en el futuro.

---

## Atajos de Teclado

| Tecla | Accion |
|-------|--------|
| ESC | Cerrar lector / modales |
| Flechas | Navegar por articulo |

---

## Soporte

Si encuentras problemas o tienes sugerencias:

- **Repositorio:** [GitHub](https://github.com/tu-usuario/particulas-elementales)
- **Web:** https://particulas-elementales.pages.dev

---

*Particulas Elementales - Tu lector RSS con inteligencia artificial*
