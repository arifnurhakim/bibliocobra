import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

// Service untuk Gemini API
const geminiService = {
  run: async (prompt, apiKey) => {
    if (!apiKey || apiKey.length < 30) {
      throw new Error("API key tidak valid");
    }
    
    // Simulasi respons API untuk development
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Ini adalah contoh respons dari AI untuk prompt: "${prompt.substring(0, 50)}..."`);
      }, 1000);
    });
  },
  
  runWithSchema: async (prompt, apiKey, schema) => {
    if (!apiKey || apiKey.length < 30) {
      throw new Error("API key tidak valid");
    }
    
    // Simulasi respons API dengan skema
    return new Promise((resolve) => {
      setTimeout(() => {
        // Contoh respons sesuai skema
        if (schema.properties?.ideas) {
          resolve({
            ideas: [
              {
                judul: "Pengaruh Media Sosial terhadap Produktivitas Mahasiswa",
                pertanyaan_penelitian: "Bagaimana penggunaan media sosial mempengaruhi produktivitas belajar mahasiswa?",
                signifikansi: "Penelitian ini penting untuk memahami dampak teknologi pada proses belajar",
                metodologi: "Kuantitatif dengan survei dan analisis statistik",
                kata_kunci: ["media sosial", "produktivitas", "mahasiswa"],
                penjelasan: "Studi ini akan mengukur hubungan antara waktu penggunaan media sosial dan indeks prestasi akademik"
              }
            ]
          });
        } else if (schema.properties?.outlineDraft) {
          resolve({
            outlineDraft: [
              { bab: "Bab 1", judul: "Pendahuluan", sub_bab: ["Latar Belakang", "Rumusan Masalah", "Tujuan Penelitian"] },
              { bab: "Bab 2", judul: "Tinjauan Pustaka", sub_bab: ["Konsep Dasar", "Penelitian Terdahulu"] }
            ]
          });
        }
        // Tambahkan skema lain jika diperlukan
      }, 1000);
    });
  }
};

function App() {
  // State declarations
  const [projectData, setProjectData] = useState({
    judulKTI: '',
    topikTema: '',
    disiplinIlmu: '',
    jenisKaryaTulis: '',
    jenisKaryaTulisLainnya: '',
    scopusApiKey: '',
    allReferences: [],
    variabelPenelitian: {},
    kuesioner: {},
    studiLiteraturDraft: '',
    metodeDraft: '',
    pendahuluanDraft: '',
    pokokIsiDraft: '',
    hasilPembahasanDraft: '',
    kesimpulanDraft: '',
    penutupDraft: '',
    analisisKuantitatifDraft: '',
    analisisKualitatifDraft: '',
    panduanWawancaraDraft: '',
    ideas: [],
    outlineDraft: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [editingVariables, setEditingVariables] = useState(null);
  const [editingKuesioner, setEditingKuesioner] = useState([]);
  const [fileName, setFileName] = useState('');
  const [dataPreview, setDataPreview] = useState(null);
  const [scopusSearchStart, setScopusSearchStart] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [showAiReferenceModal, setShowAiReferenceModal] = useState(false);
  const [aiSuggestedReferences, setAiSuggestedReferences] = useState([]);
  const [editingIdea, setEditingIdea] = useState(null);
  const [aiStructuredResponse, setAiStructuredResponse] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [currentSection, setCurrentSection] = useState('welcome');
  const [openNoteModal, setOpenNoteModal] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || '');
  const [generatedApaReferences, setGeneratedApaReferences] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualReferences, setManualReferences] = useState([]);
  const [showTextImport, setShowTextImport] = useState(false);
  const [manualReferenceText, setManualReferenceText] = useState('');
  const [showSearchPrompts, setShowSearchPrompts] = useState(false);

  // Utility functions
  const showInfoModal = (message) => {
    setModalMessage(message);
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);
  const handleCloseImportModal = () => {
    setIsImportConfirmOpen(false);
    setImportedData(null);
  };
  const handleCloseAiReferenceModal = () => setShowAiReferenceModal(false);
  const handleCloseVariableModal = () => setEditingVariables(null);
  const handleCloseKuesionerModal = () => setEditingKuesioner([]);
  const handleCloseNoteModal = () => setOpenNoteModal(null);
  const handleCloseTextImportModal = () => {
    setShowTextImport(false);
    setManualReferenceText('');
  };
  const handleCloseManualInputModal = () => {
    setShowManualInput(false);
    setManualReferences([]);
  };
  const handleCloseEditIdeaModal = () => setEditingIdea(null);
  const handleCloseSearchPromptsModal = () => setShowSearchPrompts(false);

  // Input change handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
  };

  const handleJenisKaryaChange = (e) => {
    const value = e.target.value;
    setProjectData(prev => ({
      ...prev,
      jenisKaryaTulis: value,
      jenisKaryaTulisLainnya: value === 'Lainnya' ? prev.jenisKaryaTulisLainnya : ''
    }));
  };

  const handleJenisKaryaLainnyaChange = (e) => {
    setProjectData(prev => ({ ...prev, jenisKaryaTulisLainnya: e.target.value }));
  };

  const handleScopusApiKeyChange = (e) => {
    setProjectData(prev => ({ ...prev, scopusApiKey: e.target.value }));
  };

  const handleGeminiApiKeyChange = (e) => {
    const key = e.target.value;
    setGeminiApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };

  // Fungsi untuk memvalidasi API key
  const validateApiKey = (key) => {
    if (!key || key.trim() === '') {
      showInfoModal("API key Google AI tidak boleh kosong");
      return false;
    }
    if (key.length < 30) {
      showInfoModal("API key Google AI tidak valid");
      return false;
    }
    return true;
  };

  // File handling functions
  const handleFileImport = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "application/json") {
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
      reader.readAsText(selectedFile);
    } else {
      showInfoModal("Silakan pilih file dengan format .json");
    }
    event.target.value = null;
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFileName(selectedFile.name);
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setDataPreview(results.data.slice(0, 5));
          setEditingKuesioner(processKuesionerData(results.data));
        }
      });
    } else {
      showInfoModal("Silakan pilih file dengan format .csv");
    }
    event.target.value = null;
  };

  const handleReferencesFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    if (selectedFile && (selectedFile.type === "application/json" || selectedFile.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (Array.isArray(data) && data.length > 0) {
            setProjectData(prev => ({
              ...prev,
              allReferences: [...prev.allReferences, ...data.map(ref => ({ ...ref, id: Date.now() + Math.random() }))]
            }));
            showInfoModal(`Berhasil mengimpor ${data.length} referensi!`);
          } else {
            showInfoModal("Format file tidak valid. File harus berisi array referensi.");
          }
        } catch (error) {
          showInfoModal("Gagal membaca file. Pastikan file JSON dalam format yang benar.");
        }
      };
      reader.readAsText(selectedFile);
    } else {
      showInfoModal("Silakan pilih file JSON yang valid");
    }
    event.target.value = null;
  };

  // Project handling functions
  const confirmImport = () => {
    if (importedData) {
      setProjectData(importedData);
      setIsImportConfirmOpen(false);
      setImportedData(null);
      showInfoModal("Proyek berhasil diimpor!");
    }
  };

  const handleExportProject = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(projectData, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      const date = new Date().toISOString().slice(0, 10);
      link.download = `bibliocobra_export_${date}.json`;
      link.click();
      showInfoModal("Proyek berhasil diekspor!");
    } catch (error) {
      showInfoModal(`Gagal mengekspor proyek: ${error.message}`);
    }
  };

  // Reference handling functions
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
        const response = await fetch(`https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(projectData.topikTema)}&apiKey=${projectData.scopusApiKey}&start=${newStart}&count=5`);
        
        if (!response.ok) throw new Error("Gagal mengambil data dari Scopus");
        
        const data = await response.json();
        const newReferences = data.searchResults.entry.map(entry => ({
          title: entry['dc:title'] || '',
          journal: entry['prism:publicationName'] || '',
          year: entry['prism:coverDate'] ? entry['prism:coverDate'].split('-')[0] : '',
          author: entry['dc:creator'] || '',
          volume: entry['prism:volume'] || '',
          issue: entry['prism:issueIdentifier'] || '',
          pages: entry['prism:pageRange'] || '',
          url: entry['prism:url'] || '',
          doi: entry['prism:doi'] || '',
          publisher: entry['dc:publisher'] || '',
          isiKutipan: ''
        }));
        
        setAiSuggestedReferences(prev => isMore ? [...prev, ...newReferences] : newReferences);
        setScopusSearchStart(newStart + 5);
      } else {
        showInfoModal("API key Scopus tidak tersedia. Masukkan API key di halaman utama.");
      }
    } catch (error) {
      showInfoModal(`Error saat mencari referensi: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleAddReference = (reference) => {
    setProjectData(prev => ({
      ...prev,
      allReferences: [...prev.allReferences, {
        ...reference,
        id: Date.now(),
        addedDate: new Date().toISOString()
      }]
    }));
    showInfoModal("Referensi berhasil ditambahkan ke perpustakaan!");
  };

  const handleDeleteReference = (id) => {
    setProjectData(prev => ({
      ...prev,
      allReferences: prev.allReferences.filter(ref => ref.id !== id)
    }));
    showInfoModal("Referensi berhasil dihapus!");
  };

  const handleCopyToClipboard = (text) => {
    // Membersihkan teks dari semua format
    const plainText = text.replace(/<br\s*\/?>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[*_]/g, "");
    
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

  const handleShowNoteModal = (referenceId) => {
    setOpenNoteModal(referenceId);
  };

  const handleSaveNote = (referenceId, note) => {
    setProjectData(prev => ({
      ...prev,
      allReferences: prev.allReferences.map(ref => 
        ref.id === referenceId ? { ...ref, isiKutipan: note } : ref
      )
    }));
    setOpenNoteModal(null);
    showInfoModal("Catatan berhasil disimpan!");
  };

  // Content generation functions
  const handleGenerateStudiLiteratur = async () => {
    setIsLoading(true);
    setProjectData(p => ({ ...p, studiLiteraturDraft: '' }));
    
    const kutipanString = projectData.allReferences.filter(ref => ref.isiKutipan).map(ref => 
      `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`
    ).join('\n');
    
    try {
      const prompt = `Anda adalah seorang penulis akademik ahli. Berdasarkan kumpulan kutipan dan catatan dari berbagai sumber berikut, tuliskan sebuah draf Tinjauan Pustaka (Studi Literatur) yang koheren untuk sebuah karya tulis berjudul "${projectData.judulKTI}".
      
      Tugas Anda adalah:
      1. Identifikasi tema-tema atau argumen utama yang muncul dari catatan-catatan di bawah.
      2. Kelompokkan catatan-catatan tersebut berdasarkan tema yang relevan.
      3. Sintesis informasi tersebut menjadi sebuah narasi yang mengalir. Jangan hanya mendaftar ringkasan satu per satu, tetapi bandingkan, pertentangan, dan hubungkan ide-ide dari berbagai sumber.
      4. Gunakan kalimat transisi untuk memastikan alur tulisan lancar antar paragraf.
      5. Akhiri dengan sebuah ringkasan singkat yang menyoroti celah penelitian (research gap) yang berhasil diidentifikasi dari literatur.
      6. PENTING: Hasilkan seluruhnya sebagai teks biasa (plain text) tanpa format apa pun.
      
      Catatan dari Referensi:
      -${kutipanString}-
      `;
      
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

  const handleGenerateVariables = async () => {
    setIsLoading(true);
    try {
      const prompt = `Anda adalah seorang metodolog penelitian ahli. Berdasarkan judul penelitian kuantitatif berikut, identifikasi dan sarankan satu variabel terikat (dependent variable) dan beberapa (2 hingga 4) variabel bebas (independent variables) yang paling relevan dan umum diteliti.
      
      Judul Penelitian: "${projectData.judulKTI}"
      Topik Umum: "${projectData.topikTema}"
      
      Berikan jawaban hanya dalam format JSON yang ketat.`;
      
      const schema = {
        type: "OBJECT",
        properties: {
          variabel_terikat: {
            type: "STRING",
            description: "Nama variabel yang dipengaruhi dalam penelitian (variabel Y)."
          },
          variabel_bebas: {
            type: "ARRAY",
            items: {
              type: "STRING",
              description: "Nama variabel yang mempengaruhi (variabel X)."
            },
            minItems: 2,
            maxItems: 4
          }
        },
        required: ["variabel_terikat", "variabel_bebas"]
      };
      
      const result = await geminiService.runWithSchema(prompt, geminiApiKey, schema);
      setEditingVariables(result);
      showInfoModal("Saran variabel penelitian berhasil dihasilkan!");
    } catch (error) {
      showInfoModal(`Gagal menghasilkan saran variabel: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVariables = () => {
    setProjectData(prev => ({
      ...prev,
      variabelPenelitian: {
        ...editingVariables,
        savedAt: new Date().toISOString()
      }
    }));
    setEditingVariables(null);
    showInfoModal("Variabel penelitian berhasil disimpan!");
  };

  const handleGeneratePanduanWawancara = async () => {
    setIsLoading(true);
    setProjectData(p => ({ ...p, panduanWawancaraDraft: '' }));
    
    try {
      const prompt = `Anda adalah seorang peneliti kualitatif berpengalaman. Buat panduan wawancara untuk penelitian kualitatif dengan judul "${projectData.judulKTI}" dan topik "${projectData.topikTema}".
      
      Panduan harus mencakup:
      1. Pendahuluan: Penjelasan tujuan penelitian dan penegasan kerahasiaan
      2. Pertanyaan inti yang terorganisir dalam kategori berikut:
         - Latar belakang dan pengalaman partisipan
         - Pertanyaan tentang topik penelitian utama
         - Pertanyaan follow-up untuk memperdalam jawaban
         - Pertanyaan penutup
      3. Petunjuk untuk pewawancara tentang teknik probing dan penanganan situasi tertentu
      
      Format panduan harus jelas dan siap digunakan untuk wawancara semi-terstruktur.
      Hasilkan seluruhnya sebagai teks biasa tanpa format apa pun.`;
      
      const result = await geminiService.run(prompt, geminiApiKey);
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ ...prev, panduanWawancaraDraft: cleanResult }));
      showInfoModal("Draf Panduan Wawancara berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menghasilkan Panduan Wawancara: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateHasilPembahasan = async () => {
    setIsLoading(true);
    setProjectData(p => ({ ...p, hasilPembahasanDraft: '' }));
    
    let dataSintesis = '';
    if (projectData.analisisKuantitatifDraft) {
      dataSintesis += `- ANALISIS KUANTITATIF - ${projectData.analisisKuantitatifDraft}`;
    }
    
    // Perbaikan: Variabel hasHypotheses sekarang digunakan dalam logika
    const hasHypotheses = projectData.analisisKuantitatifDraft.includes("hipotesis");
    const hipotesisPrompt = hasHypotheses 
      ? "Analisis kuantitatif ini melibatkan pengujian hipotesis. Fokus pada interpretasi hasil pengujian hipotesis dan maknanya bagi penelitian."
      : "Analisis kuantitatif ini tidak melibatkan pengujian hipotesis. Fokus pada interpretasi temuan utama dan pola yang ditemukan.";
    
    try {
      const prompt = `Berdasarkan sintesis berikut:\n${dataSintesis}\n\n${hipotesisPrompt}\n\nTulis hasil pembahasan yang menjelaskan temuan, interpretasi, dan implikasi dari analisis ini dalam konteks penelitian. Gunakan bahasa akademis yang formal dan sesuai dengan disiplin ilmu terkait.`;
      
      const result = await geminiService.run(prompt, geminiApiKey);
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ 
        ...prev, 
        hasilPembahasanDraft: cleanResult 
      }));
      showInfoModal("Draf Hasil Pembahasan berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menulis Hasil Pembahasan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyText = async (mode, draftKey) => {
    setIsLoading(true);
    const currentText = projectData[draftKey];
    
    if (!currentText) {
      showInfoModal("Tidak ada teks untuk dimodifikasi");
      setIsLoading(false);
      return;
    }
    
    let instruction = '';
    
    switch (mode) {
      case 'shorten':
        instruction = 'Perpendek teks berikut sekitar 30-40% tanpa menghilangkan poin utama atau referensi penting. Pertahankan semua informasi kunci dan kutipan. Hasilkan sebagai teks biasa tanpa format.';
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
    
    const prompt = `${instruction}\n\n-TEKS ASLI-\n${currentText}`;
    
    try {
      const result = await geminiService.run(prompt, geminiApiKey);
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
    
    try {
      const prompt = `Anda adalah seorang metodolog penelitian ahli. Tuliskan draf bab Metode Penelitian untuk sebuah karya tulis berjudul "${projectData.judulKTI}" dengan topik "${projectData.topikTema}".
      
      Draf harus mencakup:
      1. Pendekatan penelitian (kuantitatif, kualitatif, atau campuran) dan justifikasi
      2. Desain penelitian yang sesuai
      3. Populasi dan sampel penelitian
      4. Teknik pengumpulan data
      5. Instrumen penelitian
      6. Teknik analisis data
      7. Pertimbangan etika penelitian
      8. Keterbatasan metodologis
      
      Sesuaikan dengan jenis penelitian yang relevan dengan topik. Jika tidak jelas, tanyakan ke pengguna.
      Hasilkan seluruhnya sebagai teks biasa tanpa format apa pun.`;
      
      const result = await geminiService.run(prompt, geminiApiKey);
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ ...prev, metodeDraft: cleanResult }));
      showInfoModal("Draf Metode Penelitian berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menulis Metode Penelitian: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateApa = () => {
    const list = projectData.allReferences.map(ref => {
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

  const handleGenerateIdeKTI = async () => {
    setIsLoading(true);
    setAiResponse('');
    setAiStructuredResponse(null);
    setEditingIdea(null);
    
    const jenisKarya = projectData.jenisKaryaTulis === 'Lainnya' ? projectData.jenisKaryaTulisLainnya : projectData.jenisKaryaTulis;
    
    try {
      const prompt = `Anda adalah seorang peneliti berpengalaman di bidang ${projectData.disiplinIlmu}. Berikan 3 ide penelitian orisinal untuk ${jenisKarya} tentang "${projectData.topikTema}".
      
      Setiap ide harus mencakup:
      1. Judul yang jelas dan menarik
      2. Pertanyaan penelitian spesifik
      3. Signifikansi/justifikasi
      4. Metodologi yang diusulkan
      5. Kata kunci utama
      6. Penjelasan singkat
      
      Formatkan jawaban dalam JSON dengan struktur:
      {
        "ideas": [
          {
            "judul": "string",
            "pertanyaan_penelitian": "string",
            "signifikansi": "string",
            "metodologi": "string",
            "kata_kunci": "array of strings",
            "penjelasan": "string"
          }
        ]
      }
      
      Pastikan format JSON valid dan lengkap.`;
      
      const result = await geminiService.runWithSchema(
        prompt,
        geminiApiKey,
        {
          type: "OBJECT",
          properties: {
            ideas: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  judul: { type: "STRING" },
                  pertanyaan_penelitian: { type: "STRING" },
                  signifikansi: { type: "STRING" },
                  metodologi: { type: "STRING" },
                  kata_kunci: { 
                    type: "ARRAY", 
                    items: { type: "STRING" }
                  },
                  penjelasan: { type: "STRING" }
                },
                required: ["judul", "pertanyaan_penelitian", "signifikansi", "metodologi", "kata_kunci", "penjelasan"]
              },
              minItems: 1,
              maxItems: 3
            }
          },
          required: ["ideas"]
        }
      );
      
      setAiStructuredResponse(result);
      setAiResponse(JSON.stringify(result, null, 2));
    } catch (error) {
      showInfoModal(`Gagal menghasilkan ide: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEditingIdea = () => {
    if (editingIdea) {
      setProjectData(prev => ({
        ...prev,
        ideas: [...(prev.ideas || []), {
          ...editingIdea,
          id: Date.now(),
          savedAt: new Date().toISOString()
        }]
      }));
      setEditingIdea(null);
      setAiStructuredResponse(null);
      showInfoModal(`Ide KTI "${editingIdea.judul}" berhasil disimpan.`);
      setCurrentSection('referensi');
    }
  };

  const handleEditIdea = (idea) => {
    setEditingIdea(idea);
    setAiStructuredResponse(null);
  };

  const handleDeleteIdea = (id) => {
    setProjectData(prev => ({
      ...prev,
      ideas: prev.ideas.filter(idea => idea.id !== id)
    }));
    showInfoModal("Ide berhasil dihapus!");
  };

  const handleGenerateReferenceClues = async () => {
    setIsLoading(true);
    
    try {
      const prompt = `Berdasarkan topik penelitian "${projectData.topikTema}", berikan 5 kata kunci atau frasa pencarian yang efektif untuk menemukan referensi akademis terkait di database seperti Scopus atau Google Scholar.
      
      Format jawaban sebagai JSON:
      {
        "keywords": ["kata kunci 1", "kata kunci 2", ...]
      }
      
      Pastikan kata kunci relevan dan spesifik untuk topik penelitian.`;
      
      const result = await geminiService.runWithSchema(
        prompt,
        geminiApiKey,
        {
          type: "OBJECT",
          properties: {
            keywords: {
              type: "ARRAY",
              items: { type: "STRING" },
              minItems: 3,
              maxItems: 5
            }
          },
          required: ["keywords"]
        }
      );
      
      if (result.keywords && result.keywords.length > 0) {
        showInfoModal(`Kata kunci yang disarankan:\n\n${result.keywords.join('\n')}`);
      } else {
        showInfoModal("Tidak dapat menghasilkan kata kunci yang relevan.");
      }
    } catch (error) {
      showInfoModal(`Gagal menghasilkan petunjuk pencarian: ${error.message}`);
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
          sub_bab: { 
            type: "ARRAY", 
            items: { type: "STRING" } 
          }
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
    setProjectData(p => ({ ...p, pendahuluanDraft: '' }));
    
    try {
      const prompt = `Anda adalah seorang penulis akademik ahli. Tuliskan draf bab Pendahuluan untuk sebuah karya tulis berjudul "${projectData.judulKTI}" dengan topik "${projectData.topikTema}".
      
      Draf harus mencakup:
      1. Latar belakang penelitian
      2. Rumusan masalah
      3. Tujuan penelitian
      4. Manfaat penelitian (teoretis dan praktis)
      5. Ruang lingkup penelitian
      
      Pastikan ada alur yang logis dan setiap bagian saling terkait.
      Hasilkan seluruhnya sebagai teks biasa tanpa format apa pun.`;
      
      const result = await geminiService.run(prompt, geminiApiKey);
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ ...prev, pendahuluanDraft: cleanResult }));
      showInfoModal("Draf Pendahuluan berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menulis Pendahuluan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePokokIsi = async () => {
    setIsLoading(true);
    setProjectData(p => ({ ...p, pokokIsiDraft: '' }));
    
    const kutipanString = projectData.allReferences.filter(ref => ref.isiKutipan).map(ref => 
      `- Dari "${ref.title}" oleh ${ref.author}: "${ref.isiKutipan}"`
    ).join('\n');
    
    try {
      const prompt = `Anda adalah seorang penulis akademik ahli. Tuliskan draf bab Pokok Isi untuk sebuah karya tulis berjudul "${projectData.judulKTI}" dengan topik "${projectData.topikTema}".
      
      Berdasarkan sintesis berikut:\n${kutipanString}\n
      
      Draf harus mencakup:
      1. Deskripsi temuan utama
      2. Analisis mendalam terhadap temuan
      3. Pembahasan yang menghubungkan temuan dengan literatur yang ada
      4. Interpretasi yang kritis terhadap implikasi temuan
      
      Pastikan ada alur yang logis dan setiap bagian saling terkait.
      Hasilkan seluruhnya sebagai teks biasa tanpa format apa pun.`;
      
      const result = await geminiService.run(prompt, geminiApiKey);
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ ...prev, pokokIsiDraft: cleanResult }));
      showInfoModal("Draf Pokok Isi berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menulis Pokok Isi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePenutup = async () => {
    setIsLoading(true);
    setProjectData(p => ({ ...p, penutupDraft: '' }));
    
    try {
      const prompt = `Anda adalah seorang penulis akademik ahli. Tuliskan draf bab Penutup untuk sebuah karya tulis berjudul "${projectData.judulKTI}" dengan topik "${projectData.topikTema}".
      
      Draf harus mencakup:
      1. Ringkasan temuan utama
      2. Jawaban terhadap pertanyaan penelitian
      3. Implikasi teoretis dan praktis
      4. Keterbatasan penelitian
      5. Saran untuk penelitian selanjutnya
      
      Pastikan ada alur yang logis dan setiap bagian saling terkait.
      Hasilkan seluruhnya sebagai teks biasa tanpa format apa pun.`;
      
      const result = await geminiService.run(prompt, geminiApiKey);
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ ...prev, penutupDraft: cleanResult }));
      showInfoModal("Draf Penutup berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menulis Penutup: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateKesimpulan = async () => {
    setIsLoading(true);
    setProjectData(p => ({ ...p, kesimpulanDraft: '' }));
    
    try {
      const prompt = `Anda adalah seorang penulis akademik ahli. Tuliskan draf bab Kesimpulan untuk sebuah karya tulis berjudul "${projectData.judulKTI}" dengan topik "${projectData.topikTema}".
      
      Draf harus mencakup:
      1. Ringkasan temuan utama dari penelitian
      2. Jawaban terhadap pertanyaan penelitian awal
      3. Implikasi teoretis dan praktis dari temuan
      4. Keterbatasan penelitian
      5. Saran untuk penelitian selanjutnya
      6. Jika relevan, saran praktis untuk praktisi atau pembuat kebijakan
      
      Pastikan ada alur yang logis dan setiap bagian saling terkait.
      Hasilkan seluruhnya sebagai teks biasa tanpa format apa pun.`;
      
      const result = await geminiService.run(prompt, geminiApiKey);
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ ...prev, kesimpulanDraft: cleanResult }));
      showInfoModal("Draf Kesimpulan berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menulis Kesimpulan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk memproses data kuesioner dari CSV
  const processKuesionerData = (csvData) => {
    // Implementasi sesuai kebutuhan
    return [
      {
        nama_variabel: "Variabel 1",
        item_kuesioner: ["Pertanyaan 1", "Pertanyaan 2"]
      }
    ];
  };

  // Fungsi untuk menangani perubahan pada modal kuesioner
  const handleKuesionerChange = (e, varIndex, itemIndex) => {
    const newKuesioner = [...editingKuesioner];
    newKuesioner[varIndex].item_kuesioner[itemIndex] = e.target.value;
    setEditingKuesioner(newKuesioner);
  };

  // Fungsi untuk menangani perubahan pada modal variabel
  const handleVariableChange = (e) => {
    const { name, value } = e.target;
    setEditingVariables(prev => ({ ...prev, [name]: value }));
  };

  // Fungsi untuk menangani perubahan pada modal edit ide
  const handleEditIdeaChange = (e) => {
    const { name, value } = e.target;
    setEditingIdea(prev => ({ ...prev, [name]: value }));
  };

  // Fungsi untuk menangani perubahan pada modal tambah referensi manual
  const handleManualReferenceChange = (e, index) => {
    const newReferences = [...manualReferences];
    newReferences[index] = { ...newReferences[index], [e.target.name]: e.target.value };
    setManualReferences(newReferences);
  };

  // Fungsi untuk menambah referensi manual
  const handleAddManualReference = () => {
    setManualReferences([...manualReferences, {
      title: '',
      journal: '',
      year: '',
      author: '',
      editors: '',
      volume: '',
      issue: '',
      pages: '',
      url: '',
      doi: '',
      publisher: '',
      isiKutipan: ''
    }]);
  };

  // Fungsi untuk menghapus referensi manual
  const handleRemoveManualReference = (index) => {
    const newReferences = [...manualReferences];
    newReferences.splice(index, 1);
    setManualReferences(newReferences);
  };

  // Fungsi untuk menyimpan referensi manual
  const handleSaveManualReferences = () => {
    const validReferences = manualReferences.filter(ref => ref.title && ref.author);
    
    if (validReferences.length === 0) {
      showInfoModal("Tidak ada referensi valid untuk disimpan");
      return;
    }
    
    setProjectData(prev => ({
      ...prev,
      allReferences: [
        ...prev.allReferences, 
        ...validReferences.map(ref => ({ 
          ...ref, 
          id: Date.now() + Math.random(), 
          addedDate: new Date().toISOString() 
        }))
      ]
    }));
    
    setManualReferences([]);
    setShowManualInput(false);
    showInfoModal(`Berhasil menambahkan ${validReferences.length} referensi!`);
  };

  // Fungsi untuk mem-parse referensi manual
  const parseManualReference = (text) => {
    const lines = text.split('\n');
    const reference = {
      title: '',
      journal: '',
      year: '',
      author: '',
      editors: '',
      volume: '',
      issue: '',
      pages: '',
      url: '',
      doi: '',
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

  // Fungsi untuk mengimpor referensi dari teks
  const handleImportFromText = () => {
    if (!manualReferenceText.trim()) {
      showInfoModal("Silakan masukkan teks referensi");
      return;
    }
    
    try {
      const reference = parseManualReference(manualReferenceText);
      setProjectData(prev => ({
        ...prev,
        allReferences: [
          ...prev.allReferences,
          { ...reference, id: Date.now(), addedDate: new Date().toISOString() }
        ]
      }));
      
      setManualReferenceText('');
      setShowTextImport(false);
      showInfoModal("Referensi berhasil diimpor!");
    } catch (error) {
      showInfoModal(`Gagal mengimpor referensi: ${error.message}`);
    }
  };

  // Fungsi untuk menangani perubahan pada input teks referensi manual
  const handleManualReferenceTextChange = (e) => {
    setManualReferenceText(e.target.value);
  };

  // Navigation
  const getNavigationItems = () => {
    const basePenulisan = [
      { id: 'studiLiteratur', name: 'Tinjauan Pustaka' },
      { id: 'metode', name: 'Metode' }
    ];
    
    return {
      ide: {
        title: "Perencanaan & Ide",
        items: [
          { id: 'ideKTI', name: 'Ide KTI' },
          { id: 'referensi', name: 'Literatur & Referensi' }
        ]
      },
      penulisan: {
        title: "Penulisan KTI",
        items: [
          ...basePenulisan,
          { id: 'pendahuluan', name: 'Pendahuluan' },
          { id: 'pokokIsi', name: 'Pokok Isi' },
          { id: 'hasil', name: 'Hasil' },
          { id: 'pembahasan', name: 'Pembahasan' },
          { id: 'kesimpulan', name: 'Kesimpulan' },
          { id: 'penutup', name: 'Penutup' }
        ]
      }
    };
  };

  const navigationItems = getNavigationItems();

  // Render UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Modal Informasi */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Informasi</h3>
            <p className="text-gray-700 mb-6">{modalMessage}</p>
            <button 
              onClick={handleCloseModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg w-full"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Import */}
      {isImportConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Konfirmasi Import</h3>
            <p className="text-gray-700 mb-6">Apakah Anda yakin ingin mengimpor proyek ini? Data saat ini akan ditimpa.</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={handleCloseImportModal}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
              >
                Batal
              </button>
              <button 
                onClick={confirmImport}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Referensi AI */}
      {showAiReferenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Referensi dari Scopus</h3>
              <button 
                onClick={handleCloseAiReferenceModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {aiSuggestedReferences.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Tidak ada referensi yang ditemukan. Coba dengan kata kunci yang berbeda.</p>
            ) : (
              <div className="space-y-4">
                {aiSuggestedReferences.map((ref, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-gray-800">{ref.title}</h4>
                    <p className="text-gray-600">{ref.author} ({ref.year})</p>
                    <p className="text-gray-600">{ref.journal}</p>
                    {ref.volume && <p className="text-gray-600">Volume {ref.volume}, {ref.pages}</p>}
                    {ref.doi && <p className="text-blue-600">DOI: {ref.doi}</p>}
                    <div className="mt-2 flex space-x-2">
                      <button 
                        onClick={() => handleAddReference(ref)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm"
                      >
                        Tambah ke Perpustakaan
                      </button>
                      <button 
                        onClick={() => handleShowNoteModal(ref.id || index)}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                      >
                        Tambah Catatan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {isFetchingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            <div className="mt-4 flex justify-between">
              <button 
                onClick={() => handleFindReferences(true)}
                disabled={isFetchingMore}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {isFetchingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
              <button 
                onClick={handleCloseAiReferenceModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Variabel Penelitian */}
      {editingVariables && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Variabel Penelitian</h3>
              <button 
                onClick={handleCloseVariableModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Variabel Terikat:</label>
                <input 
                  type="text" 
                  name="variabel_terikat" 
                  value={editingVariables.variabel_terikat} 
                  onChange={handleVariableChange}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                  placeholder="Contoh: Kinerja Akademik"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Variabel Bebas:</label>
                {editingVariables.variabel_bebas.map((bebas, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input 
                      type="text" 
                      value={bebas} 
                      onChange={(e) => handleEditBebas(index, e.target.value)}
                      className="shadow appearance-none border rounded-l-lg w-full py-2 px-3 text-gray-700"
                      placeholder={`Variabel Bebas ${index + 1}`}
                    />
                    <button 
                      onClick={() => handleRemoveBebas(index)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-r-lg"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button 
                  onClick={handleAddBebas}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm mt-2"
                >
                  + Tambah Variabel
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSaveVariables}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Simpan Variabel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kuesioner */}
      {editingKuesioner.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Kuesioner</h3>
              <button 
                onClick={handleCloseKuesionerModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {editingKuesioner.map((variabel, varIndex) => (
              <div key={varIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-800">Variabel: {variabel.nama_variabel}</h4>
                </div>
                
                {variabel.item_kuesioner.map((item, itemIndex) => (
                  <div key={itemIndex} className="mb-2 flex items-center">
                    <input 
                      type="text" 
                      value={item} 
                      onChange={(e) => handleItemChange(varIndex, itemIndex, e.target.value)}
                      className="shadow appearance-none border rounded-l-lg w-full py-2 px-3 text-gray-700"
                      placeholder={`Pertanyaan ${itemIndex + 1}`}
                    />
                    <button 
                      onClick={() => handleRemoveItem(varIndex, itemIndex)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-r-lg"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => handleAddItem(varIndex)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm mt-2"
                >
                  + Tambah Pertanyaan
                </button>
              </div>
            ))}
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSaveKuesioner}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Simpan Kuesioner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Ide */}
      {editingIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Ide KTI</h3>
              <button 
                onClick={handleCloseEditIdeaModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Judul:</label>
                <input 
                  type="text" 
                  name="judul" 
                  value={editingIdea.judul} 
                  onChange={handleEditIdeaChange}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                  placeholder="Judul ide KTI"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Pertanyaan Penelitian:</label>
                <textarea 
                  name="pertanyaan_penelitian" 
                  value={editingIdea.pertanyaan_penelitian} 
                  onChange={handleEditIdeaChange}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                  rows="2"
                  placeholder="Apa pertanyaan penelitian utama?"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Signifikansi:</label>
                <textarea 
                  name="signifikansi" 
                  value={editingIdea.signifikansi} 
                  onChange={handleEditIdeaChange}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                  rows="2"
                  placeholder="Mengapa penelitian ini penting?"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Metodologi:</label>
                <textarea 
                  name="metodologi" 
                  value={editingIdea.metodologi} 
                  onChange={handleEditIdeaChange}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                  rows="2"
                  placeholder="Metode yang akan digunakan"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Kata Kunci:</label>
                <input 
                  type="text" 
                  name="kata_kunci" 
                  value={Array.isArray(editingIdea.kata_kunci) ? editingIdea.kata_kunci.join(', ') : editingIdea.kata_kunci} 
                  onChange={e => {
                    const keywords = e.target.value.split(',').map(kw => kw.trim());
                    setEditingIdea({...editingIdea, kata_kunci: keywords});
                  }}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                  placeholder="Kata kunci dipisahkan dengan koma"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Penjelasan Singkat:</label>
                <textarea 
                  name="penjelasan" 
                  value={editingIdea.penjelasan} 
                  onChange={handleEditIdeaChange}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                  rows="3"
                  placeholder="Penjelasan singkat tentang ide"
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSaveEditingIdea}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Simpan Ide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catatan Referensi */}
      {openNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Catatan untuk Referensi</h3>
              <button 
                onClick={handleCloseNoteModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <textarea 
              value={projectData.allReferences.find(ref => ref.id === openNoteModal)?.isiKutipan || ''}
              onChange={(e) => handleSaveNote(openNoteModal, e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
              rows="5"
              placeholder="Tulis catatan Anda di sini..."
            ></textarea>
            
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleCloseNoteModal}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  const note = projectData.allReferences.find(ref => ref.id === openNoteModal)?.isiKutipan || '';
                  handleSaveNote(openNoteModal, note);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sidebar */}
      <div className="flex">
        <div className="w-64 bg-white shadow-md min-h-screen p-4">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-blue-600">Bibliocobra</h1>
            <p className="text-gray-600 text-sm">Tools Bantu Penulisan Karya Tulis Ilmiah</p>
          </div>
          
          <div className="mb-6">
            <input 
              type="text" 
              value={projectData.judulKTI} 
              onChange={handleInputChange} 
              name="judulKTI"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Judul Karya Tulis Ilmiah"
            />
          </div>
          
          <div className="mb-6">
            <input 
              type="text" 
              value={projectData.topikTema} 
              onChange={handleInputChange} 
              name="topikTema"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Topik/Tema Penelitian"
            />
          </div>
          
          <div className="mb-6">
            <select 
              value={projectData.jenisKaryaTulis} 
              onChange={handleJenisKaryaChange}
              name="jenisKaryaTulis"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Jenis Karya Tulis</option>
              <option value="Jurnal">Jurnal Ilmiah</option>
              <option value="Skripsi">Skripsi</option>
              <option value="Tesis">Tesis</option>
              <option value="Disertasi">Disertasi</option>
              <option value="Artikel">Artikel Ilmiah</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          
          {projectData.jenisKaryaTulis === 'Lainnya' && (
            <div className="mb-6">
              <input 
                type="text" 
                value={projectData.jenisKaryaTulisLainnya} 
                onChange={handleJenisKaryaLainnyaChange}
                name="jenisKaryaTulisLainnya"
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Jenis Karya Tulis Lainnya"
              />
            </div>
          )}
          
          <div className="mb-6">
            <input 
              type="text" 
              value={projectData.disiplinIlmu} 
              onChange={handleInputChange} 
              name="disiplinIlmu"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Disiplin Ilmu"
            />
          </div>
          
          <div className="mb-8">
            <button 
              onClick={handleGenerateIdeKTI}
              disabled={isLoading || !projectData.topikTema || !projectData.disiplinIlmu}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg w-full disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Memproses...' : '✨ Hasilkan Ide KTI'}
            </button>
          </div>
          
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Menu Utama</h2>
          </div>
          
          {Object.entries(navigationItems).map(([category, {title, items}]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
              <ul className="space-y-1">
                {items.map(item => (
                  <li key={item.id}>
                    <button 
                      onClick={() => setCurrentSection(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentSection === item.id 
                          ? 'bg-blue-100 text-blue-800 font-medium' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">API Key Scopus:</label>
              <input 
                type="password" 
                value={projectData.scopusApiKey} 
                onChange={handleScopusApiKeyChange}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Masukkan API Key Scopus"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">API Key Google AI:</label>
              <input 
                type="password" 
                value={geminiApiKey} 
                onChange={handleGeminiApiKeyChange}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Masukkan API Key Google AI"
              />
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={handleExportProject}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-sm"
              >
                Ekspor Proyek
              </button>
              <label className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm cursor-pointer text-center">
                Impor Proyek
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Welcome Section */}
          {currentSection === 'welcome' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Selamat Datang di Bibliocobra</h1>
                <p className="text-lg text-gray-600 mb-8">Tools bantu penulisan karya tulis ilmiah dengan AI</p>
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Mulai dari Sini</h2>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Isi informasi dasar proyek di sidebar kiri</li>
                    <li>Klik "Hasilkan Ide KTI" untuk mendapatkan saran ide penelitian</li>
                    <li>Pilih menu sesuai kebutuhan penulisan Anda</li>
                    <li>Gunakan fitur AI untuk menghasilkan draf berbagai bagian KTI</li>
                  </ul>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <div className="text-blue-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Perencanaan Ide</h3>
                  <p className="text-gray-600 mb-4">Hasilkan ide penelitian, outline, dan referensi untuk proyek Anda</p>
                  <button 
                    onClick={() => setCurrentSection('ideKTI')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mulai Perencanaan →
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <div className="text-green-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Penulisan KTI</h3>
                  <p className="text-gray-600 mb-4">Buat draf berbagai bagian karya tulis ilmiah dengan bantuan AI</p>
                  <button 
                    onClick={() => setCurrentSection('studiLiteratur')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mulai Penulisan →
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <div className="text-purple-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm7-6h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-6a2 2 0 012-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Manajemen Referensi</h3>
                  <p className="text-gray-600 mb-4">Cari, kelola, dan format referensi untuk karya tulis Anda</p>
                  <button 
                    onClick={() => setCurrentSection('referensi')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Kelola Referensi →
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Ide KTI Section */}
          {currentSection === 'ideKTI' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Ide KTI</h1>
                <button 
                  onClick={handleGenerateIdeKTI}
                  disabled={isLoading || !projectData.topikTema || !projectData.disiplinIlmu}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Memproses...' : '✨ Hasilkan Ide KTI'}
                </button>
              </div>
              
              {isLoading && !aiStructuredResponse && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="ml-4 text-lg text-gray-700">Menghasilkan ide KTI...</p>
                </div>
              )}
              
              {aiStructuredResponse && (
                <div className="space-y-6">
                  {aiStructuredResponse.ideas?.map((idea, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold text-gray-800 mb-2">{idea.judul}</h2>
                          <p className="text-gray-600 mb-4">{idea.penjelasan}</p>
                          
                          <div className="space-y-2">
                            <p><span className="font-semibold">Pertanyaan Penelitian:</span> {idea.pertanyaan_penelitian}</p>
                            <p><span className="font-semibold">Signifikansi:</span> {idea.signifikansi}</p>
                            <p><span className="font-semibold">Metodologi:</span> {idea.metodologi}</p>
                            <p><span className="font-semibold">Kata Kunci:</span> {Array.isArray(idea.kata_kunci) ? idea.kata_kunci.join(', ') : idea.kata_kunci}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditIdea(idea)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              setEditingIdea(idea);
                              setCurrentSection('referensi');
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Lanjut ke Referensi
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {projectData.ideas && projectData.ideas.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Ide Tersimpan</h2>
                  <div className="space-y-4">
                    {projectData.ideas.map(idea => (
                      <div key={idea.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{idea.judul}</h3>
                            <p className="text-gray-600 text-sm">Disimpan pada: {new Date(idea.savedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEditIdea(idea)}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteIdea(idea.id)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Referensi Section */}
          {currentSection === 'referensi' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Literatur & Referensi</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Cari Referensi dari Scopus</h2>
                  <button 
                    onClick={handleGenerateReferenceClues}
                    disabled={isLoading || !projectData.topikTema}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    {isLoading ? 'Memproses...' : '🔍 Dapatkan Petunjuk Pencarian'}
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kata Kunci Pencarian:</label>
                  <input 
                    type="text" 
                    value={projectData.topikTema} 
                    onChange={handleInputChange} 
                    name="topikTema"
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                    placeholder="Contoh: machine learning, education, student performance"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleFindReferences(false)}
                    disabled={isLoading || !projectData.scopusApiKey || !projectData.topikTema}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Mencari...' : 'Cari Referensi'}
                  </button>
                  <label className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer text-center">
                    Impor Referensi
                    <input 
                      type="file" 
                      id="fileInput" 
                      accept=".json" 
                      onChange={handleReferencesFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div className="mt-4">
                  <button 
                    onClick={() => setShowManualInput(true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    Tambah Referensi Manual
                  </button>
                </div>
              </div>
              
              {/* Modal Input Manual Referensi */}
              {showManualInput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Tambah Referensi Manual</h3>
                      <button 
                        onClick={handleCloseManualInputModal}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {manualReferences.map((ref, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-gray-700 text-sm font-bold mb-2">Judul:</label>
                              <input 
                                type="text" 
                                name="title" 
                                value={ref.title} 
                                onChange={(e) => handleManualReferenceChange(e, index)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                placeholder="Judul artikel/jurnal"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 text-sm font-bold mb-2">Penulis:</label>
                              <input 
                                type="text" 
                                name="author" 
                                value={ref.author} 
                                onChange={(e) => handleManualReferenceChange(e, index)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                placeholder="Nama penulis"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 text-sm font-bold mb-2">Tahun:</label>
                              <input 
                                type="text" 
                                name="year" 
                                value={ref.year} 
                                onChange={(e) => handleManualReferenceChange(e, index)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                placeholder="Tahun publikasi"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 text-sm font-bold mb-2">Jurnal:</label>
                              <input 
                                type="text" 
                                name="journal" 
                                value={ref.journal} 
                                onChange={(e) => handleManualReferenceChange(e, index)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                placeholder="Nama jurnal"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-gray-700 text-sm font-bold mb-2">Catatan/Isi Kutipan:</label>
                              <textarea 
                                name="isiKutipan" 
                                value={ref.isiKutipan} 
                                onChange={(e) => handleManualReferenceChange(e, index)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                rows="3"
                                placeholder="Tulis catatan atau kutipan penting dari referensi ini"
                              ></textarea>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveManualReference(index)}
                            className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Hapus Referensi
                          </button>
                        </div>
                      ))}
                      
                      <button 
                        onClick={handleAddManualReference}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm"
                      >
                        + Tambah Referensi
                      </button>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={handleSaveManualReferences}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                      >
                        Simpan Referensi
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Daftar Referensi */}
              {projectData.allReferences && projectData.allReferences.length > 0 ? (
                <div className="space-y-4">
                  {projectData.allReferences.map((ref, index) => (
                    <div key={ref.id || index} className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{ref.title}</h3>
                          <p className="text-gray-600">{ref.author} ({ref.year})</p>
                          {ref.journal && <p className="text-gray-600">{ref.journal}</p>}
                          {ref.volume && <p className="text-gray-600">Volume {ref.volume}, {ref.pages}</p>}
                          {ref.doi && <p className="text-blue-600">DOI: {ref.doi}</p>}
                          {ref.isiKutipan && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-gray-700 italic">"{ref.isiKutipan}"</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2">
                          <button 
                            onClick={() => handleShowNoteModal(ref.id || index)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Catatan
                          </button>
                          <button 
                            onClick={() => handleDeleteReference(ref.id || index)}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600">Belum ada referensi. Cari atau tambahkan referensi untuk memulai.</p>
                </div>
              )}
              
              {/* Generate APA References */}
              {projectData.allReferences && projectData.allReferences.length > 0 && (
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Daftar Pustaka (Format APA)</h2>
                  <button 
                    onClick={handleGenerateApa}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg mb-4"
                  >
                    Buat Daftar Pustaka (APA 7th)
                  </button>
                  
                  {generatedApaReferences && (
                    <div className="mt-4">
                      <button 
                        onClick={() => handleCopyToClipboard(generatedApaReferences)}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg mb-2"
                      >
                        Salin Teks
                      </button>
                      <div 
                        className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: generatedApaReferences }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Studi Literatur Section */}
          {currentSection === 'studiLiteratur' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Tinjauan Pustaka</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Tinjauan Pustaka:</label>
                  <textarea 
                    value={projectData.studiLiteraturDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, studiLiteraturDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                  ></textarea>
                </div>
                
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
              
              <div className="flex justify-center">
                <button 
                  onClick={handleGenerateStudiLiteratur}
                  disabled={isLoading || projectData.allReferences.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Memproses...' : '✨ Tulis Draf Studi Literatur'}
                </button>
              </div>
            </div>
          )}
          
          {/* Metode Section */}
          {currentSection === 'metode' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Metode Penelitian</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Metode Penelitian:</label>
                  <textarea 
                    value={projectData.metodeDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, metodeDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                  ></textarea>
                </div>
                
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
              
              <div className="flex justify-center">
                <button 
                  onClick={handleGenerateMetode}
                  disabled={isLoading || !projectData.judulKTI || !projectData.topikTema}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Memproses...' : '✨ Tulis Draf Metode Penelitian'}
                </button>
              </div>
            </div>
          )}
          
          {/* Pendahuluan Section */}
          {currentSection === 'pendahuluan' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Pendahuluan</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Bab Pendahuluan:</label>
                  <textarea 
                    value={projectData.pendahuluanDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, pendahuluanDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
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
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Generator Pendahuluan</h2>
                <p className="text-gray-700 mb-4">Buat draf lengkap bab pendahuluan berdasarkan data proyek Anda.</p>
                <button 
                  onClick={handleGenerateFullPendahuluan}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Memproses...' : '✨ Tulis Draf Pendahuluan Lengkap'}
                </button>
              </div>
            </div>
          )}
          
          {/* Pokok Isi Section */}
          {currentSection === 'pokokIsi' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Pokok Isi</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Bab Pokok Isi:</label>
                  <textarea 
                    value={projectData.pokokIsiDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, pokokIsiDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                  ></textarea>
                </div>
                
                {/* Fitur Modifikasi Teks */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleModifyText('shorten', 'pokokIsiDraft')}
                      disabled={isLoading || !projectData.pokokIsiDraft}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                    >
                      Buat Versi Pendek
                    </button>
                    <button
                      onClick={() => handleModifyText('medium', 'pokokIsiDraft')}
                      disabled={isLoading || !projectData.pokokIsiDraft}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                    >
                      Buat Versi Sedang
                    </button>
                    <button
                      onClick={() => handleModifyText('lengthen', 'pokokIsiDraft')}
                      disabled={isLoading || !projectData.pokokIsiDraft}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                    >
                      Buat Versi Panjang
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={handleGeneratePokokIsi}
                  disabled={isLoading || projectData.allReferences.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Memproses...' : '✨ Tulis Draf Pokok Isi'}
                </button>
              </div>
            </div>
          )}
          
          {/* Hasil Section */}
          {currentSection === 'hasil' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Hasil</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Bab Hasil:</label>
                  <textarea 
                    value={projectData.analisisKuantitatifDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, analisisKuantitatifDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                  ></textarea>
                </div>
                
                {/* Fitur Modifikasi Teks */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleModifyText('shorten', 'analisisKuantitatifDraft')}
                      disabled={isLoading || !projectData.analisisKuantitatifDraft}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                    >
                      Buat Versi Pendek
                    </button>
                    <button
                      onClick={() => handleModifyText('medium', 'analisisKuantitatifDraft')}
                      disabled={isLoading || !projectData.analisisKuantitatifDraft}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                    >
                      Buat Versi Sedang
                    </button>
                    <button
                      onClick={() => handleModifyText('lengthen', 'analisisKuantitatifDraft')}
                      disabled={isLoading || !projectData.analisisKuantitatifDraft}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                    >
                      Buat Versi Panjang
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Pembahasan Section */}
          {currentSection === 'pembahasan' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Pembahasan</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Bab Pembahasan:</label>
                  <textarea 
                    value={projectData.hasilPembahasanDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, hasilPembahasanDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                  ></textarea>
                </div>
                
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
              
              <div className="flex justify-center">
                <button 
                  onClick={handleGenerateHasilPembahasan}
                  disabled={isLoading || !projectData.analisisKuantitatifDraft}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Memproses...' : '✨ Tulis Draf Pembahasan'}
                </button>
              </div>
            </div>
          )}
          
          {/* Kesimpulan Section */}
          {currentSection === 'kesimpulan' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Kesimpulan</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Bab Kesimpulan:</label>
                  <textarea 
                    value={projectData.kesimpulanDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, kesimpulanDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                  ></textarea>
                </div>
                
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
              
              <div className="flex justify-center">
                <button 
                  onClick={handleGenerateKesimpulan}
                  disabled={isLoading || !projectData.judulKTI || !projectData.topikTema}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Memproses...' : '✨ Tulis Draf Kesimpulan'}
                </button>
              </div>
            </div>
          )}
          
          {/* Penutup Section */}
          {currentSection === 'penutup' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Penutup</h1>
              
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Draf Bab Penutup:</label>
                  <textarea 
                    value={projectData.penutupDraft} 
                    onChange={e => setProjectData(prev => ({ ...prev, penutupDraft: e.target.value }))}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                    rows="15"
                  ></textarea>
                </div>
                
                {/* Fitur Modifikasi Teks */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleModifyText('shorten', 'penutupDraft')}
                      disabled={isLoading || !projectData.penutupDraft}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-yellow-300"
                    >
                      Buat Versi Pendek
                    </button>
                    <button
                      onClick={() => handleModifyText('medium', 'penutupDraft')}
                      disabled={isLoading || !projectData.penutupDraft}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-green-300"
                    >
                      Buat Versi Sedang
                    </button>
                    <button
                      onClick={() => handleModifyText('lengthen', 'penutupDraft')}
                      disabled={isLoading || !projectData.penutupDraft}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg disabled:bg-indigo-300"
                    >
                      Buat Versi Panjang
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={handleGeneratePenutup}
                  disabled={isLoading || !projectData.judulKTI || !projectData.topikTema}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Memproses...' : '✨ Tulis Draf Penutup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-gray-600 text-sm">
        Bibliocobra v1.0 | Tools Bantu Penulisan Karya Tulis Ilmiah
      </footer>
    </div>
  );
}

export default App;