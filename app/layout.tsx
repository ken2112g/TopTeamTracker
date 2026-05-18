import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import ToastContainer from '@/components/ui/ToastContainer';
import AddListingModal from '@/components/modals/AddListingModal';

export const metadata: Metadata = {
  title: 'TopTeamTracker — Track · Compare · Win',
  description: 'Theo dõi và phân tích sản phẩm Etsy theo thời gian'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        <ToastContainer />
        <AddListingModal />
      </body>
    </html>
  );
}
