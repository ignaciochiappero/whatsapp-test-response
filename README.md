# 🤖 WhatsApp Bot - API & Panel de Control

Bot de WhatsApp con API REST, interfaz web y persistencia en PostgreSQL. Totalmente dockerizado para deployment en la nube.

## 🚀 Características

- ✅ API REST completa para enviar mensajes
- ✅ Interfaz web para escanear QR y gestionar el bot
- ✅ Respuestas automáticas configurables
- ✅ Historial de mensajes en PostgreSQL
- ✅ WebSocket para actualizaciones en tiempo real
- ✅ Dockerizado y listo para producción
- ✅ Mantiene la funcionalidad original del bot

## 📋 Estructura del Proyecto

```
lab-whatsapp/
├── server.js              # Servidor Express + WhatsApp Client
├── main.js                # Bot original (aún funcional con npm run old)
├── prisma/
│   └── schema.prisma      # Schema de base de datos
├── frontend/              # Interfaz React
│   ├── src/
│   │   ├── App.jsx
│   │   └── App.css
│   ├── Dockerfile
│   └── nginx.conf
├── Dockerfile             # Dockerfile del backend
├── docker-compose.yml     # Orquestación completa
└── .env                   # Variables de entorno
```

## 🛠️ Instalación y Uso

### Opción 1: Con Docker (Recomendado para producción)

1. **Levantar todos los servicios**:

```bash
npm run docker:up
```

Esto levantará:

- PostgreSQL en puerto 5432
- Backend en puerto 3001
- Frontend en puerto 3000

2. **Abrir en el navegador**:

```
http://localhost:3000
```

3. **Ver logs**:

```bash
npm run docker:logs
```

4. **Detener servicios**:

```bash
npm run docker:down
```

### Opción 2: Desarrollo local (Sin Docker)

1. **Instalar dependencias**:

```bash
npm install
cd frontend
npm install
cd ..
```

2. **Configurar PostgreSQL local** (debe estar corriendo):
   Editar `.env` con tu conexión:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/whatsapp_bot?schema=public"
```

3. **Ejecutar migraciones de Prisma**:

```bash
npm run prisma:migrate
```

4. **Iniciar backend**:

```bash
npm start
```

5. **En otra terminal, iniciar frontend**:

```bash
cd frontend
npm run dev
```

6. **Abrir navegador**:

```
http://localhost:5173
```

### Opción 3: Bot original (sin API)

Si quieres usar solo el bot original con QR en terminal:

```bash
npm run old
```

## 📡 API Endpoints

### Estado del cliente

```http
GET /api/status
```

### Enviar mensaje

```http
POST /api/send-message
Content-Type: application/json

{
  "phone": "5491122334455",
  "message": "Hola desde la API!"
}
```

### Obtener mensajes

```http
GET /api/messages?limit=50&offset=0
```

### Obtener contactos

```http
GET /api/contacts
```

### Respuestas automáticas

**Listar:**

```http
GET /api/auto-replies
```

**Crear:**

```http
POST /api/auto-replies
Content-Type: application/json

{
  "trigger": "precio",
  "response": "Nuestros precios van desde $1000"
}
```

**Eliminar:**

```http
DELETE /api/auto-replies/:id
```

## 🗄️ Base de Datos

El proyecto usa Prisma con PostgreSQL:

```bash
# Ver base de datos en interfaz visual
npm run prisma:studio

# Crear nueva migración
npm run prisma:migrate

# Regenerar cliente
npm run prisma:generate
```

## 🐳 Deployment en la Nube

### 📖 Guía Completa de Despliegue

Lee la guía detallada en **[DEPLOY.md](./DEPLOY.md)** para desplegar en:

- ✅ **Render** (Recomendado - Con `render.yaml` incluido)
- ✅ Railway
- ✅ Heroku  
- ✅ AWS / Google Cloud / Azure
- ✅ DigitalOcean

### Despliegue Rápido en Render

1. **Sube tu código a GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git push -u origin main
```

2. **En Render Dashboard**:
   - New → Blueprint
   - Conecta tu repositorio
   - Render detectará `render.yaml` automáticamente

3. **Configura variables**:
   - `FRONTEND_URL`: URL de tu frontend
   - `VITE_API_URL`: URL de tu backend

4. **Deploy** 🚀

**Importante**: Lee [DEPLOY.md](./DEPLOY.md) para consideraciones de producción, planes de pricing, y troubleshooting.

## 📦 Scripts NPM

```bash
npm start              # Iniciar servidor (nuevo sistema)
npm run old            # Iniciar bot original
npm run prisma:migrate # Ejecutar migraciones
npm run prisma:studio  # Abrir Prisma Studio
npm run docker:up      # Levantar servicios Docker
npm run docker:down    # Detener servicios Docker
npm run docker:logs    # Ver logs Docker
```

## 🆘 Troubleshooting

### El QR no aparece

- Verificar que el backend esté corriendo
- Eliminar sesión anterior: borrar carpeta `.wwebjs_auth/`

### Error de PostgreSQL

- Verificar `DATABASE_URL` en `.env`
- Ejecutar: `npm run prisma:migrate`

### Frontend no conecta

- Verificar `VITE_API_URL` en `frontend/.env`
- Debe apuntar a `http://localhost:3001`

---

Hecho con ❤️ por Nacho
