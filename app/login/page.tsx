import LoginForm from '@/app/components/auth/LoginForm';

export default function LoginPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100 overflow-hidden">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full -ml-12 -mb-12 pointer-events-none"></div>

                <LoginForm />
            </div>
        </main>
    );
}
