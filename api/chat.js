export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Hanya POST' });

  // Mengambil kunci rahasia dari brankas Vercel
  const SECRET_API_KEY = process.env.KOBOI_API_KEY;

  try {
    const response = await fetch('https://api.koboillm.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET_API_KEY}`
      },
      body: JSON.stringify(req.body) // Meneruskan data dari App.jsx
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghubungi AI' });
  }
}