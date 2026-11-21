export const config = {
  maxDuration: 30,
};

// Server-side Academic Paper Retrieval
// Bypasses browser CORS restrictions completely to fetch real papers from ArXiv, OpenAlex, and Europe PMC
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q || req.query.query || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 4, 10);

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  const results = [];
  const seenTitles = new Set();

  function addPaper(p) {
    if (!p.title || p.title.length < 5) return;
    const norm = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenTitles.has(norm)) return;
    seenTitles.add(norm);
    results.push(p);
  }

  // 1. Fetch from ArXiv API (Server-side, zero CORS restriction, direct PDF links)
  try {
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const arxivRes = await fetch(arxivUrl, {
      headers: { 'User-Agent': 'ResearchAI/2.0 (mailto:go.wolfabroad@gmail.com)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (arxivRes.ok) {
      const xml = await arxivRes.text();
      const entries = xml.split('<entry>').slice(1);
      for (const e of entries) {
        const titleM = e.match(/<title>([\s\S]*?)<\/title>/);
        const title = titleM ? titleM[1].trim().replace(/\s+/g, ' ') : '';
        const idM = e.match(/<id>([\s\S]*?)<\/id>/);
        const id = idM ? idM[1].trim() : '';
        const pubM = e.match(/<published>([\s\S]*?)<\/published>/);
        const year = pubM ? pubM[1].slice(0, 4) : 'Recent';
        const sumM = e.match(/<summary>([\s\S]*?)<\/summary>/);
        const abstract = sumM ? sumM[1].trim().replace(/\s+/g, ' ') : '';
        
        const authors = [];
        const authorRe = /<author>\s*<name>([\s\S]*?)<\/name>/g;
        let am;
        while ((am = authorRe.exec(e)) !== null) authors.push(am[1].trim());

        const pdfUrl = id ? id.replace('/abs/', '/pdf/') + '.pdf' : null;
        if (title) {
          addPaper({
            title,
            authors: authors.slice(0, 3).join(', ') || 'Academic Researchers',
            year,
            citations: 0,
            venue: 'arXiv Preprint Server',
            abstract,
            url: id,
            pdfUrl,
            source: 'arXiv'
          });
        }
      }
    }
  } catch (err) {
    console.warn('Server ArXiv fetch warning:', err.message);
  }

  // 2. Fetch from OpenAlex API (Polite Pool)
  if (results.length < limit) {
    try {
      const oaUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&mailto=go.wolfabroad@gmail.com`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const oaRes = await fetch(oaUrl, {
        headers: { 'User-Agent': 'ResearchAI/2.0 (mailto:go.wolfabroad@gmail.com)' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (oaRes.ok) {
        const data = await oaRes.json();
        for (const item of (data.results || [])) {
          const authors = (item.authorships || []).map(a => a.author?.display_name).filter(Boolean).slice(0, 3).join(', ');
          const doi = item.doi || item.primary_location?.landing_page_url || null;
          const pdf = item.open_access?.oa_url || item.primary_location?.pdf_url || null;

          let abstract = '';
          if (item.abstract_inverted_index) {
            const words = [];
            for (const [word, positions] of Object.entries(item.abstract_inverted_index)) {
              for (const pos of positions) words[pos] = word;
            }
            abstract = words.join(' ').trim();
          }

          addPaper({
            title: item.display_name,
            authors: authors || 'Peer Researchers',
            year: item.publication_year || 'Recent',
            citations: item.cited_by_count || 0,
            venue: item.primary_location?.source?.display_name || 'Peer-Reviewed Journal',
            abstract: abstract || 'Abstract available via publisher DOI.',
            url: doi || `https://scholar.google.com/scholar?q=${encodeURIComponent(item.display_name)}`,
            pdfUrl: pdf,
            source: 'OpenAlex'
          });
        }
      }
    } catch (err) {
      console.warn('Server OpenAlex fetch warning:', err.message);
    }
  }

  // 3. Fetch from Europe PMC API (Fast European Life Sciences & Physics Open Repository)
  if (results.length < limit) {
    try {
      const epmcUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${limit}&resultType=core`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const epmcRes = await fetch(epmcUrl, {
        headers: { 'User-Agent': 'ResearchAI/2.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (epmcRes.ok) {
        const data = await epmcRes.json();
        const list = data.resultList?.result || [];
        for (const item of list) {
          const doi = item.doi ? `https://doi.org/${item.doi}` : null;
          const pdf = item.hasPDF === 'Y' && item.pmcid ? `https://europepmc.org/backend/ptpmcrender.fcgi?accid=${item.pmcid}&blobtype=pdf` : null;
          addPaper({
            title: item.title?.replace(/\.$/, '') || '',
            authors: item.authorString || 'Academic Authors',
            year: item.pubYear || 'Recent',
            citations: item.citedByCount || 0,
            venue: item.journalTitle || 'Peer-Reviewed Journal',
            abstract: item.abstractText || 'Abstract available via publisher DOI.',
            url: doi || `https://europepmc.org/article/MED/${item.id}`,
            pdfUrl: pdf,
            source: 'Europe PMC'
          });
        }
      }
    } catch (err) {
      console.warn('Server EuropePMC fetch warning:', err.message);
    }
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    query,
    count: results.length,
    results: results.slice(0, limit)
  });
}
