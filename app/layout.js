import './globals.css';

export const metadata = {
  title: 'Electramo Voorraadportaal',
  description: 'Live voorraad voor klanten van Electramo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
