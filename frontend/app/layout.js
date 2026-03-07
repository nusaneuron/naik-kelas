export const metadata = {
  title: 'Naik Kelas',
  description: 'List peserta dari pendaftaran bot Naik Kelas'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, background: '#0b1220', color: '#e5e7eb', fontFamily: 'Inter, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
