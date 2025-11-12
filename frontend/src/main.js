import "./App.css";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const socket = io(API_URL);

let state = {
  isReady: false,
  qrCode: null,
  clientInfo: null,
  messages: [],
  contacts: [],
  autoReplies: [],
  activeTab: "send",
};

// Inicializar
async function init() {
  await fetchStatus();
  await fetchMessages();
  await fetchContacts();
  await fetchAutoReplies();

  socket.on("status", (data) => {
    state = { ...state, ...data };
    render();
  });

  socket.on("qr", (qr) => {
    state.qrCode = qr;
    state.isReady = false;
    render();
  });

  socket.on("ready", (clientInfo) => {
    state.isReady = true;
    state.qrCode = null;
    state.clientInfo = clientInfo;
    render();
  });

  socket.on("disconnected", () => {
    state.isReady = false;
    state.qrCode = null;
    state.clientInfo = null;
    render();
  });

  socket.on("message", (msg) => {
    state.messages = [msg, ...state.messages];
    render();
  });

  render();
}

async function fetchStatus() {
  try {
    const response = await axios.get(`${API_URL}/api/status`);
    state = { ...state, ...response.data };
  } catch (error) {
    console.error("Error obteniendo estado:", error);
  }
}

async function fetchMessages() {
  try {
    const response = await axios.get(`${API_URL}/api/messages`);
    state.messages = response.data;
  } catch (error) {
    console.error("Error obteniendo mensajes:", error);
  }
}

async function fetchContacts() {
  try {
    const response = await axios.get(`${API_URL}/api/contacts`);
    state.contacts = response.data;
  } catch (error) {
    console.error("Error obteniendo contactos:", error);
  }
}

async function fetchAutoReplies() {
  try {
    const response = await axios.get(`${API_URL}/api/auto-replies`);
    state.autoReplies = response.data;
  } catch (error) {
    console.error("Error obteniendo respuestas automáticas:", error);
  }
}

async function sendMessage(e) {
  e.preventDefault();
  const phone = document.getElementById("phone").value;
  const message = document.getElementById("message").value;

  if (!phone || !message) return;

  try {
    await axios.post(`${API_URL}/api/send-message`, { phone, message });
    alert("✅ Mensaje enviado correctamente");
    document.getElementById("message").value = "";
    await fetchMessages();
    render();
  } catch (error) {
    alert("❌ Error enviando mensaje: " + error.response?.data?.error);
  }
}

async function addAutoReply(e) {
  e.preventDefault();
  const trigger = document.getElementById("newTrigger").value;
  const response = document.getElementById("newResponse").value;

  if (!trigger || !response) return;

  try {
    await axios.post(`${API_URL}/api/auto-replies`, { trigger, response });
    alert("✅ Respuesta automática creada");
    document.getElementById("newTrigger").value = "";
    document.getElementById("newResponse").value = "";
    await fetchAutoReplies();
    render();
  } catch (error) {
    alert("❌ Error creando respuesta automática");
  }
}

async function deleteAutoReply(id) {
  if (!confirm("¿Eliminar esta respuesta automática?")) return;

  try {
    await axios.delete(`${API_URL}/api/auto-replies/${id}`);
    await fetchAutoReplies();
    render();
  } catch (error) {
    alert("❌ Error eliminando respuesta automática");
  }
}

function render() {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <div class="app">
      <header>
        <h1>🤖 WhatsApp Bot - Panel de Control</h1>
        <div class="status-indicator">
          ${
            state.isReady
              ? `
            <span class="status ready">✅ Conectado ${
              state.clientInfo ? `(${state.clientInfo.pushname})` : ""
            }</span>
          `
              : state.qrCode
              ? `
            <span class="status qr">📱 Escanea el código QR</span>
          `
              : `
            <span class="status loading">⏳ Iniciando...</span>
          `
          }
        </div>
      </header>
      
      <main>
        ${
          state.qrCode
            ? `
          <div class="qr-section">
            <h2>Escanea este código QR con WhatsApp</h2>
            <canvas id="qr-canvas"></canvas>
            <p>Abre WhatsApp → Configuración → Dispositivos vinculados → Vincular dispositivo</p>
          </div>
        `
            : ""
        }
        
        ${
          state.isReady
            ? `
          <nav class="tabs">
            <button class="${
              state.activeTab === "send" ? "active" : ""
            }" data-tab="send">📤 Enviar Mensaje</button>
            <button class="${
              state.activeTab === "messages" ? "active" : ""
            }" data-tab="messages">💬 Mensajes (${
                state.messages.length
              })</button>
            <button class="${
              state.activeTab === "contacts" ? "active" : ""
            }" data-tab="contacts">👥 Contactos (${
                state.contacts.length
              })</button>
            <button class="${
              state.activeTab === "auto" ? "active" : ""
            }" data-tab="auto">🤖 Respuestas Automáticas</button>
          </nav>
          
          <div class="tab-content">
            ${renderTabContent()}
          </div>
        `
            : ""
        }
      </main>
    </div>
  `;

  // Renderizar QR code si existe
  if (state.qrCode) {
    const canvas = document.getElementById("qr-canvas");
    if (canvas) {
      QRCode.toCanvas(canvas, state.qrCode, { width: 300 });
    }
  }

  // Event listeners
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      state.activeTab = e.target.dataset.tab;
      render();
    });
  });

  const sendForm = document.getElementById("send-form");
  if (sendForm) sendForm.addEventListener("submit", sendMessage);

  const autoForm = document.getElementById("auto-form");
  if (autoForm) autoForm.addEventListener("submit", addAutoReply);

  document.querySelectorAll("[data-delete-auto]").forEach((btn) => {
    btn.addEventListener("click", (e) =>
      deleteAutoReply(e.target.dataset.deleteAuto)
    );
  });

  document.querySelectorAll(".refresh-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetchMessages();
      await fetchContacts();
      render();
    });
  });
}

function renderTabContent() {
  switch (state.activeTab) {
    case "send":
      return `
        <div class="send-section">
          <h2>Enviar Mensaje</h2>
          <form id="send-form">
            <div class="form-group">
              <label>Número de teléfono (con código de país)</label>
              <input type="text" id="phone" placeholder="Ej: 5491122334455" required />
              <small>Sin espacios ni signos. Incluye código de país sin +</small>
            </div>
            <div class="form-group">
              <label>Mensaje</label>
              <textarea id="message" placeholder="Escribe tu mensaje aquí..." rows="5" required></textarea>
            </div>
            <button type="submit">📤 Enviar Mensaje</button>
          </form>
        </div>
      `;

    case "messages":
      return `
        <div class="messages-section">
          <h2>Historial de Mensajes</h2>
          <button class="refresh-btn">🔄 Actualizar</button>
          <div class="messages-list">
            ${state.messages
              .map(
                (msg) => `
              <div class="message-item ${msg.type}">
                <div class="message-header">
                  <span class="contact">${
                    msg.contact?.name || msg.contact?.phone
                  }</span>
                  <span class="type">${msg.type}</span>
                  <span class="time">${new Date(
                    msg.sentAt
                  ).toLocaleString()}</span>
                </div>
                <div class="message-body">${msg.body}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;

    case "contacts":
      return `
        <div class="contacts-section">
          <h2>Contactos</h2>
          <button class="refresh-btn">🔄 Actualizar</button>
          <div class="contacts-list">
            ${state.contacts
              .map(
                (contact) => `
              <div class="contact-item">
                <div class="contact-name">${contact.name || "Sin nombre"}</div>
                <div class="contact-phone">${contact.phone}</div>
                <div class="contact-messages">${
                  contact._count.messages
                } mensajes</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;

    case "auto":
      return `
        <div class="auto-replies-section">
          <h2>Respuestas Automáticas</h2>
          
          <form id="auto-form" class="add-auto-reply">
            <h3>➕ Agregar Nueva</h3>
            <div class="form-group">
              <label>Palabra clave (trigger)</label>
              <input type="text" id="newTrigger" placeholder="Ej: precio, horario, ubicación" required />
            </div>
            <div class="form-group">
              <label>Respuesta automática</label>
              <textarea id="newResponse" placeholder="Mensaje que se enviará automáticamente..." rows="3" required></textarea>
            </div>
            <button type="submit">➕ Agregar Respuesta</button>
          </form>
          
          <div class="auto-replies-list">
            <h3>Respuestas Configuradas</h3>
            ${state.autoReplies
              .map(
                (reply) => `
              <div class="auto-reply-item">
                <div class="trigger">🔑 ${reply.trigger}</div>
                <div class="response">${reply.response}</div>
                <button class="delete-btn" data-delete-auto="${reply.id}">🗑️</button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;

    default:
      return "";
  }
}

init();
