export async function GET() {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;
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
        sorts: [{ property: "Categoria", direction: "ascending" }]
      })
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data.results), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://todogram.softr.app',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
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
