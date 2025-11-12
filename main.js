const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client();

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Escanea este QR para iniciar sesión");
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message_create", (message) => {
  console.log("Mensaje recibido:", message.body);

  if (message.body === "!ping") {
    // opción 1: enviar al chat
    client.sendMessage(message.from, "pong");
  }

  if (message.body === "!hola") {
    // opción 2: responder directamente
    message.reply(
      "¡Hola! ¿Cómo estás? este es un mensaje de un bot de Nacho automatizado 👁️👄👁️"
    );
  }
});

client.initialize();
