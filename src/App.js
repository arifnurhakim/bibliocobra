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


// ============================================================================
// SERVICES: Centralized API Logic
// ============================================================================

const geminiService = {
    run: async (prompt, schema = null) => {
        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };

        if (schema) {
            payload.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: schema
            };
        }

        const apiKey = ""; // Disediakan oleh environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
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

const scopusService = {
    search: async (query, apiKey, start = 0, count = 5) => {
        const url = `https://api.elsevier.com/content/search/scopus?query=TITLE-ABS-KEY(${encodeURIComponent(query)})&count=${count}&start=${start}&field=dc:title,dc:creator,prism:publicationName,prism:coverDate,prism:doi,dc:description`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'X-ELS-APIKey': apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 const errorMessage = errorData?.['service-error']?.status?.statusText || `HTTP error! status: ${response.status}`;
                 throw new Error(errorMessage);
            }

            const results = await response.json();
            if (results['search-results'] && results['search-results'].entry) {
                return results['search-results'].entry.map(item => ({
                    author: item['dc:creator'] || 'N/A',
                    year: new Date(item['prism:coverDate']).getFullYear() || 'N/A',
                    title: item['dc:title'] || 'No Title',
                    journal: item['prism:publicationName'] || 'N/A',
                    doi: item['prism:doi'] || '',
                    abstract: item['dc:description'] || ''
                }));
            }
            return [];
        } catch (error) {
            console.error("Kesalahan saat memanggil Scopus API:", error);
            throw error;
        }
    }
};


// ============================================================================
// KOMPONEN: Masing-masing Tab dipecah menjadi komponennya sendiri.
// ============================================================================

// --- Komponen untuk Tab 1: Ide KTI ---
const IdeKTI = ({ 
    projectData, 
    handleInputChange, 
    handleGenerateIdeKTI, 
    isLoading, 
    aiStructuredResponse, 
    aiResponse,
    editingIdea,
    setEditingIdea,
    handleStartEditing,
    handleStartNewIdea,
    handleSaveIdea
}) => {
    if (projectData.judulKTI && !editingIdea) {
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
                    <button onClick={handleStartNewIdea} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm">
                        Edit Ide
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Ide KTI</h2>
            {!editingIdea && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                        <label className="block text-gray-700 text-sm font-bold mb-2">Pendekatan Penelitian:</label>
                        <select name="pendekatan" value={projectData.pendekatan} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700">
                            <option value="" disabled>Pilih pendekatan...</option>
                            <option value="Kuantitatif">Kuantitatif</option>
                            <option value="Kualitatif">Kualitatif</option>
                            <option value="Metode Campuran">Metode Campuran (Mixed-Methods)</option>
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
            )}
            
            {!editingIdea && (
                <div className="flex flex-wrap gap-4">
                    <button onClick={handleGenerateIdeKTI} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isLoading || !projectData.topikTema}>
                        {isLoading ? 'Meminta Pertanyaan...' : '✨ Hasilkan Ide dari AI'}
                    </button>
                    <button onClick={handleStartNewIdea} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300" disabled={isLoading}>
                        💡 Tulis Ide Sendiri
                    </button>
                </div>
            )}

            {isLoading && !aiStructuredResponse && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang memproses...</p>
                </div>
            )}

            {aiStructuredResponse && aiStructuredResponse.length > 0 && (
                <div className="mt-8">
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
                <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Area Konfirmasi & Penyuntingan Ide</h3>
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
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
                            Simpan Ide & Lanjutkan
                        </button>
                    </div>
                </div>
            )}

            {aiResponse && (
                 <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg">
                    <p className="font-bold">Terjadi Kesalahan:</p>
                    <p className="whitespace-pre-wrap">{aiResponse}</p>
                </div>
            )}
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
    handleFindReferences, 
    handleGenerateReferenceClues,
    isLoading, 
    scopusApiKey, 
    setScopusApiKey, 
    handleSaveScopusKey,
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
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Metode 1: Pencarian Otomatis</h4>
                <p className="text-sm text-blue-700 mb-4">Gunakan API Scopus (rekomendasi) atau AI untuk mencari referensi dan menambahkannya ke proyek.</p>
                
                {/* Fitur Clue Referensi */}
                <div className="mb-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-800 mb-2">Butuh ide kata kunci? Dapatkan clue dari AI.</p>
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

                <div className="mb-4 mt-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">API Key Scopus (Opsional):</label>
                    <div className="flex items-center gap-2">
                        <input type="password" value={scopusApiKey} onChange={(e) => setScopusApiKey(e.target.value)} className="shadow-sm border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Masukkan API Key Anda"/>
                        <button onClick={handleSaveScopusKey} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg whitespace-nowrap">Gunakan Kunci</button>
                    </div>
                     <p className="text-xs text-gray-500 mt-1">Dapatkan API key <a href="https://dev.elsevier.com/user/signin" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">disini</a>.</p>
                </div>
                <button onClick={() => handleFindReferences(false)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-purple-300" disabled={isLoading || !projectData.topikTema}>
                    {isLoading ? 'Mencari...' : '✨ Cari Referensi & Tambahkan'}
                </button>
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

// --- Komponen Placeholder untuk Bab Baru ---
const ComingSoon = ({ title }) => (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-gray-600">Fitur ini sedang dalam pengembangan dan akan segera hadir!</p>
    </div>
);


// ============================================================================
// KOMPONEN UTAMA: App
// ============================================================================
function App() {
    const [currentSection, setCurrentSection] = useState('ideKTI');
    const [projectData, setProjectData] = useState({
        scopusApiKey: '',
        jenisKaryaTulis: 'Artikel Ilmiah',
        jenisKaryaTulisLainnya: '',
        topikTema: '',
        pendekatan: '', // Diubah menjadi string kosong untuk placeholder
        metode: '',
        periode: '',
        basisData: '',
        tools: '',
        judulKTI: '',
        kataKunci: '',
        penjelasan: '',
        allReferences: [],
        faktaMasalahDraft: '',
        tujuanPenelitianDraft: '',
        teoriPenelitianDraft: '',
        outlineDraft: null,
        pendahuluanDraft: '',
        metodeDraft: '',
        studiLiteraturDraft: '',
        aiReferenceClues: null,
    });
    
    const [editingIdea, setEditingIdea] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [aiStructuredResponse, setAiStructuredResponse] = useState(null);
    
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
    const [showAiReferenceModal, setShowAiReferenceModal] = useState(false);
    const [aiSuggestedReferences, setAiSuggestedReferences] = useState([]);
    const [scopusApiKey, setScopusApiKey] = useState('');

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [currentEditingRef, setCurrentEditingRef] = useState(null);
    const [noteText, setNoteText] = useState('');
    
    const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
    const [clarificationQuestions, setClarificationQuestions] = useState([]);
    const [clarificationAnswers, setClarificationAnswers] = useState({});
    
    const [scopusSearchStart, setScopusSearchStart] = useState(0);
    const importInputRef = useRef(null);
    const importReferencesInputRef = useRef(null);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [importedData, setImportedData] = useState(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openCategories, setOpenCategories] = useState(['perencanaan', 'penulisan']);

    useEffect(() => {
        try {
            const savedData = localStorage.getItem('kti-bibliometric-project');
            const initialData = {
                scopusApiKey: '',
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
                faktaMasalahDraft: '',
                tujuanPenelitianDraft: '',
                teoriPenelitianDraft: '',
                outlineDraft: null,
                pendahuluanDraft: '',
                metodeDraft: '',
                studiLiteraturDraft: '',
                aiReferenceClues: null,
            };
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setProjectData({ ...initialData, ...parsedData });
                setScopusApiKey(parsedData.scopusApiKey || '');
            } else {
                setProjectData(initialData);
            }
        } catch (error) {
            console.error("Gagal memuat data dari localStorage:", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('kti-bibliometric-project', JSON.stringify(projectData));
        } catch (error) {
            console.error("Gagal menyimpan data ke localStorage:", error);
        }
    }, [projectData]);

    const handleSaveScopusKey = () => {
        setProjectData(prev => ({...prev, scopusApiKey: scopusApiKey}));
        showInfoModal("API Key Scopus berhasil diterapkan untuk sesi ini.");
    };
    
    const showInfoModal = (message) => {
        setModalMessage(message);
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateIdeKTI = async () => {
        setIsLoading(true);
        setAiResponse('');
        setAiStructuredResponse(null);
        setEditingIdea(null);
        
        const jenisKarya = projectData.jenisKaryaTulis === 'Lainnya' ? projectData.jenisKaryaTulisLainnya : projectData.jenisKaryaTulis;
        const prompt = `Berdasarkan konteks penelitian berikut, buat 3 pertanyaan klarifikasi singkat untuk membantu mempersempit dan memfokuskan ide penelitian. Pertanyaan harus menggali aspek spesifik, sudut pandang, atau tujuan yang diinginkan pengguna.
- Topik: "${projectData.topikTema}"
- Jenis Karya Tulis: "${jenisKarya}"
- Metode: "${projectData.metode || 'Belum ditentukan'}"`;
        
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
            const result = await geminiService.run(prompt, schema);
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
            const result = await geminiService.run(prompt, schema);
            setAiStructuredResponse(result);
        } catch (error) {
            setAiResponse(error.message);
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
        setProjectData(prev => ({
            ...prev,
            judulKTI: editingIdea.judul,
            kataKunci: editingIdea.kata_kunci,
            penjelasan: editingIdea.penjelasan,
        }));
        setEditingIdea(null);
        setAiStructuredResponse(null);
        showInfoModal(`Ide KTI "${editingIdea.judul}" berhasil disimpan.`);
        setCurrentSection('referensi');
    };

    const handleFindReferences = async (isMore = false) => {
        if (!isMore) {
            setIsLoading(true);
            setAiSuggestedReferences([]);
            setScopusSearchStart(0);
            setShowAiReferenceModal(true);
        } else {
            setIsFetchingMore(true);
        }

        try {
            if (projectData.scopusApiKey) {
                const newStart = isMore ? scopusSearchStart + 5 : 0;
                const results = await scopusService.search(projectData.topikTema, projectData.scopusApiKey, newStart);
                setAiSuggestedReferences(prev => isMore ? [...prev, ...results] : results);
                setScopusSearchStart(newStart);
            } else {
                // Gemini-based search
                const existingTitles = aiSuggestedReferences.map(r => r.title).join('; ');
                const prompt = `Berdasarkan topik "${projectData.topikTema}", carikan 5 referensi akademis relevan. ${existingTitles ? `Jangan sertakan judul berikut: ${existingTitles}` : ''}. Berikan author, year, title, journal, doi, dan relevance_summary (satu kalimat ringkasan mengapa artikel ini relevan dengan topik).`;
                const schema = {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: { 
                            "author": { "type": "STRING" }, "year": { "type": "NUMBER" }, "title": { "type": "STRING" }, 
                            "journal": { "type": "STRING" }, "doi": { "type": "STRING" }, "relevance_summary": { "type": "STRING" }
                        },
                        required: ["author", "year", "title", "journal", "relevance_summary"]
                    }
                };
                const results = await geminiService.run(prompt, schema);
                setAiSuggestedReferences(prev => isMore ? [...prev, ...results] : results);
            }
        } catch (error) {
            showInfoModal(`Gagal mencari referensi: ${error.message}`);
            if (!isMore) setShowAiReferenceModal(false);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    const handleAddSuggestedReference = (ref) => {
        const newRef = { 
            id: Date.now(),
            title: ref.title || '',
            journal: ref.journal || '',
            year: ref.year || '',
            author: ref.author || '',
            doi: ref.doi || '',
            isiKutipan: ref.abstract || ref.relevance_summary || '',
            editors: '', volume: '', issue: '', pages: '', url: '', publisher: ''
        };
        setProjectData(prev => ({ ...prev, allReferences: [...prev.allReferences, newRef] }));
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
				default:
    console.warn(`Kunci "${key}" tidak dikenali`);
    break;
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
            // Update existing
            setProjectData(prev => ({
                ...prev,
                allReferences: prev.allReferences.map(ref => ref.id === manualRef.id ? { ...ref, ...parsedRef, id: manualRef.id } : ref)
            }));
        } else {
            // Add new
            setProjectData(prev => ({
                ...prev,
                allReferences: [...prev.allReferences, { ...parsedRef, id: Date.now(), isiKutipan: '' }]
            }));
        }
        setManualRef({ id: null, text: manualRefTemplate }); // Reset form to template
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
            const parsedRef = await geminiService.run(prompt, schema);
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
                    citation += ` ${ref.journal}`; // Dibuat plain text
                    if (ref.volume) {
                        citation += `, ${ref.volume}`;
                    }
                    if (ref.issue) {
                        citation += `(${ref.issue})`;
                    }
                    if (ref.pages) {
                        citation += `, ${ref.pages}`;
                    }
                    citation += '.';
                }
                if (ref.doi) {
                    citation += ` https://doi.org/${ref.doi}`;
                } else if (ref.url) {
                    citation += ` ${ref.url}`;
                }
                return citation;
            }).join('\n\n');
        setGeneratedApaReferences(list.replace(/\n/g, '<br />')); // Tetap pakai <br> untuk tampilan di HTML
    };

    const handleCopyToClipboard = (text) => {
        // Membersihkan teks dari semua format
        const plainText = text
            .replace(/<br\s*\/?>/gi, "\n") // Mengganti <br> dengan newline
            .replace(/<[^>]*>/g, "")       // Menghapus semua tag HTML lainnya
            .replace(/[*_]/g, "");          // Menghapus karakter markdown * dan _

        const textArea = document.createElement("textarea");
        textArea.value = plainText;
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showInfoModal("Teks berhasil disalin!");
            } else {
                showInfoModal("Gagal menyalin teks.");
            }
        } catch (err) {
            showInfoModal("Gagal menyalin teks karena kesalahan teknis.");
            console.error('Fallback: Gagal menyalin teks', err);
        }

        document.body.removeChild(textArea);
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
            const result = await geminiService.run(prompt, schema);
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
            const result = await geminiService.run(prompt, schema);
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
            const result = await geminiService.run(prompt, schema);
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
            const result = await geminiService.run(prompt);
            // Membersihkan hasil dari AI untuk memastikan tidak ada format yang lolos
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
            const result = await geminiService.run(prompt);
             // Membersihkan hasil dari AI untuk memastikan tidak ada format yang lolos
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
            const result = await geminiService.run(prompt);
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
            const result = await geminiService.run(prompt);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, studiLiteraturDraft: cleanResult }));
            showInfoModal("Draf Studi Literatur berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal menulis Studi Literatur: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportProject = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(projectData, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `bibliocobra_project_${date}.json`;
            link.click();
        } catch (error) {
            showInfoModal("Gagal mengekspor proyek.");
            console.error("Export error:", error);
        }
    };

    const triggerImport = () => {
        importInputRef.current.click();
    };

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
                    console.error("Import parse error:", error);
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
    
    const handleExportReferences = () => {
        try {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(projectData.allReferences, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `bibliocobra_references_${date}.json`;
            link.click();
        } catch (error) {
            showInfoModal("Gagal mengekspor referensi.");
            console.error("Export error:", error);
        }
    };

    const triggerReferencesImport = () => {
        importReferencesInputRef.current.click();
    };

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
                    console.error("Import parse error:", error);
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
                return <IdeKTI {...{ projectData, handleInputChange, handleGenerateIdeKTI, isLoading, aiStructuredResponse, aiResponse, editingIdea, setEditingIdea, handleStartEditing, handleStartNewIdea, handleSaveIdea }} />;
            case 'referensi':
                return <Referensi {...{ projectData, setProjectData, manualRef, setManualRef, handleSaveManualReference, freeTextRef, setFreeTextRef, handleImportFromText, handleEditReference, handleDeleteReference, handleGenerateApa, generatedApaReferences, handleCopyToClipboard, handleFindReferences, handleGenerateReferenceClues, isLoading, scopusApiKey, setScopusApiKey, handleSaveScopusKey, openNoteModal, triggerReferencesImport, handleExportReferences }} />;
            case 'pokokIsi':
                return <PokokIsi {...{ projectData, setProjectData, handleGeneratePokokIsi, isLoading }} />;
            case 'outline':
                return <Outline {...{ projectData, setProjectData, handleGenerateOutline, isLoading }} />;
            case 'studiLiteratur':
                return <StudiLiteratur {...{ projectData, setProjectData, handleGenerateStudiLiteratur, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'metode':
                return <MetodePenelitian {...{ projectData, setProjectData, handleGenerateMetode, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'pendahuluan':
                return <Pendahuluan {...{ projectData, setProjectData, isLoading, handleCopyToClipboard, handleGenerateFullPendahuluan, handleModifyText }} />;
            default:
                return <ComingSoon title={currentSection} />;
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
        const basePenulisan = [
            { id: 'pendahuluan', name: 'Pendahuluan' },
            { id: 'studiLiteratur', name: 'Studi Literatur' },
            { id: 'metode', name: 'Metode Penelitian' },
        ];

        if (projectData.pendekatan === 'Kuantitatif') {
            return {
                perencanaan: {
                    title: "Perencanaan & Ide",
                    items: [ { id: 'ideKTI', name: 'Ide KTI' }, { id: 'referensi', name: 'Literatur & Referensi' } ]
                },
                penulisan: {
                    title: "Penulisan KTI",
                    items: [
                        ...basePenulisan,
                        { id: 'hasil', name: 'Hasil' },
                        { id: 'pembahasan', name: 'Pembahasan' },
                        { id: 'kesimpulan', name: 'Kesimpulan' },
                    ]
                }
            };
        } else if (projectData.pendekatan === 'Kualitatif') {
             return {
                perencanaan: {
                    title: "Perencanaan & Ide",
                    items: [ { id: 'ideKTI', name: 'Ide KTI' }, { id: 'referensi', name: 'Literatur & Referensi' } ]
                },
                penulisan: {
                    title: "Penulisan KTI",
                    items: [
                        ...basePenulisan,
                        { id: 'temuan', name: 'Temuan' },
                        { id: 'diskusi', name: 'Diskusi' },
                        { id: 'kesimpulan', name: 'Kesimpulan' },
                    ]
                }
            };
        } else { // Metode Campuran
             return {
                perencanaan: {
                    title: "Perencanaan & Ide",
                    items: [ { id: 'ideKTI', name: 'Ide KTI' }, { id: 'referensi', name: 'Literatur & Referensi' } ]
                },
                penulisan: {
                    title: "Penulisan KTI",
                    items: [
                        ...basePenulisan,
                        { id: 'hasil', name: 'Hasil' },
                        { id: 'pembahasan', name: 'Pembahasan' },
                        { id: 'kesimpulan', name: 'Kesimpulan' },
                    ]
                }
            };
        }
    };

    const navigationItems = getNavigationItems();

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); body { font-family: 'Inter', sans-serif; } .animate-fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            
            <input type="file" ref={importInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".json" />
            <input type="file" ref={importReferencesInputRef} onChange={handleFileImportReferences} style={{ display: 'none' }} accept=".json" />


            {/* All Modals */}
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
            {showAiReferenceModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-purple-800">✨ {projectData.scopusApiKey ? "Hasil Pencarian Scopus" : "Kandidat Referensi dari AI"}</h3>
                        {isLoading && !isFetchingMore ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                <p className="text-gray-600 mt-4">Mencari referensi...</p>
                            </div>
                        ) : aiSuggestedReferences.length > 0 ? (
                            <div className="overflow-y-auto flex-grow space-y-4">
                                {aiSuggestedReferences.map((ref, index) => {
                                    const isAdded = projectData.allReferences.some(pRef => pRef.title === ref.title);
                                    return (
                                        <div key={index} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                            <p className="font-bold text-gray-800">{ref.title}</p>
                                            <p className="text-sm text-gray-600">{ref.author} ({ref.year})</p>
                                            <p className="text-sm text-gray-600 italic">{ref.journal}</p>
                                            {ref.doi && <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">DOI: {ref.doi}</a>}
                                            <div className="mt-3 flex flex-wrap gap-2 items-center">
                                                <button onClick={() => handleAddSuggestedReference(ref)} disabled={isAdded} className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold py-1 px-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                                                    {isAdded ? '✔ Ditambahkan' : '+ Tambahkan ke Proyek'}
                                                </button>
                                                {!projectData.scopusApiKey && <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(ref.title)}`} target="_blank" rel="noopener noreferrer" className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-1 px-3 rounded-lg">Verifikasi di Google Scholar</a>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <p className="text-gray-600 text-center py-10">Tidak ada referensi yang ditemukan.</p>}
                        <div className="mt-6 pt-4 border-t flex justify-between items-center">
                            <button onClick={() => handleFindReferences(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-purple-300" disabled={isFetchingMore}>
                                {isFetchingMore ? 'Mencari...' : '✨ Cari 5 Kandidat Lagi'}
                            </button>
                            <button onClick={() => setShowAiReferenceModal(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex w-full">
                {/* Sidebar */}
                <aside className={`bg-gray-800 text-white h-screen p-4 flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300`}>
                     <div className="flex items-center justify-between mb-6">
                        {isSidebarOpen && <h1 className="text-xl font-bold whitespace-nowrap">Bibliocobra</h1>}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded-md hover:bg-gray-700">
                           {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                    
                    <nav>
                        {Object.entries(navigationItems).map(([key, category]) => (
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
                                                onClick={() => setCurrentSection(item.id)}
                                                className={`w-full text-left block p-2 rounded-md text-sm ${currentSection === item.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                                            >
                                                {item.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-grow p-4 md:p-8 overflow-y-auto h-screen">
                    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
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

                        <div className="mt-6 pt-6 border-t border-gray-200 flex justify-center gap-4">
                            <button onClick={triggerImport} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Impor Proyek</button>
                            <button onClick={handleExportProject} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Ekspor Proyek</button>
                        </div>
                    </div>
                     <footer className="mt-8 text-gray-500 text-sm text-center">
                        <p>&copy; 2025 Asisten KTI Bibliometrik. All rights reserved.</p>
                    </footer>
                </main>
            </div>
        </div>
    );
}

export default App;
