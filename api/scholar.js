export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query } = req.query;
  const SECRET_S2_KEY = process.env.S2_API_KEY;
  
  const fields = 'title,authors,year,journal,publicationVenue,externalIds,url,tldr,abstract';
  const apiUrl = `[https://api.semanticscholar.org/graph/v1/paper/search?query=$](https://api.semanticscholar.org/graph/v1/paper/search?query=$){encodeURIComponent(query)}&fields=${fields}&limit=20`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'x-api-key': SECRET_S2_KEY }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mencari jurnal' });
  }
}