export default async function handler(req, res) {
  // Aktifkan logging untuk melacak alur eksekusi
  console.log("Scholar API: Handler dimulai");

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { query } = req.query;
    console.log("Scholar API: Query diterima:", query);

    const SECRET_S2_KEY = process.env.S2_API_KEY;
    console.log("Scholar API: Kunci API terdeteksi (panjang):", SECRET_S2_KEY ? SECRET_S2_KEY.length : "TIDAK ADA KUNCI");

    if (!query) {
      return res.status(400).json({ error: "Query kosong" });
    }

    const fields = 'title,authors,year,journal,publicationVenue,externalIds,url,tldr,abstract';
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=20`;
    console.log("Scholar API: Mencoba fetch ke:", apiUrl);

    // Cek ketersediaan fetch
    if (typeof fetch === 'undefined') {
        console.error("CRITICAL ERROR: fetch is undefined in this environment!");
        return res.status(500).json({ error: "Environment error: fetch not supported" });
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: SECRET_S2_KEY ? { 'x-api-key': SECRET_S2_KEY } : {}
    });

    console.log("Scholar API: Response status:", response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Scholar API Error Detail:", response.status, errorText);
        return res.status(response.status).json({ error: `S2 Error ${response.status}: ${errorText}` });
    }

    const data = await response.json();
    console.log("Scholar API: Data berhasil diambil");
    res.status(200).json(data);

  } catch (error) {
    console.error("Scholar API: CATCH BLOCK ERROR:", error.stack);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}