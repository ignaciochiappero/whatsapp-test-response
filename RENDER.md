# 🚀 Despliegue Rápido en Render

## Paso 1: Preparar el Repositorio

```bash
# Inicializar Git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Ready for Render deployment"

# Subir a GitHub (reemplaza con tu URL)
git remote add origin https://github.com/tu-usuario/whatsapp-bot.git
git branch -M main
git push -u origin main
```

## Paso 2: Crear Servicios en Render

### 2.1 Base de Datos PostgreSQL

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"PostgreSQL"**
3. Configura:
   - **Name**: `whatsapp-bot-db`
   - **Database**: `whatsapp_bot`  
   - **User**: `whatsapp_user`
   - **Region**: Oregon (o la más cercana a ti)
   - **Instance Type**: Free
4. Click **"Create Database"**
5. **Guarda la "Internal Database URL"** (la necesitarás en el paso siguiente)

### 2.2 Backend (API + WhatsApp Client)

1. Click en **"New +"** → **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Name**: `whatsapp-bot-backend`
   - **Region**: Oregon (misma que la BD)
   - **Branch**: `main`
   - **Root Directory**: (dejar vacío)
   - **Environment**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: Free

4. **Environment Variables** (Variables de Entorno):
   ```
   DATABASE_URL       = [Pega aquí la Internal Database URL del paso 2.1]
   PORT               = 3001
   NODE_ENV           = production
   FRONTEND_URL       = https://whatsapp-bot-frontend.onrender.com
   PUPPETEER_EXECUTABLE_PATH = /usr/bin/chromium-browser
   ```

5. **Agregar Disco Persistente**:
   - Scroll down hasta "Disk"
   - Click en **"Add Disk"**
   - **Name**: `whatsapp-session`
   - **Mount Path**: `/app/.wwebjs_auth`
   - **Size**: 1 GB
   
   > ⚠️ **MUY IMPORTANTE**: Sin este disco, perderás la sesión de WhatsApp cada vez que se reinicie el servicio.

6. **Health Check Path**: `/api/status`

7. Click **"Create Web Service"**

### 2.3 Frontend (Interfaz Web)

1. Click en **"New +"** → **"Static Site"**
2. Conecta tu repositorio
3. Configura:
   - **Name**: `whatsapp-bot-frontend`
   - **Region**: Oregon
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL = https://whatsapp-bot-backend.onrender.com
   ```
   
   > 🔧 Reemplaza con la URL real de tu backend (aparece en el dashboard del backend)

5. Click **"Create Static Site"**

## Paso 3: Configurar CORS

Una vez que tengas las URLs de Render, actualiza el archivo `server.js`:

```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://whatsapp-bot-frontend.onrender.com", // 👈 Agrega tu URL real
].filter(Boolean);
```

Luego haz commit y push:

```bash
git add server.js
git commit -m "Update CORS for production"
git push
```

Render desplegará automáticamente los cambios.

## Paso 4: Escanear QR Code

1. Ve a tu frontend: `https://whatsapp-bot-frontend.onrender.com`
2. Espera a que aparezca el QR code
3. Escanéalo con WhatsApp → Dispositivos Vinculados
4. ¡Listo! Tu bot está en la nube 🎉

## 📋 Checklist de Verificación

Antes de escanear el QR, verifica:

- [ ] Base de datos PostgreSQL creada y en estado "Available"
- [ ] Backend desplegado sin errores (check los logs)
- [ ] Frontend desplegado correctamente
- [ ] Variable `DATABASE_URL` configurada en el backend
- [ ] Variable `VITE_API_URL` configurada en el frontend con la URL del backend
- [ ] Variable `FRONTEND_URL` configurada en el backend con la URL del frontend
- [ ] Disco persistente agregado al backend (1 GB en `/app/.wwebjs_auth`)
- [ ] Health check configurado en `/api/status`

## 🔍 Ver Logs

Para ver si todo está funcionando:

1. Ve al dashboard del **backend**
2. Click en la pestaña **"Logs"**
3. Deberías ver:
   ```
   🚀 Servidor corriendo en http://localhost:3001
   🔌 WebSocket disponible en ws://localhost:3001
   📱 QR Code generado
   ```

## ⚠️ Consideraciones del Plan Free

**Limitaciones:**
- El backend se **apagará** después de 15 minutos de inactividad
- Tardará ~30 segundos en "despertar" cuando reciba una request
- WhatsApp se desconectará y necesitarás **escanear el QR nuevamente**

**Solución:**
- Actualizar al plan **Starter** ($7/mes) para mantener el servicio siempre activo
- Con Starter, la sesión de WhatsApp se mantendrá permanentemente

## 🆘 Troubleshooting

### Backend no inicia
**Error común**: `Failed to launch browser`

**Solución**:
1. Verifica que `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
2. Asegúrate de que el Dockerfile esté correcto
3. Rebuild: Manual Deploy → Clear build cache & deploy

### Frontend no carga el QR
**Problema**: No se conecta al backend

**Solución**:
1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña Console
3. Busca errores de CORS o conexión
4. Verifica que `VITE_API_URL` sea correcto
5. Verifica que el backend esté en estado "Running"

### Database connection error
**Error**: `Cannot reach database`

**Solución**:
1. Copia nuevamente la **Internal Database URL** (no la External)
2. Asegúrate de que la BD esté en estado "Available"
3. Verifica que backend y BD estén en la misma región

### El servicio se apaga constantemente
**Esto es normal en el plan Free**

Si necesitas que esté siempre activo:
1. Ve a Settings del servicio
2. Upgrade to Starter → $7/mes
3. El servicio quedará siempre activo

## 💰 Costos

### Plan Free (Actual)
- ✅ Backend: $0
- ✅ Frontend: $0
- ✅ PostgreSQL: $0 (100 MB)
- ❌ Se apaga con inactividad

### Plan Starter (Recomendado para producción)
- Backend: $7/mes
- Frontend: $0 (static site siempre gratis)
- PostgreSQL: $0 (100 MB) o $7/mes (1 GB)
- ✅ **Siempre activo**
- ✅ **WhatsApp siempre conectado**

## 🎯 URLs Finales

Una vez desplegado, tendrás:

```
Frontend:  https://whatsapp-bot-frontend.onrender.com
Backend:   https://whatsapp-bot-backend.onrender.com
Database:  [Solo accesible internamente]
```

## 🔄 Actualizar el Bot

Cada vez que hagas cambios:

```bash
git add .
git commit -m "Descripción de cambios"
git push
```

Render detectará los cambios y desplegará automáticamente.

---

## 📚 Recursos Adicionales

- [Documentación completa de despliegue](./DEPLOY.md)
- [Render Documentation](https://render.com/docs)
- [WhatsApp Web.js Docs](https://wwebjs.dev/)

---

¿Listo para desplegar? ¡Sigue estos pasos y en 10 minutos tendrás tu bot en la nube! 🚀
