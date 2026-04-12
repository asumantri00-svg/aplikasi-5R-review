import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  BarChart3, 
  Table as TableIcon, 
  Lightbulb, 
  X, 
  Loader2,
  MessageSquare,
  Send,
  Plus,
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AISummary, AuditFinding, AUDIT_TABLE_HEADERS, ChatMessage, AuditFilePart } from './types';
import { analyzeAuditFiles, chatWithAuditData } from './services/aiService';
import { exportToExcel } from './utils/excelExport';
import { extractTextFromPptx } from './utils/pptxParser';
import { extractTextFromPdf } from './utils/pdfParser';
import PPTGenerator from './components/PPTGenerator';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];
const EMPTY_DATA = [
  { name: 'No Data', value: 1 }
];

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AISummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ppt'>('dashboard');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // API key check removed as AI is no longer used
    setApiKeyMissing(false);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    setShowUploadModal(false);
    
    console.log("Processing files:", files.map(f => f.name));
    
    try {
      const parts = await Promise.all(files.map(async (file): Promise<AuditFilePart> => {
        const isPptx = file.name.endsWith('.pptx') || file.name.endsWith('.ppt');
        const isPdf = file.name.endsWith('.pdf');
        
        console.log(`Extracting content from: ${file.name} (type: ${file.type})`);
        
        if (isPptx) {
          const text = await extractTextFromPptx(file);
          console.log(`Extracted ${text.length} characters from PPTX`);
          return { text: `File: ${file.name}\nContent:\n${text}` };
        } else if (isPdf) {
          const text = await extractTextFromPdf(file);
          console.log(`Extracted ${text.length} characters from PDF`);
          return { text: `File: ${file.name}\nContent:\n${text}` };
        } else if (file.type.startsWith('image/')) {
          return new Promise<AuditFilePart>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ 
                inlineData: { 
                  data: base64, 
                  mimeType: file.type 
                } 
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          console.warn(`Unsupported file type: ${file.name}`);
          return { text: `File: ${file.name} (Unsupported type)` };
        }
      }));

      console.log("Processing data...");
      const summary = await analyzeAuditFiles(parts);
      console.log("Analysis complete:", summary);
      
      if (!summary.findings || summary.findings.length === 0) {
        console.warn("No findings detected.");
        setError("Tidak menemukan data temuan audit dalam dokumen tersebut. Pastikan dokumen berisi tabel atau daftar temuan yang jelas.");
      }
      
      setResult(summary);
    } catch (err: any) {
      console.error("Error processing files:", err);
      
      let userFriendlyError = "Gagal memproses dokumen. Pastikan file PDF, PPTX, atau Gambar valid.";
      
      if (err.message?.includes("429") || err.message?.includes("quota")) {
        userFriendlyError = "Batas penggunaan tercapai. Silakan coba lagi nanti.";
      } else {
        userFriendlyError = err.message || userFriendlyError;
      }
      
      setError(userFriendlyError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !result) return;

    const newUserMessage: ChatMessage = { role: 'user', text: chatInput };
    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await chatWithAuditData(updatedHistory, result.findings);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'model', text: `Error: ${err.message || "Sorry, I encountered an error."}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleExport = () => {
    if (result) {
      exportToExcel(result);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-x-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1920")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />
      </div>

      {/* Error Message Banner */}
      {error && (
        <div className="relative z-40 bg-red-50/90 backdrop-blur-md border-b border-red-200 px-8 py-3 flex items-center justify-between text-red-800 text-sm font-medium">
          <div className="flex items-center gap-2">
            <X className="text-red-500 cursor-pointer" size={16} onClick={() => setError(null)} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* API Key Warning Banner Removed */}

      {/* Header */}
      <header className="relative z-30 bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex justify-between items-center sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Dashboard Audit 5R</h1>
        </div>

        <nav className="flex items-center bg-slate-100 p-1 rounded-xl mx-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'dashboard' ? "bg-white text-indigo-600 shadow-sm border border-black" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ppt')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'ppt' ? "bg-white text-indigo-600 shadow-sm border border-black" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Audit 5R
          </button>
        </nav>

        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95"
        >
          <Plus size={18} />
          Input Data
        </button>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto p-8 space-y-8">
        {activeTab === 'dashboard' ? (
          <>
            {/* Data Distribution Section */}
            <section className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 p-8 shadow-xl shadow-slate-200/50 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <BarChart3 size={18} />
                </div>
                <h3 className="font-bold text-slate-800">Distribusi Data</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* By Category - Donut */}
                <div className="space-y-4">
                  <h4 className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Berdasarkan Kategori</h4>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result?.categoryDistribution || EMPTY_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {(result?.categoryDistribution || EMPTY_DATA).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={result ? COLORS[index % COLORS.length] : '#f1f5f9'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                        />
                        {result && <Legend verticalAlign="bottom" height={36} iconType="circle" />}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* By Area - Bar */}
                <div className="space-y-4">
                  <h4 className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Berdasarkan Area</h4>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result?.areaDistribution || [{ name: '', value: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* By PIC - Horizontal Bar */}
                <div className="space-y-4">
                  <h4 className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Berdasarkan PIC</h4>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        layout="vertical" 
                        data={result?.picDistribution || [{ name: '', value: 0 }]}
                        margin={{ left: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={80} tick={{ fill: '#94a3b8' }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" fill="#14b8a6" radius={[0, 6, 6, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* Summary and Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 p-8 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800">Ringkasan Audit 5R 1S</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {result ? result.summaryText : "Unggah data untuk melihat ringkasan eksekutif dari temuan audit."}
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 p-8 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Lightbulb size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800">Wawasan</h3>
                </div>
                <div className="text-slate-600 leading-relaxed text-sm">
                  {result ? (
                    <p>{result.suggestions[0] || "Tidak ada wawasan tersedia."}</p>
                  ) : (
                    <p className="text-slate-400 italic">Tidak ada wawasan tersedia. Silakan unggah dokumen audit.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Table Section */}
            {result && (
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/50 overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <TableIcon size={20} className="text-slate-400" />
                      Temuan Audit Utama
                    </h3>
                    <button 
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                    >
                      <Download size={14} />
                      Ekspor ke Excel
                    </button>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Menampilkan 10 teratas dari {result.findings.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        <th className="px-8 py-5 border-b border-slate-100">NO.</th>
                        <th className="px-8 py-5 border-b border-slate-100">PROBLEM</th>
                        <th className="px-8 py-5 border-b border-slate-100">CATEGORY</th>
                        <th className="px-8 py-5 border-b border-slate-100">AREA</th>
                        <th className="px-8 py-5 border-b border-slate-100">PIC</th>
                        <th className="px-8 py-5 border-b border-slate-100">ROOT CAUSE</th>
                        <th className="px-8 py-5 border-b border-slate-100">ACTION</th>
                        <th className="px-8 py-5 border-b border-slate-100">DUE DATE</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {result.findings.slice(0, 10).map((f, i) => (
                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-8 py-5 font-mono text-xs text-slate-400">{f.no}</td>
                          <td className="px-8 py-5 font-semibold text-slate-700 max-w-xs">{f.problem}</td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg uppercase">
                              {f.category}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-slate-600">{f.area}</td>
                          <td className="px-8 py-5 text-slate-600 font-bold">{f.pic || '-'}</td>
                          <td className="px-8 py-5 text-slate-500 text-xs max-w-xs">{f.rootCause}</td>
                          <td className="px-8 py-5 text-slate-500 text-xs max-w-xs">{f.action}</td>
                          <td className="px-8 py-5 text-slate-400 font-mono text-xs">{f.dueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <PPTGenerator />
        )}
      </main>


      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-xl bg-white/90 backdrop-blur-2xl rounded-[40px] shadow-2xl overflow-hidden border border-white/50"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">Upload Data Audit</h3>
                    <p className="text-sm text-slate-500">Pilih file PDF, PPTX, atau Gambar untuk dianalisis</p>
                  </div>
                  <button onClick={() => setShowUploadModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="relative group">
                  <input 
                    type="file" 
                    multiple 
                    accept=".pdf,.pptx,.ppt,image/*"
                    onChange={onFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-3 border-dashed border-slate-200 rounded-[32px] p-16 flex flex-col items-center justify-center gap-6 group-hover:border-emerald-400 group-hover:bg-emerald-50/30 transition-all">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner">
                      <Upload size={40} />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-700">Tarik file ke sini</p>
                      <p className="text-sm text-slate-400">atau klik untuk memilih file</p>
                    </div>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">File Terpilih ({files.length})</p>
                      <button onClick={() => setFiles([])} className="text-xs font-bold text-red-500 hover:underline">Hapus Semua</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 truncate max-w-[250px]">{file.name}</span>
                              <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                          <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4 shadow-xl shadow-emerald-200"
                >
                  {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                  {isProcessing ? "Sedang Memproses..." : "Mulai Analisis"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Chatbot Removed */}

      {/* Global Processing Loader */}
      {isProcessing && (
        <div className="fixed inset-0 z-[60] bg-white/60 backdrop-blur-2xl flex flex-col items-center justify-center gap-8">
          <div className="relative">
            <div className="w-32 h-32 border-8 border-emerald-100 rounded-full shadow-inner" />
            <div className="w-32 h-32 border-8 border-emerald-600 rounded-full border-t-transparent animate-spin absolute inset-0 shadow-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 size={32} className="text-emerald-600 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Menganalisis Dokumen</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sistem sedang memproses data Anda</p>
          </div>
        </div>
      )}
    </div>
  );
}
