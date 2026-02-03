import Sidebar from '@/app/components/Sidebar';
import MobileHeader from '@/app/components/MobileHeader';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-muted/30">
            <Sidebar />
            <MobileHeader />
            <main className="md:ml-64 min-h-screen p-4 md:p-8 transition-all duration-300">
                <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
