import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import QRCode from "qrcode";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface ClientInfo {
  pushname: string;
  platform: string;
  phone: string;
}

interface Status {
  isReady: boolean;
  qrCode: string | null;
  clientInfo: ClientInfo | null;
}

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  _count: {
    messages: number;
  };
}

interface Message {
  id: string;
  body: string;
  type: "sent" | "received" | "auto";
  sentAt: string;
  contact: {
    phone: string;
    name: string | null;
  };
}

interface AutoReply {
  id: string;
  trigger: string;
  response: string;
  active: boolean;
}

type TabType = "send" | "messages" | "contacts" | "auto";

let socket: Socket;

function App() {
  const [status, setStatus] = useState<Status>({
    isReady: false,
    qrCode: null,
    clientInfo: null,
  });
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [newTrigger, setNewTrigger] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("send");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    // Inicializar socket
    socket = io(API_URL);

    // Cargar datos iniciales
    fetchStatus();
    fetchMessages();
    fetchContacts();
    fetchAutoReplies();

    // Escuchar eventos de Socket.io
    socket.on("status", (data: Status) => {
      setStatus(data);
    });

    socket.on("qr", (qr: string) => {
      setStatus((prev) => ({ ...prev, qrCode: qr, isReady: false }));
      generateQRImage(qr);
    });

    socket.on("ready", (clientInfo: ClientInfo) => {
      setStatus((prev) => ({
        ...prev,
        isReady: true,
        qrCode: null,
        clientInfo,
      }));
      setQrDataUrl("");
    });

    socket.on("disconnected", () => {
      setStatus({ isReady: false, qrCode: null, clientInfo: null });
    });

    socket.on("message", (msg: Message) => {
      setMessages((prev) => [msg, ...prev]);
    });

    return () => {
      socket.off("status");
      socket.off("qr");
      socket.off("ready");
      socket.off("disconnected");
      socket.off("message");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (status.qrCode) {
      generateQRImage(status.qrCode);
    }
  }, [status.qrCode]);

  const generateQRImage = async (qr: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(qr, { width: 300 });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generando QR:", error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await axios.get<Status>(`${API_URL}/api/status`);
      setStatus(response.data);
      if (response.data.qrCode) {
        generateQRImage(response.data.qrCode);
      }
    } catch (error) {
      console.error("Error obteniendo estado:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get<Message[]>(`${API_URL}/api/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error obteniendo mensajes:", error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await axios.get<Contact[]>(`${API_URL}/api/contacts`);
      setContacts(response.data);
    } catch (error) {
      console.error("Error obteniendo contactos:", error);
    }
  };

  const fetchAutoReplies = async () => {
    try {
      const response = await axios.get<AutoReply[]>(
        `${API_URL}/api/auto-replies`
      );
      setAutoReplies(response.data);
    } catch (error) {
      console.error("Error obteniendo respuestas automáticas:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/send-message`, { phone, message });
      alert("✅ Mensaje enviado correctamente");
      setMessage("");
      fetchMessages();
    } catch (error: any) {
      alert(
        "❌ Error enviando mensaje: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const addAutoReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrigger || !newResponse) return;

    try {
      await axios.post(`${API_URL}/api/auto-replies`, {
        trigger: newTrigger,
        response: newResponse,
      });
      alert("✅ Respuesta automática creada");
      setNewTrigger("");
      setNewResponse("");
      fetchAutoReplies();
    } catch (error) {
      alert("❌ Error creando respuesta automática");
    }
  };

  const deleteAutoReply = async (id: string) => {
    if (!confirm("¿Eliminar esta respuesta automática?")) return;

    try {
      await axios.delete(`${API_URL}/api/auto-replies/${id}`);
      fetchAutoReplies();
    } catch (error) {
      alert("❌ Error eliminando respuesta automática");
    }
  };

  return (
    <div className="app">
      <header>
        <h1>🤖 WhatsApp Bot - Panel de Control</h1>
        <div className="status-indicator">
          {status.isReady ? (
            <span className="status ready">
              ✅ Conectado{" "}
              {status.clientInfo && `(${status.clientInfo.pushname})`}
            </span>
          ) : status.qrCode ? (
            <span className="status qr">📱 Escanea el código QR</span>
          ) : (
            <span className="status loading">⏳ Iniciando...</span>
          )}
        </div>
      </header>

      <main>
        {status.qrCode && qrDataUrl && (
          <div className="qr-section">
            <h2>Escanea este código QR con WhatsApp</h2>
            <img src={qrDataUrl} alt="QR Code" />
            <p>
              Abre WhatsApp → Configuración → Dispositivos vinculados → Vincular
              dispositivo
            </p>
          </div>
        )}

        {status.isReady && (
          <>
            <nav className="tabs">
              <button
                className={activeTab === "send" ? "active" : ""}
                onClick={() => setActiveTab("send")}
              >
                📤 Enviar Mensaje
              </button>
              <button
                className={activeTab === "messages" ? "active" : ""}
                onClick={() => setActiveTab("messages")}
              >
                💬 Mensajes ({messages.length})
              </button>
              <button
                className={activeTab === "contacts" ? "active" : ""}
                onClick={() => setActiveTab("contacts")}
              >
                👥 Contactos ({contacts.length})
              </button>
              <button
                className={activeTab === "auto" ? "active" : ""}
                onClick={() => setActiveTab("auto")}
              >
                🤖 Respuestas Automáticas
              </button>
            </nav>

            <div className="tab-content">
              {activeTab === "send" && (
                <div className="send-section">
                  <h2>Enviar Mensaje</h2>
                  <form onSubmit={sendMessage}>
                    <div className="form-group">
                      <label>Número de teléfono (con código de país)</label>
                      <input
                        type="text"
                        placeholder="Ej: 5491122334455"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                      <small>
                        Sin espacios ni signos. Incluye código de país sin +
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Mensaje</label>
                      <textarea
                        placeholder="Escribe tu mensaje aquí..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        required
                      />
                    </div>
                    <button type="submit" disabled={loading}>
                      {loading ? "⏳ Enviando..." : "📤 Enviar Mensaje"}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "messages" && (
                <div className="messages-section">
                  <h2>Historial de Mensajes</h2>
                  <button onClick={fetchMessages} className="refresh-btn">
                    🔄 Actualizar
                  </button>
                  <div className="messages-list">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`message-item ${msg.type}`}>
                        <div className="message-header">
                          <span className="contact">
                            {msg.contact?.name || msg.contact?.phone}
                          </span>
                          <span className="type">{msg.type}</span>
                          <span className="time">
                            {new Date(msg.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="message-body">{msg.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "contacts" && (
                <div className="contacts-section">
                  <h2>Contactos</h2>
                  <button onClick={fetchContacts} className="refresh-btn">
                    🔄 Actualizar
                  </button>
                  <div className="contacts-list">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="contact-item">
                        <div className="contact-name">
                          {contact.name || "Sin nombre"}
                        </div>
                        <div className="contact-phone">{contact.phone}</div>
                        <div className="contact-messages">
                          {contact._count.messages} mensajes
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "auto" && (
                <div className="auto-replies-section">
                  <h2>Respuestas Automáticas</h2>

                  <form onSubmit={addAutoReply} className="add-auto-reply">
                    <h3>➕ Agregar Nueva</h3>
                    <div className="form-group">
                      <label>Palabra clave (trigger)</label>
                      <input
                        type="text"
                        placeholder="Ej: precio, horario, ubicación"
                        value={newTrigger}
                        onChange={(e) => setNewTrigger(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Respuesta automática</label>
                      <textarea
                        placeholder="Mensaje que se enviará automáticamente..."
                        value={newResponse}
                        onChange={(e) => setNewResponse(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                    <button type="submit">➕ Agregar Respuesta</button>
                  </form>

                  <div className="auto-replies-list">
                    <h3>Respuestas Configuradas</h3>
                    {autoReplies.map((reply) => (
                      <div key={reply.id} className="auto-reply-item">
                        <div className="trigger">🔑 {reply.trigger}</div>
                        <div className="response">{reply.response}</div>
                        <button
                          onClick={() => deleteAutoReply(reply.id)}
                          className="delete-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
