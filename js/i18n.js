/* =========================================================================
 * i18n.js — Thai / English language layer
 * TH = Thai labels mixed with English PPAP technical terms (ทับศัพท์)
 * EN = full English
 * ========================================================================= */
(function (global) {
  'use strict';

  const DICT = {
    // ---- generic / app ----
    app_name:        { th: 'PPAP Tracking', en: 'PPAP Tracking' },
    app_full:        { th: 'ระบบติดตามงาน PPAP', en: 'PPAP Project Tracking System' },
    loading:         { th: 'กำลังโหลด…', en: 'Loading…' },
    save:            { th: 'บันทึก', en: 'Save' },
    cancel:          { th: 'ยกเลิก', en: 'Cancel' },
    delete:          { th: 'ลบ', en: 'Delete' },
    edit:            { th: 'แก้ไข', en: 'Edit' },
    add:             { th: 'เพิ่ม', en: 'Add' },
    close:           { th: 'ปิด', en: 'Close' },
    confirm:         { th: 'ยืนยัน', en: 'Confirm' },
    search:          { th: 'ค้นหา', en: 'Search' },
    all:             { th: 'ทั้งหมด', en: 'All' },
    none:            { th: 'ไม่มี', en: 'None' },
    yes:             { th: 'ใช่', en: 'Yes' },
    no:              { th: 'ไม่', en: 'No' },
    back:            { th: 'กลับ', en: 'Back' },
    actions:         { th: 'จัดการ', en: 'Actions' },
    required:        { th: 'จำเป็น', en: 'required' },
    optional:        { th: 'ไม่บังคับ', en: 'optional' },
    demo_mode:       { th: 'โหมด Demo (ข้อมูลเก็บในเครื่อง)', en: 'Demo mode (local data)' },
    online_mode:     { th: 'เชื่อมต่อ Server', en: 'Connected to server' },

    // ---- auth ----
    login:           { th: 'เข้าสู่ระบบ', en: 'Sign in' },
    logout:          { th: 'ออกจากระบบ', en: 'Sign out' },
    username:        { th: 'Username', en: 'Username' },
    password:        { th: 'รหัสผ่าน', en: 'Password' },
    login_sub:       { th: 'เข้าสู่ระบบเพื่อจัดการงาน PPAP', en: 'Sign in to manage PPAP projects' },
    login_failed:    { th: 'Username หรือรหัสผ่านไม่ถูกต้อง', en: 'Invalid username or password' },
    role:            { th: 'สิทธิ์', en: 'Role' },
    role_admin:      { th: 'Admin', en: 'Admin' },
    role_engineer:   { th: 'Engineer', en: 'Engineer' },
    role_viewer:     { th: 'Viewer', en: 'Viewer' },
    demo_accounts:   { th: 'บัญชีทดลอง', en: 'Demo accounts' },

    // ---- nav ----
    nav_dashboard:   { th: 'Dashboard', en: 'Dashboard' },
    nav_projects:    { th: 'Projects', en: 'Projects' },
    nav_trials:      { th: 'Trials', en: 'Trials' },
    nav_documents:   { th: 'Documents', en: 'Documents' },
    nav_psw:         { th: 'PSW', en: 'PSW' },
    nav_formbuilder: { th: 'Form Builder', en: 'Form Builder' },
    nav_settings:    { th: 'ตั้งค่า', en: 'Settings' },

    // ---- projects ----
    projects_title:  { th: 'รายการ Project PPAP', en: 'PPAP Projects' },
    new_project:     { th: 'สร้าง Project ใหม่', en: 'New Project' },
    part_no:         { th: 'Part No', en: 'Part No' },
    part_name:       { th: 'ชื่อชิ้นงาน (Part Name)', en: 'Part Name' },
    customer:        { th: 'ลูกค้า (TIER 1)', en: 'Customer (TIER 1)' },
    model:           { th: 'Model', en: 'Model' },
    drawing_rev:     { th: 'Drawing Rev', en: 'Drawing Rev' },
    ppap_level:      { th: 'PPAP Level', en: 'PPAP Level' },
    target_date:     { th: 'วันที่ต้องส่ง (Target)', en: 'Target submission date' },
    engineer:        { th: 'วิศวกรผู้รับผิดชอบ', en: 'Responsible Engineer' },
    status:          { th: 'สถานะ', en: 'Status' },
    confidential:    { th: 'ความลับ (CONFIDENTIAL)', en: 'Confidential' },
    progress:        { th: 'ความคืบหน้า', en: 'Progress' },
    days_left:       { th: 'เหลือ (วัน)', en: 'Days left' },
    overdue:         { th: 'เลยกำหนด', en: 'Overdue' },
    no_projects:     { th: 'ยังไม่มี Project — กดสร้างใหม่', en: 'No projects yet — create one' },
    filter_status:   { th: 'กรองตามสถานะ', en: 'Filter by status' },
    filter_customer: { th: 'กรองตามลูกค้า', en: 'Filter by customer' },

    // project statuses
    st_planning:     { th: 'Planning', en: 'Planning' },
    st_trial:        { th: 'Trial', en: 'Trial' },
    st_documentation:{ th: 'Documentation', en: 'Documentation' },
    st_submission:   { th: 'Submission', en: 'Submission' },
    st_approved:     { th: 'Approved', en: 'Approved' },
    st_rejected:     { th: 'Rejected', en: 'Rejected' },

    // ---- trials ----
    trials_title:    { th: 'Trial Tracking', en: 'Trial Tracking' },
    new_trial:       { th: 'เพิ่ม Trial', en: 'Add Trial' },
    trial_no:        { th: 'Trial No', en: 'Trial No' },
    trial_date:      { th: 'วันที่ Trial', en: 'Trial date' },
    qty:             { th: 'จำนวนผลิต (Qty)', en: 'Quantity' },
    dim_result:      { th: 'Dimension Check', en: 'Dimension Check' },
    appearance_result:{ th: 'Appearance Check', en: 'Appearance Check' },
    functional_result:{ th: 'Functional Check', en: 'Functional Check' },
    issues:          { th: 'ปัญหาที่พบ (Issues)', en: 'Issues found' },
    corrective_action:{ th: 'การแก้ไข (Corrective Action)', en: 'Corrective action' },
    overall_result:  { th: 'ผลรวม Trial', en: 'Overall result' },
    next_action:     { th: 'งานถัดไป (Next action)', en: 'Next action' },
    next_trial_date: { th: 'วัน Trial ถัดไป', en: 'Next trial date' },
    photos:          { th: 'รูปถ่าย', en: 'Photos' },
    add_photo:       { th: 'ถ่าย / แนบรูป', en: 'Capture / attach photo' },
    no_trials:       { th: 'ยังไม่มี Trial', en: 'No trials yet' },
    result_pass:     { th: 'Pass', en: 'Pass' },
    result_fail:     { th: 'Fail', en: 'Fail' },
    result_conditional:{ th: 'Conditional Pass', en: 'Conditional Pass' },
    notes:           { th: 'หมายเหตุ', en: 'Notes' },

    // ---- ppap elements ----
    documents_title: { th: 'PPAP 18 Elements', en: 'PPAP 18 Elements' },
    element_no:      { th: 'ลำดับ', en: 'No' },
    element_name:    { th: 'Element', en: 'Element' },
    responsible:     { th: 'ผู้รับผิดชอบ', en: 'Responsible' },
    due_date:        { th: 'กำหนดส่ง', en: 'Due date' },
    completion_date: { th: 'วันที่เสร็จ', en: 'Completion date' },
    attachment:      { th: 'ไฟล์แนบ', en: 'Attachment' },
    readiness:       { th: 'ความพร้อมเอกสาร', en: 'Document readiness' },

    // element statuses
    el_not_started:  { th: 'Not Started', en: 'Not Started' },
    el_in_progress:  { th: 'In Progress', en: 'In Progress' },
    el_completed:    { th: 'Completed', en: 'Completed' },
    el_waived:       { th: 'Waived', en: 'Waived' },
    el_rejected:     { th: 'Rejected', en: 'Rejected' },

    // ---- dashboard ----
    dash_title:      { th: 'ภาพรวม Project', en: 'Project Dashboard' },
    overview:        { th: 'ภาพรวมทั้งหมด', en: 'Overview' },
    trial_summary:   { th: 'สรุปผล Trial', en: 'Trial Summary' },
    risk:            { th: 'ความเสี่ยง', en: 'Risk' },
    risk_green:      { th: 'ปกติ', en: 'On track' },
    risk_yellow:     { th: 'เฝ้าระวัง', en: 'Watch' },
    risk_red:        { th: 'เสี่ยงสูง', en: 'At risk' },
    active_projects: { th: 'Project ที่กำลังทำ', en: 'Active projects' },
    countdown:       { th: 'นับถอยหลังถึงกำหนดส่ง', en: 'Countdown to deadline' },

    // ---- psw ----
    psw_title:       { th: 'PSW — Part Submission Warrant', en: 'PSW — Part Submission Warrant' },
    generate_psw:    { th: 'สร้าง PSW', en: 'Generate PSW' },
    psw_revision:    { th: 'Revision', en: 'Revision' },
    print:           { th: 'พิมพ์ / Export', en: 'Print / Export' },
    cpk:             { th: 'Cpk', en: 'Cpk' },
    select_project:  { th: 'เลือก Project', en: 'Select a project' },

    // ---- form builder ----
    fb_title:        { th: 'Form Builder (สร้างฟอร์มเอง)', en: 'Custom Form Builder' },
    fb_soon:         { th: 'โมดูลนี้กำลังพัฒนา — อัปโหลดฟอร์ม แล้ววาดกล่องเพื่อจับ field', en: 'Coming soon — upload a form and draw zones to map fields' },
    upload_template: { th: 'อัปโหลดเทมเพลตฟอร์ม', en: 'Upload form template' },

    // ---- settings ----
    settings_title:  { th: 'ตั้งค่าระบบ', en: 'Settings' },
    language:        { th: 'ภาษา', en: 'Language' },
    api_url:         { th: 'API URL (Cloudflare Worker)', en: 'API URL (Cloudflare Worker)' },
    api_hint:        { th: 'เว้นว่างไว้ = ใช้โหมด Demo (เก็บข้อมูลในเครื่อง)', en: 'Leave blank = Demo mode (local storage)' },
    reset_demo:      { th: 'รีเซ็ตข้อมูล Demo', en: 'Reset demo data' },
    reset_confirm:   { th: 'ลบข้อมูล Demo ทั้งหมดและโหลดข้อมูลตัวอย่างใหม่?', en: 'Erase all demo data and reload sample data?' },
    audit_log:       { th: 'Audit Log', en: 'Audit Log' },
    version:         { th: 'เวอร์ชัน', en: 'Version' },
  };

  const PPAP_ELEMENTS = [
    'Design Records',
    'Engineering Change Documents',
    'Customer Engineering Approval',
    'Design FMEA',
    'Process Flow Diagrams',
    'Process FMEA',
    'Control Plan',
    'Measurement System Analysis (MSA)',
    'Dimensional Results',
    'Material / Performance Test Results',
    'Initial Process Study (Cpk)',
    'Qualified Laboratory Documentation',
    'Appearance Approval Report (AAR)',
    'Sample Production Parts',
    'Master Sample',
    'Checking Aids',
    'Customer-Specific Requirements',
    'Part Submission Warrant (PSW)',
  ];

  let lang = localStorage.getItem('ppap_lang') || 'th';

  function t(key) {
    const e = DICT[key];
    if (!e) return key;
    return e[lang] || e.en || key;
  }
  function getLang() { return lang; }
  function setLang(l) {
    lang = (l === 'en') ? 'en' : 'th';
    try { localStorage.setItem('ppap_lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    if (typeof global.onLangChange === 'function') global.onLangChange();
  }
  function toggleLang() { setLang(lang === 'th' ? 'en' : 'th'); }

  global.I18N = { t, getLang, setLang, toggleLang, PPAP_ELEMENTS, DICT };
})(window);
