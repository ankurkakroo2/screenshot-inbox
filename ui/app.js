export function mount(document, adapter) {
  const $ = s => document.querySelector(s);
  let folder = null, busy = false;
  const status = text => { $('#status').textContent = text; };
  const controls = value => {
    busy = value;
    for (const id of ['choose', 'rescan', 'submit', 'query', 'mode']) $(`#${id}`).disabled = value || (!folder && ['rescan', 'submit'].includes(id));
    $('#results').setAttribute('aria-busy', String(value));
  };
  async function action(fn) {
    if (busy) return;
    controls(true);
    try { await fn(); } catch (error) { status(`Error: ${error.message || error}`); }
    finally { controls(false); }
  }
  function render(hits) {
    $('#results').replaceChildren();
    $('#empty').hidden = hits.length > 0;
    $('#empty').textContent = 'No matching images. Try a visual description, or switch to OCR text.';
    for (const hit of hits) {
      const card = document.createElement('article'); card.className = 'result';
      const image = document.createElement('img'); image.src = hit.thumbnail; image.alt = hit.relative; image.loading = 'lazy';
      const name = document.createElement('p'); name.className = 'filename'; name.textContent = hit.relative; name.title = hit.relative;
      const text = document.createElement('p'); text.className = 'ocr'; text.textContent = hit.ocr.slice(0, 160) || 'No text detected';
      const button = document.createElement('button'); button.textContent = 'Open original';
      button.addEventListener('click', () => action(async () => { await adapter.run('open_original', {folder,id:hit.id}); status(`Opened ${hit.relative}`); }));
      card.append(image,name,text,button); $('#results').append(card);
    }
  }
  async function search() {
    const hits = await adapter.run('search', {folder,query:$('#query').value,mode:$('#mode').value});
    render(hits); status(`${hits.length} result${hits.length === 1 ? '' : 's'} shown (maximum 50).`);
  }
  async function scan() {
    status('Indexing locally… first use may download models. Large folders can take time.');
    const result = await adapter.run('index', {folder});
    await search();
    status(`${result.total} images indexed · ${result.indexed} new or updated · ${result.unchanged} unchanged${result.errors.length ? ` · ${result.errors.length} failed: ${result.errors.map(e => `${e.relative}: ${e.error}`).join('; ')}` : ''}`);
  }
  $('#choose').addEventListener('click', () => action(async () => {
    const selected = await adapter.choose();
    if (!selected) return;
    folder = selected; $('#folder').textContent = folder;
    $('#results').replaceChildren(); await scan();
  }));
  $('#rescan').addEventListener('click', () => action(scan));
  $('#search').addEventListener('submit', event => { event.preventDefault(); if (folder) action(search); });
  controls(false);
}
