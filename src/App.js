import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

function App() {
  const [projectData, setProjectData] = useState({
    // ... state awal Anda
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
  const [manualReferences, setManualReferences] = useState([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualReferenceText, setManualReferenceText] = useState('');
  const [showTextImport, setShowTextImport] = useState(false);
  const [generatedApaReferences, setGeneratedApaReferences] = useState('');
  const [searchPrompts, setShowSearchPrompts] = useState(false);

  // Fungsi untuk menampilkan modal informasi
  const showInfoModal = (message) => {
    setModalMessage(message);
    setShowModal(true);
  };

  // Fungsi untuk menangani perubahan input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
  };

  // Fungsi untuk menangani import file
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

  // Fungsi untuk menangani perubahan file kuesioner
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

  // Fungsi untuk menangani konfirmasi import
  const confirmImport = () => {
    if (importedData) {
      setProjectData(importedData);
      setIsImportConfirmOpen(false);
      setImportedData(null);
      showInfoModal("Proyek berhasil diimpor!");
    }
  };

  // Fungsi untuk menangani ekspor proyek
  const handleExportProject = () => {
    try {
      const jsonString = `text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(projectData, null, 2))}`;
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

  // Fungsi untuk menangani pencarian referensi
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

  // Fungsi untuk menambahkan referensi ke perpustakaan
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

  // Fungsi untuk menghapus referensi
  const handleDeleteReference = (id) => {
    setProjectData(prev => ({
      ...prev,
      allReferences: prev.allReferences.filter(ref => ref.id !== id)
    }));
    showInfoModal("Referensi berhasil dihapus!");
  };

  // Fungsi untuk menyalin teks ke clipboard
  const handleCopyToClipboard = (text) => {
    // Membersihkan teks dari semua format
    const plainText = text.replace(/<br\s*\/?>/gi, "") // Mengganti <br> dengan newline
      .replace(/<[^>]*>/g, "") // Menghapus semua tag HTML lainnya
      .replace(/[*_]/g, ""); // Menghapus karakter markdown * dan _
    
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

  // Fungsi untuk menghasilkan draf studi literatur
  const handleGenerateStudiLiteratur = async () => {
    setIsLoading(true);
    setProjectData(p => ({ ...p, studiLiteraturDraft: '' }));
    
    const kutipanString = projectData.allReferences.filter(ref => ref.isiKutipan).map(ref => 
      `- Dari "${ref.title}" oleh ${ref.author}: "${ref.isiKutipan}"`
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

  // Fungsi untuk menghasilkan variabel penelitian
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

  // Fungsi untuk menyimpan variabel penelitian
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

  // Fungsi untuk menghasilkan panduan wawancara
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

  // Fungsi untuk menghasilkan hasil pembahasan
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

  // Fungsi untuk memodifikasi teks
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

  // Fungsi untuk menghasilkan metode penelitian
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

  // Fungsi untuk menangani ekspor referensi dalam format APA
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

  // Fungsi untuk mengedit variabel bebas
  const handleEditBebas = (index, value) => {
    const newBebas = [...editingVariables.variabel_bebas];
    newBebas[index] = value;
    setEditingVariables(prev => ({ ...prev, variabel_bebas: newBebas }));
  };

  // Fungsi untuk menambah variabel bebas
  const handleAddBebas = () => {
    setEditingVariables(prev => ({ 
      ...prev, 
      variabel_bebas: [...prev.variabel_bebas, ''] 
    }));
  };

  // Fungsi untuk menghapus variabel bebas
  const handleRemoveBebas = (index) => {
    const newBebas = editingVariables.variabel_bebas.filter((_, i) => i !== index);
    setEditingVariables(prev => ({ ...prev, variabel_bebas: newBebas }));
  };

  // Fungsi untuk menangani perubahan pada kuesioner
  const handleItemChange = (varIndex, itemIndex, value) => {
    const newKuesioner = [...editingKuesioner];
    newKuesioner[varIndex].item_kuesioner[itemIndex] = value;
    setEditingKuesioner(newKuesioner);
  };

  // Fungsi untuk menambah item kuesioner
  const handleAddItem = (varIndex) => {
    const newKuesioner = [...editingKuesioner];
    newKuesioner[varIndex].item_kuesioner.push('');
    setEditingKuesioner(newKuesioner);
  };

  // Fungsi untuk menghapus item kuesioner
  const handleRemoveItem = (varIndex, itemIndex) => {
    const newKuesioner = [...editingKuesioner];
    newKuesioner[varIndex].item_kuesioner = newKuesioner[varIndex].item_kuesioner.filter((_, i) => i !== itemIndex);
    setEditingKuesioner(newKuesioner);
  };

  // Fungsi untuk menyimpan kuesioner
  const handleSaveKuesioner = () => {
    setProjectData(prev => ({
      ...prev,
      kuesioner: {
        data: editingKuesioner,
        savedAt: new Date().toISOString()
      }
    }));
    setEditingKuesioner([]);
    showInfoModal("Kuesioner berhasil disimpan!");
  };

  // Fungsi untuk menghasilkan ide KTI
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

  // Fungsi untuk menyimpan ide yang sedang diedit
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

  // Fungsi untuk mengedit ide
  const handleEditIdea = (idea) => {
    setEditingIdea(idea);
    setAiStructuredResponse(null);
  };

  // Fungsi untuk menghapus ide
  const handleDeleteIdea = (id) => {
    setProjectData(prev => ({
      ...prev,
      ideas: prev.ideas.filter(idea => idea.id !== id)
    }));
    showInfoModal("Ide berhasil dihapus!");
  };

  // Fungsi untuk menangani perubahan API key
  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setGeminiApiKey(key);
    localStorage.setItem('geminiApiKey', key);
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

  // Fungsi untuk menampilkan modal catatan
  const handleShowNoteModal = (referenceId) => {
    setOpenNoteModal(referenceId);
  };

  // Fungsi untuk menyimpan catatan
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

  // Fungsi untuk menampilkan petunjuk pencarian
  const handleShowSearchPrompts = () => {
    showInfoModal(`Beberapa kata kunci yang mungkin berguna:\n\n- ${projectData.topikTema}\n- konsep utama terkait\n- istilah teknis spesifik`);
  };

  // Fungsi untuk menghasilkan petunjuk referensi
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

  // Fungsi untuk menangani ekspor referensi
  const triggerReferencesImport = () => {
    document.getElementById('fileInput').click();
  };

  // Fungsi untuk menangani perubahan file referensi
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

  // Fungsi untuk menghasilkan draf kesimpulan
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

  // Fungsi untuk menangani penutupan modal
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Fungsi untuk menangani perubahan pada input Scopus API key
  const handleScopusApiKeyChange = (e) => {
    setProjectData(prev => ({ ...prev, scopusApiKey: e.target.value }));
  };

  // Fungsi untuk menangani perubahan pada input API key Google Gemini
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

  // Fungsi untuk menangani penutupan modal import
  const handleCloseImportModal = () => {
    setIsImportConfirmOpen(false);
    setImportedData(null);
  };

  // Fungsi untuk menangani penutupan modal referensi AI
  const handleCloseAiReferenceModal = () => {
    setShowAiReferenceModal(false);
  };

  // Fungsi untuk menangani penutupan modal variabel
  const handleCloseVariableModal = () => {
    setEditingVariables(null);
  };

  // Fungsi untuk menangani penutupan modal kuesioner
  const handleCloseKuesionerModal = () => {
    setEditingKuesioner([]);
  };

  // Fungsi untuk menangani penutupan modal catatan
  const handleCloseNoteModal = () => {
    setOpenNoteModal(null);
  };

  // Fungsi untuk menangani penutupan modal import teks
  const handleCloseTextImportModal = () => {
    setShowTextImport(false);
    setManualReferenceText('');
  };

  // Fungsi untuk menangani penutupan modal manual input
  const handleCloseManualInputModal = () => {
    setShowManualInput(false);
    setManualReferences([]);
  };

  // Fungsi untuk menangani penutupan modal edit ide
  const handleCloseEditIdeaModal = () => {
    setEditingIdea(null);
  };

  // Fungsi untuk menangani penutupan modal search prompts
  const handleCloseSearchPromptsModal = () => {
    setShowSearchPrompts(false);
  };

  // Fungsi untuk menghasilkan draf pendahuluan
  const handleGeneratePendahuluan = async () => {
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

  // Fungsi untuk menghasilkan draf pokok isi
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

  // Fungsi untuk menghasilkan draf penutup
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

  // Fungsi untuk menangani penutupan modal
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Fungsi untuk menangani perubahan pada input Scopus API key
  const handleScopusApiKeyChange = (e) => {
    setProjectData(prev => ({ ...prev, scopusApiKey: e.target.value }));
  };

  // Fungsi untuk menangani perubahan pada input API key Google Gemini
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

  // Fungsi untuk menangani penutupan modal import
  const handleCloseImportModal = () => {
    setIsImportConfirmOpen(false);
    setImportedData(null);
  };

  // Fungsi untuk menangani penutupan modal referensi AI
  const handleCloseAiReferenceModal = () => {
    setShowAiReferenceModal(false);
  };

  // Fungsi untuk menangani penutupan modal variabel
  const handleCloseVariableModal = () => {
    setEditingVariables(null);
  };

  // Fungsi untuk menangani penutupan modal kuesioner
  const handleCloseKuesionerModal = () => {
    setEditingKuesioner([]);
  };

  // Fungsi untuk menangani penutupan modal catatan
  const handleCloseNoteModal = () => {
    setOpenNoteModal(null);
  };

  // Fungsi untuk menangani penutupan modal import teks
  const handleCloseTextImportModal = () => {
    setShowTextImport(false);
    setManualReferenceText('');
  };

  // Fungsi untuk menangani penutupan modal manual input
  const handleCloseManualInputModal = () => {
    setShowManualInput(false);
    setManualReferences([]);
  };

  // Fungsi untuk menangani penutupan modal edit ide
  const handleCloseEditIdeaModal = () => {
    setEditingIdea(null);
  };

  // Fungsi untuk menangani penutupan modal search prompts
  const handleCloseSearchPromptsModal = () => {
    setShowSearchPrompts(false);
  };

  // Fungsi untuk menghasilkan draf pendahuluan
  const handleGeneratePendahuluan = async () => {
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

  // Fungsi untuk menghasilkan draf pokok isi
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

  // Fungsi untuk menghasilkan draf penutup
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* ... kode UI Anda ... */}
    </div>
  );
}

export default App;