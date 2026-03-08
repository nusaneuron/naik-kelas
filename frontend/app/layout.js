import './globals.css';

export const metadata = {
  title: 'Naik Kelas',
  description: 'List peserta dari pendaftaran bot Naik Kelas'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
