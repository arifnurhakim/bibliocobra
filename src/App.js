import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// LANGKAH A2: Import Library Firebase (PINDAHKAN KE SINI)
// ============================================================================
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// HAPUS: import { getAnalytics } from "firebase/analytics";

// ============================================================================
// LANGKAH A1: Memindahkan initialProjectData ke atas
// ============================================================================
// Definisikan state awal di luar komponen agar bisa diakses kembali
const initialProjectData = {
    // Data Perencanaan
    jenisKaryaTulis: 'Artikel Ilmiah',
    jenisKaryaTulisLainnya: '',
    topikTema: '',
    pendekatan: '',
    faktaMasalahDraft: '', // Dipindahkan ke sini
    rumusanMasalahDraft: '', // <-- TAMBAHKAN STATE BARU
    tujuanPenelitianDraft: '', // Dipindahkan ke sini
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
    queryGeneratorTargetDB: 'Google Scholar',
    aiGeneratedQueries: null,
    searchLog: [],
    
    picos: {
        population: '',
        intervention: '',
        comparison: '',
        outcome: '',
        studyDesign: ''
    },

    // State baru untuk PRISMA
    prismaState: {
        isInitialized: false,
        studies: [], // { ...ref, screeningStatus, exclusionReason }
        initialRecordCount: 0,
        duplicateCount: 0,
        automationIneligible: 0,
        otherReasonsRemoved: 0,
        reportsNotRetrieved: 0,
        exclusionReasons: {
            abstract: ['Tidak relevan dengan topik', 'Jenis publikasi salah (misal: review, editorial)', 'Desain studi tidak sesuai', 'Lainnya'],
            fulltext: ['Tidak dapat mengambil full-text', 'Hasil (outcome) tidak relevan', 'Populasi/subjek tidak sesuai', 'Intervensi tidak sesuai', 'Lainnya']
        },
    },

    // State baru untuk Ekstraksi & Sintesis
    synthesisTableColumns: [
        { key: 'author', label: 'Author(s) & Year', type: 'text' },
        { key: 'population', label: 'Population/Problem', type: 'textarea' },
        { key: 'intervention', label: 'Intervention', type: 'textarea' },
        { key: 'comparison', label: 'Comparison', type: 'textarea' },
        { key: 'outcome', label: 'Outcome/Result', type: 'textarea' },
        { key: 'methodology', label: 'Methodology', type: 'textarea' },
        { key: 'keyFinding', label: 'Temuan Kunci', type: 'textarea' },
    ],
    extractedData: [], // Array of objects, each object represents a paper
    sintesisNaratifDraft: '',

    // Data Analisis
    deskripsiRespondenDraft: '',
    analisisKuantitatifHasil: '',
    analisisKuantitatifDraft: '',
    analisisKualitatifHasil: null,
    analisisKualitatifDraft: '',
    deskripsiVisualisasi: '',
    interpretasiData: '',
    analisisVisualDraft: '',
    analisisGapNoveltyDraft: '', 
    // ---------------------------------------
    thematicMapData: null, // <-- Penambahan State untuk Peta Tematik (Langkah 1)

    // Data Draf Bab
    teoriPenelitianDraft: '', // Tetap di sini untuk penggunaan lain
    pendahuluanDraft: '',
    metodeDraft: '',
    studiLiteraturDraft: '',
    hasilPembahasanDraft: '',
    kesimpulanDraft: '',
    
    // Status Akun (Sistem Lisensi)
    isPremium: false, // Default terkunci
};

// ============================================================================
// LANGKAH A3: Konfigurasi & Inisialisasi Firebase
// ============================================================================
// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyB8ybK5c47tN5RcSrPCJP907_EJcVhaxYY",
  authDomain: "bibliocobra.firebaseapp.com",
  projectId: "bibliocobra",
  storageBucket: "bibliocobra.firebasestorage.app",
  messagingSenderId: "407335519685",
  appId: "1:407335519685:web:3a064ca630fc30a4d9b7ac",
  measurementId: "G-G847PBCG80"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
// HAPUS: const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================================================
// LANGKAH A4: Komponen AuthPage (Halaman Login)
// ============================================================================
function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [activePolicyModal, setActivePolicyModal] = useState(null);

    const handleSignUp = async () => {
        setError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // PENTING: Buat "dokumen" baru di Firestore untuk pengguna baru ini
            await setDoc(doc(db, "projects", user.uid), initialProjectData);

            // Pengguna akan otomatis login setelah sign-up
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLogin = async () => {
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Pengguna akan otomatis login
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Cek apakah pengguna ini baru (dari Google)
            const docRef = doc(db, "projects", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                await setDoc(docRef, initialProjectData);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const renderPolicyContent = () => {
        // UBAH: Cek jika ada modal aktif (baik terms maupun privacy)
        if (!activePolicyModal) return null;
        
        const isTerms = activePolicyModal === 'terms';
        const title = isTerms ? "Syarat & Ketentuan Layanan" : "Kebijakan Privasi";
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in">
                <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                        <button onClick={() => setActivePolicyModal(null)} className="text-gray-400 hover:text-gray-600">
                            <CloseIcon />
                        </button>
                    </div>
                    <div className="overflow-y-auto text-sm text-gray-700 space-y-4 pr-2 custom-scrollbar">
                        {isTerms ? (
                            <>
                                <p><strong>1. Pendahuluan</strong><br/>Selamat datang di Bibliocobra Systems. Dengan mengakses aplikasi ini, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini.</p>
                                <p><strong>2. Lisensi Penggunaan</strong><br/>Bibliocobra memberikan Anda lisensi terbatas, non-eksklusif, dan tidak dapat dipindahtangankan untuk menggunakan aplikasi ini guna keperluan penelitian pribadi atau akademis.</p>
                                <p><strong>3. Batasan Tanggung Jawab</strong><br/>Hasil yang dihasilkan oleh AI (Artificial Intelligence) dalam aplikasi ini adalah alat bantu. Pengguna bertanggung jawab penuh atas verifikasi, validasi, dan penggunaan konten akhir dalam karya ilmiah mereka.</p>
                                <p><strong>4. Pembayaran & Langganan</strong><br/>Layanan tertentu mungkin berbayar. Kebijakan pengembalian dana (refund) tidak berlaku setelah akses fitur premium digunakan.</p>
                                <p><strong>5. Perubahan Ketentuan</strong><br/>Kami berhak untuk memperbarui atau mengubah syarat dan ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya.</p>
                            </>
                        ) : (
                            <>
                                <p><strong>1. Pengumpulan Data</strong><br/>Kami mengumpulkan informasi terbatas berupa alamat email dan ID akun Google saat Anda login untuk keperluan autentikasi dan identifikasi akun unik.</p>
                                <p><strong>2. Data Proyek</strong><br/>Data penelitian Anda (judul, draf, referensi) disimpan di database cloud kami (Firebase) yang aman. Kami tidak membagikan data ini kepada pihak ketiga.</p>
                                <p><strong>3. Kunci API (API Keys)</strong><br/>Demi privasi maksimal, Kunci API Google AI disimpan secara <strong>lokal di browser Anda (Local Storage)</strong>. Kunci ini tidak dikirim ke server kami, melainkan langsung digunakan untuk menghubungi layanan AI terkait.</p>
                                <p><strong>4. Keamanan</strong><br/>Kami menggunakan standar enkripsi industri untuk melindungi transmisi dan penyimpanan data Anda.</p>
                            </>
                        )}
                    </div>
                    <div className="mt-6 pt-2 border-t">
                        <button onClick={() => setActivePolicyModal(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Saya Mengerti</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>
            {renderPolicyContent()}
            <div className="p-8 bg-white shadow-md rounded-lg max-w-sm w-full">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Login Bibliocobra</h2>

                {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded border border-red-200">{error}</p>}

                <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Email"
                    className="w-full p-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Password"
                    className="w-full p-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                <div className="flex gap-2">
                    <button onClick={handleLogin} className="flex-1 bg-blue-600 text-white p-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Login</button>
                    <button onClick={handleSignUp} className="flex-1 bg-green-600 text-white p-2 rounded-lg font-semibold hover:bg-green-700 transition-colors">Sign Up</button>
                </div>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 text-gray-400 text-sm">atau</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button 
                    onClick={handleGoogleLogin} 
                    className="w-full bg-white border border-gray-300 p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm group"
                >
                    {/* Icon Google SVG */}
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" aria-hidden="true" focusable="false" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                    <span className="font-semibold text-gray-700">Masuk dengan Google</span>
                </button>

                <p className="text-xs text-center text-gray-500 mt-6 leading-relaxed">
                    Dengan masuk, Anda menyetujui 
                    <button 
                        onClick={() => setActivePolicyModal('terms')} 
                        className="text-blue-600 hover:underline mx-1 font-medium focus:outline-none"
                    >
                        Syarat & Ketentuan
                    </button> 
                    serta 
                    <button 
                        onClick={() => setActivePolicyModal('privacy')} 
                        className="text-blue-600 hover:underline mx-1 font-medium focus:outline-none"
                    >
                        Kebijakan Privasi
                    </button> 
                    kami.
                </p>
            </div>
        </div>
    );
}
// ============================================================================
// AKHIR DARI KOMPONEN BARU
// ============================================================================


// ============================================================================
// HOOKS: Logika yang dapat digunakan kembali, seperti antrean permintaan
// ============================================================================
const useRequestQueue = (processTask, delay = 1100) => {
    const [queue, setQueue] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    useEffect(() => {
        const executeNext = async () => {
            if (isProcessing || queue.length === 0) {
                if (queue.length === 0) {
                    setCurrentItem(null); // Hapus item saat ini jika antrean kosong
                }
                return;
            }
            setIsProcessing(true);
            const taskToProcess = queue[0];
            setCurrentItem(taskToProcess); // Tetapkan item yang sedang diproses

            try {
                // Jalankan fungsi pemrosesan tugas yang sebenarnya
                await processTask(taskToProcess);
            } catch (error) {
                console.error("Sebuah tugas dalam antrean gagal:", error, taskToProcess);
                // Di masa depan, kita bisa menambahkan notifikasi error di sini
            } finally {
                // Jeda sebelum memproses tugas berikutnya, bahkan jika ada error
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Hapus tugas yang sudah selesai dan buka kembali antrean
                setQueue(prev => prev.slice(1));
                setIsProcessing(false);
            }
        };

        executeNext();
    }, [queue, isProcessing, processTask, delay]);

    // Fungsi untuk komponen lain menambahkan tugas ke antrean
    const addTask = (task) => {
        setQueue(prev => [...prev, task]);
    };

    return { addTask, queueSize: queue.length, isProcessing, currentItem };
};


// ============================================================================
// ICONS: Simple SVG icons for the UI
// ============================================================================
const ChevronDownIcon = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

// --- PERBAIKAN: TAMBAHKAN IKON YANG HILANG ---
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download" viewBox="0 0 16 16">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clipboard" viewBox="0 0 16 16">
      <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
      <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM8 1.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1z"/>
    </svg>
);

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-list" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-x-lg" viewBox="0 0 16 16">
        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>
);
// --- AKHIR PERBAIKAN ---


// HAPUS: const DeleteIcon = () => ( ... );

// --- LANGKAH 3.1 DIMULAI DI SINI ---
const QueueStatusIndicator = ({ queueSize }) => {
    if (queueSize === 0) {
        return null;
    }

    return (
        <div className="mt-4 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center text-sm animate-fade-in">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
            <span className="text-purple-800 font-semibold">
                Antrean Review AI: {queueSize} tugas sedang menunggu...
            </span>
        </div>
    );
};
// --- LANGKAH 3.1 BERAKHIR DI SINI ---

// ============================================================================
// SERVICES: Centralized API Logic
// ============================================================================

// --- LANGKAH 3: UPDATE LOGIKA GEMINI SERVICE (Multi-Key & Auto-Downgrade) ---
const geminiService = {
    run: async (prompt, apiKeyOrList, options = {}, image = null) => {
        // 1. Normalisasi Input: Pastikan jadi Array
        let apiKeys = [];
        if (Array.isArray(apiKeyOrList)) {
            apiKeys = apiKeyOrList.filter(k => k && k.trim() !== '');
        } else if (typeof apiKeyOrList === 'string' && apiKeyOrList.trim() !== '') {
            apiKeys = [apiKeyOrList];
        }

        if (apiKeys.length === 0) {
            throw new Error("Kunci API Google AI belum dimasukkan. Silakan tambahkan minimal satu kunci API.");
        }

        // Konfigurasi Retry & Fallback
        const MAX_RETRIES = 5; 
        const INITIAL_BACKOFF_MS = 1000; 
        const PRO_MODEL = 'gemini-2.5-pro';
        const FLASH_MODEL = 'gemini-2.5-flash-preview-09-2025'; // Model cadangan (lebih cepat/murah)
        const FALLBACK_ATTEMPT_THRESHOLD = 2; // Pindah ke Flash setelah 2x gagal

        const parts = [{ text: prompt }];
        if (image) {
            parts.push({
                inlineData: { mimeType: image.mimeType, data: image.data }
            });
        }

        const payload = {
            contents: [{ role: "user", parts: parts }],
            generationConfig: options.schema ? { responseMimeType: "application/json", responseSchema: options.schema } : {},
        };
        if (options.useGrounding) payload.tools = [{ "google_search": {} }];

        // State Eksekusi
        let currentModel = PRO_MODEL; 
        let lastError = null; 
        let currentKeyIndex = 0;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            // Pilih kunci (Round Robin)
            const currentApiKey = apiKeys[currentKeyIndex % apiKeys.length];
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentApiKey}`;

            try {
                 console.log(`[Attempt ${attempt + 1}] Model: ${currentModel} | Key Index: ${currentKeyIndex % apiKeys.length}`); 
                 
                 const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                 });

                 if (!response.ok) {
                    let errorText = await response.text();
                    try { errorText = JSON.parse(errorText).error.message; } catch(e){}
                    
                    lastError = new Error(`HTTP ${response.status} - ${errorText}`);
                    console.warn(`API Error: ${lastError.message}`);

                    // --- STRATEGI 1: ROTASI KUNCI (Jika Rate Limit 429) ---
                    if (response.status === 429) {
                        console.warn(`⚠️ Rate Limit (429) pada Key #${currentKeyIndex % apiKeys.length}. Rotasi ke kunci berikutnya...`);
                        
                        // Rotasi ke kunci berikutnya
                        currentKeyIndex++; 

                        // MEKANISME PINDAH MODEL (YANG ANDA TANYAKAN):
                        // Jika kena limit di model Pro, langsung turun ke Flash untuk percobaan berikutnya agar peluang sukses lebih tinggi.
                        if (currentModel !== FLASH_MODEL) {
                             console.warn(`📉 Auto-Downgrade: Beralih ke ${FLASH_MODEL} untuk efisiensi.`);
                             currentModel = FLASH_MODEL;
                        }
                        
                        // Jeda singkat lalu coba lagi (continue loop)
                        await new Promise(r => setTimeout(r, 1500));
                        continue; 
                    }

                    // --- STRATEGI 2: BACKOFF & DOWNGRADE (Jika 503 Overload atau Error Lain) ---
                    if (attempt < MAX_RETRIES - 1) {
                        // Jika sudah gagal beberapa kali, turunkan ke Flash
                        if (attempt + 1 >= FALLBACK_ATTEMPT_THRESHOLD && currentModel !== FLASH_MODEL) {
                            console.warn(`📉 Terlalu banyak kegagalan. Downgrade ke ${FLASH_MODEL}.`);
                            currentModel = FLASH_MODEL; 
                        }
                        
                        // Exponential Backoff (Tunggu makin lama: 1s, 2s, 4s...)
                        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 500; 
                        console.log(`⏳ Menunggu ${Math.round(delay)}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                        
                    } else {
                        throw lastError; 
                    }
                 } else { 
                    // SUKSES
                    const result = await response.json();
                    
                    if (result.candidates && result.candidates.length > 0 &&
                        result.candidates[0].content && result.candidates[0].content.parts &&
                        result.candidates[0].content.parts.length > 0) {
                        
                        const rawText = result.candidates[0].content.parts[0].text;
                        if (options.schema) {
                            try {
                                const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                                return JSON.parse(cleanedText);
                            } catch (e) {
                                // Retry jika JSON rusak
                                console.error("JSON Parse Error", e);
                                if (attempt < MAX_RETRIES - 1) continue;
                                throw new Error("Gagal parsing JSON dari AI.");
                            }
                        }
                        return rawText;
                    } else {
                        throw new Error("Respons dari AI kosong.");
                    }
                 }

            } catch (error) {
                lastError = error;
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } 

        console.error("Semua percobaan API gagal.");
        throw lastError; 
    }
};
// -------------------------------------------------------------------------

const semanticScholarService = {
    search: async (query, apiKey) => {
        if (!apiKey) {
            throw new Error("Kunci API Semantic Scholar belum dimasukkan.");
        }
        // PERBAIKAN: Mengganti 'doi' dengan 'externalIds' dan menambahkan tldr, abstract
        const fields = 'title,authors,year,journal,publicationVenue,externalIds,url,tldr,abstract';
        const encodedQuery = encodeURIComponent(query);
        const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&fields=${fields}&limit=20`;

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': apiKey
                }
            });

            if (!response.ok) {
                // Menangani rate limiting secara spesifik
                if (response.status === 429) {
                    throw new Error("Terlalu banyak permintaan. Harap tunggu beberapa detik sebelum mencoba lagi.");
                }
                const errorBody = await response.json();
                console.error("Semantic Scholar API Error:", errorBody);
                throw new Error(`HTTP error! status: ${response.status} - ${errorBody.message || 'Unknown error'}`);
            }

            const result = await response.json();
            // API pencarian mengembalikan daftar di bawah key 'data'
            return result.data || [];

        } catch (error) {
            console.error("Kesalahan saat memanggil Semantic Scholar API:", error);
            throw error;
        }
    }
};

const scopusService = {
    search: async (query, apiKey, theme = '') => {
        if (!apiKey) {
            throw new Error("Kunci API Scopus belum dimasukkan.");
        }
        
        let finalQuery;
        // PERBAIKAN: Cek apakah kueri sudah merupakan string boolean Scopus yang kompleks
        if (query.toUpperCase().includes('TITLE-ABS-KEY') || query.toUpperCase().includes('TITLE(') || query.toUpperCase().includes('AUTHOR-NAME')) {
            finalQuery = query; // Gunakan kueri apa adanya
        } else {
            // Perilaku fallback untuk pencarian manual sederhana
            if (theme && theme.trim() !== '') {
                finalQuery = `TITLE-ABS-KEY((${query}) AND (${theme}))`;
            } else {
                finalQuery = `TITLE-ABS-KEY(${query})`;
            }
        }

        const encodedQuery = encodeURIComponent(finalQuery);
        const apiUrl = `https://api.elsevier.com/content/search/scopus?query=${encodedQuery}&view=COMPLETE`;

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-ELS-APIKey': apiKey,
                }
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMessage = result?.['service-error']?.status?.statusText || `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            const entries = result?.['search-results']?.entry || [];
            
            // Map Scopus response to our internal format
            return entries.map(entry => ({
                paperId: entry['dc:identifier'] || `scopus-${entry['eid']}`,
                // PERBAIKAN: Mengakses sub-properti '$' untuk mendapatkan teks judul.
                title: entry['dc:title'] || 'Judul tidak tersedia',
                // PERBAIKAN: Mengakses sub-properti '$' untuk nama penulis.
                authors: (entry.author || []).map(a => a.authname).join(', '),
                year: entry['prism:coverDate'] ? new Date(entry['prism:coverDate']).getFullYear().toString() : 'N/A',
                // PERBAIKAN: Mengakses sub-properti '$' untuk nama jurnal.
                journal: { name: entry['prism:publicationName'] || 'Venue tidak diketahui' },
                publicationVenue: { name: entry['prism:publicationName'] || 'Venue tidak diketahui' },
                externalIds: { DOI: entry['prism:doi'] || null },
                url: entry.link?.find(l => l['@ref'] === 'scopus')?.['@href'] || '',
                // PERBAIKAN: Mengakses sub-properti '$' untuk abstrak.
                abstract: entry['dc:description'] || null,
                tldr: null // Scopus doesn't provide TLDR
            }));

        } catch (error) {
            console.error("Kesalahan saat memanggil Scopus API:", error);
            throw error;
        }
    }
};


// ============================================================================
// KOMPONEN: Pembatas Error (Error Boundary)
// ============================================================================
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state agar render berikutnya akan menampilkan UI fallback.
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        // Anda juga bisa me-log error ke layanan pelaporan error
        this.setState({ errorInfo: errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Anda bisa merender UI fallback apa pun
            return (
                <div className="p-6 bg-red-50 border-l-4 border-red-500 text-red-800">
                    <h2 className="text-xl font-bold mb-4">Oops! Terjadi Kesalahan</h2>
                    <p className="mb-2">Aplikasi mengalami error yang tidak terduga. Silakan coba muat ulang halaman (refresh).</p>
                    <p className="mb-4">Jika masalah berlanjut, Anda dapat melaporkan detail teknis di bawah ini kepada pengembang.</p>
                    <details className="bg-white p-3 rounded-lg border text-sm">
                        <summary className="font-semibold cursor-pointer">Detail Teknis Error</summary>
                        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-red-900">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            <br />
                            <strong>Component Stack:</strong>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

// --- KOMPONEN BARU: GERBANG LISENSI (PAYWALL) ---
const LicenseGate = ({ onActivate, handleCopyToClipboard, currentUser }) => {
    const [inputCode, setInputCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const adminContact = "6285123048010"; // Ganti dengan nomor WhatsApp Admin

  // Pastikan fungsi ini sekarang menggunakan 'async'
const handleActivation = async () => {
    const code = inputCode.toUpperCase().trim();
    if (!code) return;

    setIsVerifying(true); // Sekarang tidak akan error karena sudah didefinisikan di atas
    setErrorMsg('');

    try {
        // Ambil data kode dari folder 'licenses' menggunakan KODE sebagai ID-nya
        const licenseRef = doc(db, 'artifacts', 'bibliocobra', 'public', 'data', 'licenses', code);
        const licenseSnap = await getDoc(licenseRef);

        if (licenseSnap.exists()) {
            const data = licenseSnap.data();
            const emailTerdaftar = data.assignedEmail?.toLowerCase().trim();
            const emailSaya = currentUser?.email?.toLowerCase().trim();

            // CEK APAKAH EMAIL COCOK
            if (emailTerdaftar === emailSaya) {
                const isElite = data.tier === 'elite';
                // Jika cocok, buka akses
                onActivate(true, isElite);
            } else {
                setErrorMsg(`Kode ini hanya untuk email: ${emailTerdaftar}.`);
            }
        } else {
            setErrorMsg("Kode lisensi tidak ditemukan di database.");
        }
    } catch (error) {
        console.error(error);
        setErrorMsg("Kesalahan koneksi ke server. Cek Rules Firebase Anda.");
    } finally {
        setIsVerifying(false);
    }
}; 

    // --- UPDATE TAHAP 1: Handler untuk Masuk Gratis ---
    const handleFreeAccess = () => {
        // Free: isPremium=false, showScopus=false
        onActivate(false, false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-indigo-50">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Aktivasi Akun</h2>
                {/* UPDATE: Menghapus referensi teks ke "Elite" agar tidak dianggap dijual umum */}
                <p className="text-gray-600 mb-6 text-sm">
                    Masukkan <strong>Kode Lisensi</strong> untuk akses Premium (berbayar), atau lanjutkan dengan versi Gratis.
                </p>

                <div className="mb-4">
                    <input 
                        type="text" 
                        value={inputCode}
                        onChange={(e) => {
                            setInputCode(e.target.value);
                            setErrorMsg('');
                        }}
                        className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-600 text-center text-lg font-bold tracking-widest uppercase placeholder-gray-300 transition-colors"
                        placeholder="MASUKKAN KODE"
                    />
                    {errorMsg && <p className="text-red-500 text-sm mt-2 animate-pulse">{errorMsg}</p>}
                </div>

                {/* --- UPDATE: Tambahan Peringatan Keras --- */}
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                    <div className="flex items-start gap-2 text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs font-semibold leading-relaxed">
                            <strong>PERINGATAN:</strong> Satu akun/lisensi hanya boleh digunakan oleh <u>satu pengguna</u>. Jika sistem mendeteksi akun digunakan oleh lebih dari satu orang, akun akan di-suspend selamanya (Permanent Ban).
                        </p>
                    </div>
                </div>
                {/* ----------------------------------------- */}
<button 
    onClick={handleActivation}
    // PERBAIKAN 1: Gunakan variabel isVerifying agar tidak lagi "Unused"
    disabled={isVerifying} 
    className={`w-full font-bold py-3 px-6 rounded-lg shadow-lg mb-4 flex items-center justify-center gap-2 transition-all ${
        isVerifying 
        ? 'bg-indigo-400 cursor-not-allowed text-indigo-100' // Warna pudar saat loading
        : 'bg-indigo-600 hover:bg-indigo-700 text-white transform hover:-translate-y-1' // Warna normal
    }`}
>
    {/* PERBAIKAN 2: Tampilkan ikon loading jika isVerifying bernilai true */}
    {isVerifying && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    )}
    
    {/* PERBAIKAN 3: Ubah teks tombol secara dinamis */}
    {isVerifying ? "Memvalidasi..." : "Aktifkan Lisensi"}
</button>

                {/* --- UPDATE TAHAP 1: Tombol Masuk Gratis --- */}
                <button 
                    onClick={handleFreeAccess}
                    className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors text-sm"
                >
                    Lanjutkan sebagai Pengguna Gratis (Free)
                </button>
                {/* ------------------------------------------- */}

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-3">Ingin upgrade ke Premium?</p>
                    <a 
                        href={`https://wa.me/${adminContact}?text=Halo%20Admin,%20saya%20ingin%20membeli%20lisensi%20Bibliocobra.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-green-600 font-bold hover:text-green-700 bg-green-50 px-4 py-2 rounded-full hover:bg-green-100 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/>
                        </svg>
                        Hubungi Admin via WhatsApp
                    </a>
                </div>
            </div>
        </div>
    );
};


// ============================================================================
// KOMPONEN: Masing-masing Tab dipecah menjadi komponennya sendiri.
// ============================================================================

// --- Komponen Reusable: Selektor Referensi (Checkbox) ---
const ReferenceSelector = ({ projectData, selectedRefIds, setSelectedRefIds }) => {
    const [viewingRef, setViewingRef] = useState(null); // State untuk popup
    const [isOpen, setIsOpen] = useState(false); // State untuk Accordion (Default: Tertutup)

    // Fitur Check All / Uncheck All
    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            const allIds = projectData.allReferences.map(ref => ref.id);
            setSelectedRefIds(allIds);
        } else {
            setSelectedRefIds([]);
        }
    };

    const handleCheckboxChange = (id) => {
        setSelectedRefIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // --- FITUR BARU: Helper untuk Badge Status PRISMA ---
    const getPrismaBadge = (refId) => {
        // Cek apakah PRISMA sudah diinisialisasi
        if (!projectData.prismaState || !projectData.prismaState.isInitialized) return null;
        
        // Cari status studi ini di state PRISMA
        const study = projectData.prismaState.studies.find(s => String(s.id) === String(refId));
        
        if (!study) {
            // Jika tidak ditemukan di PRISMA tapi ada di library (baru ditambah), anggap General
            return <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-medium tracking-wide">GENERAL</span>;
        }

        if (study.screeningStatus === 'fulltext_included') {
            return (
                <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 font-bold uppercase tracking-wide flex items-center gap-1" title="Studi ini lolos seleksi PRISMA dan siap dianalisis sebagai Data Utama">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>
                    SLR DATA
                </span>
            );
        } else if (study.screeningStatus.includes('excluded')) {
            return <span className="text-[9px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100 font-medium tracking-wide" title="Dieksklusi dari Data Utama, namun tetap bisa digunakan sebagai referensi Latar Belakang/Teori">BACKGROUND REF</span>;
        } else if (study.screeningStatus === 'unscreened' || study.screeningStatus === 'abstract_included') {
            return <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-medium tracking-wide" title="Sedang dalam proses screening">SCREENING...</span>;
        }
        
        return null;
    };
    // ---------------------------------------------------

    // Helper untuk Badge Kualitas Data
    const getDataBadge = (ref) => {
        const hasExtraction = projectData.extractedData && projectData.extractedData.some(e => String(e.refId) === String(ref.id));
        if (hasExtraction) return <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-200 whitespace-nowrap" title="Data Ekstraksi SLR Tersedia">High Quality</span>;
        if (ref.isiKutipan && ref.isiKutipan.length > 50) return <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200 whitespace-nowrap" title="Catatan Manual Tersedia">Medium</span>;
        return <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 whitespace-nowrap" title="Hanya Metadata">Low</span>;
    };

    return (
        <div className="mb-6 border rounded-lg overflow-hidden border-gray-300 shadow-sm relative transition-all duration-300">
            {/* --- POPUP MODAL (Ditampilkan jika ada viewingRef) --- */}
            {viewingRef && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999] p-4 animate-fade-in" onClick={() => setViewingRef(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header Popup */}
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm line-clamp-2">{viewingRef.title}</h4>
                                <p className="text-xs text-gray-500 mt-1">{viewingRef.author} ({viewingRef.year})</p>
                            </div>
                            <button onClick={() => setViewingRef(null)} className="text-gray-400 hover:text-red-500 p-1">
                                <CloseIcon />
                            </button>
                        </div>
                        
                        {/* Content Popup - UPDATE: Dipisah jadi 3 Bagian */}
                        <div className="p-4 overflow-y-auto custom-scrollbar text-sm space-y-5">
                            
                            {/* 1. Abstrak (Asli dari Paper) */}
                            <div>
                                <h5 className="font-bold text-gray-700 text-xs uppercase mb-1.5 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                                    </svg>
                                    Abstrak
                                </h5>
                                {/* PERBAIKAN FORMAT: Menggunakan whitespace-pre-wrap agar enter terbaca, menghapus text-justify agar tidak renggang */}
                                <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-normal">
                                    {viewingRef.abstract ? viewingRef.abstract : <span className="text-gray-400 italic">Tidak ada data abstrak.</span>}
                                </div>
                            </div>

                            {/* 2. Catatan (Manual User / AI Review) */}
                            <div>
                                <h5 className="font-bold text-blue-800 text-xs uppercase mb-1.5 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z"/>
                                    </svg>
                                    Catatan / Kutipan
                                </h5>
                                <div className="bg-blue-50 p-3 rounded border border-blue-100 text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                    {viewingRef.isiKutipan ? viewingRef.isiKutipan : <span className="text-gray-400 italic">Tidak ada catatan manual.</span>}
                                </div>
                            </div>

                            {/* 3. Data Sintesis (Dari Tabel SLR) */}
                            <div>
                                <h5 className="font-bold text-green-800 text-xs uppercase mb-1.5 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 8V8H6v4h4z"/>
                                    </svg>
                                    Hasil Sintesis (SLR)
                                </h5>
                                {(() => {
                                    const extraction = projectData.extractedData && projectData.extractedData.find(e => String(e.refId) === String(viewingRef.id));
                                    if (extraction && extraction.data) {
                                        return (
                                            <div className="bg-green-50 p-3 rounded border border-green-100 space-y-2 max-h-60 overflow-y-auto">
                                                {Object.entries(extraction.data).map(([key, val]) => (
                                                    val && (
                                                        <div key={key} className="border-b border-green-200 pb-1 last:border-0 last:pb-0">
                                                            <span className="font-semibold text-green-800 text-xs block mb-0.5 capitalize">{key.replace(/_/g, ' ')}:</span>
                                                            <span className="text-gray-700 text-xs whitespace-pre-wrap">{val}</span>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="bg-green-50 p-3 rounded border border-green-100 text-gray-400 italic text-xs">
                                            Belum ada data ekstraksi/sintesis.
                                        </div>
                                    );
                                })()}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* HEADER ACCORDION (Klik untuk Buka/Tutup) */}
            <div 
                className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${isOpen ? 'bg-gray-100 border-b border-gray-200' : 'bg-white hover:bg-gray-50'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2 select-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Pilih Referensi Pendukung <span className={`ml-1 text-xs font-normal ${selectedRefIds.length > 0 ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>({selectedRefIds.length} terpilih)</span>
                </h4>
                
                <div className="flex items-center gap-3">
                    {/* Tombol Aksi (Hanya muncul jika terbuka) */}
                    {isOpen && (
                        <div className="space-x-2 mr-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleSelectAll(true)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors">Pilih Semua</button>
                            <button onClick={() => handleSelectAll(false)} className="text-xs text-red-600 hover:text-red-800 font-semibold transition-colors">Hapus Semua</button>
                        </div>
                    )}
                    <ChevronDownIcon isOpen={isOpen} />
                </div>
            </div>

            {/* ISI ACCORDION (Collapsible) */}
            {isOpen && (
                <div className="max-h-60 overflow-y-auto p-2 bg-white space-y-1 custom-scrollbar animate-fade-in">
                    {projectData.allReferences.length > 0 ? (
                        projectData.allReferences.map(ref => (
                            <div key={ref.id} className={`flex items-start gap-2 p-2 rounded border transition-all ${selectedRefIds.includes(ref.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedRefIds.includes(ref.id)}
                                    onChange={() => handleCheckboxChange(ref.id)}
                                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                />
                                
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleCheckboxChange(ref.id)}>
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                        <span className="font-semibold text-xs text-gray-800 line-clamp-1 break-all">{ref.title}</span>
                                        {/* --- UPDATE: Tampilkan Badge Sumber RIS di Selektor --- */}
                                        {ref.source === 'external_ris' && (
                                            <span className="text-[8px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200 font-bold" title="Sumber: Upload File RIS">
                                                RIS
                                            </span>
                                        )}
                                        {/* --- UPDATE: Tampilkan Badge PRISMA --- */}
                                        {getPrismaBadge(ref.id)}
                                        {/* -------------------------------------- */}
                                        {getDataBadge(ref)}
                                    </div>
                                    <p className="text-[10px] text-gray-500 truncate">{ref.author} ({ref.year})</p>
                                </div>

                                {/* Tombol Lihat Detail (Popup) */}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); // Mencegah checkbox tercentang saat klik info
                                        setViewingRef(ref);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                                    title="Lihat Detail Abstrak & Sintesis"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                                    </svg>
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6 text-gray-400 italic text-sm">
                            Belum ada referensi di perpustakaan. Silakan tambahkan di menu "Literatur & Referensi".
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Komponen BARU: Deskripsi Karakteristik Responden ---
const DeskripsiResponden = ({ projectData, setProjectData, handleGenerateDeskripsiResponden, isLoading, handleCopyToClipboard }) => {
    const [rawData, setRawData] = useState('');
    const isPremium = projectData.isPremium; // Cek Status Premium

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Deskripsi Karakteristik Responden</h2>
            <p className="text-gray-700 mb-4">
                "Masukkan data demografi responden (misal: tabel frekuensi usia, pendidikan) atau profil narasumber (deskripsi latar belakang dalam Teks). AI akan menyusun narasi karakteristik subjek penelitian untuk awal Bab 4."
            </p>

            <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Data Mentah Karakteristik Responden:</label>
                <textarea
                    value={rawData}
                    onChange={(e) => setRawData(e.target.value)}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed font-mono text-sm"
                    rows="8"
                    placeholder="Contoh:
Jenis Kelamin: Laki-laki (45 orang, 45%), Perempuan (55 orang, 55%).
Usia: 20-30 th (30%), 31-40 th (50%), >40 th (20%).
Pendidikan: S1 (80), S2 (20)."
                ></textarea>
            </div>

            <button
                onClick={() => handleGenerateDeskripsiResponden(rawData)}
                className={`font-bold py-2 px-4 rounded-lg mb-6 ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                disabled={isLoading || !rawData || !isPremium}
                title={!isPremium ? "Fitur Premium" : ""}
            >
                {!isPremium ? '🔒 Tulis Deskripsi (Premium)' : (isLoading ? 'Memproses...' : '✨ Tulis Deskripsi Responden')}
            </button>
            {!isPremium && <p className="text-xs text-red-500 -mt-4 mb-4">Upgrade ke Premium untuk menggunakan penulis otomatis AI.</p>}

            {projectData.deskripsiRespondenDraft && (
                <div className="pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-gray-800">Draf Narasi Karakteristik Responden</h3>
                        <button onClick={() => handleCopyToClipboard(projectData.deskripsiRespondenDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded-lg">
                            Salin Teks
                        </button>
                    </div>
                    <textarea
                        value={projectData.deskripsiRespondenDraft}
                        onChange={(e) => setProjectData(p => ({ ...p, deskripsiRespondenDraft: e.target.value }))}
                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                        rows="10"
                    ></textarea>
                    <p className="text-xs text-gray-500 mt-2 italic">
                        *Narasi ini akan otomatis disertakan di awal Bab 4 (Hasil & Pembahasan) saat Anda meng-generate bab tersebut.
                    </p>
                </div>
            )}
        </div>
    );
};

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
    handleGenerateMirrorReflection,
    handleValidateMirrorReflection,
}) => {
    // Helper status premium
    const isPremium = projectData.isPremium;

    // Jika proyek sudah punya judul, tampilkan ringkasan dan tombol edit
    if (projectData.judulKTI && !editingIdea && !ideKtiMode) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Ide KTI & Fondasi Penelitian</h2>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-indigo-800 mb-3">Ringkasan Proyek Anda</h3>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Judul KTI:</p>
                        <p className="mb-3 text-gray-800">{projectData.judulKTI}</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Fakta/Pokok Masalah:</p>
                        <p className="mb-3 text-gray-800">{projectData.faktaMasalahDraft}</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-700">Tujuan Penelitian:</p>
                        <p className="mb-3 text-gray-800">{projectData.tujuanPenelitianDraft}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleStartNewIdea} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg text-sm">
                            Edit Detail Proyek
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Tampilan utama untuk memulai proyek baru atau mengedit
    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Mulai Proyek: Ide KTI & Fondasi Penelitian</h2>
            
            {/* Form Detail Penelitian (Selalu Terlihat) */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">1. Lengkapi Detail & Fondasi Penelitian</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Topik atau Tema:</label>
                        <textarea name="topikTema" value={projectData.topikTema} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: Menganalisis dampak budaya inovasi digital terhadap kinerja organisasi di sektor perbankan" rows="3"></textarea>
                    </div>
                    {/* BAGIAN JENIS KARYA TULIS DIHAPUS - DEFAULT: ARTIKEL ILMIAH */}
                    <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Pendekatan Penelitian (Wajib):</label>
                        <select name="pendekatan" value={projectData.pendekatan} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700">
                            <option value="" disabled>Pilih pendekatan...</option>
                            <option value="Kuantitatif">Kuantitatif</option>
                            <option value="Kualitatif">Kualitatif</option>
                            <option value="Metode Campuran">Metode Campuran</option>
                        </select>
                    </div>
                    
                    {/* --- PERUBAHAN DIMULAI DI SINI --- */}
                    {/* --- KODE BARU MIRROR REFLECTION --- */}
                    <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Fakta/Pokok Masalah:</label>
                        <textarea name="faktaMasalahDraft" value={projectData.faktaMasalahDraft} onChange={handleInputChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Jelaskan masalah utama atau fenomena yang ingin Anda teliti." rows="4"></textarea>
                    </div>

                    {/* AREA MIRROR REFLECTION (LOGIKA BAB I) - UPDATE PREMIUM CHECK */}
                    <div className="md:col-span-2 bg-indigo-50 p-4 rounded-lg border border-indigo-200 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-indigo-900 text-sm font-bold">Rumusan Masalah (Pertanyaan):</label>
                            <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-1 rounded font-bold uppercase tracking-wide">Basis Logika</span>
                        </div>
                        <textarea 
                            name="rumusanMasalahDraft" 
                            value={projectData.rumusanMasalahDraft} 
                            onChange={handleInputChange} 
                            className="shadow appearance-none border border-indigo-300 rounded-lg w-full py-2 px-3 text-gray-700 mb-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            placeholder="Contoh: 1. Bagaimana pengaruh X terhadap Y?..." 
                            rows="4"
                        ></textarea>

                        {/* VISUAL CONNECTOR & CONTROLS */}
                        <div className="flex flex-col items-center justify-center my-3 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                                <span>⬇️ Mirror Reflection (Konsistensi 1:1) ⬇️</span>
                            </div>
                            <div className="flex gap-2 w-full">
                                <button 
                                    onClick={handleGenerateMirrorReflection}
                                    disabled={isLoading || !isPremium}
                                    className={`flex-1 font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-sm ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                    title={!isPremium ? "Fitur Premium" : ""}
                                >
                                    <span>{!isPremium ? '🔒' : '🔄'}</span> {!isPremium ? 'Selaraskan (Premium)' : 'Selaraskan Otomatis (AI)'}
                                </button>
                                <button 
                                    onClick={handleValidateMirrorReflection}
                                    disabled={isLoading || !isPremium}
                                    className={`flex-1 font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-sm ${!isPremium ? 'bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-300' : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'}`}
                                    title={!isPremium ? "Fitur Premium" : ""}
                                >
                                    <span>{!isPremium ? '🔒' : '🔍'}</span> {!isPremium ? 'Validasi (Premium)' : 'Cek Validasi Logika'}
                                </button>
                            </div>
                            {!isPremium && <p className="text-[10px] text-red-500 italic">Upgrade ke Premium untuk membuka fitur logika otomatis.</p>}
                        </div>

                        <div className="mt-3">
                            <label className="block text-indigo-900 text-sm font-bold mb-2">Tujuan Penelitian (Jawaban):</label>
                            <textarea 
                                name="tujuanPenelitianDraft" 
                                value={projectData.tujuanPenelitianDraft} 
                                onChange={handleInputChange} 
                                className="shadow appearance-none border border-indigo-300 rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="Akan diisi otomatis oleh AI agar selaras dengan pertanyaan..." 
                                rows="4"
                            ></textarea>
                        </div>
                    </div>
                    {/* --- AKHIR KODE BARU --- */}

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
    setProjectData,
    manualRef,
    setManualRef,
    manualMode,
    setManualMode,
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
    handleExportReferences,
    // Props untuk Semantic Scholar
    handleSearchSemanticScholar,
    searchQuery,
    setSearchQuery,
    searchResults,
    isS2Searching,
    handleAddReferenceFromSearch,
    handleAiReview,
    showInfoModal,
    openMethod,
    setOpenMethod,
    // Props untuk Pencarian Konsep
    handleConceptSearch,
    conceptQuery,
    setConceptQuery,
    isConceptSearching,
    conceptSearchResult,
    // Props baru untuk Scopus
    handleSearchScopus,
    isScopusSearching,
    scopusSearchResults,
    scopusApiKey,
    setScopusApiKey,
    isRegulationSearching,
    regulationSearchResults,
    handleRegulationSearch,
    handleAddRegulationToReference,
    handleClueSearchRegulation,
    conceptSearchMode,
    setConceptSearchMode,
    // --- PROPS BARU UNTUK RIS ---
    triggerImportRis,
    handleExportRis,
    risSearchResults,
    setRisSearchResults, // <--- TAMBAHAN: Setter untuk membersihkan preview
    // --- PROPS BARU UNTUK SMART PASTE ---
    smartPasteText,
    setSmartPasteText,
    handleSmartPaste,
    // --- PROP BARU UNTUK BULK ADD RIS ---
    handleAddAllRisToLibrary 
}) => {
    // HAPUS STATE LOKAL: const [manualMode, setManualMode] = useState('template');
    const [expandedAbstractId, setExpandedAbstractId] = useState(null);
    const [aiReviews, setAiReviews] = useState({});
    
    // Helper Akses
    const isPremium = projectData.isPremium;
    // Elite akses dikelola via projectData.showScopus

    // ... (State library selection & sorting logic remains the same) ...
    // --- STATE BARU: Untuk Checkbox Perpustakaan ---
    const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false); // State Modal Konfirmasi Hapus

    // --- STATE BARU: Untuk Sorting (Pengurutan) ---
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // --- FUNGSI BARU: Logic Sorting ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedReferences = React.useMemo(() => {
        let sortableItems = [...projectData.allReferences];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Penanganan khusus untuk Tahun (Konversi ke angka)
                if (sortConfig.key === 'year') {
                    // Ambil angka saja dari string tahun (misal "2020///" -> 2020)
                    aValue = parseInt(String(aValue || '0').replace(/\D/g, ''), 10) || 0;
                    bValue = parseInt(String(bValue || '0').replace(/\D/g, ''), 10) || 0;
                } 
                // --- UPDATE: Penanganan khusus untuk Jurnal (Cek Kualitas) ---
                else if (sortConfig.key === 'journal') {
                    const getJournalName = (val) => {
                        if (!val) return '';
                        // Handle jika journal berbentuk object (dari Semantic Scholar) atau string
                        return (typeof val === 'object' && val !== null) ? val.name : String(val);
                    };
                    // Urutkan string kosong (tidak ada jurnal) agar berkumpul
                    aValue = getJournalName(aValue).toLowerCase();
                    bValue = getJournalName(bValue).toLowerCase();
                }
                // -------------------------------------------------------------
                else {
                    // Default string compare (Case insensitive)
                    aValue = String(aValue || '').toLowerCase();
                    bValue = String(bValue || '').toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [projectData.allReferences, sortConfig]);

    // --- FUNGSI BARU: Manajemen Seleksi & Bulk Delete ---
    const handleSelectAllLibrary = (e) => {
        if (e.target.checked) {
            const allIds = projectData.allReferences.map(ref => ref.id);
            setSelectedLibraryIds(allIds);
        } else {
            setSelectedLibraryIds([]);
        }
    };

    const handleSelectLibraryItem = (id) => {
        setSelectedLibraryIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // 1. Tombol Hapus diklik -> Buka Modal
    const handleBulkDeleteLibrary = () => {
        if (selectedLibraryIds.length === 0) return;
        setIsBulkDeleteConfirmOpen(true);
    };

    // 2. Konfirmasi di Modal -> Eksekusi Hapus
    const confirmBulkDelete = () => {
        setProjectData(prev => ({
            ...prev,
            allReferences: prev.allReferences.filter(ref => !selectedLibraryIds.includes(ref.id))
        }));
        setSelectedLibraryIds([]); // Reset seleksi
        setIsBulkDeleteConfirmOpen(false); // Tutup modal
        showInfoModal(`${selectedLibraryIds.length} referensi berhasil dihapus.`);
    };
    // ---------------------------------------------------

    // Fungsi "pekerja" untuk antrean. Memberitahu antrean bagaimana cara memproses satu tugas.
    const processAiReviewTask = React.useCallback(async (task) => {
        const { paper, context } = task;
        if (!paper.abstract) {
            // Kita tidak bisa melempar error di sini karena akan menghentikan antrean.
            // Cukup catat dan lanjutkan.
            console.warn(`Melewati review untuk "${paper.title}" karena tidak ada abstrak.`);
            setAiReviews(prev => ({ ...prev, [(paper.paperId || paper.id)]: { error: "Abstrak tidak tersedia." } }));
            return;
        }

        try {
            // Mapping ID: Prioritaskan paperId (semantic/scopus), fallback ke id (manual/RIS)
            const idToUse = paper.paperId || paper.id;
            
            // Standardize paper object for review if needed
            const paperForReview = {
                ...paper,
                // Ensure abstract is present (already checked above)
                abstract: paper.abstract || paper.isiKutipan
            };

            const result = await handleAiReview(paperForReview, context);
             // Tambahkan cek untuk memastikan 'result' tidak 'undefined' (jika error ditangani di handleAiReview)
            if (result) {
                setAiReviews(prev => ({ ...prev, [idToUse]: result }));
            } else {
                setAiReviews(prev => ({ ...prev, [idToUse]: { error: "Gagal mendapatkan review dari AI. Cek API Key Anda." } }));
            }
        } catch (error) {
            console.error(`Gagal mereview paper "${paper.title}":`, error);
            const idToUse = paper.paperId || paper.id;
            setAiReviews(prev => ({ ...prev, [idToUse]: { error: error.message } }));
        }
    }, [handleAiReview]);

    // Inisialisasi hook antrean
    const { addTask: addReviewTask, queueSize: reviewQueueSize, currentItem: currentlyReviewingTask } = useRequestQueue(processAiReviewTask, 1100);

    // Dapatkan ID paper yang sedang direview dari state antrean
    // Fix: Handle both paperId (API) and id (RIS/Manual)
    const reviewingId = currentlyReviewingTask ? (currentlyReviewingTask.paper.paperId || currentlyReviewingTask.paper.id) : null;


    const toggleMethod = (method) => {
        setOpenMethod(prev => (prev === method ? null : method));
    };

    const toggleAbstract = (paperId) => {
        setExpandedAbstractId(prevId => (prevId === paperId ? null : paperId));
    };

    const getRelevanceStyles = (category) => {
        switch (category) {
            case 'Sangat Relevan':
                return {
                    container: 'bg-green-50 border-green-300',
                    header: 'text-green-800',
                    badge: 'bg-green-100 text-green-800'
                };
            case 'Relevan':
                return {
                    container: 'bg-yellow-50 border-yellow-300',
                    header: 'text-yellow-800',
                    badge: 'bg-yellow-100 text-yellow-800'
                };
            case 'Tidak Relevan':
                return {
                    container: 'bg-red-50 border-red-300',
                    header: 'text-red-800',
                    badge: 'bg-red-100 text-red-800'
                };
            default:
                return {
                    container: 'bg-gray-50 border-gray-300',
                    header: 'text-gray-800',
                    badge: 'bg-gray-100 text-gray-800'
                };
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            {/* ... (Modal Delete Confirm same as before) ... */}
             {isBulkDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-[9999] p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full flex flex-col animate-fade-in">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                            </svg>
                            <h3 className="text-xl font-bold text-gray-800">Konfirmasi Hapus</h3>
                        </div>
                        <p className="text-gray-700 mb-6 text-sm">
                            Apakah Anda yakin ingin menghapus <strong>{selectedLibraryIds.length} referensi</strong> terpilih? <br/>
                            <span className="text-red-500 font-semibold">Tindakan ini tidak dapat dibatalkan.</span>
                        </p>
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setIsBulkDeleteConfirmOpen(false)} 
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={confirmBulkDelete} 
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md"
                            >
                                Ya, Hapus Permanen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Literatur & Referensi</h2>
            <p className="text-gray-600 mb-8 -mt-4">Pusat untuk mencari, menambah, dan mengelola semua referensi untuk proyek Anda.</p>

            {/* Bagian 1: Membangun Perpustakaan Proyek */}
            <h3 className="text-xl font-bold mb-4 text-gray-800">Bangun Perpustakaan Referensi Proyek</h3>
            
            <div className="space-y-4 mb-8">
                {/* Metode 1: Pencarian Terpandu AI */}
                {/* ... (Metode 1: Reference Clues remains same) ... */}
                <div className="border border-gray-200 rounded-lg">
                    <button 
                        onClick={() => toggleMethod('method1')} 
                        className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 rounded-lg ${openMethod === 'method1' ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'}`}
                    >
                        <span className="font-semibold text-gray-800">Metode 1: Pencarian Terpandu AI</span>
                        <ChevronDownIcon isOpen={openMethod === 'method1'} />
                    </button>
                    {openMethod === 'method1' && (
                        <div className="p-4 border-t border-gray-200 animate-fade-in">
                            <p className="text-sm text-gray-700 mb-4">Gunakan AI untuk membuat peta jalan pencarian (clues), lalu gunakan peta jalan tersebut untuk mencari referensi di mesin pencari akademis.</p>
                            
                            {/* Fitur Clue Referensi */}
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm font-semibold text-blue-800 mb-2">Langkah 1: Hasilkan Peta Jalan Pencarian (Clues)</p>
                                <button 
                                    onClick={handleGenerateReferenceClues} 
                                    className={`font-bold py-2 px-3 rounded-lg text-sm transition-colors ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                                    disabled={isLoading || !projectData.topikTema || !isPremium}
                                    title={!isPremium ? "Fitur Premium" : ""}
                                >
                                    {!isPremium ? '🔒 Dapatkan Clue (Premium)' : (isLoading ? 'Mencari...' : '🔍 Dapatkan Clue Referensi')}
                                </button>
                                {!isPremium && <p className="text-xs text-red-500 mt-1">Upgrade ke Premium untuk menggunakan bantuan AI ini.</p>}
                            </div>
                            {projectData.aiReferenceClues && (
                                <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                                    <h5 className="font-bold mb-2">Clue Referensi Kunci untuk Riset Mandiri:</h5>
                                    {projectData.aiReferenceClues.map((cat, index) => (
                                        <div key={index} className="mb-3">
                                            <p className="font-semibold">{cat.category}:</p>
                                            <ul className="list-none ml-4 text-sm space-y-2">
                                                {cat.clues.map((clueObj, i) => (
                                                <li key={i}>
                                                        <span className="font-bold text-gray-700">{clueObj.clue}</span>
                                                        <p className="italic text-yellow-900 text-xs pl-2 border-l-2 border-yellow-300 ml-1">
                                                            {clueObj.explanation}
                                                        </p>
                                                </li>
                                                ))}
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
                    )}
                </div>

                {/* Metode 2: Cari via Semantic Scholar */}
                <div className="border border-gray-200 rounded-lg">
                    {/* ... (Semantic Scholar remains same) ... */}
                    <button 
                        onClick={() => toggleMethod('method2')} 
                        className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 rounded-lg ${openMethod === 'method2' ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'}`}
                    >
                        <span className="font-semibold text-gray-800">Metode 2: Cari via Semantic Scholar (Gratis)</span>
                        <ChevronDownIcon isOpen={openMethod === 'method2'} />
                    </button>
                    {openMethod === 'method2' && (
                        <div className="p-4 border-t border-gray-200 animate-fade-in">
                            <p className="text-sm text-gray-700 mb-4">Cari artikel secara langsung dan tambahkan ke perpustakaan Anda.</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                    placeholder="Masukkan topik atau judul..."
                                />
                                <button 
                                    type="button"
                                    onClick={() => handleSearchSemanticScholar(searchQuery)} 
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-purple-300 whitespace-nowrap" 
                                    disabled={isS2Searching || !searchQuery}
                                >
                                    {isS2Searching ? 'Mencari...' : 'Cari'}
                                </button>
                            </div>

                            <QueueStatusIndicator queueSize={reviewQueueSize} />

                            {isS2Searching && searchResults === null && (
                                <div className="mt-6 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                    <p className="ml-3 text-gray-600">Menghubungi Semantic Scholar...</p>
                                </div>
                            )}

                            {searchResults && (
                                <div className="mt-6">
                                    <h5 className="font-bold text-gray-800 mb-2">Hasil Pencarian ({searchResults.length}):</h5>
                                    {searchResults.length > 0 ? (
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border-t pt-4 mt-4 border-purple-200">
                                            {searchResults.map(paper => (
                                                <div key={paper.paperId} className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col items-start gap-2">
                                                    <div className="w-full flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{paper.title}</p>
                                                            <p className="text-xs text-gray-600">
                                                                {(paper.authors || []).map(a => a.name).join(', ')} ({paper.year || 'N/A'})
                                                            </p>
                                                            <p className="text-xs text-gray-500 italic">
                                                                {paper.journal?.name || paper.publicationVenue?.name || 'Venue tidak diketahui'}
                                                            </p>
                                                            {paper.externalIds?.DOI && (
                                                                <p className="text-xs text-blue-600 mt-1">
                                                                    DOI: <a href={`https://doi.org/${paper.externalIds.DOI}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{paper.externalIds.DOI}</a>
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                const review = aiReviews[paper.paperId];
                                                                handleAddReferenceFromSearch(paper, review);
                                                            }}
                                                            className="ml-4 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-2 rounded-lg flex-shrink-0"
                                                            title="Tambah ke Perpustakaan Proyek"
                                                        >
                                                            + Tambah
                                                        </button>
                                                    </div>
                                                    {paper.tldr && paper.tldr.text && (
                                                        <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300 w-full">
                                                            <p className="text-xs font-semibold text-yellow-800">TLDR:</p>
                                                            <p className="text-xs text-gray-700 italic">"{paper.tldr.text}"</p>
                                                        </div>
                                                    )}
                                                    {paper.abstract && (
                                                        <div className="mt-2 w-full">
                                                            <div className="flex items-center gap-4">
                                                                <button onClick={() => toggleAbstract(paper.paperId)} className="text-xs text-blue-600 hover:underline font-semibold">
                                                                    {expandedAbstractId === paper.paperId ? 'Sembunyikan Abstrak' : 'Tampilkan Abstrak'}
                                                                </button>
                                                                {/* TOMBOL REVIEW AI (LOCKED FOR FREE) */}
                                                                <button 
                                                                    onClick={() => addReviewTask({ paper: paper, context: searchQuery })} 
                                                                    className={`text-xs font-semibold ${!isPremium ? 'text-gray-400 cursor-not-allowed' : 'text-purple-600 hover:underline'}`}
                                                                    disabled={!isPremium || reviewingId === paper.paperId}
                                                                    title={!isPremium ? "Fitur Premium" : ""}
                                                                >
                                                                    {!isPremium ? '🔒 Review AI (Premium)' : (reviewingId === paper.paperId ? 'Mereview...' : '✨ Review AI')}
                                                                </button>
                                                            </div>
                                                            {expandedAbstractId === paper.paperId && (
                                                                <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-md border">
                                                                    {paper.abstract}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* AI Review Result Display */}
                                                    {reviewingId === paper.paperId && !aiReviews[paper.paperId] && (
                                                        <div className="mt-3 flex items-center text-xs text-gray-500">
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                                                            AI sedang mereview...
                                                        </div>
                                                    )}
                                                    {aiReviews[paper.paperId] && (
                                                        aiReviews[paper.paperId].error ? (
                                                            <div className="mt-3 p-3 border-l-4 rounded-r-lg bg-red-50 border-red-300 text-red-800 text-xs">
                                                                <p className="font-bold">Gagal Mereview</p>
                                                                <p>{aiReviews[paper.paperId].error}</p>
                                                            </div>
                                                        ) : (
                                                            <div className={`mt-3 p-3 border-l-4 rounded-r-lg ${getRelevanceStyles(aiReviews[paper.paperId].kategori_relevansi).container}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <h6 className={`text-sm font-bold ${getRelevanceStyles(aiReviews[paper.paperId].kategori_relevansi).header}`}>
                                                                        AI Review
                                                                    </h6>
                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRelevanceStyles(aiReviews[paper.paperId].kategori_relevansi).badge}`}>
                                                                        {aiReviews[paper.paperId].kategori_relevansi}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2 text-xs text-gray-700 space-y-2">
                                                                    <div>
                                                                        <p className="font-semibold">Temuan Kunci:</p>
                                                                        <p className="italic">"{aiReviews[paper.paperId].finding}"</p>
                                                                    </div>
                                                                        <div>
                                                                        <p className="font-semibold">Analisis Relevansi:</p>
                                                                        <p>{aiReviews[paper.paperId].relevansi}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic mt-4 text-center">Tidak ada hasil yang ditemukan untuk kueri Anda.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Metode 3: Tambah Manual & Impor Dataset */}
                <div className="border border-gray-200 rounded-lg">
                    <button 
                        onClick={() => toggleMethod('method4')} 
                        className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 rounded-lg ${openMethod === 'method4' ? 'bg-green-100' : 'bg-green-50 hover:bg-green-100'}`}
                    >
                        <span className="font-semibold text-gray-800">Metode 3: Tambah Manual, Impor RIS & Smart Paste (Gratis)</span>
                        <ChevronDownIcon isOpen={openMethod === 'method4'} />
                    </button>
                    {openMethod === 'method4' && (
                        <div className="p-4 border-t border-gray-200 animate-fade-in">
                            <div className="flex border-b border-green-300 mb-4 overflow-x-auto no-scrollbar">
                                <button onClick={() => setManualMode('template')} className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${manualMode === 'template' ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-green-600'}`}>1. Isi Template</button>
                                {/* --- UPDATE: TAB SWAPPED --- */}
                                <button onClick={() => setManualMode('smartPaste')} className={`py-2 px-4 text-sm font-medium whitespace-nowrap flex items-center gap-1 ${manualMode === 'smartPaste' ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-green-600'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M10 .5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5.5.5 0 0 0-.5.5V2a.5.5 0 0 0 .5.5h5A.5.5 0 0 0 11 2v-.5a.5.5 0 0 0-.5-.5.5.5 0 0 1-.5-.5Z"/>
                                        <path d="M4.085 1H3.5A1.5 1.5 0 0 0 2 2.5V12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A1.5 1.5 0 0 0 12.5 1h-.585c.055.156.085.325.085.5V2a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 2v-.5c0-.175.03-.344.085-.5ZM10 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-6.646 5.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L6.293 16H1.5a.5.5 0 0 1 0-1h4.793l-2.647-2.646a.5.5 0 0 1 0-.708Z"/>
                                    </svg>
                                    2. Smart Paste
                                </button>
                                <button onClick={() => setManualMode('ris')} className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${manualMode === 'ris' ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-green-600'}`}>3. Impor Dataset RIS (SLR)</button>
                                {/* --------------------------- */}
                            </div>
                            
                            {manualMode === 'template' && (
                                <div className="animate-fade-in">
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

                            {manualMode === 'smartPaste' && (
                                <div className="animate-fade-in">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded-r">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Cara Kerja:</strong> Buka file PDF Jurnal Anda, tekan <strong>Ctrl+A</strong> (Pilih Semua) di halaman pertama, lalu <strong>Ctrl+C</strong> (Copy). Tempelkan teks mentah tersebut di bawah ini. AI akan membersihkan dan mengekstrak datanya ke dalam Formulir Template.
                                        </p>
                                    </div>
                                    <textarea
                                        value={smartPasteText}
                                        onChange={(e) => setSmartPasteText(e.target.value)}
                                        className="shadow-sm border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed font-mono text-xs"
                                        rows="10"
                                        placeholder="Tempel teks mentah dari PDF di sini..."
                                    ></textarea>
                                    <button onClick={handleSmartPaste} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2" disabled={isLoading || !smartPasteText}>
                                        {isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Mengekstrak...
                                            </>
                                        ) : (
                                            <>
                                                <span>✨ Ekstrak ke Formulir</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* --- TAB BARU: IMPOR DATASET RIS --- */}
                            {manualMode === 'ris' && (
                                <div className="animate-fade-in">
                                    <p className="text-sm text-green-700 mb-4">
                                        Unggah file hasil ekspor dari database (Scopus, WoS, Mendeley) dalam format <strong>.ris</strong>. Metode ini sangat disarankan untuk memulai <strong>Systematic Literature Review (SLR)</strong>. Anda dapat meninjau (preview) dataset besar dan menyeleksi artikel sebelum memasukkannya ke perpustakaan.
                                    </p>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <button 
                                            onClick={triggerImportRis}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                            Upload File RIS
                                        </button>
                                        
                                        {risSearchResults && (
                                            <button 
                                                onClick={() => setRisSearchResults(null)}
                                                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
                                            >
                                                Bersihkan Preview
                                            </button>
                                        )}
                                    </div>

                                    {/* PREVIEW AREA */}
                                    {risSearchResults && (
                                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-3">
                                                <h5 className="font-bold text-gray-800 text-sm">Preview Hasil Impor ({risSearchResults.length} Item):</h5>
                                                <div className="flex items-center gap-2">
                                                    {/* --- TOMBOL BARU: BULK ADD --- */}
                                                    <button 
                                                        onClick={handleAddAllRisToLibrary}
                                                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm flex items-center gap-1 animate-pulse"
                                                        title="Masukkan semua item di preview ini ke Perpustakaan Proyek"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                            <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"/>
                                                            <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"/>
                                                        </svg>
                                                        Tambahkan Semua ({risSearchResults.length})
                                                    </button>
                                                    {/* ----------------------------- */}
                                                    <span className="text-[10px] text-gray-500 bg-white px-2 py-1 rounded border">Mode Seleksi</span>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                                {risSearchResults.map((paper, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col items-start gap-2 shadow-sm">
                                                        <div className="w-full flex justify-between items-start">
                                                            <div>
                                                                <p className="font-semibold text-gray-800 text-sm">{paper.title || 'Tanpa Judul'}</p>
                                                                <p className="text-xs text-gray-600">
                                                                    {paper.author || 'Anonim'} ({paper.year || 'N/A'})
                                                                </p>
                                                                <p className="text-xs italic text-gray-500">
                                                                    {paper.journal || paper.publisher || ''}
                                                                </p>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    // Gunakan ID dari RIS atau generate baru jika tidak ada (untuk konsistensi)
                                                                    // AI Review mungkin belum ada jika user belum klik, kirim null
                                                                    const review = aiReviews[paper.id]; 
                                                                    handleAddReferenceFromSearch(paper, review);
                                                                }}
                                                                className="ml-4 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded-lg flex-shrink-0 shadow-sm"
                                                                title="Simpan ke Perpustakaan"
                                                            >
                                                                + Tambah
                                                            </button>
                                                        </div>

                                                        {/* Preview Abstrak & AI Review */}
                                                        <div className="mt-2 w-full pt-2 border-t border-gray-100 flex gap-3 items-center">
                                                            <button onClick={() => toggleAbstract(paper.id)} className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
                                                                {expandedAbstractId === paper.id ? 'Tutup Abstrak' : 'Baca Abstrak'}
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => addReviewTask({ paper: paper, context: projectData.topikTema || '' })} 
                                                                className={`text-xs font-semibold flex items-center gap-1 ${!isPremium ? 'text-gray-400 cursor-not-allowed' : 'text-purple-600 hover:underline'}`}
                                                                disabled={!isPremium || reviewingId === paper.id}
                                                                title={!isPremium ? "Fitur Premium" : "Analisis relevansi dengan AI"}
                                                            >
                                                                {reviewingId === paper.id ? 'Mereview...' : '✨ Review AI'}
                                                            </button>
                                                        </div>

                                                        {/* Konten Abstrak */}
                                                        {expandedAbstractId === paper.id && (
                                                            <div className="mt-2 p-2 bg-gray-50 rounded border text-xs text-gray-700 max-h-40 overflow-y-auto leading-relaxed">
                                                                {paper.abstract || "Abstrak tidak tersedia."}
                                                            </div>
                                                        )}

                                                        {/* Hasil Review AI */}
                                                        {aiReviews[paper.id] && (
                                                            <div className={`mt-2 p-2 border-l-4 rounded-r text-xs ${getRelevanceStyles(aiReviews[paper.id].kategori_relevansi).container}`}>
                                                                <div className="flex justify-between font-bold mb-1">
                                                                    <span className={getRelevanceStyles(aiReviews[paper.id].kategori_relevansi).header}>Analisis AI:</span>
                                                                    <span className={`px-1.5 rounded-full ${getRelevanceStyles(aiReviews[paper.id].kategori_relevansi).badge}`}>{aiReviews[paper.id].kategori_relevansi}</span>
                                                                </div>
                                                                <p className="text-gray-700">{aiReviews[paper.id].relevansi}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Metode 4: Pencarian Berbasis Konsep (Yang Hilang) */}
                <div className="border border-gray-200 rounded-lg">
                    <button 
                        onClick={() => toggleMethod('method5')} 
                        className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 rounded-lg ${openMethod === 'method5' ? 'bg-teal-100' : 'bg-teal-50 hover:bg-teal-100'}`}
                    >
                        <span className="font-semibold text-gray-800">Metode 4: Pencarian Konsep / Peraturan <span className="text-xs bg-yellow-200 text-yellow-800 rounded-full px-2 py-1 ml-2">Eksperimental</span></span>
                        <ChevronDownIcon isOpen={openMethod === 'method5'} />
                    </button>
                    {openMethod === 'method5' && (
                        <div className="p-4 border-t border-gray-200 animate-fade-in">
                       <div className="mb-4">
                           <p className="text-sm font-semibold text-gray-700 mb-2">Pilih jenis pencarian:</p>
                           <div className="flex gap-4">
                               <label className="flex items-center cursor-pointer">
                                   <input 
                                       type="radio" 
                                       name="conceptSearchMode" 
                                       value="concept" 
                                       checked={conceptSearchMode === 'concept'} 
                                       onChange={() => setConceptSearchMode('concept')}
                                       className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                                   />
                                   <span className="ml-2 text-sm text-gray-700">Konsep / Teori</span>
                               </label>
                               <label className="flex items-center cursor-pointer">
                                   <input 
                                       type="radio" 
                                       name="conceptSearchMode" 
                                       value="regulation" 
                                       checked={conceptSearchMode === 'regulation'} 
                                       onChange={() => setConceptSearchMode('regulation')}
                                       className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                                   />
                                   <span className="ml-2 text-sm text-gray-700">Peraturan Terkait</span>
                               </label>
                           </div>
                       </div>
                       <p className="text-sm text-gray-700 mb-4">
                           {conceptSearchMode === 'concept' 
                               ? 'Masukkan sebuah konsep atau teori (misal: "Technology Acceptance Model"). AI akan mencari referensi fundamental dan kutipan kuncinya.'
                               : 'Masukkan topik atau kata kunci peraturan (misal: "perlindungan data pribadi"). AI akan menggunakan Google Search untuk mencari peraturan terkait dan menganalisis relevansinya.'
                           }
                       </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text"
                                    value={conceptQuery}
                                    onChange={(e) => setConceptQuery(e.target.value)}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                    placeholder={conceptSearchMode === 'concept' ? "Masukkan konsep atau teori..." : "Masukkan topik peraturan..."}
                                />
                                <button 
                                    type="button"
                                    onClick={conceptSearchMode === 'concept' ? handleConceptSearch : () => handleRegulationSearch(conceptQuery)}
                                    className={`font-bold py-2 px-4 rounded-lg whitespace-nowrap ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                                    disabled={!isPremium || (conceptSearchMode === 'concept' ? isConceptSearching : isRegulationSearching) || !conceptQuery}
                                    title={!isPremium ? "Fitur Premium" : ""}
                                >
                                    {!isPremium ? '🔒 Premium' : ((conceptSearchMode === 'concept' ? isConceptSearching : isRegulationSearching) ? 'Mencari...' : (conceptSearchMode === 'concept' ? 'Cari Konsep' : 'Cari Peraturan'))}
                                </button>
                            </div>
                            {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk menggunakan pencarian cerdas berbasis konsep & peraturan.</p>}

                {isRegulationSearching && regulationSearchResults === null && (
                    <div className="mt-6 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <p className="ml-3 text-gray-600">AI sedang mencari peraturan...</p>
                    </div>
                )}

                {conceptSearchMode === 'regulation' && regulationSearchResults && Array.isArray(regulationSearchResults) && (
                    <div className="mt-6">
                        <h5 className="font-bold text-gray-800 mb-2">Hasil Pencarian Peraturan ({regulationSearchResults.length}):</h5>
                        {regulationSearchResults.length > 0 ? (
                            <div className="space-y-4 border-t pt-4 mt-4 border-teal-200 max-h-96 overflow-y-auto pr-2">
                                {regulationSearchResults.map((result, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <h6 className="font-semibold text-gray-800 flex-grow pr-2">{result.judul}</h6>
                                            <button 
                                                onClick={() => handleAddRegulationToReference(result)} 
                                                className="ml-4 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-2 rounded-lg flex-shrink-0"
                                                title="Tambah ke Perpustakaan Proyek"
                                            >
                                                + Tambah
                                            </button>
                                        </div>
                                        {result.url && (
                                            <a 
                                                href={result.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-xs text-blue-600 hover:underline break-all block mt-1"
                                            >
                                                {result.url}
                                            </a>
                                        )}
                                        <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-300 w-full">
                                            <p className="text-xs font-semibold text-yellow-800">Analisis Relevansi dari AI:</p>
                                            <p className="text-xs text-gray-700 italic">"{result.analisis_relevansi}"</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic mt-4 text-center">Tidak ada peraturan relevan yang ditemukan.</p>
                        )}
                    </div>
                )}

                            {isConceptSearching && conceptSearchResult === null && (
                                <div className="mt-6 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                                    <p className="ml-3 text-gray-600">AI sedang mencari konsep...</p>
                                </div>
                            )}

                            {conceptSearchResult && (
                                <div className="mt-6">
                                    <h5 className="font-bold text-gray-800 mb-2">Hasil Pencarian Konsep ({conceptSearchResult.length}):</h5>
                                    {conceptSearchResult.length > 0 ? (
                                        <div className="space-y-3 border-t pt-4 mt-4 border-teal-200">
                                            {conceptSearchResult.map(({ paper, kutipanKunci }, index) => (
                                                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                                    <div className="w-full flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{paper.title}</p>
                                                            <p className="text-xs text-gray-600">
                                                                {(paper.authors || []).map(a => a.name).join(', ')} ({paper.year || 'N/A'})
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleAddReferenceFromSearch(paper, null, kutipanKunci)}
                                                            className="ml-4 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-2 rounded-lg flex-shrink-0"
                                                            title="Tambah ke Perpustakaan Proyek"
                                                        >
                                                            + Tambah
                                                        </button>
                                                    </div>
                                                    <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300 w-full">
                                                        <p className="text-xs font-semibold text-yellow-800">Kutipan Kunci dari AI:</p>
                                                        <p className="text-xs text-gray-700 italic">"{kutipanKunci}"</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic mt-4 text-center">Tidak ada referensi fundamental yang ditemukan untuk konsep ini.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Metode 5: Cari via Scopus (Fitur Eksklusif) */}
                {projectData.showScopus && (
                    <div className="border border-orange-200 rounded-lg">
                        <button 
                            onClick={() => toggleMethod('methodScopus')} 
                            className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 rounded-lg ${openMethod === 'methodScopus' ? 'bg-orange-100' : 'bg-orange-50 hover:bg-orange-100'}`}
                        >
                            <span className="font-semibold text-orange-900 flex items-center gap-2">
                                Metode 5: Cari via Scopus 
                                <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full border border-orange-300 shadow-sm">FITUR EKSKLUSIF</span>
                            </span>
                            <ChevronDownIcon isOpen={openMethod === 'methodScopus'} />
                        </button>
                        {openMethod === 'methodScopus' && (
                            <div className="p-4 border-t border-orange-200 bg-white rounded-b-lg animate-fade-in">
                                
                                {/* --- UPDATE TAMPILAN SESUAI PERMINTAAN --- */}
                                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-orange-900 text-sm font-bold mb-2">
                                                Konfigurasi Akses Scopus
                                            </label>
                                            <div className="flex flex-col md:flex-row gap-2">
                                                <input
                                                    type="password"
                                                    value={scopusApiKey}
                                                    onChange={(e) => setScopusApiKey(e.target.value)}
                                                    className="flex-grow shadow-sm appearance-none border border-orange-300 rounded-lg py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    placeholder="Masukkan Scopus API Key Anda..."
                                                />
                                                <a 
                                                    href="https://venom-reference-converter.vercel.app/" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                                                    title="Buka Venom Reference Converter"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM4.5 9a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM4 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 1 0-1h4a.5.5 0 0 1 0 1h-4z"/>
                                                    </svg>
                                                    Venom Konverter
                                                </a>
                                            </div>
                                            <p className="text-xs text-orange-700 mt-2">
                                                *Hanya dapat diakses melalui jaringan internal pelanggan Scopus. Gunakan <strong>Venom Konverter</strong> untuk konversi referensi dari format ScopusAI ke format Bibliocobra.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Pencarian Literatur:</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input 
                                            type="text"
                                            value={searchQuery} 
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                            placeholder="Masukkan topik, judul, atau kueri boolean (TITLE-ABS-KEY)..."
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => handleSearchScopus(searchQuery)} 
                                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-orange-300 whitespace-nowrap" 
                                            disabled={isScopusSearching || !searchQuery}
                                        >
                                            {isScopusSearching ? 'Mencari...' : 'Cari Scopus'}
                                        </button>
                                    </div>
                                </div>
                                {/* --- AKHIR UPDATE TAMPILAN --- */}

                                {isScopusSearching && !scopusSearchResults && (
                                    <div className="mt-6 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                                        <p className="ml-3 text-gray-600">Menghubungi Scopus...</p>
                                    </div>
                                )}

                                {scopusSearchResults && (
                                    <div className="mt-6">
                                        <h5 className="font-bold text-gray-800 mb-2">Hasil Scopus ({scopusSearchResults.length}):</h5>
                                        {scopusSearchResults.length > 0 ? (
                                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border-t pt-4 mt-4 border-orange-200">
                                                {scopusSearchResults.map((paper, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col items-start gap-2">
                                                        <div className="w-full flex justify-between items-start">
                                                            <div>
                                                                <p className="font-semibold text-gray-800">{paper.title}</p>
                                                                <p className="text-xs text-gray-600">
                                                                    {paper.authors} ({paper.year})
                                                                </p>
                                                                <p className="text-xs text-gray-500 italic">
                                                                    {paper.journal.name}
                                                                </p>
                                                                {paper.externalIds.DOI && (
                                                                    <p className="text-xs text-blue-600 mt-1">DOI: {paper.externalIds.DOI}</p>
                                                                )}
                                                            </div>
                                                            <button 
                                                                onClick={() => handleAddReferenceFromSearch(paper, aiReviews[paper.paperId])}
                                                                className="ml-4 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-2 rounded-lg flex-shrink-0"
                                                                title="Tambah ke Perpustakaan"
                                                            >
                                                                + Tambah
                                                            </button>
                                                        </div>

                                                        {/* --- FITUR BARU: ABSTRAK & AI REVIEW (Scopus) --- */}
                                                        <div className="mt-2 w-full">
                                                            <div className="flex items-center gap-4">
                                                                <button onClick={() => toggleAbstract(paper.paperId)} className="text-xs text-blue-600 hover:underline font-semibold">
                                                                    {expandedAbstractId === paper.paperId ? 'Sembunyikan Abstrak' : 'Tampilkan Abstrak'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => addReviewTask({ paper: paper, context: searchQuery })} 
                                                                    className={`text-xs font-semibold ${!isPremium ? 'text-gray-400 cursor-not-allowed' : 'text-orange-600 hover:underline'}`}
                                                                    disabled={!isPremium || reviewingId === paper.paperId}
                                                                    title={!isPremium ? "Fitur Premium" : ""}
                                                                >
                                                                    {!isPremium ? '🔒 Review AI (Premium)' : (reviewingId === paper.paperId ? 'Mereview...' : '✨ Review AI')}
                                                                </button>
                                                            </div>
                                                            {expandedAbstractId === paper.paperId && (
                                                                <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-md border">
                                                                    {paper.abstract || "Abstrak tidak tersedia di metadata Scopus ini."}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Tampilan Hasil Review AI (Sama dengan Semantic Scholar) */}
                                                        {reviewingId === paper.paperId && !aiReviews[paper.paperId] && (
                                                            <div className="mt-3 flex items-center text-xs text-gray-500">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                                                                AI sedang mereview...
                                                            </div>
                                                        )}
                                                        {aiReviews[paper.paperId] && (
                                                            aiReviews[paper.paperId].error ? (
                                                                <div className="mt-3 p-3 border-l-4 rounded-r-lg bg-red-50 border-red-300 text-red-800 text-xs">
                                                                    <p className="font-bold">Gagal Mereview</p>
                                                                    <p>{aiReviews[paper.paperId].error}</p>
                                                                </div>
                                                            ) : (
                                                                <div className={`mt-3 p-3 border-l-4 rounded-r-lg ${getRelevanceStyles(aiReviews[paper.paperId].kategori_relevansi).container}`}>
                                                                    <div className="flex justify-between items-center">
                                                                        <h6 className={`text-sm font-bold ${getRelevanceStyles(aiReviews[paper.paperId].kategori_relevansi).header}`}>
                                                                            AI Review
                                                                        </h6>
                                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRelevanceStyles(aiReviews[paper.paperId].kategori_relevansi).badge}`}>
                                                                            {aiReviews[paper.paperId].kategori_relevansi}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-2 text-xs text-gray-700 space-y-2">
                                                                        <div>
                                                                            <p className="font-semibold">Temuan Kunci:</p>
                                                                            <p className="italic">"{aiReviews[paper.paperId].finding}"</p>
                                                                        </div>
                                                                            <div>
                                                                            <p className="font-semibold">Analisis Relevansi:</p>
                                                                            <p>{aiReviews[paper.paperId].relevansi}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                        {/* --- AKHIR FITUR BARU --- */}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic mt-4 text-center">Tidak ada hasil ditemukan di Scopus.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>

            <div className="mt-10">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold text-gray-800">Perpustakaan Referensi Proyek ({projectData.allReferences.length})</h3>
                    <div className="flex gap-2">
                       {/* --- TOMBOL HAPUS BULK (Muncul jika ada yang dipilih) --- */}
                       {selectedLibraryIds.length > 0 && (
                           <button 
                               onClick={handleBulkDeleteLibrary} 
                               className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-lg animate-fade-in shadow-sm flex items-center gap-1"
                           >
                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                   <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                   <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                               </svg>
                               Hapus ({selectedLibraryIds.length})
                           </button>
                       )}
                       {/* ------------------------------------------------------- */}
                       <button onClick={triggerReferencesImport} className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded-lg">Impor JSON</button>
                       <button onClick={handleExportReferences} className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded-lg">Ekspor JSON</button>
                       {/* --- TOMBOL BARU: IMPOR/EKSPOR RIS (MENDELEY) --- */}
                       <div className="h-6 w-px bg-gray-300 mx-1"></div>
                       {/* Tombol Impor RIS dihapus agar pengguna menggunakan Metode 3 */}
                       <button onClick={handleExportRis} className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold py-1 px-3 rounded-lg flex items-center gap-1" title="Ekspor ke Mendeley/Zotero (.ris)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                            </svg>
                            Ekspor RIS
                       </button>
                       {/* ---------------------------------------------------- */}
                    </div>
                </div>
                {projectData.allReferences.length > 0 ? (
                    <>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 bg-gray-200 z-10">
                                    <tr>
                                        {/* --- CHECKBOX HEADER --- */}
                                        <th className="p-3 w-10 text-center border-b-2 border-gray-300">
                                            <input 
                                                type="checkbox" 
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                checked={projectData.allReferences.length > 0 && selectedLibraryIds.length === projectData.allReferences.length}
                                                onChange={handleSelectAllLibrary}
                                                title="Pilih Semua"
                                            />
                                        </th>
                                        {/* --- HEADER REFERENSI DENGAN SORTING --- */}
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300">
                                            <div className="flex flex-col gap-1">
                                                <span>Referensi</span>
                                                <div className="flex gap-2 text-[10px] font-normal select-none">
                                                    <button onClick={() => handleSort('title')} className={`hover:text-blue-600 transition-colors ${sortConfig.key === 'title' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : 'text-gray-500'}`}>
                                                        Judul {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleSort('author')} className={`hover:text-blue-600 transition-colors ${sortConfig.key === 'author' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : 'text-gray-500'}`}>
                                                        Penulis {sortConfig.key === 'author' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleSort('year')} className={`hover:text-blue-600 transition-colors ${sortConfig.key === 'year' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : 'text-gray-500'}`}>
                                                        Tahun {sortConfig.key === 'year' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                        {/* --- HEADER KUTIPAN DENGAN SORTING --- */}
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300">
                                            <div className="flex flex-col gap-1">
                                                <span>Kutipan / Catatan</span>
                                                <button onClick={() => handleSort('isiKutipan')} className={`text-[10px] font-normal text-left hover:text-blue-600 w-fit select-none transition-colors ${sortConfig.key === 'isiKutipan' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : 'text-gray-500'}`}>
                                                    Sort A-Z {sortConfig.key === 'isiKutipan' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </button>
                                            </div>
                                        </th>
                                        {/* --- UPDATE: HEADER CEK KUALITAS DENGAN SORTING --- */}
                                        <th className="p-3 text-center text-sm font-semibold text-gray-700 border-b-2 border-gray-300" style={{ width: '120px' }}>
                                            <div className="flex flex-col gap-1 items-center">
                                                <span>Cek Kualitas</span>
                                                <button onClick={() => handleSort('journal')} className={`text-[10px] font-normal hover:text-blue-600 select-none transition-colors ${sortConfig.key === 'journal' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : 'text-gray-500'}`}>
                                                    Sort Jurnal {sortConfig.key === 'journal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </button>
                                            </div>
                                        </th>
                                        {/* -------------------------------------------------- */}
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-300">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* --- GUNAKAN sortedReferences, BUKAN projectData.allReferences --- */}
                                    {sortedReferences.map((ref, index) => (
                                        <tr key={`${ref.id}-${index}`} className={`hover:bg-gray-50 ${selectedLibraryIds.includes(ref.id) ? 'bg-blue-50' : 'bg-white'}`}>
                                            {/* --- CHECKBOX ITEM --- */}
                                            <td className="p-3 border-b border-gray-200 text-center align-middle">
                                                <input 
                                                    type="checkbox" 
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                    checked={selectedLibraryIds.includes(ref.id)}
                                                    onChange={() => handleSelectLibraryItem(ref.id)}
                                                />
                                            </td>
                                            {/* --------------------- */}
                                            <td className="p-3 text-sm text-gray-700 border-b border-gray-200" style={{minWidth: '300px'}}>
                                                {/* --- UPDATE: Tampilkan Badge Sumber RIS di Tabel Utama --- */}
                                                <div className="flex items-start gap-2">
                                                    <p className="font-bold">{ref.title}</p>
                                                    {ref.source === 'external_ris' && (
                                                        <span className="flex-shrink-0 bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full border border-purple-200 font-bold h-fit mt-0.5" title="Impor dari File RIS">
                                                            RIS FILE
                                                        </span>
                                                    )}
                                                </div>
                                                {/* --------------------------------------------------------- */}
                                                <p className="text-xs">{ref.author} ({ref.year})</p>
                                                {/* Menampilkan nama jurnal agar user tahu apa yang dicek */}
                                                {ref.journal && (
                                                    <p className="text-xs italic text-gray-500 mt-1">
                                                        {(typeof ref.journal === 'object' && ref.journal !== null) ? ref.journal.name : ref.journal}
                                                    </p>
                                                )}
                                                {ref.doi && <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">DOI: {ref.doi}</a>}
                                            </td>
                                            <td className="p-3 text-sm text-gray-700 border-b border-gray-200">
                                                <p className="italic max-h-20 overflow-y-auto">{ref.isiKutipan || "Belum ada catatan."}</p>
                                            </td>
                                            {/* --- KOLOM BARU: CEK KUALITAS (JALAN PINTAS) --- */}
                                            <td className="p-3 text-sm text-gray-700 border-b border-gray-200 align-middle">
                                                {(() => {
                                                    const jName = (typeof ref.journal === 'object' && ref.journal !== null) ? ref.journal.name : ref.journal;
                                                    
                                                    if (!jName) {
                                                        return <span className="text-xs text-gray-400 italic text-center block">Nama jurnal<br/>tidak tersedia</span>;
                                                    }
                                                    
                                                    return (
                                                        <div className="flex flex-col gap-2">
                                                            <a 
                                                                href={`https://sinta.kemdiktisaintek.go.id/journals?q=${encodeURIComponent(jName)}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1.5 rounded border border-blue-200 text-center transition-colors flex items-center justify-center gap-1 group"
                                                                title="Cek Ranking SINTA (S1-S6)"
                                                            >
                                                                SINTA <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">↗</span>
                                                            </a>
                                                            <a 
                                                                href={`https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(jName)}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1.5 rounded border border-orange-200 text-center transition-colors flex items-center justify-center gap-1 group"
                                                                title="Cek Quartile SCImago (Q1-Q4)"
                                                            >
                                                                SCImago <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">↗</span>
                                                            </a>
                                                            {/* --- UPDATE: Tambahkan Link BRIN (Auto Search) --- */}
                                                            <a 
                                                                href={`https://reputasipublikasi.brin.go.id/?tahun=2025&option=judul&keyword=${encodeURIComponent(jName)}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2 py-1.5 rounded border border-red-200 text-center transition-colors flex items-center justify-center gap-1 group"
                                                                title="Cek Reputasi BRIN"
                                                            >
                                                                BRIN <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">↗</span>
                                                            </a>
                                                            {/* ----------------------------------- */}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            {/* --- AKHIR KOLOM BARU --- */}
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


// --- Komponen untuk Tab 5: Pendahuluan ---
const Pendahuluan = ({ 
    projectData, 
    setProjectData, 
    isLoading, 
    handleCopyToClipboard,
    handleGenerateFullPendahuluan,
    handleModifyText
}) => {
    // 1. Tambahkan State Lokal
    const [selectedRefIds, setSelectedRefIds] = useState([]);
    const isPremium = projectData.isPremium;

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Pendahuluan</h2>
            
            <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 mb-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Generator Pendahuluan</h3>
                <p className="text-sm text-blue-700 mb-4">Pilih referensi pendukung (data/fakta/studi terdahulu) untuk Latar Belakang, lalu klik tombol di bawah.</p>
                
                {/* 2. Pasang ReferenceSelector */}
                <ReferenceSelector 
                    projectData={projectData} 
                    selectedRefIds={selectedRefIds} 
                    setSelectedRefIds={setSelectedRefIds} 
                />

                {/* 3. Update onClick untuk mengirim selectedRefIds */}
                <button 
                    onClick={() => handleGenerateFullPendahuluan(selectedRefIds)}
                    className={`font-bold py-2 px-4 rounded-lg w-full ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                    disabled={isLoading || !isPremium}
                    title={!isPremium ? "Fitur Premium" : ""}
                >
                    {!isPremium ? '🔒 Tulis Draf Pendahuluan Lengkap (Premium)' : (isLoading ? 'Memproses...' : '✨ Tulis Draf Pendahuluan Lengkap')}
                </button>
                {!isPremium && <p className="text-xs text-red-500 mt-2 text-center">Upgrade ke Premium untuk menulis Bab 1 secara otomatis.</p>}
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
                <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf {isPremium ? '' : '(Premium Only)'}</h4>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => handleModifyText('shorten', 'pendahuluanDraft')}
                        disabled={isLoading || !projectData.pendahuluanDraft || !isPremium}
                        className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300'}`}
                    >
                        {!isPremium ? '🔒 Pendek' : 'Buat Versi Pendek'}
                    </button>
                    <button 
                        onClick={() => handleModifyText('medium', 'pendahuluanDraft')}
                        disabled={isLoading || !projectData.pendahuluanDraft || !isPremium}
                        className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'}`}
                    >
                        {!isPremium ? '🔒 Sedang' : 'Buat Versi Sedang'}
                    </button>
                    <button 
                        onClick={() => handleModifyText('lengthen', 'pendahuluanDraft')}
                        disabled={isLoading || !projectData.pendahuluanDraft || !isPremium}
                        className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300'}`}
                    >
                        {!isPremium ? '🔒 Panjang' : 'Buat Versi Panjang'}
                    </button>
                </div>
                {/* --- TOMBOL BARU DITAMBAHKAN DI SINI --- */}
                <button 
                    onClick={() => handleModifyText('humanize', 'pendahuluanDraft')}
                    disabled={isLoading || !projectData.pendahuluanDraft || !isPremium}
                    className={`mt-2 text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'}`}
                >
                    {!isPremium ? '🔒 Parafrasa (Premium)' : 'Parafrasa (Humanisasi)'}
                </button>
                {/* --- AKHIR TOMBOL BARU --- */}
            </div>
        </div>
    );
};

// --- Komponen untuk Tab 6: Metode Penelitian ---
const MetodePenelitian = ({ projectData, setProjectData, handleGenerateMetode, isLoading, handleCopyToClipboard, handleModifyText }) => {
    const [selectedRefIds, setSelectedRefIds] = useState([]);
    const isPremium = projectData.isPremium;

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Metode Penelitian</h2>
            <p className="text-gray-700 mb-4">Pilih referensi metodologi (buku/jurnal) untuk menjadi landasan bab ini.</p>
            
            <ReferenceSelector 
                projectData={projectData} 
                selectedRefIds={selectedRefIds} 
                setSelectedRefIds={setSelectedRefIds} 
            />

            <button 
                onClick={() => handleGenerateMetode(selectedRefIds)} 
                className={`font-bold py-2 px-4 rounded-lg w-full ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                disabled={isLoading || !projectData.judulKTI || !isPremium}
            >
                {!isPremium ? '🔒 Tulis Draf Bab Metode (Premium)' : (isLoading ? 'Memproses...' : '✨ Tulis Draf Bab Metode')}
            </button>
            {!isPremium && <p className="text-xs text-red-500 mt-2 text-center">Upgrade ke Premium untuk menulis Bab 3 secara otomatis.</p>}

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
                        <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf {isPremium ? '' : '(Premium Only)'}</h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleModifyText('shorten', 'metodeDraft')}
                                disabled={isLoading || !projectData.metodeDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300'}`}
                            >
                                {!isPremium ? '🔒 Pendek' : 'Buat Versi Pendek'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('medium', 'metodeDraft')}
                                disabled={isLoading || !projectData.metodeDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'}`}
                            >
                                {!isPremium ? '🔒 Sedang' : 'Buat Versi Sedang'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('lengthen', 'metodeDraft')}
                                disabled={isLoading || !projectData.metodeDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300'}`}
                            >
                                {!isPremium ? '🔒 Panjang' : 'Buat Versi Panjang'}
                            </button>
                        </div>
                        {/* --- TOMBOL BARU DITAMBAHKAN DI SINI --- */}
                        <button 
                            onClick={() => handleModifyText('humanize', 'metodeDraft')}
                            disabled={isLoading || !projectData.metodeDraft || !isPremium}
                            className={`mt-2 text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'}`}
                        >
                            {!isPremium ? '🔒 Parafrasa (Premium)' : 'Parafrasa (Humanisasi)'}
                        </button>
                        {/* --- AKHIR TOMBOL BARU --- */}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Tab 7: Studi Literatur ---
const StudiLiteratur = ({ 
    projectData, 
    setProjectData, 
    handleGenerateStudiLiteratur, 
    isLoading, 
    handleCopyToClipboard, 
    handleModifyText,
    handleClassifyTheories 
}) => {
    const [selectedRefIds, setSelectedRefIds] = useState([]);
    const isPremium = projectData.isPremium;

    // --- FUNGSI BARU: Pindahkan Teori Antar Kategori ---
    const handleMoveTheory = (item, fromCategory, toCategory) => {
        const newClassification = { ...projectData.theoryClassification };
        
        // 1. Hapus dari kategori asal
        newClassification[fromCategory] = newClassification[fromCategory].filter(t => t.id !== item.id);
        
        // 2. Tambahkan ke kategori tujuan (dengan reason default jika dipindah manual)
        const itemMoved = { ...item, reason: "Dipindahkan secara manual oleh pengguna." };
        newClassification[toCategory] = [...(newClassification[toCategory] || []), itemMoved];

        // 3. Simpan state
        setProjectData(p => ({ ...p, theoryClassification: newClassification }));
    };

    // Helper untuk merender Kartu Teori
    const renderTheoryCard = (item, category, colorClass) => (
        <div key={item.id} className="bg-white p-3 rounded border shadow-sm mb-2 text-left group hover:shadow-md transition-all">
            <p className="font-bold text-gray-800 text-xs mb-1">{item.title}</p>
            <p className="text-[10px] text-gray-500 italic leading-tight mb-2">{item.reason}</p>
            
            {/* Kontrol Pemindahan */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 opacity-50 group-hover:opacity-100 transition-opacity">
                {category !== 'grand' && (
                    <button 
                        onClick={() => handleMoveTheory(item, category, category === 'applied' ? 'middle' : 'grand')}
                        className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1"
                        title="Naik Level"
                    >
                        ← Naik
                    </button>
                )}
                {category !== 'applied' && (
                    <button 
                        onClick={() => handleMoveTheory(item, category, category === 'grand' ? 'middle' : 'applied')}
                        className={`text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1 ${category === 'grand' ? 'ml-auto' : ''}`}
                        title="Turun Level"
                    >
                        Turun →
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Studi Literatur</h2>
            <p className="text-gray-700 mb-4">Pilih referensi Grand Theory atau Konsep Utama yang ingin dibahas dalam Tinjauan Pustaka.</p>
            
            <ReferenceSelector 
                projectData={projectData} 
                selectedRefIds={selectedRefIds} 
                setSelectedRefIds={setSelectedRefIds} 
            />

            {/* --- AREA KLASIFIKASI TEORI (UI TAHAP 2) --- */}
            <div className="mb-6 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50 p-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="font-bold text-indigo-900 text-lg">Peta Struktur Teori (Bab II)</h3>
                        <p className="text-xs text-indigo-700">Gunakan AI untuk memilah referensi menjadi struktur hierarkis.</p>
                    </div>
                    <button 
                        onClick={() => handleClassifyTheories(selectedRefIds)} 
                        className={`font-bold py-2 px-4 rounded-lg text-xs shadow-sm flex items-center gap-2 ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300'}`}
                        disabled={isLoading || selectedRefIds.length === 0 || !isPremium}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Sedang Memilah...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                                {!projectData.theoryClassification ? "Klasifikasikan Referensi Terpilih" : "Klasifikasi Ulang"}
                            </>
                        )}
                    </button>
                </div>

                {/* VISUALISASI 3 KOLOM */}
                {projectData.theoryClassification ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                        {/* KOLOM 1: GRAND THEORY */}
                        <div className="bg-blue-100 rounded-lg p-3 border border-blue-200 flex flex-col">
                            <div className="mb-3 text-center border-b border-blue-200 pb-2">
                                <span className="font-bold text-blue-900 block text-sm">GRAND THEORY</span>
                                <span className="text-[10px] text-blue-700 block">(Payung/Induk)</span>
                            </div>
                            <div className="flex-grow min-h-[100px]">
                                {projectData.theoryClassification.grand?.length > 0 ? (
                                    projectData.theoryClassification.grand.map(item => renderTheoryCard(item, 'grand'))
                                ) : (
                                    <div className="text-center text-blue-400 text-xs italic py-4 border-2 border-dashed border-blue-200 rounded">Kosong</div>
                                )}
                            </div>
                        </div>

                        {/* KOLOM 2: MIDDLE-RANGE */}
                        <div className="bg-teal-100 rounded-lg p-3 border border-teal-200 flex flex-col">
                            <div className="mb-3 text-center border-b border-teal-200 pb-2">
                                <span className="font-bold text-teal-900 block text-sm">MIDDLE-RANGE THEORY</span>
                                <span className="text-[10px] text-teal-700 block">(Penghubung/Variabel)</span>
                            </div>
                            <div className="flex-grow min-h-[100px]">
                                {projectData.theoryClassification.middle?.length > 0 ? (
                                    projectData.theoryClassification.middle.map(item => renderTheoryCard(item, 'middle'))
                                ) : (
                                    <div className="text-center text-teal-400 text-xs italic py-4 border-2 border-dashed border-teal-200 rounded">Kosong</div>
                                )}
                            </div>
                        </div>

                        {/* KOLOM 3: APPLIED THEORY */}
                        <div className="bg-orange-100 rounded-lg p-3 border border-orange-200 flex flex-col">
                            <div className="mb-3 text-center border-b border-orange-200 pb-2">
                                <span className="font-bold text-orange-900 block text-sm">APPLIED THEORY</span>
                                <span className="text-[10px] text-orange-700 block">(Operasional/Indikator)</span>
                            </div>
                            <div className="flex-grow min-h-[100px]">
                                {projectData.theoryClassification.applied?.length > 0 ? (
                                    projectData.theoryClassification.applied.map(item => renderTheoryCard(item, 'applied'))
                                ) : (
                                    <div className="text-center text-orange-400 text-xs italic py-4 border-2 border-dashed border-orange-200 rounded">Kosong</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-indigo-400 border-2 border-dashed border-indigo-200 rounded-lg bg-white/50">
                        <p className="text-sm italic">Belum ada peta teori. Pilih referensi di atas lalu klik tombol klasifikasi.</p>
                    </div>
                )}
            </div>
            {/* ------------------------------------------- */}

            <button 
                onClick={() => handleGenerateStudiLiteratur(selectedRefIds)} 
                className={`font-bold py-2 px-4 rounded-lg w-full ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                disabled={isLoading || projectData.allReferences.length === 0 || !isPremium}
            >
                {!isPremium ? '🔒 Tulis Draf Studi Literatur (Premium)' : (isLoading ? 'Memproses...' : '✨ Tulis Draf Studi Literatur')}
            </button>
            {!isPremium && <p className="text-xs text-red-500 mt-2 text-center">Upgrade ke Premium untuk menulis Bab 2 secara otomatis.</p>}

            {isLoading && !projectData.studiLiteraturDraft && !projectData.theoryClassification && (
                <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">AI sedang bekerja...</p>
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
                        <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf {isPremium ? '' : '(Premium Only)'}</h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleModifyText('shorten', 'studiLiteraturDraft')}
                                disabled={isLoading || !projectData.studiLiteraturDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300'}`}
                            >
                                {!isPremium ? '🔒 Pendek' : 'Buat Versi Pendek'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('medium', 'studiLiteraturDraft')}
                                disabled={isLoading || !projectData.studiLiteraturDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'}`}
                            >
                                {!isPremium ? '🔒 Sedang' : 'Buat Versi Sedang'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('lengthen', 'studiLiteraturDraft')}
                                disabled={isLoading || !projectData.studiLiteraturDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300'}`}
                            >
                                {!isPremium ? '🔒 Panjang' : 'Buat Versi Panjang'}
                            </button>
                        </div>
                        {/* --- TOMBOL BARU DITAMBAHKAN DI SINI --- */}
                        <button 
                            onClick={() => handleModifyText('humanize', 'studiLiteraturDraft')}
                            disabled={isLoading || !projectData.studiLiteraturDraft || !isPremium}
                            className={`mt-2 text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'}`}
                        >
                            {!isPremium ? '🔒 Parafrasa (Premium)' : 'Parafrasa (Humanisasi)'}
                        </button>
                        {/* --- AKHIR TOMBOL BARU --- */}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Hasil & Pembahasan ---
const HasilPembahasan = ({ projectData, setProjectData, handleGenerateHasilPembahasan, isLoading, handleCopyToClipboard, handleModifyText, geminiApiKey, showInfoModal }) => {
    const [selectedRefIds, setSelectedRefIds] = useState([]); 
    const isPremium = projectData.isPremium;

    const availableDrafts = [
        { key: 'analisisKuantitatifDraft', name: 'Analisis Kuantitatif' },
        { key: 'analisisKualitatifDraft', name: 'Analisis Kualitatif' },
        { key: 'analisisVisualDraft', name: 'Analisis Visual' },
    ];

    const readyDrafts = availableDrafts.filter(d => projectData[d.key] && projectData[d.key].trim() !== '');
    const isReady = readyDrafts.length > 0;

    const isSLR = projectData.metode && (
        projectData.metode.toLowerCase().includes('slr') ||
        projectData.metode.toLowerCase().includes('systematic literature review') ||
        projectData.metode.toLowerCase().includes('bibliometric')
    );
    
    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Hasil & Pembahasan</h2>
            
            {isSLR ? (
                <div className="mb-6 p-4 bg-teal-50 border-l-4 border-teal-400 rounded-lg">
                    <h3 className="text-lg font-semibold text-teal-800 mb-3">Integrasi Alur Kerja SLR</h3>
                    <p className="text-sm text-gray-700">
                        Untuk riset SLR/Bibliometrik, draf <strong>Hasil & Pembahasan</strong> Anda dibuat dari modul <strong>'Ekstraksi & Sintesis Data'</strong>.
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                        Silakan buka tab tersebut, isi tabel sintesis, lalu klik tombol '✨ Tulis Draf Sintesis Naratif'. Draf yang dihasilkan akan otomatis muncul di kotak teks di bawah ini.
                    </p>
                </div>
            ) : (
                <>
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

                    {/* --- TAMBAHKAN BAGIAN INI --- */}
                    <p className="text-sm text-gray-700 mb-2 font-bold">Pilih Referensi untuk Pembahasan (Comparison/Support):</p>
                    <ReferenceSelector 
                        projectData={projectData} 
                        selectedRefIds={selectedRefIds} 
                        setSelectedRefIds={setSelectedRefIds} 
                    />
                    {/* ---------------------------- */}

                    <button 
                        onClick={() => handleGenerateHasilPembahasan(selectedRefIds)} 
                        className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                        disabled={isLoading || !isReady || !isPremium}
                    >
                        {!isPremium ? '🔒 Tulis Draf Pembahasan (Premium)' : (isLoading ? 'Memproses...' : '✨ Tulis Draf Bab Hasil & Pembahasan')}
                    </button>
                    {!isReady && <p className="text-xs text-red-600 mt-2">Tombol dinonaktifkan karena belum ada draf analisis yang disimpan.</p>}
                    {!isPremium && <p className="text-xs text-red-500 mt-1">Upgrade ke Premium untuk menyintesis hasil analisis secara otomatis.</p>}
                </>
            )}


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
                        rows="20"
                    ></textarea>
                    {/* Fitur Modifikasi Teks */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf {isPremium ? '' : '(Premium Only)'}</h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleModifyText('shorten', 'hasilPembahasanDraft')}
                                disabled={isLoading || !projectData.hasilPembahasanDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300'}`}
                            >
                                {!isPremium ? '🔒 Pendek' : 'Buat Versi Pendek'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('medium', 'hasilPembahasanDraft')}
                                disabled={isLoading || !projectData.hasilPembahasanDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'}`}
                            >
                                {!isPremium ? '🔒 Sedang' : 'Buat Versi Sedang'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('lengthen', 'hasilPembahasanDraft')}
                                disabled={isLoading || !projectData.hasilPembahasanDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300'}`}
                            >
                                {!isPremium ? '🔒 Panjang' : 'Buat Versi Panjang'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('humanize', 'hasilPembahasanDraft')}
                                disabled={isLoading || !projectData.hasilPembahasanDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'}`}
                            >
                                {!isPremium ? '🔒 Parafrasa (Premium)' : 'Parafrasa (Humanisasi)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Komponen untuk Instrumen: Generator Variabel ---
const GeneratorVariabel = ({ projectData, setProjectData, handleGenerateVariabel, isLoading, showInfoModal, handleCopyToClipboard }) => {
    // Variabel tetap GRATIS, jadi tidak ada perubahan di sini
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
    <div key={index} className="flex items-start gap-2 mb-4">
        <textarea 
            value={v} 
            onChange={e => handleEditBebas(index, e.target.value)} 
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 resize-y" // resize-y agar bisa ditarik
            rows="2"
        />
        <div className="flex flex-col gap-2">
            <button 
                onClick={() => handleCopyToClipboard(v)} 
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center h-10 w-10"
                title="Salin"
            >
                <CopyIcon />
            </button>
            <button 
                onClick={() => handleRemoveBebas(index)} 
                className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-lg text-sm flex items-center justify-center h-10 w-10"
                title="Hapus"
            >
                X
            </button>
        </div>
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
const GeneratorHipotesis = ({ projectData, setProjectData, handleGenerateHipotesis, isLoading, showInfoModal, handleCopyToClipboard }) => {
    const [editingHypotheses, setEditingHypotheses] = useState(null);
    const isPremium = projectData.isPremium;

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
            
            <button 
                onClick={handleGenerateHipotesis} 
                className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                disabled={isLoading || !isPremium}
                title={!isPremium ? "Fitur Premium" : ""}
            >
                {!isPremium ? '🔒 Hasilkan Hipotesis (Premium)' : (isLoading ? 'Memproses...' : '✨ Hasilkan Hipotesis')}
            </button>
            {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk menggunakan generator hipotesis otomatis.</p>}

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
                                    <div className="mb-4">
    <label className="block text-gray-700 text-sm font-bold mb-1">Hipotesis Alternatif (H{index + 1}):</label>
    <div className="flex items-start gap-2">
        <textarea 
            value={hypo.h1} 
            onChange={e => handleEdit(index, 'h1', e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 resize-y"
            rows="2"
        />
        <button 
            onClick={() => handleCopyToClipboard(hypo.h1)} 
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg h-10 w-10 flex items-center justify-center flex-shrink-0"
            title="Salin"
        >
            <CopyIcon />
        </button>
    </div>
</div>
<div>
    <label className="block text-gray-700 text-sm font-bold mb-1">Hipotesis Nol (H{index + 1}o):</label>
    <div className="flex items-start gap-2">
        <textarea 
            value={hypo.h0} 
            onChange={e => handleEdit(index, 'h0', e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 resize-y"
            rows="2"
        />
        <button 
            onClick={() => handleCopyToClipboard(hypo.h0)} 
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg h-10 w-10 flex items-center justify-center flex-shrink-0"
            title="Salin"
        >
            <CopyIcon />
        </button>
    </div>
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
const GeneratorKuesioner = ({ projectData, setProjectData, handleGenerateKuesioner, isLoading, showInfoModal, handleCopyToClipboard }) => {
    const [editingKuesioner, setEditingKuesioner] = useState(null);
    const isPremium = projectData.isPremium;

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
            
            <button 
                onClick={handleGenerateKuesioner} 
                className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                disabled={isLoading || !isPremium}
                title={!isPremium ? "Fitur Premium" : ""}
            >
                {!isPremium ? '🔒 Hasilkan Draf Kuesioner (Premium)' : (isLoading ? 'Memproses...' : '✨ Hasilkan Draf Kuesioner')}
            </button>
            {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk menggunakan generator kuesioner otomatis.</p>}

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
    <div key={itemIndex} className="flex items-start gap-2 mb-3">
        <textarea 
            value={item} 
            onChange={e => handleItemChange(varIndex, itemIndex, e.target.value)}
            className="shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 resize-y"
            rows="2"
        />
        <div className="flex flex-col gap-2 flex-shrink-0">
            <button 
                onClick={() => handleCopyToClipboard(item)} 
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg h-10 w-10 flex items-center justify-center"
                title="Salin"
            >
                <CopyIcon />
            </button>
            <button 
                onClick={() => handleRemoveItem(varIndex, itemIndex)} 
                className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-lg h-10 w-10 flex items-center justify-center text-sm"
                title="Hapus"
            >
                X
            </button>
        </div>
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
const GeneratorWawancara = ({ projectData, setProjectData, handleGenerateWawancara, isLoading, showInfoModal, handleCopyToClipboard }) => {
    const [editingWawancara, setEditingWawancara] = useState(null);
    const isPremium = projectData.isPremium;

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
            
            <button 
                onClick={handleGenerateWawancara} 
                className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                disabled={isLoading || !isPremium}
                title={!isPremium ? "Fitur Premium" : ""}
            >
                {!isPremium ? '🔒 Hasilkan Draf Panduan (Premium)' : (isLoading ? 'Memproses...' : '✨ Hasilkan Draf Panduan Wawancara')}
            </button>
            {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk menggunakan generator panduan wawancara otomatis.</p>}

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
    <div key={qIndex} className="flex items-start gap-2 mb-3">
        <textarea 
            value={item} 
            onChange={e => handleQuestionChange(catIndex, qIndex, e.target.value)}
            className="shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 resize-y" // resize-y agar bisa ditarik
            rows="3"
        />
        <div className="flex flex-col gap-2 flex-shrink-0">
            <button 
                onClick={() => handleCopyToClipboard(item)} 
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg h-10 w-10 flex items-center justify-center"
                title="Salin"
            >
                <CopyIcon />
            </button>
            <button 
                onClick={() => handleRemoveQuestion(catIndex, qIndex)} 
                className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-lg h-10 w-10 flex items-center justify-center text-sm"
                title="Hapus"
            >
                X
            </button>
        </div>
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
    setIncludeIndonesianQuery,
    // Props baru untuk PICOS
    handleGenerateQueriesFromPicos,
    geminiApiKeys, // UPDATE: Changed from geminiApiKey to geminiApiKeys
    handleInputChange // Tambahkan prop ini
}) => {
    // State management
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [logEntry, setLogEntry] = useState({
        resultsCount: '',
        searchDate: new Date().toISOString().slice(0, 10)
    });
    const [editingLog, setEditingLog] = useState(null);
    const today = new Date().toISOString().slice(0, 10);
    const isPremium = projectData.isPremium;

    // State baru untuk PICOS
   
    const [isPicosLoading, setIsPicosLoading] = useState(false);

    const handlePicosChange = (e) => {
        const { name, value } = e.target;
        setProjectData(prev => ({
            ...prev,
            picos: {
                ...prev.picos,
                [name]: value
            }
        }));
    };

    const handleAiFillPicos = async () => {
        // Cek prasyarat: AI butuh konteks dari topik atau judul
        if (!projectData.topikTema && !projectData.judulKTI) {
            showInfoModal("Harap isi 'Topik atau Tema' di tab 'Ide KTI' terlebih dahulu agar AI memiliki konteks.");
            return;
        }

        setIsPicosLoading(true); // Mulai proses loading

        const context = projectData.topikTema || projectData.judulKTI;

        // UPDATE: Instruksi bahasa diubah ke Indonesian (Bahasa Indonesia)
        const prompt = `You are an expert research assistant. Based on the following research topic, break it down into the PICOS components (Population/Problem, Intervention, Comparison, Outcome, Study Design). Provide concise and relevant answers in Indonesian (Bahasa Indonesia).

Research Topic: "${context}"

Provide the answer ONLY in a strict JSON format. If a component is not relevant (e.g., Comparison), leave the string empty.`;

        // Skema ini 'memaksa' AI untuk memberikan output JSON yang kita inginkan
        const schema = {
            type: "OBJECT",
            properties: {
                population: { type: "STRING" },
                intervention: { type: "STRING" },
                comparison: { type: "STRING" },
                outcome: { type: "STRING" },
                studyDesign: { type: "STRING" }
            },
            required: ["population", "intervention", "comparison", "outcome", "studyDesign"]
        };

        try {
            // Panggil service AI dengan prompt dan skema
            const result = await geminiService.run(prompt, geminiApiKeys, { schema }); // UPDATE: Use geminiApiKeys
            
            // Isi hasil dari AI ke dalam state picos utama
            setProjectData(p => ({
                ...p,
                picos: result
            }));
            
            showInfoModal("PICOS berhasil diisi oleh AI! Silakan tinjau dan sesuaikan.");

        } catch (error) {
            showInfoModal(`Gagal mengisi PICOS dengan AI: ${error.message}`);
        } finally {
            setIsPicosLoading(false); // Selesaikan proses loading
        }
    };

    // Handler: Buka modal log
    const handleOpenLogModal = () => {
        if (!lastCopiedQuery.query) {
            showInfoModal("Silakan salin sebuah kueri terlebih dahulu untuk dicatat ke dalam log.");
            return;
        }
        setLogEntry({ resultsCount: '', searchDate: today });
        setIsLogModalOpen(true);
    };

    // Handler: Buka modal edit
    const handleOpenEditModal = (log) => {
        setEditingLog({
            ...log,
            resultsCount: String(log.resultsCount)
        });
        setIsEditModalOpen(true);
    };

    // Simpan log baru
    const handleSaveLog = () => {
        const { resultsCount, searchDate } = logEntry;
        const count = parseInt(resultsCount, 10);

        if (!resultsCount || isNaN(count) || count < 0) {
            showInfoModal("Jumlah dokumen harus berupa angka positif.");
            return;
        }
        if (!searchDate) {
            showInfoModal("Tanggal penelusuran wajib diisi.");
            return;
        }

        const newLog = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            query: lastCopiedQuery.query,
            database: projectData.queryGeneratorTargetDB,
            resultsCount: count,
            searchDate
        };

        setProjectData(p => ({
            ...p,
            searchLog: [...p.searchLog, newLog]
        }));

        setIsLogModalOpen(false);
        setLogEntry({ resultsCount: '', searchDate: today });
    };

    // Simpan perubahan edit
    const handleUpdateLog = () => {
        const { resultsCount, query, searchDate } = editingLog;
        const count = parseInt(resultsCount, 10);

        if (!resultsCount || isNaN(count) || count < 0) {
            showInfoModal("Jumlah dokumen harus angka positif.");
            return;
        }
        if (!query.trim()) {
            showInfoModal("Kueri tidak boleh kosong.");
            return;
        }
        if (!searchDate) {
            showInfoModal("Tanggal penelusuran wajib diisi.");
            return;
        }

        setProjectData(p => ({
            ...p,
            searchLog: p.searchLog.map(log =>
                log.id === editingLog.id
                    ? { ...editingLog, resultsCount: count }
                    : log
            )
        }));

        setIsEditModalOpen(false);
        setEditingLog(null);
    };

    // Format tanggal DD/MM/YYYY
    const formatDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    // Sort log: terbaru dulu
    const sortedLogs = [...projectData.searchLog].sort(
        (a, b) => new Date(b.searchDate) - new Date(a.searchDate)
    );

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            {/* Modal Tambah Log */}
            {isLogModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Tambah Entri Log Penelusuran</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Kueri:</label>
                                <p className="text-sm bg-gray-100 p-2 rounded-md font-mono break-words">
                                    {lastCopiedQuery.query}
                                </p>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Database:</label>
                                <p className="text-sm bg-gray-100 p-2 rounded-md">
                                    {projectData.queryGeneratorTargetDB}
                                </p>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Jumlah Dokumen Ditemukan:</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={logEntry.resultsCount} 
                                    onChange={e => setLogEntry({...logEntry, resultsCount: e.target.value})} 
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" 
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal Penelusuran:</label>
                                <input 
                                    type="date" 
                                    value={logEntry.searchDate} 
                                    onChange={e => setLogEntry({...logEntry, searchDate: e.target.value})} 
                                    max={today}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" 
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsLogModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleSaveLog} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan Log</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Log */}
            {isEditModalOpen && editingLog && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <h3 className="text-xl font-semibold mb-1 text-gray-800">Edit Entri Log Penelusuran</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Database: <strong>{editingLog.database}</strong> • Tanggal: {formatDate(editingLog.searchDate)}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Kueri:</label>
                                <textarea 
                                    value={editingLog.query} 
                                    onChange={e => setEditingLog({...editingLog, query: e.target.value})}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 min-h-[100px] font-mono text-sm"
                                    maxLength={2000}
                                />
                                <p className="text-xs text-gray-500 mt-1 text-right">
                                    {editingLog.query.length}/2000 karakter
                                </p>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Database:</label>
                                <select 
                                    value={editingLog.database} 
                                    onChange={e => setEditingLog({...editingLog, database: e.target.value})}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                >
                                    <option value="Scopus">Scopus</option>
                                    <option value="Web of Science">Web of Science</option>
                                    <option value="Google Scholar">Google Scholar</option>
                                    <option value="Lainnya">Lainnya (Umum)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Jumlah Dokumen Ditemukan:</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={editingLog.resultsCount} 
                                    onChange={e => setEditingLog({...editingLog, resultsCount: e.target.value})} 
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" 
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal Penelusuran:</label>
                                <input 
                                    type="date" 
                                    value={editingLog.searchDate} 
                                    onChange={e => setEditingLog({...editingLog, searchDate: e.target.value})} 
                                    max={today}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" 
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsEditModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleUpdateLog} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan Perubahan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* UI Utama */}
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator & Log Kueri</h2>
            <p className="text-gray-700 mb-4">Alat ini membantu Anda membuat dan mendokumentasikan kueri pencarian secara sistematis, sebuah syarat wajib untuk penelitian SLR/Bibliometrik yang valid.</p>

            {/* --- PENEMPATAN LINK COBRASAURUS DIMULAI DI SINI --- */}
            <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-yellow-800 text-sm flex items-center gap-2">
                        🐍 Utilitas Eksternal: Cobrasaurus {projectData.showScopus ? "(Elite Access)" : "(Add-on)"}
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                        Punya daftar kata kunci yang berantakan atau tidak konsisten? Gunakan <strong>Cobrasaurus</strong> (Add-on mirip OpenRefine) untuk membersihkan dan menstandarisasi kata kunci Anda sebelum menyusun kueri.
                    </p>
                </div>
                
                {/* LOGIKA KONDISIONAL: Cek apakah user Elite (showScopus=true) atau Biasa */}
                {projectData.showScopus ? (
                    /* Tampilan untuk User Elite: Akses Langsung */
                    <a 
                        href="https://cobrasaurus.vercel.app/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold py-2 px-4 rounded-lg whitespace-nowrap shadow-sm transition-colors flex items-center gap-2"
                    >
                        Buka Cobrasaurus ↗
                    </a>
                ) : (
                    /* Tampilan untuk User Premium Biasa: Link ke Admin WA */
                    <a 
                        href={`https://wa.me/6285123048010?text=${encodeURIComponent("Halo Admin, saya pengguna Premium biasa ingin membeli akses add-on Cobrasaurus.")}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-bold py-2 px-4 rounded-lg whitespace-nowrap shadow-sm transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                        </svg>
                        Beli Akses Add-on
                    </a>
                )}
            </div>
            {/* --- PENEMPATAN LINK COBRASAURUS BERAKHIR DI SINI --- */}
            
            {/* BAGIAN BARU: Asisten Pertanyaan Penelitian (PICOS) */}
            <div className="p-4 border-2 border-dashed border-teal-300 rounded-lg bg-teal-50 mb-8">
                <h3 className="text-lg font-semibold mb-3 text-teal-800">Asisten Pertanyaan Penelitian (PICOS)</h3>
                <p className="text-sm text-teal-700 mb-4">Definisikan lingkup SLR Anda menggunakan kerangka PICOS untuk menghasilkan Pertanyaan Penelitian (RQ) dan kueri pencarian yang lebih akurat.</p>
                
                {/* --- KODE BARU DIMULAI DI SINI --- */}
                <div className="mb-6">
                    <button
                        onClick={handleAiFillPicos}
                        disabled={isLoading || isPicosLoading || (!projectData.topikTema && !projectData.judulKTI) || !isPremium}
                        className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-300'}`}
                        title={!isPremium ? "Fitur Premium" : ""}
                    >
                        {!isPremium ? '🔒 Isi Otomatis dengan AI (Premium)' : (isPicosLoading ? 'Memproses...' : '✨ Isi Otomatis dengan AI')}
                    </button>
                </div>
                {/* --- KODE BARU BERAKHIR DI SINI --- */}

                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">P: Population / Problem</label>
                        <p className="text-xs text-gray-500 mb-2">Siapa subjek/populasi yang diteliti atau apa masalah utamanya? (Contoh: Mahasiswa, UMKM, Pasien Diabetes).</p>
                        <textarea name="population" value={projectData.picos.population} onChange={handlePicosChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: siswa, mahasiswa" rows="2"></textarea>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">I: Intervention / Exposure</label>
                        <p className="text-xs text-gray-500 mb-2">Apa tindakan, perlakuan, atau variabel bebas yang diberikan/diamati?</p>
                        <textarea name="intervention" value={projectData.picos.intervention} onChange={handlePicosChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: pembelajaran berbasis AI" rows="2"></textarea>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">C: Comparison</label>
                        <p className="text-xs text-gray-500 mb-2">Apa pembandingnya? (Sering dikosongkan jika penelitian deskriptif atau tidak ada kelompok kontrol).</p>
                        <textarea name="comparison" value={projectData.picos.comparison} onChange={handlePicosChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: pembelajaran tradisional" rows="2"></textarea>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">O: Outcome</label>
                        <p className="text-xs text-gray-500 mb-2">Apa hasil yang diukur, dampak, atau variabel terikatnya?</p>
                        <textarea name="outcome" value={projectData.picos.outcome} onChange={handlePicosChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: performa siswa, motivasi" rows="2"></textarea>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">S: Study Design</label>
                        <p className="text-xs text-gray-500 mb-2">Jenis desain penelitian apa yang digunakan? (Contoh: Eksperimen, Kualitatif, SLR).</p>
                        <textarea name="studyDesign" value={projectData.picos.studyDesign} onChange={handlePicosChange} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700" placeholder="Contoh: penelitian empiris, kuantitatif" rows="2"></textarea>
                    </div>
                </div>
                 <button 
                    onClick={() => handleGenerateQueriesFromPicos(projectData.picos, 'rq')}
                    className={`mt-4 font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-teal-600 hover:bg-teal-700 text-white disabled:bg-teal-300'}`}
                    disabled={isLoading || !projectData.picos.population || !projectData.picos.intervention || !projectData.picos.outcome || !isPremium}
                    title={!isPremium ? "Fitur Premium" : ""}
                >
                    {!isPremium ? '🔒 Formulasikan RQ (Premium)' : (isLoading ? 'Memproses...' : 'Formulasikan Pertanyaan Penelitian')}
                </button>
                
                {/* --- KOTAK PERTANYAAN PENELITIAN BARU --- */}
                <div className="mt-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Pertanyaan Penelitian (Research Questions):
                    </label>
                    <textarea 
                        name="rumusanMasalahDraft"
                        value={projectData.rumusanMasalahDraft}
                        onChange={handleInputChange}
                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                        placeholder="Hasil formulasi AI akan muncul di sini, atau Anda bisa mengetik langsung. Pisahkan setiap pertanyaan dengan baris baru."
                        rows="4"
                    ></textarea>
                </div>
                {/* --- AKHIR KOTAK BARU --- */}
            </div>


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
                <button 
                    onClick={handleGenerateQueries} 
                    className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`} 
                    disabled={isLoading || !projectData.judulKTI || !isPremium}
                    aria-label="Hasilkan kueri berjenjang"
                    title={!isPremium ? "Fitur Premium" : ""}
                >
                    {!isPremium ? '🔒 Hasilkan Kueri (Premium)' : (isLoading ? 'Memproses...' : '✨ Hasilkan Kueri (dari Judul)')}
                </button>
                 <button 
                    onClick={() => handleGenerateQueriesFromPicos(projectData.picos, 'query')}
                    className={`ml-4 font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'}`}
                    disabled={isLoading || !projectData.picos.population || !projectData.picos.intervention || !projectData.picos.outcome || !isPremium}
                    aria-label="Hasilkan kueri dari PICOS"
                    title={!isPremium ? "Fitur Premium" : ""}
                >
                    {!isPremium ? '🔒 Hasilkan Kueri (Premium)' : (isLoading ? 'Memproses...' : '✨ Hasilkan Kueri (dari PICOS)')}
                </button>
                {!isPremium && <p className="text-xs text-red-500 mt-2">Mode Gratis: Silakan gunakan Log Kueri di bawah untuk mencatat kueri manual Anda.</p>}
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
                                                <code className="text-xs bg-gray-200 p-2 rounded-md block whitespace-pre-wrap break-words font-mono">
                                                    {q.kueri}
                                                </code>
                                                <button 
                                                    onClick={() => handleCopyQuery(q.kueri)} 
                                                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold p-2 rounded-lg flex-shrink-0"
                                                    aria-label="Salin kueri"
                                                    title="Salin kueri"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
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
                    <button 
                        onClick={handleOpenLogModal} 
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                        aria-label="Tambah log baru"
                    >
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
                                {sortedLogs.map(log => (
                                    <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 text-nowrap">{formatDate(log.searchDate)}</td>
                                        <td className="px-4 py-3">{log.database}</td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <code className="text-xs bg-gray-100 p-1 rounded break-words font-mono">
                                                {log.query}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{log.resultsCount}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex space-x-2">
                                                <button 
                                                    onClick={() => handleOpenEditModal(log)}
                                                    className="text-blue-500 hover:text-blue-700 p-1"
                                                    aria-label="Edit log"
                                                    title="Edit Log"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteLog(log.id)} 
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    aria-label="Hapus log"
                                                    title="Hapus Log"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
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

// ================ ANALISIS KUANTITATIF (TABEL) ================
const AnalisisKuantitatif = ({ 
  projectData, 
  setProjectData, 
  handleGenerateAnalisis, 
  isLoading, 
  showInfoModal, 
  handleCopyToClipboard 
}) => {
  const [fileName, setFileName] = useState('');
  const [dataPreview, setDataPreview] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [quantitativeFocus, setQuantitativeFocus] = useState(''); // <-- BARU
  const [targetDraft, setTargetDraft] = useState('analisisKuantitatifDraft'); // <-- TAMBAHKAN INI
  const fileInputRef = useRef(null);
  const isPremium = projectData.isPremium;

  // Handle file upload
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setFileName(file.name);
      
      window.Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if(results.data.length > 0) {
            setDataPreview(results.data.slice(0, 5));
            setParsedData(results.data);
          } else {
            showInfoModal("File CSV kosong atau tidak memiliki header.");
          }
        },
        error: (error) => {
          showInfoModal(`Gagal mem-parsing file CSV: ${error.message}`);
        }
      });
    } else {
      showInfoModal("Harap pilih file dengan format .csv");
    }
    event.target.value = null;
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // Tambahkan hasil ke draf gabungan
  const handleAddToDraft = (targetDraftKey) => { // <-- PERUBAHAN
    if (!projectData.analisisKuantitatifHasil) {
      showInfoModal("Tidak ada hasil analisis untuk ditambahkan.");
      return;
    }

    const separator = `\n\n---\n[Analisis untuk: ${fileName || 'Data Tanpa Nama'} - ${new Date().toLocaleDateString()}]\n---\n`;
    const newContent = separator + projectData.analisisKuantitatifHasil;

    setProjectData(p => { // <-- PERUBAHAN LOGIKA
      // Dapatkan konten draf lama dari target yang dipilih
      const oldDraftContent = p[targetDraftKey] || '';
      return {
          ...p,
          [targetDraftKey]: oldDraftContent + newContent, // <-- Update draf yang ditargetkan
          analisisKuantitatifHasil: '' // Reset hasil sementara
      };
    });

    // Reset state file
    setFileName('');
    setDataPreview(null);
    setParsedData(null);
    setQuantitativeFocus(''); // <-- BARU: Reset fokus
    setTargetDraft('analisisKuantitatifDraft'); // <-- TAMBAHKAN INI
    
    showInfoModal("Hasil analisis berhasil ditambahkan ke draf yang dipilih!"); // <-- PERUBAHAN
  };

  // Bersihkan draf gabungan
  const handleClearDraft = () => {
    setProjectData(p => ({ ...p, analisisKuantitatifDraft: '' }));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Analisis Data Kuantitatif (Tabel)</h2>
      
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
                  {Object.keys(dataPreview[0]).map(header => 
                    <th key={header} className="px-4 py-2">{header}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {dataPreview.map((row, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    {Object.values(row).map((cell, i) => 
                      <td key={i} className="px-4 py-2">{cell}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parsedData && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          {/* --- BARU --- */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Fokus Analisis Spesifik (Opsional):
            </label>
            <textarea 
              value={quantitativeFocus}
              onChange={(e) => setQuantitativeFocus(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
              placeholder="Contoh: Fokus pada korelasi 'Variabel A' vs 'Variabel B', atau 'Analisis kelompok usia > 30'"
              rows="3"
            ></textarea>
          </div>
          {/* --- AKHIR BARU --- */}

          <h3 className="text-lg font-semibold mb-3 text-gray-800">Pilih Jenis Analisis:</h3>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => handleGenerateAnalisis(parsedData, 'konfirmatif', quantitativeFocus)} // <-- PERUBAHAN
              className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
              disabled={isLoading || !isPremium}
              title={!isPremium ? "Fitur Premium" : ""}
            >
              {!isPremium ? '🔒 Analisis Konfirmatif (Premium)' : (isLoading ? 'Menganalisis...' : 'Analisis Konfirmatif (Uji Hipotesis)')}
            </button>
            <button 
              onClick={() => handleGenerateAnalisis(parsedData, 'eksploratif', quantitativeFocus)} // <-- PERUBAHAN
              className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'}`}
              disabled={isLoading || !isPremium}
              title={!isPremium ? "Fitur Premium" : ""}
            >
              {!isPremium ? '🔒 Analisis Eksploratif (Premium)' : (isLoading ? 'Menganalisis...' : 'Analisis Eksploratif (Temukan Wawasan)')}
            </button>
          </div>
          {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk menjalankan analisis statistik otomatis dengan AI.</p>}
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
          <h3 className="text-xl font-bold mb-4 text-gray-800">Hasil Analisis Sementara</h3>
          <textarea
            value={projectData.analisisKuantitatifHasil}
            onChange={(e) => setProjectData(p => ({ ...p, analisisKuantitatifHasil: e.target.value }))}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
            rows="10"
          ></textarea>
          
          {/* --- PERUBAHAN DIMULAI DI SINI --- */}
          <div className="mt-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Tambahkan ke Draf Bab:
            </label>
            <select
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 mb-4"
            >
              <option value="analisisKuantitatifDraft">Analisis Kuantitatif (Draf Gabungan)</option>
              <option value="pendahuluanDraft">Pendahuluan</option>
              <option value="studiLiteraturDraft">Studi Literatur</option>
              <option value="metodeDraft">Metode Penelitian</option>
              <option value="hasilPembahasanDraft">Hasil & Pembahasan</option>
              <option value="kesimpulanDraft">Kesimpulan</option>
            </select>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button 
              onClick={() => handleAddToDraft(targetDraft)} // <-- PERUBAHAN
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Tambahkan ke Draf yang Dipilih
            </button>
            {/* --- PERUBAHAN BERAKHIR DI SINI --- */}
            <button 
              onClick={() => setProjectData(p => ({ ...p, analisisKuantitatifHasil: '' }))}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Abaikan Hasil
            </button>
          </div>
        </div>
      )}
      
      {/* DRAF GABUNGAN */}
      <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Draf Gabungan Analisis Kuantitatif</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => handleCopyToClipboard(projectData.analisisKuantitatifDraft)}
              className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
              Salin
            </button>
            <button 
              onClick={handleClearDraft}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
              Bersihkan
            </button>
          </div>
        </div>
        
        <textarea
          value={projectData.analisisKuantitatifDraft || ''}
          onChange={(e) => setProjectData(p => ({ ...p, analisisKuantitatifDraft: e.target.value }))}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
          rows="15"
          placeholder="Hasil analisis yang ditambahkan akan muncul di sini..."
        ></textarea>
      </div>
    </div>
  );
};

// ================ ANALISIS KUALITATIF (DOKUMEN) ================
const AnalisisKualitatif = ({ 
  projectData, 
  setProjectData, 
  handleGenerateAnalisisKualitatif, 
  isLoading, 
  showInfoModal,
  handleCopyToClipboard
}) => {
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [draftSementara, setDraftSementara] = useState('');
  const [targetDraft, setTargetDraft] = useState('analisisKualitatifDraft'); // <-- BARU
  const [qualitativeFocus, setQualitativeFocus] = useState(''); // <-- BARU
  const [showPromoModal, setShowPromoModal] = useState(false); // <-- STATE BARU UNTUK POP-UP PROMO
  const fileInputRef = useRef(null);
  const isPremium = projectData.isPremium;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        setFileContent(text);
        setFileName(file.name);
      };
      reader.onerror = () => {
        showInfoModal("Gagal membaca file.");
      };
      reader.readAsText(file);
    } else {
      showInfoModal("Harap pilih file dengan format .txt");
    }
    event.target.value = null;
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };
  
  // Hasilkan narasi dari hasil analisis tematik
  useEffect(() => {
    if (projectData.analisisKualitatifHasil) {
      const narrative = projectData.analisisKualitatifHasil.map(theme => 
        `### ${theme.tema}\n\n${theme.deskripsi}\n\n**Kutipan Pendukung:**\n${theme.kutipan_pendukung.map(q => `- "${q}"`).join('\n')}`
      ).join('\n\n---\n\n');
      
      setDraftSementara(narrative);
    }
  }, [projectData.analisisKualitatifHasil]);
  
  const handleAnalysis = () => {
    if (!fileContent) {
      showInfoModal("Tidak ada konten untuk dianalisis. Unggah file .txt terlebih dahulu.");
      return;
    }
    handleGenerateAnalisisKualitatif(fileContent, qualitativeFocus); // <-- PERUBAHAN
  };

  // Tambahkan ke draf gabungan
  const handleAddToDraft = (targetDraftKey) => { // <-- PERUBAHAN
    if (!draftSementara) {
      showInfoModal("Tidak ada draf untuk ditambahkan.");
      return;
    }

    const separator = `\n\n---\n[Analisis untuk: ${fileName || 'Dokumen Tanpa Nama'} - ${new Date().toLocaleDateString()}]\n---\n`;
    const newContent = separator + draftSementara;

    setProjectData(p => { // <-- PERUBAHAN LOGIKA
      // Dapatkan konten draf lama dari target yang dipilih
      const oldDraftContent = p[targetDraftKey] || '';
      return {
          ...p,
          [targetDraftKey]: oldDraftContent + newContent, // <-- Update draf yang ditargetkan
          analisisKualitatifHasil: null
      };
    });

    // Reset state
    setFileName('');
    setFileContent('');
    setDraftSementara('');
    setTargetDraft('analisisKualitatifDraft'); // <-- BARU
    setQualitativeFocus(''); // <-- BARU
    
    showInfoModal("Hasil analisis berhasil ditambahkan ke draf gabungan!");
  };

  // Bersihkan draf gabungan
  const handleClearDraft = () => {
    setProjectData(p => ({ ...p, analisisKualitatifDraft: '' }));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Analisis Data Kualitatif (Dokumen)</h2>

      {/* KETERANGAN AUDIOCOBRA DENGAN POP-UP */}
      <p className="text-gray-700 mb-6">
          Gunakan aplikasi <button onClick={() => setShowPromoModal(true)} className="text-blue-600 hover:underline font-bold focus:outline-none">Audiocobra</button>, jika anda memiliki rekaman wawancara dan ingin dikonversi menjadi teks.
      </p>

      {/* MODAL POP-UP AUDIOCOBRA */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center animate-fade-in border border-indigo-100">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-800">Audiocobra (Add-on Premium)</h3>
                <p className="text-sm text-gray-600 mb-6">
                    Aplikasi transkripsi audio ke teks ini merupakan fitur suplemen berbayar terpisah. Silakan hubungi admin untuk mendapatkan akses lisensi.
                </p>
                <div className="flex flex-col gap-2">
                    <a 
                        href={`https://wa.me/6285123048010?text=${encodeURIComponent("Halo Admin, saya tertarik membeli akses Audiocobra.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                        onClick={() => setShowPromoModal(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/>
                        </svg>
                        Dapatkan Akses via WhatsApp
                    </a>
                    <button 
                        onClick={() => setShowPromoModal(false)} 
                        className="text-gray-500 hover:text-gray-700 font-semibold py-2 text-sm"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
      )}

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
          {/* --- PERUBAHAN DIMULAI DI SINI --- */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Fokus Analisis Spesifik (Opsional):
            </label>
            <textarea 
            value={qualitativeFocus}
            onChange={(e) => setQualitativeFocus(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
            placeholder="Contoh: Fokus pada tema 'tantangan implementasi', atau 'pandangan manajer senior'"
            rows="3"
            ></textarea>
          </div>
          {/* --- PERUBAHAN BERAKHIR DI SINI --- */}
          <button 
            onClick={handleAnalysis} 
            className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
            disabled={isLoading || !isPremium}
            title={!isPremium ? "Fitur Premium" : ""}
          >
            {!isPremium ? '🔒 Analisis Tematik (Premium)' : (isLoading ? 'Menganalisis...' : '✨ Lakukan Analisis Tematik')}
          </button>
          {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk analisis kualitatif otomatis.</p>}
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
        </div>
      )}

      {(projectData.analisisKualitatifHasil || draftSementara) && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Draf Narasi Sementara</h3>
          <textarea
            value={draftSementara}
            onChange={(e) => setDraftSementara(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
            rows="15"
            placeholder="Susun narasi temuan Anda di sini..."
          ></textarea>
          
          {/* --- PERUBAHAN DIMULAI DI SINI --- */}
          <div className="mt-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Tambahkan ke Draf Bab:
            </label>
            <select
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 mb-4"
            >
              <option value="analisisKualitatifDraft">Analisis Kualitatif (Draf Gabungan)</option>
              <option value="pendahuluanDraft">Pendahuluan</option>
              <option value="studiLiteraturDraft">Studi Literatur</option>
              <option value="metodeDraft">Metode Penelitian</option>
              <option value="hasilPembahasanDraft">Hasil & Pembahasan</option>
              <option value="kesimpulanDraft">Kesimpulan</option>
            </select>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button 
              onClick={() => handleAddToDraft(targetDraft)} // <-- PERUBAHAN
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Tambahkan ke Draf yang Dipilih
            </button>
            {/* --- PERUBAHAN BERAKHIR DI SINI --- */}
            <button 
              onClick={() => {
                setDraftSementara('');
                setProjectData(p => ({ ...p, analisisKualitatifHasil: null }));
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Abaikan Hasil
            </button>
          </div>
        </div>
      )}
      
      {/* DRAF GABUNGAN */}
      <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Draf Gabungan Analisis Kualitatif</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => handleCopyToClipboard(projectData.analisisKualitatifDraft)}
              className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
              Salin
            </button>
            <button 
              onClick={handleClearDraft}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
              Bersihkan
            </button>
          </div>
        </div>
        
        <textarea
          value={projectData.analisisKualitatifDraft || ''}
          onChange={(e) => setProjectData(p => ({ ...p, analisisKualitatifDraft: e.target.value }))}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
          rows="15"
          placeholder="Hasil analisis yang ditambahkan akan muncul di sini..."
        ></textarea>
      </div>
    </div>
  );
};

// ================ MODUL ANALISIS VISUAL (GAMBAR)================
const AnalisisVisual = ({ 
  projectData, 
  setProjectData, 
  handleGenerateAnalisisVisual, 
  isLoading, 
  showInfoModal,
  handleCopyToClipboard // Wajib ditambahkan dari parent
}) => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [fileName, setFileName] = useState(''); // Tambahkan state untuk nama file
  const [analysisFocus, setAnalysisFocus] = useState('');
  const [targetDraft, setTargetDraft] = useState('analisisVisualDraft'); // <-- State baru untuk dropdown
  const fileInputRef = useRef(null);
  const isPremium = projectData.isPremium;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      setFileName(file.name); // Simpan nama file
      
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

  // Fungsi untuk menyimpan analisis ke draf gabungan
  const handleSaveAnalysis = (targetDraftKey) => { // <-- Terima target draft
    if (!projectData.deskripsiVisualisasi || !projectData.interpretasiData) {
      showInfoModal("Tidak ada hasil analisis untuk disimpan.");
      return;
    }

    // Format konten dengan separator dan metadata
    const separator = `\n\n---\n[Analisis Visual: ${fileName || 'Gambar Tanpa Nama'} - ${new Date().toLocaleDateString()}]\n---\n`;
    const kontenVisual = `**Deskripsi Gambar:**\n${projectData.deskripsiVisualisasi}\n\n**Interpretasi & Analisis:**\n${projectData.interpretasiData}`;
    const newContent = separator + kontenVisual;

    // Tambahkan ke draf gabungan dan reset state
    setProjectData(p => {
      // Dapatkan konten draf lama dari target yang dipilih
      const oldDraftContent = p[targetDraftKey] || '';
      return {
          ...p,
          [targetDraftKey]: oldDraftContent + newContent, // <-- Update draf yang ditargetkan secara dinamis
          // Reset hasil sementara
          deskripsiVisualisasi: '',
          interpretasiData: ''
      };
    });

    // Reset state gambar
    setImageFile(null);
    setImagePreview('');
    setFileName('');
    setAnalysisFocus('');
    setTargetDraft('analisisVisualDraft'); // <-- Reset dropdown ke default
    
    showInfoModal("Hasil analisis berhasil ditambahkan ke draf yang dipilih!"); // <-- Update pesan
  };

  // Fungsi untuk membersihkan draf gabungan
  const handleClearVisualDraft = () => {
    setProjectData(p => ({ ...p, analisisVisualDraft: '' }));
    showInfoModal("Draf gabungan telah dibersihkan!");
  };

  // Fungsi untuk me-reset analisis saat ini
  const handleResetCurrent = () => {
    setImageFile(null);
    setImagePreview('');
    setFileName('');
    setAnalysisFocus('');
    setProjectData(p => ({
      ...p,
      deskripsiVisualisasi: '',
      interpretasiData: ''
    }));
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
        {fileName && <p className="text-sm text-gray-600 mt-2">File terpilih: {fileName}</p>}
      </div>

      {imagePreview && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Pratinjau Gambar</h3>
          <div className="border rounded-lg p-2 flex justify-center bg-gray-100">
            <img src={imagePreview} alt="Pratinjau" className="max-w-full object-contain" />
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Fokus Analisis Spesifik (Opsional):</label>
            <textarea 
            value={analysisFocus}
            onChange={(e) => setAnalysisFocus(e.target.value)}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
            placeholder="Contoh: Fokus pada klaster merah dan hubungannya dengan 'inovasi'."
            rows="3"
            ></textarea>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleAnalysis} 
              className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
              disabled={isLoading || !isPremium}
              title={!isPremium ? "Fitur Premium" : ""}
            >
              {!isPremium ? '🔒 Analisis Gambar (Premium)' : (isLoading ? 'Menganalisis...' : '✨ Analisis Gambar dengan AI')}
            </button>
            <button 
              onClick={handleResetCurrent}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Reset
            </button>
          </div>
          {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk analisis visual otomatis.</p>}
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
          <h3 className="text-xl font-bold mb-4 text-gray-800">Hasil Analisis Visual AI (Sementara)</h3>
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
            
            {/* --- PERUBAHAN DIMULAI DI SINI --- */}
            <div className="mt-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Tambahkan ke Draf Bab:
              </label>
              <select
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.target.value)}
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 mb-4"
              >
                <option value="analisisVisualDraft">Analisis Visual (Draf Gabungan)</option>
                <option value="pendahuluanDraft">Pendahuluan</option>
                <option value="studiLiteraturDraft">Studi Literatur</option>
                <option value="metodeDraft">Metode Penelitian</option>
                <option value="hasilPembahasanDraft">Hasil & Pembahasan</option>
                <option value="kesimpulanDraft">Kesimpulan</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleSaveAnalysis(targetDraft)} // <-- Kirim target draft
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Tambahkan ke Draf yang Dipilih
              </button>
              {/* --- PERUBAHAN BERAKHIR DI SINI --- */}
              <button 
                onClick={handleResetCurrent}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
              >
                Abaikan Hasil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AREA DRAF GABUNGAN --- */}
      <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Draf Gabungan Analisis Visual</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => handleCopyToClipboard(projectData.analisisVisualDraft)}
              className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
              Salin
            </button>
            <button 
              onClick={handleClearVisualDraft}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-lg"
            >
              Bersihkan
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-2">
          Semua hasil analisis visual yang Anda simpan akan terkumpul di sini.
        </p>
        <textarea
          value={projectData.analisisVisualDraft || ''}
          onChange={(e) => setProjectData(p => ({ ...p, analisisVisualDraft: e.target.value }))}
          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
          rows="15"
          placeholder="Hasil analisis yang disimpan akan muncul di sini..."
        ></textarea>
      </div>
    </div>
  );
};

// ================ KOMPONEN BARU: ANALISIS GAP & NOVELTY ================

// --- SUB-KOMPONEN: VISUALISASI PETA TEMATIK (SCATTER PLOT) ---
const ThematicMapVisualizer = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Konfigurasi Chart
    const size = 320; // Ukuran SVG
    const padding = 40;
    const range = 10; // Skala 1-10

    // Helper konversi koordinat (0-10 ke pixel SVG)
    const scale = (val) => (val / range) * (size - 2 * padding) + padding;
    // Y di SVG terbalik (0 di atas), jadi kita balik agar 10 di atas
    const scaleY = (val) => size - ((val / range) * (size - 2 * padding) + padding);

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm mb-6 flex flex-col items-center animate-fade-in">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-purple-600" viewBox="0 0 16 16">
                    <path d="M1 0h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1zm1 1v14h14V1H2z"/>
                    <path d="M6 3a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H6zm0 4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H6zm0 4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H6z"/>
                </svg>
                Peta Tematik Strategis (AI Generated)
            </h4>
            
            <div className="relative border border-gray-200 bg-gray-50 rounded shadow-inner" style={{ width: size, height: size }}>
                
                {/* Garis Kuadran (Crosshair) */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400 border-l border-dashed opacity-50"></div>
                <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-400 border-t border-dashed opacity-50"></div>

                {/* Label Kuadran */}
                <span className="absolute top-2 left-2 text-[9px] text-gray-500 font-bold bg-white/80 px-1 rounded shadow-sm border border-gray-100">Niche Themes<br/><span className="font-normal text-[8px]">(Terisolasi)</span></span>
                <span className="absolute top-2 right-2 text-[9px] text-gray-500 font-bold bg-white/80 px-1 rounded shadow-sm border border-gray-100 text-right">Motor Themes<br/><span className="font-normal text-[8px]">(Matang & Penting)</span></span>
                <span className="absolute bottom-2 left-2 text-[9px] text-gray-500 font-bold bg-white/80 px-1 rounded shadow-sm border border-gray-100">Emerging/Declining<br/><span className="font-normal text-[8px]">(Baru/Pudar)</span></span>
                <span className="absolute bottom-2 right-2 text-[9px] text-gray-500 font-bold bg-white/80 px-1 rounded shadow-sm border border-gray-100 text-right">Basic Themes<br/><span className="font-normal text-[8px]">(Umum/Dasar)</span></span>

                {/* Label Sumbu */}
                <span className="absolute bottom-0.5 w-full text-center text-[10px] font-bold text-gray-600 tracking-wide">RELEVANSI (Centrality) &rarr;</span>
                <span className="absolute left-0.5 bottom-12 origin-left -rotate-90 text-[10px] font-bold text-gray-600 tracking-wide">PENGEMBANGAN (Density) &rarr;</span>

                {/* Titik Data (Bubbles) */}
                <svg width={size} height={size} className="absolute top-0 left-0 overflow-visible">
                    {data.map((item, i) => {
                        

                        return (
                 <g key={i} className="transition-all duration-300 hover:opacity-100 cursor-default group">
    {(() => {
        // Palet warna akademik variatif (Teal, Orange, Blue, Pink, Purple, Green, dll)
        const clusterColors = ["#26a69a", "#ff7043", "#42a5f5", "#ec407a", "#7e57c2", "#66bb6a", "#ffa726", "#8d6e63"];
        const nodeColor = clusterColors[i % clusterColors.length];

        return (
            <>
                {/* Bubble dengan warna unik per klaster */}
                <circle 
                    cx={scale(item.x)} 
                    cy={scaleY(item.y)} 
                    r={Math.max(6, (item.volume || 1) * 3.5)} 
                    fill={nodeColor} 
                    opacity="0.8"
                    stroke="white"
                    strokeWidth="1.5"
                    className="filter drop-shadow-sm group-hover:scale-110 transition-transform origin-center"
                />
                {/* Label Tema */}
                <text 
                    x={scale(item.x)} 
                    y={scaleY(item.y) - (Math.max(6, (item.volume || 1) * 3.5) + 5)} 
                    textAnchor="middle" 
                    fontSize="10" 
                    fill="#1F2937"
                    className="font-bold pointer-events-none"
                    style={{ textShadow: "0px 0px 4px white, 0px 0px 4px white" }}
                >
                    {item.theme}
                </text>
                {/* UPDATE TOOLTIP AGAR MENAMPILKAN ISI KLASTER */}
                <title>{`Tema: ${item.theme}\nRelevansi: ${item.x}/10\nPengembangan: ${item.y}/10\n\nIsi Klaster:\n${item.keywords ? item.keywords.map(k => `• ${k}`).join('\n') : '-'}`}</title>
            </>
        );
    })()}
</g>          
                ); 
            })}
        </svg>
            </div>
            
            <div className="mt-4 pt-3 border-t w-full max-w-md">
                <p className="text-[10px] text-gray-400 italic text-center mb-3">
                    *Warna node mewakili klaster tema yang berbeda. Posisi menentukan kategori strategis (Motor/Niche/dll).
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600 leading-tight">
                    <div className="bg-red-50 p-2 rounded border border-red-100">
                        <span className="font-bold text-red-700 block mb-0.5">Motor Themes (Kanan-Atas)</span>
                        Topik penggerak utama yang matang & penting bagi struktur bidang penelitian.
                    </div>
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                        <span className="font-bold text-blue-700 block mb-0.5">Niche Themes (Kiri-Atas)</span>
                        Topik yang sangat spesifik/khusus; sudah matang (developed) tetapi terisolasi.
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                        <span className="font-bold text-green-700 block mb-0.5">Emerging/Declining (Kiri-Bawah)</span>
                        Topik yang baru muncul (emerging) atau mulai ditinggalkan (declining); relevansi & pengembangan rendah.
                    </div>
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                        <span className="font-bold text-yellow-700 block mb-0.5">Basic Themes (Kanan-Bawah)</span>
                        Topik dasar/umum yang penting untuk bidang ini, namun belum dikembangkan secara mendalam.
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnalisisGapNovelty = ({ 
    projectData, 
    setProjectData, 
    geminiApiKeys, 
    showInfoModal, 
    handleCopyToClipboard 
}) => {
    const [selectedRefIds, setSelectedRefIds] = useState([]);
    const [activeTab, setActiveTab] = useState('literature'); // Default: 'literature' (Data);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isMapping, setIsMapping] = useState(false); 
    const [targetDraft, setTargetDraft] = useState('pendahuluanDraft');
    // --- STATE BARU: MANUAL KEYWORDS ---
    const [manualKeywords, setManualKeywords] = useState('');
    // -----------------------------------
    const isPremium = projectData.isPremium;
    
    // Helper: Pilih Semua / Hapus Semua
    const handleSelectAll = (select) => {
        if (select) {
            const allIds = projectData.allReferences.map(ref => ref.id);
            setSelectedRefIds(allIds);
        } else {
            setSelectedRefIds([]);
        }
    };

    const handleCheckboxChange = (id) => {
        setSelectedRefIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // --- LOGIKA AI PETA TEMATIK (LANGKAH 3 SELESAI) ---
    const handleGenerateThematicMap = async () => {
        const hasKeywords = manualKeywords && manualKeywords.trim() !== "";

        // 1. VALIDASI DINAMIS BERDASARKAN TAB
        if (activeTab === 'literature' && selectedRefIds.length < 5) {
            showInfoModal(`Mode Literatur membutuhkan minimal 5 referensi agar klaster yang dihasilkan valid. Saat ini hanya ${selectedRefIds.length} terpilih.`);
            return;
        }
        
        if (activeTab === 'keyword' && !hasKeywords) {
            showInfoModal("Silakan masukkan daftar kata kunci/topik terlebih dahulu pada kolom yang tersedia.");
            return;
        }

        setIsMapping(true);
        setProjectData(p => ({ ...p, thematicMapData: null })); // Reset peta lama

        // 2. PERSIAPAN DATA INPUT (FLEKSIBEL)
        const selectedRefs = projectData.allReferences.filter(ref => selectedRefIds.includes(ref.id));
        
        // Jika Mode Kata Kunci (refs kosong), kirim teks dummy agar prompt tidak error
        let refsInput = selectedRefs.length > 0 
            ? selectedRefs.map((ref, i) => {
                let content = ref.abstract && ref.abstract.length > 20 ? ref.abstract.substring(0, 500) : (ref.isiKutipan || "Tidak ada data ringkasan.");
                return `[${i+1}] "${ref.title}" (${ref.year}). Ringkasan: ${content}`;
            }).join('\n')
            : "TIDAK ADA REFERENSI (MODE KONSEP - GUNAKAN PENGETAHUAN GLOBAL).";

        // 3. INSTRUKSI KHUSUS
        let keywordContext = "";
        if (manualKeywords && manualKeywords.trim() !== "") {
            keywordContext = `\nDAFTAR KATA KUNCI PRIORITAS (User Input):\n${manualKeywords}\n\n`;
        }

        const groundingInstruction = (activeTab === 'keyword') 
            ? "Karena ini adalah Mode Konsep (tanpa literatur spesifik), Anda WAJIB menggunakan pengetahuan internal/global Anda (Google Search Grounding) untuk memetakan posisi strategis tema-tema dari 'Daftar Kata Kunci' di atas dalam lanskap riset dunia saat ini."
            : "Gunakan daftar literatur yang disediakan di bawah ini sebagai sumber data utama pemetaan (Inductive Clustering).";

        // 4. Prompt Strategis
        const prompt = `Anda adalah ahli Bibliometrik (Science Mapping). Tugas Anda adalah membuat "Thematic Map" (Peta Tematik) dari data berikut.

${keywordContext}
${groundingInstruction}

DATA INPUT:
${refsInput}

INSTRUKSI ANALISIS:
1. Kelompokkan menjadi 5-10 'Tema Utama' (Cluster).
2. Untuk setiap tema, berikan nilai skor (Skala 1-10) untuk dua dimensi:
   - **X (Centrality):** Seberapa penting/relevan tema ini? (1=Periferal, 10=Sentral).
   - **Y (Density):** Seberapa matang/berkembang tema ini? (1=Emerging/Baru, 10=Mature/Jenuh).
3. Hitung "Volume" (Ukuran Bubble): Estimasi popularitas (1-10).
4. **Isi Klaster (Keywords):** Sebutkan 3-5 istilah atau kata kunci spesifik yang menjadi anggota klaster ini.

Berikan jawaban HANYA dalam format JSON Array.`;

        const schema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            theme: { type: "STRING", description: "Nama tema singkat (max 3 kata)." },
            x: { type: "NUMBER", description: "Nilai Centrality (1-10)." },
            y: { type: "NUMBER", description: "Nilai Density (1-10)." },
            volume: { type: "NUMBER", description: "Estimasi jumlah paper/volume (1-10)." },
            // TAMBAHAN PENTING: Minta array keywords
            keywords: { 
                type: "ARRAY", 
                items: { type: "STRING" }, 
                description: "Daftar 3-5 kata kunci anggota klaster." 
            }
        },
        required: ["theme", "x", "y", "volume", "keywords"] // Tambahkan keywords ke required
    }
};

        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
            setProjectData(p => ({ ...p, thematicMapData: result }));
            showInfoModal("Peta Tematik berhasil dipetakan!");
        } catch (error) {
            showInfoModal(`Gagal membuat peta: ${error.message}`);
        } finally {
            setIsMapping(false);
        }
    };

    // Logika Utama: Analisis Teks Gap (Updated)
    const handleAnalyze = async () => {
        // 1. Validasi: Cukup pastikan Peta Tematik sudah dibuat
        if (!projectData.thematicMapData) {
            showInfoModal("Silakan buat 'Peta Tematik' terlebih dahulu sebelum menulis analisis naratif.");
            return;
        }
        
        if (!projectData.judulKTI) {
            showInfoModal("Judul KTI belum diisi. Harap lengkapi di tab 'Ide KTI' terlebih dahulu.");
            return;
        }

        setIsAnalyzing(true);

        // 1. Siapkan Data Pendukung (Fleksibel & Berbasis Tab)
        const selectedRefs = projectData.allReferences.filter(ref => selectedRefIds.includes(ref.id));
        
        let refsDataString = "";
        
        // UPDATE LOGIKA: Cek Active Tab untuk kepastian mode
        if (activeTab === 'literature' && selectedRefs.length > 0) {
            // Jika Mode Literatur: Format data referensi seperti biasa
            refsDataString = selectedRefs.map((ref, index) => {
                let contentSource = "Tidak ada data konten rinci.";
                
                // Prioritas 1: Data Ekstraksi SLR (Paling terstruktur)
                const extraction = projectData.extractedData?.find(e => String(e.refId) === String(ref.id));
                
                if (extraction) {
                    contentSource = `Data Ekstraksi SLR:\n${JSON.stringify(extraction.data)}`;
                } else if (ref.abstract && ref.abstract.trim().length > 20) {
                    // Prioritas 2: Abstrak (Sesuai request: baca abstrak jika ada)
                    contentSource = `Abstrak:\n"${ref.abstract}"`;
                } else if (ref.isiKutipan && ref.isiKutipan.trim() !== "") { // FIX: Typo .trim(). !== dihapus
                    // Prioritas 3: Catatan/Kutipan (Fallback jika abstrak tidak ada)
                    contentSource = `Catatan/Kutipan (Pengganti Abstrak):\n"${ref.isiKutipan}"`;
                } else {
                    contentSource = "(Hanya Metadata Tersedia)";
                }

                // Hapus [index+1] agar AI tidak bingung menggunakannya sebagai nomor sitasi
                return `--- REFERENSI ${index + 1} ---\nPenulis: ${ref.author}\nTahun: ${ref.year}\nJudul: "${ref.title}"\nKonten: ${contentSource}`;
            }).join('\n\n');
        } else {
            // Jika Mode Kata Kunci (atau Tab Literatur tapi tidak ada ref dipilih): Berikan instruksi fallback ke AI
            refsDataString = "DATA LITERATUR SPESIFIK TIDAK TERSEDIA (MODE KONSEP). Silakan lakukan analisis naratif sepenuhnya berdasarkan interpretasi visual Peta Tematik di atas dan pengetahuan global (Grounding) Anda mengenai topik-topik tersebut.";
        }

        // Data Peta Tematik untuk Konteks
        const thematicMapContext = projectData.thematicMapData 
            ? JSON.stringify(projectData.thematicMapData) 
            : "Data Peta Tematik belum dihasilkan oleh pengguna.";

        // --- UPDATE: Instruksi Sitasi Dinamis ---
        const isConceptMode = activeTab === 'keyword' || selectedRefs.length === 0;
        
        const citationInstruction = isConceptMode
            ? "2. **DILARANG HALUSINASI REFERENSI:** Karena ini Mode Konsep (tanpa input literatur riil), JANGAN PERNAH membuat sitasi fiktif seperti '(Smith, 2023)'. Gunakan frasa umum seperti 'Literatur terkini menunjukkan...', 'Secara teoritis...', atau 'Tren global mengindikasikan...'."
            : "2. **SITASI APA 7th MURNI:** Wajib menggunakan data dari 'DATA LITERATUR (PENDUKUNG)' di bawah. Gunakan format (Author, Year). Dilarang mengarang referensi yang tidak ada di input.";

        // 2. Siapkan Prompt (Updated: Strict APA & Clean Output)
        const prompt = `Anda adalah ahli riset strategis. Tugas Anda adalah menyusun narasi "Gap & Novelty" yang **SINGKAT, PADAT, dan TO-THE-POINT**.

**FOKUS UTAMA:** Gunakan interpretasi dari **Peta Tematik Strategis** (Visual) sebagai landasan utama argumen.

**KONTEKS PENELITIAN:**
- Judul: "${projectData.judulKTI}"
- Tujuan: "${projectData.tujuanPenelitianDraft || 'Belum ditentukan'}"

**DATA PETA TEMATIK (VISUAL):**
${thematicMapContext}
*(Panduan Interpretasi: Tema di 'Motor Themes' = Jenuh/Matang. Tema di 'Emerging/Declining' atau 'Niche' = Celah/Peluang Riset).*

**DATA LITERATUR (PENDUKUNG):**
${refsDataString}

**ATURAN PENULISAN WAJIB (STRICT MODE):**
1.  **DILARANG MENULIS ANGKA SKOR/KOORDINAT:** Jangan pernah menyertakan nilai angka dalam kurung seperti "(9.5/9)" atau "(4/5)" di dalam narasi. Cukup sebutkan nama kuadran (Motor/Niche/Emerging/Basic) untuk menggambarkan posisi tema.
${citationInstruction}
3.  **BERSIH DARI META-TEKS:** Jangan sertakan hitungan kata (word count), label "Hasil:", atau komentar penutup di akhir teks.

**ALUR NARASI:**
1.  **Analisis Visual Langsung:** Langsung jelaskan posisi tema pada kuadran. Contoh: "Berdasarkan pemetaan tematik, topik [A] berada di kuadran Motor Themes yang mengindikasikan saturasi riset, sedangkan aspek [C] masih berada di kuadran Emerging/Niche..."
2.  **Gap & Novelty:** Sambungkan temuan visual tersebut dengan judul penelitian pengguna. Nyatakan tegas bahwa penelitian ini mengisi celah pada tema yang masih *Emerging* atau *Niche* tersebut.
3.  **Format:** Maksimal 2 paragraf. Langsung ke substansi.`;

        try {
            // Menggunakan geminiApiKeys (Array) sesuai update Langkah 2 sebelumnya
            const result = await geminiService.run(prompt, geminiApiKeys);
            setProjectData(p => ({ ...p, analisisGapNoveltyDraft: result }));
            showInfoModal("Analisis Gap & Novelty (Fokus Visual) berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal menganalisis: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAddToDraft = () => {
        if (!projectData.analisisGapNoveltyDraft) return;
        
        const contentToAdd = `\n\n=== ANALISIS GAP & NOVELTY ===\n${projectData.analisisGapNoveltyDraft}\n`;
        
        setProjectData(p => ({
            ...p,
            [targetDraft]: (p[targetDraft] || '') + contentToAdd
        }));
        
        showInfoModal("Hasil analisis berhasil ditambahkan ke draf yang dipilih!");
    };

    // Render Indikator Kualitas Data
    const getDataBadge = (ref) => {
        const hasExtraction = projectData.extractedData.some(e => String(e.refId) === String(ref.id));
        if (hasExtraction) return <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-200" title="Data Ekstraksi SLR Tersedia">High Quality Data</span>;
        if (ref.isiKutipan && ref.isiKutipan.length > 50) return <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200" title="Catatan Manual Tersedia">Medium Data</span>;
        return <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200" title="Hanya Metadata">Low Data</span>;
    };

    return (
    <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
        {/* Header dan Tab Switcher (Sesuai Gambar Desain) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-800">Pengaturan Peta Visual</h2>
            <div className="flex bg-gray-200 p-1 rounded-xl shadow-inner">
                <button 
                    onClick={() => setActiveTab('literature')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'literature' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Analisis Literatur (Data)
                </button>
                <button 
                    onClick={() => setActiveTab('keyword')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'keyword' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Analisis Kata Kunci (Konsep)
                </button>
            </div>
        </div>

        {/* Info Box Dinamis (Sesuai Gambar Desain) */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg shadow-sm">
            <p className="text-xs text-blue-800 leading-relaxed italic">
                {activeTab === 'literature' 
                    ? `Mode Literatur: AI akan membaca abstrak dari ${selectedRefIds.length} referensi yang Anda centang di bawah, lalu mengelompokkannya menjadi tema-tema strategis secara induktif. (Minimal 5 referensi).`
                    : "Mode Kata Kunci: Gunakan saat Anda belum memiliki data literatur. AI akan memproyeksikan posisi strategis topik-topik di bawah ini berdasarkan pengetahuan umum AI (Global Grounding)."}
            </p>
        </div>

       {/* KONTEN TAB 1: ANALISIS LITERATUR (DATA) */}
        {activeTab === 'literature' && (
            <div className="mb-6 border rounded-lg overflow-hidden animate-fade-in">
                <div className="bg-gray-100 p-3 flex justify-between items-center border-b">
                    <h3 className="font-bold text-gray-700 text-sm">Pilih Literatur Pembanding ({selectedRefIds.length} dipilih)</h3>
                    <div className="space-x-2">
                        <button onClick={() => handleSelectAll(true)} className="text-xs text-blue-600 hover:underline">Pilih Semua</button>
                        <button onClick={() => handleSelectAll(false)} className="text-xs text-red-600 hover:underline">Hapus Semua</button>
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto p-4 bg-gray-50 space-y-2 custom-scrollbar">
                    {projectData.allReferences.length > 0 ? (
                        projectData.allReferences.map(ref => (
                            <label key={ref.id} className="flex items-start gap-3 p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selectedRefIds.includes(ref.id)}
                                    onChange={() => handleCheckboxChange(ref.id)}
                                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-semibold text-xs text-gray-800 line-clamp-1">{ref.title}</span>
                                        {getDataBadge(ref)}
                                    </div>
                                    <p className="text-[10px] text-gray-500">{ref.author} ({ref.year})</p>
                                </div>
                            </label>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 italic text-sm py-4">Belum ada referensi di perpustakaan.</p>
                    )}
                </div>
            </div>
        )}

        {/* KONTEN TAB 2: ANALISIS KATA KUNCI (KONSEP) */}
        {activeTab === 'keyword' && (
            <div className="mb-6 animate-fade-in">
                <h4 className="font-bold text-gray-700 text-sm mb-2">Daftar Kata Kunci / Topik (Satu per baris):</h4>
                <p className="text-xs text-gray-500 mb-2">
                    Gunakan add-on <a href="https://cobrasaurus.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Cobrasaurus</a> untuk generate dan cleaning kata kunci.
                </p>
                <textarea 
                    value={manualKeywords}
                    onChange={(e) => setManualKeywords(e.target.value)}
                    className="w-full p-3 text-xs border-2 border-gray-200 rounded-xl h-32 focus:ring-2 focus:ring-blue-500 font-mono shadow-inner outline-none transition-all"
                    placeholder={`Contoh:\nartificial intelligence\npublic trust\ndata privacy\nethical governance`}
                ></textarea>
            </div>
        )}

        {/* Tombol Aksi Dinamis (Sesuai Gambar Desain) */}
        <div className="flex justify-end mb-8 border-b pb-8">
            <button 
                onClick={handleGenerateThematicMap}
                disabled={isMapping || !isPremium || (activeTab === 'literature' && selectedRefIds.length === 0) || (activeTab === 'keyword' && !manualKeywords.trim())}
                className={`font-bold py-2.5 px-6 rounded-xl shadow-lg flex items-center gap-2 text-sm transition-all transform hover:-translate-y-1 active:scale-95 ${
                    !isPremium ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
                {isMapping ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>
                )}
                {activeTab === 'literature' ? 'Buat Peta dari Literatur' : 'Buat Peta dari Kata Kunci'}
            </button>
        </div>

                {/* Render Visualizer jika data ada */}
                {projectData.thematicMapData && (
                    <ThematicMapVisualizer data={projectData.thematicMapData} />
                )}

            {/* BAGIAN 2: TOMBOL AKSI UTAMA (NARASI) */}
            <div className="flex flex-col items-center mb-8 border-t pt-6">
                <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !projectData.thematicMapData || !isPremium} // Aktif jika Peta sudah ada
                    className={`font-bold py-3 px-8 rounded-full shadow-lg transform transition-all ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-purple-600 hover:bg-purple-700 text-white hover:-translate-y-1 disabled:bg-purple-300 disabled:transform-none'}`}
                    title={!isPremium ? "Fitur Premium" : ""}
                >
                    {isAnalyzing ? (
                        <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Menulis Analisis Naratif...
                        </span>
                    ) : (!isPremium ? '🔒 Tulis Analisis Gap (Premium)' : "✨ Tulis Analisis Kesenjangan & Kebaruan (Naratif)")}
                </button>
                {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk membuka fitur analisis cerdas ini.</p>}
            </div>

            {/* BAGIAN 3: HASIL & OUTPUT */}
            {projectData.analisisGapNoveltyDraft && (
                <div className="animate-fade-in border-t-2 border-dashed border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-gray-800">Hasil Analisis Naratif</h3>
                        <button onClick={() => handleCopyToClipboard(projectData.analisisGapNoveltyDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg">
                            Salin Teks
                        </button>
                    </div>
                    
                    <textarea
                        value={projectData.analisisGapNoveltyDraft}
                        onChange={(e) => setProjectData(p => ({...p, analisisGapNoveltyDraft: e.target.value}))}
                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed mb-4"
                        rows="12"
                        placeholder="Hasil analisis akan muncul di sini..."
                    ></textarea>

                    <div className="bg-blue-50 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4 border border-blue-100">
                        <div className="flex-1 w-full">
                            <label className="block text-blue-800 text-xs font-bold mb-1">Simpan hasil ini ke:</label>
                            <select 
                                value={targetDraft}
                                onChange={(e) => setTargetDraft(e.target.value)}
                                className="block w-full bg-white border border-blue-300 text-gray-700 py-2 px-3 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
                            >
                                <option value="pendahuluanDraft">Bab 1: Pendahuluan (Latar Belakang)</option>
                                <option value="studiLiteraturDraft">Bab 2: Tinjauan Pustaka</option>
                                <option value="hasilPembahasanDraft">Bab 4: Pembahasan (Posisi Penelitian)</option>
                            </select>
                        </div>
                        <button 
                            onClick={handleAddToDraft}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm whitespace-nowrap"
                        >
                            Tambahkan ke Draf
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
    const isPremium = projectData.isPremium;

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
                    className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                    disabled={isLoading || !isReady || !isPremium}
                    title={!isPremium ? "Fitur Premium" : ""}
                >
                    {!isPremium ? '🔒 Tulis Draf Kesimpulan (Premium)' : (isLoading ? 'Memproses...' : '✨ Tulis Draf Bab Kesimpulan')}
                </button>
                {!isReady && <p className="text-xs text-red-600 mt-2">Tombol dinonaktifkan karena belum semua draf prasyarat selesai.</p>}
                {!isPremium && <p className="text-xs text-red-500 mt-1">Upgrade ke Premium untuk menulis Bab 5 otomatis.</p>}
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
                        <h4 className="text-md font-semibold mb-3 text-gray-700">Modifikasi Draf {isPremium ? '' : '(Premium Only)'}</h4>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => handleModifyText('shorten', 'kesimpulanDraft')}
                                disabled={isLoading || !projectData.kesimpulanDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300'}`}
                            >
                                {!isPremium ? '🔒 Pendek' : 'Buat Versi Pendek'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('medium', 'kesimpulanDraft')}
                                disabled={isLoading || !projectData.kesimpulanDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'}`}
                            >
                                {!isPremium ? '🔒 Sedang' : 'Buat Versi Sedang'}
                            </button>
                            <button 
                                onClick={() => handleModifyText('lengthen', 'kesimpulanDraft')}
                                disabled={isLoading || !projectData.kesimpulanDraft || !isPremium}
                                className={`text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300'}`}
                            >
                                {!isPremium ? '🔒 Panjang' : 'Buat Versi Panjang'}
                            </button>
                        </div>
                        {/* --- TOMBOL BARU DITAMBAHKAN DI SINI --- */}
<button 
    onClick={() => handleModifyText('humanize', 'kesimpulanDraft')}
    disabled={isLoading || !projectData.kesimpulanDraft || !isPremium}
    className={`mt-2 text-white text-sm font-bold py-2 px-3 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'}`}
>
    {!isPremium ? '🔒 Parafrasa (Premium)' : 'Parafrasa (Humanisasi)'}
</button>
{/* --- AKHIR TOMBOL BARU --- */}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen baru untuk PRISMA SLR ---
const PrismaSLR = ({ projectData, setProjectData, showInfoModal, handleAiReview, geminiApiKeys }) => { // UPDATE: Terima geminiApiKeys
    // FIX: Panggil semua hooks di level atas tanpa kondisional.
    const { prismaState } = projectData || {}; // Destructuring aman jika projectData belum ada
    const [currentStage, setCurrentStage] = useState('setup');
    const [exclusionModal, setExclusionModal] = useState({ isOpen: false, studyId: null, screeningType: '' });
    const [exclusionReason, setExclusionReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [expandedAbstractId, setExpandedAbstractId] = useState(null);
    const [aiReviews, setAiReviews] = useState({});
    const [reviewingId, setReviewingId] = useState(null);
    const svgRef = useRef(null); // Tambahkan ref untuk SVG
    const [showSvgHelp, setShowSvgHelp] = useState(false); // FIX: Pindahkan state hook ke level atas komponen
    // --- STATE BARU UNTUK TUTORIAL ESTECH ---
    const [showEstechHelp, setShowEstechHelp] = useState(false);
    // ----------------------------------------
    const [reviewingList, setReviewingList] = useState(null); // State baru untuk tab review

    // --- STATE BARU UNTUK FULLTEXT AI SCREENING ---
    const [showFulltextModal, setShowFulltextModal] = useState(false);
    const [fulltextInput, setFulltextInput] = useState('');
    const [fulltextAnalysis, setFulltextAnalysis] = useState(null);
    const [isAnalyzingFulltext, setIsAnalyzingFulltext] = useState(false);
    // ----------------------------------------------

    // --- STATE BARU UNTUK RESET PRISMA ---
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    // -------------------------------------

    // --- STATE BARU UNTUK SELEKSI AWAL PRISMA (LANGKAH 2) ---
    const [isPrismaSelectionModalOpen, setIsPrismaSelectionModalOpen] = useState(false);
    const [selectedPrismaIds, setSelectedPrismaIds] = useState([]);
    // --------------------------------------------------------

    // --- EFEK BARU: OTOMATIS PILIH RIS (AUTO-INCLUDE) ---
    useEffect(() => {
        // Hanya jalankan jika PRISMA belum diinisialisasi (masih tahap Setup)
        // DAN belum ada seleksi manual (selectedPrismaIds kosong)
        if (!prismaState?.isInitialized && selectedPrismaIds.length === 0) {
            
            // Cari semua referensi yang bersumber dari file RIS
            const risIds = projectData.allReferences
                .filter(ref => ref.source === 'external_ris')
                .map(ref => ref.id);
            
            // Jika ada data RIS, otomatis masukkan ke seleksi
            if (risIds.length > 0) {
                setSelectedPrismaIds(risIds);
            }
        }
    }, [projectData.allReferences, prismaState?.isInitialized, selectedPrismaIds.length]); // FIX: Tambahkan selectedPrismaIds.length
    // ---------------------------------------------------

    // Efek untuk inisialisasi state PRISMA jika belum ada.
    useEffect(() => {
        if (!projectData.prismaState) {
            setProjectData(p => ({
                ...p,
                prismaState: initialProjectData.prismaState
            }));
        }
    }, [projectData.prismaState, setProjectData]);

    // Efek untuk mengatur stage saat ini.
    useEffect(() => {
        // Gunakan optional chaining (?.) untuk mencegah error jika prismaState masih null/undefined
        if (prismaState?.isInitialized) {
            const hasUnscreenedAbstracts = prismaState.studies.some(s => s.screeningStatus === 'unscreened');
            const hasUnscreenedFulltexts = prismaState.studies.some(s => s.screeningStatus === 'abstract_included');

            if (hasUnscreenedAbstracts) {
                setCurrentStage('abstract_screening');
            } else if (hasUnscreenedFulltexts) {
                setCurrentStage('fulltext_screening');
            } else {
                setCurrentStage('results');
            }
        } else {
            setCurrentStage('setup');
        }
    }, [prismaState?.isInitialized, prismaState?.studies]);

    // FIX: Kondisional return dilakukan SETELAH semua hooks dipanggil.
    if (!prismaState) {
        return <div className="p-6 text-center">Menginisialisasi Modul PRISMA...</div>;
    }

    // --- FUNGSI BARU: RESET PRISMA ---
    const handleResetPrisma = () => {
        // Reset state PRISMA ke default (uninitialized)
        setProjectData(p => ({
            ...p,
            prismaState: {
                ...initialProjectData.prismaState, // Kembali ke struktur awal (kosong)
                // Opsional: Jika ingin mempertahankan angka input user sebelumnya, bisa dilakukan manual di sini,
                // tapi "Reset Total" lebih aman untuk menghindari inkonsistensi.
            }
        }));
        setCurrentStage('setup');
        setShowResetConfirm(false);
        showInfoModal("PRISMA SLR telah di-reset. Anda dapat memulai konfigurasi dari awal.");
    };
    // ---------------------------------

    const handleRevertDecision = (studyId, targetStage) => {
        setProjectData(p => {
            const updatedStudies = p.prismaState.studies.map(study => {
                if (study.id === studyId) {
                    return { ...study, screeningStatus: targetStage, exclusionReason: '' };
                }
                return study;
            });
            return { ...p, prismaState: { ...p.prismaState, studies: updatedStudies } };
        });
        showInfoModal("Keputusan telah diubah. Artikel akan muncul kembali di antrean screening yang sesuai.");
    };

    // --- FUNGSI BARU: NAVIGASI STUDY (LANJUTKAN / KEMBALI) ---
    const handleNavigateStudy = (studyId, direction) => {
        setProjectData(p => {
            const studies = [...p.prismaState.studies];
            // Cari index dokumen yang sedang ditampilkan (biasanya yang pertama ditemukan dengan status target)
            const currentIndex = studies.findIndex(s => s.id === studyId);
            
            if (currentIndex === -1) return p;

            const currentStatus = studies[currentIndex].screeningStatus;

            if (direction === 'next') {
                // Logic Lanjutkan: Pindahkan item saat ini ke paling belakang (antrean akhir)
                const [moved] = studies.splice(currentIndex, 1);
                studies.push(moved);
            } else if (direction === 'prev') {
                // Logic Kembali: Ambil item PALING BELAKANG (dengan status sama) dan pindahkan ke DEPAN item saat ini
                // Cari index terakhir yang punya status sama
                let lastIndex = -1;
                for (let i = studies.length - 1; i >= 0; i--) {
                    if (studies[i].screeningStatus === currentStatus) {
                        lastIndex = i;
                        break;
                    }
                }

                // Jika ditemukan dan bukan item yang sama (artinya ada antrean di belakang)
                if (lastIndex > -1 && lastIndex !== currentIndex) {
                    const [moved] = studies.splice(lastIndex, 1);
                    studies.splice(currentIndex, 0, moved);
                }
            }
            
            return {
                ...p,
                prismaState: {
                    ...p.prismaState,
                    studies: studies
                }
            };
        });
    };
    // ----------------------------------------

    // --- FUNGSI BARU: ANALISIS FULLTEXT ---
    const handleAnalyzeFulltext = async () => {
        if (!fulltextInput.trim()) {
            showInfoModal("Silakan tempel isi teks paper terlebih dahulu.");
            return;
        }
        if (!projectData.isPremium) {
            showInfoModal("Fitur Analisis Fulltext AI khusus untuk pengguna Premium.");
            return;
        }

        setIsAnalyzingFulltext(true);
        setFulltextAnalysis(null);

        const prompt = `Anda adalah asisten peneliti ahli untuk Systematic Literature Review (SLR).
        Tugas: Evaluasi kelayakan artikel berikut untuk diinklusi dalam penelitian ini berdasarkan teks lengkap (fulltext) yang diberikan.

        **Konteks Penelitian:**
        - Judul/Topik: "${projectData.judulKTI || projectData.topikTema}"
        - Tujuan: "${projectData.tujuanPenelitianDraft || 'Tidak ditentukan'}"

        **Teks Artikel (Fulltext/Partial):**
        "${fulltextInput.substring(0, 15000)}" 
        *(Catatan: Teks mungkin terpotong jika terlalu panjang, fokus pada bagian yang ada)*

        **Instruksi Analisis:**
        1. **Ringkasan Singkat:** Apa inti dari paper ini?
        2. **Relevansi:** Seberapa relevan paper ini dengan topik penelitian saya? (Sangat Relevan / Relevan / Kurang Relevan / Tidak Relevan).
        3. **Rekomendasi Keputusan:** Apakah sebaiknya di-INCLUDE atau EXCLUDE?
        4. **Alasan:** Jelaskan alasan keputusan tersebut secara objektif.

        Berikan jawaban dalam format JSON:
        {
            "summary": "...",
            "relevance_level": "...",
            "recommendation": "INCLUDE" | "EXCLUDE",
            "reason": "..."
        }`;

        const schema = {
            type: "OBJECT",
            properties: {
                summary: { type: "STRING" },
                relevance_level: { type: "STRING" },
                recommendation: { type: "STRING", enum: ["INCLUDE", "EXCLUDE"] },
                reason: { type: "STRING" }
            },
            required: ["summary", "relevance_level", "recommendation", "reason"]
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
            setFulltextAnalysis(result);
        } catch (error) {
            showInfoModal(`Gagal menganalisis fulltext: ${error.message}`);
        } finally {
            setIsAnalyzingFulltext(false);
        }
    };
    // -------------------------------------

    const toggleAbstract = (paperId) => {
        setExpandedAbstractId(prevId => (prevId === paperId ? null : paperId));
    };

    const runAiReview = async (paper) => {
        if (reviewingId) return; 
        const abstractText = paper.abstract || paper.isiKutipan;
        if (!abstractText) {
            showInfoModal("Review AI memerlukan abstrak. Abstrak atau catatan tidak tersedia untuk paper ini.");
            return;
        }
        setReviewingId(paper.id);
        try {
            const searchContext = projectData.topikTema || projectData.judulKTI;
            const paperForReview = {
                ...paper,
                abstract: abstractText,
                paperId: paper.id 
            };
            const result = await handleAiReview(paperForReview, searchContext);
            setAiReviews(prev => ({ ...prev, [paper.id]: result }));
        } catch (error) {
            showInfoModal(error.message);
        } finally {
            setReviewingId(null);
        }
    };

    const handleDownloadSVG = () => {
        if (!svgRef.current) {
            showInfoModal("Elemen diagram tidak ditemukan.");
            return;
        }

        // Menambahkan style inline agar ekspor tetap konsisten
        const styleEl = svgRef.current.querySelector('style');
        const styleContent = styleEl ? styleEl.innerHTML : '';
        const svgClone = svgRef.current.cloneNode(true);
        
        // Menambahkan latar belakang putih pada SVG yang diekspor
        const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        backgroundRect.setAttribute('width', '100%');
        backgroundRect.setAttribute('height', '100%');
        backgroundRect.setAttribute('fill', 'white');
        svgClone.insertBefore(backgroundRect, svgClone.firstChild);

        const newStyleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
        newStyleEl.textContent = styleContent;
        svgClone.insertBefore(newStyleEl, svgClone.firstChild.nextSibling);

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = "prisma_flow_diagram.svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPNG = () => {
        if (!svgRef.current) {
            showInfoModal("Elemen diagram tidak ditemukan.");
            return;
        }

        // Clone SVG dan tambahkan style/latar belakang untuk ekspor
        const styleEl = svgRef.current.querySelector('style');
        const styleContent = styleEl ? styleEl.innerHTML : '';
        const svgClone = svgRef.current.cloneNode(true);
        const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        backgroundRect.setAttribute('width', '100%');
        backgroundRect.setAttribute('height', '100%');
        backgroundRect.setAttribute('fill', 'white');
        svgClone.insertBefore(backgroundRect, svgClone.firstChild);
        const newStyleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
        newStyleEl.textContent = styleContent;
        svgClone.insertBefore(newStyleEl, svgClone.firstChild.nextSibling);

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const viewBox = svgRef.current.viewBox.baseVal;
            // Untuk resolusi lebih tinggi, kita bisa menskalakan kanvas
            const scale = 2;
            canvas.width = viewBox.width * scale;
            canvas.height = viewBox.height * scale;
            
            const ctx = canvas.getContext('2d');
            
            // FIX FUNDAMENTAL: Menggambar gambar dengan paksa agar sesuai dengan ukuran kanvas penuh.
            // Ini akan memastikan tidak ada bagian yang terpotong.
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const pngUrl = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.download = 'prisma_flow_diagram.png';
            link.href = pngUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Membersihkan blob URL
        };
        img.onerror = () => {
            showInfoModal("Gagal memuat gambar SVG untuk konversi.");
            URL.revokeObjectURL(url); // Membersihkan blob URL
        }
        img.src = url;
    };

    const getRelevanceStyles = (category) => {
        switch (category) {
            case 'Sangat Relevan':
                return { container: 'bg-green-50 border-green-300', header: 'text-green-800', badge: 'bg-green-100 text-green-800' };
            case 'Relevan':
                return { container: 'bg-yellow-50 border-yellow-300', header: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' };
            case 'Tidak Relevan':
                return { container: 'bg-red-50 border-red-300', header: 'text-red-800', badge: 'bg-red-100 text-red-800' };
            default:
                return { container: 'bg-gray-50 border-gray-300', header: 'text-gray-800', badge: 'bg-gray-100 text-gray-800' };
        }
    };

    // --- REVISI ALUR INISIALISASI (LANGKAH 1): Buka Modal ---
    const handleOpenPrismaSelection = () => {
        if (projectData.allReferences.length === 0) {
            showInfoModal("Perpustakaan kosong. Tambahkan referensi terlebih dahulu.");
            return;
        }
        
        // --- UPDATE LOGIKA: Cek ulang saat buka modal (Redundansi aman) ---
        if (selectedPrismaIds.length === 0) {
             const risIds = projectData.allReferences
                .filter(ref => ref.source === 'external_ris')
                .map(ref => ref.id);
             
             if (risIds.length > 0) {
                 setSelectedPrismaIds(risIds);
             }
        }
        // ------------------------------------------------------------------

        // Modal dibuka. Karena useEffect otomatis dihapus, seleksi akan sesuai state terakhir (atau kosong di awal)
        setIsPrismaSelectionModalOpen(true);
    };

    // --- HELPER UNTUK MODAL SELEKSI ---
    const handleTogglePrismaSelect = (id) => {
        setSelectedPrismaIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAllPrisma = (select) => {
        if (select) {
            setSelectedPrismaIds(projectData.allReferences.map(ref => ref.id));
        } else {
            setSelectedPrismaIds([]);
        }
    };

    // --- FITUR BARU: PILIH KHUSUS RIS ---
    const handleSelectRisPrisma = () => {
        const risIds = projectData.allReferences
            .filter(ref => ref.source === 'external_ris')
            .map(ref => ref.id);
        
        if (risIds.length === 0) {
            showInfoModal("Tidak ditemukan referensi dari file RIS.");
            return;
        }
        setSelectedPrismaIds(risIds);
    };
    // ------------------------------------

    // --- LANGKAH BARU: SIMPAN SELEKSI DARI MODAL (Tanpa Mulai Screening) ---
    const handleSavePrismaSelection = () => {
        setIsPrismaSelectionModalOpen(false);
        // Tidak melakukan apa-apa selain menutup modal, karena selectedPrismaIds sudah terupdate realtime
        // Angka di Setup akan otomatis berubah karena re-render
    };

    // --- LANGKAH 3: EKSEKUSI FINALISASI (TOMBOL DI HALAMAN SETUP) ---
    const handleFinalizePrismaSetup = () => {
        const studiesToScreen = projectData.allReferences.filter(ref => selectedPrismaIds.includes(ref.id));
        
        if (studiesToScreen.length === 0) {
            showInfoModal("Pilih minimal satu referensi untuk memulai screening.");
            return;
        }

        // PERBAIKAN: Gunakan nilai manual jika sudah diisi user, jika 0 baru hitung dari log
        let initialRecordCount = prismaState.initialRecordCount;
        
        if (initialRecordCount === 0) {
             // Prioritaskan hitungan dari Log Kueri jika ada
             const logTotal = projectData.searchLog.reduce((sum, log) => sum + log.resultsCount, 0);
             // Jika log 0, gunakan jumlah riil dataset yang akan di-screen
             initialRecordCount = logTotal > 0 ? logTotal : studiesToScreen.length;
        }

        // Mapping hanya data yang terpilih (Filtered)
        const studies = studiesToScreen.map(ref => ({
            ...ref,
            screeningStatus: 'unscreened', // unscreened, abstract_included, abstract_excluded, fulltext_included, fulltext_excluded
            exclusionReason: '',
        }));

        // Fallback jika initial masih 0
        if (initialRecordCount === 0) initialRecordCount = studies.length;

        setProjectData(p => ({
            ...p,
            prismaState: {
                ...p.prismaState,
                isInitialized: true,
                studies: studies,
                initialRecordCount: initialRecordCount, 
            }
        }));
        
        showInfoModal(`Proses Screening PRISMA dimulai! ${studies.length} referensi masuk ke tahap screening.`);
    };

    const handleScreeningDecision = (studyId, newStatus, reason = '') => {
        setProjectData(p => ({
            ...p,
            prismaState: {
                ...p.prismaState,
                studies: p.prismaState.studies.map(study =>
                    study.id === studyId ? { ...study, screeningStatus: newStatus, exclusionReason: reason } : study
                )
            }
        }));
    };
    
    const openExclusionModal = (studyId, screeningType) => {
        setExclusionReason('');
        setCustomReason('');
        setExclusionModal({ isOpen: true, studyId, screeningType });
    };

    const handleConfirmExclusion = () => {
        const finalReason = exclusionReason === 'Lainnya' ? customReason : exclusionReason;
        if (!finalReason) {
            showInfoModal("Alasan pengecualian harus diisi.");
            return;
        }
        const newStatus = exclusionModal.screeningType === 'abstract' ? 'abstract_excluded' : 'fulltext_excluded';
        handleScreeningDecision(exclusionModal.studyId, newStatus, finalReason);
        setExclusionModal({ isOpen: false, studyId: null, screeningType: '' });
    };

    const calculateCounts = () => {
        // FIX: Pastikan semua nilai memiliki default 0 untuk mencegah NaN
        const { 
            studies = [], 
            initialRecordCount = 0, 
            duplicateCount = 0, 
            automationIneligible = 0, 
            otherReasonsRemoved = 0, 
            reportsNotRetrieved = 0 
        } = prismaState || {};

        const identification_databases = initialRecordCount;
        const records_after_duplicates = identification_databases - duplicateCount;
        const records_screened = records_after_duplicates - automationIneligible - otherReasonsRemoved;

        const records_excluded = studies.filter(s => s.screeningStatus === 'abstract_excluded').length;
        const reports_sought_for_retrieval = records_screened - records_excluded;
        
        const reports_not_retrieved_count = reportsNotRetrieved;
        const reports_assessed_for_eligibility = reports_sought_for_retrieval - reports_not_retrieved_count;
        
        const reports_excluded_fulltext = studies.filter(s => s.screeningStatus === 'fulltext_excluded').length;
        const studies_included_in_review = reports_assessed_for_eligibility - reports_excluded_fulltext;

        return {
            identification_databases,
            duplicateCount,
            automationIneligible,
            otherReasonsRemoved,
            records_screened,
            records_excluded,
            reports_sought_for_retrieval,
            reports_not_retrieved_count,
            reports_assessed_for_eligibility,
            reports_excluded_fulltext,
            studies_included_in_review,
        };
    };

    // --- MODIFIKASI TAMPILAN SETUP PRISMA ---
    const renderSetup = () => {
        const logTotal = projectData.searchLog.reduce((sum, log) => sum + log.resultsCount, 0);
        
        // --- LOGIKA BARU: HITUNG BERDASARKAN SELEKSI ---
        // Jika selectedPrismaIds kosong (misal library kosong), importedTotal = 0
        // Jika ada isi, hitung jumlahnya.
        const importedTotal = selectedPrismaIds.length;
        // ----------------------------------------------
        
        // Hitung keseimbangan
        const manualInitial = prismaState.initialRecordCount > 0 ? prismaState.initialRecordCount : logTotal;
        const removed = (prismaState.duplicateCount || 0) + (prismaState.automationIneligible || 0) + (prismaState.otherReasonsRemoved || 0);
        const calculatedScreened = manualInitial - removed;
        const gap = calculatedScreened - importedTotal; // Selisih antara hitungan matematis dan data riil TERPILIH

        return (
        <div className="text-center animate-fade-in">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Konfigurasi Awal PRISMA</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto text-sm">Ikuti 3 langkah di bawah ini untuk memulai proses penyaringan studi secara metodologis.</p>
            
            {/* --- LANGKAH 1: SELEKSI DATASET (DIPINDAHKAN KE ATAS) --- */}
            <div className="mb-6 p-4 bg-white border-2 border-blue-100 rounded-xl shadow-sm text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg">Langkah 1</div>
                <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h4 className="font-bold text-gray-800 text-lg">Pilih Dataset Referensi</h4>
                        <p className="text-sm text-gray-600">Tentukan referensi mana dari perpustakaan yang akan dijadikan input screening. Pisahkan antara data SLR dan referensi umum.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-2xl font-bold text-blue-600">{importedTotal} <span className="text-sm text-gray-500 font-normal">Artikel Terpilih</span></span>
                        <button 
                            onClick={handleOpenPrismaSelection} 
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
                            Ubah Seleksi
                        </button>
                    </div>
                </div>
            </div>
            {/* -------------------------------------------------------- */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left relative">
                <div className="absolute -top-3 -left-3 bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-lg z-10 shadow-sm">Langkah 2: Kalibrasi Angka</div>
                
                {/* KOLOM KIRI: INPUT RAW DATA */}
                <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">A. Data Identifikasi (Raw)</h4>
                    <p className="text-xs text-gray-600 mb-4">Total hasil pencarian mentah dari database SEBELUM deduplikasi/filter.</p>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Total Record Awal:</label>
                        <div className="flex gap-2">
                            <input 
                                type="number"
                                min="0"
                                value={prismaState.initialRecordCount}
                                onChange={e => setProjectData(p => ({...p, prismaState: {...p.prismaState, initialRecordCount: parseInt(e.target.value, 10) || 0 }}))}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                placeholder={logTotal}
                            />
                            {logTotal > 0 && (
                                <button 
                                    onClick={() => setProjectData(p => ({...p, prismaState: {...p.prismaState, initialRecordCount: logTotal }}))}
                                    className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-300 whitespace-nowrap"
                                    title="Gunakan total dari Log Kueri"
                                >
                                    Pakai Log ({logTotal})
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KOLOM KANAN: INPUT PENGURANGAN */}
                <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-bold text-yellow-800 mb-3 border-b border-yellow-200 pb-2">B. Filter Awal (Otomatis/Luar App)</h4>
                    <p className="text-xs text-yellow-700 mb-4">Jumlah record yang dibuang SEBELUM masuk ke aplikasi ini.</p>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-gray-700 text-xs font-bold">Duplikat dihapus:</label>
                            <input 
                                type="number"
                                min="0"
                                value={prismaState.duplicateCount}
                                onChange={e => setProjectData(p => ({...p, prismaState: {...p.prismaState, duplicateCount: parseInt(e.target.value, 10) || 0 }}))}
                                className="shadow appearance-none border rounded w-20 py-1 px-2 text-sm text-gray-700 text-right"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="block text-gray-700 text-xs font-bold">Ineligible by automation:</label>
                            <input 
                                type="number"
                                min="0"
                                value={prismaState.automationIneligible}
                                onChange={e => setProjectData(p => ({...p, prismaState: {...p.prismaState, automationIneligible: parseInt(e.target.value, 10) || 0 }}))}
                                className="shadow appearance-none border rounded w-20 py-1 px-2 text-sm text-gray-700 text-right"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="block text-gray-700 text-xs font-bold">Alasan lain:</label>
                            <input 
                                type="number"
                                min="0"
                                value={prismaState.otherReasonsRemoved}
                                onChange={e => setProjectData(p => ({...p, prismaState: {...p.prismaState, otherReasonsRemoved: parseInt(e.target.value, 10) || 0 }}))}
                                className="shadow appearance-none border rounded w-20 py-1 px-2 text-sm text-gray-700 text-right"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KALKULATOR KESEIMBANGAN */}
            <div className={`mt-6 p-4 rounded-lg border-2 max-w-2xl mx-auto transition-colors duration-300 ${gap === 0 ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                <h4 className={`font-bold ${gap === 0 ? 'text-green-800' : 'text-red-800'} mb-2`}>
                    Status Data: {gap === 0 ? "SEIMBANG ✅" : "TIDAK SEIMBANG ⚠️"}
                </h4>
                <div className="flex justify-between text-sm mb-1 px-4">
                    <span>(A) Total Record Awal:</span>
                    <strong>{manualInitial}</strong>
                </div>
                <div className="flex justify-between text-sm mb-1 px-4 text-red-600">
                    <span>(B) Total Filter Awal:</span>
                    <strong>- {removed}</strong>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-300 px-4">
                    <span>(A - B) Seharusnya Masuk App:</span>
                    <strong>{calculatedScreened}</strong>
                </div>
                <div className="flex justify-between text-sm px-4 mt-1 bg-white/50 py-1 rounded">
                    <span>(Langkah 1) Artikel Terpilih:</span>
                    <strong>{importedTotal}</strong>
                </div>
                
                {gap !== 0 && (
                    <div className="mt-3 text-xs text-red-700 bg-red-100 p-2 rounded">
                        <strong>Selisih: {Math.abs(gap)} record.</strong> <br/>
                        Harap sesuaikan angka di Langkah 2 (Kolom Kuning) agar hasil hitungan sama dengan jumlah Artikel Terpilih di Langkah 1.
                    </div>
                )}
            </div>

            <div className="mt-8 border-t pt-6">
                <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">Langkah 3</span>
                <br/>
                <button 
                    onClick={handleFinalizePrismaSetup} 
                    className={`mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg transform hover:-translate-y-1 transition-all ${gap !== 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={gap !== 0}
                    title={gap !== 0 ? "Harap seimbangkan data terlebih dahulu" : ""}
                >
                    Mulai Screening PRISMA
                </button>
                {gap !== 0 && <p className="text-xs text-red-500 mt-2">Tombol terkunci sampai data seimbang.</p>}
            </div>
        </div>
    );
    }; // END renderSetup
    
    const renderScreening = (type) => {
        // ... (Existing code for renderScreening)
        const isAbstract = type === 'abstract';
        const targetStatus = isAbstract ? 'unscreened' : 'abstract_included';
        const studyToScreen = prismaState.studies.find(s => s.screeningStatus === targetStatus);

        if (!studyToScreen) {
            return (
                <div className="text-center p-8">
                    <p className="text-lg text-green-600 font-semibold">Tahap screening ini selesai!</p>
                    <p className="text-gray-600 mt-2">
                        {isAbstract 
                            ? "Silakan lanjutkan ke tahap screening full-text." 
                            : "Semua studi telah disaring. Lihat diagram PRISMA di tab Hasil."
                        }
                    </p>
                </div>
            );
        }

        const total = isAbstract 
            ? prismaState.studies.length
            : prismaState.studies.filter(s => ['abstract_included', 'fulltext_excluded', 'fulltext_included'].includes(s.screeningStatus)).length;
        const screened = total - prismaState.studies.filter(s => s.screeningStatus === targetStatus).length;

        return (
            <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">
                    {isAbstract ? 'Screening Abstrak' : 'Screening Full-Text'}
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(screened / total) * 100}%` }}></div>
                </div>
                <p className="text-sm text-gray-600 mb-4 text-center">Progress: {screened} / {total}</p>

                <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-bold text-lg text-gray-800">{studyToScreen.title}</h4>
                    <p className="text-sm text-gray-600 my-2">{studyToScreen.author} ({studyToScreen.year})</p>
                    <p className="text-xs italic text-gray-500">{studyToScreen.journal?.name || studyToScreen.journal}</p>
                    {studyToScreen.doi && <a href={`https://doi.org/${studyToScreen.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">DOI: {studyToScreen.doi}</a>}
                    
                    <div className="mt-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <button onClick={() => toggleAbstract(studyToScreen.id)} className="text-xs text-blue-600 hover:underline font-semibold">
                                {expandedAbstractId === studyToScreen.id ? 'Sembunyikan Abstrak / Catatan' : 'Tampilkan Abstrak / Catatan'}
                            </button>
                            <button 
                                onClick={() => runAiReview(studyToScreen)} 
                                className="text-xs text-purple-600 hover:underline font-semibold disabled:text-gray-400 disabled:no-underline"
                                disabled={reviewingId === studyToScreen.id}
                            >
                                {reviewingId === studyToScreen.id ? 'Mereview...' : '✨ Review Abstract AI'}
                            </button>
                            
                            {/* --- TOMBOL BARU: PASTE FULLTEXT --- */}
                            {!isAbstract && (
                                <button 
                                    onClick={() => {
                                        setFulltextInput('');
                                        setFulltextAnalysis(null);
                                        setShowFulltextModal(true);
                                    }}
                                    className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 font-semibold flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/>
                                    </svg>
                                    Paste Isi Paper (AI Check)
                                </button>
                            )}
                            {/* ----------------------------------- */}
                        </div>
                        {expandedAbstractId === studyToScreen.id && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                                <h5 className="font-semibold text-sm mb-2">Abstrak / Catatan</h5>
                                <p className="text-sm text-gray-700 max-h-40 overflow-y-auto">
                                    {studyToScreen.abstract || studyToScreen.isiKutipan || "Tidak ada catatan atau abstrak."}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {reviewingId === studyToScreen.id && !aiReviews[studyToScreen.id] && (
                        <div className="mt-3 flex items-center text-xs text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                            AI sedang mereview...
                        </div>
                    )}
                    {aiReviews[studyToScreen.id] && (
                        <div className={`mt-3 p-3 border-l-4 rounded-r-lg ${getRelevanceStyles(aiReviews[studyToScreen.id].kategori_relevansi).container}`}>
                            <div className="flex justify-between items-center">
                                <h6 className={`text-sm font-bold ${getRelevanceStyles(aiReviews[studyToScreen.id].kategori_relevansi).header}`}>AI Review</h6>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRelevanceStyles(aiReviews[studyToScreen.id].kategori_relevansi).badge}`}>
                                    {aiReviews[studyToScreen.id].kategori_relevansi}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-700 space-y-2">
                                <div>
                                    <p className="font-semibold">Temuan Kunci:</p>
                                    <p className="italic">"{aiReviews[studyToScreen.id].finding}"</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Analisis Relevansi:</p>
                                    <p>{aiReviews[studyToScreen.id].relevansi}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-center gap-4 flex-wrap">
                    {/* Urutan Baru: Include - Exclude - Kembali - Lanjutkan */}
                    
                    <button onClick={() => handleScreeningDecision(studyToScreen.id, isAbstract ? 'abstract_included' : 'fulltext_included')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm">
                        Include
                    </button>

                    <button onClick={() => openExclusionModal(studyToScreen.id, isAbstract ? 'abstract' : 'fulltext')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm">
                        Exclude
                    </button>

                    <button 
                        onClick={() => handleNavigateStudy(studyToScreen.id, 'prev')} 
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm flex items-center gap-2"
                        title="Kembali ke dokumen sebelumnya (Ambil dari akhir antrean)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z"/></svg>
                        Kembali
                    </button>
                    
                    <button 
                        onClick={() => handleNavigateStudy(studyToScreen.id, 'next')} 
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm flex items-center gap-2"
                        title="Lewati dokumen ini dan kerjakan nanti (Pindah ke akhir antrean)"
                    >
                        Lanjutkan
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"/></svg>
                    </button>
                </div>
            </div>
        );
    };

    const renderReview = () => {
        // ... (Existing code for renderReview)
        const reviewLists = [
            { status: 'abstract_excluded', label: 'Ditolak (Abstrak)', revertTo: 'unscreened' },
            { status: 'abstract_included', label: 'Diterima (Abstrak)', revertTo: 'unscreened' },
            { status: 'fulltext_excluded', label: 'Ditolak (Full-Text)', revertTo: 'abstract_included' },
            { status: 'fulltext_included', label: 'Diterima (Full-Text)', revertTo: 'abstract_included' },
        ];

        const studiesToList = reviewingList
            ? prismaState.studies.filter(s => s.screeningStatus === reviewingList.status)
            : [];

        return (
            <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Review & Revisi Keputusan Screening</h3>
                <p className="text-sm text-gray-600 mb-4">Pilih daftar untuk melihat studi yang telah Anda saring. Anda dapat mengubah keputusan Anda, yang akan mengembalikan studi ke antrean screening sebelumnya.</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                    {reviewLists.map(list => (
                        <button
                            key={list.status}
                            onClick={() => setReviewingList(list)}
                            className={`py-2 px-4 rounded-lg text-sm font-semibold ${reviewingList?.status === list.status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            {list.label} ({prismaState.studies.filter(s => s.screeningStatus === list.status).length})
                        </button>
                    ))}
                </div>

                {reviewingList && (
                    <div>
                        <h4 className="font-bold text-lg text-gray-800 mb-2">Daftar: {reviewingList.label}</h4>
                        {studiesToList.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border-t pt-4">
                                {studiesToList.map(study => (
                                    <div key={study.id} className="bg-white p-3 rounded-lg border border-gray-200">
                                        <p className="font-semibold text-gray-800">{study.title}</p>
                                        <p className="text-xs text-gray-600">{study.author} ({study.year})</p>
                                        {study.screeningStatus.includes('excluded') && study.exclusionReason && (
                                            <p className="text-xs text-red-600 mt-1">Alasan: {study.exclusionReason}</p>
                                        )}
                                        <button
                                            onClick={() => handleRevertDecision(study.id, reviewingList.revertTo)}
                                            className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-2 rounded-lg"
                                        >
                                            Ubah Keputusan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic mt-4">Tidak ada studi dalam daftar ini.</p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderResults = () => {
        // ... (Existing code for renderResults - no changes)
        // Jika belum diinisialisasi, jangan render apa pun
        if (!prismaState.isInitialized) return null;

        const counts = calculateCounts();
        
        // Mendapatkan alasan eksklusi yang unik untuk full-text
        const fulltextExclusionReasons = prismaState.studies
            .filter(s => s.screeningStatus === 'fulltext_excluded' && s.exclusionReason)
            .reduce((acc, study) => {
                acc[study.exclusionReason] = (acc[study.exclusionReason] || 0) + 1;
                return acc;
            }, {});
        
        // ====================================================================
        // PENDEKATAN BARU: DEFINISI STRUKTUR DIAGRAM SECARA DEKLARATIF
        // ====================================================================

        const boxWidth = 350;
        const sideBoxWidth = 250;
        const mainX = 150;
        const sideX = mainX + boxWidth + 100; // Menambah jarak agar tidak terlalu mepet
        
        // Hitung tinggi dinamis untuk kotak eksklusi
        const exclusionBoxHeight = 60 + Object.keys(fulltextExclusionReasons).length * 18;

        // Mendefinisikan semua 'node' (kotak) dalam diagram
        const nodes = {
            identification_header: { x: mainX, y: 20, width: boxWidth, height: 70, content: () => <text x={mainX + boxWidth / 2} y={55} textAnchor="middle" className="prisma-text prisma-text-bold">Identifikasi studi via database dan register</text> },
            db_records: { x: mainX, y: 120, width: boxWidth, height: 50, content: () => <text x={mainX + 10} y={150} className="prisma-text">Jumlah record diidentifikasi dari database (n = {counts.identification_databases})</text> },
            pre_screening: { x: sideX, y: 150, width: sideBoxWidth, height: 100, content: () => (
                <text x={sideX + 10} y={170} className="prisma-text">
                    <tspan className="prisma-text-bold">Record dibuang sebelum screening:</tspan>
                    <tspan x={sideX + 10} dy="1.5em">- Record duplikat dibuang (n = {counts.duplicateCount})</tspan>
                    <tspan x={sideX + 10} dy="1.2em">- Record ditandai tidak eligibel oleh</tspan>
                    <tspan x={sideX + 10} dy="1.2em">  automation tools (n = {counts.automationIneligible})</tspan>
                    <tspan x={sideX + 10} dy="1.2em">- Record dibuang karena alasan lain (n = {counts.otherReasonsRemoved})</tspan>
                </text>
            )},
            records_screened: { x: mainX, y: 280, width: boxWidth, height: 50, content: () => <text x={mainX + 10} y={310} className="prisma-text">Jumlah record di-screen (n = {counts.records_screened})</text> },
            records_excluded: { x: sideX, y: 280, width: sideBoxWidth, height: 50, content: () => <text x={sideX + 10} y={310} className="prisma-text">Record dieksklusi (n = {counts.records_excluded})</text> },
            reports_sought: { x: mainX, y: 360, width: boxWidth, height: 50, content: () => <text x={mainX + 10} y={390} className="prisma-text">Jumlah report dicari untuk retrieval (n = {counts.reports_sought_for_retrieval})</text> },
            reports_not_retrieved: { x: sideX, y: 360, width: sideBoxWidth, height: 50, content: () => <text x={sideX + 10} y={390} className="prisma-text">Report tidak di-retrieve (n = {counts.reports_not_retrieved_count})</text> },
            reports_assessed: { x: mainX, y: 440, width: boxWidth, height: 50, content: () => <text x={mainX + 10} y={470} className="prisma-text">Jumlah report dinilai kelayakannya (n = {counts.reports_assessed_for_eligibility})</text> },
            reports_excluded_fulltext: { x: sideX, y: 440, width: sideBoxWidth, height: exclusionBoxHeight, content: () => (
                <text x={sideX + 10} y={460} className="prisma-text">
                    <tspan className="prisma-text-bold">Report dieksklusi (n = {counts.reports_excluded_fulltext}):</tspan>
                    {Object.entries(fulltextExclusionReasons).map(([reason, count]) => (
                        <tspan key={reason} x={sideX + 10} dy="1.4em">- {reason} (n={count})</tspan>
                    ))}
                </text>
            )},
            studies_included: { x: mainX, y: 520, width: boxWidth, height: 70, content: () => (
                <text x={mainX + boxWidth / 2} y={545} textAnchor="middle" className="prisma-text">
                    <tspan x={mainX + boxWidth/2} dy="0em" className="prisma-text-bold">Studi diinklusi dalam review</tspan>
                    <tspan x={mainX + boxWidth/2} dy="1.4em">(n = {counts.studies_included_in_review})</tspan>
                </text>
            )},
            studies_in_synthesis: { x: mainX, y: 620, width: boxWidth, height: 50, isFinal: true, content: () => <text x={mainX + 10} y={650} className="prisma-text">Jumlah studi diinklusi dalam sintesis (n = {counts.studies_included_in_review})</text> },
        };
        
        // Mendefinisikan semua 'edge' (konektor) antar node
        const edges = [
            { from: 'identification_header', to: 'db_records', type: 'vertical' },
            { from: 'db_records', to: 'records_screened', type: 'vertical' },
            { from: 'records_screened', to: 'reports_sought', type: 'vertical' },
            { from: 'reports_sought', to: 'reports_assessed', type: 'vertical' },
            { from: 'reports_assessed', to: 'studies_included', type: 'vertical' },
            { from: 'studies_included', to: 'studies_in_synthesis', type: 'vertical' },
            
            // Side connectors
            { from: { id: 'db_records', side: 'right' }, to: { id: 'pre_screening', side: 'left' }, type: 'elbow' },
            { from: { id: 'records_screened', side: 'right' }, to: { id: 'records_excluded', side: 'left' }, type: 'horizontal' },
            { from: { id: 'reports_sought', side: 'right' }, to: { id: 'reports_not_retrieved', side: 'left' }, type: 'horizontal' },
            { from: { id: 'reports_assessed', side: 'right' }, to: { id: 'reports_excluded_fulltext', side: 'left' }, type: 'horizontal' },
        ];

        // Fungsi helper untuk mendapatkan koordinat titik koneksi
        const getAttachPoint = (nodeId, side) => {
            const node = nodes[nodeId];
            if (!node) return { x: 0, y: 0 };
            switch (side) {
                case 'top': return { x: node.x + node.width / 2, y: node.y };
                case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
                case 'left': return { x: node.x, y: node.y + node.height / 2 };
                case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
                default: return { x: 0, y: 0 };
            }
        };

        return (
            <div>
                <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                    <h3 className="text-xl font-semibold text-gray-800 text-center flex-grow">Diagram Alir PRISMA 2020</h3>
                    <div className="flex items-center gap-2">
                        {/* --- TOMBOL BARU: PRISMA2020 APP --- */}
                        <a 
                            href="https://estech.shinyapps.io/prisma_flowdiagram/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-sm flex items-center gap-2"
                            title="Buka Generator Diagram PRISMA Resmi (Shiny App)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                                <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                            </svg>
                            PRISMA2020 App
                        </a>
                        {/* ----------------------------------- */}
                        <button onClick={handleDownloadSVG} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded-lg text-sm flex items-center gap-2">
                            <DownloadIcon />
                            Unduh SVG
                        </button>
                        <button onClick={handleDownloadPNG} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-sm flex items-center gap-2">
                            <DownloadIcon />
                            Unduh PNG
                        </button>
                    </div>
                </div>
                <div className="w-full overflow-x-auto p-4 bg-gray-50 rounded-lg border">
                    <svg ref={svgRef} viewBox="0 0 950 750" className="font-sans" aria-labelledby="prisma-title">
                        {/* ... (SVG Content remains same) ... */}
                        <title id="prisma-title">Diagram Alir PRISMA 2020</title>
                        <defs>
                            <style>{`
                                .prisma-box { fill: white; stroke: #4B5563; stroke-width: 1; }
                                .prisma-box-final { fill: #E8F5E9; stroke: #2E7D32; }
                                .prisma-text { font-size: 13px; fill: #111827; }
                                .prisma-text-bold { font-weight: bold; }
                                .prisma-arrow-line { stroke: #4B5563; stroke-width: 1; marker-end: url(#arrowhead); }
                                .prisma-arrow-line-no-marker { stroke: #4B5563; stroke-width: 1; }
                                .side-label { font-size: 14px; font-weight: bold; fill: #4B5563; }
                            `}</style>
                            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto" fill="#4B5563">
                                <polygon points="0 0, 8 3, 0 6" />
                            </marker>
                        </defs>

                        {/* Side Labels - FIX: Posisi disesuaikan */}
                        <text x="60" y={ (nodes.identification_header.y + nodes.db_records.y + nodes.db_records.height)/2 } transform={`rotate(-90, 60, ${(nodes.identification_header.y + nodes.db_records.y + nodes.db_records.height)/2})`} textAnchor="middle" className="side-label">Identifikasi</text>
                        <text x="60" y={ (nodes.records_screened.y + nodes.reports_assessed.y + nodes.reports_assessed.height)/2 } transform={`rotate(-90, 60, ${(nodes.records_screened.y + nodes.reports_assessed.y + nodes.reports_assessed.height)/2})`} textAnchor="middle" className="side-label">Screening</text>
                        <text x="60" y={ (nodes.studies_included.y + nodes.studies_in_synthesis.y + nodes.studies_in_synthesis.height)/2 } transform={`rotate(-90, 60, ${(nodes.studies_included.y + nodes.studies_in_synthesis.y + nodes.studies_in_synthesis.height)/2})`} textAnchor="middle" className="side-label">Inklusi</text>

                        {/* Render semua Kotak (Nodes) */}
                        {Object.values(nodes).map((node, i) => (
                            <g key={i}>
                                <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="3" className={node.isFinal ? "prisma-box-final" : "prisma-box"} />
                                {node.content()}
                            </g>
                        ))}
                        
                        {/* Render semua Konektor (Edges) secara dinamis */}
                        {edges.map((edge, i) => {
                            // FIX: Logika penggambaran garis yang disempurnakan untuk garis lurus sempurna
                            if (edge.type === 'vertical') {
                                const start = getAttachPoint(edge.from, 'bottom');
                                const end = getAttachPoint(edge.to, 'top');
                                return <line key={i} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="prisma-arrow-line"/>;
                            }
                            if (edge.type === 'horizontal') {
                                const start = getAttachPoint(edge.from.id, edge.from.side);
                                const end = getAttachPoint(edge.to.id, edge.to.side);
                                return <line key={i} x1={start.x} y1={start.y} x2={end.x} y2={start.y} className="prisma-arrow-line"/>;
                            }
                            if (edge.type === 'elbow') {
                                const p1 = getAttachPoint(edge.from.id, edge.from.side);
                                const p2 = getAttachPoint(edge.to.id, edge.to.side);
                                
                                // Titik siku untuk belokan 90 derajat yang sempurna
                                const elbowPoint = { x: p1.x + 50, y: p1.y };
                                const elbowPoint2 = { x: p1.x + 50, y: p2.y };
                                
                                return (
                                    <g key={i}>
                                        {/* Garis Horizontal dari kotak utama */}
                                        <line x1={p1.x} y1={p1.y} x2={elbowPoint.x} y2={elbowPoint.y} className="prisma-arrow-line-no-marker"/>
                                        {/* Garis Vertikal turun */}
                                        <line x1={elbowPoint.x} y1={elbowPoint.y} x2={elbowPoint2.x} y2={elbowPoint2.y} className="prisma-arrow-line-no-marker"/>
                                        {/* Garis Horizontal ke kotak samping */}
                                        <line x1={elbowPoint2.x} y1={elbowPoint2.y} x2={p2.x} y2={p2.y} className="prisma-arrow-line"/>
                                    </g>
                                );
                            }
                            return null;
                        })}
                    </svg>
                </div>

                 {/* BAGIAN BANTUAN 1: SVG */}
                <div className="mt-8 border border-gray-200 rounded-lg">
                    <button 
                        onClick={() => setShowSvgHelp(!showSvgHelp)} 
                        className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 rounded-lg ${showSvgHelp ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                        <span className="font-semibold text-gray-800">1. Bagaimana Cara Menggunakan File SVG?</span>
                        <ChevronDownIcon isOpen={showSvgHelp} />
                    </button>
                    {showSvgHelp && (
                        <div className="p-6 border-t border-gray-200 animate-fade-in text-gray-700 text-sm space-y-4">
                            <div>
                                <h4 className="font-bold text-base mb-2">1. Apa itu SVG?</h4>
                                <p>SVG (Scalable Vector Graphics) adalah format gambar berbasis vektor. Keunggulannya, gambar tidak akan pecah atau buram saat diperbesar, sehingga sangat ideal untuk publikasi ilmiah.</p>
                            </div>
                             <div>
                                <h4 className="font-bold text-base mb-2">2. Membuka & Menyunting File SVG</h4>
                                <p>Anda dapat membuka file .svg yang Anda unduh dengan beberapa aplikasi:</p>
                                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                                    <li><b>Browser Web:</b> Cukup seret file SVG ke browser (Chrome, Firefox) untuk melihatnya.</li>
                                    <li><b>Inkscape:</b> Editor grafis vektor gratis dan open-source yang sangat powerful. Sangat direkomendasikan.</li>
                                    <li><b>Adobe Illustrator:</b> Perangkat lunak desain profesional (berbayar).</li>
                                    <li><b>PowerPoint/Word:</b> Versi terbaru dapat mengimpor SVG dan memungkinkan beberapa pengeditan dasar.</li>
                                </ul>
                            </div>
                             <div>
                                <h4 className="font-bold text-base mb-2">3. Memasukkan & Mengedit SVG di Word/PowerPoint</h4>
                                <p className="mb-2">Anda bisa melakukan pengeditan dasar (mengubah teks, warna, posisi) langsung di Word/PowerPoint versi terbaru. Berikut caranya:</p>
                                <ol className="list-decimal list-inside ml-4 mt-2 space-y-2">
                                    <li>
                                        <b>Masukkan Gambar:</b> Di Word/PowerPoint, buka tab <b>Insert</b> &gt; <b>Pictures</b> &gt; <b>This Device...</b> lalu pilih file <code>.svg</code> Anda.
                                    </li>
                                    <li>
                                        <b>Konversi menjadi Bentuk (Shape):</b> Klik pada gambar SVG Anda. Tab baru <b>Graphics Format</b> akan muncul. Di tab tersebut, klik tombol <b>Convert to Shape</b>. Ini adalah langkah paling penting.
                                        [Gambar tombol "Convert to Shape" di ribbon Microsoft Office]
                                    </li>
                                    <li>
                                        <b>Ungroup Objek (Penting):</b> Setelah dikonversi, gambar menjadi satu grup besar. Klik kanan pada gambar &gt; pilih <b>Group</b> &gt; klik <b>Ungroup</b>. Ulangi langkah ini (klik kanan &gt; Group &gt; Ungroup) sekali lagi. Sekarang setiap elemen terpisah.
                                    </li>
                                    <li>
                                        <b>Mulai Mengedit:</b> Anda kini dapat mengklik teks untuk mengubah isinya, mengklik kotak untuk mengubah warnanya (gunakan <b>Shape Fill</b>), atau memindahkan posisi elemen individual.
                                    </li>
                                    <li>
                                        <b>Group Kembali:</b> Setelah selesai, pilih semua elemen (seret mouse di sekeliling diagram), lalu klik kanan &gt; <b>Group</b> &gt; <b>Group</b>. Ini akan menyatukan kembali diagram Anda.
                                    </li>
                                </ol>
                            </div>
                             <div>
                                <h4 className="font-bold text-base mb-2">4. Konversi ke Format Lain (PNG/JPG)</h4>
                                <p>Jika Anda memerlukan format gambar lain, buka file SVG di Inkscape atau Adobe Illustrator, lalu pilih menu <b>File &gt; Export</b> atau <b>File &gt; Save for Web</b> untuk menyimpannya sebagai file PNG atau JPG dengan resolusi tinggi.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* BAGIAN BANTUAN 2: PRISMA APP (BARU) */}
                <div className="mt-4 border border-gray-200 rounded-lg">
                    <button 
                        onClick={() => setShowEstechHelp(!showEstechHelp)} 
                        className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 rounded-lg ${showEstechHelp ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                        <span className="font-semibold text-gray-800">2. Bagaimana Cara Menggunakan estech.shinyapps.io?</span>
                        <ChevronDownIcon isOpen={showEstechHelp} />
                    </button>
                    {showEstechHelp && (
                        <div className="p-6 border-t border-gray-200 animate-fade-in text-gray-700 text-sm space-y-4">
                            <p className="italic bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                <strong>Info:</strong> Alat ini adalah generator diagram resmi yang direkomendasikan oleh <i>PRISMA Statement</i>. Jika Anda membutuhkan kustomisasi diagram yang lebih kompleks daripada yang disediakan Bibliocobra, Anda dapat menggunakan alat eksternal ini.
                            </p>
                            <div>
                                <h4 className="font-bold text-base mb-2">Panduan Penggunaan</h4>
                                <p className="mb-3">Untuk memulai, klik tombol <strong>"Create flow diagram"</strong> di bagian atas situs web tersebut, atau baca instruksi di bawah ini:</p>
                                
                                <ul className="list-disc list-inside space-y-3 ml-2">
                                    <li>
                                        <strong>Pentingnya Diagram Alir:</strong> Tinjauan sistematis <i>(systematic reviews)</i> harus dijelaskan dengan tingkat detail metodologis yang tinggi. Pernyataan PRISMA menuntut pelaporan yang rinci dalam tinjauan sistematis dan meta-analisis. Bagian integral dari deskripsi metodologis ini adalah diagram alir.
                                    </li>
                                    <li>
                                        <strong>Fungsi Alat:</strong> Alat ini memungkinkan Anda membuat diagram alir untuk tinjauan Anda sendiri yang sesuai dengan Pernyataan PRISMA 2020.
                                    </li>
                                    <li>
                                        <strong>Cara Memasukkan Data:</strong> Anda dapat memasukkan angka secara manual pada bagian entri data di tab <strong>'Create flow diagram'</strong>.
                                    </li>
                                    <li>
                                        <strong>Otomatisasi via URL:</strong> Angka-angka ini juga bisa diinisialisasi melalui nilai yang diberikan dalam <i>URL query string</i>. 
                                        <br/>
                                        <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs mt-1 inline-block">Contoh: ?website_results=100&organisation_results=200</span>
                                        <br/>
                                        Ini akan secara otomatis mengisi hasil situs web menjadi 100 dan hasil organisasi menjadi 200. Nama parameter harus cocok dengan nama kolom 'data' dalam template mereka.
                                    </li>
                                    <li>
                                        <strong>Opsi Lanjutan:</strong> Argumen tambahan seperti "previous", "other", "dbDetail", dan "regDetail" dapat digunakan untuk mengatur opsi utama awal guna penyesuaian lebih lanjut.
                                    </li>
                                    <li>
                                        <strong>Menggunakan Template:</strong> Sebagai alternatif, Anda dapat menggunakan file template yang disediakan di situs tersebut untuk menentukan nilai apa pun dan mengubah label di dalam diagram.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const renderCurrentStage = () => {
        switch(currentStage) {
            case 'setup': return renderSetup();
            case 'abstract_screening': return renderScreening('abstract');
            case 'fulltext_screening': return renderScreening('fulltext');
            case 'review': return renderReview();
            case 'results': return renderResults();
            default: return renderSetup();
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Generator PRISMA SLR</h2>
            
            {/* --- UPDATE NAVIGATION BAR: Pastikan Menu 'Review' Muncul --- */}
            <div className="flex border-b mb-6 justify-between items-center bg-white sticky top-0 z-10 pb-2">
                 <div className="flex overflow-x-auto no-scrollbar gap-2 flex-grow">
                     {/* Array menu didefinisikan secara manual untuk mencegah error rendering */}
                     {prismaState.isInitialized && [
                         { id: 'abstract_screening', label: 'Abstract Screening' },
                         { id: 'fulltext_screening', label: 'Fulltext Screening' },
                         { id: 'review', label: 'Review' }, // Menu Review dipastikan ada di sini
                         { id: 'results', label: 'Results' }
                     ].map(menuItem => (
                        <button 
                            key={menuItem.id}
                            onClick={() => setCurrentStage(menuItem.id)}
                            className={`py-2 px-4 text-sm font-medium whitespace-nowrap transition-colors rounded-lg flex-shrink-0 ${
                                currentStage === menuItem.id 
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-200 shadow-sm' // Style aktif lebih menonjol
                                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50 border-2 border-transparent'
                            }`}
                        >
                            {menuItem.label}
                        </button>
                     ))}
                 </div>

                 {/* TOMBOL RESET */}
                 {prismaState.isInitialized && (
                     <button 
                        onClick={() => setShowResetConfirm(true)}
                        className="ml-2 text-red-500 hover:text-red-700 text-xs font-bold py-2 px-3 flex items-center gap-1 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap border border-red-100"
                        title="Reset progress PRISMA dan mulai dari awal"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                        Ulang / Reset
                     </button>
                 )}
            </div>
            {/* ------------------------------------------------------------------- */}

            {renderCurrentStage()}

            {/* --- MODAL KONFIRMASI RESET PRISMA (BARU) --- */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-[70] p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                            </svg>
                            <h3 className="text-xl font-bold text-gray-800">Reset PRISMA?</h3>
                        </div>
                        <p className="text-gray-700 mb-6 text-sm">
                            Tindakan ini akan <strong>menghapus semua keputusan screening</strong> (Include/Exclude) dan mengembalikan diagram ke tahap Setup awal. 
                            <br/><br/>
                            Apakah Anda yakin ingin mengulang dari awal?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowResetConfirm(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleResetPrisma} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Ya, Reset</button>
                        </div>
                    </div>
                </div>
            )}
            {/* ------------------------------------------- */}

            {/* --- MODAL SELEKSI REFERENSI PRISMA (BARU) --- */}
            {isPrismaSelectionModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-[80] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-fade-in">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="text-lg font-bold text-gray-800">Langkah 1: Pilih Dataset SLR</h3>
                            <button onClick={() => setIsPrismaSelectionModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <CloseIcon />
                            </button>
                        </div>
                        
                        <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800">
                            Pilih artikel yang akan masuk ke diagram PRISMA. Pisahkan "Dataset Riset" (hasil Scopus/WoS) dari referensi buku atau sumber lain yang tidak perlu di-screen.
                        </div>

                        <div className="p-2 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                            <span className="text-sm font-semibold text-gray-600 ml-2">
                                {selectedPrismaIds.length} dari {projectData.allReferences.length} terpilih
                            </span>
                            <div className="flex gap-2 flex-wrap justify-end">
                                <button onClick={() => handleSelectAllPrisma(true)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-bold transition-colors">Pilih Semua</button>
                                <button onClick={handleSelectRisPrisma} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 font-bold transition-colors">Pilih Semua RIS</button>
                                <button onClick={() => handleSelectAllPrisma(false)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 font-bold transition-colors">Hapus Semua</button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-gray-50">
                            <div className="space-y-2">
                                {projectData.allReferences.map(ref => (
                                    <label key={ref.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPrismaIds.includes(ref.id) ? 'bg-white border-blue-400 shadow-sm ring-1 ring-blue-100' : 'bg-white border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPrismaIds.includes(ref.id)}
                                            onChange={() => handleTogglePrismaSelect(ref.id)}
                                            className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-bold text-sm text-gray-800 break-words line-clamp-2">{ref.title}</span>
                                                {ref.source === 'external_ris' && (
                                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">
                                                        RIS File
                                                    </span>
                                                )}
                                                {ref.source === 'search_engine' && (
                                                    <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 font-bold uppercase tracking-wider">
                                                        Manual/Search
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">{ref.author} ({ref.year})</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button onClick={() => setIsPrismaSelectionModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg">Batal</button>
                            <button 
                                onClick={handleSavePrismaSelection} 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg"
                            >
                                Simpan Seleksi ({selectedPrismaIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ---------------------------------------------------- */}

            {/* --- MODAL FULLTEXT SCREENING (BARU) --- */}
            {showFulltextModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-[60] p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">AI Full-text Screening Helper</h3>
                            <button onClick={() => setShowFulltextModal(false)} className="text-gray-400 hover:text-gray-600">
                                <CloseIcon />
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto pr-2">
                            <p className="text-sm text-gray-600 mb-2">Tempelkan (paste) seluruh atau sebagian teks dari paper yang sedang Anda screen di sini untuk dianalisis oleh AI.</p>
                            <textarea
                                value={fulltextInput}
                                onChange={(e) => setFulltextInput(e.target.value)}
                                className="w-full p-3 border rounded-lg h-40 text-xs font-mono mb-4 focus:ring-2 focus:ring-indigo-500"
                                placeholder="Paste teks paper di sini..."
                            ></textarea>

                            <button 
                                onClick={handleAnalyzeFulltext}
                                disabled={isAnalyzingFulltext || !fulltextInput}
                                className={`w-full py-2 rounded-lg font-bold text-white mb-4 ${isAnalyzingFulltext ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isAnalyzingFulltext ? 'Sedang Menganalisis...' : 'Analisis Teks Ini'}
                            </button>

                            {fulltextAnalysis && (
                                <div className={`p-4 rounded-lg border-l-4 ${fulltextAnalysis.recommendation === 'INCLUDE' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-sm uppercase tracking-wide">Rekomendasi AI:</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${fulltextAnalysis.recommendation === 'INCLUDE' ? 'bg-green-600' : 'bg-red-600'}`}>
                                            {fulltextAnalysis.recommendation}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-800">
                                        <p><strong>Relevansi:</strong> {fulltextAnalysis.relevance_level}</p>
                                        <p><strong>Alasan:</strong> {fulltextAnalysis.reason}</p>
                                        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200"><strong>Ringkasan:</strong> {fulltextAnalysis.summary}</p>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-xs text-gray-500 italic">Gunakan tombol Include/Exclude di layar utama untuk mengambil keputusan akhir.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* --------------------------------------- */}

            {exclusionModal.isOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Alasan Pengecualian</h3>
                        <div className="space-y-2">
                            {(exclusionModal.screeningType === 'abstract' ? prismaState.exclusionReasons.abstract : prismaState.exclusionReasons.fulltext).map(reason => (
                                <label key={reason} className="flex items-center">
                                    <input type="radio" name="exclusionReason" value={reason} checked={exclusionReason === reason} onChange={e => setExclusionReason(e.target.value)} className="h-4 w-4 text-blue-600"/>
                                    <span className="ml-3 text-gray-700">{reason}</span>
                                </label>
                            ))}
                        </div>
                        {exclusionReason === 'Lainnya' && (
                             <div className="mt-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Sebutkan alasan lain:</label>
                                <input type="text" value={customReason} onChange={e => setCustomReason(e.target.value)} className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"/>
                            </div>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setExclusionModal({ isOpen: false, studyId: null, screeningType: '' })} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleConfirmExclusion} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Konfirmasi Exclude</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Komponen untuk Ekstraksi & Sintesis Data ---
const SintesisData = ({ projectData, setProjectData, showInfoModal, geminiApiKeys, handleCopyToClipboard, setCurrentSection }) => { // UPDATE: geminiApiKeys
    // State for managing the column definition modal
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState(null); // Can be a new column object or an existing one
    const [newColumnLabel, setNewColumnLabel] = useState('');
    // State for selecting a reference to extract
    const [selectedRefId, setSelectedRefId] = useState('');
    // State for the extraction modal
    const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
    const [currentExtractionData, setCurrentExtractionData] = useState(null); // Holds the data for the paper being extracted
    const [isExtracting, setIsExtracting] = useState(false); // For AI loading state
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
    const isPremium = projectData.isPremium;

    // --- LOGIKA FILTER BARU ---
    const availableReferences = React.useMemo(() => {
        // Cek apakah PRISMA sudah diinisialisasi (Artinya user sedang mode SLR)
        if (projectData.prismaState && projectData.prismaState.isInitialized) {
            // Ambil ID studi yang statusnya 'fulltext_included'
            const includedIds = projectData.prismaState.studies
                .filter(s => s.screeningStatus === 'fulltext_included')
                .map(s => String(s.id));
            
            // Filter allReferences agar hanya menampilkan yang lolos screening
            return projectData.allReferences.filter(ref => includedIds.includes(String(ref.id)));
        }
        // Jika tidak mode SLR, tampilkan semua referensi perpustakaan
        return projectData.allReferences;
    }, [projectData.allReferences, projectData.prismaState]);
    // ---------------------------

    const handleExportToCSV = () => {
        if (!projectData.extractedData || projectData.extractedData.length === 0) {
            showInfoModal("Tidak ada data untuk diekspor. Harap isi tabel sintesis terlebih dahulu.");
            return;
        }

        // Siapkan data dalam format yang diharapkan PapaParse
        const dataForExport = projectData.extractedData.map(item => {
            const refDetails = projectData.allReferences.find(ref => String(ref.id) === String(item.refId)) || {};
            
            const rowData = {
                "Author": refDetails.author || '',
                "Year": refDetails.year || '',
                "Title": refDetails.title || '',
            };

            projectData.synthesisTableColumns.forEach(col => {
                rowData[col.label] = item.data[col.key] || '';
            });

            return rowData;
        });

        // Ubah JSON menjadi CSV
        const csv = window.Papa.unparse(dataForExport);

        // Picu Unduhan
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const date = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `bibliocobra_synthesis_table_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateNarrative = async () => {
        setIsNarrativeLoading(true);

        if (projectData.extractedData.length === 0) {
            showInfoModal("Tidak ada data yang diekstrak untuk disintesis. Harap isi Tabel Sintesis terlebih dahulu.");
            setIsNarrativeLoading(false);
            return;
        }

        // Format the extracted data into a structured string for the prompt
        const dataForPrompt = projectData.extractedData.map(item => {
            const refDetails = projectData.allReferences.find(ref => String(ref.id) === String(item.refId));
            let entryString = `Sumber: ${refDetails ? `${refDetails.author} (${refDetails.year}) - "${refDetails.title}"` : 'Referensi tidak diketahui'}\n`;
            
            projectData.synthesisTableColumns.forEach(col => {
                if (item.data[col.key]) {
                    entryString += `- ${col.label}: ${item.data[col.key]}\n`;
                }
            });
            return entryString;
        }).join('\n---\n');

        const prompt = `Anda adalah seorang penulis akademik ahli. Tugas Anda adalah menulis sebuah draf tinjauan pustaka naratif yang koheren HANYA berdasarkan data terstruktur yang diekstrak dari beberapa artikel berikut.

Konteks Penelitian Utama:
- Judul: "${projectData.judulKTI || projectData.topikTema}"

Data yang Diekstrak:
---
${dataForPrompt}
---

Instruksi Penulisan:
1.  **Sintesis, Jangan Daftar:** Jangan hanya membuat daftar temuan dari setiap paper. Sintesiskan informasi tersebut. Identifikasi tema, pola, atau hubungan yang muncul di antara berbagai paper.
2.  **Struktur Narasi:** Buat alur cerita yang logis. Mulailah dengan pengenalan umum, kelompokkan temuan serupa, diskusikan perbedaan atau kontradiksi jika ada, dan akhiri dengan ringkasan singkat.
3.  **Sebutkan Sumber:** Saat membahas sebuah temuan, sebutkan sumbernya (misalnya, "Menurut Smith (2020)..." atau "...seperti yang ditunjukkan oleh Jones et al. (2021).").
4.  **Gaya Akademis:** Gunakan bahasa yang formal, objektif, dan jelas.
5.  **Format:** Hasilkan sebagai teks biasa (plain text) tanpa format markdown atau HTML.

Tuliskan draf narasi sintesisnya.`;

        try {
            const result = await geminiService.run(prompt, geminiApiKeys); // UPDATE: geminiApiKeys
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");

            const separator = `\n\n---\n[Sintesis Naratif Dihasilkan pada ${new Date().toLocaleString()}]\n---\n`;
            const newHasilPembahasan = (projectData.hasilPembahasanDraft || '') + separator + cleanResult;

            setProjectData(p => ({ 
                ...p, 
                sintesisNaratifDraft: cleanResult,
                hasilPembahasanDraft: newHasilPembahasan
            }));
            
            showInfoModal("Draf narasi berhasil dibuat dan ditambahkan ke Bab Hasil & Pembahasan. Anda akan diarahkan ke sana sekarang.");
            setCurrentSection('hasil');

        } catch (error) {
            showInfoModal(`Gagal membuat sintesis naratif: ${error.message}`);
        } finally {
            setIsNarrativeLoading(false);
        }
    };

    const handleAiExtract = async () => {
        if (!currentExtractionData) return;
        setIsExtracting(true);
        const refDetails = currentExtractionData.refDetails;
        const context = `
Judul: ${refDetails.title}
Penulis: ${refDetails.author}
Tahun: ${refDetails.year}
Abstrak/Catatan: ${refDetails.abstract || refDetails.isiKutipan || "Tidak ada."}
        `;

        // Dynamically build the schema from the user-defined columns
        const schemaProperties = projectData.synthesisTableColumns.reduce((acc, col) => {
            acc[col.key] = { type: "STRING", description: `Ekstrak informasi untuk: ${col.label}` };
            return acc;
        }, {});

        const schema = {
            type: "OBJECT",
            properties: schemaProperties,
            required: projectData.synthesisTableColumns.map(col => col.key)
        };

        // --- UPDATE PROMPT: MEMAKSA OUTPUT BAHASA INDONESIA ---
        const prompt = `Anda adalah asisten peneliti yang sangat teliti. Berdasarkan konteks artikel ilmiah berikut, ekstrak informasi yang relevan untuk mengisi tabel sintesis.

**INSTRUKSI UTAMA (WAJIB DIPATUHI):**
1. Ekstrak data sesuai dengan definisi kolom yang diminta dalam schema.
2. **WAJIB MENERJEMAHKAN** semua hasil ekstraksi ke dalam **BAHASA INDONESIA** formal/akademis, meskipun teks aslinya (Judul/Abstrak) berbahasa Inggris. Jangan biarkan teks dalam bahasa Inggris kecuali istilah teknis yang tidak ada padanannya.
3. Jika informasi spesifik tidak ditemukan secara eksplisit, biarkan string kosong ("").

Konteks Artikel:
---
${context}
---
        `;
        // --- AKHIR UPDATE PROMPT ---

        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema }); // UPDATE: geminiApiKeys
            
            // Merge AI results with existing data without overwriting everything
            setCurrentExtractionData(prev => ({
                ...prev,
                data: {
                    ...prev.data,
                    ...result
                }
            }));

            showInfoModal("Ekstraksi AI berhasil (Bahasa Indonesia)!");

        } catch (error) {
            showInfoModal(`Gagal mengekstrak data dengan AI: ${error.message}`);
        } finally {
            setIsExtracting(false);
        }
    };


    const handleStartExtraction = (refIdToExtract) => {
        const refId = refIdToExtract || selectedRefId;
        if (!refId) {
            showInfoModal("Silakan pilih referensi terlebih dahulu.");
            return;
        }

        const reference = projectData.allReferences.find(ref => String(ref.id) === String(refId));
        if (!reference) {
            showInfoModal("Referensi tidak ditemukan. Mungkin telah dihapus atau ID-nya tidak cocok.");
            return;
        }

        // Check if data already exists, if not, create a blank structure
        const existingData = projectData.extractedData.find(d => String(d.refId) === String(refId));
        
        // FIX: Define the initialData object locally before using it
        const initialData = {
            refId: refId,
            refDetails: reference,
            data: {}
        };
        
        // Ensure all columns from the template exist in the data object
        projectData.synthesisTableColumns.forEach(col => {
            initialData.data[col.key] = existingData?.data?.[col.key] || '';
        });
        
        setCurrentExtractionData(initialData);
        setIsExtractionModalOpen(true);
    };
    
    const handleExtractionDataChange = (key, value) => {
        setCurrentExtractionData(prev => ({
            ...prev,
            data: {
                ...prev.data,
                [key]: value
            }
        }));
    };

    const handleSaveExtraction = () => {
        // Find if an entry for this refId already exists
        const index = projectData.extractedData.findIndex(d => d.refId === currentExtractionData.refId);

        let newExtractedData = [...projectData.extractedData];

        if (index > -1) {
            // Update existing data
            newExtractedData[index] = { ...newExtractedData[index], data: currentExtractionData.data };
        } else {
            // Add new data entry
            newExtractedData.push({ refId: currentExtractionData.refId, data: currentExtractionData.data });
        }

        setProjectData(p => ({
            ...p,
            extractedData: newExtractedData
        }));

        setIsExtractionModalOpen(false);
        setCurrentExtractionData(null);
        showInfoModal("Data ekstraksi berhasil disimpan!");
    };


    const handleAddColumn = () => {
        setEditingColumn({ isNew: true }); // Mark as new
        setNewColumnLabel('');
        setIsColumnModalOpen(true);
    };

    const handleEditColumn = (column) => {
        setEditingColumn(column);
        setNewColumnLabel(column.label);
        setIsColumnModalOpen(true);
    };

    const handleDeleteColumn = (keyToDelete) => {
        setProjectData(p => ({
            ...p,
            synthesisTableColumns: p.synthesisTableColumns.filter(col => col.key !== keyToDelete)
        }));
    };

    const handleSaveColumn = () => {
        if (!newColumnLabel.trim()) {
            showInfoModal("Nama kolom tidak boleh kosong.");
            return;
        }

        if (editingColumn.isNew) {
            // Add new column
            const newColumn = {
                key: `custom_${Date.now()}`,
                label: newColumnLabel.trim(),
                type: 'textarea' // Default to textarea for custom columns
            };
            setProjectData(p => ({
                ...p,
                synthesisTableColumns: [...p.synthesisTableColumns, newColumn]
            }));
        } else {
            // Update existing column
            setProjectData(p => ({
                ...p,
                synthesisTableColumns: p.synthesisTableColumns.map(col =>
                    col.key === editingColumn.key ? { ...col, label: newColumnLabel.trim() } : col
                )
            }));
        }

        setIsColumnModalOpen(false);
        setEditingColumn(null);
        setNewColumnLabel('');
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Ekstraksi & Sintesis Data</h2>
            <p className="text-gray-600 mb-8 -mt-4">
                Modul ini membantu Anda mengekstrak informasi kunci dari referensi Anda secara sistematis dan mensintesisnya menjadi sebuah narasi.
            </p>

            {/* Modal for adding/editing columns */}
            {isColumnModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">
                            {editingColumn?.isNew ? 'Tambah Kolom Baru' : 'Edit Nama Kolom'}
                        </h3>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Nama Kolom (Label):</label>
                            <input
                                type="text"
                                value={newColumnLabel}
                                onChange={(e) => setNewColumnLabel(e.target.value)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                placeholder="Contoh: Metodologi, Sampel, dll."
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsColumnModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleSaveColumn} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL EKSTRAKSI DATA --- */}
            {isExtractionModalOpen && currentExtractionData && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-semibold mb-1 text-gray-800">Ekstraksi Data</h3>
                        <p className="text-sm text-gray-600 mb-4 truncate">Untuk: "{currentExtractionData.refDetails.title}"</p>
                        
                        <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-6">
                            {/* Konteks Referensi */}
                            <div className="p-3 bg-gray-50 border rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-2">Konteks Referensi</h4>
                                <p className="text-sm"><strong>Penulis:</strong> {currentExtractionData.refDetails.author} ({currentExtractionData.refDetails.year})</p>
                                <div className="mt-2">
                                    <p className="text-sm font-semibold"><strong>Abstrak / Catatan:</strong></p>
                                    <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded-md max-h-28 overflow-y-auto">
                                        {currentExtractionData.refDetails.abstract || currentExtractionData.refDetails.isiKutipan || "Tidak ada abstrak atau catatan."}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Form Ekstraksi */}
                            <div className="space-y-4">
                                {projectData.synthesisTableColumns.map(col => (
                                    <div key={col.key}>
                                        <label className="block text-gray-700 text-sm font-bold mb-2">{col.label}:</label>
                                        <textarea
                                            value={currentExtractionData.data[col.key] || ''}
                                            onChange={(e) => handleExtractionDataChange(col.key, e.target.value)}
                                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            rows={col.type === 'textarea' ? 4 : 2}
                                            placeholder={`Masukkan ${col.label}...`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t flex justify-between items-center">
                            <button
                                onClick={handleAiExtract} // To be implemented in the next step
                                disabled={isExtracting || !isPremium}
                                className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-300'}`}
                                title={!isPremium ? "Fitur Premium" : ""}
                            >
                                {!isPremium ? '🔒 Ekstrak AI (Premium)' : (isExtracting ? 'Mengekstrak...' : '✨ Ekstrak dengan AI')}
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => setIsExtractionModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                                <button onClick={handleSaveExtraction} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Section 1: Manage Table Template */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">1. Template Tabel Ekstraksi Data</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Kelola kolom-kolom yang akan Anda gunakan untuk mengekstrak data dari setiap referensi. Template default telah disediakan berdasarkan panduan SLR.
                </p>
                <div className="mb-4">
                    {projectData.synthesisTableColumns.map(col => (
                        <div key={col.key} className="flex items-center justify-between p-2 mb-1 bg-white border rounded-md">
                            <span className="text-gray-700">{col.label}</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditColumn(col)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold">Edit</button>
                                <button onClick={() => handleDeleteColumn(col.key)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddColumn} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                    + Tambah Kolom
                </button>
            </div>

            {/* Section 2: Data Extraction from References */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">2. Ekstraksi Data dari Referensi</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Pilih sebuah referensi dari perpustakaan Anda untuk memulai proses ekstraksi data berbantuan AI.
                </p>

                {/* --- INDIKATOR FILTER PRISMA --- */}
                {projectData.prismaState?.isInitialized && (
                    <div className="mb-4 p-2 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                        </svg>
                        <span><strong>Mode SLR Aktif:</strong> Daftar ini hanya menampilkan artikel yang lolos screening (Inklusi Full-Text).</span>
                    </div>
                )}

                {availableReferences.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <select
                            value={selectedRefId}
                            onChange={(e) => setSelectedRefId(e.target.value)}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="" disabled>Pilih referensi...</option>
                            {availableReferences.map(ref => {
                                const isExtracted = projectData.extractedData.some(d => String(d.refId) === String(ref.id));
                                const truncatedTitle = ref.title.length > 100 ? `${ref.title.substring(0, 100)}...` : ref.title;
                                return (
                                    <option key={ref.id} value={ref.id}>
                                        {isExtracted ? '✓ ' : '○ '}{truncatedTitle}
                                    </option>
                                );
                            })}
                        </select>
                        <button
                            onClick={() => handleStartExtraction()}
                            disabled={!selectedRefId}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg w-full sm:w-auto flex-shrink-0 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            Mulai Ekstraksi
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500 italic text-sm border-2 border-dashed border-gray-200 rounded">
                        {projectData.prismaState?.isInitialized ? (
                            <>
                                <p className="font-semibold text-red-500">Belum ada artikel yang diinklusi.</p>
                                <p>Silakan selesaikan tahap "Screening Full-Text" di menu Generator PRISMA SLR dan klik tombol "Include" pada artikel yang relevan.</p>
                            </>
                        ) : (
                            <p>Perpustakaan referensi Anda kosong. Silakan tambahkan referensi terlebih dahulu.</p>
                        )}
                    </div>
                )}
            </div>


            {/* Section 3: Centralized Synthesis Table */}
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">3. Tabel Sintesis Terpusat</h3>
                    <button
                        onClick={handleExportToCSV}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg text-sm disabled:bg-green-300"
                        disabled={projectData.extractedData.length === 0}
                    >
                        Ekspor ke Sheets (.csv)
                    </button>
                </div>
                {projectData.extractedData.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Referensi</th>
                                    {projectData.synthesisTableColumns.map(col => (
                                        <th key={col.key} className="px-4 py-3">{col.label}</th>
                                    ))}
                                    <th className="px-4 py-3">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectData.extractedData.map(item => {
                                    const refDetails = projectData.allReferences.find(ref => String(ref.id) === String(item.refId));
                                    return (
                                        <tr key={item.refId} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                                                {refDetails ? refDetails.title : 'Referensi tidak ditemukan'}
                                            </td>
                                            {projectData.synthesisTableColumns.map(col => (
                                                <td key={col.key} className="px-4 py-3 max-w-sm">
                                                    <p className="line-clamp-3 hover:line-clamp-none transition-all duration-200">
                                                        {item.data[col.key] || '-'}
                                                    </p>
                                                </td>
                                            ))}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleStartExtraction(item.refId)}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg text-xs"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <p>Belum ada data yang diekstrak.</p>
                        <p className="text-sm">Gunakan fitur di atas untuk mulai mengekstrak data dari referensi Anda.</p>
                    </div>
                )}
            </div>

            {/* Placeholder for Narrative Synthesis */}
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-300">
                 <h3 className="text-xl font-bold mb-4 text-gray-800">4. Sintesis Naratif</h3>
                 <div className="p-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg mb-6">
                    <p className="text-sm text-blue-700 mb-4">Setelah data terkumpul di tabel sintesis, klik tombol di bawah untuk meminta AI menyintesis semua informasi menjadi sebuah narasi yang koheren.</p>
                    <button
                        onClick={handleGenerateNarrative}
                        disabled={isNarrativeLoading || projectData.extractedData.length === 0 || !isPremium}
                        className={`font-bold py-2 px-4 rounded-lg ${!isPremium ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'}`}
                        title={!isPremium ? "Fitur Premium" : ""}
                    >
                        {!isPremium ? '🔒 Tulis Sintesis (Premium)' : (isNarrativeLoading ? 'Memproses...' : '✨ Tulis Draf Sintesis Naratif')}
                    </button>
                    {!isPremium && <p className="text-xs text-red-500 mt-2">Upgrade ke Premium untuk sintesis naratif otomatis.</p>}
                 </div>

                 {isNarrativeLoading && !projectData.sintesisNaratifDraft && (
                    <div className="mt-6 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="ml-3 text-gray-600">AI sedang menyusun narasi...</p>
                    </div>
                )}

                 {projectData.sintesisNaratifDraft && (
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-lg font-semibold text-gray-800">Draf Narasi:</h4>
                            <button onClick={() => handleCopyToClipboard(projectData.sintesisNaratifDraft)} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-lg">Salin Teks</button>
                        </div>
                        <textarea
                            value={projectData.sintesisNaratifDraft}
                            onChange={(e) => setProjectData(p => ({ ...p, sintesisNaratifDraft: e.target.value }))}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-relaxed"
                            rows="15"
                            placeholder="Hasil sintesis naratif akan muncul di sini..."
                        ></textarea>
                    </div>
                 )}
            </div>
        </div>
    );
};


// --- Komponen untuk Donasi ---
const Donasi = ({ handleCopyToClipboard }) => {
    const accountNumber = '7193560789';
    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Dampak Sosial & CSR</h2>
            
            {/* PERUBAHAN TEKS: Menggunakan kalimat usulan pengguna agar lebih logis */}
            <p className="text-gray-700 mb-6">
                Layanan ini mendukung program CSR (Corporate Social Responsibility) melalui sumbangan sukarela, guna membantu komunitas yang membutuhkan.
            </p>

            {/* Donasi Masjid Section */}
            <div className="p-4 border-2 border-dashed border-teal-300 rounded-lg bg-teal-50">
                <h3 className="text-xl font-bold mb-2 text-teal-800">Program Pembangunan Masjid Al Ikhlas</h3>
                <p className="text-teal-700 mb-6">Kami mengajak Anda untuk turut serta dalam pembangunan rumah ibadah. Dukungan Anda sangat berarti bagi komunitas.</p>
                
                <div className="space-y-4 text-gray-700">
                    <div>
                        <h3 className="font-semibold text-lg">Lokasi:</h3>
                        <p>Grand Bukit Dago, Casablanca Blok E No.1, Rawakalong, Kec. Gn. Sindur, Kabupaten Bogor, Jawa Barat 16340</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Informasi & Progres:</h3>
                        <a href="https://www.instagram.com/yayasanalikhlascasablanca/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Instagram: @yayasanalikhlascasablanca
                        </a>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Dokumentasi Pembangunan:</h3>
                        <a href="https://maps.app.goo.gl/98aM6NhDfDbrhxRq8" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Lihat Lokasi di Google Maps
                        </a>
                    </div>
                    <div className="pt-4 mt-4 border-t border-teal-200">
                        <h3 className="font-semibold text-lg">Rekening Donasi:</h3>
                        <p>Bank Syariah Indonesia (BSI)</p>
                        <p className="font-bold text-xl my-2 tracking-wider">{accountNumber}</p>
                        <p>Atas nama: <strong>Yayasan Al Ikhlas Casablanca</strong></p>
                        <button 
                            onClick={() => handleCopyToClipboard(accountNumber)}
                            className="mt-3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2"
                        >
                            <CopyIcon /> Salin No. Rekening
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Komponen untuk Tutorial (Bantuan & Kontak) ---
const Tutorial = () => {
    // Data Dummy Kontak
    const adminWA = "6285123048010"; 
    const displayWA = "+62 851-2304-8010";
    const adminEmail = "ibracobra.production@gmail.com";
    const adminIG = "ibracobra_production"; // Dummy Instagram

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Pusat Bantuan & Kontak</h2>
            <p className="text-gray-600 mb-8 text-sm">Temukan panduan penggunaan atau hubungi tim dukungan kami untuk bantuan lebih lanjut.</p>
            
            <div className="space-y-4">
                {/* Bagian 1: Panduan Mandiri (Kartu Besar) */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-base font-bold text-gray-900 mb-1">Panduan Penggunaan & Tutorial</h3>
                            <p className="text-gray-600 mb-3 text-xs leading-relaxed max-w-2xl">
                                Pelajari cara memaksimalkan fitur Bibliocobra. Akses koleksi video tutorial, dokumentasi langkah demi langkah, dan tips penggunaan.
                            </p>
                            <a 
                                href="https://drive.google.com/drive/u/0/folders/1MXW0fxlWC7uZbA5iINLrTq5P7ENnsJU0"
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm group"
                            >
                                Buka Perpustakaan Tutorial
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bagian 2: Kontak Support */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Layanan Pelanggan (Customer Support)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* WhatsApp Card */}
                        <a 
                            href={`https://wa.me/${adminWA}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-400 hover:shadow-sm transition-all group"
                        >
                            <div className="bg-green-50 p-2 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/>
                                </svg>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">WhatsApp</p>
                                <p className="text-gray-900 font-semibold text-sm truncate">{displayWA}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Senin - Jumat, 09.00 - 17.00 WIB</p>
                            </div>
                        </a>

                        {/* Email Card */}
                        <a 
                            href={`mailto:${adminEmail}`}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all group"
                        >
                            <div className="bg-gray-50 p-2 rounded-full text-gray-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email Support</p>
                                <p className="text-gray-900 font-semibold text-sm truncate">{adminEmail}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Respon dalam 1x24 Jam Kerja</p>
                            </div>
                        </a>

                        {/* Instagram Card (Span 2 Columns untuk Presisi) */}
                        <a 
                            href={`https://instagram.com/${adminIG}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-pink-400 hover:shadow-sm transition-all group md:col-span-2"
                        >
                            <div className="bg-pink-50 p-2 rounded-full text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.172 16 8s-.01-2.444-.048-3.298c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.234-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                                </svg>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Instagram</p>
                                <p className="text-gray-900 font-semibold text-sm truncate">@{adminIG}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Informasi & Update Terbaru</p>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Komponen BARU untuk Reset & Hapus Proyek (MANAJEMEN APLIKASI) ---
const ResetHapusProyek = ({ setIsResetConfirmOpen, handleCopyToClipboard, setGeminiApiKey, setScopusApiKey, showInfoModal, setForceShowLicense, setGeminiApiKeys, projectData }) => { 
    
    // State lokal untuk modal konfirmasi
    const [isLocalResetConfirmOpen, setIsLocalResetConfirmOpen] = useState(false);

    // Fungsi baru untuk menghapus data lokal (API Key) saja
    const handleClearLocalData = () => {
        // Hapus dari Local Storage
        localStorage.removeItem('gemini-api-key'); // Legacy
        localStorage.removeItem('gemini-api-keys-list'); // Multi-key list
        localStorage.removeItem('scopus-api-key');
        localStorage.removeItem('hasSeenWelcomeModal');
        
        // Hapus dari State Aplikasi (agar UI langsung update tanpa reload)
        setGeminiApiKeys(['']); // Reset ke array kosong (default)
        setScopusApiKey('');
        
        // Tutup modal dan beri notifikasi
        setIsLocalResetConfirmOpen(false);
        showInfoModal("Kunci API dan pengaturan lokal berhasil dihapus dari browser ini.");
    };

    // --- LOGIKA ADD-ON ---
    const isElite = projectData ? projectData.showScopus : false;
    const isPremium = projectData ? projectData.isPremium : false; // Ambil status Premium

    const addons = [
        {
            name: "Audiocobra",
            description: "Transkripsi audio wawancara ke teks otomatis berbasis AI.",
            url: "https://audiocobra.vercel.app/",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-pink-600" viewBox="0 0 16 16">
                    <path d="M11.536 14.01A8.473 8.473 0 0 1 8 15a8.476 8.476 0 0 1-3.536-.99.5.5 0 0 1 .5-.866A7.472 7.472 0 0 0 8 14c1.99 0 3.803-.787 5.143-2.072a.5.5 0 1 1 .695.73A8.473 8.473 0 0 1 11.536 14.01z"/>
                    <path d="M5.5 2A3.5 3.5 0 0 0 2 5.5v5A3.5 3.5 0 0 0 5.5 14h5a3.5 3.5 0 0 0 3.5-3.5v-5A3.5 3.5 0 0 0 10.5 2h-5zm0 1h5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 3 10.5v-5A2.5 2.5 0 0 1 5.5 3z"/>
                    <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                </svg>
            ),
            color: "bg-pink-50 border-pink-200",
            premiumOnly: true // Kunci untuk Free
        },
        {
            name: "Cobrasaurus",
            description: "Tools pembersihan dan standarisasi kata kunci riset (Thesaurus).",
            url: "https://cobrasaurus.vercel.app/",
            icon: (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-green-600" viewBox="0 0 16 16">
                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                </svg>
            ),
            color: "bg-green-50 border-green-200",
            premiumOnly: true // Kunci untuk Free
        }
    ];

    if (isElite) {
        addons.push({
            name: "Venom Converter",
            description: "Konversi referensi Scopus AI/WoS ke format standar Bibliocobra.",
            url: "https://venom-reference-converter.vercel.app/",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="text-orange-600" viewBox="0 0 16 16">
                     <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM4.5 9a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM4 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 1 0-1h4a.5.5 0 0 1 0 1h-4z"/>
                </svg>
            ),
            color: "bg-orange-50 border-orange-200",
            badge: "Elite Only",
            premiumOnly: false // Sudah dilindungi oleh blok if(isElite)
        });
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Manajemen Aplikasi & Data</h2>

            {/* Bagian 1: Reset Proyek (Aplikasi) */}
            <div className="mb-8 p-4 border-2 border-dashed border-red-400 rounded-lg bg-red-50">
                <h3 className="text-xl font-bold mb-2 text-red-800">1. Reset Total Proyek (Server Firebase)</h3>
                <p className="text-red-700 mb-4 text-sm">
                    <strong>PERINGATAN KERAS:</strong> Tindakan ini akan <strong>MENGHAPUS PERMANEN</strong> seluruh data proyek Anda (Judul, Referensi, Draf Bab, dll) yang tersimpan di server database kami. Data yang sudah dihapus tidak dapat dikembalikan.
                </p>
                <button
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
                >
                    Hapus & Reset Proyek Saya
                </button>
            </div>

            {/* Bagian 2: Manajemen Lisensi (Upgrade) */}
            <div className="mb-8 p-4 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50">
                <h3 className="text-xl font-bold mb-2 text-indigo-800">2. Manajemen Lisensi</h3>
                <p className="text-indigo-700 mb-4 text-sm">
                    Ingin memasukkan kode lisensi baru? Gunakan tombol di bawah ini untuk membuka kembali halaman aktivasi.
                </p>
                <button
                    onClick={() => setForceShowLicense(true)}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
                >
                    Input Ulang / Upgrade Lisensi
                </button>
            </div>

            {/* Bagian 3: Keamanan Lokal (API Key) */}
            <div className="mb-8 p-4 border-2 border-dashed border-gray-400 rounded-lg bg-gray-50">
                <h3 className="text-xl font-bold mb-2 text-gray-800">3. Keamanan Perangkat (Hapus Kunci API)</h3>
                <p className="text-gray-700 mb-4 text-sm">
                    Gunakan tombol di bawah ini jika Anda menggunakan komputer publik atau ingin mengganti Kunci API. Tindakan ini hanya akan menghapus <strong>Google AI API Key</strong> dan <strong>Scopus API Key</strong> yang tersimpan di browser ini. Data proyek Anda tetap aman di server.
                </p>
                
                <button
                    onClick={() => setIsLocalResetConfirmOpen(true)}
                    className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
                >
                    Hapus Kunci API dari Browser Ini
                </button>
            </div>

            {/* Bagian 4: Daftar Add-On (BARU DITAMBAHKAN DI SINI) */}
            <div className="p-4 border-2 border-dashed border-teal-400 rounded-lg bg-teal-50">
                <h3 className="text-xl font-bold mb-2 text-teal-800">4. Daftar Add-On Ekosistem</h3>
                <p className="text-teal-700 mb-6 text-sm">
                    Aplikasi pendukung eksternal yang terintegrasi untuk memperkaya fitur Bibliocobra.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {addons.map((addon, index) => {
                        // Logika Kunci untuk Free User
                        const isLocked = addon.premiumOnly && !isPremium;
                        
                        const commonClasses = `block p-4 rounded-xl border transition-all relative group h-full flex flex-col text-left w-full ${
                            isLocked 
                                ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-75' 
                                : `bg-white hover:shadow-lg hover:-translate-y-1 transform ${addon.color}`
                        }`;

                        const cardContent = (
                            <>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg shadow-sm ${isLocked ? 'bg-gray-200 text-gray-400' : 'bg-white'}`}>
                                        {addon.icon}
                                    </div>
                                    <h4 className={`font-bold text-md ${isLocked ? 'text-gray-500' : 'text-gray-800'}`}>
                                        {addon.name}
                                    </h4>
                                </div>
                                
                                {/* Badge Elite */}
                                {addon.badge && (
                                    <span className="absolute top-3 right-3 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        {addon.badge}
                                    </span>
                                )}
                                
                                {/* Badge Premium Lock */}
                                {isLocked && (
                                    <span className="absolute top-3 right-3 text-[10px] bg-yellow-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
                                        PREMIUM
                                    </span>
                                )}

                                <p className="text-xs text-gray-600 mb-4 flex-grow leading-relaxed">
                                    {addon.description}
                                </p>
                                
                                <div className={`flex items-center text-xs font-semibold mt-auto ${isLocked ? 'text-gray-400' : 'text-teal-700 group-hover:text-teal-900'}`}>
                                     {isLocked ? '🔒 Terkunci (Upgrade)' : 'Buka Aplikasi'}
                                     {!isLocked && (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                     )}
                                </div>
                            </>
                        );

                        if (isLocked) {
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => showInfoModal("Fitur ini khusus untuk pengguna Premium/Elite.")}
                                    className={commonClasses}
                                >
                                    {cardContent}
                                </button>
                            );
                        }

                        return (
                        <a 
                            key={index}
                            href={addon.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={commonClasses}
                        >
                            {cardContent}
                        </a>
                    )})}
                </div>
            </div>
            {/* ---------------------------------------------------- */}

            {/* Modal Konfirmasi Hapus Data Lokal (Custom UI pengganti window.confirm) */}
            {isLocalResetConfirmOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Konfirmasi Hapus Kunci</h3>
                        <p className="text-gray-700 mb-6">Apakah Anda yakin? Kunci API akan dihapus dari browser ini. Anda perlu memasukkannya lagi nanti untuk menggunakan fitur AI.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsLocalResetConfirmOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Batal</button>
                            <button onClick={handleClearLocalData} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
// --- AKHIR Komponen BARU --- 
// ... (Bagian-bagian komponen lain seperti DeskripsiResponden, DashboardProyek, IdeKTI, Referensi, dll tidak berubah) ...

// ============================================================================
// KOMPONEN UTAMA: App
// ============================================================================

function App() {
    const [currentSection, setCurrentSection] = useState('ideKTI');
    const [projectData, setProjectData] = useState(initialProjectData);
    
    // ============================================================================
    // LANGKAH B1: Tambah State untuk Pengguna & Loading Auth
    // ============================================================================
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    
    // State Baru: Verifikasi Lisensi per Sesi (Default False setiap refresh)
    const [isLicenseVerified, setIsLicenseVerified] = useState(false); 
    const [forceShowLicense, setForceShowLicense] = useState(false); // State baru untuk memaksa lisensi muncul

    // Refs untuk menjaga status lisensi saat transisi login (agar tidak tertimpa data DB lama)
    const licenseVerifiedRef = useRef(false);
    const eliteStatusRef = useRef(false);

    // State untuk alur kerja Ide KTI yang baru
    const [ideKtiMode, setIdeKtiMode] = useState(null); // 'ai', 'manual', atau null
    const [editingIdea, setEditingIdea] = useState(null);
    const [aiStructuredResponse, setAiStructuredResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // --- UPDATE 1: Menambahkan Field Abstract pada Template ---
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
Publisher Name: 
Abstract: `;
    // ---------------------------------------------------------
    const [manualRef, setManualRef] = useState({ id: null, text: manualRefTemplate });
    const [manualMode, setManualMode] = useState('template'); // <-- Pindahkan State manualMode ke sini
    const [freeTextRef, setFreeTextRef] = useState('');
    const [smartPasteText, setSmartPasteText] = useState(''); // State untuk Smart Paste
    const [generatedApaReferences, setGeneratedApaReferences] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [showSearchPromptModal, setShowSearchPromptModal] = useState(false);
    
    // --- UPDATE STATE: Multi-Keys ---
const [geminiApiKeys, setGeminiApiKeys] = useState(['']); // Default array dengan 1 string kosong

// Helper agar kode lama tidak error (mengambil kunci pertama)
const geminiApiKey = geminiApiKeys[0] || '';
const setGeminiApiKey = (val) => {
    const newKeys = [...geminiApiKeys];
    newKeys[0] = val;
    setGeminiApiKeys(newKeys);
};
    // -------------------------------------------------

    const [scopusApiKey, setScopusApiKey] = useState(''); // State baru untuk Scopus API Key
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [currentEditingRef, setCurrentEditingRef] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
    const [clarificationQuestions, setClarificationQuestions] = useState([]);
    const [clarificationAnswers, setClarificationAnswers] = useState({});
    
    // State untuk pencarian Semantic Scholar
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isS2Searching, setIsS2Searching] = useState(false);

    // State baru untuk pencarian Scopus
    const [isScopusSearching, setIsScopusSearching] = useState(false);
    const [scopusSearchResults, setScopusSearchResults] = useState(null);

    const importInputRef = useRef(null);
    const importReferencesInputRef = useRef(null);
    const importRisInputRef = useRef(null); // <-- REF BARU UNTUK RIS
    
    // --- LANGKAH 1: STATE BARU UNTUK PREVIEW RIS ---
    const [risSearchResults, setRisSearchResults] = useState(null); 
    // -----------------------------------------------

    // --- FUNGSI BARU: BULK ADD RIS KE LIBRARY ---
    const handleAddAllRisToLibrary = () => {
        if (!risSearchResults || risSearchResults.length === 0) {
            showInfoModal("Tidak ada data RIS di preview untuk ditambahkan.");
            return;
        }

        let addedCount = 0;
        const newRefs = [];
        const existingTitles = new Set(projectData.allReferences.map(ref => ref.title.toLowerCase()));
        
        risSearchResults.forEach(paper => {
            // Cek duplikat sederhana berdasarkan judul
            if (!existingTitles.has(paper.title.toLowerCase())) {
                const newRef = {
                    id: paper.id || Date.now() + Math.random(),
                    title: paper.title || '',
                    author: paper.author || '',
                    year: paper.year || '',
                    journal: paper.journal || '',
                    volume: paper.volume || '',
                    issue: paper.issue || '',
                    pages: paper.pages || '',
                    doi: paper.doi || '',
                    url: paper.url || '',
                    publisher: paper.publisher || '',
                    abstract: paper.abstract || '',
                    source: 'external_ris', // TAG PENTING UNTUK PRISMA
                    isiKutipan: ''
                };
                newRefs.push(newRef);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            setProjectData(prev => ({
                ...prev,
                allReferences: [...prev.allReferences, ...newRefs]
            }));
            showInfoModal(`Berhasil menambahkan ${addedCount} referensi baru dari dataset RIS ke Perpustakaan. Data ini akan otomatis terpilih di Generator PRISMA.`);
            setRisSearchResults(null); // Bersihkan preview setelah add all
        } else {
            showInfoModal("Semua referensi dari file RIS sudah ada di perpustakaan (Duplikat).");
        }
    };
    // --------------------------------------------

    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [importedData, setImportedData] = useState(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openCategories, setOpenCategories] = useState([]);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [lastCopiedQuery, setLastCopiedQuery] = useState({ query: '', database: '' });
    
    const [includeIndonesianQuery, setIncludeIndonesianQuery] = useState(false);
    const [openMethod, setOpenMethod] = useState(null);
    const [openSearchDropdown, setOpenSearchDropdown] = useState(null);

    // --- State Baru untuk Fitur Pencarian Konsep ---
    const [conceptQuery, setConceptQuery] = useState('');
    const [isConceptSearching, setIsConceptSearching] = useState(false);
    const [conceptSearchResult, setConceptSearchResult] = useState(null);

    // State baru untuk pencarian Regulasi
    const [isRegulationSearching, setIsRegulationSearching] = useState(false);
    const [regulationSearchResults, setRegulationSearchResults] = useState(null);

    const [conceptSearchMode, setConceptSearchMode] = useState('concept'); 

    // Kunci API Semantic Scholar di-hardcode sesuai permintaan
    const S2_API_KEY = '62xZMjIZah5nNxfZ9lv112iKyIhqT1929s3X3xEz';

    // ============================================================================
    // LANGKAH B2: useEffect untuk Mendengarkan Status Auth & Memuat Data
    // ============================================================================
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Pengguna login
                setCurrentUser(user);
                
                // Ambil data proyek pengguna dari Firestore
                const docRef = doc(db, "projects", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    // Jika dokumen ada, muat datanya
                    const loadedData = docSnap.data();
                    
                    // LOGIKA PENGGABUNGAN CERDAS:
                    // Jika pengguna BARU SAJA memasukkan kode lisensi (di sesi ini),
                    // maka prioritas status Premium diambil dari sesi (licenseVerifiedRef),
                    // bukan dari database lama (loadedData.isPremium).
                    // Ini mencegah status "Gratis" di DB menimpa status "Premium" yang baru diinput.
                    
                    let finalIsPremium = loadedData.isPremium || false;
                    let finalShowScopus = loadedData.showScopus || false;

                    if (licenseVerifiedRef.current) {
                        finalIsPremium = true;
                        finalShowScopus = eliteStatusRef.current;
                    }

                    setProjectData(prev => ({ 
                        ...initialProjectData, 
                        ...loadedData,
                        isPremium: finalIsPremium,
                        showScopus: finalShowScopus
                    }));
                } else {
                    // ... (kode existing pembuatan dokumen baru) ...
                    // Jika dokumen baru, kita juga terapkan status lisensi sesi jika ada
                    const baseData = { ...initialProjectData };
                    if (licenseVerifiedRef.current) {
                        baseData.isPremium = true;
                        baseData.showScopus = eliteStatusRef.current;
                    }

                    try {
                        await setDoc(doc(db, "projects", user.uid), baseData);
                        setProjectData(baseData);
                    } catch (err) {
                        console.error("Gagal membuat dokumen untuk pengguna baru:", err);
                    }
                }
            } else {
                // Pengguna logout
                setCurrentUser(null);
                setProjectData(initialProjectData); // Reset ke data awal
            }
            setIsLoadingAuth(false); // Selesai memuat status auth
        });

        return () => unsubscribe();
    }, []); 

    // ============================================================================
    // LANGKAH B3: useEffect untuk Menyimpan Data ke Firestore secara Otomatis
    // ============================================================================
    const isInitialMount = useRef(true);
    
    useEffect(() => {
        // Jangan simpan pada pemuatan awal atau jika auth masih loading
        if (isLoadingAuth || isInitialMount.current) {
            if (!isLoadingAuth) {
                isInitialMount.current = false;
            }
            return;
        }

        // Hanya simpan jika pengguna sudah login
        if (currentUser) {
            const saveData = async () => {
                try {
                    await setDoc(doc(db, "projects", currentUser.uid), projectData, { merge: true });
                    console.log("Proyek disimpan ke Firestore...");
                } catch (err) {
                    console.error("Gagal menyimpan proyek:", err);
                }
            };
            
            // Debounce: simpan 1 detik setelah perubahan terakhir
            const handler = setTimeout(() => {
                saveData();
            }, 1000); 

            return () => {
                clearTimeout(handler); // Bersihkan timeout jika ada perubahan baru
            };
        }
    }, [projectData, currentUser, isLoadingAuth]);

    // --- UPDATE TAHAP 1: Handler Aktivasi Lisensi Dinamis ---
    const handleLicenseActivation = async (enablePremium = false, enableScopus = false) => {
    setIsLicenseVerified(true);
    setForceShowLicense(false); 
        
        licenseVerifiedRef.current = enablePremium; // Premium true/false
        eliteStatusRef.current = enableScopus;      // Scopus true/false

        // 2. Update state lokal data proyek
        setProjectData(prev => ({ 
            ...prev, 
            isPremium: enablePremium,
            showScopus: enableScopus 
        }));
        
        // 3. Jika pengguna SUDAH login, simpan langsung ke Firestore
        // Kita hanya simpan jika statusnya Premium/Elite. 
        // Jika Free (enablePremium=false), kita TIDAK menimpa data di DB menjadi false 
        // (untuk mencegah user Premium yang iseng login lewat tombol Free kehilangan statusnya di DB).
        // TAPI: Jika ini pendaftaran baru, nilai default di DB sudah false.
        
        if (currentUser && enablePremium) {
        try {
            const userDocRef = doc(db, "projects", currentUser.uid);
            await updateDoc(userDocRef, { 
                isPremium: enablePremium,
                showScopus: enableScopus 
            });
        } catch (error) {
            console.error("Gagal menyimpan status premium:", error);
        }
    }
};

    // Efek untuk menampilkan pop-up selamat datang
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
        if (!hasSeenWelcome) {
            setShowWelcomeModal(true);
        }
    }, []);

    // Efek untuk memuat data kunci API dari localStorage
    useEffect(() => {
        try {
            // --- UPDATE LOCAL STORAGE LOAD ---
            const savedGeminiKeys = localStorage.getItem('gemini-api-keys-list'); // Cek daftar kunci baru
            const savedOldKey = localStorage.getItem('gemini-api-key'); // Cek kunci lama (fallback)
            const savedScopusKey = localStorage.getItem('scopus-api-key');
            
            if (savedGeminiKeys) {
                // Jika ada daftar kunci, muat sebagai array
                setGeminiApiKeys(JSON.parse(savedGeminiKeys));
            } else if (savedOldKey) {
                // Migrasi: Jika cuma ada kunci lama (single), bungkus dalam array
                setGeminiApiKeys([savedOldKey]);
            }

            if (savedScopusKey) setScopusApiKey(savedScopusKey);
        } catch (error) {
            console.error("Gagal memuat data dari localStorage:", error);
        }
    }, []);

    // Efek untuk menyimpan kunci API Gemini
    useEffect(() => {
        try {
            // --- UPDATE LOCAL STORAGE SAVE ---
            localStorage.setItem('gemini-api-keys-list', JSON.stringify(geminiApiKeys));
            // Kita juga simpan key pertama ke slot lama agar kompatibel jika reload
            localStorage.setItem('gemini-api-key', geminiApiKeys[0] || '');
        } catch (error) {
            console.error("Gagal menyimpan kunci API ke localStorage:", error);
        }
    }, [geminiApiKeys]);

    // Efek untuk menyimpan kunci API Scopus
    useEffect(() => {
        try {
            localStorage.setItem('scopus-api-key', scopusApiKey);
        } catch (error) {
            console.error("Gagal menyimpan kunci API Scopus ke localStorage:", error);
        }
    }, [scopusApiKey]);

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

    // ============================================================================
    // LOGIKA PARSER & GENERATOR RIS (MENDELEY SUPPORT)
    // ============================================================================
    
    // 1. Fungsi Parser: String .ris -> Array of Objects
    const parseRisFile = (content) => {
        const references = [];
        // Normalisasi baris baru
        const lines = content.replace(/\r\n/g, '\n').split('\n');
        
        let currentRef = {};
        let currentAuthors = [];
        let hasStarted = false;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // Pola tag RIS standar: 2 huruf kapital + 2 spasi + tanda hubung + 1 spasi
            const match = trimmedLine.match(/^([A-Z0-9]{2})\s{2}-\s(.+)$/);
            
            if (match) {
                const tag = match[1];
                const value = match[2];

                if (tag === 'TY') {
                    // Mulai record baru
                    if (hasStarted && (currentRef.title || currentRef.year)) {
                        // Simpan record sebelumnya
                        currentRef.author = currentAuthors.join(', ');
                        // Generate ID unik
                        currentRef.id = Date.now() + Math.random();
                        references.push(currentRef);
                    }
                    // Reset
                    currentRef = { isiKutipan: '', abstract: '' };
                    currentAuthors = [];
                    hasStarted = true;
                } else if (hasStarted) {
                    switch (tag) {
                        case 'T1': // Title Primary
                        case 'TI': // Title
                        case 'CT': // Title of contribution
                            currentRef.title = value;
                            break;
                        case 'A1': // Author Primary
                        case 'AU': // Author
                            currentAuthors.push(value);
                            break;
                        case 'Y1': // Year Primary
                        case 'PY': // Publication Year
                            // Bersihkan format aneh seperti "2020///"
                            const yearMatch = value.match(/(\d{4})/);
                            if (yearMatch) currentRef.year = yearMatch[1];
                            else currentRef.year = value;
                            break;
                        case 'JO': // Journal Name
                        case 'T2': // Secondary Title (Journal)
                        case 'JF': // Journal Full
                            currentRef.journal = value;
                            break;
                        case 'VL': // Volume
                            currentRef.volume = value;
                            break;
                        case 'IS': // Issue
                            currentRef.issue = value;
                            break;
                        case 'SP': // Start Page
                            currentRef.pages = value;
                            break;
                        case 'EP': // End Page
                            if (currentRef.pages) currentRef.pages += `-${value}`;
                            else currentRef.pages = value;
                            break;
                        case 'PB': // Publisher
                            currentRef.publisher = value;
                            break;
                        case 'DO': // DOI
                            currentRef.doi = value;
                            break;
                        case 'UR': // URL
                            currentRef.url = value;
                            break;
                        case 'L1': // Link to File (Fallback to URL if empty)
                            if (!currentRef.url) currentRef.url = value;
                            break;
                        case 'N2': // Abstract/Notes
                        case 'AB': // Abstract
                            // Gabungkan jika ada multiple lines abstrak
                            currentRef.abstract = (currentRef.abstract ? currentRef.abstract + ' ' : '') + value;
                            break;
                        case 'KW': // Keywords
                            // Opsional: Bisa dimasukkan ke abstrak atau catatan jika mau
                            break;
                        default:
                            break;
                    }
                }
            }
        });

        // Push record terakhir
        if (hasStarted && (currentRef.title || currentRef.year)) {
            currentRef.author = currentAuthors.join(', ');
            currentRef.id = Date.now() + Math.random();
            references.push(currentRef);
        }

        return references;
    };

    // 2. Fungsi Generator: Array of Objects -> String .ris
    const generateRisFile = (references) => {
        let risContent = '';

        references.forEach(ref => {
            risContent += 'TY  - JOUR\n'; // Default ke Journal Article agar aman
            if (ref.title) risContent += `T1  - ${ref.title}\n`;
            
            // Handle Authors: Pisahkan koma atau " and " jika ada, agar Mendeley baca per baris
            if (ref.author) {
                // Coba split sederhana
                const authors = ref.author.split(/,| and /).map(a => a.trim()).filter(a => a);
                authors.forEach(a => {
                    risContent += `A1  - ${a}\n`;
                });
            } else {
                risContent += `A1  - Anonim\n`;
            }

            if (ref.year) risContent += `Y1  - ${ref.year}///\n`; // Format tahun RIS sering pakai ///
            
            // Handle Journal (bisa string atau object)
            const journalName = (typeof ref.journal === 'object' && ref.journal !== null) ? ref.journal.name : ref.journal;
            if (journalName) risContent += `JO  - ${journalName}\n`;
            
            if (ref.volume) risContent += `VL  - ${ref.volume}\n`;
            if (ref.issue) risContent += `IS  - ${ref.issue}\n`;
            if (ref.pages) {
                // Coba pisah start/end page
                const pageParts = ref.pages.split('-');
                if (pageParts[0]) risContent += `SP  - ${pageParts[0]}\n`;
                if (pageParts[1]) risContent += `EP  - ${pageParts[1]}\n`;
            }
            if (ref.publisher) risContent += `PB  - ${ref.publisher}\n`;
            if (ref.doi) risContent += `DO  - ${ref.doi}\n`;
            if (ref.url) risContent += `UR  - ${ref.url}\n`;
            if (ref.abstract) risContent += `N2  - ${ref.abstract}\n`;
            
            risContent += 'ER  - \n\n';
        });

        return risContent;
    };

    // Handler: Trigger File Dialog
    const triggerImportRis = () => importRisInputRef.current.click();

    // --- LANGKAH 1: REVISI HANDLER IMPORT (Mode Seleksi) ---
    // Sebelumnya: handleFileImportRis -> Langsung simpan ke DB
    // Sekarang: handleUploadExternalRis -> Simpan ke State Preview
    const handleUploadExternalRis = (event) => {
        const file = event.target.files[0];
        if (file) { 
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const parsedRefs = parseRisFile(content);
                    
                    if (parsedRefs.length === 0) {
                        showInfoModal("Tidak ada referensi yang valid ditemukan dalam file RIS.");
                        return;
                    }

                    // Tandai sumber data agar bisa dilacak nantinya (sesuai diskusi Auto-Tagging)
                    const taggedRefs = parsedRefs.map(ref => ({
                        ...ref,
                        source: 'external_ris' 
                    }));

                    // Simpan ke state PREVIEW, bukan ke projectData
                    setRisSearchResults(taggedRefs);

                    showInfoModal(`Berhasil memuat ${taggedRefs.length} referensi dari file RIS. Silakan tinjau di bagian Preview.`);

                } catch (error) {
                    console.error(error);
                    showInfoModal("Gagal memproses file RIS. Pastikan formatnya benar.");
                }
            };
            reader.readAsText(file);
        }
        event.target.value = null;
    };
    // -------------------------------------------------------

    // Handler: Ekspor RIS
    const handleExportRis = () => {
        if (projectData.allReferences.length === 0) {
            showInfoModal("Tidak ada referensi untuk diekspor.");
            return;
        }

        try {
            const risContent = generateRisFile(projectData.allReferences);
            const blob = new Blob([risContent], { type: "application/x-research-info-systems;charset=utf-8" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.href = url;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `bibliocobra_references_${date}.ris`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            showInfoModal("Gagal mengekspor file RIS.");
        }
    };

    
    const showInfoModal = React.useCallback((message) => {
        setModalMessage(message);
        setShowModal(true);
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
    };

    // --- HELPER BARU: Update salah satu key dalam array ---
    const handleGeminiKeyChange = (index, value) => {
        const newKeys = [...geminiApiKeys];
        newKeys[index] = value;
        setGeminiApiKeys(newKeys);
    };

    const addGeminiKeyField = () => {
        setGeminiApiKeys([...geminiApiKeys, '']);
    };

    const removeGeminiKeyField = (index) => {
        const newKeys = geminiApiKeys.filter((_, i) => i !== index);
        setGeminiApiKeys(newKeys.length > 0 ? newKeys : ['']); // Sisakan minimal 1
    };
    // ----------------------------------------------------

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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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

    // --- LOGIKA BAB I: MIRROR REFLECTION (Auto-Generate & Validate) ---
    
    // 1. Generator Otomatis: Mengubah Masalah menjadi Tujuan (1:1)
    const handleGenerateMirrorReflection = async () => {
        // Cek Premium
        if (!projectData.isPremium) {
            showInfoModal("Fitur 'Mirror Reflection Generator' khusus untuk pengguna Premium.");
            return;
        }

        // Cek apakah input Masalah tersedia
        if (!projectData.rumusanMasalahDraft || projectData.rumusanMasalahDraft.trim() === '') {
            showInfoModal("Harap isi 'Rumusan Masalah' terlebih dahulu. AI membutuhkan pertanyaan untuk merumuskan tujuan.");
            return;
        }

        setIsLoading(true);

        const context = `
Judul: "${projectData.judulKTI}"
Rumusan Masalah (Pertanyaan):
${projectData.rumusanMasalahDraft}
`;

        const prompt = `Anda adalah ahli metodologi penelitian. Tugas Anda adalah merumuskan "Tujuan Penelitian" yang memiliki hubungan "Mirror Reflection" (Cerminan Sempurna/Konsistensi Logis 1:1) dengan Rumusan Masalah di atas.

ATURAN WAJIB (INTERLOCKING LOGIC):
1. **Jumlah Poin Sama:** Jika ada 3 rumusan masalah, WAJIB ada 3 tujuan penelitian.
2. **Taksonomi Kata Kerja:**
   - Jika masalah bersifat Deskriptif ("Bagaimana gambaran..."), gunakan tujuan: "Untuk mengetahui/memetakan..."
   - Jika masalah bersifat Eksplanatif/Korelasional ("Apakah ada pengaruh..."), gunakan tujuan: "Untuk menganalisis pengaruh..."
   - Jika masalah bersifat Preskriptif/Solutif ("Bagaimana strategi..."), gunakan tujuan: "Untuk merumuskan/merancang..."
3. **Format Output:** Hasilkan sebagai teks biasa dengan penomoran yang rapi (1, 2, 3). JANGAN berikan pengantar atau penutup. Langsung ke poin tujuan.

Konteks:
${context}`;

        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
            // Bersihkan format markdown jika ada
            const cleanResult = result.replace(/[*_]/g, "").trim();
            
            setProjectData(prev => ({ 
                ...prev, 
                tujuanPenelitianDraft: cleanResult 
            }));
            
            showInfoModal("Tujuan Penelitian berhasil diselaraskan (Mirroring) dengan Rumusan Masalah!");
        } catch (error) {
            showInfoModal(`Gagal menyelaraskan tujuan: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Validator Logika: Mengecek Konsistensi Tanpa Mengubah Teks (Updated: With Suggestions)
    const handleValidateMirrorReflection = async () => {
        // Cek Premium
        if (!projectData.isPremium) {
            showInfoModal("Fitur 'Validasi Logika' khusus untuk pengguna Premium.");
            return;
        }

        if (!projectData.rumusanMasalahDraft || !projectData.tujuanPenelitianDraft) {
            showInfoModal("Harap isi kedua kolom (Rumusan Masalah & Tujuan) untuk melakukan validasi.");
            return;
        }

        setIsLoading(true);

        const prompt = `Bertindaklah sebagai Reviewer Jurnal Q1 yang sangat teliti. Tugas Anda adalah memvalidasi "Methodological Coherence" (Kepaduan Metodologis) antara Rumusan Masalah dan Tujuan Penelitian di bawah ini.

RUMUSAN MASALAH:
${projectData.rumusanMasalahDraft}

TUJUAN PENELITIAN:
${projectData.tujuanPenelitianDraft}

Lakukan pengecekan ketat:
1. **Jumlah Poin:** Apakah jumlah poin pertanyaan sama persis dengan jumlah poin tujuan?
2. **Konsistensi Substansi:** Apakah Tujuan benar-benar menjawab Pertanyaan?
3. **Ketepatan Kata Kerja:** Apakah kata kerja operasional yang digunakan sudah pas dengan level masalahnya?

Output (JSON Format):
{
  "status": "VALID" | "WARNING",
  "message": "Penjelasan singkat mengenai status validasi.",
  "saran": "Berikan saran perbaikan yang KONKRET dan JELAS (apa yang harus diubah/ditambahkan) agar menjadi VALID. (Wajib diisi jika status WARNING, kosongkan jika VALID)"
}
`;
        
        const schema = {
            type: "OBJECT",
            properties: {
                status: { type: "STRING", enum: ["VALID", "WARNING"] },
                message: { type: "STRING" },
                saran: { type: "STRING" }
            },
            required: ["status", "message"]
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
            
            let icon = result.status === 'VALID' ? '🟢' : '⚠️';
            let title = result.status === 'VALID' ? 'LOGIKA VALID' : 'PERINGATAN LOGIKA';
            
            let alertMsg = `${icon} ${title}\n\nAnalisis: ${result.message}`;
            
            if (result.status === 'WARNING' && result.saran) {
                alertMsg += `\n\n💡 SARAN PERBAIKAN:\n${result.saran}`;
            }
            
            showInfoModal(alertMsg);

        } catch (error) {
            showInfoModal(`Gagal memvalidasi logika: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    // --- AKHIR LOGIKA BAB I ---

    // --- LOGIKA BAB II: THEORY PYRAMID (Auto-Classification) ---
    const handleClassifyTheories = async (selectedIds) => {
        // Cek Premium
        if (!projectData.isPremium) {
            showInfoModal("Fitur 'Klasifikasi Teori Otomatis' khusus untuk pengguna Premium.");
            return;
        }

        if (!selectedIds || selectedIds.length === 0) {
            showInfoModal("Pilih minimal satu referensi untuk diklasifikasikan.");
            return;
        }

        setIsLoading(true);

        // Filter referensi terpilih
        const sourceRefs = projectData.allReferences.filter(ref => selectedIds.includes(ref.id));
        
        // Format data untuk AI
        const refList = sourceRefs.map((ref, index) => 
            `[ID: ${ref.id}] Judul: "${ref.title}"\nAbstrak/Catatan: ${ref.abstract || ref.isiKutipan || "Tidak ada data"}`
        ).join('\n---\n');

        const prompt = `Anda adalah arsitek teori penelitian. Tugas Anda adalah memilah literatur berikut ke dalam 3 tingkatan hierarki teori (Theory Pyramid).

DAFTAR LITERATUR:
${refList}

INSTRUKSI KLASIFIKASI:
1. **Grand Theory (Payung):** Teori induk yang sangat abstrak/umum. (Misal: Manajemen Strategi, Public Administration, TPB).
2. **Middle-Range Theory (Penghubung):** Teori yang menjelaskan hubungan spesifik antar variabel. (Misal: Dynamic Governance, Budaya Organisasi, TAM).
3. **Applied Theory (Operasional):** Indikator teknis, regulasi, atau model pengukuran spesifik. (Misal: Indikator GII, UU No. 11/2019, Skala Likert).

Berikan alasan singkat (reason) kenapa masuk kategori tersebut.

Output Wajib JSON:
{
  "grand": [{ "id": "...", "title": "...", "reason": "..." }],
  "middle": [{ "id": "...", "title": "...", "reason": "..." }],
  "applied": [{ "id": "...", "title": "...", "reason": "..." }]
}`;

        const schema = {
            type: "OBJECT",
            properties: {
                grand: { type: "ARRAY", items: { type: "OBJECT", properties: { id: {type: "NUMBER"}, title: {type: "STRING"}, reason: {type: "STRING"} } } },
                middle: { type: "ARRAY", items: { type: "OBJECT", properties: { id: {type: "NUMBER"}, title: {type: "STRING"}, reason: {type: "STRING"} } } },
                applied: { type: "ARRAY", items: { type: "OBJECT", properties: { id: {type: "NUMBER"}, title: {type: "STRING"}, reason: {type: "STRING"} } } }
            },
            required: ["grand", "middle", "applied"]
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
            setProjectData(prev => ({ 
                ...prev, 
                theoryClassification: result 
            }));
            showInfoModal("Klasifikasi Teori (Grand/Middle/Applied) berhasil dipetakan!");
        } catch (error) {
            showInfoModal(`Gagal mengklasifikasikan teori: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    // --- AKHIR LOGIKA BAB II ---
    
    const handleShowSearchPrompts = async () => {
        if (!projectData.aiReferenceClues) {
            showInfoModal("Harap hasilkan 'Clue Referensi' terlebih dahulu.");
            return;
        }
        setShowSearchPromptModal(true);
    };

    const handleAiReview = React.useCallback(async (paper, searchContext) => {
        // 1. Validasi Awal: Pastikan User punya Judul atau Topik
        if (!projectData.topikTema && !projectData.judulKTI) {
          throw new Error("Harap tentukan 'Topik atau Tema' atau 'Judul' di tab 'Ide KTI' terlebih dahulu.");
        }
        
        // 2. Tentukan Konteks Utama (The Truth)
        // Ini adalah logika baru: Judul KTI adalah "Kiblat Kebenaran"
        const mainContext = projectData.judulKTI 
            ? `Judul Proyek: "${projectData.judulKTI}"\nTopik: "${projectData.topikTema}"`
            : `Topik Proyek: "${projectData.topikTema}"`;
        
        // 3. Susun Prompt dengan Logika Prioritas
        const prompt = `Anda adalah seorang asisten peneliti ahli (Reviewer Jurnal). Tugas utama Anda adalah memfilter apakah paper ini **RELEVAN/LAYAK DIKUTIP** untuk mendukung **PROYEK PENELITIAN PENGGUNA** di bawah ini.

**PROYEK PENELITIAN PENGGUNA (ACUAN UTAMA/KIBLAT):**
${mainContext}

**Kata Kunci Pencarian Saat Ini (Sekadar Konteks):**
"${searchContext || 'Tidak ada'}"

**Paper yang Dinilai:**
- Judul: ${paper.title}
- Abstrak: ${paper.abstract || "Tidak tersedia."}

**LOGIKA PENILAIAN RELEVANSI (CRITICAL - BACA DENGAN TELITI):**
Jangan terjebak hanya mencocokkan paper dengan "Kata Kunci Pencarian". Fokuslah pada apakah paper ini berguna untuk **PROYEK PENELITIAN PENGGUNA**.

1. **Sangat Relevan:** Paper membahas topik yang SAMA PERSIS atau sangat mendukung substansi Proyek Pengguna.
2. **Relevan:** Paper membahas teori dasar, metode, atau konteks yang berguna bagi Proyek Pengguna.
3. **Tidak Relevan:** Paper membahas topik yang JAUH BERBEDA atau BERTENTANGAN dengan Proyek Pengguna, meskipun mungkin cocok dengan "Kata Kunci Pencarian" yang dimasukkan pengguna. 
   *(Contoh: User meneliti 'AI Pemerintahan' tapi iseng mencari 'Sepakbola'. Paper bola harus dinilai TIDAK RELEVAN meskipun match dengan kata kunci).*

**Instruksi Output:**
1.  **Finding:** Rangkum inti paper (Tujuan, Metode, Hasil) dalam satu paragraf padat Bahasa Indonesia.
2.  **Analisis Relevansi:** Jelaskan secara spesifik hubungan paper ini dengan **JUDUL PROYEK PENGGUNA**. Jelaskan mengapa ia mendukung atau tidak mendukung proyek tersebut.
3.  **Kategorikan Relevansi:** Pilih satu: "Sangat Relevan", "Relevan", atau "Tidak Relevan".

Berikan jawaban HANYA dalam format JSON yang ketat.`;
    
        // 4. Skema Output JSON
        const schema = {
            type: "OBJECT",
            properties: {
                finding: { type: "STRING", description: "Satu paragraf padat yang merangkum paper." },
                relevansi: { type: "STRING", description: "Penjelasan hubungan paper dengan JUDUL PROYEK PENGGUNA." },
                kategori_relevansi: { 
                    type: "STRING", 
                    description: "Kategori relevansi.",
                    enum: ["Sangat Relevan", "Relevan", "Tidak Relevan"]
                }
            },
            required: ["finding", "relevansi", "kategori_relevansi"]
        };
    
        // 5. Eksekusi AI
        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
            return result;
        } catch (error) {
            showInfoModal(`Gagal mereview paper: ${error.message}`);
        }
    }, [geminiApiKeys, projectData.topikTema, projectData.judulKTI, showInfoModal]);
  
    const parseManualReference = (text) => {
        const lines = text.split('\n');
        const reference = {
            title: '', journal: '', year: '', author: '', editors: '',
            volume: '', issue: '', pages: '', url: '', doi: '',
            publisher: '', abstract: '' // <-- Tambahkan inisialisasi abstract
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
                // --- UPDATE 2: Tambahkan Case untuk Abstract ---
                case 'abstract': reference.abstract = value; break;
                // ----------------------------------------------
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
        // --- PERBAIKAN PROMPT ---
        const prompt = `Anda adalah API parser yang sangat akurat. Tugas Anda adalah mengurai teks referensi akademis menjadi format JSON yang ketat. JANGAN memberikan penjelasan atau teks tambahan apa pun. Respons Anda HARUS HANYA berupa objek JSON yang valid.

Urai teks berikut:
"${freeTextRef}"`;
        
        const schema = {
            type: "OBJECT",
            properties: {
                title: { type: "STRING", description: "Judul lengkap artikel atau karya tulis." },
                author: { type: "STRING", description: "Semua penulis, dipisahkan oleh 'and' atau koma." },
                year: { type: "STRING", description: "Tahun publikasi." },
                journal: { type: "STRING", description: "Nama jurnal atau publikasi." },
                volume: { type: "STRING", description: "Nomor volume jurnal." },
                issue: { type: "STRING", description: "Nomor isu atau edisi jurnal." },
                pages: { type: "STRING", description: "Rentang halaman." },
                doi: { type: "STRING", description: "Digital Object Identifier, tanpa https://doi.org/." }
            },
            required: ["title", "author", "year"]
        };

        try {
            const parsedRef = await geminiService.run(prompt, geminiApiKeys, { schema });
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

    // --- FITUR BARU: SMART PASTE HANDLER ---
    const handleSmartPaste = async () => {
        setIsLoading(true);
        
        const prompt = `Anda adalah asisten riset yang cerdas. Pengguna akan memberikan teks mentah yang disalin langsung dari halaman pertama sebuah jurnal ilmiah (PDF). Teks ini mungkin berantakan, berisi header/footer, dan line break yang salah.

Tugas Anda:
1. Analisis teks tersebut untuk menemukan metadata bibliografi.
2. Temukan dan rekonstruksi paragraf **ABSTRAK** agar menjadi satu paragraf yang rapi (hilangkan line break yang tidak perlu).
3. Kembalikan data dalam format JSON yang valid.

Teks Mentah:
"""
${smartPasteText}
"""

Hasilkan JSON dengan key: title, author (semua penulis dipisah koma), year, journal, volume, issue, pages, doi, publisher, abstract.`;

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
                doi: { type: "STRING" },
                publisher: { type: "STRING" },
                abstract: { type: "STRING" }
            },
            required: ["title", "author", "year"]
        };

        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
            
            // Format hasil ke dalam Template Manual
            const filledTemplate = `Journal Article Title: ${result.title || ''}
Journal Name: ${result.journal || ''}
Date: ${result.year || ''}
Contributing Authors: ${result.author || ''}
Editors Name: 
Volume: ${result.volume || ''}
Issue: ${result.issue || ''}
Pages: ${result.pages || ''}
URL: 
DOI: ${result.doi || ''}
Publisher Name: ${result.publisher || ''}
Abstract: ${result.abstract || ''}`;

            // Masukkan ke state manualRef
            setManualRef({ id: null, text: filledTemplate });
            
            // Pindah tab ke "Isi Template" agar user bisa cek
            setManualMode('template');
            
            // Bersihkan input smart paste
            setSmartPasteText('');
            
            showInfoModal("Data berhasil diekstrak! Silakan periksa di tab 'Isi Template' dan klik 'Tambah ke Proyek' jika sudah sesuai.");

        } catch (error) {
            showInfoModal(`Gagal mengekstrak data (Smart Paste): ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    // ---------------------------------------

    const handleEditReference = (ref) => {
        // --- UPDATE 3: Masukkan Data Abstract ke dalam Template Edit ---
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
Publisher Name: ${ref.publisher || ''}
Abstract: ${ref.abstract || ''}`;
        // -------------------------------------------------------------
        setManualRef({ id: ref.id, text: text });
        setOpenMethod('method4'); // Otomatis buka accordion Metode 3 (Tambah Manual)
        setManualMode('template'); // Otomatis pilih tab Template
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll halus ke atas
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
        try { // Add try...catch for better error handling
            const list = projectData.allReferences
                 // --- PERBAIKAN DI SINI ---
                .sort((a, b) => {
                    // Pastikan a.author dan b.author selalu string sebelum dibandingkan
                    const authorA = String(a.author || ''); 
                    const authorB = String(b.author || '');
                    return authorA.localeCompare(authorB);
                })
                // --- AKHIR PERBAIKAN ---
                .map(ref => {
                    // Start with author and year. Add space after period. Use defaults if missing.
                    let citation = `${ref.author || 'Anonim'} (${ref.year || 't.t.'}). ${ref.title || 'Judul tidak tersedia'}.`;

                    // Handle journal details if available
                    if (ref.journal) {
                        // Check if journal is an object (from S2) or string (from Scopus/Manual)
                        const journalName = (typeof ref.journal === 'object' && ref.journal !== null) ? ref.journal.name : ref.journal;
                        citation += ` <i>${journalName || 'Nama Jurnal Tidak Tersedia'}</i>`; // Italicize journal name
                        if (ref.volume) citation += `, <i>${ref.volume}</i>`; // Italicize volume
                        if (ref.issue) citation += `(${ref.issue})`;
                        if (ref.pages) citation += `, ${ref.pages}`;
                        citation += '.'; // Add period after journal details
                    }

                    // Add DOI or URL
                    if (ref.doi) {
                        citation += ` https://doi.org/${ref.doi}`;
                    } else if (ref.url) {
                        // Check if it's already a full URL before adding prefix
                        citation += ref.url.startsWith('http') ? ` ${ref.url}` : ` Diperoleh dari ${ref.url}`;
                    }
                    return citation; // Return the single formatted citation string
                }).join('<br /><br />'); // Join directly with HTML line breaks for rendering

            // --- DEBUGGING ---
            console.log("Generated APA List (HTML):", list); 
            // --- END DEBUGGING ---

            // Set the generated HTML string to state
            setGeneratedApaReferences(list);

        } catch (error) {
             console.error("Error generating APA list:", error);
             showInfoModal(`Terjadi error saat membuat daftar pustaka: ${error.message}`);
             setGeneratedApaReferences(''); // Clear output on error
        }
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
    
    const handleGenerateReferenceClues = async () => {
        setIsLoading(true);
        setProjectData(prev => ({ ...prev, aiReferenceClues: null }));
        
        const context = `Konteks Proyek:
- Topik atau Judul: "${projectData.judulKTI || projectData.topikTema}"
- Pendekatan Penelitian (Wajib Diikuti): "${projectData.pendekatan}"
- Jenis Karya Tulis: "${projectData.jenisKaryaTulis === 'Lainnya' ? projectData.jenisKaryaTulisLainnya : projectData.jenisKaryaTulis}"
- Metode Spesifik: "${projectData.metode || 'Belum ditentukan'}"`;

        // --- MODIFIKASI PROMPT DIMULAI DI SINI ---
        const prompt = `Anda adalah seorang asisten riset ahli. Berdasarkan konteks proyek berikut, buatlah daftar kategori referensi kunci yang terstruktur dan sangat mendalam.

Gunakan kerangka kategori standar berikut dan patuhi semua aturan. Untuk setiap item, hasilkan DUA hal:
1.  **clue**: Kata kunci pencarian yang sangat singkat dan padat (maksimal 5 kata). Ini HARUS berupa frasa yang efektif untuk digunakan di mesin pencari akademis atau basis data hukum.
2.  **explanation**: Sebuah kalimat penjelasan lengkap yang menguraikan relevansi dan tujuan dari pencarian kata kunci tersebut.

**Contoh Format yang Diinginkan:**
- clue: "efek bioakustik kebisingan kapal"
- explanation: "Mencari literatur tentang efek bioakustik dari kebisingan yang dihasilkan kapal terhadap organisme laut untuk memahami mekanisme dampaknya."

---
**KERANGKA & ATURAN CERDAS**

**Kategori 1: Definisi Inti & Konsep Kunci**
- **Aturan:** Urai 'Topik atau Judul' menjadi komponennya. Fokus pada Variabel Utama. Jika ada nama organisasi spesifik, jadikan clue tersendiri.

**Kategori 2: Landasan Teori (Hierarki 3 Level)**
- **Aturan:**
    1. **Grand Theory:** Teori induk yang abstrak (misal: Manajemen Strategis).
    2. **Middle-Range Theory:** Teori penghubung variabel (misal: TAM, UTAUT).
    3. **Applied Theory:** Model pengukuran atau regulasi teknis.

**Kategori 3: Metodologi Penelitian (CRITICAL RULE)**
- **Jika Metode mengandung 'Bibliometrik':** Sarankan "bibliometric analysis best practices" atau "science mapping guidelines". **DILARANG** menyarankan PRISMA kecuali pengguna juga menulis 'SLR' atau 'Systematic Review'.
- **Jika Metode mengandung 'SLR':** WAJIB sarankan 'PRISMA 2020 guidelines'.
- **Jika Kualitatif:** Sarankan metode seperti studi kasus, etnografi, dll.

**Kategori 4: Studi Terdahulu & Praktik Terbaik**
- **Aturan:** Sarankan clue untuk mencari studi kasus (Case Study) atau praktik terbaik (Best Practices) di konteks sejenis.

**Kategori 5: Tantangan & Kesenjangan Riset (Research Gap)**
- **Aturan:** Jangan hanya menulis "research gap". Gunakan kata kunci indikator masalah seperti "challenges", "barriers", "limitations", atau "future research agenda" dalam clue untuk menemukan gap yang nyata.

**Kategori 6: Peraturan Terkait**
- **Aturan:** Identifikasi potensi UU/PP/Permen di Indonesia yang relevan.

---
**KONTEKS PROYEK PENGGUNA:**
${context}
---
`;
        // --- MODIFIKASI PROMPT BERAKHIR DI SINI ---

        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    category: { type: "STRING" },
                    clues: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                clue: { type: "STRING", description: "Kata kunci pencarian singkat (maks. 5 kata)." },
                                explanation: { type: "STRING", description: "Kalimat penjelasan lengkap tentang relevansi clue." }
                            },
                            required: ["clue", "explanation"]
                        }
                    }
                },
                required: ["category", "clues"]
            }
        };
        try {
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
            setProjectData(prev => ({ ...prev, aiReferenceClues: result }));
            showInfoModal("Clue referensi berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal membuat clue: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
  
    // UPDATE: Menerima selectedIds untuk Pendahuluan
    const handleGenerateFullPendahuluan = async (selectedIds = []) => {
        setIsLoading(true);
        
        // Filter referensi: Jika ada yang dipilih, pakai itu. Jika tidak, pakai semua (fallback).
        const sourceRefs = (selectedIds && selectedIds.length > 0) 
            ? projectData.allReferences.filter(ref => selectedIds.includes(ref.id))
            : projectData.allReferences;

        const kutipanString = sourceRefs
            .filter(ref => ref.isiKutipan)
            .map(ref => `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`)
            .join('\n');
        
        // [BAGIAN OUTLINE SUDAH DIHAPUS DISINI]

        // --- PERBAIKAN PROMPT DI SINI (AKSI 1 & AKSI 2 LENGKAP) ---
        const prompt = `Anda adalah seorang penulis akademik ahli yang sangat teliti. Tugas Anda adalah menulis draf Bab 1: Pendahuluan yang lengkap dan koheren HANYA berdasarkan informasi yang disediakan.

**Aturan Paling Penting (WAJIB DIPATUHI):**
- **Dilarang Keras Menambah Informasi:** Gunakan SECARA EKSKLUSIF informasi dari "Konteks Proyek" di bawah. JANGAN menambahkan informasi, konsep, atau referensi lain yang tidak ada secara eksplisit dalam catatan yang diberikan. Anda harus bekerja HANYA dengan materi yang ada.
- **Tulis Seluruhnya sebagai Teks Biasa (Plain Text):** Jangan gunakan format markdown (*, _, **), HTML, atau format lainnya.
- **Gunakan Sub-judul Bernomor:** Wajib gunakan format seperti "1.1 Latar Belakang", "1.2 Rumusan Masalah", dst.
- **WAJIB SERTAKAN SITASI:** Saat Anda menggunakan informasi dari "Catatan dari Referensi" untuk sub-bab 1.1 Latar Belakang, Anda wajib menyertakan sitasinya di dalam teks, misal: (Penulis, Tahun).

**Konteks Proyek (Satu-satunya Sumber Informasi Anda):**
- Judul: "${projectData.judulKTI}"
- Pokok Masalah: "${projectData.faktaMasalahDraft}"
- Rumusan Masalah (Pertanyaan Penelitian): "${projectData.rumusanMasalahDraft || 'Belum ada rumusan masalah spesifik.'}" 
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft}"
- Catatan dari Referensi (untuk mendukung latar belakang):
${kutipanString || "Tidak ada catatan spesifik dari referensi."}

**Struktur Bab Pendahuluan yang Harus Anda Hasilkan:**
1.1 Latar Belakang / Konteks Ilmiah
Menyajikan konteks ilmiah dan fenomena terkini terkait topik penelitian.
Menunjukkan kondisi global/nasional yang relevan, termasuk data terbaru.
Menguraikan masalah empiris dan pentingnya penelitian ini dilakukan.
Didukung oleh sitasi terbaru (≤5 tahun terakhir) untuk menunjukkan state of the art.

1.2. Kesenjangan Penelitian (Research Gap)
Mengidentifikasi kekurangan atau ketidakkonsistenan pada penelitian sebelumnya.
Menjelaskan secara spesifik aspek apa yang belum dikaji oleh peneliti terdahulu.
Menunjukkan kebaruan (novelty) penelitian saat ini dengan jelas, misalnya: “Namun, kajian sebelumnya belum membahas … dalam konteks …”
Bagian ini adalah inti Bab 1 dalam standar Q1.

1.3. Rumusan Masalah (Problem Statement)
Menyatakan secara tegas masalah inti yang hendak diselesaikan.
Disusun sebagai jembatan antara research gap dan pertanyaan penelitian.
Cukup 1–2 kalimat, tanpa elaborasi berlebihan.

1.4. Pertanyaan Penelitian / Hipotesis
Jika kualitatif atau mixed method: daftar 1–3 pertanyaan penelitian.
Jika kuantitatif: rumusan hipotesis yang jelas (arah hubungan variabel opsional).

1.5. Tujuan Penelitian
Menyebutkan tujuan umum dan tujuan khusus penelitian.
Selaras langsung dengan research gap dan pertanyaan penelitian.

1.6. Kontribusi Penelitian (Teoretis dan Praktis)
Kontribusi teoretis:
Menjelaskan bagaimana penelitian memperluas teori, memvalidasi model, atau memperbaiki pendekatan metodologis.
Kontribusi praktis / kebijakan / manajerial:
Dampak penelitian pada praktik kebijakan, manajemen, atau pengambilan keputusan di sektor terkait.
Bagian ini menjadi indikator penting dalam penilaian jurnal Q1 untuk menentukan nilai kebaruan dan relevansi.

1.7. Struktur Artikel
Satu paragraf pendek yang menjelaskan alur keseluruhan artikel, misalnya:
“Artikel ini disajikan sebagai berikut. Bagian 2 membahas tinjauan pustaka dan pengembangan hipotesis. Bagian 3 menjelaskan metodologi penelitian. Bagian 4 menyajikan hasil dan pembahasan. Bagian 5 memberikan kesimpulan dan implikasi.”
Pastikan ada kesinambungan dan alur yang logis antar sub-bab.`;

        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
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
                instruction = 'Ringkas teks berikut sekitar 30-40% dengan tetap mempertahankan semua poin kunci dan referensi. Fokus pada kalimat yang paling esensial. PENTING: Usahakan untuk **mempertahankan struktur format** yang ada (seperti penomoran sub-bab 1.1, 1.2, dst.) jika ada di teks asli. Hasilkan sebagai teks biasa.';
                break;
            case 'medium':
                instruction = 'Tulis ulang teks berikut dengan panjang yang kurang lebih sama, tetapi gunakan gaya bahasa yang lebih mengalir dan akademis. Perbaiki struktur kalimat jika perlu tanpa mengubah substansi atau referensi. PENTING: Usahakan untuk **mempertahankan struktur format** yang ada (seperti penomoran sub-bab 1.1, 1.2, dst.) jika ada di teks asli. Hasilkan sebagai teks biasa.';
                break;
            case 'lengthen':
                instruction = 'Perpanjang teks berikut sekitar 40-50%. Elaborasi setiap argumen utama dengan penjelasan lebih dalam atau contoh konkret. Pastikan semua informasi tetap konsisten dengan substansi asli dan kutipan yang ada. Jangan mengurangi atau mengubah referensi yang sudah ada. Tujuannya adalah menambah bobot argumen, bukan hanya menambah kata. PENTING: Usahakan untuk **mempertahankan struktur format** yang ada (seperti penomoran sub-bab 1.1, 1.2, dst.) jika ada di teks asli. Hasilkan sebagai teks biasa.';
                break;
            // INI ADALAH KODE YANG SALAH:
/* --- BLOK BARU DITAMBAHKAN DI SINI --- */
case 'humanize':
    instruction = `Anda adalah seorang editor ahli yang bertugas "menghumanisasi" draf akademis agar tidak terlalu kaku dan tidak terdeteksi sebagai tulisan AI. Tugas Anda: Ambil teks berikut dan tulis ulang HANYA berdasarkan instruksi ini:
1. Variasikan Ritme Kalimat (Burstiness): Hancurkan ritme yang monoton. Gunakan campuran kalimat yang sangat pendek (4-5 kata) disusul dengan kalimat yang lebih panjang (15-20 kata).
2. Pecah Paragraf: Jika paragraf terlalu padat, pecah menjadi 2-3 paragraf yang lebih kecil dan fokus.
3. Ganti Transisi Formal: Ganti kata penghubung 'kaku' (Contoh: "Selain itu,", "Lebih lanjut,", "Maka dari itu,") dengan frasa transisi yang lebih mengalir dan semi-formal (Contoh: "Bicara soal hal ini,", "Tapi bukan cuma itu,", "Gampangnya,", "Kalau kita lihat lebih dalam,").
4. Variasi Diksi (Pilihan Kata): Ganti beberapa kata yang terlalu formal/umum dengan sinonim yang lebih dinamis namun TETAP SOPAN. (Contoh: 'mencapai' -> 'tembus', 'sangat efektif' -> 'terbukti ampuh', 'menunjukkan' -> 'membuktikan').

PENTING (Batasan):
1. JANGAN mengubah fakta, data, angka, sitasi, atau makna inti.
2. TETAP JAGA KESOPANAN: DILARANG menggunakan bahasa slang yang tidak pantas untuk karya ilmiah (Contoh: "gila", "banget", "keren"). Tetap dalam ranah semi-formal yang profesional.
3. Format: Hasilkan sebagai teks biasa (plain text) dan pertahankan struktur sub-bab (misal: 1.1, 1.2) jika ada di teks asli.`; break;
/* --- AKHIR BLOK BARU --- */    
            default:
                setIsLoading(false);
                return;
        }

        const prompt = `${instruction}\n\n---TEKS ASLI---\n${currentText}`;

        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, [draftKey]: cleanResult }));
            showInfoModal(`Draf berhasil diubah ke versi "${mode}".`);
        } catch (error) {
            showInfoModal(`Gagal mengubah draf: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // UPDATE: Menerima selectedIds untuk Metode
    const handleGenerateMetode = async (selectedIds = []) => {
        setIsLoading(true);
        
        // --- PERUBAHAN (LOGIKA INTEGRASI SLR) DIMULAI DI SINI ---

        // 1. Cek apakah ini riset SLR/Bibliometrik
        const isSLR = projectData.metode && (
            projectData.metode.toLowerCase().includes('slr') ||
            projectData.metode.toLowerCase().includes('systematic literature review') ||
            projectData.metode.toLowerCase().includes('bibliometric')
        );

        // 2. Siapkan data SLR jika relevan
        let slrContext = '';
        if (isSLR) {
            // Data dari Log Kueri
            const logRingkasan = projectData.searchLog
                .map(log => `- Database: ${log.database}, Kueri: "${log.query}", Hasil: ${log.resultsCount} (Tanggal: ${log.searchDate})`)
                .join('\n');
            
            // Data dari PRISMA
            const { studies = [], initialRecordCount = 0, duplicateCount = 0, automationIneligible = 0, otherReasonsRemoved = 0, reportsNotRetrieved = 0 } = projectData.prismaState || {};
            const records_screened = initialRecordCount - duplicateCount - automationIneligible - otherReasonsRemoved;
            const records_excluded = studies.filter(s => s.screeningStatus === 'abstract_excluded').length;
            const reports_sought_for_retrieval = records_screened - records_excluded;
            const reports_assessed_for_eligibility = reports_sought_for_retrieval - reportsNotRetrieved;
            const reports_excluded_fulltext = studies.filter(s => s.screeningStatus === 'fulltext_excluded').length;
            const studies_included_in_review = reports_assessed_for_eligibility - reports_excluded_fulltext;
            
            // Data dari Template Ekstraksi
            const extractionColumns = projectData.synthesisTableColumns
                .map(col => `- ${col.label}`)
                .join('\n');

            slrContext = `
**Konteks SLR Spesifik (WAJIB DIGUNAKAN):**
---
**Strategi Pencarian (dari Log Kueri):**
${logRingkasan || "Log kueri belum diisi."}

**Seleksi Studi (dari Diagram PRISMA):**
- Total record awal: ${initialRecordCount}
- Record setelah duplikat dihapus: ${initialRecordCount - duplicateCount}
- Record di-screen (abstrak): ${records_screened}
- Record dieksklusi (abstrak): ${records_excluded}
- Laporan dinilai kelayakannya (full-text): ${reports_assessed_for_eligibility}
- Laporan dieksklusi (full-text): ${reports_excluded_fulltext}
- Studi final yang diinklusi: ${studies_included_in_review}

**Ekstraksi Data (dari Template Tabel Sintesis):**
Kolom-kolom berikut digunakan untuk ekstraksi data:
${extractionColumns}
---
`;
        }

        // 3. Mengambil kutipan metodologi (logika yang sudah ada) -> UPDATE: Filtered
        // Filter referensi: Gunakan yang dipilih jika ada
        const sourceRefs = (selectedIds && selectedIds.length > 0) 
            ? projectData.allReferences.filter(ref => selectedIds.includes(ref.id))
            : projectData.allReferences;

        const kutipanMetodologiString = sourceRefs
            .filter(ref => ref.isiKutipan)
            .map(ref => `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`)
            .join('\n');

        // 4. Memilih prompt yang tepat
        let prompt;
        if (isSLR) {
            // PROMPT KHUSUS SLR
            prompt = `Anda adalah seorang penulis akademik dan ahli metodologi SLR/Bibliometrik. Tugas Anda adalah menulis draf Bab 3: Metode Penelitian yang sangat rinci HANYA berdasarkan data yang disediakan.

**Aturan Paling Penting (WAJIB DIPATUHI):**
- **Dilarang Keras Menambah Informasi:** Gunakan SECARA EKSKLUSIF informasi dari "Konteks Proyek" dan "Konteks SLR Spesifik". JANGAN membuat asumsi atau menambahkan informasi yang tidak ada.
- **Tulis Seluruhnya sebagai Teks Biasa (Plain Text):** Jangan gunakan format markdown (*, _, **), HTML, atau format lainnya.
- **Gunakan Sub-judul Bernomor:** Wajib gunakan format "3.1 ...", "3.2 ...", dst.

**Konteks Proyek (Sumber Umum):**
- Judul: "${projectData.judulKTI}"
- Pendekatan Penelitian: "${projectData.pendekatan}"
- Metode Spesifik: "${projectData.metode}"
- Sumber Data: "${projectData.basisData}"
- Periode: "${projectData.periode}"
- Tools Analisis: "${projectData.tools}"

${slrContext} 

**Catatan Relevan dari Referensi (Gunakan untuk Mendukung Penjelasan):**
---
${kutipanMetodologiString || "Tidak ada catatan relevan dari referensi yang dapat digunakan."}
---

**Struktur Bab Metode SLR yang Harus Anda Hasilkan:**
1.  **Judul Bab:** "BAB III METODE PENELITIAN".
2.  **3.1 Desain Penelitian:** Jelaskan secara singkat bahwa penelitian ini menggunakan ${projectData.metode}.
3.  **3.2 Strategi Pencarian:** Uraikan proses pencarian. Gunakan data dari "Strategi Pencarian (dari Log Kueri)" untuk menjelaskan database yang digunakan dan ringkasan kueri. Sebutkan juga "Periode" dan "Sumber Data" dari Konteks Proyek.
4.  **3.3 Seleksi Studi dan Kriteria Inklusi/Eksklusi:** Jelaskan alur seleksi studi. Gunakan angka-angka dari "Seleksi Studi (dari Diagram PRISMA)" untuk menjelaskan proses dari identifikasi awal hingga studi final yang diinklusi (alur PRISMA).
5.  **3.4 Ekstraksi Data:** Jelaskan proses ekstraksi data. Gunakan daftar kolom dari "Ekstraksi Data (dari Template Tabel Sintesis)" untuk menjelaskan data apa saja yang dikumpulkan dari setiap studi.
6.  **3.5 Analisis Data:** Jelaskan "Tools Analisis" yang digunakan (misal: VOSviewer, R) untuk menganalisis data yang telah diekstrak.

Susun poin-poin di atas menjadi narasi bab metode yang koheren dan didukung data.`;
        
        } else {
            // PROMPT UMUM (yang sudah ada sebelumnya)
            prompt = `Anda adalah seorang penulis akademik dan metodolog penelitian yang sangat teliti. Tugas Anda adalah menulis draf Bab 3: Metode Penelitian yang komprehensif HANYA berdasarkan informasi dan kutipan yang disediakan.

**Aturan Paling Penting (WAJIB DIPATUHI):**
- **Dilarang Keras Menambah Informasi:** Gunakan SECARA EKSKLUSIF informasi dari "Konteks Proyek" dan "Catatan Relevan dari Referensi" di bawah. JANGAN menambahkan informasi, asumsi, atau referensi lain yang tidak ada secara eksplisit.
- **Tulis Seluruhnya sebagai Teks Biasa (Plain Text):** Jangan gunakan format markdown (*, _, **), HTML, atau format lainnya.
- **Gunakan Sub-judul Bernomor:** Wajib gunakan format "3.1 Desain Penelitian", "3.2 ...", dst.
- **Integrasikan Sitasi:** Jika "Catatan Relevan dari Referensi" tersedia, gunakan kutipan tersebut untuk memperkuat penjelasan metodologi. Sebutkan sumbernya (penulis, tahun) saat Anda mengutip sebuah ide.

**Konteks Proyek (Sumber Utama):**
- Judul: "${projectData.judulKTI}"
- Pendekatan Penelitian: "${projectData.pendekatan}"
- Metode Spesifik: "${projectData.metode || 'Tidak ditentukan'}"
- Sumber Data: "${projectData.basisData || 'Tidak ditentukan'}"
- Periode: "${projectData.periode || 'Tidak ditentukan'}"
- Tools Analisis: "${projectData.tools || 'Tidak ditentukan'}"

**Catatan Relevan dari Referensi (Gunakan untuk Mendukung Penjelasan):**
---
${kutipanMetodologiString || "Tidak ada catatan relevan dari referensi yang dapat digunakan."}
---

**Struktur Bab Metode yang Harus Anda Hasilkan:**
1.  **Judul Bab:** Mulai dengan "BAB III METODE PENELITIAN".
2.  **3.1 Desain Penelitian:** Jelaskan desain penelitian berdasarkan "Pendekatan Penelitian". Jika ada kutipan yang relevan tentang pendekatan ini, gunakan untuk memperkuat argumen.
3.  **3.2 Metode Pengumpulan Data:** Uraikan bagaimana data akan dikumpulkan, sebutkan "Sumber Data" dan "Periode".
4.  **3.3 Metode Analisis Data:** Jelaskan "Metode Spesifik" dan "Tools Analisis" yang akan digunakan. Ini adalah bagian terpenting untuk didukung oleh referensi. Jika ada catatan tentang metode (misalnya, tentang SLR, PRISMA, atau studi kasus), integrasikan kutipan tersebut di sini untuk memberikan dasar teoretis pada metode yang Anda pilih.

Susun poin-poin di atas menjadi sebuah narasi bab metode yang koheren dan didukung oleh sitasi yang relevan.`;
        }
        // --- PERUBAHAN (LOGIKA INTEGRASI SLR) BERAKHIR DI SINI ---

        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, metodeDraft: cleanResult }));
            showInfoModal("Draf Bab Metode berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal menulis Bab Metode: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // UPDATE: Menerima selectedIds untuk Studi Literatur
    const handleGenerateStudiLiteratur = async (selectedIds = []) => {
        setIsLoading(true);
        
        // Filter referensi: Gunakan yang dipilih jika ada
        const sourceRefs = (selectedIds && selectedIds.length > 0) 
            ? projectData.allReferences.filter(ref => selectedIds.includes(ref.id))
            : projectData.allReferences;

        const kutipanString = sourceRefs
            .filter(ref => ref.isiKutipan)
            .map(ref => `- Dari "${ref.title}" oleh ${ref.author} (${ref.year}): "${ref.isiKutipan}"`)
            .join('\n');

        if (!kutipanString) {
            showInfoModal("Tidak ada kutipan/catatan dari referensi terpilih. Pastikan Anda memilih referensi yang memiliki catatan.");
            setIsLoading(false);
            return;
        }

        // [BAGIAN OUTLINE SUDAH DIHAPUS DISINI]

        // --- PERBAIKAN PROMPT DI SINI ---
        const prompt = `Anda adalah seorang penulis akademik yang sangat teliti. Tugas Anda adalah menulis draf Bab 2: Tinjauan Pustaka HANYA berdasarkan informasi yang disediakan.

**Aturan Paling Penting (WAJIB DIPATUHI):**
- **Dilarang Keras Menambah Informasi:** Gunakan SECARA EKSKLUSIF informasi dari "Konteks Proyek". JANGAN menambahkan informasi, konsep, atau teori lain.
- **Fokus pada Rumusan Masalah:** Prioritaskan sintesis catatan yang paling relevan untuk memberikan landasan teoretis bagi "Rumusan Masalah".
- **Format Teks:** Tulis seluruhnya sebagai teks biasa (plain text). Jangan gunakan markdown (*, _, **), HTML.
- **Wajib Sitasi:** Saat Anda menggunakan ide dari 'Catatan dari Referensi', Anda WAJIB menyertakan sitasinya (Penulis, Tahun).

**Konteks Proyek (Satu-satunya Sumber Informasi Anda):**
- Judul Karya Tulis: "${projectData.judulKTI}"
- Rumusan Masalah (Fokus Utama): "${projectData.rumusanMasalahDraft || 'Belum ada'}"
- Catatan dari Referensi (Konten):
${kutipanString}

**Tugas Anda:**
1.  **Buat Judul Bab:** Mulai dengan "BAB II TINJAUAN PUSTAKA".
2.  **Gunakan Struktur Outline:** Identifikasi sub-bab yang ada di bawah Bab II dari "Outline KTI". Gunakan ini sebagai sub-bab bernomor Anda (misal: 2.1 [Sub-bab dari Outline], 2.2 [Sub-bab dari Outline], dst.).
3.  **Sintesis per Sub-bab:** Untuk setiap sub-bab, sintesiskan "Catatan dari Referensi" yang paling relevan dengan sub-bab tersebut, dengan fokus untuk mendukung "Rumusan Masalah".
4.  **Alur Logis:** Pastikan ada alur yang logis antar paragraf.
`;
        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(prev => ({ ...prev, studiLiteraturDraft: cleanResult }));
            showInfoModal("Draf Studi Literatur berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal menulis Studi Literatur: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- UPDATE: handleGenerateHasilPembahasan (Context Injection Bab 4 & References) ---
    // Menerima selectedIds untuk Pembahasan
    const handleGenerateHasilPembahasan = async (selectedIds = []) => {
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

        // INJEKSI DESKRIPSI RESPONDEN
        const deskripsiResponden = projectData.deskripsiRespondenDraft 
            ? `\n\n**Data Karakteristik Responden (Awal Bab 4):**\n${projectData.deskripsiRespondenDraft}\n` 
            : "";

        // INJEKSI REFERENSI PEMBANDING (BARU)
        // Filter referensi: Gunakan yang dipilih jika ada
        const sourceRefs = (selectedIds && selectedIds.length > 0) 
            ? projectData.allReferences.filter(ref => selectedIds.includes(ref.id))
            : projectData.allReferences;

        const refPembandingString = sourceRefs
            .map(ref => {
                const content = ref.isiKutipan || ref.abstract || "(Tidak ada catatan)";
                return `[REF] ${ref.author} (${ref.year}): "${content}"`;
            })
            .join('\n');

        const contextBab1 = projectData.pendahuluanDraft || "Belum ada draf Bab 1.";
        const contextBab2 = projectData.studiLiteraturDraft || "Belum ada draf Bab 2.";
        const contextBab3 = projectData.metodeDraft || "Belum ada draf Bab 3."; // <-- BAB 3 DITAMBAHKAN

        const prompt = `Anda adalah seorang penulis akademis dan peneliti ahli. Tugas Anda adalah menulis draf Bab 4: Hasil dan Pembahasan yang komprehensif dan TERINTEGRASI SECARA TEORETIS, dengan kualitas selevel Q1 seperti yang biasa anda lakukan.

Aturan Paling Penting (WAJIB DIPATUHI):
1. **Theoretical Linking (WAJIB):** Pembahasan Anda JANGAN HANYA deskriptif. Anda WAJIB mengaitkan temuan data kembali ke teori-teori atau konsep yang telah disebutkan dalam "Konteks Bab 1 (Pendahuluan)" atau "Konteks Bab 2 (Tinjauan Pustaka)". Jika di Bab 1 ada teori motivasi atau keadilan, sebutkan kembali di pembahasan untuk memvalidasi atau menolak teori tersebut berdasarkan data.
2. **Gunakan Referensi Pembanding:** Gunakan data dari "Referensi Pembanding / Included Studies" untuk mendukung argumen pembahasan (misal: "Temuan ini sejalan dengan [Penulis, Tahun]...").
3. **No Hallucination:** Gunakan data dari "Data Hasil Analisis". Jangan mengarang angka atau kutipan baru.
4. **Hasil penelitian wajib menjawab rumusan masalah dan tujuan penelitian pada "Konteks Bab 1 (Pendahuluan)":** JANGAN OUT OF CONTEXT, hasil penelitian harus bisa menjawab rumusan masalah dan tujuan penelitian yang disebutkan dalam "Konteks Bab 1 (Pendahuluan)".
5. **Dilarang Keras Menambah Informasi:** Gunakan SECARA EKSKLUSIF informasi dari "Sumber Data & Konteks". JANGAN membuat asumsi atau menambahkan informasi yang tidak ada.
6. **Tulis Seluruhnya sebagai Teks Biasa (Plain Text):** Jangan gunakan format markdown (*, _, **), HTML, atau format lainnya.
7. **Gunakan Sub-judul Bernomor:** Wajib gunakan format "4.1 ...", "4.2 ...", dst.

**Sumber Data & Konteks:**
- Judul: "${projectData.judulKTI}"
- Tujuan: "${projectData.tujuanPenelitianDraft}"
- Konteks Bab 1 (Teori): ${contextBab1.substring(0, 3000)}
- Konteks Bab 2 (Teori): ${contextBab2.substring(0, 3000)}
- Konteks Bab 3 (Metode): ${contextBab3.substring(0, 3000)}
- Deskripsi Responden: ${deskripsiResponden}
- Data Hasil Analisis: ${dataSintesis}
- Referensi Pembanding / Included Studies (WAJIB DIGUNAKAN DI PEMBAHASAN): 
${refPembandingString || "Tidak ada referensi pembanding khusus yang dipilih."}

**Instruksi untuk Penulisan Bab 4:**

**1. 4.1 Gambaran Umum Objek Penelitian / Karakteristik Responden:**
- Sajikan **karakteristik responden** penelitian secara komprehensif. Jika data karakteristik responden sudah disediakan, gunakan informasi tersebut untuk menjelaskan:
  - **Jumlah responden**, **karakteristik demografis** (misalnya, usia, jabatan, tingkat pendidikan, pengalaman kerja), dan **atribut relevan lainnya** yang menunjukkan **representativitas sampel**.
  - Berikan penjelasan terkait **kriteria pemilihan responden** dan bagaimana mereka relevan untuk tujuan penelitian ini.

**Saran untuk kualitas Q1:**
- Jelaskan **metode sampling** yang digunakan (misalnya, purposive sampling, random sampling) dan **alasan pemilihannya**.
- Pastikan **jumlah responden** dijelaskan dengan jelas dan apakah cukup representatif untuk mendukung temuan yang valid.

**2. 4.2 Hasil Penelitian:**
- **Sajikan temuan utama** dari penelitian secara terperinci, baik yang diperoleh dari data **kuantitatif** (misalnya, kuesioner, statistik deskriptif) maupun **kualitatif** (wawancara).
  - Untuk **data kuantitatif**, gunakan **tabel, grafik**, dan sajikan dalam bentuk **frekuensi, persentase, rata-rata**, atau **standar deviasi** sesuai relevansi.
  - Untuk **data kualitatif**, sediakan **tema-tema utama** yang muncul, dilengkapi dengan **kutipan langsung** dari responden yang relevan.
  - Jika diperlukan, **bandingkan hasil** dari responden berdasarkan kategori yang relevan (misalnya, peneliti dengan paparan bahan kimia vs peneliti dengan paparan radiasi).
  
**Saran untuk kualitas Q1:**
- Gunakan **tabel dan grafik** yang jelas untuk menyajikan data kuantitatif dan jelaskan bagaimana hasilnya mendukung **rumusan masalah**.
- Untuk data kualitatif, sertakan **kutipan panjang** dari wawancara untuk menggambarkan tema yang ditemukan dan bagaimana tema tersebut terkait dengan teori yang ada.

**3. 4.3 Pembahasan:**
- Hubungkan temuan dengan **kerangka teori** yang telah diuraikan di **Bab 1 dan Bab 2**, serta dengan **metode** yang digunakan di Bab 3.
- Pembahasan harus mencakup:
  - **Analisis hasil temuan**: Jelaskan **makna dan implikasi** dari temuan utama, apakah temuan tersebut sesuai dengan literatur yang ada atau berbeda.
  - **Perbandingan dengan studi terdahulu**: Bandingkan temuan penelitian ini dengan temuan-temuan lain di literatur yang relevan dan jelaskan **perbedaan atau kesamaannya**. Gunakan "Referensi Pembanding" yang disediakan di atas.
  - **Keterkaitan dengan tujuan penelitian**: Tunjukkan bagaimana temuan ini menjawab **pertanyaan penelitian** atau **tujuan penelitian** yang telah ditetapkan sebelumnya.
  - **Kebaruan penelitian**: Jelaskan apa yang **baru dan inovatif** dari temuan penelitian ini dalam konteks literatur yang ada.
  - **Implikasi teoretis dan praktis**: Bahas **implikasi teoretis** dari temuan penelitian terhadap perkembangan ilmu pengetahuan di bidang yang diteliti dan **implikasi praktis**nya terhadap kebijakan atau aplikasi nyata di laboratorium atau lembaga riset.
  - **Tantangan implementasi**: Bahas tentang **tantangan** yang mungkin dihadapi dalam implementasi kebijakan atau rekomendasi yang dihasilkan dari temuan penelitian.

**Saran untuk kualitas Q1:**
- Pastikan untuk membandingkan temuan penelitian ini dengan **studi terdahulu** dalam **diskusi yang lebih kritis**, bukan hanya merangkum hasil yang ada.
- Fokus pada **kontribusi teoretis** dan **implikasi praktis** dari hasil penelitian, dengan memperjelas bagaimana temuan ini dapat diimplementasikan dalam kebijakan atau praktik nyata.
- Jangan lupa untuk **mengakui keterbatasan penelitian**, baik dalam hal metodologi maupun hasil yang diperoleh, dan bagaimana hal ini dapat mempengaruhi kesimpulan.

Hasilkan teks biasa tanpa format markdown berlebihan.`;

        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
            setProjectData(p => ({ ...p, hasilPembahasanDraft: result }));
            showInfoModal("Draf Bab Hasil & Pembahasan (Terintegrasi Teori & Metode) berhasil dibuat!");
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
            const result = await geminiService.run(prompt, geminiApiKeys);
            const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
            setProjectData(p => ({ ...p, kesimpulanDraft: cleanResult }));
            showInfoModal("Draf Bab Kesimpulan berhasil dibuat!");
        } catch(error) {
            showInfoModal(`Gagal membuat draf kesimpulan: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- HANDLER BARU UNTUK SEMANTIC SCHOLAR ---
    const handleSearchSemanticScholar = async (query) => {
        if (!query || !query.trim()) {
            showInfoModal("Silakan masukkan topik atau judul untuk dicari.");
            return;
        }
        setIsS2Searching(true);
        setSearchResults(null); // Bersihkan hasil sebelumnya

        try {
            const results = await semanticScholarService.search(query, S2_API_KEY);
            setSearchResults(results);
        } catch (error) {
            showInfoModal(`Gagal mencari referensi: ${error.message}`);
        } finally {
            // Rate limiting sederhana dengan menonaktifkan tombol selama 1 detik setelah selesai
            setTimeout(() => setIsS2Searching(false), 1000);
        }
    };

    const handleClueSearchRegulation = async (clueObj) => {
    // 1. Tutup modal Peta Jalan
    setShowSearchPromptModal(false);

    // 2. Pindah ke tab Referensi
    setCurrentSection('referensi');

    // 3. Buka (expand) Metode 5
    setOpenMethod('method5');

    // 4. Set mode pencarian ke 'Peraturan Terkait'
    setConceptSearchMode('regulation'); // Menggunakan fungsi setter dari state App

    // 5. Isi kolom input di Metode 5 dengan clue
    setConceptQuery(clueObj.clue); // Pastikan setConceptQuery juga state di App jika belum

    // 6. Tunggu sebentar agar UI sempat update (opsional tapi disarankan)
    await new Promise(resolve => setTimeout(resolve, 100)); // Jeda 0.1 detik

    // 7. Mulai pencarian peraturan secara otomatis
    await handleRegulationSearch(clueObj.clue); // Panggil fungsi pencarian yang sudah ada, kirim clue sebagai argumen
};

    const handleAddReferenceFromSearch = (paper, aiReview, keyQuote = '') => {
        // Cek duplikat berdasarkan judul atau DOI
        const isDuplicate = projectData.allReferences.some(ref => 
            ref.title.toLowerCase() === paper.title.toLowerCase() || 
            (ref.doi && paper.externalIds?.DOI && ref.doi === paper.externalIds.DOI)
        );

        if (isDuplicate) {
            showInfoModal("Referensi ini sudah ada di perpustakaan Anda.");
            return;
        }

        let notes = [];
        if (keyQuote) {
            notes.push(`[Kutipan Kunci Konsep]: "${keyQuote}"`);
        }
        if (aiReview && aiReview.finding) {
            notes.push(`[Temuan Kunci AI]: "${aiReview.finding}"`);
        }
        const initialNote = notes.join('\n\n');

        // --- PERBAIKAN DIMULAI DI SINI ---
        // Logika ini sekarang dapat menangani format penulis yang berbeda
        // dari Semantic Scholar (array objek) dan Scopus (string).
        let authorString;
        if (Array.isArray(paper.authors)) {
            // Format Semantic Scholar
            authorString = paper.authors.map(a => a.name).join(', ');
        } else if (typeof paper.authors === 'string') {
            // Format Scopus
            authorString = paper.authors;
        } else {
            authorString = '';
        }

        const newRef = {
            id: Date.now(),
            title: paper.title || '',
            author: authorString, // Menggunakan string yang sudah diproses
            year: paper.year || '',
            journal: paper.journal?.name || paper.publicationVenue?.name || '',
            volume: paper.journal?.volume || '',
            issue: paper.journal?.issue || '',
            pages: paper.journal?.pages || '',
            doi: paper.externalIds?.DOI || '',
            url: paper.url || '',
            publisher: '',
            // --- PERBAIKAN: Menambahkan field abstract agar tersimpan ---
            abstract: paper.abstract || '', 
            // -----------------------------------------------------------
            // --- UPDATE: Simpan Sumber Data (RIS/Search) ---
            source: paper.source || 'search_engine', 
            // -----------------------------------------------
            isiKutipan: initialNote
        };

        setProjectData(prev => ({
            ...prev,
            allReferences: [...prev.allReferences, newRef]
        }));
        showInfoModal(`"${paper.title}" berhasil ditambahkan ke perpustakaan.`);
    };
    // --- AKHIR HANDLER BARU ---

    // --- LANGKAH E DIMULAI DI SINI: Fungsi Tambah Peraturan ---
const handleAddRegulationToReference = (regulationResult) => {
    const { judul, url, analisis_relevansi } = regulationResult;

    // Cek duplikat berdasarkan judul
    const isDuplicate = projectData.allReferences.some(
        ref => ref.title.toLowerCase() === judul.toLowerCase()
    );

    if (isDuplicate) {
        showInfoModal(`Peraturan "${judul}" sudah ada di perpustakaan Anda.`);
        return;
    }

    // Coba ekstrak tahun dari judul (jika formatnya umum, misal "UU No. 11 Tahun 2020")
    const yearMatch = judul.match(/Tahun (\d{4})/i);
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString(); // Default tahun ini jika tidak ketemu

    // Format data peraturan agar sesuai struktur allReferences
    const newRef = {
        id: Date.now() + Math.random(), // ID unik
        title: judul,
        author: "Pemerintah RI", // Placeholder umum
        year: year,
        journal: "Peraturan Perundang-undangan", // Placeholder
        volume: '',
        issue: '',
        pages: '',
        doi: '',
        url: url || '', // Gunakan URL jika ada
        publisher: '',
        isiKutipan: `[Analisis Relevansi AI]:\n"${analisis_relevansi}"` // Gunakan analisis AI sebagai catatan awal
    };

    setProjectData(prev => ({
        ...prev,
        allReferences: [...prev.allReferences, newRef]
    }));

    showInfoModal(`Peraturan "${judul}" berhasil ditambahkan ke perpustakaan.`);
};
// --- LANGKAH E BERAKHIR DI SINI ---

    const handleClueSearch = async (clueObj) => {
    setShowSearchPromptModal(false);
    setCurrentSection('referensi');
    setOpenMethod('method2');
    setSearchQuery(`AI sedang membuat kueri cerdas untuk "${clueObj.clue}"...`);
    setIsLoading(true);

    try {
        const smartQuery = await handleGenerateAdvancedSemanticQuery(clueObj);
        setSearchQuery(smartQuery);
        await handleSearchSemanticScholar(smartQuery);
    } catch (error) {
        showInfoModal(error.message);
        setSearchQuery(clueObj.clue); // Fallback
    } finally {
        setIsLoading(false);
    }
};

    const handleClueSearchScopus = async (clueObj) => {
        setShowSearchPromptModal(false); 
        setCurrentSection('referensi');   
        setOpenMethod('methodScopus');         
        setSearchQuery(`AI sedang membuat kueri cerdas untuk "${clueObj.clue}"...`);
        setIsLoading(true);

        try {
            // Panggil "otak" logika yang baru untuk membuat kueri
            const advancedQuery = await handleGenerateAdvancedBooleanQuery(clueObj);
            
            // Set kueri cerdas ke input field
            setSearchQuery(advancedQuery);
            
            // Langsung eksekusi pencarian dengan kueri cerdas tersebut
            await handleSearchScopus(advancedQuery);

        } catch (error) {
            showInfoModal(error.message);
            setSearchQuery(clueObj.clue); // Fallback ke clue sederhana jika ada error tak terduga
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAdvancedSemanticQuery = async (clueObj) => {
    const prompt = `Anda adalah "Search Query Engineer" untuk database akademis. Tugas: Ubah Input (Bahasa Indonesia) menjadi SATU frasa pencarian Bahasa Inggris yang "High-Recall" dan "High-Precision".

    Input:
    - Tujuan (Explanation): "${clueObj.explanation}"
    - Kata Kunci (Clue): "${clueObj.clue}"

    **ALGORITMA TRANSFORMASI (WAJIB DIPATUHI):**

    1. **Hapus Kata Kerja Lemah:** Buang kata seperti "Mendefinisikan", "Mengetahui", "Memahami", "Pentingnya". Fokus pada KATA BENDA (Noun Phrases).
    2. **Konversi "Definition" -> "Framework/Analysis":**
       - JANGAN gunakan: "definition of...", "meaning of...", "what is...". (Ini memanggil kamus/textbook).
       - GANTI dengan: "conceptual framework", "theoretical model", "analysis", "implementation", "dimensions", "determinants".
    3. **Konversi "Research Gap" -> "Magic Keywords":**
       - Jika mencari gap/masalah, JANGAN CUMA pakai "research gap".
       - GUNAKAN: "challenges", "barriers", "limitations", "future research directions", "systematic review", "meta-analysis".
    4. **Contextualize:** Selalu gabungkan Topik + Konteks.
       - Salah: "public service" (terlalu luas).
       - Benar: "public service" AND "artificial intelligence".

    **Contoh:**
    - Input: "Untuk mendefinisikan metode bibliometrik" -> Output: "bibliometric analysis best practices methodology"
    - Input: "Mencari gap riset AI" -> Output: "artificial intelligence implementation challenges future research"
    - Input: "Model adopsi teknologi" -> Output: "technology adoption model framework public sector"

    Hasilkan HANYA string kueri final dalam Bahasa Inggris, tanpa tanda kutip.`;

    try {
        const result = await geminiService.run(prompt, geminiApiKeys);
        return result.replace(/"/g, '').trim(); // Membersihkan tanda kutip
    } catch (error) {
        console.error("Gagal membuat kueri cerdas untuk Semantic Scholar:", error);
        showInfoModal(`Gagal membuat kueri cerdas: ${error.message}. Menggunakan kueri sederhana.`);
        return clueObj.clue; // Fallback ke clue sederhana jika gagal
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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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
Konteks Penelitian:
- Rumusan Masalah: "${projectData.rumusanMasalahDraft || 'Tidak ditentukan'}"
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft || 'Tidak ditentukan'}"
- Variabel Terikat (Y): "${projectData.variabelTerikat}"
- Variabel Bebas (X): ${projectData.variabelBebas.join(', ')}

Tugas: Untuk setiap variabel yang diberikan (baik terikat maupun bebas), buatlah 3 hingga 5 item pernyataan (bukan pertanyaan) yang dapat diukur menggunakan skala Likert 5 poin (Sangat Tidak Setuju hingga Sangat Setuju). 

PENTING: 
1. Pastikan setiap pernyataan tidak hanya mengukur variabel, tetapi juga relevan untuk menjawab Rumusan Masalah dan Tujuan Penelitian di atas.
2. Pastikan setiap pernyataan jelas, tidak ambigu, dan spesifik.

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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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
- Rumusan Masalah: "${projectData.rumusanMasalahDraft || 'Tidak ditentukan'}"
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft}"
- Penjelasan Singkat: "${projectData.penjelasan}"

Tugas: Buatkan draf panduan wawancara semi-terstruktur yang komprehensif. Pertanyaan-pertanyaan ini harus dirancang secara strategis untuk menggali informasi yang dibutuhkan guna menjawab Rumusan Masalah dan mencapai Tujuan Penelitian.

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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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

    const handleGenerateQueriesFromPicos = async (picos, type) => {
        setIsLoading(true);
        // Hapus aiGeneratedQueries agar loading state terlihat
        if (type === 'query') {
            setProjectData(p => ({ ...p, aiGeneratedQueries: null }));
        }

        let prompt;
        if (type === 'rq') {
            prompt = `Berdasarkan kerangka PICOS berikut, formulasikan satu Pertanyaan Penelitian (Research Question) utama yang jelas dan ringkas untuk sebuah Systematic Literature Review.
            - P (Population/Problem): ${picos.population}
            - I (Intervention): ${picos.intervention}
            - C (Comparison): ${picos.comparison || 'Tidak ditentukan'}
            - O (Outcome): ${picos.outcome}
            - S (Study Design): ${picos.studyDesign || 'Tidak ditentukan'}
            
            Hasilkan HANYA kalimat pertanyaan penelitiannya saja.`;
             try {
                const result = await geminiService.run(prompt, geminiApiKeys);
                // --- PERUBAHAN DI SINI: Simpan hasil ke projectData ---
                const newRQ = `- ${result}`;
                setProjectData(p => ({ ...p, rumusanMasalahDraft: (p.rumusanMasalahDraft ? p.rumusanMasalahDraft + '\n' : '') + newRQ }));
                showInfoModal(`Pertanyaan Penelitian berhasil dibuat dan ditambahkan ke kotak di bawah!`);
                // --- AKHIR PERUBAHAN ---
            } catch (error) {
                showInfoModal(`Gagal membuat RQ: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
            return;
        } 
        
        // else, it's 'query'
        let languageInstruction = includeIndonesianQuery 
            ? "Prioritaskan istilah Bahasa Inggris, tetapi sertakan padanan Bahasa Indonesia menggunakan operator OR."
            : "Gunakan HANYA istilah dalam Bahasa Inggris.";

        prompt = `Anda adalah Pustakawan Riset ahli. Berdasarkan kerangka PICOS berikut, buatkan 5 level search query yang komprehensif untuk database ${projectData.queryGeneratorTargetDB}.

        **Kerangka PICOS:**
        - P (Population/Problem): ${picos.population}
        - I (Intervention): ${picos.intervention}
        - C (Comparison): ${picos.comparison || 'Tidak ditentukan'}
        - O (Outcome): ${picos.outcome}
        - S (Study Design): ${picos.studyDesign || 'Tidak ditentukan'}

        **Tugas Utama:**
        Buat 5 level kueri pencarian (search strings), dari yang paling spesifik hingga paling luas, menggabungkan konsep dari PICOS.

        **Level Kueri:**
        - Level 1 (Paling Khusus): Gabungkan P, I, dan O menggunakan operator AND.
        - Level 2 (Sedikit Lebih Umum): Perluas pencarian dengan sinonim untuk konsep kunci dari P, I, dan O.
        - Level 3 (Umum Menengah): Gabungkan hanya P dan I.
        - Level 4 (Lebih Umum): Gabungkan hanya P dan O.
        - Level 5 (Paling Umum): Fokus hanya pada P dan sinonimnya.

        **Aturan Penting:**
        - **Instruksi Bahasa:** ${languageInstruction}
        - **JANGAN** sertakan batasan tahun atau periode.

        **Instruksi Sintaks:**
        Gunakan sintaks yang paling sesuai untuk Database Target (${projectData.queryGeneratorTargetDB}).

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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema }); // UPDATE: geminiApiKeys (Cleanup Step 1)
            setProjectData(p => ({ ...p, aiGeneratedQueries: result }));
            showInfoModal("Kueri berjenjang dari PICOS berhasil dibuat!");
        } catch (error) {
            showInfoModal(`Gagal membuat kueri dari PICOS: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    const handleGenerateAdvancedBooleanQuery = async (clueObj) => {
    const prompt = `Anda adalah seorang Pustakawan Riset (Research Librarian) ahli spesialis database Scopus. 
    Tugas: Ubah "Tujuan Pencarian" dan "Kata Kunci" menjadi string kueri boolean Scopus yang presisi.

    Input:
    - Tujuan (Explanation): "${clueObj.explanation}"
    - Kata Kunci (Clue): "${clueObj.clue}"

    WAJIB IKUTI 4 PRINSIP METODE BERIKUT (Strict Mode):

    1) Tetapkan Konsep Inti (Core Concepts Only):
       - Identifikasi topik keilmuan inti (variable, fenomena, atau subjek riset).
       - HAPUS/ABAIKAN elemen non-inti: Judul riset spesifik, nama lokasi (misal: "Indonesia", "Jakarta"), nama institusi (misal: "BRIN", "Kemenkeu"), dan tahun/periode (misal: "2020-2024").
       - Fokus pada "apa yang diteliti", BUKAN "di mana" atau "kapan".

    2) Istilah Baku Bahasa Inggris (Official Terms):
       - Gunakan HANYA istilah bahasa Inggris yang baku dan diakui dalam literatur ilmiah internasional.
       - Hindari terjemahan harfiah (literal translation) yang tidak umum.

    3) Bangun Blok Sinonim dengan OR:
       - Kelompokkan konsep yang setara/sinonim dalam satu blok kurung.
       - Gunakan operator OR.
       - WAJIB gunakan tanda kutip ganda "..." untuk frasa dua kata atau lebih.
       - Contoh: ("science policy" OR "STI policy" OR "research policy")

    4) Gabungkan Antar-Konsep dengan AND:
       - Hubungkan blok-blok konsep yang berbeda menggunakan operator AND.
       - Pastikan struktur kurung rapi dan logis.
       - Format Akhir Wajib: TITLE-ABS-KEY((Blok A) AND (Blok B) ...)

    Hasilkan HANYA string kueri final (mulai dengan TITLE-ABS-KEY). Jangan ada teks penjelasan pembuka atau penutup.`;

    try {
        const result = await geminiService.run(prompt, geminiApiKeys);
        // Membersihkan hasil untuk memastikan hanya kueri yang dikembalikan
        return result.replace(/```/g, '').replace(/json/g, '').trim();
    } catch (error) {
        console.error("Gagal membuat kueri boolean cerdas:", error);
        showInfoModal(`Gagal membuat kueri cerdas: ${error.message}. Menggunakan kueri sederhana sebagai fallback.`);
        // Fallback: Jika gagal, buat kueri sederhana dari clue
        return `TITLE-ABS-KEY("${clueObj.clue}")`;
    }
};

    const handleGenerateDeskripsiResponden = async (rawData) => {
    setIsLoading(true);
    const prompt = `Anda adalah seorang analis data statistik. Tugas Anda adalah menulis narasi deskriptif mengenai karakteristik responden (profil demografi) berdasarkan data mentah berikut.

Tulis dalam gaya bahasa akademis formal untuk Bab 4 (Hasil Penelitian). Jelaskan dominasi kelompok tertentu jika ada.

Data Mentah:
${rawData}

Hasilkan teks narasi saja.`;

    try {
        const result = await geminiService.run(prompt, geminiApiKeys);
        const cleanResult = result.replace(/[*_]/g, "").replace(/<[^>]*>/g, "");
        setProjectData(prev => ({ ...prev, deskripsiRespondenDraft: cleanResult }));
        showInfoModal("Deskripsi responden berhasil dibuat!");
    } catch (error) {
        showInfoModal(`Gagal membuat deskripsi: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
};
    
    const handleGenerateAnalisis = async (data, analysisType, analysisFocus = '') => { // <-- PERUBAHAN
        if (!data) {
            showInfoModal("Tidak ada data untuk dianalisis. Silakan unggah file .csv terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        setProjectData(p => ({ ...p, analisisKuantitatifHasil: '' }));

        const csvString = window.Papa.unparse(data);
        let prompt;
        // --- BARU ---
        const focusPrompt = analysisFocus ? `\n\n**Fokus Analisis Spesifik dari Pengguna:**\n"${analysisFocus}"\n` : '';
        // --- AKHIR BARU ---

        if (analysisType === 'konfirmatif') {
            const hipotesisString = projectData.hipotesis.join('\n');
            prompt = `Anda adalah seorang analis data dan penulis riset ahli. Tugas Anda adalah menganalisis data kuantitatif berikut dalam konteks penelitian yang diberikan dan menyusun narasi temuan.

**Konteks Penelitian:**
- Judul: "${projectData.judulKTI}"
- Tujuan: "${projectData.tujuanPenelitianDraft}"
- Hipotesis yang akan diuji:
${hipotesisString}
${focusPrompt} {/* <-- PERUBAHAN */}

**Data Mentah (format CSV):**
\`\`\`csv
${csvString}
\`\`\`

**Instruksi Analisis:**
1.  **Statistik Deskriptif:** Untuk setiap kolom numerik yang relevan dengan variabel penelitian, hitung dan sajikan statistik deskriptif dasar (Rata-rata/Mean, Median, Standar Deviasi).
2.  **Uji Hipotesis (Interpretatif):** Berdasarkan data yang ada, berikan interpretasi konseptual apakah data cenderung mendukung atau menolak setiap hipotesis. Jelaskan alasan Anda secara singkat. Contoh: "Data menunjukkan rata-rata 'Kepuasan Kerja' lebih tinggi pada kelompok dengan 'Gaya Kepemimpinan Transformasional', yang secara konseptual mendukung H1."
    ${analysisFocus ? "Secara khusus, berikan perhatian ekstra pada hipotesis atau temuan yang terkait dengan fokus pengguna." : ""} {/* <-- PERUBAHAN */}
3.  **Narasi Temuan:** Tuliskan draf narasi yang koheren untuk bab "Hasil dan Pembahasan". Mulailah dengan ringkasan statistik deskriptif, diikuti dengan pembahasan hasil uji hipotesis satu per satu. Akhiri dengan paragraf singkat yang merangkum temuan utama.

**Format Output:**
Gunakan format teks biasa dengan sub-judul yang jelas (misal: "1. Statistik Deskriptif", "2. Hasil Uji Hipotesis", "3. Draf Narasi Temuan").
`;
        } else { // 'eksploratif'
            prompt = `Anda adalah seorang analis data ahli. Tugas Anda adalah melakukan analisis data eksploratif pada data tabel berikut dan menyajikan wawasan yang paling menarik.

**Konteks Penelitian (jika ada):**
- Judul: "${projectData.judulKTI || 'Tidak ditentukan'}"
- Topik Umum: "${projectData.topikTema || 'Tidak ditentukan'}"
${focusPrompt} {/* <-- PERUBAHAN */}

**Data Mentah (format CSV):**
\`\`\`csv
${csvString}
\`\`\`

**Instruksi Analisis:**
1.  **Statistik Deskriptif:** Untuk setiap kolom numerik, hitung dan sajikan statistik deskriptif kunci (Rata-rata/Mean, Median, Standar Deviasi, Min, Max).
2.  **Identifikasi Wawasan Utama:** Analisis data untuk menemukan pola, korelasi, atau anomali yang paling signifikan dan menarik. Fokus pada temuan yang tidak terduga atau yang bisa menjadi titik awal untuk penelitian lebih lanjut.
    ${analysisFocus ? "Secara khusus, prioritaskan wawasan yang terkait dengan fokus spesifik yang diberikan pengguna." : ""} {/* <-- PERUBAHAN */}
3.  **Narasi Temuan:** Tuliskan draf narasi yang merangkum temuan-temuan utama Anda. Susun dalam format poin-poin yang mudah dibaca, di mana setiap poin menjelaskan satu wawasan penting dari data.

**Format Output:**
Gunakan format teks biasa dengan sub-judul yang jelas (misal: "1. Statistik Deskriptif", "2. Wawasan Utama dari Data").
`;
        }

        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
            setProjectData(p => ({ ...p, analisisKuantitatifHasil: result }));
            showInfoModal("Analisis data berhasil dibuat!");
        } catch(error) {
            showInfoModal(`Gagal menganalisis data: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateAnalisisKualitatif = async (fileContent, analysisFocus = '') => { // <-- PERUBAHAN
        setIsLoading(true);
        // PERBAIKAN: Hapus "analisisKualitatifDraft: ''" agar draf lama TIDAK TERHAPUS
        setProjectData(p => ({ ...p, analisisKualitatifHasil: null })); 

        // --- BARU ---
        const focusPrompt = analysisFocus ? `\n\n**Fokus Analisis Spesifik dari Pengguna:**\n"${analysisFocus}"\n` : '';
        // --- AKHIR BARU ---

        const prompt = `Anda adalah seorang peneliti kualitatif ahli. Lakukan analisis tematik pada teks berikut. Identifikasi 3-5 tema utama yang muncul yang paling relevan dengan tujuan penelitian.

**Konteks Penelitian:**
- Judul: "${projectData.judulKTI || 'Tidak Disediakan'}"
- Tujuan Penelitian: "${projectData.tujuanPenelitianDraft || 'Tidak Disediakan'}"
${focusPrompt} {/* <-- PERUBAHAN */}

**Tugas:**
Untuk setiap tema yang Anda identifikasi:
1.  Berikan nama tema yang singkat dan jelas.
2.  Tulis deskripsi singkat (1-2 kalimat) yang menjelaskan inti dari tema tersebut.
3.  Sertakan 2-3 kutipan paling representatif dari teks asli untuk mendukung tema tersebut.
${analysisFocus ? "\nSecara khusus, prioritaskan tema dan kutipan yang terkait dengan fokus spesifik pengguna." : ""} {/* <-- PERUBAHAN */}

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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema });
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
            const result = await geminiService.run(prompt, geminiApiKeys, { schema }, imageFile);
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
    
    const handleResetProject = async () => {
        if (!currentUser) {
            showInfoModal("Error: Pengguna tidak ditemukan.");
            setIsResetConfirmOpen(false);
            return;
        }
        setIsLoading(true); // Tampilkan loading state
        try {
            // FIX: Pertahankan status Premium saat reset agar pengguna tidak terkunci kembali
            const resetData = {
                ...initialProjectData,
                isPremium: projectData.isPremium // Menyalin status premium dari data saat ini
            };
            
            // Menulis ulang data di Firestore dengan data awal (tapi isPremium dipertahankan)
            await setDoc(doc(db, "projects", currentUser.uid), resetData);

            // Set state lokal ke data awal yang sudah diamankan status premiumnya
            setProjectData(resetData);
            
            setIsResetConfirmOpen(false);
            showInfoModal("Proyek telah berhasil di-reset. Data tulisan dihapus, namun Lisensi Premium Anda tetap aktif.");
        } catch (error) {
            console.error("Gagal me-reset proyek:", error);
            showInfoModal(`Gagal me-reset proyek: ${error.message}`);
        } finally {
            setIsLoading(false); // Hentikan loading state
        }
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
                return <IdeKTI {...{ 
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
                    // --- TAMBAHAN BARU DI SINI ---
                    handleGenerateMirrorReflection,
                    handleValidateMirrorReflection
                }} />;
            case 'referensi':
                // PERBAIKAN: Tambahkan setProjectData ke dalam objek props yang dikirim
                return <Referensi {...{ 
                    projectData, 
                    setProjectData, 
                    manualRef, 
                    setManualRef, 
                    manualMode, 
                    setManualMode, 
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
                    handleExportReferences, 
                    handleSearchSemanticScholar, 
                    searchQuery, 
                    setSearchQuery, 
                    searchResults, 
                    isS2Searching, 
                    handleAddReferenceFromSearch, 
                    handleAiReview, 
                    showInfoModal, 
                    openMethod, 
                    setOpenMethod, 
                    handleConceptSearch, 
                    conceptQuery, 
                    setConceptQuery, 
                    isConceptSearching, 
                    conceptSearchResult, 
                    handleSearchScopus, 
                    isScopusSearching, 
                    scopusSearchResults, 
                    scopusApiKey, 
                    setScopusApiKey, 
                    handleRegulationSearch, 
                    isRegulationSearching, 
                    regulationSearchResults, 
                    handleAddRegulationToReference, 
                    conceptSearchMode, 
                    setConceptSearchMode, 
                    handleClueSearchRegulation,
                    // --- PROPS BARU DIOPER KE SINI ---
                    triggerImportRis,
                    handleExportRis,
                    risSearchResults, // <--- DATA PREVIEW DIKIRIM KE SINI
                    setRisSearchResults, // <--- SETTER DIKIRIM KE SINI
                    // --- PROPS BARU UNTUK SMART PASTE ---
                    smartPasteText,
                    setSmartPasteText,
                    handleSmartPaste,
                    // --- PROP BARU: BULK ADD ---
                    handleAddAllRisToLibrary
                }} />;
            case 'prisma':
                return <PrismaSLR {...{ projectData, setProjectData, showInfoModal, handleAiReview, geminiApiKeys }} />; // UPDATE: Pass geminiApiKeys
            case 'sintesis':
                return <SintesisData {...{ projectData, setProjectData, showInfoModal, geminiApiKeys, handleCopyToClipboard, setCurrentSection }} />; // UPDATE: geminiApiKeys
            case 'genLogKueri':
                return <GeneratorLogKueri {...{ projectData, setProjectData, handleGenerateQueries, isLoading, showInfoModal, lastCopiedQuery, handleCopyQuery, handleDeleteLog, includeIndonesianQuery, setIncludeIndonesianQuery, handleGenerateQueriesFromPicos, geminiApiKeys, handleInputChange }} />; // UPDATE: geminiApiKeys
            case 'genVariabel':
                return <GeneratorVariabel {...{ projectData, setProjectData, handleGenerateVariabel, isLoading, showInfoModal, handleCopyToClipboard }} />;
            case 'genHipotesis':
                return <GeneratorHipotesis {...{ projectData, setProjectData, handleGenerateHipotesis, isLoading, showInfoModal, handleCopyToClipboard }} />;
            case 'genKuesioner':
                return <GeneratorKuesioner {...{ projectData, setProjectData, handleGenerateKuesioner, isLoading, showInfoModal, handleCopyToClipboard }} />;
            case 'genWawancara':
                return <GeneratorWawancara {...{ projectData, setProjectData, handleGenerateWawancara, isLoading, showInfoModal, handleCopyToClipboard }} />;
            case 'deskripsiResponden':
                return <DeskripsiResponden {...{ projectData, setProjectData, handleGenerateDeskripsiResponden, isLoading, handleCopyToClipboard }} />;
            case 'analisisKuantitatif':
                return <AnalisisKuantitatif {...{ projectData, setProjectData, handleGenerateAnalisis, isLoading, showInfoModal, setCurrentSection }} />;
            case 'analisisKualitatif':
                return <AnalisisKualitatif {...{ projectData, setProjectData, handleGenerateAnalisisKualitatif, isLoading, showInfoModal, handleCopyToClipboard }} />;
            case 'analisisVisual':
                return <AnalisisVisual {...{ projectData, setProjectData, handleGenerateAnalisisVisual, isLoading, showInfoModal, handleCopyToClipboard }} />;
            case 'analisisGap':
                return <AnalisisGapNovelty {...{ projectData, setProjectData, geminiApiKeys, showInfoModal, handleCopyToClipboard }} />;
            // [CASE OUTLINE SUDAH DIHAPUS DISINI]
            case 'pendahuluan':
                return <Pendahuluan {...{ projectData, setProjectData, isLoading, handleCopyToClipboard, handleGenerateFullPendahuluan, handleModifyText }} />;
            case 'studiLiteratur':
                return <StudiLiteratur {...{ 
                    projectData, 
                    setProjectData, 
                    handleGenerateStudiLiteratur, 
                    isLoading, 
                    handleCopyToClipboard, 
                    handleModifyText,
                    // --- TAMBAHAN BARU ---
                    handleClassifyTheories 
                }} />;
            case 'metode':
                return <MetodePenelitian {...{ projectData, setProjectData, handleGenerateMetode, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'hasil':
                return <HasilPembahasan {...{ 
                    projectData, 
                    setProjectData, 
                    handleGenerateHasilPembahasan, 
                    isLoading, 
                    handleCopyToClipboard, 
                    handleModifyText,
                    // Tambahkan dua baris ini:
                    geminiApiKey,
                    showInfoModal
                }} />;
            case 'kesimpulan':
                 return <Kesimpulan {...{ projectData, setProjectData, handleGenerateKesimpulan, isLoading, handleCopyToClipboard, handleModifyText }} />;
            case 'dashboard':
                return <DashboardProyek {...{ projectData, setCurrentSection }} />;
            case 'tutorial':
                return <Tutorial />;
            case 'donasi':
                return <Donasi {...{ handleCopyToClipboard }} />;
            case 'resetHapusProyek': // ID baru dari navigasi
                return <ResetHapusProyek 
                    setIsResetConfirmOpen={setIsResetConfirmOpen} 
                    handleCopyToClipboard={handleCopyToClipboard} 
                    setGeminiApiKey={setGeminiApiKey}
                    setScopusApiKey={setScopusApiKey}
                    showInfoModal={showInfoModal}
                    setForceShowLicense={setForceShowLicense} // Pass fungsi ini
                    setGeminiApiKeys={setGeminiApiKeys} // Pass setter array untuk fix hapus kunci
                    projectData={projectData} // UPDATE: Kirim projectData untuk cek Elite
                />; 
            default:
                return <IdeKTI {...{ projectData, handleInputChange, handleGenerateIdeKTI, handleStartNewIdea, isLoading, aiStructuredResponse, editingIdea, setEditingIdea, handleStartEditing, handleSaveIdea, ideKtiMode }} />;
               
        }
    };
    
    // --- FUNGSI BARU UNTUK PENCARIAN KONSEP ---
    const handleConceptSearch = async (overrideQuery = null) => {
        // Gunakan query dari parameter jika ada, jika tidak gunakan dari state
        const queryToUse = (typeof overrideQuery === 'string') ? overrideQuery : conceptQuery;

        // Validasi input
        if (!queryToUse || !queryToUse.trim()) {
            showInfoModal("Silakan masukkan konsep atau teori untuk dicari.");
            return;
        }
        setIsConceptSearching(true);
        setConceptSearchResult(null);
        
        // Jika dipanggil via Clue (overrideQuery ada), update tampilan input juga
        if (typeof overrideQuery === 'string') {
            setConceptQuery(overrideQuery);
        }
    
        try {
            // Langkah 1: Minta AI memberikan judul DAN penulis dalam format JSON yang terstruktur
            const titlePrompt = `Berdasarkan konsep penelitian "${queryToUse}", berikan SATU judul referensi yang paling fundamental BESERTA penulis utamanya. Balas HANYA dengan objek JSON dengan format: {"judul": "Judul Referensi", "penulis": "Nama Penulis"}`;
            const titleSchema = { "type": "OBJECT", "properties": {"judul": {"type": "STRING"}, "penulis": {"type": "STRING"}}, "required": ["judul", "penulis"] };
            
            const titleResponseJson = await geminiService.run(titlePrompt, geminiApiKeys, { schema: titleSchema });
            
            const { judul: referenceTitle, penulis: authorName } = titleResponseJson;
    
            if (!referenceTitle || !authorName) {
                throw new Error("AI tidak dapat mengidentifikasi judul atau penulis dari referensi.");
            }
    
            // Langkah 2: Setelah mendapatkan penulis, minta AI menjelaskan konsep dari perspektif penulis tersebut dengan grounding
            const quotePrompt = `Dari perspektif penulis "${authorName}", jelaskan konsep atau teori "${queryToUse}" secara singkat dan padat dalam 2-3 kalimat. Jawab HANYA dengan penjelasannya.`;
            const keyQuote = await geminiService.run(quotePrompt, geminiApiKeys, { useGrounding: true });
    
            // Langkah 3: Cari judul di database akademis
            const s2results = await semanticScholarService.search(referenceTitle, S2_API_KEY);
    
            // Langkah 4: Sajikan hasil
            if (s2results.length > 0) {
                setConceptSearchResult([{
                    paper: s2results[0],
                    kutipanKunci: keyQuote || `AI tidak dapat menghasilkan kutipan kunci untuk ${queryToUse}.`
                }]);
            } else {
                setConceptSearchResult([]);
            }
    
        } catch (error) {
            showInfoModal(`Pencarian konsep gagal: ${error.message}`);
            setConceptSearchResult([]);
        } finally {
            setIsConceptSearching(false);
        }
    };

    // --- HANDLER BARU: Clue ke Metode 4 (Konsep) ---
    const handleClueSearchConcept = async (clueObj) => {
        // 1. Tutup modal Peta Jalan
        setShowSearchPromptModal(false);

        // 2. Pindah ke tab Referensi
        setCurrentSection('referensi');

        // 3. Buka (expand) Metode 5 (yang berisi pencarian konsep)
        setOpenMethod('method5');

        // 4. Set mode pencarian ke 'Konsep'
        setConceptSearchMode('concept');

        // 5. Isi kolom input (Visual)
        setConceptQuery(clueObj.clue);

        // 6. Tunggu sebentar agar UI update
        await new Promise(resolve => setTimeout(resolve, 100));

        // 7. Mulai pencarian konsep secara otomatis
        handleConceptSearch(clueObj.clue);
    };

// --- LANGKAH B DIMULAI DI SINI: Kerangka Fungsi Pencarian Peraturan ---
const handleRegulationSearch = async () => {
    // Validasi: Pastikan ada input
    if (!conceptQuery || !conceptQuery.trim()) {
        showInfoModal("Silakan masukkan topik peraturan untuk dicari.");
        return;
    }

    console.log("Memulai pencarian peraturan untuk:", conceptQuery);
    setIsRegulationSearching(true); // Aktifkan status loading
    setRegulationSearchResults(null); // Bersihkan hasil sebelumnya

    try {
        const topikPenelitian = projectData.topikTema || projectData.judulKTI || "penelitian"; // Konteks tambahan
        const prompt = `Anda adalah asisten riset hukum yang ramah. Tugas Anda adalah mencari peraturan perundang-undangan di Indonesia (UU, PP, Perpres, Permen, dll.) yang paling relevan dengan topik atau kata kunci yang diberikan.

Gunakan Google Search (grounding) untuk menemukan informasi ini.

Topik Penelitian Utama: "${topikPenelitian}"
Kueri Pencarian Spesifik: "${conceptQuery}"

**Instruksi (SANGAT PENTING):**
JANGAN memberikan penjelasan atau teks percakapan apa pun. Respons Anda HARUS berupa array JSON yang valid, bahkan jika tidak ada hasil (kembalikan array kosong []).

Format output HARUS mengikuti schema JSON berikut dengan ketat:

    Untuk setiap peraturan yang ditemukan, berikan:
    1.  **judul:** Judul resmi dan lengkap dari peraturan tersebut.
    2.  **url:** URL sumber yang valid jika ditemukan (jika tidak ada, berikan string kosong "").
    3.  **analisis_relevansi:** Satu hingga dua kalimat yang menjelaskan relevansi peraturan ini terhadap kueri pencarian.

    Prioritaskan peraturan yang paling penting atau fundamental terkait topik.`; // <--- Tanda backtick penutup ditambahkan di sini

    // --- PERBAIKAN: Pindahkan definisi schema ke LUAR string prompt ---
        // HAPUS: const schema = { ... }; (Definisi duplikat dihapus)

        // Panggil geminiService dengan grounding dan schema
const results = await geminiService.run(
    prompt,         // Pertanyaan/instruksi untuk AI
    geminiApiKeys,   // Kunci API Google AI Anda
    { useGrounding: true} // Opsi: Aktifkan Google Search DAN kirim schema
);
// Tampilkan respons mentah di console untuk debug
console.log("Respons mentah dari AI (Peraturan):", results);

try {
    // 1. Coba bersihkan respons dari tanda code block (```json ... ```)
    // PERBAIKAN: Mengganti 'results' (yang merupakan objek JSON) dengan 'results.text' jika results adalah teks.
    // Tapi karena 'results' adalah hasil dari geminiService.run, kita asumsikan itu sudah JSON/teks.
    // Kita anggap 'results' adalah string JSON mentah.
    let cleanedText = results;
    
    // Jika 'results' adalah objek (karena skema berhasil), ubah jadi string dulu
    if (typeof results === 'object') {
        cleanedText = JSON.stringify(results);
    }
    
    // Bersihkan jika masih ada format markdown
    cleanedText = cleanedText
        .replace(/```json/g, '') // Hapus ```json
        .replace(/```/g, '')     // Hapus ```
        .trim();                // Hapus spasi di awal/akhir

    // 2. Coba parse teks yang sudah dibersihkan sebagai JSON
    // Jika 'results' sudah objek, kita gunakan langsung
    const parsedResults = (typeof results === 'object') ? results : JSON.parse(cleanedText); 
    
    // 3. Pastikan hasilnya adalah array sebelum disimpan ke state
    if (Array.isArray(parsedResults)) {
        setRegulationSearchResults(parsedResults); 
        console.log("Hasil parsing JSON (Peraturan):", parsedResults);
    } else {
        // Jika parsing berhasil tapi bukan array, lempar error
        throw new Error("Respons AI bukan format array JSON yang diharapkan.");
    }
} catch (parseError) {
    // 4. Jika parsing gagal (misal AI tidak mengembalikan JSON), tangani error
    console.error("Gagal mem-parsing respons AI (Peraturan):", parseError, "\nRespons Mentah:", results);
    // Coba tangani jika 'results' adalah teks mentah (bukan JSON)
    if (typeof results === 'string') {
        try {
            const parsedFallback = JSON.parse(results.replace(/```json/g, '').replace(/```/g, '').trim());
            if (Array.isArray(parsedFallback)) {
                setRegulationSearchResults(parsedFallback); 
                console.log("Hasil parsing JSON (Peraturan) (Fallback):", parsedFallback);
            } else {
                 throw new Error("Respons AI (fallback) bukan format array JSON yang diharapkan.");
            }
        } catch (e) {
             showInfoModal("Gagal memproses respons dari AI. Respons mungkin tidak dalam format JSON yang benar.");
             setRegulationSearchResults([]); // Set hasil kosong agar UI tidak error
        }
    } else {
        showInfoModal("Gagal memproses respons dari AI. Format tidak dikenal.");
        setRegulationSearchResults([]); // Set hasil kosong agar UI tidak error
    }
}

    } catch (error) {
        showInfoModal(`Gagal mencari peraturan: ${error.message}`);
        setRegulationSearchResults([]); // Set hasil kosong jika error
    } finally {
        setIsRegulationSearching(false); // Matikan status loading
    }
};
// --- LANGKAH B BERAKHIR DI SINI ---

    const translateQueryToEnglish = async (indonesianQuery) => {
        if (!indonesianQuery || !indonesianQuery.trim()) {
            return '';
        }
        
        const prompt = `Translate the following Indonesian research topic into a concise, effective English search query phrase. 
        Do not add boolean operators like AND/OR unless they are part of the original topic. 
        Respond ONLY with the translated phrase, without any quotation marks or extra text.

        Indonesian Topic: "${indonesianQuery}"`;

        try {
            const result = await geminiService.run(prompt, geminiApiKeys);
            return result.replace(/"/g, '').trim();
        } catch (error) {
            console.warn(`Translation failed for "${indonesianQuery}", using original. Error: ${error.message}`);
            showInfoModal(`Penerjemahan gagal, menggunakan kueri asli. Error: ${error.message}`);
            return indonesianQuery;
        }
    };

    const handleSearchScopus = async (query) => {
        if (!query || !query.trim()) {
            showInfoModal("Silakan masukkan topik atau judul untuk dicari.");
            return;
        }

        // --- SOLUSI BUG OTORISASI ---
        // Hapus logika kunci cadangan. Wajibkan pengguna memasukkan kunci API pribadi mereka.
        if (!scopusApiKey) {
            showInfoModal("Kunci API Scopus wajib diisi. Silakan masukkan kunci API pribadi Anda yang valid.");
            return; // Hentikan eksekusi jika kunci tidak ada.
        }
        // --- AKHIR SOLUSI BUG ---

        setIsScopusSearching(true);
        setScopusSearchResults(null); 

        try {
            let queryToSearch = query; // Mulai dengan kueri asli dari input
            let themeToSearch = projectData.topikTema; // Mulai dengan tema asli dari proyek

            // --- PERBAIKAN DIMULAI DI SINI ---
            // Cek apakah kueri yang dimasukkan pengguna SUDAH kueri canggih?
            // Kita cek apakah mengandung kata kunci sintaks Scopus.
            if (query.toUpperCase().includes('TITLE-ABS-KEY') || 
                query.toUpperCase().includes('TITLE(') || 
                query.toUpperCase().includes('AUTHOR-NAME') ||
                query.toUpperCase().includes(' AND ') || // Deteksi boolean dasar
                query.toUpperCase().includes(' OR ') ||
                query.toUpperCase().includes(' W/')) 
            {
                // JIKA YA: Ini kueri canggih
                queryToSearch = query; // Gunakan kueri apa adanya (JANGAN DITERJEMAHKAN)
                themeToSearch = ''; // Kosongkan tema, karena tema sudah seharusnya ada di dalam kueri canggih
                
                showInfoModal(`Menggunakan kueri Scopus canggih Anda: "${queryToSearch}"`);
            
            } else {
                // JIKA TIDAK: Ini kueri sederhana (misal: "tunjangan risiko"), BARU kita terjemahkan
                
                showInfoModal("Menerjemahkan kueri sederhana ke Bahasa Inggris...");
                queryToSearch = await translateQueryToEnglish(query);
                themeToSearch = await translateQueryToEnglish(projectData.topikTema);
                
                let feedbackMessage = `Mencari di Scopus dengan kueri Inggris: "${queryToSearch}"`;
                if (themeToSearch) {
                    feedbackMessage += ` DAN "${themeToSearch}"`;
                }
                showInfoModal(feedbackMessage);
            }
            // --- PERBAIKAN BERAKHIR DI SINI ---

            // Langkah 2: Lakukan pencarian dengan kueri yang TEPAT
            // (Bisa kueri asli, bisa kueri terjemahan, tergantung hasil cek di atas)
            const results = await scopusService.search(queryToSearch, scopusApiKey, themeToSearch);
            setScopusSearchResults(results);
            
            if(results.length > 0) {
                setShowModal(false);
            }

        } catch (error) {
            showInfoModal(`Gagal mencari di Scopus: ${error.message}`);
        } finally {
            setIsScopusSearching(false);
        }
    };

    const toggleCategory = (category) => {
        setOpenCategories(prev => 
            // Jika kategori yang diklik sudah terbuka, tutup. Jika tidak, buka kategori ini (dan tutup yang lain).
            prev.includes(category) ? [] : [category]
        );
    };

    const getNavigationItems = () => {
        const isPremium = projectData.isPremium;
        // Helper untuk label menu (tambah gembok jika user Free dan fitur itu Premium)
        const label = (name, premiumOnly = false) => {
            if (premiumOnly && !isPremium) {
                return `${name} 🔒`;
            }
            return name;
        };

        const navigation = {
            perencanaan: {
                title: "Perencanaan & Ide",
                items: [
                    { id: 'ideKTI', name: 'Ide KTI & Fondasi' },
                    { id: 'referensi', name: 'Literatur & Referensi' }
                ]
            },
            slr_workflow: {
                title: "Alur Kerja SLR & Bibliometrik",
                items: [
                    { id: 'genLogKueri', name: 'Generator & Log Kueri'}, // Campuran (Manual Free, AI Premium)
                    { id: 'prisma', name: 'Generator PRISMA SLR'} // Campuran
                ]
            },
            sintesis: {
                title: "Ekstraksi & Sintesis",
                items: [
                    { id: 'sintesis', name: 'Ekstraksi & Sintesis Data' } // Campuran
                ]
            },
            instrumen: {
                title: "Instrumen Penelitian",
                items: []
            },
            analisis: {
                title: "Analisis Data",
                items: [
                    { id: 'analisisGap', name: label('Lanskap Riset & Posisi Strategis', true) },
                    { id: 'deskripsiResponden', name: label('Karakteristik Responden', true) },
                    { id: 'analisisKuantitatif', name: label('Analisis Kuantitatif', true) },
                    { id: 'analisisKualitatif', name: label('Analisis Kualitatif', true) },
                    { id: 'analisisVisual', name: label('Analisis Visual', true) },
                ]
            },
            penulisan: {
                title: "Penulisan KTI",
                items: [
                    // MENU OUTLINE DIHAPUS SESUAI PERMINTAAN
                    { id: 'pendahuluan', name: label('Pendahuluan', true) },
                    { id: 'studiLiteratur', name: label('Studi Literatur', true) },
                    { id: 'metode', name: label('Metode Penelitian', true) },
                    { id: 'hasil', name: label('Hasil & Pembahasan', true) },
                    { id: 'kesimpulan', name: label('Kesimpulan', true) },
                ]
            },
            proyek: {
                title: "Proyek",
                items: [
                    { id: 'dashboard', name: 'Dashboard' },
                    { id: 'imporProyek', name: 'Impor Proyek', action: triggerImport },
                    { id: 'eksporProyek', name: 'Ekspor Proyek', action: handleExportProject },
                    { id: 'resetHapusProyek', name: 'Manajemen Aplikasi' }
                ]
            },
            tutorial: {
                title: "Panduan Aplikasi", 
                items: [
                    { id: 'tutorial', name: 'Bantuan & Kontak' }
                ]
            },
            donasi: {
                title: "CSR",
                items: [
                    { id: 'donasi', name: 'Program Amal' }
                ]
            }
        };

        const pendekatan = projectData.pendekatan;
        
        // --- PERUBAHAN: Menghapus Logika Penyembunyian Menu SLR ---
        // Sebelumnya menu ini hanya muncul jika metode berisi "SLR".
        // Sekarang menu "Alur Kerja SLR" dan "Ekstraksi & Sintesis" DIBUKA PERMANEN 
        // untuk semua pengguna agar mendorong praktik tinjauan pustaka yang baik.
        
        /* KODE LAMA YANG DIHAPUS:
        const metode = projectData.metode;
        if (metode && (metode.toLowerCase().includes('slr') || metode.toLowerCase().includes('systematic literature review') || metode.toLowerCase().includes('bibliometric'))) {
            // Menu sudah ada
        } else {
             navigation.slr_workflow.items = []; // Kosongkan jika tidak relevan
             navigation.sintesis.items = []; // Sembunyikan juga menu Sintesis
        }
        */
        // -----------------------------------------------------------

        if (pendekatan === 'Kuantitatif' || pendekatan === 'Metode Campuran') {
            navigation.instrumen.items.push(
                { id: 'genVariabel', name: 'Generator Variabel' }, // Gratis
                { id: 'genHipotesis', name: label('Generator Hipotesis', true) },
                { id: 'genKuesioner', name: label('Generator Kuesioner', true) }
            );
        }
        
        if (pendekatan === 'Kualitatif' || pendekatan === 'Metode Campuran') {
            navigation.instrumen.items.push({ id: 'genWawancara', name: label('Generator Wawancara', true) });
        }

        // FIX: Tampilkan placeholder agar menu tidak hilang jika pendekatan belum dipilih
        if (navigation.instrumen.items.length === 0) {
            navigation.instrumen.items.push({ 
                id: 'ideKTI', // Redirect ke tab Ide untuk setting
                name: '⚠️ Pilih Pendekatan Dulu' 
            });
        }

        return navigation;
    };

    const navigationItems = getNavigationItems();

    // ============================================================================
    // LANGKAH B4: Tampilkan AuthPage atau App (Render Kondisional)
    // ============================================================================
    
    // 1. Tampilan Loading (Prioritas Tertinggi)
    if (isLoadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                <p className="ml-4 text-xl text-gray-700">Memuat...</p>
            </div>
        );
    }

    // 2. Logika Render untuk Pengguna yang SUDAH Login
    // Jika sudah login, kita cek apakah mereka punya lisensi (baik dari sesi atau DB).
    if (currentUser) {
        // Jika belum verifikasi sesi DAN belum premium di DB -> Tampilkan Gate (Atau jika dipaksa via menu)
        if ((!isLicenseVerified && !projectData.isPremium) || forceShowLicense) {
            return (
                <LicenseGate 
                    onActivate={handleLicenseActivation} 
                    handleCopyToClipboard={handleCopyToClipboard} 
                    currentUser={currentUser}
                />
            );
        }
        // Jika lolos, tampilkan Aplikasi
        return (
            <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
                <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>
                {/* ... (Isi JSX Aplikasi) ... */}
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); body { font-family: 'Inter', sans-serif; } .animate-fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                /* Hide scrollbar for Chrome, Safari and Opera */
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                /* Hide scrollbar for IE, Edge and Firefox */
                .no-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
                `}</style>
                
                <input type="file" ref={importInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".json" />
                <input type="file" ref={importReferencesInputRef} onChange={handleFileImportReferences} style={{ display: 'none' }} accept=".json" />
                {/* --- UPDATE: INPUT FILE BARU MENGGUNAKAN HANDLER BARU --- */}
                <input type="file" ref={importRisInputRef} onChange={handleUploadExternalRis} style={{ display: 'none' }} accept=".ris, .txt" />

                {showWelcomeModal && (
                    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
                        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center animate-fade-in">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Selamat Datang di Bibliocobra</h2>
                            
                            <p className="text-gray-600 mb-6">
                                Platform asisten riset bertenaga AI untuk membantu Anda menyusun KTI, Skripsi, dan Tesis dengan standar akademis tinggi secara efisien.
                            </p>
                            
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-8">
                                <p className="text-sm text-blue-800">
                                    <strong>Research with Impact:</strong> <br/>
                                    Layanan ini mendukung program CSR <em>(Corporate Social Responsibility)</em> melalui sumbangan sukarela, guna membantu komunitas yang membutuhkan.
                                </p>
                            </div>

                            <button onClick={handleCloseWelcomeModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-full text-lg shadow-lg hover:shadow-xl transition-all duration-300">Mulai Riset</button>
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
                                                {category.clues.map((clueObj, clueIndex) => {
                                                    const dropdownId = `cat-${catIndex}-clue-${clueIndex}`;
                                                    const isPeraturan = category.category === "Peraturan Terkait";
                                                    // Deteksi kategori Teori & Definisi untuk menampilkan tombol Metode 4
                                                    const isTeoriOrDefinisi = category.category.includes("Landasan Teori") || category.category.includes("Definisi Inti");

                                                    // --- LANGKAH 5 DIMULAI DI SINI ---
    let searchEngines; // Gunakan let karena nilainya akan diisi di if/else

    if (isPeraturan) {
        // Jika kategori adalah "Peraturan Terkait", isi dengan database hukum
        searchEngines = [
            { name: 'Google (Pemerintah)', url: `https://www.google.com/search?q=${encodeURIComponent(clueObj.clue)}+site%3A.go.id+filetype%3Apdf` },
            { name: 'JDIH Nasional', url: `https://jdihn.go.id/pencarian?keyword=${encodeURIComponent(clueObj.clue)}`},
            { name: 'Peraturan BPK', url: `https://peraturan.bpk.go.id/Search?keywords=${encodeURIComponent(clueObj.clue)}` },
            { name: 'Peraturan BRIN', url: `https://jdih.brin.go.id/dokumen-hukum/peraturan?search=${encodeURIComponent(clueObj.clue)}` }
            // Anda bisa menambahkan sumber hukum lain di sini jika perlu
        ];
    } else {
        // Jika bukan, isi dengan mesin pencari akademis standard
        searchEngines = [
            { name: 'Google Scholar', url: `https://scholar.google.com/scholar?q=${encodeURIComponent(clueObj.clue)}+file:.pdf` },
            { name: 'Perplexity', url: `https://www.perplexity.ai/search?q=${encodeURIComponent(clueObj.clue)}` },
            { name: 'BASE', url: `https://www.base-search.net/Search/Results?q=${encodeURIComponent(clueObj.clue)}` },
            { name: 'CORE', url: `https://core.ac.uk/search?q=${encodeURIComponent(clueObj.clue)}` },
            { name: 'Garuda', url: `https://garuda.kemdiktisaintek.go.id/documents?select=abstract&pdf=1&q=${encodeURIComponent(clueObj.clue)}` },
            { name: 'Connected Papers', url: `https://www.connectedpapers.com/search?q=${encodeURIComponent(clueObj.clue)}` },
        ];
    }
    // --- LANGKAH 5 BERAKHIR DI SINI ---
                                                    return (
                                                        <div key={clueIndex} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                                            <p className="font-semibold text-gray-800">{clueObj.clue}</p>
                                                            <p className="text-sm italic text-purple-800 my-2">✍️ {clueObj.explanation}</p>
                                                            <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                                {/* --- LANGKAH 6 DIMULAI DI SINI --- */}
                                                                {isPeraturan ? (
                                                                    <button 
                                                                        onClick={() => handleClueSearchRegulation(clueObj)} 
                                                                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3 rounded-lg h-full inline-flex items-center disabled:bg-teal-300 disabled:cursor-not-allowed"
                                                                        disabled={isRegulationSearching}
                                                                    >
                                                                        {isRegulationSearching ? 'Mencari...' : 'Cari Peraturan Ini di App'}
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        {/* Tombol Konsep (Metode 4) - Muncul HANYA jika kategori Teori/Definisi */}
                                                                        {isTeoriOrDefinisi && (
                                                                            <button 
                                                                                onClick={() => handleClueSearchConcept(clueObj)} 
                                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg h-full inline-flex items-center disabled:bg-indigo-300 disabled:cursor-not-allowed shadow-sm"
                                                                                disabled={isConceptSearching}
                                                                            >
                                                                                {isConceptSearching ? 'Mencari...' : 'Cari Konsep Fundamental'}
                                                                            </button>
                                                                        )}

                                                                        {/* Tombol Semantic Scholar (Metode 2) - Selalu muncul jika bukan peraturan */}
                                                                        <button 
                                                                            onClick={() => handleClueSearch(clueObj)} 
                                                                            className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold py-2 px-3 rounded-lg h-full disabled:bg-purple-300 disabled:cursor-not-allowed"
                                                                            disabled={isLoading}
                                                                        >
                                                                            {isLoading ? 'Memproses...' : 'Cek di Semantic Scholar'}
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {/* --- LANGKAH 6 BERAKHIR DI SINI --- */}
                                                                
                                                                {/* Tombol Scopus Integrasi (Ditambahkan Kembali) */}
                                                                {!isPeraturan && projectData.showScopus && (
                                                                    <button 
                                                                        onClick={() => handleClueSearchScopus(clueObj)} 
                                                                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 px-3 rounded-lg h-full disabled:bg-orange-300 disabled:cursor-not-allowed" 
                                                                        disabled={isLoading}
                                                                    >
                                                                        Cari via Scopus
                                                                    </button>
                                                                )}

                                                                <div className="relative inline-block text-left">
                                                                    <div>
                                                                        <button
                                                                            type="button"
                                                                            className="inline-flex items-center justify-center w-full rounded-lg border border-gray-300 shadow-sm px-3 py-2 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
                                                                            onClick={() => setOpenSearchDropdown(openSearchDropdown === dropdownId ? null : dropdownId)}
                                                                        >
                                                                            {isPeraturan ? 'Database Hukum Lain' : 'Mesin Pencari Lain'}
                                                                            <svg className="-mr-1 ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                    {openSearchDropdown === dropdownId && (
                                                                        <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20" style={{ right: 'auto' }}>
                                                                            <div className="py-1" role="menu" aria-orientation="vertical">
                                                                                {/* --- PERUBAHAN 3: Logika render baru untuk menangani tombol dan tautan --- */}
                                                                                {searchEngines.map(engine => {
                                                                                    if (engine.action) {
                                                                                        return (
                                                                                            <button
        key={engine.name}
        onClick={() => {
            engine.action();
            setOpenSearchDropdown(null);
        }}
        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed" // <-- TAMBAHKAN STYLE DISABLED
        role="menuitem"
        disabled={isLoading} // <-- TAMBAHKAN INI
    >
        {isLoading ? 'Memproses...' : engine.name} {/* <-- UBAH TEKS SAAT LOADING */}
    </button>
                                                                                        );
                                                                                    }
                                                                                    return (
                                                                                        <a
                                                                                            key={engine.name}
                                                                                            href={engine.url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                                            role="menuitem"
                                                                                            onClick={() => setOpenSearchDropdown(null)}
                                                                                        >
                                                                                            {engine.name}
                                                                                        </a>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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


                <div className="flex w-full h-screen overflow-hidden">
                    <aside className={`bg-gray-800 text-white h-full p-4 flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex flex-col`}>
                         <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            {isSidebarOpen && <h1 className="text-xl font-bold whitespace-nowrap">Bibliocobra</h1>}
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded-md hover:bg-gray-700">
                               {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                            </button>
                        </div>
                        
                        <nav className="flex-grow overflow-y-auto no-scrollbar">
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
                                                    className={`w-full text-left block p-2 rounded-md text-sm ${currentSection === item.id ? 'bg-blue-600' : 'hover:bg-gray-700'} ${item.name.includes('🔒') ? 'text-gray-400' : 'text-gray-200'}`}
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
                        
                        {/* ============================================================================ */}
                        {/* LANGKAH B5: Tambah Tombol Logout & Status Akun */}
                        {/* ============================================================================ */}
                        {isSidebarOpen && (
                            <div className="mt-4 pt-4 border-t border-gray-700 flex-shrink-0">
                                {/* --- STATUS BADGE --- */}
                                <div className="mb-3 px-2">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Status Akun:</span>
                                    <div className={`mt-1 text-xs font-bold px-2 py-1 rounded border inline-block w-full text-center
                                        ${projectData.showScopus ? 'bg-purple-900 text-purple-200 border-purple-700' : 
                                          projectData.isPremium ? 'bg-yellow-600 text-white border-yellow-500' : 
                                          'bg-gray-600 text-gray-200 border-gray-500'}`}>
                                        {projectData.showScopus ? 'ELITE (BRIN)' : (projectData.isPremium ? 'PREMIUM' : 'FREE MEMBER')}
                                    </div>
                                    {/* Link Upgrade untuk Free Member */}
                                    {!projectData.isPremium && (
                                        <button 
                                            onClick={() => setForceShowLicense(true)}
                                            className="mt-2 text-[10px] text-yellow-400 hover:text-yellow-300 underline w-full text-center"
                                        >
                                            Upgrade ke Premium
                                        </button>
                                    )}
                                </div>
                                {/* -------------------- */}

                                <p className="text-xs text-gray-400 mb-2 truncate px-2" title={currentUser.email || currentUser.uid}>
                                    {currentUser.email || currentUser.uid}
                                </p>
                                <button
                                    onClick={() => signOut(auth)}
                                    className="w-full text-left p-2 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                                        <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        )}
                    </aside>

                    <main className="flex-grow p-4 md:p-8 overflow-y-auto h-full no-scrollbar">
                        <div className="w-full max-w-4xl mx-auto">
                            
                            <div className="text-center mb-8">
                                <h1 className="text-4xl font-bold text-gray-800">BIBLIOCOBRA KTI GENERATOR</h1>
                                <p className="text-md text-gray-600">Inject the venom into your research 🐍</p>
                            </div>
                            
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <label htmlFor="geminiApiKey" className="block text-gray-700 text-sm font-bold mb-2">
                                        Kunci Akses AI Pribadi (Unlimited & Private):
                                    </label>

                                    {/* --- UPDATE UI: Multi Key Input --- */}
                                    <div className="space-y-3">
                                        {geminiApiKeys.map((key, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="password"
                                                    value={key}
                                                    onChange={(e) => handleGeminiKeyChange(index, e.target.value)}
                                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    placeholder={`Tempel Kunci API Google AI #${index + 1}`}
                                                />
                                                {/* Tampilkan tombol hapus jika lebih dari 1 key */}
                                                {geminiApiKeys.length > 1 && (
                                                    <button 
                                                        onClick={() => removeGeminiKeyField(index)}
                                                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg"
                                                        title="Hapus Kunci Ini"
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        
                                        <button 
                                            onClick={addGeminiKeyField}
                                            className="text-sm bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                            </svg>
                                            Tambah Kunci API Cadangan
                                        </button>
                                    </div>
                                    {/* ---------------------------------- */}

                                    
                                    <p className="text-xs text-gray-600 mt-3 leading-relaxed border-t border-purple-200 pt-2">
                                        <span className="font-bold text-purple-700">Wajib Diisi:</span> Key dibutuhkan untuk menjalankan fitur AI. Dapatkan gratis di 
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold mx-1 inline-flex items-center gap-0.5">
                                            Google AI Studio 
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>.
                                        <br/>
                                        <span className="text-gray-500 italic">Tips: Disarankan menambah 2-3 API key dari email yang berbeda untuk menghindari limitasi token AI (Rate Limit).</span>
                                    </p>
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
                                    <ErrorBoundary>
                                        {renderSection()}
                                    </ErrorBoundary>
                                </div>

                            </div>
                             <footer className="mt-8 text-gray-500 text-sm text-center">
                                <p>&copy; 2025 Bibliocobra Systems. All rights reserved.</p>
                            </footer>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // 3. Logika Render untuk Pengguna BELUM Login (GUEST)
    // 1. Prioritas utama: Pastikan user login agar kita tahu email-nya
if (!currentUser) {
    return <AuthPage />;
}

// 2. Jika sudah login, cek apakah dia sudah punya lisensi di DB atau sesi ini
if ((!isLicenseVerified && !projectData.isPremium) || forceShowLicense) {
    return (
        <LicenseGate 
            onActivate={handleLicenseActivation} 
            handleCopyToClipboard={handleCopyToClipboard} 
            currentUser={currentUser} // <--- TAMBAHKAN PROP INI
        />
    );
}

    // Jika sudah input kode tapi belum login -> Tampilkan Halaman Login
    return <AuthPage />;
}

export default App;