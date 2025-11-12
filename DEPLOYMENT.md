# Instrucciones de Deployment

## 🌐 Railway (Recomendado - Gratis)

1. Crear cuenta en [railway.app](https://railway.app)
2. Crear nuevo proyecto
3. Agregar PostgreSQL desde el marketplace
4. Agregar servicio desde GitHub repo
5. Configurar variables:
   - `DATABASE_URL` - Auto provisto por Railway
   - `PORT` - Auto provisto por Railway
   - `FRONTEND_URL` - URL del frontend (ej: https://tu-app.railway.app)
6. Railway detectará el Dockerfile y deployará automáticamente

## 🚀 Render

1. Crear cuenta en [render.com](https://render.com)
2. Crear PostgreSQL Database
3. Crear Web Service desde repo
4. Configurar variables de entorno
5. Deploy automático con cada push

## 📦 DigitalOcean / Vultr / Linode

### Requisitos

- VPS con Docker instalado
- Dominio apuntando al servidor (opcional)

### Pasos

1. **Conectar por SSH:**

```bash
ssh root@tu-servidor.com
```

2. **Instalar Docker y Docker Compose:**

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Clonar repositorio:**

```bash
git clone <tu-repo>
cd lab-whatsapp
```

4. **Configurar variables de entorno:**

```bash
nano .env
```

Editar:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD_SEGURA@postgres:5432/whatsapp_bot?schema=public"
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://tu-dominio.com
```

5. **Levantar servicios:**

```bash
docker-compose up -d
```

6. **Configurar Nginx (opcional pero recomendado):**

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/whatsapp-bot
```

Configuración:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

7. **SSL con Let's Encrypt (recomendado):**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

## 🔄 Actualizar deployment

### Railway/Render

- Push a GitHub → Deploy automático

### VPS Manual

```bash
cd lab-whatsapp
git pull
docker-compose down
docker-compose up -d --build
```

## 📊 Monitoreo

Ver logs en tiempo real:

```bash
docker-compose logs -f
```

Ver solo backend:

```bash
docker-compose logs -f backend
```

Estado de contenedores:

```bash
docker-compose ps
```

## 🔐 Seguridad en Producción

1. **Cambiar contraseñas de PostgreSQL**
2. **Usar HTTPS siempre**
3. **Configurar firewall:**

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

4. **Variables de entorno seguras**
5. **Backups automáticos de la BD:**

```bash
# Agregar a crontab
0 2 * * * docker exec whatsapp-bot-db pg_dump -U postgres whatsapp_bot > /backups/whatsapp-bot-$(date +\%Y\%m\%d).sql
```

## 🆘 Troubleshooting en Producción

### Contenedor no inicia

```bash
docker-compose logs backend
```

### Base de datos no conecta

```bash
docker-compose exec postgres psql -U postgres -c "\l"
```

### Resetear sesión de WhatsApp

```bash
docker-compose down
docker volume rm lab-whatsapp_whatsapp_session
docker-compose up -d
```

### Liberar espacio

```bash
docker system prune -a
```
