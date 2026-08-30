export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px',
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        🪒 Barber Appointment Bot
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        ربات رزرو نوبت آرایشگاه
      </p>
      <a 
        href="https://t.me/BarberAppointmentAppBot"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#0088cc',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          fontWeight: 500,
        }}
      >
        Start Booking on Telegram
      </a>
    </div>
  );
}
