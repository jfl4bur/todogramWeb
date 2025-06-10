export async function GET(request) {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize')) || 100, 100);
    const getAll = url.searchParams.get('all') === 'true';
    
    console.log(`Fetching from Notion - Page: ${page}, PageSize: ${pageSize}, GetAll: ${getAll}`);
    
    if (getAll) {
      // Función para obtener TODAS las páginas (usar con precaución)
      async function getAllPages() {
        let allResults = [];
        let hasMore = true;
        let nextCursor = undefined;
        let batchCount = 0;

        while (hasMore) {
          batchCount++;
          console.log(`Fetching batch ${batchCount}...`);
          
          const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
              filter: {
                property: "Estado",
                select: { equals: "Publicado" }
              },
              sorts: [{ property: "Categoria", direction: "ascending" }],
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
          
          // Timeout de seguridad para evitar que la función se cuelgue
          if (batchCount > 100) { // Máximo 10,000 entradas
            console.warn('Límite de batches alcanzado, cortando la consulta');
            break;
          }
        }

        console.log(`Total entries fetched: ${allResults.length}`);
        return allResults;
      }

      const allResults = await getAllPages();
      
      return new Response(JSON.stringify({
        results: allResults,
        total: allResults.length,
        has_more: false
      }), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://todogram.softr.app',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache por 5 minutos
        }
      });
    } else {
      // Paginación estándar (recomendado para grandes datasets)
      const startCursor = url.searchParams.get('cursor');
      
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          filter: {
            property: "Estado",
            select: { equals: "Publicado" }
          },
          sorts: [{ property: "Categoria", direction: "ascending" }],
          page_size: pageSize,
          start_cursor: startCursor
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Notion API error: ${data.message || 'Unknown error'}`);
      }

      return new Response(JSON.stringify({
        results: data.results,
        has_more: data.has_more,
        next_cursor: data.next_cursor,
        page: page,
        page_size: pageSize
      }), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://todogram.softr.app',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // Cache por 1 minuto
        }
      });
    }

  } catch (error) {
    console.error('Error fetching Notion data:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://todogram.softr.app',
        'Content-Type': 'application/json'
      }
    });
  }
}

// ¡IMPORTANTE! Añade esto para manejar preflight CORS
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://todogram.softr.app',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
