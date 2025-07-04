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
      // Función para obtener TODAS las páginas
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
          
          if (batchCount > 100) {
            console.warn('Límite de batches alcanzado, cortando la consulta');
            break;
          }
        }

        return allResults;
      }

      const allResults = await getAllPages();
      
      const movies = allResults.map(page => {
        // Log de depuración para inspeccionar propiedades
        console.log('Propiedades de la página:', JSON.stringify(page.properties, null, 2));
        
        // Log específico para los campos problemáticos
        console.log('Valores crudos de campos problemáticos:');
        console.log('Subtitulos txt:', page.properties['Subtitulos txt']?.formula?.string || 'No definido');
        console.log('Puntuación:', page.properties['Puntuación']?.formula?.number || page.properties['Puntuación']?.formula?.string || 'No definido');

        const get = (name) => {
          const prop = page.properties[name];
          if (!prop) {
            console.log(`Campo ${name} no encontrado en propiedades`);
            return '';
          }
          
          if (prop.title) return prop.title[0]?.text?.content || '';
          if (prop.rich_text) return prop.rich_text[0]?.text?.content || '';
          if (prop.select) return prop.select?.name || '';
          if (prop.multi_select) return prop.multi_select?.map(s => s.name).join(', ') || '';
          if (prop.number) return prop.number || '';
          if (prop.url) return prop.url || '';
          
          // Manejo mejorado de fórmulas
          if (prop.formula) {
            // Si la fórmula devuelve un string
            if (prop.formula.string !== null && prop.formula.string !== undefined) {
              return prop.formula.string;
            }
            // Si la fórmula devuelve un número
            if (prop.formula.number !== null && prop.formula.number !== undefined) {
              // Convertir el punto decimal a coma si es necesario
              return prop.formula.number.toString().replace('.', ',');
            }
            // Si la fórmula devuelve un booleano
            if (prop.formula.boolean !== null && prop.formula.boolean !== undefined) {
              return prop.formula.boolean.toString();
            }
            // Si la fórmula devuelve una fecha
            if (prop.formula.date) {
              return prop.formula.date.start || '';
            }
            
            console.log(`Fórmula sin valor definido para ${name}:`, prop.formula);
            return '';
          }
          
          console.log(`Tipo de propiedad no manejado para ${name}:`, prop.type);
          return '';
        };

        const getImg = (name) => {
          const prop = page.properties[name];
          if (!prop || !prop.files || prop.files.length === 0) {
            console.log(`Campo de imagen ${name} no encontrado o vacío`);
            return '';
          }
          return prop.files[0]?.external?.url || prop.files[0]?.file?.url || '';
        };

        return {
          id: page.id || '',
          titulo: get('Título'),
          id_tmdb: get('ID TMDB'),
          tmdb: get('TMDB'),
          sinopsis: get('Synopsis'),
          portada: getImg('Portada'),
          carteles: getImg('Carteles'),
          generos: get('Géneros txt'),
          categoria: get('Categorías txt'),
          audios: get('Audios txt'),
          subtitulos: get('Subtitulos txt'), // Sin tilde
          ano: get('Año'),
          duracion: get('Duración'),
          trailer: get('Trailer'),
          ver_pelicula: get('Ver Película'),
          titulo_original: get('Título original'),
          productoras: get('Productora(s)'),
          idiomas_originales: get('Idioma(s) original(es)'),
          paises: get('País(es)'),
          directores: get('Director(es)'),
          escritores: get('Escritor(es)'),
          reparto_principal: get('Reparto principal'),
          video_iframe: get('Video iframe'),
          video_iframe_1: get('Video iframe 1'),
          puntuacion: get('Puntuación') // Ahora manejará correctamente las fórmulas numéricas
        };
      });

      console.log(`Total de películas obtenidas: ${movies.length}`);
      
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).json({ 
        movies,
        total: movies.length,
        has_more: false
      });
      
    } else {
      // Paginación estándar
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
        // Log de depuración para inspeccionar propiedades
        console.log('Propiedades de la página:', JSON.stringify(page.properties, null, 2));
        
        // Log específico para los campos problemáticos
        console.log('Valores crudos de campos problemáticos:');
        console.log('Subtitulos txt:', page.properties['Subtitulos txt']?.formula?.string || 'No definido');
        console.log('Puntuación:', page.properties['Puntuación']?.formula?.number || page.properties['Puntuación']?.formula?.string || 'No definido');

        const get = (name) => {
          const prop = page.properties[name];
          if (!prop) {
            console.log(`Campo ${name} no encontrado en propiedades`);
            return '';
          }
          
          if (prop.title) return prop.title[0]?.text?.content || '';
          if (prop.rich_text) return prop.rich_text[0]?.text?.content || '';
          if (prop.select) return prop.select?.name || '';
          if (prop.multi_select) return prop.multi_select?.map(s => s.name).join(', ') || '';
          if (prop.number) return prop.number || '';
          if (prop.url) return prop.url || '';
          
          // Manejo mejorado de fórmulas
          if (prop.formula) {
            // Si la fórmula devuelve un string
            if (prop.formula.string !== null && prop.formula.string !== undefined) {
              return prop.formula.string;
            }
            // Si la fórmula devuelve un número
            if (prop.formula.number !== null && prop.formula.number !== undefined) {
              // Convertir el punto decimal a coma si es necesario
              return prop.formula.number.toString().replace('.', ',');
            }
            // Si la fórmula devuelve un booleano
            if (prop.formula.boolean !== null && prop.formula.boolean !== undefined) {
              return prop.formula.boolean.toString();
            }
            // Si la fórmula devuelve una fecha
            if (prop.formula.date) {
              return prop.formula.date.start || '';
            }
            
            console.log(`Fórmula sin valor definido para ${name}:`, prop.formula);
            return '';
          }
          
          console.log(`Tipo de propiedad no manejado para ${name}:`, prop.type);
          return '';
        };

        const getImg = (name) => {
          const prop = page.properties[name];
          if (!prop || !prop.files || prop.files.length === 0) {
            console.log(`Campo de imagen ${name} no encontrado o vacío`);
            return '';
          }
          return prop.files[0]?.external?.url || prop.files[0]?.file?.url || '';
        };

        return {
          id: page.id || '',
          titulo: get('Título'),
          id_tmdb: get('ID TMDB'),
          tmdb: get('TMDB'),
          sinopsis: get('Synopsis'),
          portada: getImg('Portada'),
          carteles: getImg('Carteles'),
          generos: get('Géneros txt'),
          categoria: get('Categorías txt'),
          audios: get('Audios txt'),
          subtitulos: get('Subtitulos txt'), // Sin tilde
          ano: get('Año'),
          duracion: get('Duración'),
          trailer: get('Trailer'),
          ver_pelicula: get('Ver Película'),
          titulo_original: get('Título original'),
          productoras: get('Productora(s)'),
          idiomas_originales: get('Idioma(s) original(es)'),
          paises: get('País(es)'),
          directores: get('Director(es)'),
          escritores: get('Escritor(es)'),
          reparto_principal: get('Reparto principal'),
          video_iframe: get('Video iframe'),
          video_iframe_1: get('Video iframe 1'),
          puntuacion: get('Puntuación') // Ahora manejará correctamente las fórmulas numéricas
        };
      });

      console.log(`Página ${page}: ${movies.length} películas obtenidas`);
      
      res.setHeader('Cache-Control', 'public, max-age=60');
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
