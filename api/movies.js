import fetch from 'node-fetch';

export default async function handler(req, res) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY || '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';
  const DATABASE_ID = process.env.NOTION_DATABASE_ID || '168ff30851b68184aa8af946a37a4cac';

  // Obtener parámetros de consulta
  const { page = 1, pageSize = 100, all = 'false', cursor } = req.query;
  const getAll = all === 'true';
  const finalPageSize = Math.min(parseInt(pageSize), 100);
  
  console.log(`Request params - Page: ${page}, PageSize: ${finalPageSize}, GetAll: ${getAll}`);

  try {
    if (getAll) {
      // Función para obtener TODAS las páginas (usar con precaución para datasets grandes)
      async function getAllPages() {
        let allResults = [];
        let hasMore = true;
        let nextCursor = undefined;
        let batchCount = 0;

        while (hasMore) {
          batchCount++;
          console.log(`Fetching batch ${batchCount}...`);
          
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
          
          // Timeout de seguridad
          if (batchCount > 100) { // Máximo 10,000 entradas
            console.warn('Límite de batches alcanzado, cortando la consulta');
            break;
          }
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
      
      // Headers con cache
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
      res.status(200).json({ 
        movies,
        total: movies.length,
        has_more: false
      });
      
    } else {
      // Paginación estándar (recomendado)
      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          page_size: finalPageSize,
          start_cursor: cursor
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Notion API error: ${data.message || 'Unknown error'}`);
      }

      const movies = data.results.map(page => {
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

      console.log(`Página ${page}: ${movies.length} películas obtenidas`);
      
      // Headers con cache ligero
      res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minuto
      res.status(200).json({ 
        movies,
        has_more: data.has_more,
        next_cursor: data.next_cursor,
        page: parseInt(page),
        page_size: finalPageSize
      });
    }

  } catch (error) {
    console.error('Error fetching Notion data:', error);
    res.status(500).json({ 
      error: 'Error fetching Notion data',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
