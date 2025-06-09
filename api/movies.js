const fetch = require('node-fetch');

const NOTION_API_KEY = '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';
const DATABASE_ID = '168ff30851b68184aa8af946a37a4cac';

module.exports = async (req, res) => {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Error al consultar la API de Notion' });
    }

    const data = await response.json();
    const movies = data.results.map(page => {
      const properties = page.properties;
      return {
        id: page.id,
        title: properties['Título']?.title?.[0]?.plain_text || '',
        year: properties['Año']?.rich_text?.[0]?.plain_text || '',
        genres: properties['Géneros']?.multi_select?.map(g => g.name) || [],
        poster: properties['Portada']?.files?.[0]?.file?.url || '',
        synopsis: properties['Sinopsis']?.rich_text?.[0]?.plain_text || '',
        tmdb_id: properties['ID TMDB']?.rich_text?.[0]?.plain_text || '',
        duration: properties['Duración']?.rich_text?.[0]?.plain_text || '',
        rating: properties['Puntuación']?.rich_text?.[0]?.plain_text || '',
        trailer: properties['Trailer']?.url || '',
        watch_url: properties['Ver Película']?.url || ''
      };
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.status(200).json({ movies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
