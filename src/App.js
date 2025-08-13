
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Type, Schema } from '@google/genai';
import useLocalStorage from './hooks/useLocalStorage';
import { runGemini } from './services/geminiService';
import type { ProjectData, Reference, AIStructuredIdea, AIReferenceCluesResponse, OutlineBab, AISuggestedVariable, AIHypothesisPair, AIKuesionerItem, AIWawancaraItem, AIQuery, SearchLog } from './types';
import { WelcomeModal, InfoModal, ConfirmationModal, ClarificationModal, NoteModal, SearchPromptModal } from './components/Modals';
import { Sidebar } from './components/Sidebar';
import * as Sections from './components/sections';

const initialProjectData: ProjectData = {
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
    analisisKuantitatifHasil: '',
    analisisKuantitatifDraft: '',
    analisisKualitatifHasil: null,
    analisisKualitatifDraft: '',
    deskripsiVisualisasi: '',
    interpretasiData: '',
    analisisVisualDraft: '',
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

function App() {
    const [projectData, setProjectData] = useLocalStorage<ProjectData>('kti-bibliometric-project', initialProjectData);
    const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('gemini-api-key', '');
    const [currentSection, setCurrentSection] = useState('ideKTI');
    const [isLoading, setIsLoading] = useState(false);
    
    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [importedData, setImportedData] = useState<ProjectData | null>(null);

    // Section-specific state
    const [ideKtiMode, setIdeKtiMode] = useState<'ai' | 'manual' | null>(null);
    const [editingIdea, setEditingIdea] = useState<AIStructuredIdea | null>(null);
    const [aiStructuredResponse, setAiStructuredResponse] = useState<AIStructuredIdea[] | null>(null);
    const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
    const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
    const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, string>>({});
    
    const [manualRef, setManualRef] = useState({ id: null as number | null, text: manualRefTemplate });
    const [freeTextRef, setFreeTextRef] = useState('');
    const [generatedApaReferences, setGeneratedApaReferences] = useState('');
    const [showSearchPromptModal, setShowSearchPromptModal] = useState(false);
    const [aiClueNarratives, setAiClueNarratives] = useState<Record<string, string>>({});
    
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [currentEditingRef, setCurrentEditingRef] = useState<Reference | null>(null);
    const [noteText, setNoteText] = useState('');
    
    const [lastCopiedQuery, setLastCopiedQuery] = useState({ query: '' });
    const [includeIndonesianQuery, setIncludeIndonesianQuery] = useState(false);

    const importInputRef = useRef<HTMLInputElement>(null);
    const importReferencesInputRef = useRef<HTMLInputElement>(null);

    // Effects
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
        if (!hasSeenWelcome) {
            setShowWelcomeModal(true);
        }
    }, []);

    const handleCloseWelcomeModal = () => {
        localStorage.setItem('hasSeenWelcomeModal', 'true');
        setShowWelcomeModal(false);
    };

    const displayInfoModal = (message: string) => {
        setModalMessage(message);
        setShowInfoModal(true);
    };
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
    };

    // --- Core Handlers ---
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
        
        const schema: Schema = { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["questions"] };

        try {
            const result = await runGemini(prompt, geminiApiKey, schema);
            setClarificationQuestions(result.questions);
            setClarificationAnswers({});
            setIsClarificationModalOpen(true);
        } catch (error) {
            displayInfoModal(`Gagal menghasilkan pertanyaan klarifikasi: ${error instanceof Error ? error.message : String(error)}`);
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
        
        const schema: Schema = {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { "judul": { "type": Type.STRING }, "kata_kunci": { "type": Type.STRING }, "penjelasan": { "type": Type.STRING } }, required: ["judul", "kata_kunci", "penjelasan"] }
        };

        try {
            const result = await runGemini(prompt, geminiApiKey, schema);
            setAiStructuredResponse(result);
        } catch (error) {
            displayInfoModal(`Gagal menghasilkan ide: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartEditing = (idea: AIStructuredIdea) => setEditingIdea(idea);

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
        if (!editingIdea?.judul) {
            displayInfoModal("Judul KTI tidak boleh kosong.");
            return;
        }
        setProjectData(prev => ({ ...prev, judulKTI: editingIdea.judul, kataKunci: editingIdea.kata_kunci, penjelasan: editingIdea.penjelasan }));
        setEditingIdea(null);
        setAiStructuredResponse(null);
        setIdeKtiMode(null);
        displayInfoModal(`Proyek "${editingIdea.judul}" berhasil disimpan.`);
        setCurrentSection('referensi');
    };

    const handleGenerateReferenceClues = async () => {
        setIsLoading(true);
        setProjectData(prev => ({ ...prev, aiReferenceClues: null }));
    
        const context = `
- Topik: "${projectData.topikTema}"
- Jenis Karya Tulis: "${projectData.jenisKaryaTulis === 'Lainnya' ? projectData.jenisKaryaTulisLainnya : projectData.jenisKaryaTulis}"
- Metode: "${projectData.metode || 'Belum ditentukan'}"
`;
    
        const prompt = `
Anda adalah asisten riset ahli untuk generator KTI. Tugas Anda: kembalikan peta kelompok referensi
yang akan membimbing pengguna melakukan tinjauan pustaka lintas disiplin.

KELUARAN WAJIB: HANYA JSON valid sesuai skema di bawah (tanpa penjelasan tambahan).
Gunakan bahasa Indonesia.

Skema keluaran:
{
  "topic": string,
  "method_detected": string | null,
  "groups": [
    {
      "id": "G1"|"G2"|...|"G10",
      "name": string,
      "focus": string[],
      "doc_types": string[],
      "keywords": string[],
      "sources": string[],
      "priority": "tinggi"|"sedang"|"rendah",
      "notes": string
    }
  ]
}

Gunakan 10 kelompok standar berikut dengan ID tetap:
G1  Landasan Konseptual & Definisi Istilah
G2  Kerangka Teori & Model Analisis
G3  Konteks & Latar Belakang (global/nasional)
G4  Standar, Regulasi, & Pedoman Teknis
G5  State of the Art & Studi Terdahulu
G6  Metodologi & Pendekatan Analisis
G7  Data, Statistik, & Sumber Fakta
G8  Kasus Pembanding & Benchmarking
G9  Implikasi Kebijakan & Praktik
G10 Kesenjangan Pengetahuan & Arah Riset

ATURAN PENTING:
- Deteksi jika KONTEKS menyebut "Metode" (mis. SLR, bibliometrik, eksperimen, RCT, studi kasus).
  * Jika ADA, pada G6 tuliskan rincian spesifik metode itu dan JANGAN menyarankan metode lain.
  * Jika TIDAK ADA, barulah sarankan 2–3 pendekatan metodologi yang relevan.
- Semua keywords harus disesuaikan dengan TOPIK pada konteks.
- Sertakan kombinasi keyword berformat kueri siap pakai.
- Sumber harus relevan dengan kelompok.
- Batasi setiap array agar ringkas.
- Kembalikan HANYA JSON (tanpa markdown, tanpa penjelasan).

Konteks Proyek:
---
${context}
---
`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              method_detected: { type: Type.STRING, nullable: true },
              groups: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    focus: { type: Type.ARRAY, items: { type: Type.STRING } },
                    doc_types: { type: Type.ARRAY, items: { type: Type.STRING } },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sources: { type: Type.ARRAY, items: { type: Type.STRING } },
                    priority: { type: Type.STRING },
                    notes: { type: Type.STRING }
                  },
                  required: ["id", "name", "focus", "doc_types", "keywords", "sources", "priority", "notes"]
                }
              }
            },
            required: ["topic", "method_detected", "groups"]
          };
        
        try {
            const result: AIReferenceCluesResponse = await runGemini(prompt, geminiApiKey, schema);
            setProjectData(prev => ({ ...prev, aiReferenceClues: result }));
            displayInfoModal("Peta jalan referensi berhasil dibuat!");
    
        } catch (error) {
            displayInfoModal(`Gagal membuat peta jalan: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleShowSearchPrompts = async () => {
        if (!projectData.aiReferenceClues?.groups) {
            displayInfoModal("Harap hasilkan 'Peta Jalan Referensi' terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        setShowSearchPromptModal(true);
        const allClues = projectData.aiReferenceClues.groups.flatMap(group => group.keywords || []);
        const prompt = `Untuk setiap kata kunci penelitian (clue) berikut, tuliskan satu kalimat narasi singkat (tujuan) dalam Bahasa Indonesia yang menjelaskan mengapa seorang peneliti perlu mencari kata kunci tersebut. Daftar Clues:\n${allClues.map(clue => `- "${clue}"`).join('\n')}`;
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { clue: { type: Type.STRING }, narrative: { type: Type.STRING } }, required: ["clue", "narrative"] }};
        try {
            const results = await runGemini(prompt, geminiApiKey, schema);
            const narrativeMap = results.reduce((acc: Record<string, string>, item: {clue: string, narrative: string}) => {
                acc[item.clue.trim()] = item.narrative;
                return acc;
            }, {});
            setAiClueNarratives(narrativeMap);
        } catch (error) {
            displayInfoModal(`Gagal menghasilkan narasi untuk clues: ${error instanceof Error ? error.message : String(error)}`);
            setShowSearchPromptModal(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    const parseManualReference = (text: string) => {
        const lines = text.split('\n');
        const reference: Partial<Reference> = {};
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
            }
        });
        return reference as Omit<Reference, 'id' | 'isiKutipan'>;
    };

    const handleSaveManualReference = () => {
        const parsedRef = parseManualReference(manualRef.text);
        if (!parsedRef.title || !parsedRef.author || !parsedRef.year) {
            displayInfoModal("Journal Article Title, Contributing Authors, dan Date wajib diisi dalam template.");
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
        const prompt = `Urai teks referensi berikut dan kembalikan dalam format JSON. Kunci JSON harus: title, author, year, journal, volume, issue, pages, doi. Jika sebuah informasi tidak ada, biarkan string kosong. Teks: "${freeTextRef}"`;
        const schema: Schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, author: { type: Type.STRING }, year: { type: Type.STRING }, journal: { type: Type.STRING }, volume: { type: Type.STRING }, issue: { type: Type.STRING }, pages: { type: Type.STRING }, doi: { type: Type.STRING } }, required: ["title", "author", "year"] };
        try {
            const parsedRef = await runGemini(prompt, geminiApiKey, schema);
            const newRef = { ...parsedRef, id: Date.now(), isiKutipan: '' };
            setProjectData(prev => ({ ...prev, allReferences: [...prev.allReferences, newRef] }));
            setFreeTextRef('');
            displayInfoModal("Referensi berhasil diimpor!");
        } catch (error) {
            displayInfoModal(`Gagal mengimpor referensi: ${error instanceof Error ? error.message : String(error)}. Coba gunakan metode template.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditReference = (ref: Reference) => {
        const text = `Journal Article Title: ${ref.title || ''}\nJournal Name: ${ref.journal || ''}\nDate: ${ref.year || ''}\nContributing Authors: ${ref.author || ''}\nEditors Name: ${ref.editors || ''}\nVolume: ${ref.volume || ''}\nIssue: ${ref.issue || ''}\nPages: ${ref.pages || ''}\nURL: ${ref.url || ''}\nDOI: ${ref.doi || ''}\nPublisher Name: ${ref.publisher || ''}`;
        setManualRef({ id: ref.id, text: text });
        window.scrollTo(0, 0);
    };

    const handleDeleteReference = (id: number) => setProjectData(prev => ({ ...prev, allReferences: prev.allReferences.filter(ref => ref.id !== id) }));

    const openNoteModal = (ref: Reference) => {
        setCurrentEditingRef(ref);
        setNoteText(ref.isiKutipan || '');
        setIsNoteModalOpen(true);
    };

    const handleSaveNote = () => {
        if (!currentEditingRef) return;
        setProjectData(prev => ({
            ...prev,
            allReferences: prev.allReferences.map(ref => ref.id === currentEditingRef.id ? { ...ref, isiKutipan: noteText } : ref)
        }));
        setIsNoteModalOpen(false);
    };

    const handleGenerateApa = () => {
        const list = projectData.allReferences
            .sort((a, b) => (a.author || '').localeCompare(b.author || ''))
            .map(ref => {
                let citation = `${ref.author || ''} (${ref.year || 't.t.'}). ${ref.title || ''}.`;
                if (ref.journal) { citation += ` <em>${ref.journal}</em>`; if (ref.volume) citation += `, <em>${ref.volume}</em>`; if (ref.issue) citation += `(${ref.issue})`; if (ref.pages) citation += `, ${ref.pages}`; citation += '.'; }
                if (ref.doi) { citation += ` https://doi.org/${ref.doi}`; } else if (ref.url) { citation += ` ${ref.url}`; }
                return citation;
            }).join('\n\n');
        setGeneratedApaReferences(list.replace(/\n/g, '<br />'));
    };

    const handleCopyToClipboard = (text: string) => {
        if (!text) return;
        const plainText = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/[*_]/g, "");
        navigator.clipboard.writeText(plainText).then(() => displayInfoModal("Teks berhasil disalin!"), () => displayInfoModal("Gagal menyalin teks."));
    };
    
    const handleCopyQuery = (queryText: string) => {
        handleCopyToClipboard(queryText);
        setLastCopiedQuery({ query: queryText });
        displayInfoModal("Kueri disalin ke clipboard!");
    };
    
    const runGeneration = async (prompt: string, schema: Schema | undefined, updateKey: keyof ProjectData | null, successMessage: string, isMultiUpdate = false, resultProcessor?: (result: any) => Partial<ProjectData>) => {
        setIsLoading(true);
        try {
            const result = await runGemini(prompt, geminiApiKey, schema);
            if (resultProcessor) {
                setProjectData(prev => ({ ...prev, ...resultProcessor(result) }));
            } else if (updateKey) {
                setProjectData(prev => ({ ...prev, [updateKey]: result }));
            }
            displayInfoModal(successMessage);
        } catch (error) {
            displayInfoModal(`Gagal: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGeneratePokokIsi = () => {
        const kutipanString = projectData.allReferences.filter(ref => ref.isiKutipan).map(ref => `- Dari "${ref.title}" oleh ${ref.author}: "${ref.isiKutipan}"`).join('\n');
        const prompt = `Buat draf singkat untuk Fakta/Masalah, Tujuan Penelitian, dan Teori Penelitian untuk KTI berjudul "${projectData.judulKTI}". Gunakan kutipan/catatan dari referensi berikut sebagai dasar utama.\n\n${kutipanString || "Tidak ada kutipan spesifik yang diberikan."}`;
        const schema: Schema = { type: Type.OBJECT, properties: { fakta_masalah: { type: Type.STRING }, tujuan_penelitian: { type: Type.STRING }, teori_penelitian: { type: Type.STRING } }, required: ["fakta_masalah", "tujuan_penelitian", "teori_penelitian"] };
        runGeneration(prompt, schema, null, "Draf Pokok Isi KTI berhasil dibuat!", true, (result) => ({
            faktaMasalahDraft: result.fakta_masalah,
            tujuanPenelitianDraft: result.tujuan_penelitian,
            teoriPenelitianDraft: result.teori_penelitian
        }));
    };

    const handleGenerateOutline = () => {
        const prompt = `Buatkan draf outline (kerangka) untuk ${projectData.jenisKaryaTulis} berjudul "${projectData.judulKTI}". Sertakan bab dan sub-bab yang relevan.`;
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { bab: { type: Type.STRING }, judul: { type: Type.STRING }, sub_bab: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["bab", "judul", "sub_bab"] } };
        runGeneration(prompt, schema, 'outlineDraft', "Draf Outline KTI berhasil dibuat!");
    };

    const handleGenerateFullPendahuluan = () => {
        const kutipanString = projectData.allReferences.filter(ref => ref.isiKutipan).map(ref => `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`).join('\n');
        const outlineString = projectData.outlineDraft ? projectData.outlineDraft.map(bab => `- ${bab.bab}: ${bab.judul}`).join('\n') : 'Outline belum dibuat.';
        const prompt = `Anda adalah penulis akademis ahli. Tulis draf Bab 1: Pendahuluan lengkap untuk KTI. Gunakan sub-judul bernomor (1.1, 1.2, dst). Struktur: 1.1 Latar Belakang (sintesis catatan), 1.2 Rumusan Masalah (identifikasi research gap), 1.3 Tujuan Penelitian (turunan dari rumusan), 1.4 Sistematika Penulisan (berdasarkan outline). Konteks: Judul: "${projectData.judulKTI}", Catatan: ${kutipanString || "Tidak ada"}, Outline: ${outlineString}`;
        runGeneration(prompt, undefined, 'pendahuluanDraft', "Draf Pendahuluan Lengkap berhasil dibuat!");
    };
    
    const handleModifyText = async (mode: 'shorten' | 'medium' | 'lengthen', draftKey: keyof ProjectData) => {
        const currentText = projectData[draftKey] as string;
        if (!currentText) { displayInfoModal("Draf masih kosong."); return; }
        let instruction = '';
        switch (mode) {
            case 'shorten': instruction = 'Ringkas teks berikut sekitar 30-40% dengan tetap mempertahankan semua poin kunci.'; break;
            case 'medium': instruction = 'Tulis ulang teks berikut dengan panjang yang kurang lebih sama, tetapi gunakan gaya bahasa yang lebih mengalir dan akademis.'; break;
            case 'lengthen': instruction = 'Perpanjang teks berikut sekitar 40-50%. Elaborasi setiap argumen utama dengan penjelasan lebih dalam atau contoh konkret.'; break;
        }
        const prompt = `${instruction}\n\n---TEKS ASLI---\n${currentText}`;
        await runGeneration(prompt, undefined, draftKey, `Draf berhasil diubah ke versi "${mode}".`);
    };

    const handleGenerateMetode = () => {
        const prompt = `Tuliskan draf Bab Metode Penelitian untuk ${projectData.jenisKaryaTulis} berjudul "${projectData.judulKTI}". Jelaskan alur penelitian berdasarkan: Pendekatan: ${projectData.pendekatan}, Metode Spesifik: ${projectData.metode || 'Akan dijelaskan'}, Sumber Data: ${projectData.basisData || 'relevan'}, Periode: ${projectData.periode || 'Akan ditentukan'}, Alat Analisis: ${projectData.tools || 'sesuai'}. Susun menjadi paragraf akademis.`;
        runGeneration(prompt, undefined, 'metodeDraft', "Draf Bab Metode berhasil dibuat!");
    };

    const handleGenerateStudiLiteratur = () => {
        const kutipanString = projectData.allReferences.filter(ref => ref.isiKutipan).map(ref => `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`).join('\n');
        if (!kutipanString) { displayInfoModal("Tidak ada catatan di perpustakaan referensi."); return; }
        const prompt = `Anda adalah penulis akademik. Berdasarkan kumpulan catatan berikut, tuliskan draf Tinjauan Pustaka yang koheren untuk karya tulis berjudul "${projectData.judulKTI}". Identifikasi tema, kelompokkan catatan, sintesis menjadi narasi yang mengalir, dan akhiri dengan ringkasan research gap. Catatan:\n---\n${kutipanString}\n---`;
        runGeneration(prompt, undefined, 'studiLiteraturDraft', "Draf Studi Literatur berhasil dibuat!");
    };

    const handleGenerateHasilPembahasan = () => {
        let dataSintesis = '';
        if (projectData.analisisKuantitatifDraft) dataSintesis += `--- ANALISIS KUANTITATIF ---\n${projectData.analisisKuantitatifDraft}\n\n`;
        if (projectData.analisisKualitatifDraft) dataSintesis += `--- ANALISIS KUALITATIF ---\n${projectData.analisisKualitatifDraft}\n\n`;
        if (projectData.analisisVisualDraft) dataSintesis += `--- ANALISIS VISUAL ---\n${projectData.analisisVisualDraft}\n\n`;
        if (!dataSintesis) { displayInfoModal("Tidak ada draf analisis untuk disintesis."); return; }
        const prompt = `Anda adalah peneliti ahli. Tulis draf Bab 4: Hasil dan Pembahasan. Struktur: 4.1 Hasil Penelitian (sajikan temuan objektif), 4.2 Pembahasan (interpretasi, hubungkan dengan tujuan). Konteks: Judul: "${projectData.judulKTI}", Tujuan: "${projectData.tujuanPenelitianDraft}". Data Analisis:\n${dataSintesis}`;
        runGeneration(prompt, undefined, 'hasilPembahasanDraft', "Draf Bab Hasil & Pembahasan berhasil dibuat!");
    };
    
    const handleGenerateKesimpulan = () => {
        const context = `Judul: ${projectData.judulKTI}\nPendahuluan: ${projectData.pendahuluanDraft}\nMetode: ${projectData.metodeDraft}\nHasil & Pembahasan: ${projectData.hasilPembahasanDraft}`;
        const prompt = `Anda adalah penulis akademis. Tulis draf Bab 5: Kesimpulan. Struktur: 5.1 Kesimpulan (rangkum temuan, jawab tujuan), 5.2 Keterbatasan (identifikasi kelemahan), 5.3 Saran (untuk riset selanjutnya & praktisi). Konteks:\n---\n${context}\n---`;
        runGeneration(prompt, undefined, 'kesimpulanDraft', "Draf Bab Kesimpulan berhasil dibuat!");
    };

    const handleGenerateVariabel = () => {
        const prompt = `Anda adalah metodolog penelitian. Berdasarkan judul penelitian kuantitatif berikut, sarankan satu variabel terikat dan 2-4 variabel bebas yang relevan. Judul: "${projectData.judulKTI}", Topik: "${projectData.topikTema}"`;
        const schema: Schema = { type: Type.OBJECT, properties: { variabel_terikat: { type: Type.STRING }, variabel_bebas: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["variabel_terikat", "variabel_bebas"] };
        runGeneration(prompt, schema, 'aiSuggestedVariables', "Saran variabel berhasil dibuat!");
    };

    const handleGenerateHipotesis = () => {
        if (!projectData.variabelTerikat || projectData.variabelBebas.length === 0) { displayInfoModal("Tentukan variabel penelitian terlebih dahulu."); return; }
        const prompt = `Anda adalah metodolog. Berdasarkan variabel berikut, buat hipotesis (H1: ada pengaruh positif/signifikan, H0: tidak ada pengaruh). Variabel Terikat (Y): "${projectData.variabelTerikat}", Variabel Bebas (X): ${projectData.variabelBebas.map(v => `- ${v}`).join('\n')}`;
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { h1: { type: Type.STRING }, h0: { type: Type.STRING } }, required: ["h1", "h0"] } };
        runGeneration(prompt, schema, 'aiSuggestedHypotheses', "Saran hipotesis berhasil dibuat!");
    };

    const handleGenerateKuesioner = () => {
        if (!projectData.variabelTerikat || projectData.variabelBebas.length === 0) { displayInfoModal("Tentukan variabel penelitian terlebih dahulu."); return; }
        const prompt = `Anda ahli metodologi. Untuk setiap variabel (Y: "${projectData.variabelTerikat}", X: ${projectData.variabelBebas.join(', ')}), buat 3-5 item pernyataan (bukan pertanyaan) untuk skala Likert 5 poin.`;
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { nama_variabel: { type: Type.STRING }, item_kuesioner: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["nama_variabel", "item_kuesioner"] } };
        runGeneration(prompt, schema, 'aiSuggestedKuesioner', "Draf kuesioner berhasil dibuat!");
    };

    const handleGenerateWawancara = () => {
        if (!projectData.judulKTI || !projectData.tujuanPenelitianDraft) { displayInfoModal("Lengkapi Ide KTI dan Pokok Isi terlebih dahulu."); return; }
        const prompt = `Anda peneliti kualitatif. Buatkan draf panduan wawancara semi-terstruktur. Kategori: Pertanyaan Pembuka, Inti, Pendalaman, Penutup. Berikan deskripsi singkat dan 2-4 pertanyaan per kategori. Konteks: Judul: "${projectData.judulKTI}", Tujuan: "${projectData.tujuanPenelitianDraft}"`;
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { kategori: { type: Type.STRING }, deskripsi_kategori: { type: Type.STRING }, pertanyaan: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["kategori", "deskripsi_kategori", "pertanyaan"] } };
        runGeneration(prompt, schema, 'aiSuggestedWawancara', "Draf panduan wawancara berhasil dibuat!");
    };

    const handleGenerateQueries = () => {
        let langInstruction = includeIndonesianQuery ? "Prioritaskan Bahasa Inggris, tetapi sertakan padanan Bahasa Indonesia menggunakan operator OR." : "Prioritaskan kueri dalam Bahasa Inggris. JANGAN sertakan padanan Bahasa Indonesia.";
        const prompt = `Anda adalah Pustakawan Riset. Buat 5 level kueri pencarian (sangat spesifik hingga luas) untuk database "${projectData.queryGeneratorTargetDB}". JANGAN sertakan batasan tahun. ${langInstruction} Konteks: Judul: "${projectData.judulKTI}", Kata Kunci: "${projectData.kataKunci}"`;
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { level: { type: Type.STRING }, penjelasan: { type: Type.STRING }, kueri: { type: Type.STRING } }, required: ["level", "penjelasan", "kueri"] } };
        runGeneration(prompt, schema, 'aiGeneratedQueries', "Kueri berjenjang berhasil dibuat!");
    };

    const handleDeleteLog = (id: number) => {
        setProjectData(p => ({ ...p, searchLog: p.searchLog.filter(log => log.id !== id) }));
    };

    const handleGenerateAnalisis = async (data: any[], analysisType: 'konfirmatif' | 'eksploratif') => {
        const csvString = window.Papa.unparse(data);
        let prompt;
        if (analysisType === 'konfirmatif') {
            prompt = `Anda adalah analis data. Analisis data kuantitatif ini. Instruksi: 1. Hitung statistik deskriptif dasar. 2. Berikan interpretasi konseptual apakah data mendukung atau menolak setiap hipotesis. 3. Tulis narasi temuan. Konteks: Judul: "${projectData.judulKTI}", Hipotesis: ${projectData.hipotesis.join('\n')}. Data:\n\`\`\`csv\n${csvString}\n\`\`\``;
        } else {
            prompt = `Anda adalah analis data. Lakukan analisis data eksploratif. Instruksi: 1. Hitung statistik deskriptif kunci. 2. Identifikasi wawasan utama (pola, korelasi, anomali). 3. Tulis narasi temuan. Konteks: Judul: "${projectData.judulKTI}". Data:\n\`\`\`csv\n${csvString}\n\`\`\``;
        }
        await runGeneration(prompt, undefined, 'analisisKuantitatifHasil', "Analisis data berhasil dibuat!");
    };

    const handleGenerateAnalisisKualitatif = async (fileContent: string) => {
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
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tema: { type: Type.STRING }, deskripsi: { type: Type.STRING }, kutipan_pendukung: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["tema", "deskripsi", "kutipan_pendukung"] } };
        await runGeneration(prompt, schema, 'analisisKualitatifHasil', "Analisis tematik berhasil dibuat!");
    };

    const handleGenerateAnalisisVisual = async (imageFile: { mimeType: string, data: string }, analysisFocus: string) => {
        const prompt = `Anda adalah analis riset. Analisis gambar ini. Instruksi: 1. Deskripsikan gambar secara objektif. 2. Interpretasikan makna gambar, hubungkan dengan tujuan penelitian. Konteks: Judul: "${projectData.judulKTI}", Tujuan: "${projectData.tujuanPenelitianDraft}", Fokus: "${analysisFocus || 'Tidak ada'}"`;
        const schema: Schema = { type: Type.OBJECT, properties: { deskripsi: { type: Type.STRING }, interpretasi: { type: Type.STRING } }, required: ["deskripsi", "interpretasi"] };
        await runGeneration(prompt, schema, null, "Analisis visual berhasil dibuat!", true, (result) => ({
            deskripsiVisualisasi: result.deskripsi,
            interpretasiData: result.interpretasi
        }));
    };
    
    // --- Project Data Management ---
    const handleExportProject = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(projectData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `bibliocobra_project_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
    };

    const handleExportReferences = () => {
        if (projectData.allReferences.length === 0) {
            displayInfoModal("Tidak ada referensi untuk diekspor.");
            return;
        }
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(projectData.allReferences, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `bibliocobra_references_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
    };
    
    const triggerImport = () => importInputRef.current?.click();
    const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === "application/json") {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target!.result as string);
                    if (data.judulKTI !== undefined && data.allReferences !== undefined) {
                        setImportedData(data);
                        setIsImportConfirmOpen(true);
                    } else { displayInfoModal("File JSON tidak valid atau bukan file proyek Bibliocobra."); }
                } catch { displayInfoModal("Gagal membaca file. Pastikan format JSON benar."); }
            };
            reader.readAsText(file);
        } else { displayInfoModal("Silakan pilih file dengan format .json"); }
        event.target.value = '';
    };

    const confirmImport = () => {
        if (!importedData) return;
        setProjectData(importedData);
        setIsImportConfirmOpen(false);
        setImportedData(null);
        displayInfoModal("Proyek berhasil diimpor!");
    };
    
    const handleResetProject = () => {
        setProjectData(initialProjectData);
        setIsResetConfirmOpen(false);
        displayInfoModal("Proyek telah berhasil di-reset.");
    };

    const triggerReferencesImport = () => importReferencesInputRef.current?.click();
    const handleFileImportReferences = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === "application/json") {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const newReferences = JSON.parse(e.target!.result as string);
                    if (!Array.isArray(newReferences)) { displayInfoModal("File tidak valid. Harus berisi array referensi."); return; }
                    const existingTitles = new Set(projectData.allReferences.map(ref => ref.title));
                    let addedCount = 0, skippedCount = 0;
                    const uniqueNewReferences = newReferences.filter(newRef => {
                        if (existingTitles.has(newRef.title)) { skippedCount++; return false; }
                        addedCount++;
                        return true;
                    }).map(newRef => ({...newRef, id: Date.now() + Math.random()}));
                    setProjectData(prev => ({ ...prev, allReferences: [...prev.allReferences, ...uniqueNewReferences] }));
                    displayInfoModal(`Impor selesai. ${addedCount} referensi baru ditambahkan. ${skippedCount} duplikat diabaikan.`);
                } catch { displayInfoModal("Gagal membaca file referensi."); }
            };
            reader.readAsText(file);
        } else { displayInfoModal("Silakan pilih file .json"); }
        event.target.value = '';
    };


    const renderSection = () => {
        const sectionMap: { [key: string]: React.FC<any> } = {
            dashboard: Sections.DashboardProyek,
            ideKTI: Sections.IdeKTI,
            referensi: Sections.Referensi,
            genLogKueri: Sections.GeneratorLogKueri,
            genVariabel: Sections.GeneratorVariabel,
            genHipotesis: Sections.GeneratorHipotesis,
            genKuesioner: Sections.GeneratorKuesioner,
            genWawancara: Sections.GeneratorWawancara,
            analisisKuantitatif: Sections.AnalisisKuantitatif,
            analisisKualitatif: Sections.AnalisisKualitatif,
            analisisVisual: Sections.AnalisisVisual,
            pokokIsi: Sections.PokokIsi,
            outline: Sections.Outline,
            pendahuluan: Sections.Pendahuluan,
            studiLiteratur: Sections.StudiLiteratur,
            metode: Sections.MetodePenelitian,
            hasil: Sections.HasilPembahasan,
            kesimpulan: Sections.Kesimpulan,
        };

        const Component = sectionMap[currentSection] || Sections.DashboardProyek;

        const commonProps = { projectData, setProjectData, isLoading, showInfoModal: displayInfoModal, handleCopyToClipboard, setCurrentSection };

        const componentProps: { [key: string]: any } = {
            dashboard: { setCurrentSection },
            ideKTI: { handleInputChange, handleGenerateIdeKTI, handleStartNewIdea, aiStructuredResponse, editingIdea, setEditingIdea, handleStartEditing, handleSaveIdea, ideKtiMode },
            referensi: { manualRef, setManualRef, handleSaveManualReference, freeTextRef, setFreeTextRef, handleImportFromText, handleEditReference, handleDeleteReference, handleGenerateApa, generatedApaReferences, handleShowSearchPrompts, handleGenerateReferenceClues, openNoteModal, triggerReferencesImport, handleExportReferences },
            genLogKueri: { handleGenerateQueries, lastCopiedQuery, handleCopyQuery, handleDeleteLog, includeIndonesianQuery, setIncludeIndonesianQuery },
            genVariabel: { handleGenerateVariabel },
            genHipotesis: { handleGenerateHipotesis },
            genKuesioner: { handleGenerateKuesioner },
            genWawancara: { handleGenerateWawancara },
            analisisKuantitatif: { handleGenerateAnalisis, setCurrentSection },
            analisisKualitatif: { handleGenerateAnalisisKualitatif },
            analisisVisual: { handleGenerateAnalisisVisual },
            pokokIsi: { handleGeneratePokokIsi },
            outline: { handleGenerateOutline },
            pendahuluan: { handleGenerateFullPendahuluan, handleModifyText },
            studiLiteratur: { handleGenerateStudiLiteratur, handleModifyText },
            metode: { handleGenerateMetode, handleModifyText },
            hasil: { handleGenerateHasilPembahasan, handleModifyText },
            kesimpulan: { handleGenerateKesimpulan, handleModifyText },
        };
        
        return <Component {...commonProps} {...componentProps[currentSection]} />;
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
            <input type="file" ref={importInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".json" />
            <input type="file" ref={importReferencesInputRef} onChange={handleFileImportReferences} style={{ display: 'none' }} accept=".json" />

            {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcomeModal} />}
            {showInfoModal && <InfoModal message={modalMessage} onClose={() => setShowInfoModal(false)} />}
            {isImportConfirmOpen && <ConfirmationModal title="Konfirmasi Impor Proyek" message="<b>Peringatan:</b> Melanjutkan akan menimpa semua pekerjaan Anda yang ada saat ini. Tindakan ini tidak dapat diurungkan." onConfirm={confirmImport} onCancel={() => setIsImportConfirmOpen(false)} confirmText="Ya, Timpa & Impor" />}
            {isResetConfirmOpen && <ConfirmationModal title="Konfirmasi Reset Proyek" message="<b>Peringatan:</b> Anda akan menghapus semua data proyek yang tersimpan. Tindakan ini tidak dapat diurungkan." onConfirm={handleResetProject} onCancel={() => setIsResetConfirmOpen(false)} confirmText="Ya, Reset Proyek" />}
            {isClarificationModalOpen && <ClarificationModal questions={clarificationQuestions} answers={clarificationAnswers} setAnswers={setClarificationAnswers} onConfirm={handleGetFinalIdeas} onClose={() => setIsClarificationModalOpen(false)} />}
            {isNoteModalOpen && currentEditingRef && <NoteModal note={noteText} setNote={setNoteText} reference={currentEditingRef} onSave={handleSaveNote} onClose={() => setIsNoteModalOpen(false)} />}
            {showSearchPromptModal && <SearchPromptModal isLoading={isLoading} clues={projectData.aiReferenceClues} narratives={aiClueNarratives} onClose={() => setShowSearchPromptModal(false)} />}
            
            <div className="flex w-full">
                <Sidebar 
                    projectData={projectData}
                    currentSection={currentSection}
                    setCurrentSection={setCurrentSection}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    triggerImport={triggerImport}
                    handleExportProject={handleExportProject}
                    setIsResetConfirmOpen={setIsResetConfirmOpen}
                />

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
                            <p>&copy; {new Date().getFullYear()} Papahnya Ibracobra. All rights reserved.</p>
                        </footer>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
