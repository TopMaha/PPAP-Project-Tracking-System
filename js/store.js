/* =========================================================================
 * store.js — data layer
 *   - If an API URL is configured (Settings), talk to the Cloudflare Worker.
 *   - Otherwise run in DEMO MODE backed by localStorage with seed data.
 *   The demo logic intentionally mirrors worker/worker.js so behaviour matches
 *   once the Worker is deployed.
 * ========================================================================= */
(function (global) {
  'use strict';

  const LS_KEY   = 'ppap_db_v1';
  const LS_API   = 'ppap_api_url';
  const LS_TOKEN = 'ppap_token';
  const LS_USER  = 'ppap_user';

  const PPAP_ELEMENTS = global.I18N.PPAP_ELEMENTS;

  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function nowISO() { return new Date().toISOString(); }
  function today()  { return new Date().toISOString().slice(0, 10); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }

  // ---------------------------------------------------------------- config
  function apiUrl()   { return (localStorage.getItem(LS_API) || '').trim().replace(/\/$/, ''); }
  function isDemo()   { return !apiUrl(); }
  function setApiUrl(u) { localStorage.setItem(LS_API, (u || '').trim()); }
  function token()    { return localStorage.getItem(LS_TOKEN) || ''; }
  function currentUser() { try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch (e) { return null; } }

  // ---------------------------------------------------------------- demo db
  function blankElements(projectId) {
    return PPAP_ELEMENTS.map((name, i) => ({
      id: uid('el'), project_id: projectId, element_no: i + 1, element_name: name,
      status: 'not_started', responsible: '', due_date: '', completion_date: '', file_url: '', notes: '',
    }));
  }

  function seed() {
    const eng = 'u_eng';
    const p1 = 'p_demo1', p2 = 'p_demo2', p3 = 'p_demo3';
    const db = {
      users: [
        { id: 'u_admin', username: 'admin',    password: 'admin1234', role: 'admin',    name: 'ผู้ดูแลระบบ' },
        { id: 'u_eng',   username: 'engineer', password: 'eng1234',   role: 'engineer', name: 'สมชาย วิศวกร' },
        { id: 'u_view',  username: 'viewer',   password: 'view1234',  role: 'viewer',   name: 'ผู้ชม' },
      ],
      projects: [
        { id: p1, part_no: '48820-0K010', part_name: 'STABILIZER BAR LINK ASSY', customer: 'Toyota / Somic', model: 'IMV', drawing_rev: 'C', ppap_level: 3, target_date: addDays(today(), 21), engineer_id: eng, status: 'trial', confidential: 0, created_at: nowISO() },
        { id: p2, part_no: 'MR-554120', part_name: 'BRACKET ENGINE MOUNT', customer: 'Mitsubishi', model: 'Triton', drawing_rev: 'A', ppap_level: 3, target_date: addDays(today(), 7), engineer_id: eng, status: 'documentation', confidential: 0, created_at: nowISO() },
        { id: p3, part_no: 'CONF-9001', part_name: 'NEW MODEL HOUSING', customer: 'Denso', model: 'EV-X', drawing_rev: 'X1', ppap_level: 4, target_date: addDays(today(), 45), engineer_id: eng, status: 'planning', confidential: 1, created_at: nowISO() },
      ],
      trials: [
        { id: uid('t'), project_id: p1, trial_no: 1, trial_date: addDays(today(), -20), qty: 30, dim_result: 'fail', appearance_result: 'pass', functional_result: 'pass', issues: 'ความยาว C2 เกิน tolerance +0.15mm', corrective_action: 'ปรับ jig ตำแหน่ง stopper', overall_result: 'fail', next_action: 'Trial 2 หลังปรับ jig', next_trial_date: addDays(today(), -10), created_by: eng, created_at: nowISO(), photos: [] },
        { id: uid('t'), project_id: p1, trial_no: 2, trial_date: addDays(today(), -10), qty: 50, dim_result: 'pass', appearance_result: 'pass', functional_result: 'pass', issues: '-', corrective_action: '-', overall_result: 'conditional', next_action: 'รอผล MSA แล้วทำ Trial 3', next_trial_date: addDays(today(), 3), created_by: eng, created_at: nowISO(), photos: [] },
      ],
      ppap_elements: [],
      psw_records: [],
      audit_logs: [],
    };
    db.ppap_elements = [].concat(blankElements(p1), blankElements(p2), blankElements(p3));
    // mark a few completed for p2 so dashboard looks alive
    db.ppap_elements.filter(e => e.project_id === p2).slice(0, 12).forEach(e => { e.status = 'completed'; e.completion_date = today(); });
    db.ppap_elements.filter(e => e.project_id === p1).slice(0, 6).forEach(e => { e.status = 'in_progress'; });
    return db;
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const db = seed();
    save(db);
    return db;
  }
  function save(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) {} }
  function resetDemo() { localStorage.removeItem(LS_KEY); return load(); }

  function audit(db, action, table, targetId) {
    const u = currentUser();
    db.audit_logs.unshift({ id: uid('a'), user_id: u ? u.id : '?', username: u ? u.username : '?', action, target_table: table, target_id: targetId || '', timestamp: nowISO() });
    db.audit_logs = db.audit_logs.slice(0, 200);
  }

  // ---------------------------------------------------------------- API helper
  async function api(path, opts) {
    opts = opts || {};
    const res = await fetch(apiUrl() + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() }, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401) { Store.signOut(); throw new Error('unauthorized'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  // ================================================================ public API
  const Store = {
    isDemo, apiUrl, setApiUrl, currentUser, resetDemo,
    PPAP_ELEMENTS,

    // ---- auth ----
    async signIn(username, password) {
      if (isDemo()) {
        const db = load();
        const u = db.users.find(x => x.username === username && x.password === password);
        if (!u) throw new Error('login_failed');
        const safe = { id: u.id, username: u.username, role: u.role, name: u.name };
        localStorage.setItem(LS_TOKEN, 'demo.' + u.id);
        localStorage.setItem(LS_USER, JSON.stringify(safe));
        audit(db, 'login', 'users', u.id); save(db);
        return safe;
      }
      const data = await api('/api/login', { method: 'POST', body: { username, password } });
      localStorage.setItem(LS_TOKEN, data.token);
      localStorage.setItem(LS_USER, JSON.stringify(data.user));
      return data.user;
    },
    signOut() { localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER); },
    isAuthed() { return !!token() && !!currentUser(); },

    // ---- projects ----
    async listProjects() {
      if (isDemo()) {
        const db = load();
        const u = currentUser();
        return db.projects.filter(p => {
          if (p.confidential && u && u.role === 'viewer' && p.engineer_id !== u.id) return false;
          return true;
        }).map(p => withProgress(db, p));
      }
      return api('/api/projects');
    },
    async getProject(id) {
      if (isDemo()) { const db = load(); const p = db.projects.find(x => x.id === id); return p ? withProgress(db, p) : null; }
      return api('/api/projects/' + id);
    },
    async saveProject(p) {
      if (isDemo()) {
        const db = load();
        if (p.id) {
          Object.assign(db.projects.find(x => x.id === p.id), p);
          audit(db, 'update', 'projects', p.id);
        } else {
          p.id = uid('p'); p.created_at = nowISO();
          db.projects.push(p);
          db.ppap_elements = db.ppap_elements.concat(blankElements(p.id));
          audit(db, 'create', 'projects', p.id);
        }
        save(db); return p;
      }
      return api('/api/projects' + (p.id ? '/' + p.id : ''), { method: p.id ? 'PUT' : 'POST', body: p });
    },
    async deleteProject(id) {
      if (isDemo()) {
        const db = load();
        db.projects = db.projects.filter(x => x.id !== id);
        db.trials = db.trials.filter(x => x.project_id !== id);
        db.ppap_elements = db.ppap_elements.filter(x => x.project_id !== id);
        audit(db, 'delete', 'projects', id); save(db); return true;
      }
      return api('/api/projects/' + id, { method: 'DELETE' });
    },

    // ---- trials ----
    async listTrials(projectId) {
      if (isDemo()) { const db = load(); return db.trials.filter(t => t.project_id === projectId).sort((a, b) => a.trial_no - b.trial_no); }
      return api('/api/projects/' + projectId + '/trials');
    },
    async saveTrial(t) {
      if (isDemo()) {
        const db = load();
        if (t.id) { Object.assign(db.trials.find(x => x.id === t.id), t); audit(db, 'update', 'trials', t.id); }
        else { t.id = uid('t'); t.created_at = nowISO(); t.created_by = (currentUser() || {}).id; t.photos = t.photos || []; db.trials.push(t); audit(db, 'create', 'trials', t.id); }
        save(db); return t;
      }
      return api('/api/trials' + (t.id ? '/' + t.id : ''), { method: t.id ? 'PUT' : 'POST', body: t });
    },
    async deleteTrial(id) {
      if (isDemo()) { const db = load(); db.trials = db.trials.filter(x => x.id !== id); audit(db, 'delete', 'trials', id); save(db); return true; }
      return api('/api/trials/' + id, { method: 'DELETE' });
    },

    // ---- ppap elements ----
    async listElements(projectId) {
      if (isDemo()) { const db = load(); return db.ppap_elements.filter(e => e.project_id === projectId).sort((a, b) => a.element_no - b.element_no); }
      return api('/api/projects/' + projectId + '/elements');
    },
    async saveElement(e) {
      if (isDemo()) { const db = load(); Object.assign(db.ppap_elements.find(x => x.id === e.id), e); audit(db, 'update', 'ppap_elements', e.id); save(db); return e; }
      return api('/api/elements/' + e.id, { method: 'PUT', body: e });
    },

    // ---- psw ----
    async listPsw(projectId) {
      if (isDemo()) { const db = load(); return db.psw_records.filter(r => r.project_id === projectId).sort((a, b) => b.revision - a.revision); }
      return api('/api/projects/' + projectId + '/psw');
    },
    async savePsw(rec) {
      if (isDemo()) {
        const db = load();
        const prev = db.psw_records.filter(r => r.project_id === rec.project_id);
        rec.id = uid('psw'); rec.revision = prev.length; rec.created_at = nowISO(); rec.created_by = (currentUser() || {}).id;
        db.psw_records.push(rec); audit(db, 'create', 'psw_records', rec.id); save(db); return rec;
      }
      return api('/api/projects/' + rec.project_id + '/psw', { method: 'POST', body: rec });
    },

    // ---- audit ----
    async listAudit() {
      if (isDemo()) { return load().audit_logs; }
      return api('/api/audit');
    },
  };

  // ---- progress computation (shared shape with worker) ----
  function withProgress(db, p) {
    const els = db.ppap_elements.filter(e => e.project_id === p.id);
    const done = els.filter(e => e.status === 'completed' || e.status === 'waived').length;
    const readiness = els.length ? Math.round((done / els.length) * 100) : 0;
    const daysLeft = Math.ceil((new Date(p.target_date) - new Date(today())) / 86400000);
    let risk = 'green';
    if (daysLeft < 0 && readiness < 100) risk = 'red';
    else if (daysLeft <= 7 && readiness < 80) risk = 'red';
    else if (daysLeft <= 14 && readiness < 60) risk = 'yellow';
    else if (readiness < 30 && daysLeft <= 21) risk = 'yellow';
    return Object.assign({}, p, { readiness, days_left: daysLeft, risk, elements_done: done, elements_total: els.length });
  }

  global.Store = Store;
})(window);
