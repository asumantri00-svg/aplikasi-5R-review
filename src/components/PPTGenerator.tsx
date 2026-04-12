import React, { useState, useMemo } from 'react';
import pptxgen from 'pptxgenjs';
import { Download, Upload, Image as ImageIcon, Plus, Trash2, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AuditFinding } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PPTFinding extends AuditFinding {
  status: 'Open' | 'On Progress' | 'Close';
  beforeImage?: string;
  afterCorrectiveImage?: string;
  afterPreventiveImage?: string;
}

export default function PPTGenerator() {
  const [findings, setFindings] = useState<PPTFinding[]>([
    {
      no: '1',
      problem: '',
      category: 'R1',
      area: '',
      pic: '',
      rootCause: '',
      action: '',
      dueDate: '',
      status: 'Open',
    }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [monthYear, setMonthYear] = useState(new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }));

  const currentFinding = findings[currentIndex];

  const calculateStatus = (f: PPTFinding): 'Open' | 'On Progress' | 'Close' => {
    if (f.beforeImage && f.afterCorrectiveImage && f.afterPreventiveImage) return 'Close';
    if (f.beforeImage && f.afterCorrectiveImage) return 'On Progress';
    if (f.beforeImage) return 'Open';
    return 'Open';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFindings(prev => {
      const newFindings = [...prev];
      newFindings[currentIndex] = { ...newFindings[currentIndex], [name]: value };
      return newFindings;
    });
  };

  const handleBulkBeforeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const files = Array.from(fileList);

    files.forEach((file: File, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFindings(prev => {
          // If the first finding is empty (no image and no problem), replace it with the first uploaded image
          if (index === 0 && prev.length === 1 && !prev[0].beforeImage && !prev[0].problem) {
            return [{
              ...prev[0],
              beforeImage: base64,
              status: 'Open'
            }];
          }
          
          const newFinding: PPTFinding = {
            no: (prev.length + 1).toString(),
            problem: '',
            category: 'R1',
            area: '',
            pic: '',
            rootCause: '',
            action: '',
            dueDate: '',
            status: 'Open',
            beforeImage: base64,
          };
          return [...prev, newFinding];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSingleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'beforeImage' | 'afterCorrectiveImage' | 'afterPreventiveImage') => {
    const file = e.target.files?.[0];
    if (file && currentFinding) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFindings(prev => {
          const newFindings = [...prev];
          const updated = { ...newFindings[currentIndex], [type]: base64 };
          updated.status = calculateStatus(updated);
          newFindings[currentIndex] = updated;
          return newFindings;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFinding = (index: number) => {
    setFindings(prev => {
      if (prev.length <= 1) {
        // Reset the only finding instead of removing it
        return [{
          no: '1',
          problem: '',
          category: 'R1',
          area: '',
          pic: '',
          rootCause: '',
          action: '',
          dueDate: '',
          status: 'Open',
        }];
      }
      const newFindings = prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, no: (i + 1).toString() }));
      if (currentIndex >= newFindings.length && newFindings.length > 0) {
        setCurrentIndex(newFindings.length - 1);
      }
      return newFindings;
    });
  };

  const generatePPT = async () => {
    if (findings.length === 0) return;

    const pres = new pptxgen();
    pres.layout = 'LAYOUT_WIDE';

    findings.forEach((f) => {
      const slide = pres.addSlide();

      // Header Logos
      slide.addText('sinarmas', { x: 0.5, y: 0.2, w: 2, h: 0.5, fontSize: 18, bold: true, color: 'CC0000' });
      slide.addText('agribusiness and food', { x: 0.5, y: 0.5, w: 2, h: 0.3, fontSize: 10, color: '333333' });
      slide.addText('Sustainable 5R', { x: 11, y: 0.2, w: 2, h: 0.8, fontSize: 12, bold: true, align: 'center', color: '333333' });

      // Title
      slide.addText(`Finding : ${monthYear}`, { x: 1, y: 1.2, w: 5, h: 0.5, fontSize: 24, bold: true });

      // Table
      const tableRows = [
        [
          { text: 'No.', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'Problem', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'Category', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'Area', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'PIC', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'Root Cause', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'Action', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'Due Date', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
          { text: 'Status', options: { fill: { color: '000000' }, color: 'FFFFFF', bold: true, align: 'center' as const } },
        ],
        [
          { text: f.no, options: { align: 'center' as const } },
          { text: f.problem },
          { text: f.category, options: { align: 'center' as const } },
          { text: f.area },
          { text: f.pic },
          { text: f.rootCause },
          { text: f.action },
          { text: f.dueDate, options: { align: 'center' as const } },
          { text: f.status, options: { align: 'center' as const, color: f.status === 'Close' ? '008000' : f.status === 'On Progress' ? 'FFA500' : 'FF0000' } },
        ]
      ];

      slide.addTable(tableRows as any, {
        x: 0.5,
        y: 2,
        w: 12.3,
        colW: [0.4, 2.5, 0.8, 1, 1, 1.8, 2.8, 1, 1],
        border: { pt: 1, color: 'CCCCCC' },
        fontSize: 9,
        valign: 'middle',
        fill: { color: 'F5F5F5' }
      });

      // Image Sections
      const imgY = 4.5;
      const imgW = 3.8;
      const imgH = 2.5;
      const spacing = 0.4;

      // Before
      slide.addText('Before', { x: 0.5, y: imgY - 0.4, w: imgW, h: 0.3, align: 'center', bold: true });
      if (f.beforeImage) {
        slide.addImage({ data: f.beforeImage, x: 0.5, y: imgY, w: imgW, h: imgH });
      } else {
        slide.addShape(pres.ShapeType.rect, { x: 0.5, y: imgY, w: imgW, h: imgH, fill: { color: 'F9F9F9' }, line: { color: 'CCCCCC' } });
        slide.addText('Foto before', { x: 0.5, y: imgY, w: imgW, h: imgH, align: 'center', valign: 'middle', color: '999999' });
      }

      // After Corrective
      slide.addText('After Corrective Action', { x: 0.5 + imgW + spacing, y: imgY - 0.4, w: imgW, h: 0.3, align: 'center', bold: true });
      if (f.afterCorrectiveImage) {
        slide.addImage({ data: f.afterCorrectiveImage, x: 0.5 + imgW + spacing, y: imgY, w: imgW, h: imgH });
      } else {
        slide.addShape(pres.ShapeType.rect, { x: 0.5 + imgW + spacing, y: imgY, w: imgW, h: imgH, fill: { color: 'F9F9F9' }, line: { color: 'CCCCCC' } });
        slide.addText('Foto after harus posisi yang sama dengan foto before', { x: 0.5 + imgW + spacing, y: imgY, w: imgW, h: imgH, align: 'center', valign: 'middle', color: '999999', fontSize: 10 });
      }

      // After Preventive
      slide.addText('After Preventive Action', { x: 0.5 + (imgW + spacing) * 2, y: imgY - 0.4, w: imgW, h: 0.3, align: 'center', bold: true });
      if (f.afterPreventiveImage) {
        slide.addImage({ data: f.afterPreventiveImage, x: 0.5 + (imgW + spacing) * 2, y: imgY, w: imgW, h: imgH });
      } else {
        slide.addShape(pres.ShapeType.rect, { x: 0.5 + (imgW + spacing) * 2, y: imgY, w: imgW, h: imgH, fill: { color: 'F9F9F9' }, line: { color: 'CCCCCC' } });
        slide.addText('Foto after harus posisi yang sama dengan foto before', { x: 0.5 + (imgW + spacing) * 2, y: imgY, w: imgW, h: imgH, align: 'center', valign: 'middle', color: '999999', fontSize: 10 });
      }

      slide.addText('Sinar Mas Agribusiness and Food', { x: 0.2, y: 7.2, w: 4, h: 0.3, fontSize: 8, color: '999999', rotate: 270 });
    });

    pres.writeFile({ fileName: `Audit_Findings_${monthYear.replace(/ /g, '_')}.pptx` });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Audit 5R</h2>
          <p className="text-slate-500">Upload foto bulk untuk membuat banyak slide sekaligus</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleBulkBeforeUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
              <Plus size={20} />
              Upload Foto
            </button>
          </div>
          <button
            onClick={generatePPT}
            disabled={findings.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            <Download size={20} />
            Download PPT
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Navigation & Selector */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PILIH TEMUAN:</label>
              <select 
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
              >
                {findings.map((f, i) => (
                  <option key={i} value={i}>No. {f.no} - {f.problem || '(Belum diisi)'}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-sm font-bold text-slate-600">{currentIndex + 1} / {findings.length}</span>
              <button 
                onClick={() => setCurrentIndex(prev => Math.min(findings.length - 1, prev + 1))}
                disabled={currentIndex === findings.length - 1}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
              >
                <ChevronRight size={24} />
              </button>
              <button 
                onClick={() => removeFinding(currentIndex)}
                className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                  <FileText className="text-indigo-600" size={20} />
                  Data Temuan No. {currentFinding.no}
                </h3>
                <span className={cn(
                  "px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                  currentFinding.status === 'Close' ? "bg-emerald-100 text-emerald-700" :
                  currentFinding.status === 'On Progress' ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                )}>
                  STATUS: {currentFinding.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bulan & Tahun</label>
                  <input
                    type="text"
                    value={monthYear}
                    onChange={(e) => setMonthYear(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                  <input
                    type="text"
                    name="dueDate"
                    value={currentFinding.dueDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="DD-MM-YY"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Problem</label>
                <textarea
                  name="problem"
                  value={currentFinding.problem}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Deskripsi masalah..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={currentFinding.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Area</label>
                  <input
                    type="text"
                    name="area"
                    value={currentFinding.area}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PIC</label>
                  <input
                    type="text"
                    name="pic"
                    value={currentFinding.pic}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Root Cause</label>
                  <input
                    type="text"
                    name="rootCause"
                    value={currentFinding.rootCause}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Action</label>
                <textarea
                  name="action"
                  value={currentFinding.action}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="1. Corrective Action: ...&#10;2. Preventive Action: ..."
                />
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6">
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                  <ImageIcon className="text-emerald-600" size={20} />
                  Dokumentasi Foto
                </h3>

                <div className="space-y-6">
                  {/* Before */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">FOTO BEFORE</label>
                    <div className="relative group h-48 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-400 transition-all bg-slate-900">
                      {currentFinding.beforeImage ? (
                        <>
                          <img src={currentFinding.beforeImage} className="w-full h-full object-cover" alt="Before" />
                          <button 
                            onClick={() => {
                              setFindings(prev => {
                                const newFindings = [...prev];
                                const updated = { ...newFindings[currentIndex], beforeImage: undefined };
                                updated.status = calculateStatus(updated);
                                newFindings[currentIndex] = updated;
                                return newFindings;
                              });
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Upload size={24} />
                          <span className="text-[10px] uppercase tracking-wider">Upload Foto Before</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSingleImageUpload(e, 'beforeImage')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Corrective */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">FOTO AFTER CORRECTIVE</label>
                    <div className="relative group h-48 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-400 transition-all">
                      {currentFinding.afterCorrectiveImage ? (
                        <>
                          <img src={currentFinding.afterCorrectiveImage} className="w-full h-full object-cover" alt="After Corrective" />
                          <button 
                            onClick={() => {
                              setFindings(prev => {
                                const newFindings = [...prev];
                                const updated = { ...newFindings[currentIndex], afterCorrectiveImage: undefined };
                                updated.status = calculateStatus(updated);
                                newFindings[currentIndex] = updated;
                                return newFindings;
                              });
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Upload size={24} />
                          <span className="text-[10px] uppercase tracking-wider">Upload Foto After Corrective</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSingleImageUpload(e, 'afterCorrectiveImage')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Preventive */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">FOTO AFTER PREVENTIVE</label>
                    <div className="relative group h-48 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-400 transition-all">
                      {currentFinding.afterPreventiveImage ? (
                        <>
                          <img src={currentFinding.afterPreventiveImage} className="w-full h-full object-cover" alt="After Preventive" />
                          <button 
                            onClick={() => {
                              setFindings(prev => {
                                const newFindings = [...prev];
                                const updated = { ...newFindings[currentIndex], afterPreventiveImage: undefined };
                                updated.status = calculateStatus(updated);
                                newFindings[currentIndex] = updated;
                                return newFindings;
                              });
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Upload size={24} />
                          <span className="text-[10px] uppercase tracking-wider">Upload Foto After Preventive</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSingleImageUpload(e, 'afterPreventiveImage')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
