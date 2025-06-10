import fetch from 'node-fetch';

export default async function handler(req, res) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY || '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';
  const DATABASE_ID = process.env.NOTION_DATABASE_ID || '168ff30851b68184aa8af946a37a4cac';

  try {
    // Función para obtener todas las páginas con paginación
    async function getAllPages() {
      let allResults = [];
      let hasMore = true;
      let nextCursor = undefined;

      while (hasMore) {
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            page_size: 100,
            start_cursor: nextCursor
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`Notion API error: ${data.message || 'Unknown error'}`);
        }

        allResults = allResults.concat(data.results);
        hasMore = data.has_more;
        nextCursor = data.next_cursor;
      }

      return allResults;
    }

    const allResults = await getAllPages();

    const movies = allResults.map(page => {
      const get = (name) => page.properties[name]?.title?.[0]?.text?.content ||
                            page.properties[name]?.rich_text?.[0]?.text?.content ||
                            page.properties[name]?.select?.name || '';

      const getImg = (name) => page.properties[name]?.files?.[0]?.external?.url ||
                               page.properties[name]?.files?.[0]?.file?.url || '';

      return {
        titulo: get('Título'),
        sinopsis: get('Sinopsis'),
        portada: getImg('Portada'),
        carteles: getImg('Carteles'),
        generos: get('Géneros')
      };
    });

    console.log(`Total de películas obtenidas: ${movies.length}`);
    res.status(200).json({ movies });
  } catch (error) {
    console.error('Error fetching Notion data:', error);
    res.status(500).json({ error: 'Error fetching Notion data' });
  }
}
