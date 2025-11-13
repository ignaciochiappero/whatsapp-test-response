const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Configurar orígenes permitidos para CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174", // Vite alternativo
].filter(Boolean); // Eliminar valores undefined

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Estado del cliente WhatsApp
let whatsappClient = null;
let qrCode = null;
let isReady = false;
let clientInfo = null;

// Inicializar cliente WhatsApp
function initializeWhatsAppClient() {
  const puppeteerConfig = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  };

  // Solo agregar executablePath si está definido en .env (Docker/producción)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: ".wwebjs_auth",
    }),
    puppeteer: puppeteerConfig,
  });

  whatsappClient.on("qr", async (qr) => {
    console.log("📱 QR Code generado");
    qrCode = qr;
    isReady = false;

    // Emitir a todos los clientes conectados
    io.emit("qr", qr);

    // Log en base de datos
    await prisma.systemLog.create({
      data: {
        event: "QR_GENERATED",
        details: "Nuevo código QR generado",
      },
    });
  });

  whatsappClient.on("ready", async () => {
    console.log("✅ Cliente de WhatsApp listo!");
    isReady = true;
    qrCode = null;

    // Obtener info del cliente
    const info = whatsappClient.info;
    clientInfo = {
      pushname: info.pushname,
      platform: info.platform,
      phone: info.wid.user,
    };

    io.emit("ready", clientInfo);

    await prisma.systemLog.create({
      data: {
        event: "CLIENT_READY",
        details: `Cliente conectado: ${clientInfo.pushname}`,
      },
    });
  });

  whatsappClient.on("authenticated", async () => {
    console.log("🔐 Autenticado");
    await prisma.systemLog.create({
      data: {
        event: "AUTHENTICATED",
        details: "Cliente autenticado correctamente",
      },
    });
  });

  whatsappClient.on("auth_failure", async (msg) => {
    console.error("❌ Fallo en autenticación:", msg);
    await prisma.systemLog.create({
      data: {
        event: "AUTH_FAILURE",
        details: msg,
      },
    });
  });

  whatsappClient.on("disconnected", async (reason) => {
    console.log("🔌 Cliente desconectado:", reason);
    isReady = false;
    clientInfo = null;
    io.emit("disconnected", reason);

    await prisma.systemLog.create({
      data: {
        event: "DISCONNECTED",
        details: reason,
      },
    });
  });

  whatsappClient.on("message_create", async (message) => {
    console.log("💬 Mensaje:", message.body);

    try {
      // Ignorar mensajes que no son de chat (estados, llamadas, etc)
      if (!message.body || message.type !== "chat") {
        return;
      }

      // Guardar contacto si no existe
      const phoneNumber = message.from.split("@")[0];
      let contact = await prisma.contact.findUnique({
        where: { phone: phoneNumber },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            phone: phoneNumber,
            name: message._data.notifyName || null,
          },
        });
      }

      // Guardar mensaje
      await prisma.message.create({
        data: {
          contactId: contact.id,
          body: message.body,
          type: message.fromMe ? "sent" : "received",
          status: "sent",
        },
      });

      // Buscar si existe una auto-respuesta para este trigger
      const autoReplies = await prisma.autoReply.findMany({
        where: { active: true },
      });

      let foundAutoReply = false;
      for (const autoReply of autoReplies) {
        // Si el mensaje contiene el trigger Y NO es la respuesta misma (para evitar bucle)
        if (
          message.body
            .toLowerCase()
            .includes(autoReply.trigger.toLowerCase()) &&
          message.body !== autoReply.response
        ) {
          foundAutoReply = true;
          await message.reply(autoReply.response);

          await prisma.message.create({
            data: {
              contactId: contact.id,
              body: autoReply.response,
              type: "auto",
              status: "sent",
            },
          });

          break; // Solo enviar UNA respuesta
        }
      }

      // Auto-respuestas programadas fijas (solo si no se encontró una de BD)
      if (!foundAutoReply) {
        if (message.body === "!ping") {
          await whatsappClient.sendMessage(message.from, "pong");

          await prisma.message.create({
            data: {
              contactId: contact.id,
              body: "pong",
              type: "auto",
              status: "sent",
            },
          });
        }

        if (message.body === "!hola") {
          const reply =
            "¡Hola! ¿Cómo estás? este es un mensaje de un bot de Nacho automatizado 👁️👄👁️";
          await message.reply(reply);

          await prisma.message.create({
            data: {
              contactId: contact.id,
              body: reply,
              type: "auto",
              status: "sent",
            },
          });
        }
      }

      // Emitir evento de nuevo mensaje
      io.emit("message", {
        from: phoneNumber,
        body: message.body,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error procesando mensaje:", error);
    }
  });

  whatsappClient.initialize();
}

// Routes
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "WhatsApp Bot API",
    version: "1.0.0",
  });
});

// Estado del cliente
app.get("/api/status", (req, res) => {
  res.json({
    isReady,
    qrCode,
    clientInfo,
  });
});

// Enviar mensaje
app.post("/api/send-message", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        error: "Se requieren 'phone' y 'message'",
      });
    }

    if (!isReady) {
      return res.status(503).json({
        error: "Cliente de WhatsApp no está listo",
      });
    }

    // Formatear número
    const formattedPhone = phone.includes("@c.us") ? phone : `${phone}@c.us`;

    // Enviar mensaje
    await whatsappClient.sendMessage(formattedPhone, message);

    // Guardar en base de datos
    const phoneNumber = phone.replace("@c.us", "");
    let contact = await prisma.contact.findUnique({
      where: { phone: phoneNumber },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: { phone: phoneNumber },
      });
    }

    await prisma.message.create({
      data: {
        contactId: contact.id,
        body: message,
        type: "sent",
        status: "sent",
      },
    });

    res.json({
      success: true,
      message: "Mensaje enviado correctamente",
    });
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    res.status(500).json({
      error: "Error enviando mensaje",
      details: error.message,
    });
  }
});

// Obtener mensajes
app.get("/api/messages", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const messages = await prisma.message.findMany({
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { sentAt: "desc" },
      include: {
        contact: true,
      },
    });

    res.json(messages);
  } catch (error) {
    console.error("Error obteniendo mensajes:", error);
    res.status(500).json({
      error: "Error obteniendo mensajes",
    });
  }
});

// Obtener contactos
app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json(contacts);
  } catch (error) {
    console.error("Error obteniendo contactos:", error);
    res.status(500).json({
      error: "Error obteniendo contactos",
    });
  }
});

// Respuestas automáticas
app.get("/api/auto-replies", async (req, res) => {
  try {
    const autoReplies = await prisma.autoReply.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(autoReplies);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo respuestas automáticas" });
  }
});

app.post("/api/auto-replies", async (req, res) => {
  try {
    const { trigger, response } = req.body;

    if (!trigger || !response) {
      return res.status(400).json({
        error: "Se requieren 'trigger' y 'response'",
      });
    }

    const autoReply = await prisma.autoReply.create({
      data: { trigger, response },
    });

    res.json(autoReply);
  } catch (error) {
    res.status(500).json({ error: "Error creando respuesta automática" });
  }
});

app.delete("/api/auto-replies/:id", async (req, res) => {
  try {
    await prisma.autoReply.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error eliminando respuesta automática" });
  }
});

// Logs del sistema
app.get("/api/logs", async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const logs = await prisma.systemLog.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo logs" });
  }
});

// WebSocket
io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);

  // Enviar estado actual
  socket.emit("status", {
    isReady,
    qrCode,
    clientInfo,
  });

  socket.on("disconnect", () => {
    console.log("🔌 Cliente desconectado:", socket.id);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔌 WebSocket disponible en ws://localhost:${PORT}`);
  initializeWhatsAppClient();
});

// Manejo de cierre
process.on("SIGINT", async () => {
  console.log("\n⏹️  Cerrando servidor...");
  if (whatsappClient) {
    await whatsappClient.destroy();
  }
  await prisma.$disconnect();
  process.exit(0);
});
