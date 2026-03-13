export const shippingRatesPageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shipping rates – Vendure</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1.5rem; background: #f5f5f5; }
    h1 { margin: 0 0 1rem; font-size: 1.5rem; }
    .bar { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    a { color: #0d6efd; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .error { color: #b02a37; background: #f8d7da; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 1rem; }
    .success { color: #0f5132; background: #d1e7dd; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 1rem; }
    table { width: 100%; max-width: 640px; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    th, td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    input[type="number"] { width: 5rem; padding: 0.35rem 0.5rem; border: 1px solid #ced4da; border-radius: 4px; }
    button { padding: 0.35rem 0.75rem; border: 1px solid #0d6efd; background: #0d6efd; color: #fff; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
    button:hover { background: #0b5ed7; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .cents { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <h1>Shipping rates (postal code zones)</h1>
  <div class="bar">
    <a href="/admin">← Back to Admin</a>
  </div>
  <div id="message"></div>
  <table>
    <thead>
      <tr>
        <th>Country</th>
        <th>Prefix</th>
        <th>Zone</th>
        <th>Rate (cents)</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="zones"></tbody>
  </table>
  <script>
    const adminApi = '/admin-api';
    const messageEl = document.getElementById('message');
    const tbody = document.getElementById('zones');

    function show(msg, type) {
      messageEl.textContent = msg;
      messageEl.className = type || '';
      messageEl.style.display = msg ? 'block' : 'none';
    }

    async function graphql(query, variables) {
      const res = await fetch(adminApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables })
      });
      const json = await res.json();
      if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'GraphQL error');
      return json.data;
    }

    function renderZones(zones) {
      tbody.innerHTML = zones.map(z => \`
        <tr data-id="\${z.id}">
          <td>\${escapeHtml(z.countryCode)}</td>
          <td>\${escapeHtml(z.prefix || '—')}</td>
          <td>\${escapeHtml(z.zoneName)}</td>
          <td><input type="number" min="0" step="1" value="\${z.rateCents}" class="cents" data-id="\${z.id}" /></td>
          <td><button type="button" class="save" data-id="\${z.id}">Save</button></td>
        </tr>
      \`).join('');
      tbody.querySelectorAll('button.save').forEach(btn => {
        btn.addEventListener('click', () => save(btn.dataset.id));
      });
    }

    function escapeHtml(s) {
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }

    async function save(id) {
      const row = tbody.querySelector(\`tr[data-id="\${id}"]\`);
      const input = row.querySelector('input');
      const btn = row.querySelector('button.save');
      const rateCents = parseInt(input.value, 10);
      if (isNaN(rateCents) || rateCents < 0) {
        show('Invalid rate.', 'error');
        return;
      }
      btn.disabled = true;
      try {
        await graphql(
          \`mutation UpdatePostalCodeZone($id: ID!, $rateCents: Int!) { updatePostalCodeZone(id: $id, rateCents: $rateCents) { id rateCents } }\`,
          { id, rateCents }
        );
        show('Rate saved.', 'success');
        setTimeout(() => show(''), 2000);
      } catch (e) {
        show(e.message || 'Save failed.', 'error');
      }
      btn.disabled = false;
    }

    (async function load() {
      try {
        const data = await graphql(
          \`query { postalCodeZones { id countryCode prefix zoneName rateCents } }\`,
          {}
        );
        renderZones(data.postalCodeZones || []);
        show('');
      } catch (e) {
        show('Cannot load zones. Log in to Admin first, then open this page again.', 'error');
        tbody.innerHTML = '';
      }
    })();
  </script>
</body>
</html>
`.trim();
