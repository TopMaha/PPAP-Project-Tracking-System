/* =========================================================================
 * app.js — UI router & rendering for PPAP Tracking System
 * ========================================================================= */
(function (global) {
  'use strict';
  const t = (k) => global.I18N.t(k);
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const PROJECT_STATUSES = ['planning', 'trial', 'documentation', 'submission', 'approved', 'rejected'];
  const ELEMENT_STATUSES = ['not_started', 'in_progress', 'completed', 'waived', 'rejected'];
  const RESULTS = ['pass', 'conditional', 'fail'];
  const CHECK_RESULTS = ['pass', 'fail'];

  const state = { view: 'dashboard', projectId: null, route: parseHash() };

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [view, projectId, sub] = h.split('/');
    return { view: view || 'dashboard', projectId: projectId || null, sub: sub || null };
  }
  function go(view, projectId, sub) {
    location.hash = '#/' + view + (projectId ? '/' + projectId : '') + (sub ? '/' + sub : '');
  }

  function fmtDate(d) { return d ? d.slice(0, 10) : '—'; }
  function badge(cls, text) { return `<span class="badge ${cls}">${esc(text)}</span>`; }

  function statusBadge(st) {
    return badge('st-' + st, t('st_' + st));
  }
  function resultBadge(r) {
    if (!r) return '<span class="badge st-na">—</span>';
    const cls = r === 'pass' ? 'res-pass' : r === 'fail' ? 'res-fail' : 'res-cond';
    return badge(cls, t('result_' + (r === 'conditional' ? 'conditional' : r)));
  }
  function elStatusBadge(st) { return badge('el-' + st, t('el_' + st)); }
  function riskDot(risk) { return `<span class="risk-dot risk-${risk}" title="${esc(t('risk_' + risk))}"></span>`; }

  // ============================================================ APP SHELL
  function renderShell() {
    const u = Store.currentUser();
    const lang = global.I18N.getLang();
    const navItems = [
      ['dashboard', '📊', 'nav_dashboard'],
      ['projects', '📁', 'nav_projects'],
      ['trials', '🧪', 'nav_trials'],
      ['documents', '📋', 'nav_documents'],
      ['psw', '📝', 'nav_psw'],
      ['formbuilder', '🧰', 'nav_formbuilder'],
      ['settings', '⚙️', 'nav_settings'],
    ];
    const can = (v) => !(v === 'formbuilder' && u.role !== 'admin');
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="brand"><span class="logo">PP</span><div><b>${esc(t('app_name'))}</b><small>${esc(Store.isDemo() ? t('demo_mode') : t('online_mode'))}</small></div></div>
          <nav class="nav">
            ${navItems.filter(n => can(n[0])).map(n => `<a href="#/${n[0]}" data-view="${n[0]}"><span class="ico">${n[1]}</span><span>${esc(t(n[2]))}</span></a>`).join('')}
          </nav>
          <div class="side-foot">
            <button class="lang-btn" id="langBtn">🌐 ${lang === 'th' ? 'EN' : 'ไทย'}</button>
            <div class="user-chip"><span class="avatar">${esc((u.name || u.username)[0])}</span><div><b>${esc(u.name || u.username)}</b><small>${esc(t('role_' + u.role))}</small></div></div>
            <button class="logout" id="logoutBtn">⎋ ${esc(t('logout'))}</button>
          </div>
        </aside>
        <main class="content" id="content"></main>
        <nav class="bottom-nav">
          ${navItems.filter(n => n[0] !== 'formbuilder').map(n => `<a href="#/${n[0]}" data-view="${n[0]}"><span class="ico">${n[1]}</span><small>${esc(t(n[2]))}</small></a>`).join('')}
        </nav>
      </div>
      <div id="modalRoot"></div>
      <div id="toast" class="toast"></div>`;
    $('#langBtn').onclick = () => global.I18N.toggleLang();
    $('#logoutBtn').onclick = () => { Store.signOut(); boot(); };
  }

  function setActiveNav(view) {
    $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  }

  function toast(msg) {
    const el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ============================================================ MODAL
  function modal(title, bodyHTML, onMount) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-overlay"><div class="modal"><div class="modal-head"><h3>${esc(title)}</h3><button class="x">✕</button></div><div class="modal-body">${bodyHTML}</div></div></div>`;
    const close = () => { root.innerHTML = ''; };
    $('.x', root).onclick = close;
    $('.modal-overlay', root).onclick = (e) => { if (e.target.classList.contains('modal-overlay')) close(); };
    if (onMount) onMount(root, close);
    return close;
  }

  function field(label, name, value, type, opts) {
    opts = opts || {};
    value = value == null ? '' : value;
    if (type === 'select') {
      return `<label class="fld"><span>${esc(label)}</span><select name="${name}">${opts.options.map(o => `<option value="${o.v}"${o.v == value ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select></label>`;
    }
    if (type === 'textarea') {
      return `<label class="fld"><span>${esc(label)}</span><textarea name="${name}" rows="${opts.rows || 2}">${esc(value)}</textarea></label>`;
    }
    if (type === 'checkbox') {
      return `<label class="fld chk"><input type="checkbox" name="${name}"${value ? ' checked' : ''}><span>${esc(label)}</span></label>`;
    }
    return `<label class="fld"><span>${esc(label)}</span><input type="${type || 'text'}" name="${name}" value="${esc(value)}"${opts.attrs || ''}></label>`;
  }
  function readForm(form) {
    const o = {};
    $$('[name]', form).forEach(i => { o[i.name] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.value; });
    return o;
  }

  // ============================================================ VIEWS
  const Views = {};

  // ---- DASHBOARD (overview of all projects) ----
  Views.dashboard = async function (c) {
    c.innerHTML = `<header class="page-head"><h1>${esc(t('overview'))}</h1></header><div id="grid" class="loading">${esc(t('loading'))}</div>`;
    const projects = await Store.listProjects();
    const grid = $('#grid', c); grid.classList.remove('loading');
    const active = projects.filter(p => p.status !== 'approved' && p.status !== 'rejected');
    const kpis = [
      [t('active_projects'), active.length],
      [t('st_approved'), projects.filter(p => p.status === 'approved').length],
      [t('risk_red'), projects.filter(p => p.risk === 'red').length],
      [t('overdue'), projects.filter(p => p.days_left < 0 && p.status !== 'approved').length],
    ];
    grid.innerHTML = `
      <div class="kpis">${kpis.map(k => `<div class="kpi"><b>${k[1]}</b><span>${esc(k[0])}</span></div>`).join('')}</div>
      <div class="card-grid">${projects.length ? projects.map(projectCard).join('') : `<p class="empty">${esc(t('no_projects'))}</p>`}</div>`;
    $$('.proj-card', grid).forEach(card => card.onclick = () => go('dashboard', card.dataset.id, 'detail'));
  };

  function projectCard(p) {
    const conf = p.confidential ? '🔒 ' : '';
    const pn = (p.confidential && (Store.currentUser().role === 'viewer')) ? '••••••' : p.part_no;
    return `<div class="proj-card" data-id="${p.id}">
      <div class="pc-top">${riskDot(p.risk)}<b>${conf}${esc(pn)}</b>${statusBadge(p.status)}</div>
      <div class="pc-name">${esc(p.part_name)}</div>
      <div class="pc-meta"><span>${esc(p.customer)}</span><span>L${p.ppap_level}</span></div>
      <div class="prog"><div class="bar"><i style="width:${p.readiness}%"></i></div><span>${p.readiness}%</span></div>
      <div class="pc-foot"><span>${esc(t('days_left'))}: <b class="${p.days_left < 0 ? 'neg' : ''}">${p.days_left < 0 ? t('overdue') : p.days_left}</b></span><span>${esc(fmtDate(p.target_date))}</span></div>
    </div>`;
  }

  // ---- PROJECTS LIST ----
  Views.projects = async function (c) {
    const u = Store.currentUser();
    const canEdit = u.role === 'admin' || u.role === 'engineer';
    c.innerHTML = `<header class="page-head"><h1>${esc(t('projects_title'))}</h1>${canEdit ? `<button class="btn primary" id="newP">＋ ${esc(t('new_project'))}</button>` : ''}</header>
      <div class="filters">
        <select id="fStatus"><option value="">${esc(t('all'))} — ${esc(t('status'))}</option>${PROJECT_STATUSES.map(s => `<option value="${s}">${esc(t('st_' + s))}</option>`).join('')}</select>
        <input id="fSearch" placeholder="${esc(t('search'))} ${esc(t('part_no'))} / ${esc(t('customer'))}">
      </div>
      <div id="tbl"></div>`;
    if (canEdit) $('#newP', c).onclick = () => projectForm(null);
    const projects = await Store.listProjects();
    function draw() {
      const fs = $('#fStatus', c).value, q = $('#fSearch', c).value.toLowerCase();
      const rows = projects.filter(p => (!fs || p.status === fs) &&
        (!q || (p.part_no + p.part_name + p.customer).toLowerCase().includes(q)));
      $('#tbl', c).innerHTML = rows.length ? `
        <table class="data"><thead><tr>
          <th></th><th>${esc(t('part_no'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('customer'))}</th>
          <th>${esc(t('ppap_level'))}</th><th>${esc(t('status'))}</th><th>${esc(t('progress'))}</th><th>${esc(t('days_left'))}</th><th></th>
        </tr></thead><tbody>${rows.map(p => `<tr data-id="${p.id}">
          <td>${riskDot(p.risk)}</td>
          <td><b>${p.confidential ? '🔒 ' : ''}${esc((p.confidential && u.role === 'viewer') ? '••••' : p.part_no)}</b></td>
          <td>${esc(p.part_name)}</td><td>${esc(p.customer)}</td><td>L${p.ppap_level}</td>
          <td>${statusBadge(p.status)}</td>
          <td><div class="prog mini"><div class="bar"><i style="width:${p.readiness}%"></i></div><span>${p.readiness}%</span></div></td>
          <td class="${p.days_left < 0 ? 'neg' : ''}">${p.days_left < 0 ? t('overdue') : p.days_left}</td>
          <td><button class="link openP">${esc(t('nav_dashboard'))} ›</button></td>
        </tr>`).join('')}</tbody></table>` : `<p class="empty">${esc(t('no_projects'))}</p>`;
      $$('tr[data-id]', c).forEach(tr => {
        tr.querySelector('.openP').onclick = () => go('dashboard', tr.dataset.id, 'detail');
      });
    }
    $('#fStatus', c).onchange = draw; $('#fSearch', c).oninput = draw; draw();
  };

  function projectForm(p) {
    p = p || {};
    const isNew = !p.id;
    const body = `<form id="pf" class="form-grid">
      ${field(t('part_no'), 'part_no', p.part_no, 'text')}
      ${field(t('part_name'), 'part_name', p.part_name, 'text')}
      ${field(t('customer'), 'customer', p.customer, 'text')}
      ${field(t('model'), 'model', p.model, 'text')}
      ${field(t('drawing_rev'), 'drawing_rev', p.drawing_rev, 'text')}
      ${field(t('ppap_level'), 'ppap_level', p.ppap_level || 3, 'select', { options: [1, 2, 3, 4, 5].map(n => ({ v: n, l: 'Level ' + n })) })}
      ${field(t('target_date'), 'target_date', p.target_date, 'date')}
      ${field(t('status'), 'status', p.status || 'planning', 'select', { options: PROJECT_STATUSES.map(s => ({ v: s, l: t('st_' + s) })) })}
      ${field(t('confidential'), 'confidential', p.confidential, 'checkbox')}
      <div class="form-actions"><button type="button" class="btn" id="cx">${esc(t('cancel'))}</button><button type="submit" class="btn primary">${esc(t('save'))}</button></div>
    </form>`;
    modal(isNew ? t('new_project') : t('edit') + ' — ' + p.part_no, body, (root, close) => {
      $('#cx', root).onclick = close;
      $('#pf', root).onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.assign({}, p, readForm(e.target));
        data.ppap_level = +data.ppap_level;
        await Store.saveProject(data);
        close(); toast(t('save')); router();
      };
    });
  }

  // ---- PROJECT DETAIL (dashboard per project) ----
  Views.detail = async function (c, projectId) {
    c.innerHTML = `<div class="loading">${esc(t('loading'))}</div>`;
    const p = await Store.getProject(projectId);
    if (!p) { c.innerHTML = `<p class="empty">404</p>`; return; }
    const [trials, elements, psw] = await Promise.all([Store.listTrials(projectId), Store.listElements(projectId), Store.listPsw(projectId)]);
    const u = Store.currentUser();
    const canEdit = u.role === 'admin' || u.role === 'engineer';
    const elDone = elements.filter(e => e.status === 'completed' || e.status === 'waived').length;
    c.innerHTML = `
      <header class="page-head">
        <div><button class="link" id="bk">‹ ${esc(t('nav_projects'))}</button>
        <h1>${p.confidential ? '🔒 ' : ''}${esc(p.part_no)} <span class="muted">${esc(p.part_name)}</span></h1></div>
        ${canEdit ? `<button class="btn" id="editP">✎ ${esc(t('edit'))}</button>` : ''}
      </header>
      <div class="detail-grid">
        <div class="card info">
          <div class="info-row"><span>${esc(t('customer'))}</span><b>${esc(p.customer)}</b></div>
          <div class="info-row"><span>${esc(t('model'))}</span><b>${esc(p.model || '—')}</b></div>
          <div class="info-row"><span>${esc(t('drawing_rev'))}</span><b>${esc(p.drawing_rev || '—')}</b></div>
          <div class="info-row"><span>${esc(t('ppap_level'))}</span><b>Level ${p.ppap_level}</b></div>
          <div class="info-row"><span>${esc(t('status'))}</span>${statusBadge(p.status)}</div>
          <div class="info-row"><span>${esc(t('target_date'))}</span><b>${esc(fmtDate(p.target_date))}</b></div>
        </div>
        <div class="card countdown ${p.risk}">
          <span>${esc(t('countdown'))}</span>
          <b class="big">${p.days_left < 0 ? t('overdue') : p.days_left}</b>
          <small>${p.days_left < 0 ? '' : esc(t('days_left'))}</small>
          <div class="risk-flag risk-${p.risk}">${riskDot(p.risk)} ${esc(t('risk_' + p.risk))}</div>
        </div>
        <div class="card">
          <h3>${esc(t('readiness'))}</h3>
          <div class="prog big"><div class="bar"><i style="width:${p.readiness}%"></i></div><span>${p.readiness}%</span></div>
          <small class="muted">${elDone}/${elements.length} elements</small>
        </div>
      </div>

      <section class="card">
        <div class="sec-head"><h3>${esc(t('trial_summary'))}</h3><button class="link" id="goTrials">${esc(t('nav_trials'))} ›</button></div>
        <div class="timeline">${trials.length ? trials.map(tr => `
          <div class="tl-item">
            <div class="tl-dot ${tr.overall_result}"></div>
            <div class="tl-body"><b>Trial ${tr.trial_no}</b> ${resultBadge(tr.overall_result)}<small>${esc(fmtDate(tr.trial_date))} · Qty ${tr.qty || 0}</small></div>
          </div>`).join('') : `<p class="empty">${esc(t('no_trials'))}</p>`}</div>
      </section>

      <section class="card">
        <div class="sec-head"><h3>${esc(t('documents_title'))}</h3><button class="link" id="goDocs">${esc(t('nav_documents'))} ›</button></div>
        <div class="el-mini">${elements.map(e => `<div class="el-chip el-${e.status}" title="${esc(e.element_name)}">${e.element_no}</div>`).join('')}</div>
      </section>

      <section class="card">
        <div class="sec-head"><h3>PSW</h3><button class="link" id="goPsw">${esc(t('nav_psw'))} ›</button></div>
        <p class="muted">${psw.length ? psw.length + ' revision(s) · ' + t('psw_revision') + ' ' + psw[0].revision : esc(t('none'))}</p>
      </section>`;
    $('#bk', c).onclick = () => go('projects');
    if (canEdit) $('#editP', c).onclick = () => projectForm(p);
    $('#goTrials', c).onclick = () => go('trials', projectId);
    $('#goDocs', c).onclick = () => go('documents', projectId);
    $('#goPsw', c).onclick = () => go('psw', projectId);
  };

  // ---- TRIALS ----
  Views.trials = async function (c, projectId) {
    if (!projectId) { return pickProject(c, 'trials'); }
    const p = await Store.getProject(projectId);
    const u = Store.currentUser();
    const canEdit = u.role === 'admin' || u.role === 'engineer';
    c.innerHTML = `<header class="page-head"><div><button class="link" id="bk">‹ ${esc(p.part_no)}</button><h1>${esc(t('trials_title'))}</h1></div>${canEdit ? `<button class="btn primary" id="newT">＋ ${esc(t('new_trial'))}</button>` : ''}</header><div id="list"></div>`;
    $('#bk', c).onclick = () => go('dashboard', projectId, 'detail');
    const trials = await Store.listTrials(projectId);
    const list = $('#list', c);
    list.innerHTML = trials.length ? `<div class="timeline big">${trials.map(tr => trialCard(tr, canEdit)).join('')}</div>` : `<p class="empty">${esc(t('no_trials'))}</p>`;
    $$('.trial-card', list).forEach(card => {
      const id = card.dataset.id; const tr = trials.find(x => x.id === id);
      const e = card.querySelector('.editT'); if (e) e.onclick = () => trialForm(projectId, tr);
      const d = card.querySelector('.delT'); if (d) d.onclick = async () => { if (confirm(t('delete') + '?')) { await Store.deleteTrial(id); router(); } };
    });
    if (canEdit) $('#newT', c).onclick = () => { trialForm(projectId, { trial_no: (trials.length ? Math.max(...trials.map(x => x.trial_no)) : 0) + 1, trial_date: new Date().toISOString().slice(0, 10) }); };
  };

  function trialCard(tr, canEdit) {
    const photos = (tr.photos || []);
    return `<div class="trial-card" data-id="${tr.id}">
      <div class="tc-head"><div class="tl-dot ${tr.overall_result}"></div><b>Trial ${tr.trial_no}</b>${resultBadge(tr.overall_result)}<span class="muted">${esc(fmtDate(tr.trial_date))}</span>
        ${canEdit ? `<span class="tc-act"><button class="link editT">✎</button><button class="link delT">🗑</button></span>` : ''}</div>
      <div class="tc-checks">
        <div>Dimension ${resultBadge(tr.dim_result)}</div>
        <div>Appearance ${resultBadge(tr.appearance_result)}</div>
        <div>Functional ${resultBadge(tr.functional_result)}</div>
        <div>Qty <b>${tr.qty || 0}</b></div>
      </div>
      ${tr.issues && tr.issues !== '-' ? `<div class="tc-text"><b>${esc(t('issues'))}:</b> ${esc(tr.issues)}</div>` : ''}
      ${tr.corrective_action && tr.corrective_action !== '-' ? `<div class="tc-text"><b>${esc(t('corrective_action'))}:</b> ${esc(tr.corrective_action)}</div>` : ''}
      ${tr.next_action ? `<div class="tc-text"><b>${esc(t('next_action'))}:</b> ${esc(tr.next_action)} ${tr.next_trial_date ? '· ' + esc(fmtDate(tr.next_trial_date)) : ''}</div>` : ''}
      ${photos.length ? `<div class="thumbs">${photos.map(ph => `<img src="${ph.photo_url}" alt="${esc(ph.caption || '')}">`).join('')}</div>` : ''}
    </div>`;
  }

  function trialForm(projectId, tr) {
    tr = tr || {};
    const cr = (l, n, v) => field(l, n, v || '', 'select', { options: [{ v: '', l: '—' }].concat(CHECK_RESULTS.map(r => ({ v: r, l: t('result_' + r) }))) });
    const body = `<form id="tf" class="form-grid">
      ${field(t('trial_no'), 'trial_no', tr.trial_no, 'number')}
      ${field(t('trial_date'), 'trial_date', tr.trial_date, 'date')}
      ${field(t('qty'), 'qty', tr.qty, 'number')}
      ${field(t('overall_result'), 'overall_result', tr.overall_result || '', 'select', { options: [{ v: '', l: '—' }].concat(RESULTS.map(r => ({ v: r, l: t('result_' + (r === 'conditional' ? 'conditional' : r)) }))) })}
      ${cr(t('dim_result'), 'dim_result', tr.dim_result)}
      ${cr(t('appearance_result'), 'appearance_result', tr.appearance_result)}
      ${cr(t('functional_result'), 'functional_result', tr.functional_result)}
      ${field(t('issues'), 'issues', tr.issues, 'textarea')}
      ${field(t('corrective_action'), 'corrective_action', tr.corrective_action, 'textarea')}
      ${field(t('next_action'), 'next_action', tr.next_action, 'text')}
      ${field(t('next_trial_date'), 'next_trial_date', tr.next_trial_date, 'date')}
      <div class="photo-zone full">
        <span>${esc(t('photos'))}</span>
        <div class="thumbs" id="thumbs">${(tr.photos || []).map((ph, i) => `<div class="thumb"><img src="${ph.photo_url}"><button type="button" class="rm" data-i="${i}">✕</button></div>`).join('')}</div>
        <label class="btn ghost cam">📷 ${esc(t('add_photo'))}<input type="file" accept="image/*" capture="environment" multiple hidden id="photoIn"></label>
      </div>
      <div class="form-actions"><button type="button" class="btn" id="cx">${esc(t('cancel'))}</button><button type="submit" class="btn primary">${esc(t('save'))}</button></div>
    </form>`;
    modal('Trial ' + (tr.trial_no || ''), body, (root, close) => {
      let photos = (tr.photos || []).slice();
      function drawThumbs() {
        $('#thumbs', root).innerHTML = photos.map((ph, i) => `<div class="thumb"><img src="${ph.photo_url}"><button type="button" class="rm" data-i="${i}">✕</button></div>`).join('');
        $$('.rm', root).forEach(b => b.onclick = () => { photos.splice(+b.dataset.i, 1); drawThumbs(); });
      }
      $('#photoIn', root).onchange = (e) => {
        Array.from(e.target.files).forEach(f => {
          const r = new FileReader();
          r.onload = () => { photos.push({ photo_url: r.result, caption: f.name }); drawThumbs(); };
          r.readAsDataURL(f);
        });
      };
      drawThumbs();
      $('#cx', root).onclick = close;
      $('#tf', root).onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.assign({}, tr, readForm(e.target), { project_id: projectId, photos });
        data.trial_no = +data.trial_no; data.qty = +data.qty || 0;
        await Store.saveTrial(data); close(); toast(t('save')); router();
      };
    });
  }

  // ---- DOCUMENTS (PPAP 18 elements) ----
  Views.documents = async function (c, projectId) {
    if (!projectId) return pickProject(c, 'documents');
    const p = await Store.getProject(projectId);
    const u = Store.currentUser();
    const canEdit = u.role === 'admin' || u.role === 'engineer';
    const elements = await Store.listElements(projectId);
    const done = elements.filter(e => e.status === 'completed' || e.status === 'waived').length;
    c.innerHTML = `<header class="page-head"><div><button class="link" id="bk">‹ ${esc(p.part_no)}</button><h1>${esc(t('documents_title'))}</h1></div></header>
      <div class="prog big"><div class="bar"><i style="width:${Math.round(done / elements.length * 100)}%"></i></div><span>${Math.round(done / elements.length * 100)}%</span></div>
      <div class="el-list">${elements.map(e => `
        <div class="el-row el-b-${e.status}" data-id="${e.id}">
          <div class="el-no">${e.element_no}</div>
          <div class="el-main"><b>${esc(e.element_name)}</b>
            <small>${e.responsible ? '👤 ' + esc(e.responsible) : ''} ${e.due_date ? '· ⏰ ' + esc(e.due_date) : ''} ${e.notes ? '· ' + esc(e.notes) : ''}</small></div>
          <div class="el-stat">${elStatusBadge(e.status)}</div>
          ${canEdit ? `<button class="link editE">✎</button>` : ''}
        </div>`).join('')}</div>`;
    $('#bk', c).onclick = () => go('dashboard', projectId, 'detail');
    $$('.el-row', c).forEach(row => {
      const e = elements.find(x => x.id === row.dataset.id);
      const btn = row.querySelector('.editE');
      if (btn) btn.onclick = () => elementForm(e);
    });
  };

  function elementForm(e) {
    const body = `<form id="ef" class="form-grid">
      <div class="full"><b>${e.element_no}. ${esc(e.element_name)}</b></div>
      ${field(t('status'), 'status', e.status, 'select', { options: ELEMENT_STATUSES.map(s => ({ v: s, l: t('el_' + s) })) })}
      ${field(t('responsible'), 'responsible', e.responsible, 'text')}
      ${field(t('due_date'), 'due_date', e.due_date, 'date')}
      ${field(t('completion_date'), 'completion_date', e.completion_date, 'date')}
      ${field(t('notes'), 'notes', e.notes, 'textarea')}
      <div class="form-actions"><button type="button" class="btn" id="cx">${esc(t('cancel'))}</button><button type="submit" class="btn primary">${esc(t('save'))}</button></div>
    </form>`;
    modal('Element ' + e.element_no, body, (root, close) => {
      $('#cx', root).onclick = close;
      $('#ef', root).onsubmit = async (ev) => {
        ev.preventDefault();
        const data = Object.assign({}, e, readForm(ev.target));
        if (data.status === 'completed' && !data.completion_date) data.completion_date = new Date().toISOString().slice(0, 10);
        await Store.saveElement(data); close(); toast(t('save')); router();
      };
    });
  }

  // ---- PSW ----
  Views.psw = async function (c, projectId) {
    if (!projectId) return pickProject(c, 'psw');
    const p = await Store.getProject(projectId);
    const [trials, psw] = await Promise.all([Store.listTrials(projectId), Store.listPsw(projectId)]);
    const u = Store.currentUser();
    const canEdit = u.role === 'admin' || u.role === 'engineer';
    const latestTrial = trials[trials.length - 1];
    c.innerHTML = `<header class="page-head"><div><button class="link" id="bk">‹ ${esc(p.part_no)}</button><h1>${esc(t('psw_title'))}</h1></div>${canEdit ? `<button class="btn primary" id="genPsw">${esc(t('generate_psw'))}</button>` : ''}</header>
      <div id="pswView">${pswHTML(p, latestTrial)}</div>
      <div class="psw-actions"><button class="btn" id="printPsw">🖨 ${esc(t('print'))}</button></div>
      ${psw.length ? `<section class="card"><h3>${esc(t('psw_revision'))}</h3><ul class="rev-list">${psw.map(r => `<li>Rev ${r.revision} · ${esc(fmtDate(r.created_at))}</li>`).join('')}</ul></section>` : ''}`;
    $('#bk', c).onclick = () => go('dashboard', projectId, 'detail');
    $('#printPsw', c).onclick = () => printNode($('#pswView', c).innerHTML, 'PSW ' + p.part_no);
    if (canEdit) $('#genPsw', c).onclick = async () => {
      await Store.savePsw({ project_id: projectId, data_json: JSON.stringify({ part_no: p.part_no, generated: new Date().toISOString() }) });
      toast(t('save')); router();
    };
  };

  function pswHTML(p, tr) {
    const row = (l, v) => `<tr><td class="k">${esc(l)}</td><td>${esc(v || '—')}</td></tr>`;
    return `<div class="psw-doc">
      <div class="psw-h"><h2>PART SUBMISSION WARRANT (PSW)</h2><span>PPAP Level ${p.ppap_level}</span></div>
      <table class="psw-t">
        ${row(t('part_name'), p.part_name)}
        ${row(t('part_no'), p.part_no)}
        ${row(t('drawing_rev'), p.drawing_rev)}
        ${row(t('customer'), p.customer)}
        ${row(t('model'), p.model)}
        ${row(t('target_date'), fmtDate(p.target_date))}
      </table>
      <h3>Submission Results</h3>
      <table class="psw-t">
        ${row('Dimensional', tr ? (tr.dim_result || '—').toUpperCase() : '—')}
        ${row('Appearance', tr ? (tr.appearance_result || '—').toUpperCase() : '—')}
        ${row('Functional / Material', tr ? (tr.functional_result || '—').toUpperCase() : '—')}
        ${row('Overall Trial', tr ? (tr.overall_result || '—').toUpperCase() : '—')}
      </table>
      <div class="psw-sign"><div>Submitted by: ____________</div><div>Customer approval: ____________</div></div>
    </div>`;
  }

  // ---- FORM BUILDER (scaffold) ----
  Views.formbuilder = async function (c) {
    c.innerHTML = `<header class="page-head"><h1>${esc(t('fb_title'))}</h1></header>
      <div class="card placeholder">
        <div class="ph-ico">🧰</div>
        <p>${esc(t('fb_soon'))}</p>
        <label class="btn ghost">${esc(t('upload_template'))}<input type="file" accept="image/*,application/pdf" hidden id="fbUp"></label>
        <div id="fbCanvas" class="fb-canvas hidden"></div>
      </div>`;
    $('#fbUp', c).onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const cv = $('#fbCanvas', c); cv.classList.remove('hidden');
        cv.innerHTML = `<div class="fb-stage"><img src="${r.result}"><div class="fb-hint">${esc(t('fb_soon'))}</div></div>`;
      };
      r.readAsDataURL(f);
    };
  };

  // ---- SETTINGS ----
  Views.settings = async function (c) {
    const u = Store.currentUser();
    c.innerHTML = `<header class="page-head"><h1>${esc(t('settings_title'))}</h1></header>
      <section class="card">
        <h3>${esc(t('language'))}</h3>
        <div class="seg"><button data-l="th" class="${global.I18N.getLang() === 'th' ? 'on' : ''}">ไทย</button><button data-l="en" class="${global.I18N.getLang() === 'en' ? 'on' : ''}">English</button></div>
      </section>
      <section class="card">
        <h3>${esc(t('api_url'))}</h3>
        <input id="apiUrl" class="wide" placeholder="https://ppap-api.xxx.workers.dev" value="${esc(Store.apiUrl())}">
        <small class="muted">${esc(t('api_hint'))}</small>
        <div class="row"><button class="btn primary" id="saveApi">${esc(t('save'))}</button>${Store.isDemo() ? `<button class="btn" id="reset">${esc(t('reset_demo'))}</button>` : ''}</div>
      </section>
      ${u.role === 'admin' ? `<section class="card"><h3>${esc(t('audit_log'))}</h3><div id="audit" class="audit"></div></section>` : ''}
      <p class="muted center">${esc(t('version'))} 0.1.0 · PPAP Tracking</p>`;
    $$('.seg button', c).forEach(b => b.onclick = () => { global.I18N.setLang(b.dataset.l); });
    $('#saveApi', c).onclick = () => { Store.setApiUrl($('#apiUrl', c).value); toast(t('save')); boot(); };
    const rb = $('#reset', c); if (rb) rb.onclick = () => { if (confirm(t('reset_confirm'))) { Store.resetDemo(); toast(t('save')); router(); } };
    if (u.role === 'admin') {
      const logs = await Store.listAudit();
      $('#audit', c).innerHTML = logs.slice(0, 50).map(l => `<div class="audit-row"><span>${esc(l.timestamp.slice(0, 19).replace('T', ' '))}</span><b>${esc(l.username)}</b><i>${esc(l.action)} ${esc(l.target_table)}</i></div>`).join('') || `<p class="empty">${esc(t('none'))}</p>`;
    }
  };

  // ---- project picker (when a view needs a project but none selected) ----
  async function pickProject(c, target) {
    const projects = await Store.listProjects();
    c.innerHTML = `<header class="page-head"><h1>${esc(t('select_project'))}</h1></header>
      <div class="card-grid">${projects.map(p => `<div class="proj-card" data-id="${p.id}"><div class="pc-top">${riskDot(p.risk)}<b>${esc(p.part_no)}</b>${statusBadge(p.status)}</div><div class="pc-name">${esc(p.part_name)}</div><div class="pc-meta"><span>${esc(p.customer)}</span></div></div>`).join('') || `<p class="empty">${esc(t('no_projects'))}</p>`}</div>`;
    $$('.proj-card', c).forEach(card => card.onclick = () => go(target, card.dataset.id));
  }

  // ============================================================ PRINT
  function printNode(html, title) {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${esc(title)}</title><style>
      body{font-family:Arial,'Sarabun',sans-serif;padding:24px;color:#111}
      .psw-doc{max-width:760px;margin:auto}
      .psw-h{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e40af;padding-bottom:8px;margin-bottom:16px}
      .psw-t{width:100%;border-collapse:collapse;margin:8px 0 20px}
      .psw-t td{border:1px solid #999;padding:8px 12px}.psw-t .k{background:#f1f5f9;width:240px;font-weight:600}
      .psw-sign{display:flex;justify-content:space-between;margin-top:40px}
      h2{color:#1e40af;margin:0}h3{color:#334155}
    </style></head><body>${html}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  }

  // ============================================================ ROUTER
  async function router() {
    const r = parseHash(); state.route = r;
    const c = $('#content'); if (!c) return;
    let view = r.view;
    if (r.view === 'dashboard' && r.projectId && r.sub === 'detail') view = 'detail';
    setActiveNav(r.view === 'dashboard' && r.projectId ? 'dashboard' : r.view);
    const fn = Views[view] || Views.dashboard;
    try { await fn(c, r.projectId); } catch (e) { c.innerHTML = `<p class="empty">⚠ ${esc(e.message)}</p>`; }
    window.scrollTo(0, 0);
  }

  // ============================================================ LOGIN
  function renderLogin() {
    document.body.innerHTML = `<div class="login-wrap"><form class="login-card" id="lf">
      <div class="login-brand"><span class="logo big">PP</span><h1>${esc(t('app_full'))}</h1><p>${esc(t('login_sub'))}</p></div>
      <label class="fld"><span>${esc(t('username'))}</span><input name="username" autocomplete="username" required></label>
      <label class="fld"><span>${esc(t('password'))}</span><input name="password" type="password" autocomplete="current-password" required></label>
      <div class="err" id="err"></div>
      <button class="btn primary block" type="submit">${esc(t('login'))}</button>
      ${Store.isDemo() ? `<div class="demo-accts"><b>${esc(t('demo_accounts'))}</b><span>admin / admin1234</span><span>engineer / eng1234</span><span>viewer / view1234</span></div>` : ''}
      <button type="button" class="lang-link" id="ll">🌐 ${global.I18N.getLang() === 'th' ? 'English' : 'ไทย'}</button>
    </form></div>`;
    $('#ll').onclick = () => global.I18N.toggleLang();
    $('#lf').onsubmit = async (e) => {
      e.preventDefault();
      const f = readForm(e.target);
      try { await Store.signIn(f.username.trim(), f.password); boot(); }
      catch (err) { $('#err').textContent = t('login_failed'); }
    };
  }

  // ============================================================ BOOT
  function boot() {
    if (!Store.isAuthed()) { renderLogin(); return; }
    renderShell();
    router();
  }

  global.onLangChange = function () {
    if (!Store.isAuthed()) renderLogin();
    else { renderShell(); router(); }
  };
  window.addEventListener('hashchange', () => { if (Store.isAuthed()) router(); });

  document.documentElement.lang = global.I18N.getLang();
  boot();
})(window);
