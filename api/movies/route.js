import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function GET() {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;
    
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "Estado",
        select: {
          equals: "Publicado"
        }
      },
      sorts: [
        {
          property: "Categoria",
          direction: "ascending"
        }
      ]
    });

    const movies = response.results.map(page => ({
      // ... (tu mapeo actual de datos)
    }));

    return new Response(JSON.stringify(movies), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch data" }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}
