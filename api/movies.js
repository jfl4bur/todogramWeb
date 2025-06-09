import fetch from 'node-fetch';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export default async function handler(req, res) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: "Estado",
          select: { equals: "Publicado" }
        }
      })
    });

    const data = await notionRes.json();
    console.log("Data recibida:", data);

    if (!data || !data.results) {
      return res.status(500).json({ error: 'No se encontraron resultados' });
    }

    const { results } = data;

    const movies = await Promise.all(results.map(async (page) => {
      const get = (name) =>
        page.properties[name]?.title?.[0]?.text?.content ||
        page.properties[name]?.rich_text?.[0]?.text?.content ||
        page.properties[name]?.select?.name || '';

      const getImg = (name) =>
        page.properties[name]?.files?.[0]?.external?.url ||
        page.properties[name]?.files?.[0]?.file?.url || '';

      const manual = {
        id_tmdb: get('ID_
