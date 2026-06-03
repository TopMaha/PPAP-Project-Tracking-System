/* =========================================================================
 * worker.js — Cloudflare Worker API for PPAP Tracking System
 *   Bindings (wrangler.toml):
 *     DB       — D1 database
 *     R2       — R2 bucket (photo/file storage)        [optional for now]
 *     JWT_SECRET — secret for signing tokens           [wrangler secret put]
 *   Auth: every /api/* route except /api/login requires a valid Bearer JWT.
 *   Passwords: PBKDF2-SHA256 (WebCrypto) — see hashPassword().
 * ========================================================================= */

const PPAP_ELEMENTS = [
  'Design Records', 'Engineering Change Documents', 'Customer Engineering Approval',
  'Design FMEA', 'Process Flow Diagrams', 'Process FMEA', 'Control Plan',
  'Measurement System Analysis (MSA)', 'Dimensional Results',
  'Material / Performance Test Results', 'Initial Process Study (Cpk)',
  'Qualified Laboratory Documentation', 'Appearance Approval Report (AAR)',
  'Sample Production Parts', 'Master Sample', 'Checking Aids',
  'Customer-Specific Requirements', 'Part Submission Warrant (PSW)',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/login' && request.method === 'POST') return login(request, env);
      if (path === '/api/health') return json({ ok: true });

      // everything else requires auth
      const user = await authenticate(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401);

      const seg = path.replace(/^\/api\//, '').split('/').filter(Boolean);
      const id = seg[1];

      // /api/projects ...
      if (seg[0] === 'projects') {
        if (seg.length === 1) {
          if (request.method === 'GET')  return listProjects(env, user);
          if (request.method === 'POST') return createProject(request, env, user);
        }
        if (seg.length === 2) {
          if (request.method === 'GET')    return getProject(env, id, user);
          if (request.method === 'PUT')    return updateProject(request, env, id, user);
          if (request.method === 'DELETE') return deleteProject(env, id, user);
        }
        if (seg[2] === 'trials')   return seg.length === 3 ? listTrials(env, id) : json({ error: 'bad' }, 400);
        if (seg[2] === 'elements') return listElements(env, id);
        if (seg[2] === 'psw') {
          if (request.method === 'GET')  return listPsw(env, id);
          if (request.method === 'POST') return createPsw(request, env, id, user);
        }
      }
      if (seg[0] === 'trials') {
        if (request.method === 'POST')   return saveTrial(request, env, user, null);
        if (request.method === 'PUT')    return saveTrial(request, env, user, id);
        if (request.method === 'DELETE') return remove(env, 'trials', id, user);
      }
      if (seg[0] === 'elements' && request.method === 'PUT') return updateElement(request, env, id, user);
      if (seg[0] === 'audit'    && request.method === 'GET') {
        if (user.role !== 'admin') return json({ error: 'forbidden' }, 403);
        const r = await env.DB.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200').all();
        return json(r.results || []);
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: e.message || 'server error' }, 500);
    }
  },
};

/* ----------------------------------------------------------- helpers */
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };

/* ----- password hashing (PBKDF2-SHA256) ----- */
async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromB64u(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return b64u(salt) + '$' + b64u(bits);
}
async function verifyPassword(password, stored) {
  const [saltB64] = stored.split('$');
  const candidate = await hashPassword(password, saltB64);
  return candidate === stored;
}

/* ----- JWT (HS256) ----- */
async function signJWT(payload, secret) {
  const header = b64u(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const data = header + '.' + body;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return data + '.' + b64u(sig);
}
async function verifyJWT(tokenStr, secret) {
  const [h, b, s] = (tokenStr || '').split('.');
  if (!h || !b || !s) return null;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, fromB64u(s), enc.encode(h + '.' + b));
  if (!ok) return null;
  const payload = JSON.parse(new TextDecoder().decode(fromB64u(b)));
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
}
async function authenticate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  return verifyJWT(token, env.JWT_SECRET || 'dev-secret-change-me');
}
async function logAudit(env, user, action, table, targetId) {
  await env.DB.prepare('INSERT INTO audit_logs (id,user_id,username,action,target_table,target_id,timestamp) VALUES (?,?,?,?,?,?,?)')
    .bind(uid('a'), user.id, user.username, action, table, targetId || '', new Date().toISOString()).run();
}

/* ----------------------------------------------------------- auth route */
async function login(request, env) {
  const { username, password } = await request.json();
  const row = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  if (!row || !(await verifyPassword(password, row.password_hash))) return json({ error: 'login_failed' }, 401);
  const user = { id: row.id, username: row.username, role: row.role, name: row.name };
  const token = await signJWT({ ...user, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 }, env.JWT_SECRET || 'dev-secret-change-me');
  await logAudit(env, user, 'login', 'users', user.id);
  return json({ token, user });
}

/* ----------------------------------------------------------- projects */
function withProgress(p, els) {
  const done = els.filter(e => e.status === 'completed' || e.status === 'waived').length;
  const readiness = els.length ? Math.round(done / els.length * 100) : 0;
  const daysLeft = Math.ceil((new Date(p.target_date) - new Date(new Date().toISOString().slice(0, 10))) / 86400000);
  let risk = 'green';
  if (daysLeft < 0 && readiness < 100) risk = 'red';
  else if (daysLeft <= 7 && readiness < 80) risk = 'red';
  else if (daysLeft <= 14 && readiness < 60) risk = 'yellow';
  else if (readiness < 30 && daysLeft <= 21) risk = 'yellow';
  return { ...p, readiness, days_left: daysLeft, risk, elements_done: done, elements_total: els.length };
}
async function listProjects(env, user) {
  const projs = (await env.DB.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()).results || [];
  const els = (await env.DB.prepare('SELECT project_id,status FROM ppap_elements').all()).results || [];
  const out = projs
    .filter(p => !(p.confidential && user.role === 'viewer' && p.engineer_id !== user.id))
    .map(p => withProgress(p, els.filter(e => e.project_id === p.id)));
  return json(out);
}
async function getProject(env, id, user) {
  const p = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!p) return json({ error: 'not found' }, 404);
  const els = (await env.DB.prepare('SELECT project_id,status FROM ppap_elements WHERE project_id = ?').bind(id).all()).results || [];
  return json(withProgress(p, els));
}
async function createProject(request, env, user) {
  if (user.role === 'viewer') return json({ error: 'forbidden' }, 403);
  const b = await request.json();
  const id = uid('p');
  await env.DB.prepare('INSERT INTO projects (id,part_no,part_name,customer,model,drawing_rev,ppap_level,target_date,engineer_id,status,confidential,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, b.part_no, b.part_name, b.customer, b.model, b.drawing_rev, b.ppap_level || 3, b.target_date, user.id, b.status || 'planning', b.confidential ? 1 : 0, new Date().toISOString()).run();
  // seed 18 elements
  const stmt = env.DB.prepare('INSERT INTO ppap_elements (id,project_id,element_no,element_name,status) VALUES (?,?,?,?,?)');
  await env.DB.batch(PPAP_ELEMENTS.map((name, i) => stmt.bind(uid('el'), id, i + 1, name, 'not_started')));
  await logAudit(env, user, 'create', 'projects', id);
  return getProject(env, id, user);
}
async function updateProject(request, env, id, user) {
  if (user.role === 'viewer') return json({ error: 'forbidden' }, 403);
  const b = await request.json();
  await env.DB.prepare('UPDATE projects SET part_no=?,part_name=?,customer=?,model=?,drawing_rev=?,ppap_level=?,target_date=?,status=?,confidential=? WHERE id=?')
    .bind(b.part_no, b.part_name, b.customer, b.model, b.drawing_rev, b.ppap_level || 3, b.target_date, b.status, b.confidential ? 1 : 0, id).run();
  await logAudit(env, user, 'update', 'projects', id);
  return getProject(env, id, user);
}
async function deleteProject(env, id, user) {
  if (user.role !== 'admin' && user.role !== 'engineer') return json({ error: 'forbidden' }, 403);
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  await logAudit(env, user, 'delete', 'projects', id);
  return json({ ok: true });
}

/* ----------------------------------------------------------- trials */
async function listTrials(env, projectId) {
  const trials = (await env.DB.prepare('SELECT * FROM trials WHERE project_id = ? ORDER BY trial_no').bind(projectId).all()).results || [];
  for (const t of trials) {
    t.photos = (await env.DB.prepare('SELECT id,photo_url,caption FROM trial_photos WHERE trial_id = ?').bind(t.id).all()).results || [];
  }
  return json(trials);
}
async function saveTrial(request, env, user, id) {
  if (user.role === 'viewer') return json({ error: 'forbidden' }, 403);
  const b = await request.json();
  if (id) {
    await env.DB.prepare('UPDATE trials SET trial_no=?,trial_date=?,qty=?,dim_result=?,appearance_result=?,functional_result=?,issues=?,corrective_action=?,overall_result=?,next_action=?,next_trial_date=? WHERE id=?')
      .bind(b.trial_no, b.trial_date, b.qty, b.dim_result, b.appearance_result, b.functional_result, b.issues, b.corrective_action, b.overall_result, b.next_action, b.next_trial_date, id).run();
    await logAudit(env, user, 'update', 'trials', id);
  } else {
    id = uid('t');
    await env.DB.prepare('INSERT INTO trials (id,project_id,trial_no,trial_date,qty,dim_result,appearance_result,functional_result,issues,corrective_action,overall_result,next_action,next_trial_date,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, b.project_id, b.trial_no, b.trial_date, b.qty, b.dim_result, b.appearance_result, b.functional_result, b.issues, b.corrective_action, b.overall_result, b.next_action, b.next_trial_date, user.id, new Date().toISOString()).run();
    await logAudit(env, user, 'create', 'trials', id);
  }
  // photos: replace set (base64 data URLs are uploaded to R2 if bound, else stored inline)
  if (Array.isArray(b.photos)) {
    await env.DB.prepare('DELETE FROM trial_photos WHERE trial_id = ?').bind(id).run();
    for (const ph of b.photos) {
      let url = ph.photo_url;
      if (env.R2 && url && url.startsWith('data:')) url = await uploadDataUrl(env, url, id);
      await env.DB.prepare('INSERT INTO trial_photos (id,trial_id,photo_url,caption,uploaded_at) VALUES (?,?,?,?,?)')
        .bind(uid('ph'), id, url, ph.caption || '', new Date().toISOString()).run();
    }
  }
  return json({ id, ok: true });
}
async function uploadDataUrl(env, dataUrl, trialId) {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!m) return dataUrl;
  const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
  const key = 'trials/' + trialId + '/' + uid('img') + '.' + (m[1].split('/')[1] || 'jpg');
  await env.R2.put(key, bytes, { httpMetadata: { contentType: m[1] } });
  return (env.R2_PUBLIC_URL || '') + '/' + key;
}

/* ----------------------------------------------------------- elements */
async function listElements(env, projectId) {
  const r = await env.DB.prepare('SELECT * FROM ppap_elements WHERE project_id = ? ORDER BY element_no').bind(projectId).all();
  return json(r.results || []);
}
async function updateElement(request, env, id, user) {
  if (user.role === 'viewer') return json({ error: 'forbidden' }, 403);
  const b = await request.json();
  await env.DB.prepare('UPDATE ppap_elements SET status=?,responsible=?,due_date=?,completion_date=?,file_url=?,notes=? WHERE id=?')
    .bind(b.status, b.responsible, b.due_date, b.completion_date, b.file_url || '', b.notes, id).run();
  await logAudit(env, user, 'update', 'ppap_elements', id);
  return json({ ok: true });
}

/* ----------------------------------------------------------- psw */
async function listPsw(env, projectId) {
  const r = await env.DB.prepare('SELECT * FROM psw_records WHERE project_id = ? ORDER BY revision DESC').bind(projectId).all();
  return json(r.results || []);
}
async function createPsw(request, env, projectId, user) {
  if (user.role === 'viewer') return json({ error: 'forbidden' }, 403);
  const b = await request.json();
  const prev = await env.DB.prepare('SELECT COUNT(*) AS n FROM psw_records WHERE project_id = ?').bind(projectId).first();
  const id = uid('psw');
  await env.DB.prepare('INSERT INTO psw_records (id,project_id,revision,data_json,created_at,created_by) VALUES (?,?,?,?,?,?)')
    .bind(id, projectId, prev.n, b.data_json || '{}', new Date().toISOString(), user.id).run();
  await logAudit(env, user, 'create', 'psw_records', id);
  return json({ id, revision: prev.n, ok: true });
}

/* ----------------------------------------------------------- generic delete */
async function remove(env, table, id, user) {
  if (user.role === 'viewer') return json({ error: 'forbidden' }, 403);
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  await logAudit(env, user, 'delete', table, id);
  return json({ ok: true });
}
