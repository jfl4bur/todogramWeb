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

    const { results } = await notionRes.json();

    const movies = await Promise.all(results.map(async (page) => {
      const get = (name) =>
        page.properties[name]?.title?.[0]?.text?.content ||
        page.properties[name]?.rich_text?.[0]?.text?.content ||
        page.properties[name]?.select?.name || '';

      const getImg = (name) =>
        page.properties[name]?.files?.[0]?.external?.url ||
        page.properties[name]?.files?.[0]?.file?.url || '';

      const manual = {
        id_tmdb: get('ID TMDB'),
        titulo: get('Título'),
        titulo_original: get('Título original'),
        sinopsis: get('Synopsis'),
        portada: getImg('Portada'),
        carteles: getImg('Carteles'),
        generos: get('Géneros'),
        año: get('Año'),
        duracion: get('Duración'),
        puntuacion: get('Puntuación'),
        trailer: get('Trailer'),
        ver: get('Ver Película'),
        audios: get('Audios'),
        subtitulos: get('Subtítulos'),
        categoria: get('Categoria')
      };

      let tmdb = {};
      if (manual.id_tmdb && TMDB_API_KEY) {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${manual.id_tmdb}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=credits`);
        const tmdbData = await tmdbRes.json();

        tmdb = {
          titulo_original: manual.titulo_original || tmdbData.original_title,
          sinopsis: manual.sinopsis || tmdbData.overview,
          portada: manual.portada || `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`,
          carteles: manual.carteles || `https://image.tmdb.org/t/p/w780${tmdbData.backdrop_path}`,
          generos: manual.generos || tmdbData.genres.map(g => g.name).join(', '),
          año: manual.año || (tmdbData.release_date || '').split('-')[0],
          duracion: manual.duracion || `${tmdbData.runtime} min`,
          puntuacion: manual.puntuacion || tmdbData.vote_average,
          productoras: tmdbData.production_companies?.map(p => p.name).join(', '),
          idiomas: tmdbData.spoken_languages?.map(l => l.name).join(', '),
          paises: tmdbData.production_countries?.map(p => p.name).join(', '),
          director: tmdbData.credits?.crew?.find(p => p.job === 'Director')?.name || '',
          escritores: tmdbData.credits?.crew?.filter(p => p.department === 'Writing')?.map(p => p.name).join(', ') || '',
          reparto: tmdbData.credits?.cast?.slice(0, 5)?.map(a => a.name).join(', ') || ''
        };
      }

      return {
        ...manual,
        ...tmdb
      };
    }));

    res.status(200).json({ movies });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
}
