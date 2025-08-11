import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

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
    ideas: []
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
  const handleCloseImportModal = () => setIsImportConfirmOpen(false);
  const handleCloseAiReferenceModal = () => setShowAiReferenceModal(false);
  const handleCloseVariableModal = () => setEditingVariables(null);
  const handleCloseKuesionerModal = () => setEditingKuesioner([]);
  const handleCloseNoteModal = () => setOpenNoteModal(null);
  const handleCloseTextImportModal = () => setShowTextImport(false);
  const handleCloseManualInputModal = () => setShowManualInput(false);
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
    const plainText = text.replace(/<br\s*\/?>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[*_]/g, "");
    
    navigator.clipboard.writeText(plainText)
      .then(() => showInfoModal("Teks berhasil disalin!"))
      .catch(() => showInfoModal("Gagal menyalin teks."));
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
      
      // Assume geminiService is implemented elsewhere
      const result = "Generated content...";
      const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
      setProjectData(prev => ({ ...prev, studiLiteraturDraft: cleanResult }));
      showInfoModal("Draf Studi Literatur berhasil dibuat!");
    } catch (error) {
      showInfoModal(`Gagal menulis Studi Literatur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Other generation functions (similar structure)
  // [Placeholder for handleGenerateVariables, handleGeneratePanduanWawancara, etc.]

  // UI rendering would go here
  return (
    <div className="App">
      {/* UI implementation would go here */}
      <h1>Bibliocobra App</h1>
      <p>Implementasi UI akan ditempatkan di sini...</p>
    </div>
  );
}

export default App;