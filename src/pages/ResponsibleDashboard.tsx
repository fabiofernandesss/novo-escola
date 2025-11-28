import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, ClockCounterClockwise, ChatCircle, House, SignOut, X } from 'phosphor-react';
import { motion } from 'framer-motion';
import Hls from 'hls.js';

type Student = {
    id: string;
    nome: string;
    foto_url?: string;
    escola_id?: string;
    turma_id?: string;
    serie_id?: string;
    escola?: { nome: string };
    turma?: { nome: string };
    serie?: { nome: string };
};

type Log = {
    id: number;
    nome_aluno: string;
    data_do_log: string;
    event: number;
    url_foto_aluno?: string;
    time: number;
};

type Message = {
    id: string;
    titulo: string;
    descricao: string;
    media_url?: string;
    published_at: string;
    created_at: string;
};

type CameraType = {
    id: string;
    nome: string;
    url_m3u8: string;
    escola_id?: string;
};

const ResponsibleDashboard: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [cameras, setCameras] = useState<CameraType[]>([]);
    const [activeTab, setActiveTab] = useState<'home' | 'cameras' | 'activity' | 'messages'>('home');
    const [loading, setLoading] = useState(true);
    const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
        fetchUserAndStudents();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentData();
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (selectedCamera && videoRef.current) {
            playCamera();
        }
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [selectedCamera]);

    const fetchUserAndStudents = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_uid', user.id)
            .single();

        setCurrentUser(userData);

        if (userData?.whatsapp) {
            const { data: studentsData } = await supabase
                .from('alunos')
                .select('*, escola:escolas(nome), turma:turmas(nome), serie:series(nome)')
                .or(`telefone_responsavel_1.eq.${userData.whatsapp},telefone_responsavel_2.eq.${userData.whatsapp}`);

            setStudents(studentsData || []);
            if (studentsData && studentsData.length > 0) {
                setSelectedStudent(studentsData[0]);
            }
        }
        setLoading(false);
    };

    const fetchStudentData = async () => {
        if (!selectedStudent) return;

        // Fetch logs for this student
        const { data: logsData } = await supabase
            .from('logs')
            .select('*')
            .eq('nome_aluno', selectedStudent.nome)
            .order('data_do_log', { ascending: false })
            .limit(20);
        setLogs(logsData || []);

        // Fetch messages from student's school
        if (selectedStudent.escola_id) {
            const { data: messagesData } = await supabase
                .from('mensagens')
                .select('*')
                .eq('escola_id', selectedStudent.escola_id)
                .order('published_at', { ascending: false })
                .limit(10);
            setMessages(messagesData || []);

            // Fetch cameras from student's school
            const { data: camerasData } = await supabase
                .from('cameras')
                .select('*')
                .eq('escola_id', selectedStudent.escola_id);
            setCameras(camerasData || []);
        }
    };

    const playCamera = () => {
        if (!selectedCamera || !videoRef.current) return;

        const video = videoRef.current;
        let src = selectedCamera.url_m3u8;

        // Use proxy if on HTTPS
        if (window.location.protocol === 'https:' && src.includes('http://78.46.228.35')) {
            if (src.includes(':8001')) {
                src = src.replace('http://78.46.228.35:8001', '/camera-proxy-8001');
            } else if (src.includes(':8002')) {
                src = src.replace('http://78.46.228.35:8002', '/camera-proxy-8002');
            }
        }

        if (Hls.isSupported()) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
            const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.error("Error playing video:", e));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.addEventListener('loadedmetadata', () => {
                video.play();
            });
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const getEventLabel = (event: number) => {
        switch (event) {
            case 0: return 'Entrada';
            case 1: return 'Saída';
            default: return 'Evento';
        }
    };

    const getTodayLogs = () => {
        const today = new Date().toDateString();
        return logs.filter(log => new Date(log.data_do_log).toDateString() === today);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--brand-blue))]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white p-6 rounded-b-3xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Olá, {currentUser?.nome?.split(' ')[0]}!</h1>
                        <p className="text-blue-100 text-sm">Acompanhe seus filhos</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <SignOut size={24} weight="bold" />
                    </button>
                </div>

                {/* Student Selector */}
                {students.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                        {students.map((student) => (
                            <button
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all ${selectedStudent?.id === student.id
                                    ? 'bg-white text-[hsl(var(--brand-blue))]'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                {student.nome.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'home' && selectedStudent && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Student Card */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center gap-4 mb-4">
                                {selectedStudent.foto_url ? (
                                    <img src={selectedStudent.foto_url} alt={selectedStudent.nome} className="w-20 h-20 rounded-full object-cover" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedStudent.nome.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedStudent.nome}</h2>
                                    <p className="text-gray-600">{selectedStudent.escola?.nome || 'Escola não informada'}</p>
                                    <p className="text-sm text-gray-500">{selectedStudent.turma?.nome || ''} - {selectedStudent.serie?.nome || ''}</p>
                                </div>
                            </div>
                        </div>

                        {/* Today's Activity */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Atividade de Hoje</h3>
                            {getTodayLogs().length > 0 ? (
                                <div className="space-y-3">
                                    {getTodayLogs().map((log) => (
                                        <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            {log.url_foto_aluno && (
                                                <img src={log.url_foto_aluno} alt="" className="w-12 h-12 rounded-full object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{getEventLabel(log.event)}</p>
                                                <p className="text-sm text-gray-600">{formatTime(log.data_do_log)}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${log.event === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {getEventLabel(log.event)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">Nenhuma atividade registrada hoje</p>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                                <p className="text-3xl font-bold text-[hsl(var(--brand-blue))]">{logs.length}</p>
                                <p className="text-sm text-gray-600">Registros</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                                <p className="text-3xl font-bold text-[hsl(var(--brand-green))]">{messages.length}</p>
                                <p className="text-sm text-gray-600">Mensagens</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'cameras' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {selectedCamera ? (
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                <div className="p-4 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center">
                                    <h3 className="font-bold">{selectedCamera.nome}</h3>
                                    <button onClick={() => setSelectedCamera(null)} className="p-2 hover:bg-white/20 rounded-full">
                                        <X size={20} weight="bold" />
                                    </button>
                                </div>
                                <video ref={videoRef} className="w-full aspect-video bg-black" controls playsInline />
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-gray-900 px-2">Câmeras da Escola</h2>
                                {cameras.length > 0 ? (
                                    <div className="grid gap-4">
                                        {cameras.map((camera) => (
                                            <button
                                                key={camera.id}
                                                onClick={() => setSelectedCamera(camera)}
                                                className="bg-white rounded-2xl shadow-lg p-4 text-left hover:shadow-xl transition-shadow"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white">
                                                        <Camera size={24} weight="bold" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{camera.nome}</h3>
                                                        <p className="text-sm text-gray-600">Toque para visualizar</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                        <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                                        <p className="text-gray-500">Nenhuma câmera disponível</p>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {activeTab === 'activity' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Histórico de Atividades</h2>
                        {logs.length > 0 ? (
                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <div key={log.id} className="bg-white rounded-2xl shadow-lg p-4">
                                        <div className="flex items-start gap-3">
                                            {log.url_foto_aluno && (
                                                <img src={log.url_foto_aluno} alt="" className="w-16 h-16 rounded-full object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${log.event === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {getEventLabel(log.event)}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-gray-900">{log.nome_aluno}</p>
                                                <p className="text-sm text-gray-600">{formatDate(log.data_do_log)} às {formatTime(log.data_do_log)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <ClockCounterClockwise size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhuma atividade registrada</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'messages' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Mensagens da Escola</h2>
                        {messages.length > 0 ? (
                            <div className="space-y-3">
                                {messages.map((message) => (
                                    <div key={message.id} className="bg-white rounded-2xl shadow-lg p-4">
                                        {message.media_url && (
                                            <img src={message.media_url} alt="" className="w-full h-48 object-cover rounded-xl mb-3" />
                                        )}
                                        <h3 className="font-bold text-gray-900 mb-2">{message.titulo}</h3>
                                        <p className="text-gray-600 text-sm mb-2">{message.descricao}</p>
                                        <p className="text-xs text-gray-500">{formatDate(message.published_at || message.created_at)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <ChatCircle size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhuma mensagem disponível</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
                <div className="flex justify-around items-center p-2">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'home' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <House size={24} weight={activeTab === 'home' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Início</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('cameras')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'cameras' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <Camera size={24} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Câmeras</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'activity' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ClockCounterClockwise size={24} weight={activeTab === 'activity' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Atividades</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'messages' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ChatCircle size={24} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Mensagens</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResponsibleDashboard;
