import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bulczammsjhzdsbttgir.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bGN6YW1tc2poemRzYnR0Z2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzgwNjYsImV4cCI6MjEwMzkxNDA2Nn0.KGLzK_tpWcCYJ2h4ymJ5LRqm6EC81fDjcciUpUR6Ouc"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_SERVICES = [
  { id: "s1", name: "Fisioterapia General", price: 45, duration: 50 },
  { id: "s2", name: "Osteopatía", price: 55, duration: 60 },
  { id: "s3", name: "Terapia Deportiva", price: 50, duration: 50 }
];

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap";

const HOURS = Array.from({ length: 10 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

export default function App() {
  const [view, setView] = useState("landing");
  const [tab, setTab] = useState("agenda");
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [bookings, setBookings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: svcData } = await supabase.from("services").select("*");
      if (svcData && svcData.length > 0) setServices(svcData);

      const { data: blkData } = await supabase.from("blocked_slots").select("*");
      if (blkData) setBlockedSlots(blkData);

      const { data: bksData } = await supabase.from("bookings").select("*");
      if (bksData) {
        setBookings(
          bksData.map((b) => ({
            ...b,
            serviceId: b.service_id,
            clientName: b.client_name,
            paymentMethod: b.payment_method || "presencial",
            createdAt: b.created_at,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addBooking = async (b) => {
    setBookings((prev) => [...prev, b]);
    const payload = {
      id: b.id,
      service_id: b.serviceId,
      date: b.date,
      time: b.time,
      client_name: b.clientName,
      phone: b.phone,
      status: b.status,
      notes: b.notes || "",
      payment_method: b.paymentMethod || "presencial",
      paid: !!b.paid,
      created_at: b.createdAt,
    };
    await supabase.from("bookings").insert([payload]);
  };

  const updateBooking = async (updated) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    const payload = {
      notes: updated.notes,
      paid: updated.paid,
      payment_method: updated.paymentMethod,
    };
    await supabase.from("bookings").update(payload).eq("id", updated.id);
  };

  const removeBooking = async (id) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    await supabase.from("bookings").delete().eq("id", id);
  };

  const toggleBlocked = async (date, time) => {
    const exists = blockedSlots.find((s) => s.date === date && s.time === time);
    if (exists) {
      setBlockedSlots((prev) => prev.filter((s) => !(s.date === date && s.time === time)));
      await supabase.from("blocked_slots").delete().match({ date, time });
    } else {
      setBlockedSlots((prev) => [...prev, { date, time }]);
      await supabase.from("blocked_slots").insert([{ date, time }]);
    }
  };

  // Gestión de Servicios
  const saveService = async (service) => {
    const exists = services.find((s) => s.id === service.id);
    if (exists) {
      setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
      await supabase.from("services").update({ name: service.name, price: service.price, duration: service.duration }).eq("id", service.id);
    } else {
      setServices((prev) => [...prev, service]);
      await supabase.from("services").insert([{ id: service.id, name: service.name, price: service.price, duration: service.duration }]);
    }
  };

  const deleteService = async (id) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("services").delete().eq("id", id);
  };

  if (!loaded) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Cargando datos...</div>;
  }

  if (view === "landing") {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: "#EDE7D9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{`@import url('${FONT_LINK}');`}</style>
        <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 26, marginBottom: 8 }}>Pide cita con Álex Sánchez</h1>
          <p style={{ color: "#6B6A5E", fontSize: 14, marginBottom: 32 }}>Elige cómo quieres entrar</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => setView("client")} style={{ background: "#56684B", color: "#F7F3E9", border: "none", borderRadius: 6, padding: "16px", fontSize: 15, cursor: "pointer" }}>
              Pedir cita
            </button>
            <button onClick={() => setView(user ? "pro" : "proLogin")} style={{ background: "transparent", color: "#6B6A5E", border: "1px solid #D7CFBC", borderRadius: 6, padding: "14px", fontSize: 14, cursor: "pointer" }}>
              Acceso profesional {user ? "(Sesión activa)" : ""}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "proLogin") {
    return <ProLogin onSuccess={() => setView("pro")} onBack={() => setView("landing")} />;
  }

  if (view === "client") {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: "#EDE7D9", minHeight: "100vh", padding: "40px 24px" }}>
        <style>{`@import url('${FONT_LINK}'); input, select { width: 100%; padding: 10px; margin-top: 4px; margin-bottom: 12px; border: 1px solid #D7CFBC; borderRadius: 4px; }`}</style>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <button onClick={() => setView("landing")} style={{ background: "none", border: "none", color: "#6B6A5E", marginBottom: 20, cursor: "pointer" }}>← Volver</button>
          <ReservarTab services={services} bookings={bookings} blockedSlots={blockedSlots} addBooking={addBooking} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#EDE7D9", minHeight: "100vh", display: "flex" }}>
      <style>{`@import url('${FONT_LINK}');`}</style>
      <aside style={{ width: 220, padding: 24, borderRight: "1px solid #D7CFBC" }}>
        <h3 style={{ fontFamily: "Fraunces, serif", marginBottom: 20 }}>Panel Control</h3>
        <button onClick={() => setTab("agenda")} style={{ display: "block", width: "100%", textAlign: "left", padding: 10, background: tab === "agenda" ? "#D7CFBC" : "transparent", border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 4 }}>Agenda y Sesiones</button>
        <button onClick={() => setTab("servicios")} style={{ display: "block", width: "100%", textAlign: "left", padding: 10, background: tab === "servicios" ? "#D7CFBC" : "transparent", border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 4 }}>Gestión Servicios</button>
        <button onClick={() => setTab("horario")} style={{ display: "block", width: "100%", textAlign: "left", padding: 10, background: tab === "horario" ? "#D7CFBC" : "transparent", border: "none", borderRadius: 4, cursor: "pointer" }}>Horario y Bloqueos</button>
        <button onClick={async () => { await supabase.auth.signOut(); setView("landing"); }} style={{ marginTop: 40, color: "#A14B3E", background: "none", border: "none", cursor: "pointer" }}>Cerrar Sesión</button>
      </aside>
      <main style={{ flex: 1, padding: 40 }}>
        {tab === "agenda" && <AgendaTab bookings={bookings} services={services} removeBooking={removeBooking} updateBooking={updateBooking} />}
        {tab === "servicios" && <ServiciosTab services={services} saveService={saveService} deleteService={deleteService} />}
        {tab === "horario" && <HorarioTab blockedSlots={blockedSlots} toggleBlocked={toggleBlocked} />}
      </main>
    </div>
  );
}

function ProLogin({ onSuccess, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email o contraseña incorrectos.");
    else onSuccess();
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#EDE7D9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 320, width: "100%", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20, marginBottom: 12 }}>Acceso Profesional</h2>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ width: "100%", padding: 10, marginBottom: 10, border: "1px solid #D7CFBC" }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" style={{ width: "100%", padding: 10, marginBottom: 10, border: "1px solid #D7CFBC" }} />
        {error && <p style={{ color: "#A14B3E", fontSize: 13 }}>{error}</p>}
        <button onClick={submit} style={{ width: "100%", background: "#56684B", color: "#FFF", border: "none", padding: 12, borderRadius: 4, cursor: "pointer", marginTop: 8 }}>Entrar</button>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#6B6A5E", marginTop: 12, cursor: "pointer" }}>← Volver</button>
      </div>
    </div>
  );
}

function ReservarTab({ services, bookings, blockedSlots, addBooking }) {
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    if (services.length > 0 && !serviceId) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  const takenTimes = bookings.filter((b) => b.date === date).map((b) => b.time);
  const blockedTimes = blockedSlots.filter((s) => s.date === date).map((s) => s.time);
  const availableHours = HOURS.filter((h) => !takenTimes.includes(h) && !blockedTimes.includes(h));

  const submit = () => {
    if (!serviceId) return setError("Selecciona un servicio.");
    if (!time) return setError("Selecciona una hora.");
    if (!name.trim()) return setError("Escribe tu nombre.");
    
    const booking = { id: uid(), serviceId, date, time, clientName: name.trim(), phone: phone.trim(), status: "pendiente", notes: "", paymentMethod: "presencial", paid: false, createdAt: new Date().toISOString() };
    addBooking(booking);
    setConfirmed(booking);
  };

  if (confirmed) {
    return (
      <div style={{ background: "#F7F3E9", border: "1px solid #D7CFBC", borderRadius: 8, padding: 24, textAlign: "center" }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 20 }}>¡Reserva Confirmada!</h2>
        <p style={{ color: "#6B6A5E", margin: "16px 0" }}>Gracias <strong>{confirmed.clientName}</strong>. Cita agendada para el <strong>{formatDateLong(confirmed.date)}</strong> a las <strong>{confirmed.time}</strong>.</p>
        <button onClick={() => setConfirmed(null)} style={{ background: "#56684B", color: "#FFF", border: "none", padding: "10px 16px", borderRadius: 4, cursor: "pointer" }}>Hacer otra reserva</button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, marginBottom: 16 }}>Pedir cita</h2>
      <label style={{ fontSize: 13, color: "#6B6A5E" }}>Servicio</label>
      <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name} — {s.price}€ ({s.duration} min)</option>
        ))}
      </select>

      <label style={{ fontSize: 13, color: "#6B6A5E" }}>Fecha</label>
      <input type="date" value={date} min={todayISO()} onChange={(e) => { setDate(e.target.value); setTime(""); }} />

      <label style={{ fontSize: 13, color: "#6B6A5E" }}>Horas disponibles ({formatDateLong(date)})</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 16px" }}>
        {availableHours.length === 0 ? (
          <p style={{ color: "#A14B3E", fontSize: 13 }}>Sin horas disponibles.</p>
        ) : (
          availableHours.map((h) => (
            <button key={h} onClick={() => setTime(h)} style={{ padding: "8px 12px", border: time === h ? "2px solid #56684B" : "1px solid #D7CFBC", background: time === h ? "#56684B" : "#FFF", color: time === h ? "#FFF" : "#26271F", borderRadius: 4, cursor: "pointer" }}>
              {h}
            </button>
          ))
        )}
      </div>

      <label style={{ fontSize: 13, color: "#6B6A5E" }}>Tu nombre</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ana García" />

      <label style={{ fontSize: 13, color: "#6B6A5E" }}>Teléfono</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="600 000 000" />

      {error && <p style={{ color: "#A14B3E", fontSize: 13 }}>{error}</p>}
      <button onClick={submit} style={{ width: "100%", background: "#56684B", color: "#FFF", border: "none", borderRadius: 6, padding: 14, fontSize: 15, cursor: "pointer", marginTop: 8 }}>Confirmar Cita</button>
    </div>
  );
}

function AgendaTab({ bookings, services, removeBooking, updateBooking }) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const getService = (id) => services.find((s) => s.id === id) || { name: "Consulta", price: 45 };

  if (selectedReceipt) {
    const svc = getService(selectedReceipt.serviceId);
    return (
      <div style={{ background: "#FFF", padding: 32, borderRadius: 8, border: "1px solid #D7CFBC", maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, textAlign: "center", marginBottom: 4 }}>Álex Sánchez Fisioterapia</h2>
        <p style={{ textAlign: "center", color: "#6B6A5E", fontSize: 13, marginBottom: 24 }}>Recibo de Sesión / Comprobante</p>
        
        <div style={{ borderTop: "1px dashed #D7CFBC", borderBottom: "1px dashed #D7CFBC", padding: "16px 0", margin: "16px 0", fontSize: 14 }}>
          <p style={{ margin: "4px 0" }}><strong>Cliente:</strong> {selectedReceipt.clientName}</p>
          <p style={{ margin: "4px 0" }}><strong>Fecha:</strong> {selectedReceipt.date} ({selectedReceipt.time})</p>
          <p style={{ margin: "4px 0" }}><strong>Servicio:</strong> {svc.name}</p>
          <p style={{ margin: "4px 0" }}><strong>Método de Pago:</strong> {selectedReceipt.paymentMethod || "Efectivo / Tarjeta"}</p>
          <p style={{ margin: "4px 0" }}><strong>Estado:</strong> {selectedReceipt.paid ? "PAGADO" : "PENDIENTE DE PAGO"}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: "bold", margin: "20px 0" }}>
          <span>Total:</span>
          <span>{svc.price} €</span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={() => window.print()} style={{ flex: 1, background: "#56684B", color: "#FFF", border: "none", padding: 10, borderRadius: 4, cursor: "pointer" }}>
            Imprimir / PDF
          </button>
          <button onClick={() => setSelectedReceipt(null)} style={{ flex: 1, background: "transparent", border: "1px solid #D7CFBC", padding: 10, borderRadius: 4, cursor: "pointer" }}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, marginBottom: 20 }}>Agenda de Citas y Sesiones</h2>
      {bookings.length === 0 ? (
        <p style={{ color: "#6B6A5E" }}>No hay reservas agendadas.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {bookings.map((b) => {
            const svc = getService(b.serviceId);
            return (
              <div key={b.id} style={{ background: "#FFF", border: "1px solid #D7CFBC", borderRadius: 8, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, margin: 0 }}>{b.clientName} <span style={{ fontSize: 13, color: "#6B6A5E", fontWeight: "normal" }}>({b.phone || "Sin telf"})</span></h3>
                    <p style={{ color: "#56684B", fontSize: 14, margin: "4px 0 0 0" }}>
                      {svc.name} — {b.date} a las {b.time} ({svc.price}€)
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setSelectedReceipt(b)} style={{ background: "#F7F3E9", border: "1px solid #D7CFBC", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                      📄 Recibo
                    </button>
                    <button onClick={() => removeBooking(b.id)} style={{ background: "none", border: "1px solid #A14B3E", color: "#A14B3E", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                      Cancelar
                    </button>
                  </div>
                </div>

                <div style={{ background: "#EDE7D9", padding: 12, borderRadius: 6, marginTop: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: "bold", color: "#6B6A5E", display: "block", marginBottom: 4 }}>
                    Notas de la visita / Tratamiento realizado:
                  </label>
                  <textarea
                    rows={2}
                    value={b.notes || ""}
                    placeholder="Escribe aquí el motivo, molestias, tratamiento aplicado o evolución..."
                    onChange={(e) => updateBooking({ ...b, notes: e.target.value })}
                    style={{ width: "100%", padding: 8, border: "1px solid #D7CFBC", borderRadius: 4, fontSize: 13, resize: "vertical" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, fontSize: 13 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!b.paid}
                        onChange={(e) => updateBooking({ ...b, paid: e.target.checked })}
                      />
                      <span>Cobrado</span>
                    </label>
                    <select
                      value={b.paymentMethod || "presencial"}
                      onChange={(e) => updateBooking({ ...b, paymentMethod: e.target.value })}
                      style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #D7CFBC", borderRadius: 4 }}
                    >
                      <option value="presencial">Presencial (Efectivo/Tarjeta)</option>
                      <option value="bizum">Bizum</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiciosTab({ services, saveService, deleteService }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  const startEdit = (svc) => {
    if (svc) {
      setEditing(svc.id);
      setName(svc.name);
      setPrice(svc.price);
      setDuration(svc.duration);
    } else {
      setEditing("new");
      setName("");
      setPrice("");
      setDuration("50");
    }
  };

  const handleSave = () => {
    if (!name || !price) return;
    saveService({
      id: editing === "new" ? uid() : editing,
      name,
      price: Number(price),
      duration: Number(duration || 50),
    });
    setEditing(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, margin: 0 }}>Gestión de Servicios y Precios</h2>
        {!editing && (
          <button onClick={() => startEdit(null)} style={{ background: "#56684B", color: "#FFF", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>
            + Nuevo Servicio
          </button>
        )}
      </div>

      {editing && (
        <div style={{ background: "#FFF", border: "1px solid #D7CFBC", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, marginTop: 0 }}>{editing === "new" ? "Nuevo Servicio" : "Editar Servicio"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#6B6A5E" }}>Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Fisioterapia" style={{ width: "100%", padding: 8, border: "1px solid #D7CFBC", borderRadius: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#6B6A5E" }}>Precio (€)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="45" style={{ width: "100%", padding: 8, border: "1px solid #D7CFBC", borderRadius: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#6B6A5E" }}>Duración (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="50" style={{ width: "100%", padding: 8, border: "1px solid #D7CFBC", borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={handleSave} style={{ background: "#56684B", color: "#FFF", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Guardar</button>
            <button onClick={() => setEditing(null)} style={{ background: "transparent", border: "1px solid #D7CFBC", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {services.map((s) => (
          <div key={s.id} style={{ background: "#FFF", border: "1px solid #D7CFBC", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16 }}>{s.name}</h4>
              <p style={{ margin: "4px 0 0 0", color: "#6B6A5E", fontSize: 14 }}>{s.price} € — {s.duration} min</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => startEdit(s)} style={{ background: "#F7F3E9", border: "1px solid #D7CFBC", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>Editar</button>
              <button onClick={() => deleteService(s.id)} style={{ background: "none", border: "1px solid #A14B3E", color: "#A14B3E", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorarioTab({ blockedSlots, toggleBlocked }) {
  const [date, setDate] = useState(todayISO());

  return (
    <div>
      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 22, marginBottom: 16 }}>Bloquear Horario</h2>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 8, marginBottom: 16, border: "1px solid #D7CFBC" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {HOURS.map((h) => {
          const isBlocked = blockedSlots.some((s) => s.date === date && s.time === h);
          return (
            <button key={h} onClick={() => toggleBlocked(date, h)} style={{ padding: "10px 14px", border: "none", borderRadius: 4, background: isBlocked ? "#A14B3E" : "#56684B", color: "#FFF", cursor: "pointer" }}>
              {h} {isBlocked ? "(Bloqueado)" : "(Libre)"}
            </button>
          );
        })}
      </div>
    </div>
  );
}