// app/layout.tsx
import type { Metadata } from 'next';
// IMPORTANT: Gardez l'import mais avec une gestion d'erreur
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { AuthProvider } from '@/shared/providers/AuthProvider';
import { ThemeProvider } from '@/shared/providers/ThemeProvider';
import { Toaster } from 'sonner';

// Initialisez Inter avec une option de fallback
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  // Ajoutez des fallbacks explicites
  fallback: ['system-ui', 'arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: "Parabellum ERP - Gestion d'entreprise",
  description: "Système de gestion intégré pour votre entreprise",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      {/* Utilisez une classe conditionnelle */}
      <body className={`${inter.className} font-sans antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-right" richColors />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}