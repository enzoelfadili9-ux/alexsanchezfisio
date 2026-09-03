import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/ktmubugjk3fbjrlfi7pchttq8ec7m9u9';

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('booking'); // 'booking', 'admin', 'history'
  
  // Formulario de reserva
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [service, setService] = useState('Fisioterapia General');
  const [statusMsg, setStatusMsg] = useState('');

  // Historial y citas para el panel
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función para procesar la reserva e invocar el webhook de Make
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('Procesando reserva...');

    try {
      // 1. Guardar cita en Supabase
      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            patient_name: patientName,
            patient_email: patientEmail,
            date: bookingDate,
            time: bookingTime,
            service: service,
            status: 'confirmed'
          }
        ])
        .select();

      if (error) throw error;

      // 2. Disparar webhook a Make (Google Calendar)
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_email: patientEmail,
          date: bookingDate,
          time: bookingTime,
          service: service
        })
      });

      setStatusMsg('¡Cita reservada con éxito y añadida a Google Calendar!');
      setPatientName('');
      setPatientEmail('');
      setBookingDate('');
      setBookingTime('');
    } catch (err) {
      console.error(err);
      setStatusMsg('Error al procesar la reserva. Inténtalo de nuevo.');
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <h2>Alex Sánchez Fisioterapia</h2>
        <nav>
          <button onClick={() => setView('booking')} style={{ marginRight: '10px', padding: '8px 12px' }}>Reservar Cita</button>
          <button onClick={() => setView('admin')} style={{ padding: '8px 12px' }}>Panel Control</button>
        </nav>
      </header>

      {view === 'booking' && (
        <section style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <h3>Solicitar Cita Online</h3>
          <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Nombre y Apellidos:</label>
              <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Correo Electrónico:</label>
              <input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Fecha:</label>
                <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Hora:</label>
                <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Servicio:</label>
              <select value={service} onChange={(e) => setService(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                <option value="Fisioterapia General">Fisioterapia General</option>
                <option value="Rehabilitación Deportiva">Rehabilitación Deportiva</option>
                <option value="Terapia Manual">Terapia Manual</option>
              </select>
            </div>

            <button type="submit" style={{ padding: '12px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Confirmar Reserva
            </button>
          </form>

          {statusMsg && <p style={{ marginTop: '15px', fontWeight: 'bold', color: statusMsg.includes('Error') ? 'red' : 'green' }}>{statusMsg}</p>}
        </section>
      )}

      {view === 'admin' && (
        <section>
          <h3>Panel Profesional e Historial Clínico</h3>
          <p style={{ color: '#666' }}>Acceso restringido para gestión de pacientes y consultas.</p>
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '6px', marginTop: '10px' }}>
            <h4>Citas Recientes</h4>
            <p>Conectado con Supabase. Haz una reserva en la pestaña anterior para ver la sincronización en vivo.</p>
          </div>
        </section>
      )}
    </div>
  );
}
