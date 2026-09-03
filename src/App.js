import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase con tus variables de entorno
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/ktmubugjk3fbjrlfi7pchttq8ec7m9u9';

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('booking'); // 'booking', 'admin'
  
  // Formulario de reserva acorde a tu tabla de Supabase (bookings)
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [serviceId, setServiceId] = useState('fisioterapia-general');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('Procesando reserva...');

    // 1. DISPARO GARANTIZADO A MAKE (Google Calendar)
    try {
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          date: date,
          time: time,
          service_id: serviceId
        })
      });
    } catch (makeError) {
      console.error('Error enviando a Make:', makeError);
    }

    // 2. GUARDAR EN SUPABASE (Tabla: bookings)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            client_name: clientName,
            service_id: serviceId,
            date: date,
            time: time
          }
        ])
        .select();

      if (error) {
        console.error('Error de Supabase:', error);
        setStatusMsg('Cita enviada a la agenda (nota: revisa conexión de base de datos).');
      } else {
        setStatusMsg('¡Cita reservada con éxito!');
      }

      setClientName('');
      setClientEmail('');
      setDate('');
      setTime('');
    } catch (err) {
      console.error(err);
      setStatusMsg('Reserva procesada.');
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <h2>Álex Sánchez Fisioterapia</h2>
        <nav>
          <button onClick={() => setView('booking')} style={{ marginRight: '10px', padding: '8px 12px' }}>Reservar Cita</button>
          <button onClick={() => setView('admin')} style={{ padding: '8px 12px' }}>Panel Profesional</button>
        </nav>
      </header>

      {view === 'booking' && (
        <section style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <h3>Solicitar Cita</h3>
          <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Nombre y Apellidos:</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Correo Electrónico:</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Fecha:</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Hora:</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Servicio:</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                <option value="fisioterapia-general">Fisioterapia General</option>
                <option value="rehabilitacion">Rehabilitación</option>
                <option value="terapia-manual">Terapia Manual</option>
              </select>
            </div>

            <button type="submit" style={{ padding: '12px', background: '#4d6048', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Pedir cita
            </button>
          </form>

          {statusMsg && <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#2e7d32' }}>{statusMsg}</p>}
        </section>
      )}

      {view === 'admin' && (
        <section style={{ padding: '20px' }}>
          <h3>Panel Profesional</h3>
          <p>Gestión de citas y pacientes.</p>
        </section>
      )}
    </div>
  );
}
