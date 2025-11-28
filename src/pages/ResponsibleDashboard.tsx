import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, ClockCounterClockwise, ChatCircle, House, SignOut, X, CaretLeft, CaretRight, Play, User as UserIcon, PencilSimple, ShieldCheck, Trash, Plus } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';

const SUPABASE_URL = 'https://sntyndufbxfzasnqvayc.supabase.co';

type Student = {
    id: string;
    nome: string;
    foto_url?: string;
    escola_id?: string;
    turma_id?: string;
    serie_id?: string;
    matricula?: string;
    data_nascimento?: string;
    sexo?: string;
    whatsapp?: string;
    cidade?: string;
    estado?: string;
    bairro?: string;
    nome_responsavel_1?: string;
    telefone_responsavel_1?: string;
    responsavel_2?: string;
    telefone_responsavel_2?: string;
    escola?: { nome: string; logo_url?: string; suporte?: string };
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
    media_bucket?: string;
    published_at: string;
    created_at: string;
    tipo?: string;
    escola?: { nome: string };
    created_by?: string;
};

type CameraType = {
    id: string;
    nome: string;
    url_m3u8: string;
    escola_id?: string;
};

type BuscaSeguraRequest = {
    id: string;
    nome_buscador: string;
    doc_buscador: string;
    foto_buscador_url: string;
    video_solicitante_url: string;
    status: 'pendente' | 'aprovada' | 'rejeitada' | 'realizada';
    aluno_id: string;
    criado_em: string;
    aluno?: { nome: string; turma?: { nome: string } };
};

const ResponsibleDashboard: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [videoMessages, setVideoMessages] = useState<Message[]>([]);
    const [cameras, setCameras] = useState<CameraType[]>([]);
    const [camerasLoading, setCamerasLoading] = useState(false);
    const [buscaSeguraRequests, setBuscaSeguraRequests] = useState<BuscaSeguraRequest[]>([]);
    const [selectedBuscaSegura, setSelectedBuscaSegura] = useState<BuscaSeguraRequest | null>(null);
    const [showBuscaSeguraModal, setShowBuscaSeguraModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'cameras' | 'activity' | 'messages' | 'busca-segura'>('home');
    const [loading, setLoading] = useState(true);
    const [storyModal, setStoryModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
    const [showStudentProfile, setShowStudentProfile] = useState(false);
    const [showUserProfile, setShowUserProfile] = useState(false);
    const [showSchoolInfo, setShowSchoolInfo] = useState(false);
    const [editingName, setEditingName] = useState('');

    // Busca Segura State
    const [isRecording, setIsRecording] = useState(false);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [newRequest, setNewRequest] = useState({
        nome_buscador: '',
        doc_buscador: '',
        foto_buscador_file: null as File | null,
        aluno_id: ''
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingInterval = useRef<any>(null);
    const cameraRefs = useRef<{ [key: string]: { video: HTMLVideoElement | null; hls: Hls | null } }>({});
    const cameraInterval = useRef<any>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchUserAndStudents();
        return () => {
            if (cameraInterval.current) clearInterval(cameraInterval.current);
        };
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentData();
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (activeTab === 'cameras' && selectedStudent) {
            fetchCameras();
            cameraInterval.current = setInterval(fetchCameras, 30000);
        } else if (activeTab === 'busca-segura') {
            fetchBuscaSeguraRequests();
        } else {
            if (cameraInterval.current) clearInterval(cameraInterval.current);
        }
        return () => {
            if (cameraInterval.current) clearInterval(cameraInterval.current);
        };
    }, [activeTab, selectedStudent]);

    const getMediaUrl = (mediaUrl?: string, bucket?: string) => {
        if (!mediaUrl) return '';
        if (mediaUrl.startsWith('http')) return mediaUrl;
        return `${SUPABASE_URL}/storage/v1/object/public/${bucket || 'mensagens-media'}/${mediaUrl}`;
    };

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
        setEditingName(userData?.nome || '');

        if (userData?.whatsapp) {
            const cleanPhone = userData.whatsapp.replace(/\D/g, '');

            const { data: studentsData } = await supabase
                .from('alunos')
                .select('*, escola:escolas(nome, logo_url, suporte), turma:turmas(nome), serie:series(nome)');

            const matchedStudents = studentsData?.filter(student => {
                const phone1 = student.telefone_responsavel_1?.replace(/\D/g, '') || '';
                const phone2 = student.telefone_responsavel_2?.replace(/\D/g, '') || '';
                return phone1 === cleanPhone || phone2 === cleanPhone;
            }) || [];

            setStudents(matchedStudents);
            if (matchedStudents.length > 0) {
                setSelectedStudent(matchedStudents[0]);
                fetchAllLogs(matchedStudents);
            }
        }
        setLoading(false);
    };

    const fetchAllLogs = async (studentsList: Student[]) => {
        const studentNames = studentsList.map(s => s.nome);
        const { data: logsData } = await supabase
            .from('logs')
            .select('*')
            .in('nome_aluno', studentNames)
            .order('data_do_log', { ascending: false })
            .limit(50);
        setLogs(logsData || []);
    };

    const fetchCameras = async () => {
        if (!selectedStudent?.escola_id) return;

        setCamerasLoading(true);

        // Cleanup existing HLS instances
        Object.values(cameraRefs.current).forEach(({ hls }) => {
            if (hls) {
                hls.destroy();
            }
        });
        cameraRefs.current = {};

        const { data: camerasData } = await supabase
            .from('cameras')
            .select('*')
            .eq('escola_id', selectedStudent.escola_id);

        setCameras(camerasData || []);
        setCamerasLoading(false);
    };

    const fetchBuscaSeguraRequests = async () => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('busca_segura')
            .select('*')
            .eq('solicitante', currentUser.id)
            .order('criado_em', { ascending: false });

        if (error) {
            console.error('Error fetching requests:', error);
        } else {
            setBuscaSeguraRequests(data || []);
        }
    };

    const handleDeleteBuscaSegura = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;

        const { error } = await supabase
            .from('busca_segura')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao excluir solicitação.');
        } else {
            setBuscaSeguraRequests(prev => prev.filter(req => req.id !== id));
        }
    };

    const fetchStudentData = async () => {
        if (!selectedStudent) return;

        if (selectedStudent.escola_id) {
            const { data: messagesData } = await supabase
                .from('mensagens')
                .select('*, escola:escolas(nome)')
                .eq('escola_id', selectedStudent.escola_id)
                .order('published_at', { ascending: false })
                .limit(20);
            setMessages(messagesData || []);

            const videos = messagesData?.filter(m => m.tipo?.includes('video')) || [];
            setVideoMessages(videos);
        }
    };

    const playCamera = (cameraId: string, url: string, videoElement: HTMLVideoElement) => {
        let src = url;

        if (window.location.protocol === 'https:' && src.includes('http://78.46.228.35')) {
            if (src.includes(':8001')) {
                src = src.replace('http://78.46.228.35:8001', '/camera-proxy-8001');
            } else if (src.includes(':8002')) {
                src = src.replace('http://78.46.228.35:8002', '/camera-proxy-8002');
            }
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            cameraRefs.current[cameraId] = { video: videoElement, hls };
            hls.loadSource(src);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play().catch(e => console.error("Error playing:", e));
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = src;
            videoElement.addEventListener('loadedmetadata', () => {
                videoElement.play();
            });
        }
    };


    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !currentUser) return;

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        setLoading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('perfil-fotos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('perfil-fotos')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ foto_perfil: publicUrl })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            setCurrentUser({ ...currentUser, foto_perfil: publicUrl });
            alert('Foto de perfil atualizada!');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Erro ao atualizar foto de perfil.');
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true;
                await videoRef.current.play().catch(e => console.error("Error playing preview:", e));
            }

            // Prefer MP4, fallback to WebM
            let mimeType = 'video/webm';
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const type = mediaRecorder.mimeType || mimeType;
                const blob = new Blob(chunks, { type: type.split(';')[0] });
                const url = URL.createObjectURL(blob);
                setVideoPreview(url);
                setVideoBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            setRecordingTime(0);

            if (recordingInterval.current) clearInterval(recordingInterval.current);
            recordingInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Erro ao acessar a câmera. Verifique as permissões.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingInterval.current) clearInterval(recordingInterval.current);
        }
    };

    const handleCreateBuscaSegura = async () => {
        if (!newRequest.nome_buscador || !newRequest.doc_buscador || !newRequest.aluno_id || !newRequest.foto_buscador_file || !videoBlob) {
            alert('Por favor, preencha todos os campos, adicione a foto e grave o vídeo.');
            return;
        }

        setLoading(true);
        try {
            // Upload Photo
            const photoFile = newRequest.foto_buscador_file;
            const photoExt = photoFile.name.split('.').pop();
            const photoPath = `busca-segura/fotos/${Date.now()}.${photoExt}`;

            const { error: photoError } = await supabase.storage
                .from('mensagens-media')
                .upload(photoPath, photoFile);

            if (photoError) throw photoError;

            const { data: { publicUrl: photoUrl } } = supabase.storage
                .from('mensagens-media')
                .getPublicUrl(photoPath);

            // Upload Video
            // Force .mp4 extension to avoid mime type issues with Supabase
            const videoExt = 'mp4';
            const videoPath = `busca-segura/videos/${Date.now()}.${videoExt}`;

            const { error: videoError } = await supabase.storage
                .from('mensagens-media')
                .upload(videoPath, videoBlob);

            if (videoError) throw videoError;

            const { data: { publicUrl: videoUrl } } = supabase.storage
                .from('mensagens-media')
                .getPublicUrl(videoPath);

            // Create Record
            const { error: dbError } = await supabase
                .from('busca_segura')
                .insert({
                    nome_buscador: newRequest.nome_buscador,
                    doc_buscador: newRequest.doc_buscador,
                    foto_buscador_url: photoUrl,
                    video_solicitante_url: videoUrl,
                    aluno_id: newRequest.aluno_id,
                    nome_solicitante: currentUser.nome,
                    solicitante: currentUser.id,
                    status: 'pendente'
                });

            if (dbError) throw dbError;

            alert('Solicitação criada com sucesso!');
            setShowBuscaSeguraModal(false);
            setNewRequest({
                nome_buscador: '',
                doc_buscador: '',
                foto_buscador_file: null,
                aluno_id: ''
            });
            setVideoPreview(null);
            setVideoBlob(null);
            fetchBuscaSeguraRequests();

        } catch (error) {
            console.error('Error creating request:', error);
            alert('Erro ao criar solicitação: ' + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!currentUser) return;

        const { error } = await supabase
            .from('usuarios')
            .update({ nome: editingName })
            .eq('id', currentUser.id);

        if (!error) {
            setCurrentUser({ ...currentUser, nome: editingName });
            alert('Perfil atualizado com sucesso!');
        } else {
            alert('Erro ao atualizar perfil.');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const handleTabChange = (tab: 'home' | 'cameras' | 'activity' | 'messages' | 'busca-segura') => {
        // If leaving logs tab and no student selected, select the first one
        if (activeTab === 'activity' && tab !== 'activity' && !selectedStudent && students.length > 0) {
            setSelectedStudent(students[0]);
        }

        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Force camera refresh when switching to cameras tab
        if (tab === 'cameras') {
            setTimeout(() => fetchCameras(), 100);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
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
        return logs.filter(log => {
            const isToday = new Date(log.data_do_log).toDateString() === today;
            const isSelectedStudent = selectedStudent ? log.nome_aluno === selectedStudent.nome : true;
            return isToday && isSelectedStudent;
        });
    };

    const openStory = (index: number) => {
        setStoryModal({ open: true, index });
    };

    const nextStory = () => {
        if (storyModal.index < videoMessages.length - 1) {
            setStoryModal({ ...storyModal, index: storyModal.index + 1 });
        }
    };

    const prevStory = () => {
        if (storyModal.index > 0) {
            setStoryModal({ ...storyModal, index: storyModal.index - 1 });
        }
    };

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age} anos`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--brand-blue))]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20 md:pb-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Olá, {currentUser?.nome?.split(' ')[0]}!</h1>
                            <p className="text-blue-100 text-sm">Acompanhe seus filhos</p>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={() => handleTabChange('home')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'home' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <House size={20} weight={activeTab === 'home' ? 'fill' : 'regular'} />
                                <span className="font-medium">Início</span>
                            </button>
                            <button
                                onClick={() => setShowSchoolInfo(true)}
                                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors font-bold text-lg overflow-hidden"
                            >
                                {selectedStudent?.escola?.logo_url ? (
                                    <img src={selectedStudent.escola.logo_url} alt="Escola" className="w-full h-full object-cover" />
                                ) : (
                                    <House size={24} weight="fill" />
                                )}
                            </button>

                            <button
                                onClick={() => handleTabChange('cameras')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'cameras' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <Camera size={20} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                                <span className="font-medium">Câmeras</span>
                            </button>
                            <button
                                onClick={() => handleTabChange('activity')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'activity' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <ClockCounterClockwise size={20} weight={activeTab === 'activity' ? 'fill' : 'regular'} />
                                <span className="font-medium">Logs</span>
                            </button>
                            <button
                                onClick={() => handleTabChange('messages')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'messages' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <ChatCircle size={20} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                                <span className="font-medium">Mensagens</span>
                            </button>


                            <button
                                onClick={() => setShowUserProfile(true)}
                                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors font-bold text-lg overflow-hidden"
                            >
                                {currentUser?.foto_perfil ? (
                                    <img src={currentUser.foto_perfil} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    currentUser?.nome?.charAt(0)
                                )}
                            </button>
                        </div>

                        {/* Mobile Header Icons */}
                        <div className="flex items-center gap-3 md:hidden">
                            <button
                                onClick={() => setShowSchoolInfo(true)}
                                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors font-bold text-lg overflow-hidden"
                            >
                                {selectedStudent?.escola?.logo_url ? (
                                    <img src={selectedStudent.escola.logo_url} alt="Escola" className="w-full h-full object-cover" />
                                ) : (
                                    <House size={24} weight="fill" />
                                )}
                            </button>

                            <button
                                onClick={() => setShowUserProfile(true)}
                                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors font-bold text-lg overflow-hidden"
                            >
                                {currentUser?.foto_perfil ? (
                                    <img src={currentUser.foto_perfil} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    currentUser?.nome?.charAt(0)
                                )}
                            </button>
                        </div>
                    </div>

                    {students.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 pt-4 -mx-2 px-2">
                            {students.map((student) => (
                                <button
                                    key={student.id}
                                    onClick={() => {
                                        if (activeTab === 'activity') {
                                            if (selectedStudent?.id === student.id) {
                                                setSelectedStudent(null);
                                            } else {
                                                setSelectedStudent(student);
                                            }
                                        } else {
                                            setSelectedStudent(student);
                                        }
                                    }}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedStudent?.id === student.id
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
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-4">
                {activeTab === 'home' && (
                    selectedStudent ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            {/* Quick Actions */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <button
                                    onClick={() => handleTabChange('busca-segura')}
                                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 whitespace-nowrap active:scale-95 transition-transform"
                                >
                                    <ShieldCheck size={18} className="text-[hsl(var(--brand-blue))]" weight="fill" />
                                    <span className="text-sm font-medium text-gray-700">Busca Segura</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('cameras')}
                                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 whitespace-nowrap active:scale-95 transition-transform"
                                >
                                    <Camera size={18} className="text-[hsl(var(--brand-blue))]" weight="fill" />
                                    <span className="text-sm font-medium text-gray-700">Câmeras</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('activity')}
                                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 whitespace-nowrap active:scale-95 transition-transform"
                                >
                                    <ClockCounterClockwise size={18} className="text-[hsl(var(--brand-blue))]" weight="fill" />
                                    <span className="text-sm font-medium text-gray-700">Atividades</span>
                                </button>
                            </div>

                            {/* Instagram-style Stories */}
                            {videoMessages.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {videoMessages.map((msg, idx) => (
                                        <button
                                            key={msg.id}
                                            onClick={() => openStory(idx)}
                                            className="flex-shrink-0"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 p-0.5">
                                                <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden relative">
                                                    {msg.media_url ? (
                                                        <video
                                                            src={getMediaUrl(msg.media_url, msg.media_bucket)}
                                                            className="w-full h-full object-cover rounded-full"
                                                            muted
                                                            playsInline
                                                            preload="metadata"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                            <Play size={20} weight="fill" className="text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Student Card */}
                            <div
                                onClick={() => setShowStudentProfile(true)}
                                className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer active:scale-98 transition-transform relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <UserIcon size={120} weight="fill" />
                                </div>
                                <div className="flex items-center gap-4 relative z-10">
                                    {selectedStudent.foto_url ? (
                                        <img src={selectedStudent.foto_url} alt={selectedStudent.nome} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-sm">
                                            {selectedStudent.nome.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-bold text-gray-900 truncate">{selectedStudent.nome}</h2>
                                        <p className="text-gray-600 text-sm truncate">{selectedStudent.escola?.nome || 'Escola não informada'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium truncate">
                                                {selectedStudent.turma?.nome || 'Turma -'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-md font-medium truncate">
                                                {selectedStudent.serie?.nome || 'Série -'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded-full text-gray-400">
                                        <CaretRight size={24} weight="bold" />
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

                            {/* Stats */}
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
                    ) : null)}

                {activeTab === 'cameras' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Câmeras da Escola</h2>
                        {camerasLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--brand-blue))]"></div>
                            </div>
                        ) : cameras.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cameras.map((camera) => (
                                    <div key={camera.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                        <div className="p-3 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white">
                                            <h3 className="font-bold text-sm">{camera.nome}</h3>
                                        </div>
                                        <video
                                            ref={(el) => {
                                                if (el && !cameraRefs.current[camera.id]) {
                                                    playCamera(camera.id, camera.url_m3u8, el);
                                                }
                                            }}
                                            className="w-full aspect-video bg-black"
                                            playsInline
                                            muted
                                            autoPlay
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhuma câmera disponível</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'activity' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Histórico de Logs</h2>
                        {logs.filter(log => !selectedStudent || log.nome_aluno === selectedStudent.nome).length > 0 ? (
                            <div className="space-y-3">
                                {logs
                                    .filter(log => !selectedStudent || log.nome_aluno === selectedStudent.nome)
                                    .map((log) => (
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
                                <p className="text-gray-500">Nenhum log registrado</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'messages' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Mensagens da Escola</h2>
                        {messages.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {messages.map((message) => (
                                    <div key={message.id} className="bg-white rounded-2xl shadow-lg p-4">
                                        {message.media_url && (
                                            message.tipo?.includes('video') ? (
                                                <video
                                                    src={getMediaUrl(message.media_url, message.media_bucket)}
                                                    controls
                                                    className="w-full h-48 object-cover rounded-xl mb-3"
                                                    playsInline
                                                />
                                            ) : (
                                                <img
                                                    src={getMediaUrl(message.media_url, message.media_bucket)}
                                                    alt=""
                                                    className="w-full h-48 object-cover rounded-xl mb-3"
                                                />
                                            )
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

                {activeTab === 'busca-segura' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-xl font-bold text-gray-900">Busca Segura</h2>
                            <button
                                onClick={() => setShowBuscaSeguraModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <Plus size={20} weight="bold" />
                                Nova Solicitação
                            </button>
                        </div>

                        {buscaSeguraRequests.length > 0 ? (
                            <div className="space-y-4">
                                {buscaSeguraRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        onClick={() => setSelectedBuscaSegura(req)}
                                        className="bg-white rounded-2xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow"
                                    >
                                        <div className="flex items-start gap-4">
                                            {req.foto_buscador_url ? (
                                                <img src={req.foto_buscador_url} alt={req.nome_buscador} className="w-20 h-20 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center">
                                                    <UserIcon size={32} className="text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-gray-900">{req.nome_buscador}</h3>
                                                        <p className="text-sm text-gray-600">Doc: {req.doc_buscador}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'aprovada' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'rejeitada' ? 'bg-red-100 text-red-700' :
                                                            req.status === 'realizada' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {req.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Aluno: <span className="font-medium">{students.find(s => s.id === req.aluno_id)?.nome || 'Aluno não encontrado'}</span>
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Solicitado em {new Date(req.criado_em).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteBuscaSegura(req.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <ShieldCheck size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhuma solicitação de busca segura encontrada.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Student Profile Modal */}
            <AnimatePresence>
                {showStudentProfile && selectedStudent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowStudentProfile(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center">
                                <h3 className="text-xl font-bold">Ficha do Aluno</h3>
                                <button onClick={() => setShowStudentProfile(false)}>
                                    <X size={28} weight="bold" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-4">
                                    {selectedStudent.foto_url ? (
                                        <img src={selectedStudent.foto_url} alt={selectedStudent.nome} className="w-24 h-24 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-3xl font-bold">
                                            {selectedStudent.nome.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-2xl font-bold text-gray-900">{selectedStudent.nome}</h4>
                                        <p className="text-gray-600">{selectedStudent.matricula || 'Matrícula não informada'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Data de Nascimento</p>
                                        <p className="font-medium text-gray-900">{formatDate(selectedStudent.data_nascimento || '')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Idade</p>
                                        <p className="font-medium text-gray-900">{calculateAge(selectedStudent.data_nascimento)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Sexo</p>
                                        <p className="font-medium text-gray-900">{selectedStudent.sexo || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">WhatsApp</p>
                                        <p className="font-medium text-gray-900">{selectedStudent.whatsapp || '-'}</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h5 className="font-bold text-gray-900 mb-3">Informações Escolares</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Escola</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.escola?.nome || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Turma</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.turma?.nome || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-500 mb-1">Série</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.serie?.nome || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h5 className="font-bold text-gray-900 mb-3">Endereço</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Cidade</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.cidade || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Estado</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.estado || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-500 mb-1">Bairro</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.bairro || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h5 className="font-bold text-gray-900 mb-3">Responsáveis</h5>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Responsável 1</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.nome_responsavel_1 || '-'}</p>
                                            <p className="text-sm text-gray-600">{selectedStudent.telefone_responsavel_1 || '-'}</p>
                                        </div>
                                        {selectedStudent.responsavel_2 && (
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Responsável 2</p>
                                                <p className="font-medium text-gray-900">{selectedStudent.responsavel_2}</p>
                                                <p className="text-sm text-gray-600">{selectedStudent.telefone_responsavel_2 || '-'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User Profile Modal */}
            <AnimatePresence>
                {showUserProfile && currentUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowUserProfile(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center">
                                <h3 className="text-xl font-bold">Meu Perfil</h3>
                                <button onClick={() => setShowUserProfile(false)}>
                                    <X size={28} weight="bold" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex justify-center">
                                    <div className="relative">
                                        {currentUser.foto_perfil ? (
                                            <img
                                                src={currentUser.foto_perfil}
                                                alt="Perfil"
                                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-lg">
                                                {currentUser.nome?.charAt(0)}
                                            </div>
                                        )}
                                        <label
                                            htmlFor="photo-upload"
                                            className="absolute bottom-0 right-0 bg-white text-[hsl(var(--brand-blue))] p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <Camera size={20} weight="fill" />
                                            <input
                                                id="photo-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                        <div className="relative">
                                            <input
                                                ref={nameInputRef}
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent"
                                            />
                                            <button
                                                onClick={() => nameInputRef.current?.focus()}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                type="button"
                                            >
                                                <PencilSimple size={20} />
                                            </button>
                                        </div>
                                    </div>



                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email / Login</label>
                                        <input
                                            type="text"
                                            value={currentUser.email || currentUser.login || ''}
                                            disabled
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <button
                                        onClick={handleUpdateProfile}
                                        className="w-full py-3 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
                                    >
                                        Salvar Alterações
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <SignOut size={20} weight="bold" />
                                        Sair da Conta
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* School Info Modal */}
            <AnimatePresence>
                {showSchoolInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowSchoolInfo(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center">
                                <h3 className="text-xl font-bold">Informações da Escola</h3>
                                <button onClick={() => setShowSchoolInfo(false)}>
                                    <X size={28} weight="bold" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6 flex flex-col items-center text-center">
                                {selectedStudent?.escola?.logo_url ? (
                                    <img
                                        src={selectedStudent.escola.logo_url}
                                        alt="Logo Escola"
                                        className="w-32 h-32 object-contain"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                        <House size={48} weight="fill" />
                                    </div>
                                )}

                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {selectedStudent?.escola?.nome || 'Escola'}
                                    </h2>
                                    <p className="text-gray-500 mt-1">
                                        Entre em contato com o suporte para mais informações.
                                    </p>
                                </div>

                                {selectedStudent?.escola?.suporte && (
                                    <a
                                        href={`https://wa.me/${selectedStudent.escola.suporte.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
                                    >
                                        <ChatCircle size={24} weight="fill" />
                                        Falar no WhatsApp
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Modal */}
            <AnimatePresence>
                {storyModal.open && videoMessages[storyModal.index] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
                    >
                        <button
                            onClick={() => setStoryModal({ open: false, index: 0 })}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
                        >
                            <X size={24} weight="bold" />
                        </button>

                        {storyModal.index > 0 && (
                            <button
                                onClick={prevStory}
                                className="absolute left-4 z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white"
                            >
                                <CaretLeft size={32} weight="bold" />
                            </button>
                        )}

                        {storyModal.index < videoMessages.length - 1 && (
                            <button
                                onClick={nextStory}
                                className="absolute right-4 z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white"
                            >
                                <CaretRight size={32} weight="bold" />
                            </button>
                        )}

                        <div className="max-w-lg w-full h-full flex flex-col">
                            <div className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                    {videoMessages[storyModal.index].escola?.nome?.charAt(0) || 'E'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold">{videoMessages[storyModal.index].escola?.nome || 'Escola'}</p>
                                    <p className="text-white/70 text-sm">{formatDate(videoMessages[storyModal.index].published_at || videoMessages[storyModal.index].created_at)}</p>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center">
                                {videoMessages[storyModal.index].media_url && (
                                    <video
                                        key={videoMessages[storyModal.index].id}
                                        src={getMediaUrl(videoMessages[storyModal.index].media_url, videoMessages[storyModal.index].media_bucket)}
                                        controls
                                        autoPlay
                                        className="max-h-full max-w-full"
                                        playsInline
                                    />
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="text-white font-bold text-lg mb-2">{videoMessages[storyModal.index].titulo}</h3>
                                <p className="text-white/90 text-sm">{videoMessages[storyModal.index].descricao}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Navigation (Mobile Only) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden">
                <div className="flex justify-around items-center p-2">
                    <button
                        onClick={() => handleTabChange('home')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'home' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <House size={24} weight={activeTab === 'home' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Início</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('cameras')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'cameras' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <Camera size={24} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Câmeras</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('activity')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'activity' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ClockCounterClockwise size={24} weight={activeTab === 'activity' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Logs</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('messages')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'messages' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ChatCircle size={24} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Mensagens</span>
                    </button>

                </div>
            </div>

            {/* Busca Segura Modal */}
            <AnimatePresence>
                {showBuscaSeguraModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center rounded-t-2xl">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <ShieldCheck size={24} weight="bold" />
                                    Nova Solicitação de Busca Segura
                                </h3>
                                <button onClick={() => setShowBuscaSeguraModal(false)}>
                                    <X size={28} weight="bold" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Aluno</label>
                                            <select
                                                value={newRequest.aluno_id}
                                                onChange={(e) => setNewRequest({ ...newRequest, aluno_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none transition-all"
                                            >
                                                <option value="">Selecione...</option>
                                                {students.map(student => (
                                                    <option key={student.id} value={student.id}>{student.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Buscador</label>
                                            <input
                                                type="text"
                                                value={newRequest.nome_buscador}
                                                onChange={(e) => setNewRequest({ ...newRequest, nome_buscador: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none transition-all"
                                                placeholder="Nome completo de quem vai buscar"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Documento (RG/CPF)</label>
                                            <input
                                                type="text"
                                                value={newRequest.doc_buscador}
                                                onChange={(e) => setNewRequest({ ...newRequest, doc_buscador: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none transition-all"
                                                placeholder="Número do documento"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Buscador</label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => e.target.files && setNewRequest({ ...newRequest, foto_buscador_file: e.target.files[0] })}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                {newRequest.foto_buscador_file ? (
                                                    <div className="flex items-center justify-center gap-2 text-green-600">
                                                        <UserIcon size={24} />
                                                        <span className="font-medium">{newRequest.foto_buscador_file.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-500">
                                                        <Camera size={32} className="mx-auto mb-2" />
                                                        <span className="text-sm">Clique para enviar foto</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vídeo de Autorização (Obrigatório)</label>
                                        <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
                                            {videoPreview ? (
                                                <video src={videoPreview} controls className="w-full h-full object-contain" />
                                            ) : (
                                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                            )}

                                            {isRecording && (
                                                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            {!isRecording && !videoPreview && (
                                                <button
                                                    onClick={startRecording}
                                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <div className="w-4 h-4 bg-white rounded-full"></div>
                                                    Gravar Vídeo
                                                </button>
                                            )}

                                            {isRecording && (
                                                <button
                                                    onClick={stopRecording}
                                                    className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                                                    Parar Gravação
                                                </button>
                                            )}

                                            {videoPreview && (
                                                <button
                                                    onClick={() => {
                                                        setVideoPreview(null);
                                                        setVideoBlob(null);
                                                        startRecording();
                                                    }}
                                                    className="flex-1 py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <ClockCounterClockwise size={20} weight="bold" />
                                                    Regravar
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 text-center">
                                            Grave um vídeo de 5 a 15 segundos confirmando a autorização de busca.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowBuscaSeguraModal(false)}
                                        className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateBuscaSegura}
                                        disabled={loading || !videoBlob}
                                        className="px-6 py-2 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <ShieldCheck size={20} weight="bold" />}
                                        Criar Solicitação
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Busca Segura Details Modal */}
            <AnimatePresence>
                {selectedBuscaSegura && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setSelectedBuscaSegura(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <ShieldCheck size={24} weight="bold" />
                                    Detalhes da Solicitação
                                </h3>
                                <button onClick={() => setSelectedBuscaSegura(null)}>
                                    <X size={28} weight="bold" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center text-center">
                                    {selectedBuscaSegura.foto_buscador_url ? (
                                        <img src={selectedBuscaSegura.foto_buscador_url} alt={selectedBuscaSegura.nome_buscador} className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-lg mb-4" />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                                            <UserIcon size={64} weight="fill" />
                                        </div>
                                    )}
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedBuscaSegura.nome_buscador}</h2>
                                    <p className="text-gray-500">Doc: {selectedBuscaSegura.doc_buscador}</p>
                                    <div className={`mt-2 px-4 py-1 rounded-full text-sm font-bold inline-block ${selectedBuscaSegura.status === 'aprovada' ? 'bg-green-100 text-green-700' :
                                            selectedBuscaSegura.status === 'rejeitada' ? 'bg-red-100 text-red-700' :
                                                selectedBuscaSegura.status === 'realizada' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {selectedBuscaSegura.status.toUpperCase()}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Aluno</p>
                                        <p className="text-gray-900 font-medium">{students.find(s => s.id === selectedBuscaSegura.aluno_id)?.nome || 'Aluno não encontrado'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Solicitado em</p>
                                        <p className="text-gray-900 font-medium">{new Date(selectedBuscaSegura.criado_em).toLocaleString()}</p>
                                    </div>

                                    {selectedBuscaSegura.video_solicitante_url && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 mb-2">Vídeo de Autorização</p>
                                            <div className="bg-black rounded-xl overflow-hidden aspect-video">
                                                <video
                                                    src={selectedBuscaSegura.video_solicitante_url}
                                                    controls
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ResponsibleDashboard;
