import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/Toast';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';

export const metadata: Metadata = {
  title: 'SideQuest - VIT student errand & tutoring marketplace',
  description: 'Hyperlocal closed task marketplace exclusively for students at Vellore Institute of Technology. Post errands, tutoring, freelancing, and earn credits.',
  themeColor: '#0F172A',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  }
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}>
        <ToastProvider>
          <KeyboardShortcuts />
          <Navbar />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
