export async function GET() {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;
    
    // Función para obtener todas las páginas con paginación
    async function getAllPages() {
      let allResults = [];
      let hasMore = true;
      let nextCursor = undefined;

      while (hasMore) {
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
      }

      return allResults;
    }

    const allResults = await getAllPages();
    
    return new Response(JSON.stringify(allResults), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://todogram.softr.app',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error fetching Notion data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
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
