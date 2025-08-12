import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// ICONS: Simple SVG icons for the UI
// ============================================================================
const ChevronDownIcon = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

// ============================================================================
// SERVICES: Centralized API Logic
// ============================================================================

const geminiService = {
    run: async (prompt, apiKey, schema = null, image = null) => {
        if (!apiKey) {
            throw new Error("Kunci API Google AI belum dimasukkan.");
        }

        const parts = [{ text: prompt }];
        if (image) {
            parts.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            });
        }

        let chatHistory = [{ role: "user", parts: parts }];
        const payload = { contents: chatHistory };

        if (schema) {
            payload.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: schema
            };
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Body:", errorBody);
                throw new Error(`HTTP error! status: ${response.status} - ${errorBody.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                
                const rawText = result.candidates[0].content.parts[0].text;
                if (schema) {
                    try {
                        return JSON.parse(rawText);
                    } catch (parseError) {
                        console.error("Gagal mem-parsing JSON dari AI:", parseError, "\nRespons Mentah:", rawText);
                        throw new Error("Respons AI bukan JSON yang valid.");
                    }
                }
                return rawText;
            } else {
                console.warn("Respons AI kosong atau tidak valid:", result);
                throw new Error("Respons dari AI kosong.");
            }
        } catch (error) {
            console.error("Kesalahan saat memanggil Gemini API:", error);
            throw error;
        }
    }
};


// ============================================================================
// KOMPONEN: Masing-masing Tab dipecah menjadi komponennya sendiri.
// ============================================================================

// --- Komponen untuk Dashboard Proyek ---
const DashboardProyek = ({ projectData, setCurrentSection }) => {
    const draftSections = [
        { title: 'Draf Pendahuluan', key: 'pendahuluanDraft', sectionId: 'pendahuluan' },
        { title: 'Draf Studi Literatur', key: 'studiLiteraturDraft', sectionId: 'studiLiteratur' },
        { title: 'Draf Metode Penelitian', key: 'metodeDraft', sectionId: 'metode' },
        { title: 'Draf Hasil & Pembahasan', key: 'hasilPembahasanDraft', sectionId: 'hasil' },
        { title: 'Draf Analisis Kuantitatif', key: 'analisisKuantitatifDraft', sectionId: 'analisisKuantitatif' },
        { title: 'Draf Analisis Kualitatif', key: 'analisisKualitatifDraft', sectionId: 'analisisKualitatif' },
        { title: 'Draf Analisis Visual', key: 'analisisVisualDraft', sectionId: 'analisisVisual' },
        { title: 'Draf Kesimpulan', key: 'kesimpulanDraft', sectionId: 'kesimpulan' },
    ];

    const DraftCard = ({ title, content, sectionId }) => {
        const hasContent = content && content.trim() !== '';
        const preview = hasContent ? content.substring(0, 150) + '...' : 'Belum ada draf yang dibuat atau disimpan untuk bagian ini.';

        return (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                        <p className={`text-sm mt-1 ${hasContent ? 'text-gray-600' : 'text-gray-400 italic'}`}>{preview}</p>
                    </div>
                    <span className={`ml-4 mt-1 flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${hasContent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {hasContent ? 'Selesai' : 'Kosong'}
                    </span>
                </div>
                <button 
                    onClick={() => setCurrentSection(sectionId)}
                    className="mt-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded-lg"
                >
                    {hasContent ? 'Lihat & Edit' : 'Mulai Kerjakan'}
                </button>
            </div>
        );
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Dashboard Proyek</h2>
            <p className="text-gray-600 mb-6">Lihat ringkasan dan kemajuan dari semua bagian proyek KTI Anda di satu tempat.</p>
            
            <div className="space-y-4">
                {draftSections.map(section => (
                    <DraftCard 
                        key={section.key}
                        title={section.title}
                        content={projectData[section.key]}
                        sectionId={section.sectionId}
                    />
                ))}
            </div>
        </div>
    );
};


// --- Komponen untuk Tab 1: Ide KTI (ALUR KERJA BARU) ---
const IdeKTI = ({ 
    projectData, 
    handleInputChange, 
    handleGenerateIdeKTI, 
    handleStartNewIdea,
    isLoading, 
    aiStructuredResponse,
    editingIdea,
    setEditingIdea,
    handleStartEditing,
    handleSaveIdea,
    ideKtiMode,
}) => {
    // Jika proyek sudah punya judul, tampilkan ringkasan dan tombol edit
    if (projectData.judulKTI && !editingIdea && !ideKtiMode) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Ide KTI</h2>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-indigo-800 mb-3">Ringkasan Proyek Anda</h3>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Judul KTI:</p>
                        <p className="mb-3 text-gray-800">{projectData.judulKTI}</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Kata Kunci:</p>
                        <p className="mb-3 text-gray-800">{projectData.kataKunci}</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Penjelasan Singkat:</p>
                        <p className="text-gray-800">{projectData.penjelasan}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleStartNewIdea} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm">
                            Edit Ide & Detail Proyek
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Tampilan utama untuk memulai proyek baru atau mengedit
    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Mulai Proyek: Ide KTI</h2>
            
            {/* Form Detail Penelitian (Selalu Terlihat) */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">1. Lengkapi Detail Penelitian</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Topik atau Tema:</label>
                        <input type="text" name="topikTema" value={projectData.topikTema} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: Digital Innovation Culture"/>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Jenis Karya Tulis:</label>
                        <select name="jenisKaryaTulis" value={projectData.jenisKaryaTulis} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700">
                            <option value="Artikel Ilmiah">Artikel Ilmiah</option>
                            <option value="Makalah">Makalah</option>
                            <option value="Skripsi">Skripsi</option>
                            <option value="Tesis">Tesis</option>
                            <option value="Lainnya">Isi Sendiri...</option>
                        </select>
                    </div>
                    {projectData.jenisKaryaTulis === 'Lainnya' && (
                         <div className="md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Sebutkan Jenis Karya Tulis Lainnya:</label>
                            <input type="text" name="jenisKaryaTulisLainnya" value={projectData.jenisKaryaTulisLainnya} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: Naskah Kebijakan, Laporan"/>
                        </div>
                    )}
                    <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Pendekatan Penelitian (Wajib):</label>
                        <select name="pendekatan" value={projectData.pendekatan} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700">
                            <option value="" disabled>Pilih pendekatan...</option>
                            <option value="Kuantitatif">Kuantitatif</option>
                            <option value="Kualitatif">Kualitatif</option>
                            <option value="Metode Campuran">Metode Campuran</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Metode Spesifik:</label>
                        <input type="text" name="metode" value={projectData.metode} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: Bibliometrik, SLR, Studi Kasus"/>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Periode:</label>
                        <input type="text" name="periode" value={projectData.periode} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: 2020-2024"/>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Basis Data:</label>
                        <input type="text" name="basisData" value={projectData.basisData} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: Scopus, Web of Science"/>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Tools:</label>
                        <input type="text" name="tools" value={projectData.tools} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: Vosviewer, R (bibliometrix)"/>
                    </div>
                </div>
            </div>

            {/* Tombol Pilihan Aksi */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">2. Tentukan Judul & Penjelasan</h3>
                <div className="flex flex-wrap gap-4">
                    <button onClick={handleGenerateIdeKTI} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isLoading || !projectData.topikTema}>
                        {isLoading && ideKtiMode === 'ai' ? 'Meminta Pertanyaan...' : '✨ Hasilkan Ide dari AI'}
                    </button>
                    <button onClick={handleStartNewIdea} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300" disabled={isLoading}>
                        💡 Tulis Ide Sendiri
                    </button>
                </div>
            </div>

            {/* Area Hasil (Dinamis) */}
            <div className="mt-8">
                {isLoading && !aiStructuredResponse && ideKtiMode === 'ai' && (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="ml-3 text-gray-600">AI sedang memproses...</p>
                    </div>
                )}

                {ideKtiMode === 'ai' && aiStructuredResponse && aiStructuredResponse.length > 0 && (
                    <div className="animate-fade-in">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Rekomendasi Ide dari AI:</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {aiStructuredResponse.map((idea, index) => (
                                <div key={index} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
                                    <h4 className="text-lg font-semibold text-blue-700 mb-2">{idea.judul}</h4>
                                    <p className="text-gray-700 mb-2"><strong>Kata Kunci:</strong> {idea.kata_kunci}</p>
                                    <p className="text-gray-600 text-sm mb-3">{idea.penjelasan}</p>
                                    <button onClick={() => handleStartEditing(idea)} className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2 px-3 rounded-lg">
                                        Pilih & Sunting Ide Ini
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {editingIdea && (
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 animate-fade-in">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">3. Konfirmasi & Simpan Proyek</h3>
                        <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Judul KTI:</label>
                                <input type="text" value={editingIdea.judul} onChange={e => setEditingIdea({...editingIdea, judul: e.target.value})} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"/>
                            </div>
                             <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Kata Kunci:</label>
                                <input type="text" value={editingIdea.kata_kunci} onChange={e => setEditingIdea({...editingIdea, kata_kunci: e.target.value})} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"/>
                            </div>
                             <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Penjelasan Singkat:</label>
                                <textarea value={editingIdea.penjelasan} onChange={e => setEditingIdea({...editingIdea, penjelasan: e.target.value})} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" rows="3"></textarea>
                            </div>
                            <button onClick={handleSaveIdea} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                                Simpan Ide & Lanjutkan ke Tahap Berikutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Komponen untuk Tab 2: Referensi (UI Terpadu) ---
const Referensi = ({ 
    projectData, 
    manualRef,
    setManualRef,
    handleSaveManualReference,
    freeTextRef,
    setFreeTextRef,
    handleImportFromText,
    handleEditReference, 
    handleDeleteReference, 
    handleGenerateApa, 
    generatedApaReferences, 
    handleCopyToClipboard, 
    handleShowSearchPrompts, 
    handleGenerateReferenceClues,
    isLoading, 
    openNoteModal,
    triggerReferencesImport,
    handleExportReferences
}) => {
    const [manualMode, setManualMode] = useState('template');

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Literatur & Referensi</h2>
            <p className="text-gray-600 mb-8 -mt-4">Pusat untuk mencari, menambah, dan mengelola semua referensi untuk proyek Anda.</p>

            {/* Bagian 1: Membangun Perpustakaan Proyek */}
            <h3 className="text-xl font-bold mb-4 text-gray-800">Bangun Perpustakaan Referensi Proyek</h3>
            
            <div className="mb-8 p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Metode 1: Pencarian Terpandu AI</h4>
                <p className="text-sm text-blue-700 mb-4">Gunakan AI untuk membuat peta jalan pencarian (clues), lalu gunakan peta jalan tersebut untuk mencari referensi di mesin pencari akademis.</p>
                
                {/* Fitur Clue Referensi */}
                <div className="mb-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-800 mb-2">Langkah 1: Hasilkan Peta Jalan Pencarian (Clues)</p>
                    <button onClick={handleGenerateReferenceClues} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-lg text-sm disabled:bg-teal-300" disabled={isLoading || !projectData.topikTema}>
                        {isLoading ? 'Mencari...' : '🔍 Dapatkan Clue Referensi'}
                    </button>
                </div>
                {projectData.aiReferenceClues && (
                    <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                        <h5 className="font-bold mb-2">Clue Referensi Kunci untuk Riset Mandiri:</h5>
                        {projectData.aiReferenceClues.map((cat, index) => (
                            <div key={index} className="mb-2">
                                <p className="font-semibold">{cat.category}:</p>
                                <ul className="list-disc list-inside ml-4 text-sm">
                                    {cat.clues.map((clue, i) => <li key={i}>{clue}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6">
                     <p className="text-sm font-semibold text-blue-800 mb-2">Langkah 2: Buka Peta Jalan & Mulai Pencarian</p>
                    <button onClick={handleShowSearchPrompts} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-purple-300" disabled={isLoading || !projectData.aiReferenceClues}>
                        {isLoading ? 'Memproses...' : '🗺️ Buka Peta Jalan Pencarian'}
                    </button>
                </div>
            </div>

            <div className="mb-6 p-4 border-2 border-dashed border-green-300 rounded-lg bg-green-50">
                <h4 className="text-lg font-semibold mb-3 text-green-800">Metode 2: Tambah Manual</h4>
                <div className="flex border-b border-green-300 mb-4">
                    <button onClick={() => setManualMode('template')} className={`py-2 px-4 text-sm font-medium ${manualMode === 'template' ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-green-600'}`}>Isi Template</button>
                    <button onClick={() => setManualMode('text')} className={`py-2 px-4 text-sm font-medium ${manualMode === 'text' ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-green-600'}`}>Impor dari Teks <span className="text-xs bg-yellow-200 text-yellow-800 rounded-full px-2 py-1">Eksperimental</span></button>
                </div>
                
                {manualMode === 'template' && (
                    <div>
                        <p className="text-sm text-green-700 mb-4">Isi detail referensi menggunakan template di bawah. Paling andal.</p>
                        <textarea
                            value={manualRef.text}
                            onChange={(e) => setManualRef({ ...manualRef, text: e.target.value })}
                            className="shadow-sm border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed font-mono text-sm"
                            rows="12"
                        ></textarea>
                        <button onClick={handleSaveManualReference} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                            {manualRef.id ? 'Perbarui Referensi' : 'Tambah ke Proyek'}
                        </button>
                    </div>
                )}

                {manualMode === 'text' && (
                    <div>
                        <p className="text-sm text-green-700 mb-4">Tempelkan satu referensi yang sudah diformat (misal: dari PDF). AI akan mencoba mengurainya. Hasilnya mungkin perlu diperiksa.</p>
                        <textarea
                            value={freeTextRef}
                            onChange={(e) => setFreeTextRef(e.target.value)}
                            className="shadow-sm border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed font-mono text-sm"
                            rows="5"
                            placeholder="Contoh: M. Aria and C. Cuccurullo, “bibliometrix: An R-tool for comprehensive science mapping analysis,” J Informetr, vol. 11, no. 4, pp. 959–975, 2017..."
                        ></textarea>
                        <button onClick={handleImportFromText} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isLoading || !freeTextRef}>
                           {isLoading ? 'Mengimpor...' : 'Impor & Tambah ke Proyek'}
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-10">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold text-gray-800">Perpustakaan Referensi Proyek ({projectData.allReferences.length})</h3>
                    <div className="flex gap-2">
                       <button onClick={triggerReferencesImport} className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded-lg">Impor</button>
                       <button onClick={handleExportReferences} className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded-lg">Ekspor</button>
                    </div>
                </div>
                {projectData.allReferences.length > 0 ? (
                    <>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 bg-gray-200 z-10">
                                    <tr>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300">Referensi</th>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300">Kutipan / Catatan</th>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectData.allReferences.map(ref => (
                                        <tr key={ref.id} className="bg-white hover:bg-gray-50">
                                            <td className="p-3 text-sm text-gray-700 border-b border-gray-200" style={{minWidth: '300px'}}>
                                                <p className="font-bold">{ref.title}</p>
                                                <p className="text-xs">{ref.author} ({ref.year})</p>
                                                {ref.doi && <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">DOI: {ref.doi}</a>}
                                            </td>
                                            <td className="p-3 text-sm text-gray-700 border-b border-gray-200">
                                                <p className="italic max-h-20 overflow-y-auto">{ref.isiKutipan || "Belum ada catatan."}</p>
                                            </td>
                                            <td className="p-3 text-sm text-gray-700 border-b border-gray-200">
                                                <div className="flex flex-col gap-2">
                                                    <button onClick={() => openNoteModal(ref)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded-lg whitespace-nowrap">Tambah/Edit Catatan</button>
                                                    <button onClick={() => handleEditReference(ref)} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-2 rounded-lg">Edit Ref</button>
                                                    <button onClick={() => handleDeleteReference(ref.id)} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-lg">Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-300">
                            <h4 className="text-lg font-semibold mb-4 text-gray-800">Buat Daftar Pustaka dari Perpustakaan Proyek</h4>
                            <button onClick={handleGenerateApa} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">
                                Buat Daftar Pustaka (APA 7th)
                            </button>
                            {generatedApaReferences && (
                                <div className="mt-4">
                                    <button onClick={() => handleCopyToClipboard(generatedApaReferences)} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg mb-2">Salin Teks</button>
                                    <div className="shadow-inner border rounded-lg w-full p-3 text-gray-700 bg-gray-100" style={{ minHeight: '150px', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: generatedApaReferences }}></div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>Perpustakaan Anda masih kosong.</p>
                        <p className="text-sm">Gunakan metode di atas untuk mulai menambahkan referensi.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Komponen untuk Tab 3: Pokok Isi KTI ---
const PokokIsi = ({ projectData, setProjectData, handleGeneratePokokIsi, isLoading }) => (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Pokok Isi KTI</h2>
        <p className="text-gray-700 mb-4">Kembangkan fondasi tulisan Anda. AI akan membantu menyusun draf Fakta/Masalah, Tujuan, dan Teori Penelitian berdasarkan judul dan referensi yang ada.</p>
        
        <div className="flex flex-wrap gap-4 mb-6">
            <button onClick={handleGeneratePokokIsi} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isLoading || !projectData.judulKTI}>
                {isLoading ? 'Memproses...' : '✨ Hasilkan Draf Pokok Isi'}
            </button>
        </div>

        {isLoading && !projectData.faktaMasalahDraft && (
            <div className="mt-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">AI sedang menyusun draf...</p>
            </div>
        )}

        {(projectData.faktaMasalahDraft || projectData.tujuanPenelitianDraft || projectData.teoriPenelitianDraft) && (
            <div className="mt-6 space-y-4">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Draf Fakta/Realitas Masalah:</label>
                    <textarea value={projectData.faktaMasalahDraft} onChange={(e) => setProjectData(p => ({...p, faktaMasalahDraft: e.target.value}))} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" rows="4"></textarea>
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Draf Tujuan Penelitian:</label>
                    <textarea value={projectData.tujuanPenelitianDraft} onChange={(e) => setProjectData(p => ({...p, tujuanPenelitianDraft: e.target.value}))} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" rows="3"></textarea>
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Draf Teori Penelitian:</label>
                    <textarea value={projectData.teoriPenelitianDraft} onChange={(e) => setProjectData(p => ({...p, teoriPenelitianDraft: e.target.value}))} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" rows="3"></textarea>
                </div>
            </div>
        )}
    </div>
);

// --- Komponen untuk Tab 4: Outline KTI ---
const Outline = ({ projectData, handleGenerateOutline, isLoading }) => (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Outline KTI</h2>
        <p className="text-gray-700 mb-4">Buat kerangka penulisan KTI Anda secara otomatis berdasarkan ide yang telah dipilih.</p>
        <button onClick={handleGenerateOutline} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isLoading || !projectData.judulKTI}>
            {isLoading ? 'Memproses...' : '✨ Hasilkan Outline KTI'}
        </button>

        {isLoading && !projectData.outlineDraft && (
            <div className="mt-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">AI sedang menyusun outline...</p>
            </div>
        )}

        {projectData.outlineDraft && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Draf Outline KTI</h3>
                {projectData.outlineDraft.map((bab, index) => (
                    <div key={index} className="mb-4">
                        <h4 className="font-bold text-blue-800">{bab.bab}: {bab.judul}</h4>
                        <ul className="list-disc list-inside ml-4 text-gray-700">
                            {bab.sub_bab.map((sub, subIndex) => (
                                <li key={subIndex}>{sub}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// --- Komponen untuk Tab 5: Pendahuluan ---
const Pendahuluan = ({ 
    projectData, 
    setProjectData, 
    isLoading, 
    handleCopyToClipboard,
    handleGenerateFullPendahuluan,
    handleModifyText
}) => (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Pendahuluan</h2>
        
        <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 mb-6">
             <h3 className="text-lg font-semibold mb-2 text-blue-800">Generator Pendahuluan</h3>
             <p className="text-sm text-blue-700 mb-4">Klik tombol di bawah untuk menghasilkan draf pendahuluan lengkap yang mencakup latar belakang, rumusan masalah, tujuan, dan sistematika penulisan berdasarkan data proyek Anda.</p>
            <button onClick={handleGenerateFullPendahuluan} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300" disabled={isLoading}>
                {isLoading ? 'Memproses...' : '✨ Tulis Draf Pendahuluan Lengkap'}
            </button>
        </div>

        <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-bold">Draf Final Bab Pendahuluan:</label>
                <button onClick={() => handleCopyToClipboard(projectData.pendahuluanDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg">Salin Teks</button>
            </div>
            <textarea
                value={projectData.pendahuluanDraft}
                onChange={(e) => setProjectData(p => ({ ...p, pendahuluanDraft: e.target.value }))}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                rows="20"
                placeholder="Hasil generate akan muncul di sini..."
            ></textarea>
        </div>
        
        {/* Fitur Modifikasi Teks */}
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
            <div className="flex flex-wrap gap-2">
                <button 
                    onClick={() => handleModifyText('shorten', 'pendahuluanDraft')}
                    disabled={isLoading || !projectData.pendahuluanDraft}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                >
                    Buat Versi Pendek
                </button>
                <button 
                    onClick={() => handleModifyText('medium', 'pendahuluanDraft')}
                    disabled={isLoading || !projectData.pendahuluanDraft}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                >
                    Buat Versi Sedang
                </button>
                <button 
                    onClick={() => handleModifyText('lengthen', 'pendahuluanDraft')}
                    disabled={isLoading || !projectData.pendahuluanDraft}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                >
                    Buat Versi Panjang
                </button>
            </div>
        </div>
    </div>
);

// --- Komponen untuk Tab 6: Metode Penelitian ---
const MetodePenelitian = ({ projectData, setProjectData, handleGenerateMetode, isLoading, handleCopyToClipboard, handleModifyText }) => (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Metode Penelitian</h2>
        <p className="text-gray-700 mb-4">Gunakan informasi dari Tab 1 untuk menghasilkan draf bab metode penelitian yang terstruktur.</p>
        <button onClick={handleGenerateMetode} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isLoading || !projectData.judulKTI}>
            {isLoading ? 'Memproses...' : '✨ Tulis Draf Bab Metode'}
        </button>

        {isLoading && !projectData.metodeDraft && (
            <div className="mt-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">AI sedang menulis draf...</p>
            </div>
        )}

        {projectData.metodeDraft && (
             <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">Draf Metode Penelitian</h3>
                    <button onClick={() => handleCopyToClipboard(projectData.metodeDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded-lg">
                        Salin Teks
                    </button>
                </div>
                <textarea
                    value={projectData.metodeDraft}
                    onChange={(e) => setProjectData(p => ({ ...p, metodeDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                ></textarea>
                {/* Fitur Modifikasi Teks */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={() => handleModifyText('shorten', 'metodeDraft')}
                            disabled={isLoading || !projectData.metodeDraft}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                        >
                            Buat Versi Pendek
                        </button>
                        <button 
                            onClick={() => handleModifyText('medium', 'metodeDraft')}
                            disabled={isLoading || !projectData.metodeDraft}
                            className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                        >
                            Buat Versi Sedang
                        </button>
                        <button 
                            onClick={() => handleModifyText('lengthen', 'metodeDraft')}
                            disabled={isLoading || !projectData.metodeDraft}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                        >
                            Buat Versi Panjang
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);

// --- Komponen untuk Tab 7: Studi Literatur ---
const StudiLiteratur = ({ projectData, setProjectData, handleGenerateStudiLiteratur, isLoading, handleCopyToClipboard, handleModifyText }) => (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Studi Literatur</h2>
        <p className="text-gray-700 mb-4">Sintesis semua kutipan dan catatan dari perpustakaan referensi Anda menjadi sebuah narasi tinjauan pustaka yang koheren.</p>
        <button onClick={handleGenerateStudiLiteratur} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isLoading || projectData.allReferences.length === 0}>
            {isLoading ? 'Memproses...' : '✨ Tulis Draf Studi Literatur'}
        </button>

        {isLoading && !projectData.studiLiteraturDraft && (
            <div className="mt-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">AI sedang menyintesis referensi...</p>
            </div>
        )}

        {projectData.studiLiteraturDraft && (
             <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">Draf Studi Literatur</h3>
                    <button onClick={() => handleCopyToClipboard(projectData.studiLiteraturDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded-lg">
                        Salin Teks
                    </button>
                </div>
                <textarea
                    value={projectData.studiLiteraturDraft}
                    onChange={(e) => setProjectData(p => ({ ...p, studiLiteraturDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                ></textarea>
                {/* Fitur Modifikasi Teks */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={() => handleModifyText('shorten', 'studiLiteraturDraft')}
                            disabled={isLoading || !projectData.studiLiteraturDraft}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                        >
                            Buat Versi Pendek
                        </button>
                        <button 
                            onClick={() => handleModifyText('medium', 'studiLiteraturDraft')}
                            disabled={isLoading || !projectData.studiLiteraturDraft}
                            className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                        >
                            Buat Versi Sedang
                        </button>
                        <button 
                            onClick={() => handleModifyText('lengthen', 'studiLiteraturDraft')}
                            disabled={isLoading || !projectData.studiLiteraturDraft}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                        >
                            Buat Versi Panjang
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);

// --- Komponen untuk Hasil & Pembahasan ---
const HasilPembahasan = ({ projectData, setProjectData, handleGenerateHasilPembahasan, isLoading, handleCopyToClipboard, handleModifyText }) => {
    const availableDrafts = [
        { key: 'analisisKuantitatifDraft', name: 'Analisis Kuantitatif' },
        { key: 'analisisKualitatifDraft', name: 'Analisis Kualitatif' },
        { key: 'analisisVisualDraft', name: 'Analisis Visual' },
    ];

    const readyDrafts = availableDrafts.filter(d => projectData[d.key] && projectData[d.key].trim() !== '');
    const isReady = readyDrafts.length > 0;

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Hasil & Pembahasan</h2>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Daftar Periksa Kesiapan</h3>
                <p className="text-sm text-gray-700 mb-4">Fitur ini akan menyintesis draf analisis yang telah Anda simpan. Pastikan setidaknya satu draf analisis sudah selesai sebelum melanjutkan.</p>
                <ul className="space-y-2">
                    {availableDrafts.map(draft => {
                        const hasContent = projectData[draft.key] && projectData[draft.key].trim() !== '';
                        return (
                            <li key={draft.key} className="flex items-center text-sm">
                                <span className={`mr-2 ${hasContent ? 'text-green-500' : 'text-red-500'}`}>{hasContent ? '✅' : '❌'}</span>
                                {draft.name}
                            </li>
                        );
                    })}
                </ul>
            </div>

            <button 
                onClick={handleGenerateHasilPembahasan} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={isLoading || !isReady}
            >
                {isLoading ? 'Memproses...' : '✨ Tulis Draf Bab Hasil & Pembahasan'}
            </button>
            {!isReady && <p className="text-xs text-red-600 mt-2">Tombol dinonaktifkan karena belum ada draf analisis yang disimpan.</p>}


            {isLoading && !projectData.hasilPembahasanDraft && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang menyintesis semua temuan Anda...</p>
                </div>
            )}

            {projectData.hasilPembahasanDraft && (
                 <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-gray-800">Draf Hasil & Pembahasan</h3>
                        <button onClick={() => handleCopyToClipboard(projectData.hasilPembahasanDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded-lg">
                            Salin Teks
                        </button>
                    </div>
                    <textarea
                        value={projectData.hasilPembahasanDraft}
                        onChange={(e) => setProjectData(p => ({ ...p, hasilPembahasanDraft: e.target.value }))}
                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                        rows="25"
                    ></textarea>
                    {/* Fitur Modifikasi Teks */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleModifyText('shorten', 'hasilPembahasanDraft')}
                                disabled={isLoading || !projectData.hasilPembahasanDraft}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                            >
                                Buat Versi Pendek
                            </button>
                            <button 
                                onClick={() => handleModifyText('medium', 'hasilPembahasanDraft')}
                                disabled={isLoading || !projectData.hasilPembahasanDraft}
                                className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                            >
                                Buat Versi Sedang
                            </button>
                            <button 
                                onClick={() => handleModifyText('lengthen', 'hasilPembahasanDraft')}
                                disabled={isLoading || !projectData.hasilPembahasanDraft}
                                className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                            >
                                Buat Versi Panjang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Komponen untuk Instrumen: Generator Variabel ---
const GeneratorVariabel = ({ projectData, setProjectData, handleGenerateVariabel, isLoading, showInfoModal }) => {
    // State lokal untuk menampung hasil dari AI sebelum disimpan
    const [suggestedVariables, setSuggestedVariables] = useState(null);
    // State lokal untuk mode penyuntingan
    const [editingVariables, setEditingVariables] = useState(null);

    // Efek untuk menginisialisasi state ketika hasil AI diterima dari projectData
    useEffect(() => {
        if (projectData.aiSuggestedVariables) {
            setSuggestedVariables(projectData.aiSuggestedVariables);
            setEditingVariables(projectData.aiSuggestedVariables); // Langsung masuk mode edit
        } else {
             // Reset jika tidak ada saran (misalnya setelah menyimpan)
            setSuggestedVariables(null);
            setEditingVariables(null);
        }
    }, [projectData.aiSuggestedVariables]);

    const handleSave = () => {
        if (editingVariables) {
            setProjectData(p => ({
                ...p,
                variabelTerikat: editingVariables.variabel_terikat,
                variabelBebas: editingVariables.variabel_bebas,
                aiSuggestedVariables: null // Hapus data sementara setelah disimpan
            }));
            showInfoModal("Variabel berhasil disimpan ke proyek!");
        }
    };
    
    const handleEditBebas = (index, value) => {
        const newBebas = [...editingVariables.variabel_bebas];
        newBebas[index] = value;
        setEditingVariables(prev => ({ ...prev, variabel_bebas: newBebas }));
    };

    const handleAddBebas = () => {
        setEditingVariables(prev => ({ ...prev, variabel_bebas: [...prev.variabel_bebas, ''] }));
    };
    
    const handleRemoveBebas = (index) => {
        const newBebas = editingVariables.variabel_bebas.filter((_, i) => i !== index);
        setEditingVariables(prev => ({ ...prev, variabel_bebas: newBebas }));
    };

    // Tampilan jika variabel sudah ada di projectData dan tidak ada saran baru
    if (projectData.variabelTerikat && !suggestedVariables) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Variabel Penelitian</h2>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Variabel yang Telah Ditetapkan</h3>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Variabel Terikat (Y):</p>
                        <p className="mb-3 text-gray-800">{projectData.variabelTerikat}</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Variabel Bebas (X):</p>
                        <ul className="list-disc list-inside text-gray-800">
                           {projectData.variabelBebas.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                    </div>
                    <button onClick={handleGenerateVariabel} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm disabled:bg-yellow-300" disabled={isLoading}>
                        {isLoading ? 'Memproses...' : 'Edit atau Hasilkan Ulang'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator Variabel Penelitian</h2>
            <p className="text-gray-700 mb-4">Berdasarkan judul dan topik Anda, AI akan menyarankan variabel terikat (Y) dan variabel bebas (X) yang umum digunakan dalam penelitian kuantitatif.</p>
            
            <button onClick={handleGenerateVariabel} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isLoading || !projectData.judulKTI}>
                {isLoading ? 'Memproses...' : '✨ Hasilkan Variabel Penelitian'}
            </button>

            {isLoading && !suggestedVariables && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang mengidentifikasi variabel...</p>
                </div>
            )}

            {editingVariables && (
                 <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Konfirmasi & Sunting Variabel</h3>
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Variabel Terikat (Y):</label>
                            <input 
                                type="text" 
                                value={editingVariables.variabel_terikat} 
                                onChange={e => setEditingVariables(prev => ({ ...prev, variabel_terikat: e.target.value }))} 
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            />
                        </div>
                         <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Variabel Bebas (X):</label>
                            {editingVariables.variabel_bebas.map((v, index) => (
                                <div key={index} className="flex items-center gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        value={v} 
                                        onChange={e => handleEditBebas(index, e.target.value)} 
                                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                    />
                                    <button onClick={() => handleRemoveBebas(index)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-lg text-sm flex items-center justify-center h-10 w-10">
                                        X
                                    </button>
                                </div>
                            ))}
                             <button onClick={handleAddBebas} className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
                                + Tambah Variabel Bebas
                            </button>
                        </div>
                        <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                            Simpan Variabel ke Proyek
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Instrumen: Generator Hipotesis ---
const GeneratorHipotesis = ({ projectData, setProjectData, handleGenerateHipotesis, isLoading, showInfoModal }) => {
    const [editingHypotheses, setEditingHypotheses] = useState(null);

    useEffect(() => {
        if (projectData.aiSuggestedHypotheses) {
            setEditingHypotheses(projectData.aiSuggestedHypotheses);
        } else {
            setEditingHypotheses(null);
        }
    }, [projectData.aiSuggestedHypotheses]);

    const handleSave = () => {
        if (editingHypotheses) {
            // Menggabungkan H1 dan H0 menjadi satu array string
            const finalHypotheses = editingHypotheses.flatMap(h => [h.h1, h.h0]).filter(Boolean);
            setProjectData(p => ({
                ...p,
                hipotesis: finalHypotheses,
                aiSuggestedHypotheses: null // Hapus data sementara setelah disimpan
            }));
            showInfoModal("Hipotesis berhasil disimpan ke proyek!");
        }
    };
    
    const handleEdit = (index, type, value) => {
        const newHypotheses = [...editingHypotheses];
        newHypotheses[index][type] = value;
        setEditingHypotheses(newHypotheses);
    };

    // Kondisi 1: Variabel belum ada
    if (!projectData.variabelTerikat || projectData.variabelBebas.length === 0) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator Hipotesis</h2>
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-lg">
                    <p className="font-bold">Aksi Dibutuhkan</p>
                    <p>Silakan pergi ke "Generator Variabel" dan tentukan variabel penelitian Anda terlebih dahulu sebelum membuat hipotesis.</p>
                </div>
            </div>
        );
    }

    // Kondisi 2: Hipotesis sudah ada dan tidak dalam mode edit
    if (projectData.hipotesis.length > 0 && !editingHypotheses) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Hipotesis Penelitian</h2>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Hipotesis yang Telah Ditetapkan</h3>
                    <ul className="list-decimal list-inside space-y-2 text-gray-800">
                        {projectData.hipotesis.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                    <button onClick={handleGenerateHipotesis} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm disabled:bg-yellow-300" disabled={isLoading}>
                        {isLoading ? 'Memproses...' : 'Edit atau Hasilkan Ulang'}
                    </button>
                </div>
            </div>
        );
    }

    // Kondisi 3: Tampilan utama untuk generate atau mengedit
    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator Hipotesis</h2>
            <p className="text-gray-700 mb-4">Berdasarkan variabel yang telah Anda tentukan, AI akan membuatkan draf hipotesis alternatif (H1) dan hipotesis nol (H0) untuk setiap hubungan antar variabel.</p>
            
            <button onClick={handleGenerateHipotesis} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300" disabled={isLoading}>
                {isLoading ? 'Memproses...' : '✨ Hasilkan Hipotesis'}
            </button>

            {isLoading && !editingHypotheses && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang merumuskan hipotesis...</p>
                </div>
            )}

            {editingHypotheses && (
                 <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Konfirmasi & Sunting Hipotesis</h3>
                    <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
                        {editingHypotheses.map((hypo, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-white">
                                <p className="text-sm font-semibold text-gray-600 mb-2">Pasangan Hipotesis {index + 1}</p>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-gray-700 text-sm font-bold mb-1">Hipotesis Alternatif (H{index + 1}):</label>
                                        <input 
                                            type="text" 
                                            value={hypo.h1} 
                                            onChange={e => handleEdit(index, 'h1', e.target.value)}
                                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 text-sm font-bold mb-1">Hipotesis Nol (H{index + 1}o):</label>
                                        <input 
                                            type="text" 
                                            value={hypo.h0} 
                                            onChange={e => handleEdit(index, 'h0', e.target.value)}
                                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                            Simpan Hipotesis ke Proyek
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Instrumen: Generator Kuesioner ---
const GeneratorKuesioner = ({ projectData, setProjectData, handleGenerateKuesioner, isLoading, showInfoModal }) => {
    const [editingKuesioner, setEditingKuesioner] = useState(null);

    useEffect(() => {
        if (projectData.aiSuggestedKuesioner) {
            // Deep copy untuk menghindari mutasi state asli
            setEditingKuesioner(JSON.parse(JSON.stringify(projectData.aiSuggestedKuesioner)));
        } else {
            setEditingKuesioner(null);
        }
    }, [projectData.aiSuggestedKuesioner]);

    const handleSave = () => {
        if (editingKuesioner) {
            setProjectData(p => ({
                ...p,
                itemKuesioner: editingKuesioner,
                aiSuggestedKuesioner: null
            }));
            showInfoModal("Kuesioner berhasil disimpan ke proyek!");
        }
    };

    const handleItemChange = (varIndex, itemIndex, value) => {
        const newKuesioner = [...editingKuesioner];
        newKuesioner[varIndex].item_kuesioner[itemIndex] = value;
        setEditingKuesioner(newKuesioner);
    };

    const handleAddItem = (varIndex) => {
        const newKuesioner = [...editingKuesioner];
        newKuesioner[varIndex].item_kuesioner.push("Pernyataan baru...");
        setEditingKuesioner(newKuesioner);
    };

    const handleRemoveItem = (varIndex, itemIndex) => {
        const newKuesioner = [...editingKuesioner];
        newKuesioner[varIndex].item_kuesioner.splice(itemIndex, 1);
        setEditingKuesioner(newKuesioner);
    };

    // Kondisi 1: Prasyarat tidak terpenuhi
    if (!projectData.variabelTerikat || projectData.variabelBebas.length === 0) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator Kuesioner</h2>
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-lg">
                    <p className="font-bold">Aksi Dibutuhkan</p>
                    <p>Harap definisikan variabel Anda di menu 'Generator Variabel' terlebih dahulu.</p>
                </div>
            </div>
        );
    }

    // Kondisi 2: Kuesioner sudah ada di proyek dan tidak dalam mode edit
    if (projectData.itemKuesioner.length > 0 && !editingKuesioner) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Kuesioner Penelitian</h2>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Item Kuesioner yang Telah Disimpan</h3>
                    {projectData.itemKuesioner.map((variabel, varIndex) => (
                        <div key={varIndex} className="mb-4">
                            <h4 className="font-bold text-gray-700">{variabel.nama_variabel}</h4>
                            <ul className="list-decimal list-inside ml-4 text-gray-800">
                                {variabel.item_kuesioner.map((item, itemIndex) => (
                                    <li key={itemIndex}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <button onClick={handleGenerateKuesioner} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm disabled:bg-yellow-300" disabled={isLoading}>
                        {isLoading ? 'Memproses...' : 'Edit atau Hasilkan Ulang'}
                    </button>
                </div>
            </div>
        );
    }

    // Kondisi 3: Tampilan utama untuk generate atau mengedit
    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator Kuesioner</h2>
            <p className="text-gray-700 mb-4">Berdasarkan variabel yang telah Anda tentukan, AI akan membuatkan draf item pernyataan untuk kuesioner Anda.</p>
            
            <button onClick={handleGenerateKuesioner} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300" disabled={isLoading}>
                {isLoading ? 'Memproses...' : '✨ Hasilkan Draf Kuesioner'}
            </button>

            {isLoading && !editingKuesioner && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang menyusun item kuesioner...</p>
                </div>
            )}

            {editingKuesioner && (
                 <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Konfirmasi & Sunting Draf Kuesioner</h3>
                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-lg mb-4">
                        <b>Catatan:</b> Ini adalah draf awal. Anda bertanggung jawab penuh untuk meninjau, menyempurnakan, dan melakukan uji validitas & reliabilitas statistik pada instrumen final.
                    </div>
                    <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
                        {editingKuesioner.map((variabel, varIndex) => (
                            <div key={varIndex} className="p-4 border rounded-lg bg-white shadow-sm">
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">{variabel.nama_variabel}</h4>
                                <div className="space-y-2">
                                    {variabel.item_kuesioner.map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                value={item} 
                                                onChange={e => handleItemChange(varIndex, itemIndex, e.target.value)}
                                                className="shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                            />
                                            <button onClick={() => handleRemoveItem(varIndex, itemIndex)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-lg text-sm flex-shrink-0">X</button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleAddItem(varIndex)} className="mt-3 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
                                    + Tambah Item
                                </button>
                            </div>
                        ))}
                        <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                            Simpan Kuesioner ke Proyek
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Instrumen: Generator Pertanyaan Wawancara ---
const GeneratorWawancara = ({ projectData, setProjectData, handleGenerateWawancara, isLoading, showInfoModal }) => {
    const [editingWawancara, setEditingWawancara] = useState(null);

    useEffect(() => {
        if (projectData.aiSuggestedWawancara) {
            setEditingWawancara(JSON.parse(JSON.stringify(projectData.aiSuggestedWawancara)));
        } else {
            setEditingWawancara(null);
        }
    }, [projectData.aiSuggestedWawancara]);

    const handleSave = () => {
        if (editingWawancara) {
            // Menyimpan seluruh struktur ke pertanyaanWawancara
            setProjectData(p => ({
                ...p,
                pertanyaanWawancara: editingWawancara,
                aiSuggestedWawancara: null
            }));
            showInfoModal("Panduan wawancara berhasil disimpan ke proyek!");
        }
    };

    const handleQuestionChange = (catIndex, qIndex, value) => {
        const newWawancara = [...editingWawancara];
        newWawancara[catIndex].pertanyaan[qIndex] = value;
        setEditingWawancara(newWawancara);
    };

    const handleAddQuestion = (catIndex) => {
        const newWawancara = [...editingWawancara];
        newWawancara[catIndex].pertanyaan.push("Pertanyaan baru...");
        setEditingWawancara(newWawancara);
    };

    const handleRemoveQuestion = (catIndex, qIndex) => {
        const newWawancara = [...editingWawancara];
        newWawancara[catIndex].pertanyaan.splice(qIndex, 1);
        setEditingWawancara(newWawancara);
    };

    // Kondisi 1: Prasyarat tidak terpenuhi
    if (!projectData.judulKTI || !projectData.tujuanPenelitianDraft) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator Pertanyaan Wawancara</h2>
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-lg">
                    <p className="font-bold">Aksi Dibutuhkan</p>
                    <p>Harap lengkapi 'Ide KTI' dan 'Pokok Isi KTI' (khususnya Tujuan Penelitian) terlebih dahulu.</p>
                </div>
            </div>
        );
    }

    // Kondisi 2: Panduan sudah ada dan tidak dalam mode edit
    if (projectData.pertanyaanWawancara.length > 0 && !editingWawancara) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Panduan Wawancara</h2>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Panduan Wawancara yang Telah Disimpan</h3>
                    {projectData.pertanyaanWawancara.map((kategori, catIndex) => (
                        <div key={catIndex} className="mb-4">
                            <h4 className="font-bold text-gray-700">{kategori.kategori}</h4>
                            <p className="text-sm italic text-gray-600 mb-2">{kategori.deskripsi_kategori}</p>
                            <ul className="list-decimal list-inside ml-4 text-gray-800">
                                {kategori.pertanyaan.map((item, itemIndex) => (
                                    <li key={itemIndex}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <button onClick={handleGenerateWawancara} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm disabled:bg-yellow-300" disabled={isLoading}>
                        {isLoading ? 'Memproses...' : 'Edit atau Hasilkan Ulang'}
                    </button>
                </div>
            </div>
        );
    }
    
    // Kondisi 3: Tampilan utama
    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator Pertanyaan Wawancara</h2>
            <p className="text-gray-700 mb-4">Berdasarkan tujuan penelitian Anda, AI akan membuatkan draf panduan wawancara semi-terstruktur.</p>
            
            <button onClick={handleGenerateWawancara} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300" disabled={isLoading}>
                {isLoading ? 'Memproses...' : '✨ Hasilkan Draf Panduan Wawancara'}
            </button>

            {isLoading && !editingWawancara && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang merancang pertanyaan...</p>
                </div>
            )}

            {editingWawancara && (
                 <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Konfirmasi & Sunting Draf Panduan Wawancara</h3>
                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-lg mb-4">
                        <b>Catatan:</b> Ini adalah draf awal. Anda bertanggung jawab untuk menyesuaikan pertanyaan agar sesuai dengan konteks dan informan Anda.
                    </div>
                    <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
                        {editingWawancara.map((kategori, catIndex) => (
                            <div key={catIndex} className="p-4 border rounded-lg bg-white shadow-sm">
                                <h4 className="text-lg font-semibold text-gray-800">{kategori.kategori}</h4>
                                <p className="text-sm italic text-gray-600 mb-3">{kategori.deskripsi_kategori}</p>
                                <div className="space-y-2">
                                    {kategori.pertanyaan.map((item, qIndex) => (
                                        <div key={qIndex} className="flex items-center gap-2">
                                            {/* PERUBAHAN: Mengganti input dengan textarea */}
                                            <textarea 
                                                value={item} 
                                                onChange={e => handleQuestionChange(catIndex, qIndex, e.target.value)}
                                                className="shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                                rows="2"
                                            />
                                            <button onClick={() => handleRemoveQuestion(catIndex, qIndex)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-lg text-sm flex-shrink-0">X</button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleAddQuestion(catIndex)} className="mt-3 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
                                    + Tambah Pertanyaan
                                </button>
                            </div>
                        ))}
                        <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                            Simpan Panduan ke Proyek
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Instrumen: Generator & Log Kueri ---
const GeneratorLogKueri = ({ 
    projectData, 
    setProjectData, 
    handleGenerateQueries, 
    isLoading, 
    showInfoModal, 
    lastCopiedQuery, 
    handleCopyQuery, 
    handleDeleteLog,
    includeIndonesianQuery,
    setIncludeIndonesianQuery
}) => {
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logEntry, setLogEntry] = useState({
        resultsCount: '',
        searchDate: new Date().toISOString().slice(0, 10)
    });

    const handleOpenLogModal = () => {
        if (!lastCopiedQuery.query) {
            showInfoModal("Silakan salin sebuah kueri terlebih dahulu untuk dicatat ke dalam log.");
            return;
        }
        setLogEntry(prev => ({
            ...prev,
            searchDate: new Date().toISOString().slice(0, 10) // Reset tanggal setiap buka modal
        }));
        setIsLogModalOpen(true);
    };

    const handleSaveLog = () => {
        if (!logEntry.resultsCount) {
            showInfoModal("Jumlah dokumen ditemukan tidak boleh kosong.");
            return;
        }
        const newLog = {
            id: Date.now(),
            query: lastCopiedQuery.query,
            database: projectData.queryGeneratorTargetDB,
            resultsCount: parseInt(logEntry.resultsCount, 10),
            searchDate: logEntry.searchDate
        };
        setProjectData(p => ({
            ...p,
            searchLog: [...p.searchLog, newLog]
        }));
        setIsLogModalOpen(false);
        setLogEntry({ resultsCount: '', searchDate: new Date().toISOString().slice(0, 10) }); // Reset form
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            {isLogModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Tambah Entri Log Penelusuran</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Kueri:</label>
                                <p className="text-sm bg-gray-100 p-2 rounded-md font-mono">{lastCopiedQuery.query}</p>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Database:</label>
                                <p className="text-sm bg-gray-100 p-2 rounded-md">{projectData.queryGeneratorTargetDB}</p>
                            </div>
                             <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Jumlah Dokumen Ditemukan:</label>
                                <input type="number" value={logEntry.resultsCount} onChange={e => setLogEntry({...logEntry, resultsCount: e.target.value})} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" />
                            </div>
                             <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal Penelusuran:</label>
                                <input type="date" value={logEntry.searchDate} onChange={e => setLogEntry({...logEntry, searchDate: e.target.value})} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsLogModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleSaveLog} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan Log</button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator & Log Kueri</h2>
            <p className="text-gray-700 mb-4">Alat ini membantu Anda membuat dan mendokumentasikan kueri pencarian secara sistematis, sebuah syarat wajib untuk penelitian SLR/Bibliometrik yang valid.</p>
            
            <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 mb-8">
                <h3 className="text-lg font-semibold mb-3 text-blue-800">Langkah 1: Hasilkan Kueri Berjenjang</h3>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Pilih Database Target:</label>
                    <select 
                        value={projectData.queryGeneratorTargetDB} 
                        onChange={(e) => setProjectData(p => ({...p, queryGeneratorTargetDB: e.target.value}))} 
                        className="shadow appearance-none border rounded-lg w-full md:w-1/2 py-2 px-3 text-gray-700"
                    >
                        <option value="Scopus">Scopus</option>
                        <option value="Web of Science">Web of Science</option>
                        <option value="Google Scholar">Google Scholar</option>
                        <option value="Lainnya">Lainnya (Umum)</option>
                    </select>
                </div>
                {/* PERUBAHAN: Checkbox untuk Bahasa Indonesia */}
                <div className="mb-4">
                    <label className="flex items-center">
                        <input 
                            type="checkbox" 
                            checked={includeIndonesianQuery} 
                            onChange={(e) => setIncludeIndonesianQuery(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-gray-700 text-sm">Sertakan padanan Bahasa Indonesia?</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 pl-6">Catatan: Opsi ini dapat mengurangi presisi hasil pada database internasional.</p>
                </div>
                <button onClick={handleGenerateQueries} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300" disabled={isLoading || !projectData.judulKTI}>
                    {isLoading ? 'Memproses...' : '✨ Hasilkan Kueri Berjenjang'}
                </button>
            </div>

            {isLoading && !projectData.aiGeneratedQueries && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang merancang strategi pencarian...</p>
                </div>
            )}

            {projectData.aiGeneratedQueries && (
                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Kueri yang Dihasilkan</h3>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2">Level</th>
                                    <th className="px-4 py-2">Penjelasan</th>
                                    <th className="px-4 py-2">Kueri</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectData.aiGeneratedQueries.map((q, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-semibold">{q.level}</td>
                                        <td className="px-4 py-3 text-xs">{q.penjelasan}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <code className="text-xs bg-gray-200 p-2 rounded-md block whitespace-pre-wrap">{q.kueri}</code>
                                                <button onClick={() => handleCopyQuery(q.kueri)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold p-2 rounded-lg flex-shrink-0">
                                                    <CopyIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic">Catatan: AI menghasilkan kueri berdasarkan praktik umum. Selalu verifikasi sintaks di situs web database target sebelum menjalankan.</p>
                </div>
            )}

            <div className="mt-10 pt-8 border-t-2 border-dashed border-gray-300">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Langkah 2: Log Penelusuran (Logbook)</h3>
                    <button onClick={handleOpenLogModal} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                        + Tambah Log Baru
                    </button>
                </div>
                 {projectData.searchLog.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2">Tanggal</th>
                                    <th className="px-4 py-2">Database</th>
                                    <th className="px-4 py-2">Kueri</th>
                                    <th className="px-4 py-2">Hasil</th>
                                    <th className="px-4 py-2">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectData.searchLog.map(log => (
                                    <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3">{log.searchDate}</td>
                                        <td className="px-4 py-3">{log.database}</td>
                                        <td className="px-4 py-3"><code className="text-xs bg-gray-100 p-1 rounded">{log.query}</code></td>
                                        <td className="px-4 py-3 font-semibold">{log.resultsCount}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleDeleteLog(log.id)} className="text-red-500 hover:text-red-700 p-1">
                                                <DeleteIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <p>Log penelusuran Anda masih kosong.</p>
                        <p className="text-sm">Hasilkan kueri, jalankan, lalu catat hasilnya di sini.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};


// --- Komponen untuk Analisis Data Kuantitatif (Fungsional) ---
const AnalisisKuantitatif = ({ projectData, setProjectData, handleGenerateAnalisis, isLoading, showInfoModal, setCurrentSection }) => {
    const [fileName, setFileName] = useState('');
    const [dataPreview, setDataPreview] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFileName(selectedFile.name);
            
            if (typeof window.Papa === 'undefined') {
                showInfoModal("Library parsing CSV belum siap. Coba lagi sesaat.");
                return;
            }

            window.Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if(results.data.length > 0) {
                        setDataPreview(results.data.slice(0, 5)); // Pratinjau 5 baris pertama
                        setParsedData(results.data);
                    } else {
                        showInfoModal("File CSV kosong atau tidak memiliki header.");
                    }
                },
                error: (error) => {
                    showInfoModal(`Gagal mem-parsing file CSV: ${error.message}`);
                    console.error("CSV Parse Error:", error);
                }
            });

        } else {
            showInfoModal("Harap pilih file dengan format .csv");
        }
        event.target.value = null; // Reset input file
    };

    const triggerFileSelect = () => {
        fileInputRef.current.click();
    };

    const handleAnalysisSelection = (type) => {
        if (type === 'konfirmatif' && (!projectData.hipotesis || projectData.hipotesis.length === 0)) {
            showInfoModal("Analisis Konfirmatif memerlukan hipotesis. Silakan buat hipotesis terlebih dahulu di menu 'Generator Hipotesis'.");
            return;
        }
        handleGenerateAnalisis(parsedData, type);
    };

    const handleSaveAnalysis = () => {
        setProjectData(p => ({ ...p, analisisKuantitatifDraft: p.analisisKuantitatifHasil }));
        showInfoModal("Hasil analisis berhasil disimpan ke draf proyek.");
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Analisis Data Kuantitatif (Tabel)</h2>
            <p className="text-gray-700 mb-4">Unggah data hasil kuesioner atau ekstraksi SLR Anda dalam format .csv. AI akan membantu menganalisis data tersebut dalam konteks penelitian Anda.</p>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".csv" />
            
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <button onClick={triggerFileSelect} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                    Pilih File .csv
                </button>
                {fileName && <p className="text-sm text-gray-600 mt-2">File terpilih: {fileName}</p>}
            </div>

            {dataPreview && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">Pratinjau Data (5 baris pertama)</h3>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    {Object.keys(dataPreview[0]).map(header => <th key={header} className="px-4 py-2">{header}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {dataPreview.map((row, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        {Object.values(row).map((cell, i) => <td key={i} className="px-4 py-2">{cell}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {parsedData && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Pilih Jenis Analisis:</h3>
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={() => handleAnalysisSelection('konfirmatif')} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Menganalisis...' : 'Analisis Konfirmatif (Uji Hipotesis)'}
                        </button>
                        <button 
                            onClick={() => handleAnalysisSelection('eksploratif')} 
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Menganalisis...' : 'Analisis Eksploratif (Temukan Wawasan)'}
                        </button>
                    </div>
                </div>
            )}


            {isLoading && !projectData.analisisKuantitatifHasil && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang menganalisis data Anda...</p>
                </div>
            )}

            {projectData.analisisKuantitatifHasil && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Hasil Analisis AI</h3>
                    <textarea
                        value={projectData.analisisKuantitatifHasil}
                        onChange={(e) => setProjectData(p => ({ ...p, analisisKuantitatifHasil: e.target.value }))}
                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                        rows="20"
                    ></textarea>
                    <button onClick={handleSaveAnalysis} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                        Simpan Hasil Analisis
                    </button>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Analisis Data Kualitatif (Fungsional) ---
const AnalisisKualitatif = ({ projectData, setProjectData, handleGenerateAnalisisKualitatif, isLoading, showInfoModal }) => {
    const [fileContent, setFileContent] = useState('');
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                setFileContent(text);
                setFileName(file.name);
            };
            reader.onerror = (e) => {
                showInfoModal("Gagal membaca file.");
                console.error("File reading error:", e);
            };
            reader.readAsText(file);
        } else {
            showInfoModal("Harap pilih file dengan format .txt");
        }
        event.target.value = null; // Reset input file
    };

    const triggerFileSelect = () => {
        fileInputRef.current.click();
    };
    
    const handleAnalysis = () => {
        if (!fileContent) {
            showInfoModal("Tidak ada konten untuk dianalisis. Unggah file .txt terlebih dahulu.");
            return;
        }
        handleGenerateAnalisisKualitatif(fileContent);
    };

    const handleSaveAnalysis = () => {
        // Menggabungkan hasil terstruktur menjadi draf narasi
        if (projectData.analisisKualitatifHasil) {
            const narrative = projectData.analisisKualitatifHasil.map(theme => 
                `Tema: ${theme.tema}\n\n${theme.deskripsi}\n\nKutipan Pendukung:\n${theme.kutipan_pendukung.map(q => `- "${q}"`).join('\n')}`
            ).join('\n\n---\n\n');
            setProjectData(p => ({ ...p, analisisKualitatifDraft: narrative }));
            showInfoModal("Hasil analisis tematik berhasil disimpan ke draf proyek.");
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Analisis Data Kualitatif (Dokumen)</h2>
            <p className="text-gray-700 mb-4">Unggah transkrip wawancara atau dokumen teks lainnya dalam format .txt. AI akan membantu Anda melakukan analisis tematik untuk menemukan pola dan wawasan kunci.</p>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".txt" />
            
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <button onClick={triggerFileSelect} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                    Pilih File .txt
                </button>
                {fileName && <p className="text-sm text-gray-600 mt-2">File terpilih: {fileName}</p>}
            </div>

            {fileContent && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">Pratinjau Teks</h3>
                    <textarea
                        value={fileContent}
                        readOnly
                        className="shadow-inner border rounded-lg w-full p-3 text-sm text-gray-700 bg-gray-100 h-40"
                    ></textarea>
                </div>
            )}
            
            {fileContent && (
                 <div className="mt-6 pt-6 border-t border-gray-200">
                    <button 
                        onClick={handleAnalysis} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Menganalisis...' : '✨ Lakukan Analisis Tematik'}
                    </button>
                </div>
            )}
            
            {isLoading && !projectData.analisisKualitatifHasil && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang melakukan analisis tematik...</p>
                </div>
            )}

            {projectData.analisisKualitatifHasil && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Hasil Analisis Tematik AI</h3>
                    <div className="space-y-6">
                        {projectData.analisisKualitatifHasil.map((theme, index) => (
                            <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="text-lg font-semibold text-blue-800 mb-2">{theme.tema}</h4>
                                <p className="text-gray-700 mb-3">{theme.deskripsi}</p>
                                <div>
                                    <h5 className="text-sm font-bold text-gray-600 mb-2">Kutipan Pendukung Representatif:</h5>
                                    <div className="space-y-2">
                                        {theme.kutipan_pendukung.map((quote, qIndex) => (
                                            <blockquote key={qIndex} className="border-l-4 border-blue-300 pl-4 text-sm italic text-gray-600">
                                                "{quote}"
                                            </blockquote>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="mt-8">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Draf Narasi Analisis</h3>
                        <p className="text-sm text-gray-600 mb-2">Gunakan hasil di atas untuk menyusun narasi analisis Anda di bawah ini, atau klik simpan untuk membuat draf awal.</p>
                        <textarea
                            value={projectData.analisisKualitatifDraft}
                            onChange={(e) => setProjectData(p => ({ ...p, analisisKualitatifDraft: e.target.value }))}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                            rows="15"
                            placeholder="Susun narasi temuan Anda di sini..."
                        ></textarea>
                        <button onClick={handleSaveAnalysis} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                            Simpan Draf Narasi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Komponen untuk Analisis Visual (Gambar) ---
const AnalisisVisual = ({ projectData, setProjectData, handleGenerateAnalisisVisual, isLoading, showInfoModal }) => {
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [analysisFocus, setAnalysisFocus] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                // Menyimpan file dan data base64
                const base64Data = reader.result.split(',')[1];
                setImageFile({
                    mimeType: file.type,
                    data: base64Data
                });
            };
            reader.onerror = () => showInfoModal("Gagal membaca file gambar.");
            reader.readAsDataURL(file);
        } else {
            showInfoModal("Harap pilih file dengan format .png atau .jpg/.jpeg");
        }
        event.target.value = null;
    };

    const triggerFileSelect = () => {
        fileInputRef.current.click();
    };

    const handleAnalysis = () => {
        if (!imageFile) {
            showInfoModal("Unggah file gambar terlebih dahulu.");
            return;
        }
        handleGenerateAnalisisVisual(imageFile, analysisFocus);
    };

    const handleSaveAnalysis = () => {
        const narrative = `Deskripsi Gambar:\n${projectData.deskripsiVisualisasi}\n\nInterpretasi & Analisis:\n${projectData.interpretasiData}`;
        setProjectData(p => ({ ...p, analisisVisualDraft: narrative }));
        showInfoModal("Hasil analisis visual berhasil disimpan ke draf proyek.");
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Analisis Visual (Gambar)</h2>
            <p className="text-gray-700 mb-4">Unggah gambar (.png, .jpg) seperti peta VOSviewer, grafik, atau diagram. AI akan membantu mendeskripsikan dan menginterpretasikannya dalam konteks penelitian Anda.</p>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/png, image/jpeg" />
            
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <button onClick={triggerFileSelect} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                    Pilih File Gambar
                </button>
            </div>

            {imagePreview && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">Pratinjau Gambar</h3>
                    <div className="border rounded-lg p-2 flex justify-center bg-gray-100">
                        <img src={imagePreview} alt="Pratinjau" className="max-w-full max-h-80 object-contain" />
                    </div>
                </div>
            )}

            {imagePreview && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Fokus Analisis Spesifik (Opsional):</label>
                        <input 
                            type="text"
                            value={analysisFocus}
                            onChange={(e) => setAnalysisFocus(e.target.value)}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            placeholder="Contoh: Fokus pada klaster merah dan hubungannya dengan 'inovasi'."
                        />
                    </div>
                    <button 
                        onClick={handleAnalysis} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Menganalisis...' : '✨ Analisis Gambar dengan AI'}
                    </button>
                </div>
            )}

            {isLoading && !projectData.deskripsiVisualisasi && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang menganalisis gambar...</p>
                </div>
            )}

            {projectData.deskripsiVisualisasi && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Hasil Analisis Visual AI</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Deskripsi Gambar:</label>
                            <textarea
                                value={projectData.deskripsiVisualisasi}
                                onChange={(e) => setProjectData(p => ({ ...p, deskripsiVisualisasi: e.target.value }))}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                                rows="5"
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Interpretasi & Analisis:</label>
                            <textarea
                                value={projectData.interpretasiData}
                                onChange={(e) => setProjectData(p => ({ ...p, interpretasiData: e.target.value }))}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                                rows="8"
                            ></textarea>
                        </div>
                        <button onClick={handleSaveAnalysis} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                            Simpan Hasil Analisis
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Komponen untuk Kesimpulan ---
const Kesimpulan = ({ projectData, setProjectData, handleGenerateKesimpulan, isLoading, handleCopyToClipboard, handleModifyText }) => {
    const prerequisites = [
        { key: 'pendahuluanDraft', name: 'Draf Pendahuluan' },
        { key: 'metodeDraft', name: 'Draf Metode Penelitian' },
        { key: 'hasilPembahasanDraft', name: 'Draf Hasil & Pembahasan' },
    ];

    const isReady = prerequisites.every(p => projectData[p.key] && projectData[p.key].trim() !== '');

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Kesimpulan & Rencana Aksi</h2>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Generator Kesimpulan</h3>
                <p className="text-sm text-gray-700 mb-4">Fitur ini akan menyintesis keseluruhan proyek Anda—mulai dari pendahuluan, metode, hingga hasil—untuk menghasilkan draf bab kesimpulan yang komprehensif.</p>
                <div className="mb-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-2">Daftar Periksa Kesiapan:</h4>
                    <ul className="space-y-2">
                        {prerequisites.map(p => {
                            const hasContent = projectData[p.key] && projectData[p.key].trim() !== '';
                            return (
                                <li key={p.key} className="flex items-center text-sm">
                                    <span className={`mr-2 ${hasContent ? 'text-green-500' : 'text-red-500'}`}>{hasContent ? '✅' : '❌'}</span>
                                    {p.name}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <button 
                    onClick={handleGenerateKesimpulan} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                    disabled={isLoading || !isReady}
                >
                    {isLoading ? 'Memproses...' : '✨ Tulis Draf Bab Kesimpulan'}
                </button>
                {!isReady && <p className="text-xs text-red-600 mt-2">Tombol dinonaktifkan karena belum semua draf prasyarat selesai.</p>}
            </div>

            {isLoading && !projectData.kesimpulanDraft && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang menyusun kesimpulan...</p>
                </div>
            )}

            {projectData.kesimpulanDraft && (
                 <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-gray-800">Draf Bab Kesimpulan</h3>
                        <button onClick={() => handleCopyToClipboard(projectData.kesimpulanDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded-lg">
                            Salin Teks
                        </button>
                    </div>
                    <textarea
                        value={projectData.kesimpulanDraft}
                        onChange={(e) => setProjectData(p => ({ ...p, kesimpulanDraft: e.target.value }))}
                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                        rows="25"
                    ></textarea>
                    {/* Fitur Modifikasi Teks */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleModifyText('shorten', 'kesimpulanDraft')}
                                disabled={isLoading || !projectData.kesimpulanDraft}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                            >
                                Buat Versi Pendek
                            </button>
                            <button 
                                onClick={() => handleModifyText('medium', 'kesimpulanDraft')}
                                disabled={isLoading || !projectData.kesimpulanDraft}
                                className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                            >
                                Buat Versi Sedang
                            </button>
                            <button 
                                onClick={() => handleModifyText('lengthen', 'kesimpulanDraft')}
                                disabled={isLoading || !projectData.kesimpulanDraft}
                                className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                            >
                                Buat Versi Panjang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// ============================================================================
// KOMPONEN UTAMA: App
// ============================================================================

// Definisikan state awal di luar komponen agar bisa diakses kembali
const initialProjectData = {
    // Data Perencanaan
    jenisKaryaTulis: 'Artikel Ilmiah',
    jenisKaryaTulisLainnya: '',
    topikTema: '',
    pendekatan: '',
    metode: '',
    periode: '',
    basisData: '',
    tools: '',
    judulKTI: '',
    kataKunci: '',
    penjelasan: '',
    allReferences: [],
    aiReferenceClues: null,
    
    // Data Instrumen
    aiSuggestedVariables: null,
    variabelTerikat: '',
    variabelBebas: [],
    aiSuggestedHypotheses: null,
    hipotesis: [],
    aiSuggestedKuesioner: null,
    itemKuesioner: [],
    aiSuggestedWawancara: null,
    pertanyaanWawancara: [],
    queryGeneratorTargetDB: 'Scopus',
    aiGeneratedQueries: null,
    searchLog: [],
    
    // Data Analisis
    analisisKuantitatifHasil: '',
    analisisKuantitatifDraft: '',
    analisisKualitatifHasil: null,
    analisisKualitatifDraft: '',
    deskripsiVisualisasi: '',
    interpretasiData: '',
    analisisVisualDraft: '',

    // Data Draf Bab
    faktaMasalahDraft: '',
    tujuanPenelitianDraft: '',
    teoriPenelitianDraft: '',
    outlineDraft: null,
    pendahuluanDraft: '',
    metodeDraft: '',
    studiLiteraturDraft: '',
    hasilPembahasanDraft: '',
    kesimpulanDraft: '',
};

function App() {
    const [currentSection, setCurrentSection] = useState('ideKTI');
    const [projectData, setProjectData] = useState(initialProjectData);
    
    // State untuk alur kerja Ide KTI yang baru
    const [ideKtiMode, setIdeKtiMode] = useState(null); // 'ai', 'manual', atau null
    const [editingIdea, setEditingIdea] = useState(null);
    const [aiStructuredResponse, setAiStructuredResponse] = useState(null);
    
    const [isLoading, setIsLoading] = useState(false);
    
    const manualRefTemplate = `Journal Article Title: 
Journal Name: 
Date: 
Contributing Authors: 
Editors Name: 
Volume: 
Issue: 
Pages: 
URL: 
DOI: 
Publisher Name: `;
    const [manualRef, setManualRef] = useState({ id: null, text: manualRefTemplate });
    const [freeTextRef, setFreeTextRef] = useState('');
    const [generatedApaReferences, setGeneratedApaReferences] = useState('');
    
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [showSearchPromptModal, setShowSearchPromptModal] = useState(false);
    const [aiClueNarratives, setAiClueNarratives] = useState({});
    const [geminiApiKey, setGeminiApiKey] = useState('');

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [currentEditingRef, setCurrentEditingRef] = useState(null);
    const [noteText, setNoteText] = useState('');
    
    const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
    const [clarificationQuestions, setClarificationQuestions] = useState([]);
    const [clarificationAnswers, setClarificationAnswers] = useState({});
    
    const importInputRef = useRef(null);
    const importReferencesInputRef = useRef(null);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [importedData, setImportedData] = useState(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openCategories, setOpenCategories] = useState([]);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [lastCopiedQuery, setLastCopiedQuery] = useState({ query: '', database: '' });
    
    const [includeIndonesianQuery, setIncludeIndonesianQuery] = useState(false);


    // Efek untuk menampilkan pop-up selamat datang
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
        if (!hasSeenWelcome) {
            setShowWelcomeModal(true);
        }
    }, []);

    // Efek untuk memuat data proyek dan kunci API dari localStorage saat komponen dimuat
    useEffect(() => {
        try {
            const savedData = localStorage.getItem('kti-bibliometric-project');
            const savedGeminiKey = localStorage.getItem('gemini-api-key');
            
            if (savedGeminiKey) {
                setGeminiApiKey(savedGeminiKey);
            }

            if (savedData) {
                const parsedData = JSON.parse(savedData);
                const mergedData = { ...initialProjectData, ...parsedData };
                setProjectData(mergedData);
            } else {
                setProjectData(initialProjectData);
            }
        } catch (error) {
            console.error("Gagal memuat data dari localStorage:", error);
        }
    }, []);

    // Efek untuk menyimpan data proyek ke localStorage setiap kali berubah
    useEffect(() => {
        try {
            localStorage.setItem('kti-bibliometric-project', JSON.stringify(projectData));
        } catch (error) {
            console.error("Gagal menyimpan data proyek ke localStorage:", error);
        }
    }, [projectData]);

    // Efek untuk menyimpan kunci API Gemini ke localStorage setiap kali berubah
    useEffect(() => {
        try {
            localStorage.setItem('gemini-api-key', geminiApiKey);
        } catch (error) {
            console.error("Gagal menyimpan kunci API ke localStorage:", error);
        }
    }, [geminiApiKey]);

    // Efek untuk memuat skrip PapaParse
    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleCloseWelcomeModal = () => {
        localStorage.setItem('hasSeenWelcomeModal', 'true');
        setShowWelcomeModal(false);
    };
    
    const showInfoModal = (message) => {
        setModalMessage(message);
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
    };

    // --- ALUR KERJA IDE KTI BARU ---

    const handleGenerateIdeKTI = async () => {
        setIsLoading(true);
        setIdeKtiMode('ai');
        setAiStructuredResponse(null);
        setEditingIdea(null);
        
        const jenisKarya = projectData.jenisKaryaTulis === 'Lainnya' ? projectData.jenisKaryaTulisLainnya : projectData.jenisKaryaTulis;
        
        const prompt = `Anda adalah seorang rekan diskusi penelitian yang ramah dan membantu. Tugas Anda adalah membantu pengguna memperjelas ide penelitian mereka dengan mengajukan 3 pertanyaan klarifikasi yang sederhana, praktis, dan personal. Hindari jargon akademis yang rumit.

Pertanyaan harus fokus pada:
1.  **Konteks/Industri Spesifik:** Tanyakan area spesifik yang diminati pengguna. (Contoh: "Dari topik '${projectData.topikTema}', adakah industri atau konteks tertentu yang paling menarik bagi Anda? (misal: perbankan, startup, pendidikan)")
2.  **Masalah Praktis:** Tanyakan masalah praktis atau tantangan terkait topik yang ingin diselesaikan atau diberikan kontribusi solusinya melalui penelitian ini.
3.  **Audiens/Pembaca:** Tanyakan siapa yang akan membaca hasil penelitian ini. (Contoh: "Siapakah pembaca utama yang Anda tuju untuk karya tulis ini? (misal: akademisi, manajer, pembuat kebijakan)")

Konteks dari Pengguna:
- Topik: "${projectData.topikTema}"
- Jenis Karya Tulis: "${jenisKarya}"

Buatlah 3 pertanyaan berdasarkan panduan di atas.`;
        
        const schema = {
            type: "OBJECT",
            properties: {
                questions: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                }
            },
            required: ["questions"]
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setClarificationQuestions(result.questions);
            setClarificationAnswers({});
            setIsClarificationModalOpen(true);
        } catch (error) {
            showInfoModal(`Gagal menghasilkan pertanyaan klarifikasi: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetFinalIdeas = async () => {
        setIsClarificationModalOpen(false);
        setIsLoading(true);

        const jenisKarya = projectData.jenisKaryaTulis === 'Lainnya' ? projectData.jenisKaryaTulisLainnya : projectData.jenisKaryaTulis;
        let context = `Konteks Awal:\n- Topik: "${projectData.topikTema}"\n- Jenis Karya Tulis: "${jenisKarya}"\n- Metode Penelitian: "${projectData.metode || 'Tidak ditentukan'}"\n- Periode Studi: "${projectData.periode || 'Tidak ditentukan'}"\n- Basis Data: "${projectData.basisData || 'Tidak ditentukan'}"\n- Tools Analisis: "${projectData.tools || 'Tidak ditentukan'}"\n\n`;
        context += "Jawaban Pengguna untuk Klarifikasi:\n";
        clarificationQuestions.forEach((q, i) => {
            context += `- Pertanyaan: ${q}\n  Jawaban: ${clarificationAnswers[i] || 'Tidak dijawab'}\n`;
        });

        const prompt = `Berdasarkan konteks yang diperkaya berikut, berikan 5 rekomendasi ide KTI (judul, kata kunci dipisahkan koma, penjelasan singkat). Pastikan ide-ide tersebut sangat terfokus dan relevan dengan jawaban pengguna.\n\n${context}`;
        
        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: { "judul": { "type": "STRING" }, "kata_kunci": { "type": "STRING" }, "penjelasan": { "type": "STRING" } },
                required: ["judul", "kata_kunci", "penjelasan"]
            }
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setAiStructuredResponse(result);
        } catch (error) {
            showInfoModal(`Gagal menghasilkan ide: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartEditing = (idea) => {
        setEditingIdea({
            judul: idea.judul,
            kata_kunci: idea.kata_kunci,
            penjelasan: idea.penjelasan
        });
    };

    const handleStartNewIdea = () => {
        setIdeKtiMode('manual');
        setAiStructuredResponse(null);
        setEditingIdea({
            judul: projectData.judulKTI || '',
            kata_kunci: projectData.kataKunci || '',
            penjelasan: projectData.penjelasan || ''
        });
    };

    const handleSaveIdea = () => {
        if (!editingIdea.judul) {
            showInfoModal("Judul KTI tidak boleh kosong.");
            return;
        }
        // Menyimpan semua data dari form detail dan form ide
        setProjectData(prev => ({
            ...prev, // Ini sudah berisi data dari form detail
            judulKTI: editingIdea.judul,
            kataKunci: editingIdea.kata_kunci,
            penjelasan: editingIdea.penjelasan,
        }));
        
        // Reset state
        setEditingIdea(null);
        setAiStructuredResponse(null);
        setIdeKtiMode(null);
        
        showInfoModal(`Proyek "${editingIdea.judul}" berhasil disimpan.`);
        setCurrentSection('referensi'); // Pindah ke tab selanjutnya
    };

    // --- AKHIR ALUR KERJA IDE KTI BARU ---
    
    const handleShowSearchPrompts = async () => {
        if (!projectData.aiReferenceClues) {
            showInfoModal("Harap hasilkan 'Clue Referensi' terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        setShowSearchPromptModal(true);
        
        const allClues = projectData.aiReferenceClues.flatMap(cat => cat.clues);
        const prompt = `Anda adalah seorang asisten riset. Untuk setiap kata kunci penelitian (clue) dalam daftar berikut, tuliskan satu kalimat narasi singkat (tujuan) dalam Bahasa Indonesia yang menjelaskan mengapa seorang peneliti perlu mencari kata kunci tersebut.

Daftar Clues:
${allClues.map(clue => `- "${clue}"`).join('\n')}

Berikan jawaban hanya dalam format JSON.`;
        
        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    clue: { type: "STRING" },
                    narrative: { type: "STRING" }
                },
                required: ["clue", "narrative"]
            }
        };

        try {
            const results = await geminiService.run(prompt, geminiApiKey, schema);
            const narrativeMap = results.reduce((acc, item) => {
                acc[item.clue.trim()] = item.narrative;
                return acc;
            }, {});
            setAiClueNarratives(narrativeMap);
        } catch (error) {
            showInfoModal(`Gagal menghasilkan narasi untuk clues: ${error.message}`);
            setShowSearchPromptModal(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    const parseManualReference = (text) => {
        const lines = text.split('\n');
        const reference = {
            title: '', journal: '', year: '', author: '', editors: '',
            volume: '', issue: '', pages: '', url: '', doi: '',
            publisher: ''
        };
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            if (!value) return;
            const keyLower = key.toLowerCase().trim();
            
            switch(keyLower) {
                case 'journal article title': reference.title = value; break;
                case 'journal name': reference.journal = value; break;
                case 'date': reference.year = value; break;
                case 'contributing authors': reference.author = value; break;
                case 'editors name': reference.editors = value; break;
                case 'volume': reference.volume = value; break;
                case 'issue': reference.issue = value; break;
                case 'pages': reference.pages = value; break;
                case 'url': reference.url = value; break;
                case 'doi': reference.doi = value; break;
                case 'publisher name': reference.publisher = value; break;
                default: break;
            }
        });
        return reference;
    };

    const handleSaveManualReference = () => {
        const parsedRef = parseManualReference(manualRef.text);
        if (!parsedRef.title || !parsedRef.author || !parsedRef.year) {
            showInfoModal("Journal Article Title, Contributing Authors, dan Date wajib diisi dalam template.");
            return;
        }

        if (manualRef.id) {
            setProjectData(prev => ({
                ...prev,
                allReferences: prev.allReferences.map(ref => ref.id === manualRef.id ? { ...ref, ...parsedRef, id: manualRef.id } : ref)
            }));
        } else {
            setProjectData(prev => ({
                ...prev,
                allReferences: [...prev.allReferences, { ...parsedRef, id: Date.now(), isiKutipan: '' }]
            }));
        }
        setManualRef({ id: null, text: manualRefTemplate });
    };

    const handleImportFromText = async () => {
        setIsLoading(true);
        const prompt = `Urai teks referensi berikut dan kembalikan dalam format JSON. Kunci JSON harus: title, author, year, journal, volume, issue, pages, doi. Jika sebuah informasi tidak ada, biarkan string kosong.

Teks: "${freeTextRef}"`;
        
        const schema = {
            type: "OBJECT",
            properties: {
                title: { type: "STRING" },
                author: { type: "STRING" },
                year: { type: "STRING" },
                journal: { type: "STRING" },
                volume: { type: "STRING" },
                issue: { type: "STRING" },
                pages: { type: "STRING" },
                doi: { type: "STRING" }
            },
            required: ["title", "author", "year"]
        };

        try {
            const parsedRef = await geminiService.run(prompt, geminiApiKey, schema);
            const newRef = { ...parsedRef, id: Date.now(), isiKutipan: '' };
            setProjectData(prev => ({ ...prev, allReferences: [...prev.allReferences, newRef] }));
            setFreeTextRef('');
            showInfoModal("Referensi berhasil diimpor!");
        } catch (error) {
            showInfoModal(`Gagal mengimpor referensi: ${error.message}. Coba gunakan metode template.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditReference = (ref) => {
        const text = `Journal Article Title: ${ref.title || ''}
Journal Name: ${ref.journal || ''}
Date: ${ref.year || ''}
Contributing Authors: ${ref.author || ''}
Editors Name: ${ref.editors || ''}
Volume: ${ref.volume || ''}
Issue: ${ref.issue || ''}
Pages: ${ref.pages || ''}
URL: ${ref.url || ''}
DOI: ${ref.doi || ''}
Publisher Name: ${ref.publisher || ''}`;
        setManualRef({ id: ref.id, text: text });
        window.scrollTo(0, 0);
    };

    const handleDeleteReference = (id) => setProjectData(prev => ({ ...prev, allReferences: prev.allReferences.filter(ref => ref.id !== id) }));

    const openNoteModal = (ref) => {
        setCurrentEditingRef(ref);
        setNoteText(ref.isiKutipan || '');
        setIsNoteModalOpen(true);
    };

    const handleSaveNote = () => {
        setProjectData(prev => ({
            ...prev,
            allReferences: prev.allReferences.map(ref => 
                ref.id === currentEditingRef.id ? { ...ref, isiKutipan: noteText } : ref
            )
        }));
        setIsNoteModalOpen(false);
        setCurrentEditingRef(null);
        setNoteText('');
    };

    const handleGenerateApa = () => {
        const list = projectData.allReferences
            .sort((a, b) => (a.author || '').localeCompare(b.author || ''))
            .map(ref => {
                let citation = `${ref.author || ''} (${ref.year || 't.t.'}). ${ref.title || ''}.`;
                if (ref.journal) {
                    citation += ` ${ref.journal}`;
                    if (ref.volume) citation += `, ${ref.volume}`;
                    if (ref.issue) citation += `(${ref.issue})`;
                    if (ref.pages) citation += `, ${ref.pages}`;
                    citation += '.';
                }
                if (ref.doi) {
                    citation += ` https://doi.org/${ref.doi}`;
                } else if (ref.url) {
                    citation += ` ${ref.url}`;
                }
                return citation;
            }).join('\n\n');
        setGeneratedApaReferences(list.replace(/\n/g, '<br />'));
    };

    const handleCopyToClipboard = (text) => {
        const plainText = text
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/[*_]/g, "");

        const textArea = document.createElement("textarea");
        textArea.value = plainText;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showInfoModal("Teks berhasil disalin!");
        } catch (err) {
            showInfoModal("Gagal menyalin teks.");
        }
        document.body.removeChild(textArea);
    };
    
    const handleCopyQuery = (queryText) => {
        handleCopyToClipboard(queryText);
        setLastCopiedQuery({ query: queryText });
        showInfoModal("Kueri disalin ke clipboard!");
    };


    const handleGeneratePokokIsi = async () => {
        setIsLoading(true);
        const kutipanString = projectData.allReferences
            .filter(ref => ref.isiKutipan)
            .map(ref => `- Dari "${ref.title}" oleh ${ref.author}: "${ref.isiKutipan}"`)
            .join('\n');

        const prompt = `Buat draf singkat untuk Fakta/Masalah, Tujuan Penelitian, dan Teori Penelitian untuk KTI berjudul "${projectData.judulKTI}". Gunakan kutipan/catatan dari referensi berikut sebagai dasar utama. Tulis semua sebagai teks biasa tanpa format.\n\n${kutipanString || "Tidak ada kutipan spesifik yang diberikan."}`;
        
        const schema = {
            type: "OBJECT",
            properties: {
                fakta_masalah: { type: "STRING" },
                tujuan_penelitian: { type: "STRING" },
                teori_penelitian: { type: "STRING" }
            },
            required: ["fakta_masalah", "tujuan_penelitian", "teori_penelitian"]
        };
        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(prev => ({
                ...prev,
                faktaMasalahDraft: result.fakta_masalah,
                tujuanPenelitianDraft: result.tujuan_penelitian,
                teoriPenelitianDraft: result.teori_penelitian,
            }));
            showInfoModal("Draf Pokok Isi KTI berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal membuat draf: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateReferenceClues = async () => {
        setIsLoading(true);
        setProjectData(prev => ({ ...prev, aiReferenceClues: null }));
        
        const context = `Konteks Proyek:
- Topik: "${projectData.topikTema}"
- Jenis Karya Tulis: "${projectData.jenisKaryaTulis === 'Lainnya' ? projectData.jenisKaryaTulisLainnya : projectData.jenisKaryaTulis}"
- Metode: "${projectData.metode || 'Belum ditentukan'}"
- Basis Data: "${projectData.basisData || 'Belum ditentukan'}"
- Tools: "${projectData.tools || 'Belum ditentukan'}"`;

        const prompt = `Anda adalah seorang asisten riset ahli. Berdasarkan konteks proyek berikut, buatlah daftar kategori referensi kunci yang terstruktur untuk membantu pengguna melakukan tinjauan pustaka.

Gunakan kerangka kategori standar berikut:
1. Definisi Inti & Konsep Kunci
2. Teori yang Relevan
3. Metodologi Penelitian
4. Studi Terdahulu & Praktik Terbaik
5. Tantangan & Arah Masa Depan

Untuk setiap kategori, isi dengan 2-3 contoh kata kunci pencarian yang spesifik dan relevan dengan konteks proyek.

**Aturan Penting:**
- Jika pada konteks, pengguna SUDAH menyebutkan sebuah "Metode" (misalnya, 'SLR' atau 'Bibliometrik'), maka pada kategori "Metodologi Penelitian", berikan clue yang spesifik untuk metode tersebut (contohnya: 'PRISMA guidelines' untuk SLR, atau 'co-citation analysis' untuk Bibliometrik). JANGAN menyarankan nama metode lain.
- Jika "Metode" belum ditentukan, Anda boleh menyarankan beberapa pendekatan metodologi yang relevan.

Konteks Proyek:
---
${context}
---
`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    category: { type: "STRING" },
                    clues: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["category", "clues"]
            }
        };
        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(prev => ({ ...prev, aiReferenceClues: result }));
            showInfoModal("Clue referensi berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal membuat clue: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateOutline = async () => {
        setIsLoading(true);
        const prompt = `Buatkan draf outline (kerangka) untuk ${projectData.jenisKaryaTulis} berjudul "${projectData.judulKTI}". Sertakan bab dan sub-bab yang relevan. Hasil harus berupa teks biasa tanpa format.`;
        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    bab: { type: "STRING" },
                    judul: { type: "STRING" },
                    sub_bab: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["bab", "judul", "sub_bab"]
            }
        };
        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(prev => ({ ...prev, outlineDraft: result }));
            showInfoModal("Draf Outline KTI berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal membuat outline: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateFullPendahuluan = async () => {
        setIsLoading(true);
        const kutipanString = projectData.allReferences
            .filter(ref => ref.isiKutipan)
            .map(ref => `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`)
            .join('\n');
        
        const outlineString = projectData.outlineDraft ? projectData.outlineDraft.map(bab => `- ${bab.bab}: ${bab.judul}`).join('\n') : 'Outline belum dibuat.';

        const prompt = `Anda adalah seorang penulis akademis ahli. Tugas Anda adalah menulis draf Bab 1: Pendahuluan yang lengkap dan koheren untuk sebuah karya tulis ilmiah.

**Aturan Penulisan (Sangat Penting):**
- Tulis seluruhnya sebagai teks biasa (plain text).
- JANGAN gunakan format apa pun seperti bold, miring, markdown (*, _, **), atau tag HTML (<i>, <b>).
- Gunakan sub-judul bernomor (misalnya, 1.1 Latar Belakang, 1.2 Rumusan Masalah, dst.) untuk setiap bagian.

**Konteks Proyek:**
- Judul: "${projectData.judulKTI}"
- Catatan dari Referensi:
${kutipanString || "Tidak ada catatan spesifik."}
- Outline KTI:
${outlineString || "Outline belum dibuat."}

**Struktur Bab Pendahuluan yang Harus Anda Hasilkan:**
1.  **1.1 Latar Belakang:** Sintesis catatan referensi menjadi sebuah narasi yang mengalir, dimulai dari konteks umum dan mengerucut ke pentingnya topik ini.
2.  **1.2 Rumusan Masalah:** Identifikasi celah penelitian (research gap) dari catatan yang ada, tulis satu paragraf pengantar singkat, lalu daftarkan pertanyaan penelitian dalam format bernomor.
3.  **1.3 Tujuan Penelitian:** Turunkan tujuan penelitian secara langsung dari rumusan masalah yang telah Anda buat, biasanya dalam format poin-poin bernomor.
4.  **1.4 Sistematika Penulisan:** Tulis satu paragraf standar yang menjelaskan isi dari setiap bab berikutnya, berdasarkan outline yang diberikan.

Pastikan ada kesinambungan dan alur yang logis antar sub-bab.`;

        try {
            const result = await geminiService.run(prompt, geminiApiKey);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, pendahuluanDraft: cleanResult }));
            showInfoModal("Draf Pendahuluan Lengkap berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal menghasilkan Pendahuluan: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleModifyText = async (mode, draftKey) => {
        const currentText = projectData[draftKey];
        if (!currentText) {
            showInfoModal("Draf masih kosong. Hasilkan draf terlebih dahulu.");
            return;
        }

        setIsLoading(true);
        let instruction = '';
        switch (mode) {
            case 'shorten':
                instruction = 'Ringkas teks berikut sekitar 30-40% dengan tetap mempertahankan semua poin kunci dan referensi. Fokus pada kalimat yang paling esensial. Hasilkan sebagai teks biasa tanpa format.';
                break;
            case 'medium':
                instruction = 'Tulis ulang teks berikut dengan panjang yang kurang lebih sama, tetapi gunakan gaya bahasa yang lebih mengalir dan akademis. Perbaiki struktur kalimat jika perlu tanpa mengubah substansi atau referensi. Hasilkan sebagai teks biasa tanpa format.';
                break;
            case 'lengthen':
                instruction = 'Perpanjang teks berikut sekitar 40-50%. Elaborasi setiap argumen utama dengan penjelasan lebih dalam atau contoh konkret. Pastikan semua informasi tetap konsisten dengan substansi asli dan kutipan yang ada. Jangan mengurangi atau mengubah referensi yang sudah ada. Tujuannya adalah menambah bobot argumen, bukan hanya menambah kata. Hasilkan sebagai teks biasa tanpa format.';
                break;
            default:
                setIsLoading(false);
                return;
        }

        const prompt = `${instruction}\n\n---TEKS ASLI---\n${currentText}`;

        try {
            const result = await geminiService.run(prompt, geminiApiKey);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, [draftKey]: cleanResult }));
            showInfoModal(`Draf berhasil diubah ke versi "${mode}".`);
        } catch (error) {
            showInfoModal(`Gagal mengubah draf: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateMetode = async () => {
        setIsLoading(true);
        const prompt = `Tuliskan draf Bab Metode Penelitian untuk sebuah ${projectData.jenisKaryaTulis} berjudul "${projectData.judulKTI}". Jelaskan secara detail alur penelitian berdasarkan informasi berikut:
- Pendekatan Penelitian: ${projectData.pendekatan}
- Metode Spesifik: ${projectData.metode || 'Akan dijelaskan'}
- Sumber Data: Data akan diambil dari basis data ${projectData.basisData || 'yang relevan'}
- Periode Pengambilan Data: ${projectData.periode || 'Akan ditentukan'}
- Alat Analisis: Analisis data akan menggunakan ${projectData.tools || 'alat yang sesuai'}

Susun menjadi paragraf yang koheren dan akademis, sesuaikan penjelasan dengan pendekatan (${projectData.pendekatan}) yang dipilih. Hasilkan sebagai teks biasa tanpa format.`;
        try {
            const result = await geminiService.run(prompt, geminiApiKey);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, metodeDraft: cleanResult }));
            showInfoModal("Draf Bab Metode berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal menulis Bab Metode: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateStudiLiteratur = async () => {
        setIsLoading(true);
        const kutipanString = projectData.allReferences
            .filter(ref => ref.isiKutipan)
            .map(ref => `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`)
            .join('\n');

        if (!kutipanString) {
            showInfoModal("Tidak ada kutipan/catatan yang ditemukan di perpustakaan referensi Anda. Tambahkan catatan terlebih dahulu.");
            setIsLoading(false);
            return;
        }

        const prompt = `Anda adalah seorang penulis akademik ahli. Berdasarkan kumpulan kutipan dan catatan dari berbagai sumber berikut, tuliskan sebuah draf Tinjauan Pustaka (Studi Literatur) yang koheren untuk sebuah karya tulis berjudul "${projectData.judulKTI}".

Tugas Anda adalah:
1.  Identifikasi tema-tema atau argumen utama yang muncul dari catatan-catatan di bawah.
2.  Kelompokkan catatan-catatan tersebut berdasarkan tema yang relevan.
3.  Sintesis informasi tersebut menjadi sebuah narasi yang mengalir. Jangan hanya mendaftar ringkasan satu per satu, tetapi bandingkan, pertentangkan, dan hubungkan ide-ide dari berbagai sumber.
4.  Gunakan kalimat transisi untuk memastikan alur tulisan lancar antar paragraf.
5.  Akhiri dengan sebuah ringkasan singkat yang menyoroti celah penelitian (research gap) yang berhasil diidentifikasi dari literatur.
6.  PENTING: Hasilkan seluruhnya sebagai teks biasa (plain text) tanpa format apa pun.

Catatan dari Referensi:
---
${kutipanString}
---
`;
        try {
            const result = await geminiService.run(prompt, geminiApiKey);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, studiLiteraturDraft: cleanResult }));
            showInfoModal("Draf Studi Literatur berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal menulis Studi Literatur: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateHasilPembahasan = async () => {
        setIsLoading(true);
        setProjectData(p => ({ ...p, hasilPembahasanDraft: '' }));

        let dataSintesis = '';
        if (projectData.analisisKuantitatifDraft) dataSintesis += `--- ANALISIS KUANTITATIF ---\n${projectData.analisisKuantitatifDraft}\n\n`;
        if (projectData.analisisKualitatifDraft) dataSintesis += `--- ANALISIS KUALITATIF ---\n${projectData.analisisKualitatifDraft}\n\n`;
        if (projectData.analisisVisualDraft) dataSintesis += `--- ANALISIS VISUAL ---\n${projectData.analisisVisualDraft}\n\n`;

        if (!dataSintesis) {
            showInfoModal("Tidak ada draf analisis yang bisa disintesis. Harap selesaikan salah satu modul analisis terlebih dahulu.");
            setIsLoading(false);
            return;
        }

        const prompt = `Anda adalah seorang penulis akademis dan peneliti ahli. Tugas Anda adalah menulis draf Bab 4: Hasil dan Pembahasan yang komprehensif, terstruktur, dan analitis.

**Konteks Penelitian:**
- Judul Penelitian: "${projectData.judulKTI || 'Tidak Disediakan'}"
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft || 'Tidak Disediakan'}"
- Ringkasan Metode: "${projectData.metodeDraft || 'Tidak Disediakan'}"

**Data Hasil Analisis untuk Sintesis:**
${dataSintesis}

**Instruksi Penulisan yang Sangat Rinci:**
1.  **Struktur Bab:** Susunlah draf Anda ke dalam dua sub-bab utama: **4.1 Hasil Penelitian** dan **4.2 Pembahasan**.
2.  **Instruksi untuk 4.1 Hasil Penelitian:** Pada bagian ini, sajikan temuan-temuan utama dari semua draf analisis yang diberikan secara objektif. Laporkan fakta dan data apa adanya tanpa interpretasi mendalam. Integrasikan temuan dari berbagai analisis (jika ada lebih dari satu) secara logis.
3.  **Instruksi untuk 4.2 Pembahasan:** Pada bagian ini, lakukan hal berikut:
    - **Interpretasikan Temuan:** Jelaskan apa arti dari hasil yang telah disajikan di sub-bab 4.1.
    - **Hubungkan dengan Tujuan:** Secara eksplisit, bahas bagaimana setiap temuan membantu menjawab tujuan penelitian yang telah ditetapkan.
    - **Sintesis, Bukan Pengulangan:** Jangan hanya mengulang hasil, tetapi sintesiskan menjadi sebuah argumen yang utuh.
4.  **Aturan Format:** Tulis seluruhnya sebagai teks biasa (plain text) tanpa format markdown atau HTML.

Pastikan ada alur yang logis antara penyajian hasil dan pembahasannya.`;

        try {
            const result = await geminiService.run(prompt, geminiApiKey);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(p => ({ ...p, hasilPembahasanDraft: cleanResult }));
            showInfoModal("Draf Bab Hasil & Pembahasan berhasil dibuat!");
        } catch(error) {
            showInfoModal(`Gagal membuat draf: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateKesimpulan = async () => {
        setIsLoading(true);
        setProjectData(p => ({ ...p, kesimpulanDraft: '' }));
        
        const context = `
**Judul Penelitian:**
${projectData.judulKTI}
**Draf Pendahuluan (termasuk tujuan penelitian):**
${projectData.pendahuluanDraft}
**Draf Metode Penelitian:**
${projectData.metodeDraft}
**Draf Hasil dan Pembahasan:**
${projectData.hasilPembahasanDraft}
`;

        const prompt = `Anda adalah seorang penulis akademis ahli. Tugas Anda adalah menulis draf Bab 5: Kesimpulan yang lengkap dan koheren berdasarkan keseluruhan konteks penelitian yang diberikan.

**Konteks Penelitian:**
---
${context}
---

**Instruksi Penulisan yang Sangat Rinci:**
1.  **Struktur Bab:** Susunlah draf Anda ke dalam tiga sub-bab utama dengan nomor: **5.1 Kesimpulan**, **5.2 Keterbatasan**, dan **5.3 Saran**.
2.  **Instruksi untuk 5.1 Kesimpulan:**
    - Mulai dengan paragraf pembuka yang menyatakan kembali tujuan utama penelitian.
    - Rangkum temuan-temuan paling penting dari bab Hasil dan Pembahasan.
    - Jelaskan bagaimana temuan tersebut secara langsung menjawab pertanyaan atau tujuan penelitian yang ada di Pendahuluan.
    - Hindari memperkenalkan informasi baru.
3.  **Instruksi untuk 5.2 Keterbatasan:**
    - Secara jujur, identifikasi potensi kelemahan atau batasan dari penelitian ini (misalnya, batasan metodologi, ukuran sampel, cakupan data, dll.).
    - Jelaskan bagaimana keterbatasan ini mungkin mempengaruhi hasil atau generalisasi temuan.
4.  **Instruksi untuk 5.3 Saran:**
    - Berikan saran konkret untuk **penelitian selanjutnya** yang dapat dibangun di atas temuan atau mengatasi keterbatasan penelitian ini.
    - Jika relevan, berikan saran praktis untuk **praktisi atau pembuat kebijakan** berdasarkan implikasi dari temuan Anda.
5.  **Aturan Format:** Tulis seluruhnya sebagai teks biasa (plain text) tanpa format markdown atau HTML.

Pastikan ada alur yang logis dan setiap bagian saling terkait.`;

        try {
            const result = await geminiService.run(prompt, geminiApiKey);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(p => ({ ...p, kesimpulanDraft: cleanResult }));
            showInfoModal("Draf Bab Kesimpulan berhasil dibuat!");
        } catch(error) {
            showInfoModal(`Gagal membuat draf kesimpulan: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateVariabel = async () => {
        setIsLoading(true);
        setProjectData(prev => ({ ...prev, aiSuggestedVariables: null }));

        const prompt = `Anda adalah seorang metodolog penelitian ahli. Berdasarkan judul penelitian kuantitatif berikut, identifikasi dan sarankan satu variabel terikat (dependent variable) dan beberapa (2 hingga 4) variabel bebas (independent variables) yang paling relevan dan umum diteliti.

Judul Penelitian: "${projectData.judulKTI}"
Topik Umum: "${projectData.topikTema}"

Berikan jawaban hanya dalam format JSON yang ketat.`;

        const schema = {
            type: "OBJECT",
            properties: {
                variabel_terikat: { type: "STRING" },
                variabel_bebas: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                }
            },
            required: ["variabel_terikat", "variabel_bebas"]
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(prev => ({ ...prev, aiSuggestedVariables: result }));
            showInfoModal("Saran variabel berhasil dibuat! Silakan sunting dan simpan.");
        } catch (error) {
            showInfoModal(`Gagal membuat saran variabel: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateHipotesis = async () => {
        if (!projectData.variabelTerikat || projectData.variabelBebas.length === 0) {
            showInfoModal("Tentukan variabel penelitian terlebih dahulu di 'Generator Variabel'.");
            return;
        }
        setIsLoading(true);
        setProjectData(prev => ({ ...prev, aiSuggestedHypotheses: null }));

        const prompt = `Anda adalah seorang metodolog penelitian. Berdasarkan variabel penelitian berikut, buatkan hipotesis penelitian yang sesuai. Untuk setiap variabel bebas, buat satu pasang hipotesis: hipotesis alternatif (H1) yang menyatakan adanya pengaruh positif atau signifikan, dan hipotesis nol (H0) yang menyatakan tidak adanya pengaruh.

- Variabel Terikat (Y): "${projectData.variabelTerikat}"
- Variabel Bebas (X):
${projectData.variabelBebas.map(v => `- ${v}`).join('\n')}

Berikan jawaban hanya dalam format JSON.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    h1: { type: "STRING" },
                    h0: { type: "STRING" }
                },
                required: ["h1", "h0"]
            }
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(prev => ({ ...prev, aiSuggestedHypotheses: result }));
            showInfoModal("Saran hipotesis berhasil dibuat! Silakan sunting dan simpan.");
        } catch (error) {
            showInfoModal(`Gagal membuat saran hipotesis: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateKuesioner = async () => {
        if (!projectData.variabelTerikat || projectData.variabelBebas.length === 0) {
            showInfoModal("Tentukan variabel penelitian terlebih dahulu di 'Generator Variabel'.");
            return;
        }
        setIsLoading(true);
        setProjectData(prev => ({ ...prev, aiSuggestedKuesioner: null }));

        const prompt = `Anda adalah seorang ahli metodologi penelitian yang spesialis dalam pembuatan instrumen.
Konteks:
- Variabel Terikat (Y): "${projectData.variabelTerikat}"
- Variabel Bebas (X): ${projectData.variabelBebas.join(', ')}

Tugas: Untuk setiap variabel yang diberikan (baik terikat maupun bebas), buatlah 3 hingga 5 item pernyataan (bukan pertanyaan) yang dapat diukur menggunakan skala Likert 5 poin (Sangat Tidak Setuju hingga Sangat Setuju). Pastikan setiap pernyataan jelas, tidak ambigu, dan secara langsung mengukur konsep dari variabel tersebut.

Berikan jawaban hanya dalam format JSON yang ketat.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    nama_variabel: { type: "STRING" },
                    item_kuesioner: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["nama_variabel", "item_kuesioner"]
            }
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(prev => ({ ...prev, aiSuggestedKuesioner: result }));
            showInfoModal("Draf kuesioner berhasil dibuat! Silakan sunting dan simpan.");
        } catch (error) {
            showInfoModal(`Gagal membuat draf kuesioner: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateWawancara = async () => {
        if (!projectData.judulKTI || !projectData.tujuanPenelitianDraft) {
            showInfoModal("Lengkapi 'Ide KTI' dan 'Pokok Isi KTI' (khususnya Tujuan Penelitian) terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        setProjectData(prev => ({ ...prev, aiSuggestedWawancara: null }));

        const prompt = `Anda adalah seorang peneliti kualitatif berpengalaman yang ahli dalam merancang protokol wawancara mendalam.
Konteks Proyek:
- Judul Penelitian: "${projectData.judulKTI}"
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft}"
- Penjelasan Singkat: "${projectData.penjelasan}"

Tugas: Buatkan draf panduan wawancara semi-terstruktur yang komprehensif. Draf ini harus mencakup beberapa kategori pertanyaan yang jelas. Untuk setiap kategori, berikan deskripsi singkat tujuannya, lalu daftarkan 2-4 pertanyaan relevan.

Kategori yang harus ada:
1.  **Pertanyaan Pembuka (Opening Questions):** Untuk membangun rapport, menjelaskan tujuan wawancara, dan membuat informan nyaman.
2.  **Pertanyaan Inti (Core Questions):** Pertanyaan utama yang secara langsung menggali informasi untuk menjawab tujuan penelitian.
3.  **Pertanyaan Pendalaman (Probing Questions):** Contoh pertanyaan lanjutan untuk menggali lebih dalam jawaban informan (misalnya, "Bisa Anda berikan contoh?", "Apa yang Anda maksud dengan...?").
4.  **Pertanyaan Penutup (Closing Questions):** Untuk merangkum, menanyakan hal lain yang mungkin terlewat, dan menutup wawancara dengan baik.

Berikan jawaban hanya dalam format JSON yang ketat.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    kategori: { type: "STRING" },
                    deskripsi_kategori: { type: "STRING" },
                    pertanyaan: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["kategori", "deskripsi_kategori", "pertanyaan"]
            }
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(prev => ({ ...prev, aiSuggestedWawancara: result }));
            showInfoModal("Draf panduan wawancara berhasil dibuat! Silakan sunting dan simpan.");
        } catch (error) {
            showInfoModal(`Gagal membuat draf panduan wawancara: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateQueries = async () => {
        setIsLoading(true);
        setProjectData(p => ({ ...p, aiGeneratedQueries: null }));

        let languageInstruction = "Prioritaskan kueri dalam Bahasa Inggris. JANGAN sertakan padanan Bahasa Indonesia.";
        if (includeIndonesianQuery) {
            languageInstruction = "Prioritaskan kueri dalam Bahasa Inggris, tetapi sertakan juga padanan istilah kunci dalam Bahasa Indonesia menggunakan operator OR. Contoh: ((\"digital transformation\") OR (\"transformasi digital\"))";
        }

        const prompt = `Anda adalah seorang Pustakawan Riset (Research Librarian) yang ahli dalam merancang strategi penelusuran sistematis untuk database akademis.
**Konteks Proyek:**
- Judul: "${projectData.judulKTI}"
- Kata Kunci: "${projectData.kataKunci}"
- Database Target: "${projectData.queryGeneratorTargetDB}"

**Tugas Utama:**
Buat 5 level kueri pencarian (search strings), dari yang paling spesifik hingga paling luas.

**Level Kueri:**
- Level 1 (Paling Khusus): Cari istilah inti hanya di judul artikel.
- Level 2 (Sedikit Lebih Umum): Cari di judul, abstrak, dan kata kunci.
- Level 3 (Umum Menengah): Perluas pencarian dengan sinonim dan istilah terkait yang relevan.
- Level 4 (Lebih Umum): Hilangkan beberapa batasan untuk eksplorasi lebih luas.
- Level 5 (Paling Umum): Pencarian paling luas, biasanya hanya dibatasi oleh kata kunci utama.

**Aturan Penting:**
- **Instruksi Bahasa:** ${languageInstruction}
- **JANGAN** sertakan batasan tahun atau periode (misalnya, AND PUBYEAR > 2020) di dalam string kueri yang dihasilkan. Peneliti akan mengatur filter periode secara manual di antarmuka database.

**Instruksi Sintaks:**
Gunakan sintaks yang paling sesuai untuk Database Target.
- Untuk Scopus: Gunakan TITLE-ABS-KEY() dan TITLE().
- Untuk Web of Science: Gunakan TS=() (Topic Search) dan TI=() (Title Search).
- Untuk Google Scholar: Gunakan allintitle: dan "frasa dalam tanda kutip".
- Untuk Lainnya (Umum): Gunakan sintaks boolean umum (AND, OR, NOT) dan tanda kurung.

**Format Output:**
Berikan jawaban HANYA dalam format JSON yang ketat.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    level: { type: "STRING" },
                    penjelasan: { type: "STRING" },
                    kueri: { type: "STRING" }
                },
                required: ["level", "penjelasan", "kueri"]
            }
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(p => ({ ...p, aiGeneratedQueries: result }));
            showInfoModal("Kueri berjenjang berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal membuat kueri: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLog = (id) => {
        setProjectData(p => ({
            ...p,
            searchLog: p.searchLog.filter(log => log.id !== id)
        }));
    };

    const handleGenerateAnalisis = async (data, analysisType) => {
        if (!data) {
            showInfoModal("Tidak ada data untuk dianalisis. Silakan unggah file .csv terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        setProjectData(p => ({ ...p, analisisKuantitatifHasil: '' }));

        const csvString = window.Papa.unparse(data);
        let prompt;

        if (analysisType === 'konfirmatif') {
            const hipotesisString = projectData.hipotesis.join('\n');
            prompt = `Anda adalah seorang analis data dan penulis riset ahli. Tugas Anda adalah menganalisis data kuantitatif berikut dalam konteks penelitian yang diberikan dan menyusun narasi temuan.

**Konteks Penelitian:**
- Judul: "${projectData.judulKTI}"
- Tujuan: "${projectData.tujuanPenelitianDraft}"
- Hipotesis yang akan diuji:
${hipotesisString}

**Data Mentah (format CSV):**
\`\`\`csv
${csvString}
\`\`\`

**Instruksi Analisis:**
1.  **Statistik Deskriptif:** Untuk setiap kolom numerik yang relevan dengan variabel penelitian, hitung dan sajikan statistik deskriptif dasar (Rata-rata/Mean, Median, Standar Deviasi).
2.  **Uji Hipotesis (Interpretatif):** Berdasarkan data yang ada, berikan interpretasi konseptual apakah data cenderung mendukung atau menolak setiap hipotesis. Jelaskan alasan Anda secara singkat. Contoh: "Data menunjukkan rata-rata 'Kepuasan Kerja' lebih tinggi pada kelompok dengan 'Gaya Kepemimpinan Transformasional', yang secara konseptual mendukung H1."
3.  **Narasi Temuan:** Tuliskan draf narasi yang koheren untuk bab "Hasil dan Pembahasan". Mulailah dengan ringkasan statistik deskriptif, diikuti dengan pembahasan hasil uji hipotesis satu per satu. Akhiri dengan paragraf singkat yang merangkum temuan utama.

**Format Output:**
Gunakan format teks biasa dengan sub-judul yang jelas (misal: "1. Statistik Deskriptif", "2. Hasil Uji Hipotesis", "3. Draf Narasi Temuan").
`;
        } else { // 'eksploratif'
            prompt = `Anda adalah seorang analis data ahli. Tugas Anda adalah melakukan analisis data eksploratif pada data tabel berikut dan menyajikan wawasan yang paling menarik.

**Konteks Penelitian (jika ada):**
- Judul: "${projectData.judulKTI || 'Tidak ditentukan'}"
- Topik Umum: "${projectData.topikTema || 'Tidak ditentukan'}"

**Data Mentah (format CSV):**
\`\`\`csv
${csvString}
\`\`\`

**Instruksi Analisis:**
1.  **Statistik Deskriptif:** Untuk setiap kolom numerik, hitung dan sajikan statistik deskriptif kunci (Rata-rata/Mean, Median, Standar Deviasi, Min, Max).
2.  **Identifikasi Wawasan Utama:** Analisis data untuk menemukan pola, korelasi, atau anomali yang paling signifikan dan menarik. Fokus pada temuan yang tidak terduga atau yang bisa menjadi titik awal untuk penelitian lebih lanjut.
3.  **Narasi Temuan:** Tuliskan draf narasi yang merangkum temuan-temuan utama Anda. Susun dalam format poin-poin yang mudah dibaca, di mana setiap poin menjelaskan satu wawasan penting dari data.

**Format Output:**
Gunakan format teks biasa dengan sub-judul yang jelas (misal: "1. Statistik Deskriptif", "2. Wawasan Utama dari Data").
`;
        }

        try {
            const result = await geminiService.run(prompt, geminiApiKey);
            setProjectData(p => ({ ...p, analisisKuantitatifHasil: result }));
            showInfoModal("Analisis data berhasil dibuat!");
        } catch(error) {
            showInfoModal(`Gagal menganalisis data: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateAnalisisKualitatif = async (fileContent) => {
        setIsLoading(true);
        setProjectData(p => ({ ...p, analisisKualitatifHasil: null, analisisKualitatifDraft: '' }));

        const prompt = `Anda adalah seorang peneliti kualitatif ahli. Lakukan analisis tematik pada teks berikut. Identifikasi 3-5 tema utama yang muncul yang paling relevan dengan tujuan penelitian.

**Konteks Penelitian:**
- Judul: "${projectData.judulKTI || 'Tidak Disediakan'}"
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft || 'Tidak Disediakan'}"

**Tugas:**
Untuk setiap tema yang Anda identifikasi:
1.  Berikan nama tema yang singkat dan jelas.
2.  Tulis deskripsi singkat (1-2 kalimat) yang menjelaskan inti dari tema tersebut.
3.  Sertakan 2-3 kutipan paling representatif dari teks asli untuk mendukung tema tersebut.

**Teks untuk Dianalisis:**
---
${fileContent}
---

Berikan jawaban hanya dalam format JSON yang ketat.`;

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    tema: { type: "STRING" },
                    deskripsi: { type: "STRING" },
                    kutipan_pendukung: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["tema", "deskripsi", "kutipan_pendukung"]
            }
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema);
            setProjectData(p => ({ ...p, analisisKualitatifHasil: result }));
            showInfoModal("Analisis tematik berhasil dibuat! Silakan tinjau hasilnya.");
        } catch(error) {
            showInfoModal(`Gagal menganalisis data kualitatif: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAnalisisVisual = async (imageFile, analysisFocus) => {
        setIsLoading(true);
        setProjectData(p => ({ ...p, deskripsiVisualisasi: '', interpretasiData: '' }));

        const prompt = `Anda adalah seorang analis data dan penulis riset ahli. Tugas Anda adalah menganalisis gambar berikut dalam konteks penelitian yang diberikan.

**Konteks Penelitian:**
- Judul: "${projectData.judulKTI || 'Tidak Disediakan'}"
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft || 'Tidak Disediakan'}"
- Kata Kunci: "${projectData.kataKunci || 'Tidak Disediakan'}"

**Fokus Analisis Spesifik dari Pengguna (jika ada):**
"${analysisFocus || 'Tidak ada fokus spesifik yang diberikan.'}"

**Instruksi Analisis:**
1.  **Deskripsi Gambar:** Jelaskan secara objektif apa yang ditampilkan oleh gambar ini. Sebutkan elemen-elemen kunci seperti jenis grafik/diagram, label, legenda, dan pola visual yang paling menonjol.
2.  **Interpretasi & Analisis:** Berdasarkan konteks penelitian dan fokus yang diberikan, interpretasikan makna dari gambar ini. Apa wawasan utama yang dapat ditarik? Bagaimana gambar ini membantu menjawab tujuan penelitian? Hubungkan temuan visual dengan konsep atau kata kunci penelitian.

Berikan jawaban hanya dalam format JSON yang ketat.`;
        
        const schema = {
            type: "OBJECT",
            properties: {
                deskripsi: { type: "STRING" },
                interpretasi: { type: "STRING" }
            },
            required: ["deskripsi", "interpretasi"]
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKey, schema, imageFile);
            setProjectData(p => ({
                ...p,
                deskripsiVisualisasi: result.deskripsi,
                interpretasiData: result.interpretasi
            }));
            showInfoModal("Analisis visual berhasil dibuat!");
        } catch(error) {
            showInfoModal(`Gagal menganalisis gambar: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    const handleExportProject = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(projectData, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `bibliocobra_project_${date}.json`;
            link.click();
        } catch (error) {
            showInfoModal("Gagal mengekspor proyek.");
        }
    };

    const triggerImport = () => importInputRef.current.click();

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "application/json") {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.judulKTI !== undefined && data.allReferences !== undefined) {
                        setImportedData(data);
                        setIsImportConfirmOpen(true);
                    } else {
                        showInfoModal("File JSON tidak valid atau bukan file proyek Bibliocobra.");
                    }
                } catch (error) {
                    showInfoModal("Gagal membaca file. Pastikan file JSON dalam format yang benar.");
                }
            };
            reader.readAsText(file);
        } else {
            showInfoModal("Silakan pilih file dengan format .json");
        }
        event.target.value = null;
    };

    const confirmImport = () => {
        setProjectData(importedData);
        setIsImportConfirmOpen(false);
        setImportedData(null);
        showInfoModal("Proyek berhasil diimpor!");
    };
    
    const handleResetProject = () => {
        localStorage.removeItem('kti-bibliometric-project');
        setProjectData(initialProjectData);
        setIsResetConfirmOpen(false);
        showInfoModal("Proyek telah berhasil di-reset.");
    };
    
    const handleExportReferences = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(projectData.allReferences, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `bibliocobra_references_${date}.json`;
            link.click();
        } catch (error) {
            showInfoModal("Gagal mengekspor referensi.");
        }
    };

    const triggerReferencesImport = () => importReferencesInputRef.current.click();

    const handleFileImportReferences = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "application/json") {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const newReferences = JSON.parse(e.target.result);
                    if (!Array.isArray(newReferences)) {
                        showInfoModal("File tidak valid. File harus berisi daftar (array) referensi.");
                        return;
                    }
                    
                    const existingTitles = new Set(projectData.allReferences.map(ref => ref.title));
                    let addedCount = 0;
                    let skippedCount = 0;

                    const uniqueNewReferences = newReferences.filter(newRef => {
                        if (existingTitles.has(newRef.title)) {
                            skippedCount++;
                            return false;
                        }
                        addedCount++;
                        return true;
                    }).map(newRef => ({...newRef, id: Date.now() + Math.random()}));

                    setProjectData(prev => ({
                        ...prev,
                        allReferences: [...prev.allReferences, ...uniqueNewReferences]
                    }));

                    showInfoModal(`Impor selesai. Berhasil menambahkan ${addedCount} referensi baru. ${skippedCount} referensi duplikat diabaikan.`);

                } catch (error) {
                    showInfoModal("Gagal membaca file. Pastikan file JSON dalam format yang benar.");
                }
            };
            reader.readAsText(file);
        } else {
            showInfoModal("Silakan pilih file dengan format .json");
        }
        event.target.value = null;
    };

    const renderSection = () => {
        switch (currentSection) {
            case 'ideKTI':
                return <IdeKTI {...{ projectData, handleInputChange, handleGenerateIdeKTI, handleStartNewIdea, isLoading, aiStructuredResponse, editingIdea, setEditingIdea, handleStartEditing, handleSaveIdea, ideKtiMode }} />;
            case 'referensi':
                return <Referensi {...{ projectData, manualRef, setManualRef, handleSaveManualReference, freeTextRef, setFreeTextRef, handleImportFromText, handleEditReference, handleDeleteReference, handleGenerateApa, generatedApaReferences, handleCopyToClipboard, handleShowSearchPrompts, handleGenerateReferenceClues, isLoading, openNoteModal, triggerReferencesImport, handleExportReferences }} />;
            case 'genLogKueri':
                return <GeneratorLogKueri {...{ projectData, setProjectData, handleGenerateQueries, isLoading, showInfoModal, lastCopiedQuery, handleCopyQuery, handleDeleteLog, includeIndonesianQuery, setIncludeIndonesianQuery }} />;
            case 'genVariabel':
                return <GeneratorVariabel {...{ projectData, setProjectData, handleGenerateVariabel, isLoading, showInfoModal }} />;
            case 'genHipotesis':
                return <GeneratorHipotesis {...{ projectData, setProjectData, handleGenerateHipotesis, isLoading, showInfoModal }} />;
            case 'genKuesioner':
                return <GeneratorKuesioner {...{ projectData, setProjectData, handleGenerateKuesioner, isLoading, showInfoModal }} />;
            case 'genWawancara':
                return <GeneratorWawancara {...{ projectData, setProjectData, handleGenerateWawancara, isLoading, showInfoModal }} />;
            case 'analisisKuantitatif':
                return <AnalisisKuantitatif {...{ projectData, setProjectData, handleGenerateAnalisis, isLoading, showInfoModal, setCurrentSection }} />;
            case 'analisisKualitatif':
                return <AnalisisKualitatif {...{ projectData, setProjectData, handleGenerateAnalisisKualitatif, isLoading, showInfoModal }} />;
            case 'analisisVisual':
                return <AnalisisVisual {...{ projectData, setProjectData, handleGenerateAnalisisVisual, isLoading, showInfoModal }} />;
            case 'pokokIsi':
                return <PokokIsi {...{ projectData, setProjectData, handleGeneratePokokIsi, isLoading }} />;
            case 'outline':
                return <Outline {...{ projectData, setProjectData, handleGenerateOutline, isLoading }} />;
            case 'pendahuluan':
                return <Pendahuluan {...{ projectData, setProjectData, isLoading, handleCopyToClipboard, handleGenerateFullPendahuluan, handleModifyText }} />;
            case 'studiLiteratur':
                return <StudiLiteratur {...{ projectData, setProjectData, handleGenerateStudiLiteratur, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'metode':
                return <MetodePenelitian {...{ projectData, setProjectData, handleGenerateMetode, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'hasil':
                return <HasilPembahasan {...{ projectData, setProjectData, handleGenerateHasilPembahasan, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'kesimpulan':
                 return <Kesimpulan {...{ projectData, setProjectData, handleGenerateKesimpulan, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'dashboard':
                return <DashboardProyek {...{ projectData, setCurrentSection }} />;
            default:
                return <IdeKTI {...{ projectData, handleInputChange, handleGenerateIdeKTI, handleStartNewIdea, isLoading, aiStructuredResponse, editingIdea, setEditingIdea, handleStartEditing, handleSaveIdea, ideKtiMode }} />;
        }
    };
    
    const toggleCategory = (category) => {
        setOpenCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category) 
                : [...prev, category]
        );
    };

    const getNavigationItems = () => {
        const navigation = {
            perencanaan: {
                title: "Perencanaan & Ide",
                items: [
                    { id: 'ideKTI', name: 'Ide KTI' },
                    { id: 'referensi', name: 'Literatur & Referensi' }
                ]
            },
            instrumen: {
                title: "Instrumen Penelitian",
                items: [
                    { id: 'genLogKueri', name: 'Generator & Log Kueri'}
                ]
            },
            analisis: {
                title: "Analisis Data",
                items: [
                    { id: 'analisisKuantitatif', name: 'Analisis Data Kuantitatif (Tabel)' },
                    { id: 'analisisKualitatif', name: 'Analisis Data Kualitatif (Dokumen)' },
                    { id: 'analisisVisual', name: 'Analisis Visual (Gambar)' },
                ]
            },
            penulisan: {
                title: "Penulisan KTI",
                items: [
                    { id: 'pokokIsi', name: 'Pokok Isi KTI'},
                    { id: 'outline', name: 'Outline KTI'},
                    { id: 'pendahuluan', name: 'Pendahuluan' },
                    { id: 'studiLiteratur', name: 'Studi Literatur' },
                    { id: 'metode', name: 'Metode Penelitian' },
                    { id: 'hasil', name: 'Hasil & Pembahasan' },
                    { id: 'kesimpulan', name: 'Kesimpulan' },
                ]
            },
            proyek: {
                title: "Proyek",
                items: [
                    { id: 'dashboard', name: 'Dashboard' },
                    { id: 'imporProyek', name: 'Impor Proyek', action: triggerImport },
                    { id: 'eksporProyek', name: 'Ekspor Proyek', action: handleExportProject },
                    { id: 'resetProyek', name: 'Reset Proyek', action: () => setIsResetConfirmOpen(true) }
                ]
            },
        };

        const pendekatan = projectData.pendekatan;

        if (pendekatan === 'Kuantitatif' || pendekatan === 'Metode Campuran') {
            navigation.instrumen.items.push(
                { id: 'genVariabel', name: 'Generator Variabel' },
                { id: 'genHipotesis', name: 'Generator Hipotesis' },
                { id: 'genKuesioner', name: 'Generator Kuesioner' }
            );
        }
        
        if (pendekatan === 'Kualitatif' || pendekatan === 'Metode Campuran') {
            navigation.instrumen.items.push({ id: 'genWawancara', name: 'Generator Pertanyaan Wawancara' });
        }

        return navigation;
    };

    const navigationItems = getNavigationItems();

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); body { font-family: 'Inter', sans-serif; } .animate-fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            
            <input type="file" ref={importInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".json" />
            <input type="file" ref={importReferencesInputRef} onChange={handleFileImportReferences} style={{ display: 'none' }} accept=".json" />

            {showWelcomeModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center animate-fade-in">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Selamat Datang di Bibliocobra</h2>
                        <p className="text-gray-600 mb-6">Aplikasi ini dibuat oleh <strong>Papahnya Ibracobra</strong> dan sepenuhnya gratis untuk memajukan ilmu pengetahuan.</p>
                        <p className="text-gray-600 mb-8">Sebagai dukungan, cukup doakan agar kita semua senantiasa diberikan kesehatan dan kemudahan dalam segala urusan.</p>
                        <button onClick={handleCloseWelcomeModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-full text-lg shadow-lg hover:shadow-xl transition-all duration-300">AMIN, Mari Kita Mulai</button>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                        <p className="text-gray-700 mb-6">{modalMessage}</p>
                        <button onClick={() => setShowModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Tutup</button>
                    </div>
                </div>
            )}
            {isImportConfirmOpen && (
                 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Konfirmasi Impor Proyek</h3>
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4"><b>Peringatan:</b> Melanjutkan akan menimpa semua pekerjaan Anda yang ada saat ini dengan data dari file yang Anda impor. Tindakan ini tidak dapat diurungkan.</p>
                        <p className="text-gray-700">Apakah Anda yakin ingin melanjutkan?</p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsImportConfirmOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={confirmImport} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Ya, Timpa & Impor</button>
                        </div>
                    </div>
                </div>
            )}
            {isResetConfirmOpen && (
                 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Konfirmasi Reset Proyek</h3>
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4"><b>Peringatan:</b> Anda akan menghapus semua data proyek yang tersimpan di browser ini. Tindakan ini tidak dapat diurungkan.</p>
                        <p className="text-gray-700">Apakah Anda yakin ingin memulai proyek baru?</p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsResetConfirmOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleResetProject} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Ya, Reset Proyek</button>
                        </div>
                    </div>
                </div>
            )}
            {isClarificationModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Pertanyaan Klarifikasi</h3>
                        <p className="text-sm text-gray-600 mb-4">Untuk memberikan hasil terbaik, jawablah beberapa pertanyaan berikut:</p>
                        <div className="space-y-4">
                            {clarificationQuestions.map((q, index) => (
                                <div key={index}>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">{q}</label>
                                    <input
                                        type="text"
                                        onChange={(e) => setClarificationAnswers(prev => ({...prev, [index]: e.target.value}))}
                                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                           <button onClick={() => setIsClarificationModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                           <button onClick={handleGetFinalIdeas} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Hasilkan Ide Terfokus</button>
                        </div>
                    </div>
                </div>
            )}
            {isNoteModalOpen && (
                 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-2 text-gray-800">Tambah/Edit Catatan</h3>
                        <p className="text-sm text-gray-600 mb-4">Untuk: "{currentEditingRef?.title}"</p>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="shadow-sm border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                            rows="8"
                            placeholder="Tulis kutipan penting atau catatan Anda di sini..."
                        ></textarea>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setIsNoteModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleSaveNote} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan Catatan</button>
                        </div>
                    </div>
                </div>
            )}
            {showSearchPromptModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-purple-800">🗺️ Peta Jalan & Alat Pencarian Referensi</h3>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                <p className="text-gray-600 mt-4">Mempersiapkan peta jalan...</p>
                            </div>
                        ) : projectData.aiReferenceClues ? (
                            <div className="overflow-y-auto flex-grow space-y-4 pr-2">
                                {projectData.aiReferenceClues.map((category, catIndex) => (
                                    <div key={catIndex} className="mb-4">
                                        <h4 className="font-bold text-gray-800 mb-2">{category.category}</h4>
                                        <div className="space-y-3">
                                            {category.clues.map((clue, clueIndex) => (
                                                <div key={clueIndex} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                                    <p className="font-semibold text-gray-800">{clue}</p>
                                                    <p className="text-sm italic text-purple-800 my-2">✍️ {aiClueNarratives[clue.trim()] || 'Memuat narasi...'}</p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(clue)}`} target="_blank" rel="noopener noreferrer" className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-lg">Cek di Google Scholar</a>
                                                        <a href={`https://www.semanticscholar.org/search?q=${encodeURIComponent(clue)}`} target="_blank" rel="noopener noreferrer" className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded-lg">Cek di Semantic Scholar</a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-gray-600 text-center py-10">Tidak ada 'Clue Referensi' yang ditemukan.</p>}
                        <div className="mt-6 pt-4 border-t flex justify-end">
                            <button onClick={() => setShowSearchPromptModal(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Tutup</button>
                        </div>
                    </div>
                </div>
            )}


            <div className="flex w-full">
                <aside className={`bg-gray-800 text-white h-screen p-4 flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300`}>
                     <div className="flex items-center justify-between mb-6">
                        {isSidebarOpen && <h1 className="text-xl font-bold whitespace-nowrap">Bibliocobra</h1>}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded-md hover:bg-gray-700">
                           {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                    
                    <nav>
                        {Object.entries(navigationItems).map(([key, category]) => (
                            (category.items.length === 0) ? null : (
                            <div key={key} className="mb-4">
                                <button onClick={() => toggleCategory(key)} className="w-full flex items-center justify-between text-left p-2 rounded-md hover:bg-gray-700">
                                    {isSidebarOpen && <span className="font-semibold">{category.title}</span>}
                                    <ChevronDownIcon isOpen={openCategories.includes(key)} />
                                </button>
                                {openCategories.includes(key) && isSidebarOpen && (
                                    <div className="mt-2 pl-4">
                                        {category.items.map(item => (
                                            <button 
                                                key={item.id} 
                                                onClick={() => item.action ? item.action() : setCurrentSection(item.id)}
                                                className={`w-full text-left block p-2 rounded-md text-sm ${currentSection === item.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                                            >
                                                {item.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            )
                        ))}
                    </nav>
                </aside>

                <main className="flex-grow p-4 md:p-8 overflow-y-auto h-screen">
                    <div className="w-full max-w-4xl mx-auto">
                        
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-gray-800">BIBLIOCOBRA KTI GENERATOR</h1>
                            <p className="text-md text-gray-600">Asisten Penulisan KTI Anda</p>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <label htmlFor="geminiApiKey" className="block text-gray-700 text-sm font-bold mb-2">Google AI API Key Anda:</label>
                                <input
                                    type="password"
                                    id="geminiApiKey"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                    placeholder="Masukkan Google AI API Key Anda"
                                />
                                <p className="text-xs text-gray-500 mt-1">Dapatkan kunci dari <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Google AI Studio</a>. Kunci tidak disimpan dan hanya digunakan di browser Anda.</p>
                            </div>

                            {projectData.judulKTI && (
                                <div className="mb-8 p-4 bg-indigo-100 border-l-4 border-indigo-500 rounded-lg animate-fade-in">
                                    <div>
                                        <p className="text-sm font-bold text-indigo-800">Judul Proyek Anda:</p>
                                        <h2 className="text-lg font-semibold text-gray-800">{projectData.judulKTI}</h2>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 p-6 rounded-lg shadow-inner min-h-[400px]">
                                {renderSection()}
                            </div>

                        </div>
                         <footer className="mt-8 text-gray-500 text-sm text-center">
                            <p>&copy; Copyright 2025. Papahnya Ibracobra. All rights reserved.</p>
                        </footer>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
