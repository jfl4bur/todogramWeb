import fetch from 'node-fetch';

export default async function handler(req, res) {
  const NOTION_KEY = "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";
  const DATABASE_ID = "168ff30851b68184aa8af946a37a4cac";

  const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;

  const options = {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ page_size: 10 })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    const items = data.results.map(page => {
      const props = page.properties;
      return {
        titulo: props["Título"]?.title[0]?.plain_text || "Sin título",
        genero: props["Géneros"]?.rich_text[0]?.plain_text || "",
        sinopsis: props["Sinopsis"]?.rich_text[0]?.plain_text || "",
        poster: props["Portada"]?.files[0]?.external?.url || "",
        fondo: props["Carteles"]?.files[0]?.external?.url || ""
      };
    });

    res.status(200).json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al conectar con Notion." });
  }
}
