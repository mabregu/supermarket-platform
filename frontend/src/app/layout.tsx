import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PreciosSmart | Comparador de Precios y Carrito Optimizado con IA',
  description: 'Encuentra, compara y optimiza tus compras en supermercados cercanos en tiempo real usando inteligencia artificial y geolocalización PostGIS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
