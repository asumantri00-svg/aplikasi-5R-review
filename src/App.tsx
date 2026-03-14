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

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      setApiKeyMissing(true);
    }
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
    
    try {
      const parts = await Promise.all(files.map(async (file): Promise<AuditFilePart> => {
        const isPptx = file.name.endsWith('.pptx') || file.name.endsWith('.ppt');
        
        if (isPptx) {
          const text = await extractTextFromPptx(file);
          return { text: `File: ${file.name}\nContent:\n${text}` };
        } else {
          return new Promise<AuditFilePart>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ 
                inlineData: { 
                  data: base64, 
                  mimeType: file.type || 'application/pdf' 
                } 
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      }));

      const summary = await analyzeAuditFiles(parts);
      setResult(summary);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process documents. Please ensure they are valid PDF or PPTX files.");
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
      exportToExcel(result.findings);
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

      {/* API Key Warning Banner */}
      {apiKeyMissing && (
        <div className="relative z-40 bg-amber-50/90 backdrop-blur-md border-b border-amber-200 px-8 py-3 flex items-center justify-between text-amber-800 text-sm font-medium">
          <div className="flex items-center gap-2">
            <X className="text-amber-500" size={16} />
            <span>API Key Gemini belum dikonfigurasi. Silakan tambahkan GEMINI_API_KEY di pengaturan rahasia (Secrets).</span>
          </div>
          <a 
            href="https://ai.google.dev/gemini-api/docs/api-key" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-amber-700 underline hover:text-amber-900"
          >
            Dapatkan API Key
          </a>
        </div>
      )}

      {/* Header */}
      <header className="relative z-30 bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex justify-between items-center sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Dashboard Audit 5R</h1>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95"
        >
          <Plus size={18} />
          Input Data
        </button>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto p-8 space-y-8">
        {/* Data Distribution Section */}
        <section className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 p-8 shadow-xl shadow-slate-200/50 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
            <h3 className="font-bold text-slate-800">Data Distribution</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* By Category - Donut */}
            <div className="space-y-4">
              <h4 className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Category</h4>
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
              <h4 className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Area</h4>
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
              <h4 className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">By PIC</h4>
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
              <h3 className="font-bold text-slate-800">Summary Audit 5R 1S</h3>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              {result ? result.summaryText : "Upload data to see the executive summary of the audit findings."}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 p-8 shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <Lightbulb size={18} />
              </div>
              <h3 className="font-bold text-slate-800">Insights</h3>
            </div>
            <ul className="space-y-3">
              {result ? result.suggestions.map((s, i) => (
                <li key={i} className="flex gap-3 text-slate-600 text-sm">
                  <span className="text-indigo-600 font-bold">•</span>
                  {s}
                </li>
              )) : (
                <li className="text-slate-400 italic text-sm">No insights available. Please upload audit documents.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Table Section */}
        {result && (
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/50 overflow-hidden shadow-xl shadow-slate-200/50">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TableIcon size={20} className="text-slate-400" />
                  Top Audit Findings
                </h3>
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                >
                  <Download size={14} />
                  Export to Excel
                </button>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Showing top 10 of {result.findings.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    {AUDIT_TABLE_HEADERS.map(h => (
                      <th key={h} className="px-8 py-5 border-b border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {result.findings.slice(0, 10).map((f, i) => (
                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-8 py-5 font-mono text-xs text-slate-400">{f.no}</td>
                      <td className="px-8 py-5 font-semibold text-slate-700">{f.problem}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg uppercase">
                          {f.category}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-slate-600">{f.area}</td>
                      <td className="px-8 py-5 text-slate-600 font-bold">{f.pic}</td>
                      <td className="px-8 py-5 text-slate-500 text-xs max-w-xs truncate">{f.rootCause}</td>
                      <td className="px-8 py-5 text-slate-500 text-xs max-w-xs truncate">{f.action}</td>
                      <td className="px-8 py-5 text-slate-400 font-mono text-xs">{f.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                    <p className="text-sm text-slate-500">Pilih file PDF atau PPTX untuk dianalisis</p>
                  </div>
                  <button onClick={() => setShowUploadModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="relative group">
                  <input 
                    type="file" 
                    multiple 
                    accept=".pdf,.pptx,.ppt"
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
                  {isProcessing ? "Sedang Memproses..." : "Mulai Analisis AI"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Chatbot */}
      <div className="fixed bottom-10 right-10 z-40 flex flex-col items-end gap-6">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              className="w-[420px] h-[600px] bg-white/90 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/50 flex flex-col overflow-hidden"
            >
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <span className="font-bold block">Asisten Audit AI</span>
                    <span className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold">Online & Siap Membantu</span>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
                      <MessageSquare size={40} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-700">Halo! Ada yang bisa saya bantu?</p>
                      <p className="text-sm text-slate-400">Tanyakan apa saja tentang data audit Anda.</p>
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-[24px] text-sm shadow-sm leading-relaxed",
                      msg.role === 'user' ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-[24px] rounded-tl-none border border-slate-100 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder={result ? "Ketik pesan Anda..." : "Upload data terlebih dahulu"}
                  disabled={!result || isChatLoading}
                  className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                />
                <button 
                  onClick={handleChatSend}
                  disabled={!result || isChatLoading || !chatInput.trim()}
                  className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200"
                >
                  <Send size={24} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-16 h-16 bg-emerald-600 text-white rounded-[24px] shadow-2xl shadow-emerald-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <MessageSquare size={32} className="group-hover:rotate-12 transition-transform" />
        </button>
      </div>

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
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Gemini AI sedang bekerja untuk Anda</p>
          </div>
        </div>
      )}
    </div>
  );
}
