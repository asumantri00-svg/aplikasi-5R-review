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

  const chatEndRef = useRef<HTMLDivElement>(null);

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
    } catch (err) {
      console.error(err);
      setError("Failed to process documents. Please ensure they are valid PDF or PPTX files.");
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
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error." }]);
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
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Dashboard Audit 5R</h1>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
        >
          <Plus size={18} />
          Upload More
        </button>
      </header>

      <main className="max-w-[1600px] mx-auto p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Insights</h2>
          {result && (
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:underline"
            >
              <Download size={16} />
              Export Full Excel
            </button>
          )}
        </div>

        {/* Data Distribution Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
            <h3 className="font-bold text-slate-800">Data Distribution</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* By Category - Donut */}
            <div className="space-y-4">
              <h4 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">By Category</h4>
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
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    {result && <Legend verticalAlign="bottom" height={36} iconType="circle" />}
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By Area - Bar */}
            <div className="space-y-4">
              <h4 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">By Area</h4>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result?.areaDistribution || [{ name: '', value: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By PIC - Horizontal Bar */}
            <div className="space-y-4">
              <h4 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">By PIC</h4>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    layout="vertical" 
                    data={result?.picDistribution || [{ name: '', value: 0 }]}
                    margin={{ left: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" fontSize={11} axisLine={false} tickLine={false} width={80} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#14b8a6" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Summary and Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <FileText size={18} />
              </div>
              <h3 className="font-bold text-slate-800">Summary Audit 5R 1S</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {result ? result.summaryText : "Upload data to see the executive summary of the audit findings."}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <Lightbulb size={18} />
              </div>
              <h3 className="font-bold text-slate-800">Insights</h3>
            </div>
            <ul className="space-y-3">
              {result ? result.suggestions.map((s, i) => (
                <li key={i} className="flex gap-3 text-slate-600">
                  <span className="text-indigo-600 font-bold">•</span>
                  {s}
                </li>
              )) : (
                <li className="text-slate-400 italic">No insights available. Please upload audit documents.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Table - Top 10 */}
        {result && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TableIcon size={18} className="text-slate-400" />
                Top 10 Findings
              </h3>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Showing 10 of {result.findings.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    {AUDIT_TABLE_HEADERS.map(h => (
                      <th key={h} className="px-6 py-4 border-b border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {result.findings.slice(0, 10).map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{f.no}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{f.problem}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase">
                          {f.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{f.area}</td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">{f.pic}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">{f.rootCause}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">{f.action}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{f.dueDate}</td>
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800">Upload Audit Documents</h3>
                  <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} />
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
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 group-hover:border-indigo-400 group-hover:bg-indigo-50/30 transition-all">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Upload size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-700">Drop files here or click to upload</p>
                      <p className="text-sm text-slate-400">PDF, PPTX, or PPT up to 20MB</p>
                    </div>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected Files ({files.length})</p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-indigo-600" />
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[300px]">{file.name}</span>
                          </div>
                          <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
                >
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  {isProcessing ? "Processing..." : "Start Analysis"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Chatbot */}
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare size={20} />
                  <span className="font-bold">Audit Assistant</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                      <MessageSquare size={24} />
                    </div>
                    <p className="text-sm text-slate-500">Ask me anything about the audit data!</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                      msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                      <Loader2 size={16} className="animate-spin text-indigo-600" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder={result ? "Type a message..." : "Upload data first"}
                  disabled={!result || isChatLoading}
                  className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                />
                <button 
                  onClick={handleChatSend}
                  disabled={!result || isChatLoading || !chatInput.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <MessageSquare size={28} />
        </button>
      </div>

      {/* Global Processing Loader */}
      {isProcessing && (
        <div className="fixed inset-0 z-[60] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-indigo-100 rounded-full" />
            <div className="w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute inset-0" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Analyzing Documents</h2>
            <p className="text-slate-500 font-medium">Gemini AI is processing your audit findings...</p>
          </div>
        </div>
      )}
    </div>
  );
}
