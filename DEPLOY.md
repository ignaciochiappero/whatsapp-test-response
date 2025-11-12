# Guía de Despliegue en Render

## Opción 1: Despliegue Automático con render.yaml

### Pre-requisitos
- Cuenta en [Render](https://render.com)
- Repositorio en GitHub/GitLab/Bitbucket con tu código

### Pasos

1. **Sube tu código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - WhatsApp Bot"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```

2. **Conecta Render con tu repositorio**
   - Ve a [Render Dashboard](https://dashboard.render.com)
   - Click en "New" → "Blueprint"
   - Conecta tu repositorio de GitHub
   - Render detectará automáticamente el archivo `render.yaml`

3. **Configura las variables de entorno**
   Render te pedirá configurar:
   - `FRONTEND_URL`: La URL de tu frontend (ej: `https://whatsapp-bot-frontend.onrender.com`)
   - `VITE_API_URL`: La URL de tu backend (ej: `https://whatsapp-bot-backend.onrender.com`)

4. **Despliega**
   - Click en "Apply"
   - Render creará automáticamente:
     - Base de datos PostgreSQL
     - Servicio Backend (Docker)
     - Servicio Frontend (Static Site)

---

## Opción 2: Despliegue Manual (Paso a Paso)

### 1. Crear Base de Datos PostgreSQL

1. En Render Dashboard → "New" → "PostgreSQL"
2. Nombre: `whatsapp-bot-db`
3. Database: `whatsapp_bot`
4. Region: Oregon (o la más cercana)
5. Plan: Free
6. Copia la **Internal Database URL** (la usarás en el backend)

### 2. Desplegar Backend

1. En Render Dashboard → "New" → "Web Service"
2. Conecta tu repositorio
3. Configura:
   - **Name**: `whatsapp-bot-backend`
   - **Region**: Oregon
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free

4. **Variables de Entorno**:
   ```
   DATABASE_URL=<Internal-Database-URL-de-paso-1>
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://whatsapp-bot-frontend.onrender.com
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   ```

5. **Disco Persistente** (importante para mantener la sesión de WhatsApp):
   - En "Disk" → Add Disk
   - Name: `whatsapp-data`
   - Mount Path: `/app/.wwebjs_auth`
   - Size: 1 GB

6. **Health Check**:
   - Path: `/api/status`

7. Click "Create Web Service"

### 3. Desplegar Frontend

#### Opción A: Static Site (Recomendado - Más rápido)

1. En Render Dashboard → "New" → "Static Site"
2. Conecta tu repositorio
3. Configura:
   - **Name**: `whatsapp-bot-frontend`
   - **Region**: Oregon
   - **Branch**: main
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

4. **Variables de Entorno**:
   ```
   VITE_API_URL=https://whatsapp-bot-backend.onrender.com
   ```

5. Click "Create Static Site"

#### Opción B: Web Service con Docker

1. Crea un `Dockerfile` específico para frontend en producción:
   ```dockerfile
   FROM nginx:alpine
   COPY frontend/dist /usr/share/nginx/html
   COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

---

## Actualizar CORS en el Backend

Antes de desplegar, actualiza el archivo `server.js` para aceptar requests de tu frontend en Render:

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://whatsapp-bot-frontend.onrender.com" // Tu URL de Render
    ],
    methods: ["GET", "POST"],
  },
});

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "https://whatsapp-bot-frontend.onrender.com" // Tu URL de Render
  ]
}));
```

---

## Consideraciones Importantes

### 1. Sesión de WhatsApp
- La sesión se guardará en el disco persistente `/app/.wwebjs_auth`
- **Importante**: Si eliminas o reinicias el servicio sin el disco, perderás la sesión
- Recomendación: Usa el plan Starter ($7/mes) para evitar que el servicio se apague por inactividad

### 2. Plan Free de Render
- El backend se apagará después de 15 minutos de inactividad
- Tardará ~30 segundos en despertar cuando reciba una request
- WhatsApp se desconectará y necesitarás escanear el QR nuevamente
- **Solución**: Actualizar a plan Starter para mantener el servicio siempre activo

### 3. Chromium en Docker
- El Dockerfile ya incluye Chromium
- Asegúrate de que la variable `PUPPETEER_EXECUTABLE_PATH` esté configurada

### 4. Base de Datos
- El plan Free de PostgreSQL tiene límite de 100MB
- Suficiente para miles de mensajes
- Los mensajes y logs se guardarán automáticamente

### 5. Dominios Personalizados
- Render te da URLs como: `https://tu-servicio.onrender.com`
- Puedes agregar un dominio personalizado en Settings

---

## Monitoreo y Logs

### Ver logs en tiempo real:
- Backend: Dashboard → whatsapp-bot-backend → Logs
- Frontend: Dashboard → whatsapp-bot-frontend → Logs

### Ver el QR Code:
1. Ve a los logs del backend en Render
2. Busca el mensaje "📱 QR Code generado"
3. O abre tu frontend en el navegador: `https://whatsapp-bot-frontend.onrender.com`

---

## Troubleshooting

### Error: "Failed to launch browser"
- Verifica que `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- Asegúrate de que el Dockerfile incluya la instalación de Chromium

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` tenga la URL correcta
- Usa la **Internal Database URL**, no la External

### Frontend no carga el QR
- Verifica que `VITE_API_URL` apunte al backend correcto
- Revisa que el CORS esté configurado correctamente en server.js

### Servicio se apaga constantemente
- Es normal en el plan Free
- Solución: Actualizar a plan Starter ($7/mes por servicio)

---

## Comandos Útiles

### Rebuild manual:
```bash
# En Render Dashboard
Manual Deploy → Clear build cache & deploy
```

### Ver estado de migraciones:
```bash
# En Render Shell (si está disponible)
npx prisma migrate status
```

---

## Costos Estimados

### Plan Free (Totalmente gratis)
- ✅ Backend: Free
- ✅ Frontend: Free  
- ✅ PostgreSQL: Free (100MB)
- ❌ Limitación: Servicios se apagan con inactividad

### Plan Starter (Recomendado para producción)
- Backend: $7/mes (siempre activo)
- Frontend: Free (static site)
- PostgreSQL: Free (100MB) o $7/mes (1GB)
- **Total**: $7-14/mes

---

## Variables de Entorno Completas

### Backend
```env
DATABASE_URL=postgresql://user:password@host:5432/whatsapp_bot
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://whatsapp-bot-frontend.onrender.com
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Frontend
```env
VITE_API_URL=https://whatsapp-bot-backend.onrender.com
```

---

## Próximos Pasos

1. Sube tu código a GitHub
2. Conecta Render con tu repositorio
3. Usa el archivo `render.yaml` para despliegue automático
4. Configura las variables de entorno
5. Escanea el QR code desde la interfaz web
6. ¡Disfruta de tu bot en la nube! 🚀
