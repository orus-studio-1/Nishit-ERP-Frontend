import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nishit ERP',
  description: 'Nishit Enterprise Resource Planning System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  maxWidth: '480px',
                  padding: '12px 16px',
                  wordBreak: 'break-word',
                },
                error: {
                  duration: 6000,
                  style: {
                    borderLeft: '4px solid #ef4444',
                  },
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                },
                success: {
                  duration: 3500,
                  style: {
                    borderLeft: '4px solid #10b981',
                  },
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff',
                  },
                },
              }}
            />
        </AuthProvider>
      </body>
    </html>
  );
}
