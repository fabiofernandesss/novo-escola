import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, SignOut, House, CaretLeft, GraduationCap, Buildings, Notebook, DeviceMobile, Camera, Student } from 'phosphor-react';

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/auth');
                return;
            }

            const { data: userData, error } = await supabase
                .from('usuarios')
                .select('tipo_usuario')
                .eq('auth_uid', user.id)
                .single();

            if (error || userData?.tipo_usuario !== 'admin') {
                console.error('Access denied');
                navigate('/'); // Redirect non-admins
            } else {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [navigate]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--brand-blue))]"></div>
            </div>
        );
    }

    const menuItems = [
        { path: '/admin', label: 'Dashboard', icon: House },
        { path: '/admin/usuarios', label: 'Usuários', icon: Users },
        { path: '/admin/escolas', label: 'Escolas', icon: Buildings },
        { path: '/admin/turmas', label: 'Turmas', icon: Notebook },
        { path: '/admin/series', label: 'Séries', icon: GraduationCap },
        { path: '/admin/alunos', label: 'Alunos', icon: Student },
        { path: '/admin/dispositivos', label: 'Dispositivos', icon: DeviceMobile },
        { path: '/admin/cameras', label: 'Câmeras', icon: Camera },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-lg flex flex-col fixed h-full z-20">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <img src="/img/icone.png" alt="Logo" className="h-8 w-auto" />
                    <span className="font-bold text-gray-800">Admin Panel</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-[hsl(var(--brand-blue))] text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <item.icon size={20} weight={isActive ? 'fill' : 'regular'} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 mb-2"
                    >
                        <CaretLeft size={20} />
                        <span className="font-medium">Voltar ao Site</span>
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"
                    >
                        <SignOut size={20} />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
