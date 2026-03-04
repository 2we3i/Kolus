// ==UserScript==
// @name         Work Tracker - v1.0 (KOLUS Style)
// @namespace    work.tracker.kast
// @version      1.0
// @description  ⏱️ Трекер скорости работы по проектам | Created by KAST Team
// @match        https://moe2.agentumit.ru/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'work_tracker_v1';

    /******************************************************************
     * ДАННЫЕ
     ******************************************************************/
    function loadDb() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
    }
    let db = loadDb();
    if (!db.projects)  db.projects = {};
    if (!db.activeId)  db.activeId = null;
    if (!db.pos)       db.pos = { x: 20, y: 20 };
    if (!db.scale)     db.scale = 100;
    if (db.collapsed === undefined) db.collapsed = false;
    if (db.statsOpen  === undefined) db.statsOpen = false;
    // Состояние таймера (переживает перезагрузку)
    if (!db.timer) db.timer = { running: false, paused: false, sessionStart: null, sessionSec: 0 };
    const saveDb = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

    function getProject() { return db.activeId ? db.projects[db.activeId] : null; }
    function fmt(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    /******************************************************************
     * HOST + SHADOW DOM
     ******************************************************************/
    const host = document.createElement('div');
    host.id = 'work-tracker-host';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    /******************************************************************
     * CSS
     ******************************************************************/
    const css = `
    @keyframes slideIn { from { transform: translateX(-16px); opacity:0; } to { transform: translateX(0); opacity:1; } }
    @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    @keyframes blink   { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
    * { box-sizing:border-box; margin:0; padding:0; }

    .root {
        position: fixed;
        width: 280px;
        background: linear-gradient(145deg, #1e1b4b 0%, #312e81 100%);
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        z-index: 1000000;
        box-shadow: 0 20px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.1);
        color: #fff;
        overflow: hidden;
        animation: slideIn 0.4s cubic-bezier(0.16,1,0.3,1);
        transform-origin: top left;
        display: flex;
        flex-direction: column;
    }

    /* ── Шапка ── */
    .header {
        background: rgba(0,0,0,.3);
        backdrop-filter: blur(10px);
        padding: 7px 10px;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,.08);
        user-select: none;
        flex-shrink: 0;
    }
    .header-title { display:flex; align-items:center; gap:6px; font-weight:700; font-size:12px; letter-spacing:.3px; }
    .header-icon  { width:16px; height:16px; background:linear-gradient(135deg,#8b5cf6,#ec4899); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:9px; }
    .header-controls { display:flex; gap:4px; align-items:center; }
    .scale-controls { display:flex; align-items:center; gap:3px; }
    .scale-btn { width:18px; height:18px; border-radius:4px; border:none; background:rgba(255,255,255,.1); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; transition:all .2s; }
    .scale-btn:hover { background:rgba(255,255,255,.2); }
    .scale-val { font-size:9px; font-weight:600; color:rgba(255,255,255,.6); min-width:28px; text-align:center; }
    .hdr-btn { width:22px; height:22px; border-radius:4px; background:rgba(255,255,255,.1); border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; font-size:12px; }
    .hdr-btn:hover { background:rgba(255,255,255,.2); transform:scale(1.05); }

    /* ── Свёрнутая строка ── */
    .collapsed-info { padding:6px 10px; display:none; background:rgba(0,0,0,.2); }
    .collapsed-info.visible { display:flex; justify-content:space-between; align-items:center; }
    .col-timer { font-size:13px; font-weight:700; letter-spacing:1.5px; color:#a78bfa; font-variant-numeric:tabular-nums; }
    .col-project { font-size:9px; color:rgba(255,255,255,.4); text-transform:uppercase; letter-spacing:.4px; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    /* ── Тело ── */
    .body { padding:10px; display:flex; flex-direction:column; gap:7px; }

    /* ── Проект ── */
    .field-label { font-size:9px; font-weight:600; color:rgba(255,255,255,.6); text-transform:uppercase; letter-spacing:.4px; margin-bottom:3px; display:flex; align-items:center; gap:4px; }
    .row { display:flex; gap:5px; }
    .project-select {
        flex:1;
        background:rgba(0,0,0,.3);
        border:1px solid rgba(255,255,255,.15);
        border-radius:7px;
        padding:6px 24px 6px 8px;
        color:#fff;
        font-size:11px;
        font-family:inherit;
        outline:none;
        appearance:none;
        cursor:pointer;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%23fff' opacity='.4' d='M4 5L1 2h6z'/%3E%3C/svg%3E");
        background-repeat:no-repeat;
        background-position:right 8px center;
        background-color:rgba(0,0,0,.3);
        transition:border-color .2s;
    }
    .project-select:focus { border-color:rgba(139,92,246,.5); }
    .project-select option { background:#1e1b4b; }
    .icon-btn {
        width:28px; height:28px;
        border-radius:7px;
        background:rgba(139,92,246,.2);
        border:1px solid rgba(139,92,246,.3);
        color:#a78bfa;
        cursor:pointer;
        font-size:14px;
        display:flex; align-items:center; justify-content:center;
        transition:all .2s;
        flex-shrink:0;
    }
    .icon-btn:hover { background:rgba(139,92,246,.35); transform:scale(1.05); }

    /* ── Таймер ── */
    .timer-block {
        background:rgba(0,0,0,.35);
        border:1px solid rgba(255,255,255,.08);
        border-radius:9px;
        padding:8px 10px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
    }
    .timer-left { display:flex; flex-direction:column; gap:2px; }
    .timer-display {
        font-size:20px;
        font-weight:700;
        letter-spacing:2px;
        color:#e8e8e8;
        font-variant-numeric:tabular-nums;
        line-height:1;
        transition:color .3s;
    }
    .timer-display.running { color:#4ade80; }
    .timer-display.paused  { color:#fbbf24; animation:blink 1.2s infinite; }
    .timer-meta { font-size:9px; color:rgba(255,255,255,.3); letter-spacing:.3px; }
    .timer-controls { display:flex; gap:4px; }
    .ctrl-btn {
        width:26px; height:26px;
        border-radius:6px;
        border:none;
        cursor:pointer;
        font-size:11px;
        display:flex; align-items:center; justify-content:center;
        transition:all .2s;
    }
    .ctrl-btn:hover { transform:scale(1.08); }
    .btn-start { background:rgba(74,222,128,.15); color:#4ade80; }
    .btn-start:hover { background:rgba(74,222,128,.28); }
    .btn-pause { background:rgba(251,191,36,.15); color:#fbbf24; }
    .btn-pause:hover { background:rgba(251,191,36,.28); }
    .btn-stop  { background:rgba(248,113,113,.15); color:#f87171; }
    .btn-stop:hover  { background:rgba(248,113,113,.28); }

    /* ── Действия ── */
    .actions-block {
        background:rgba(0,0,0,.25);
        border:1px solid rgba(255,255,255,.08);
        border-radius:8px;
        padding:7px 10px;
        display:flex;
        align-items:center;
        justify-content:space-between;
    }
    .actions-left { display:flex; flex-direction:column; gap:1px; }
    .speed-val { font-size:11px; font-weight:700; color:#a78bfa; }
    .speed-val.good { color:#4ade80; }
    .speed-val.ok   { color:#fbbf24; }
    .speed-label { font-size:8px; color:rgba(255,255,255,.3); }
    .actions-right { display:flex; align-items:center; gap:5px; }
    .act-btn {
        width:22px; height:22px;
        border-radius:5px;
        background:rgba(139,92,246,.15);
        border:1px solid rgba(139,92,246,.25);
        color:#8b5cf6;
        cursor:pointer;
        font-size:14px;
        font-weight:700;
        display:flex; align-items:center; justify-content:center;
        transition:all .2s;
        line-height:1;
        flex-shrink:0;
    }
    .act-btn:hover { background:rgba(139,92,246,.3); color:#a78bfa; }
    .act-input {
        width:44px;
        background:rgba(0,0,0,.3);
        border:1px solid rgba(139,92,246,.25);
        border-radius:6px;
        padding:3px 6px;
        color:#c4b5fd;
        font-size:14px;
        font-weight:700;
        font-family:inherit;
        text-align:center;
        outline:none;
        transition:border-color .2s;
    }
    .act-input:focus { border-color:rgba(139,92,246,.6); }
    /* Скрываем стрелки у number input */
    .act-input::-webkit-outer-spin-button,
    .act-input::-webkit-inner-spin-button { -webkit-appearance:none; }
    .act-input[type=number] { -moz-appearance:textfield; }

    /* ── Прогресс-бар ── */
    .progress-wrap { height:2px; background:rgba(0,0,0,.3); }
    .progress-fill { height:100%; background:linear-gradient(90deg,#8b5cf6,#4ade80); transition:width .5s ease; width:0%; }

    /* ── Статистика ── */
    .stats-panel { display:none; flex-direction:column; border-top:1px solid rgba(255,255,255,.06); }
    .stats-panel.open { display:flex; }
    .stat-row {
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:6px 10px;
        font-size:10px;
        border-bottom:1px solid rgba(255,255,255,.04);
        cursor:pointer;
        transition:background .15s;
    }
    .stat-row:last-child { border-bottom:none; }
    .stat-row:hover { background:rgba(255,255,255,.03); }
    .stat-row.active { background:rgba(139,92,246,.1); }
    .stat-name { color:rgba(255,255,255,.55); display:flex; align-items:center; gap:5px; }
    .stat-name-dot { width:5px; height:5px; border-radius:50%; background:rgba(139,92,246,.4); flex-shrink:0; }
    .stat-row.active .stat-name-dot { background:#8b5cf6; }
    .stat-row.active .stat-name { color:#c4b5fd; }
    .stat-vals { display:flex; gap:8px; align-items:center; }
    .stat-time { color:#a78bfa; font-weight:600; font-variant-numeric:tabular-nums; }
    .stat-speed { font-size:9px; color:rgba(255,255,255,.3); background:rgba(0,0,0,.2); padding:1px 5px; border-radius:3px; }
    .stat-del { width:16px; height:16px; border-radius:4px; border:none; background:transparent; color:rgba(255,255,255,.15); cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
    .stat-del:hover { background:rgba(248,113,113,.2); color:#f87171; }
    .stats-empty { font-size:9px; color:rgba(255,255,255,.2); text-align:center; padding:10px; }

    /* ── Уведомление ── */
    .notification {
        position:fixed; top:16px; right:16px;
        background:linear-gradient(135deg,rgba(139,92,246,.95),rgba(0,0,0,.95));
        border:1px solid rgba(139,92,246,.5);
        border-radius:9px;
        padding:9px 13px;
        color:#fff;
        font-size:11px;
        font-weight:600;
        z-index:1000002;
        box-shadow:0 8px 24px rgba(0,0,0,.5);
        animation:slideIn 0.3s ease-out;
        pointer-events:none;
    }

    /* ── Модалка ── */
    .modal-overlay {
        display:none;
        position:fixed; inset:0;
        background:rgba(0,0,0,.7);
        backdrop-filter:blur(4px);
        align-items:center;
        justify-content:center;
        z-index:1000001;
    }
    .modal-overlay.show { display:flex; }
    .modal {
        background:linear-gradient(145deg,#1e1b4b,#312e81);
        border-radius:12px;
        padding:16px;
        width:220px;
        box-shadow:0 20px 40px rgba(0,0,0,.6);
        border:1px solid rgba(255,255,255,.1);
    }
    .modal-title { font-size:11px; font-weight:700; color:rgba(255,255,255,.7); margin-bottom:10px; text-transform:uppercase; letter-spacing:.5px; }
    .modal-input {
        width:100%;
        background:rgba(0,0,0,.3);
        border:1px solid rgba(255,255,255,.15);
        border-radius:7px;
        padding:8px 10px;
        color:#fff;
        font-size:12px;
        font-family:inherit;
        outline:none;
        margin-bottom:10px;
        transition:border-color .2s;
    }
    .modal-input:focus { border-color:rgba(139,92,246,.5); }
    .modal-btns { display:flex; gap:6px; }
    .modal-btn { flex:1; padding:7px; border-radius:7px; border:none; font-size:11px; font-family:inherit; font-weight:600; cursor:pointer; transition:all .2s; }
    .modal-btn-ok { background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#fff; }
    .modal-btn-ok:hover { transform:translateY(-1px); box-shadow:0 3px 10px rgba(139,92,246,.4); }
    .modal-btn-cancel { background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); }
    .modal-btn-cancel:hover { background:rgba(255,255,255,.15); }
    `;

    /******************************************************************
     * HTML
     ******************************************************************/
    const html = `
    <div class="root" id="mainPanel">

        <div class="progress-wrap"><div class="progress-fill" id="progressFill"></div></div>

        <!-- Шапка -->
        <div class="header" id="dragHandle">
            <div class="header-title">
                <div class="header-icon">⏱</div>
                <span>Tracker v1.0</span>
            </div>
            <div class="header-controls">
                <div class="scale-controls">
                    <button class="scale-btn" id="btnScaleDown">−</button>
                    <span class="scale-val" id="scaleVal">100%</span>
                    <button class="scale-btn" id="btnScaleUp">+</button>
                </div>
                <button class="hdr-btn" id="btnToggleStats" title="Проекты">◈</button>
                <button class="hdr-btn" id="btnMinimize">−</button>
            </div>
        </div>

        <!-- Свёрнутая строка -->
        <div class="collapsed-info" id="collapsedInfo">
            <span class="col-timer" id="colTimer">00:00:00</span>
            <span class="col-project" id="colProject">—</span>
        </div>

        <!-- Тело -->
        <div class="body" id="bodyContent">

            <!-- Проект -->
            <div>
                <div class="field-label">📁 Проект</div>
                <div class="row">
                    <select class="project-select" id="projectSelect"></select>
                    <button class="icon-btn" id="btnAddProject" title="Новый проект">+</button>
                </div>
            </div>

            <!-- Таймер -->
            <div class="timer-block">
                <div class="timer-left">
                    <div class="timer-display" id="timerDisplay">00:00:00</div>
                    <div class="timer-meta" id="timerMeta">итого: 00:00:00</div>
                </div>
                <div class="timer-controls">
                    <button class="ctrl-btn btn-start" id="btnStart" title="Старт">▶</button>
                    <button class="ctrl-btn btn-pause" id="btnPause" title="Пауза">⏸</button>
                    <button class="ctrl-btn btn-stop"  id="btnStop"  title="Стоп">■</button>
                </div>
            </div>

            <!-- Действия -->
            <div class="actions-block">
                <div class="actions-left">
                    <div class="speed-val" id="speedVal">—</div>
                    <div class="speed-label">действий / час</div>
                </div>
                <div class="actions-right">
                    <button class="act-btn" id="btnActMinus">−</button>
                    <input type="number" class="act-input" id="actInput" value="0" min="0" max="9999">
                    <button class="act-btn" id="btnActPlus">+</button>
                </div>
            </div>

        </div>

        <!-- Статистика -->
        <div class="stats-panel" id="statsPanel">
            <div id="statsList"></div>
        </div>

    </div>

    <!-- Модалка добавления -->
    <div class="modal-overlay" id="modalAdd">
        <div class="modal">
            <div class="modal-title">Новый проект</div>
            <input type="text" class="modal-input" id="inputProjectName" placeholder="Название..." maxlength="32">
            <div class="modal-btns">
                <button class="modal-btn modal-btn-cancel" id="btnCancelAdd">Отмена</button>
                <button class="modal-btn modal-btn-ok" id="btnConfirmAdd">Создать</button>
            </div>
        </div>
    </div>
    `;

    shadow.innerHTML = `<style>${css}</style>${html}`;

    /******************************************************************
     * ССЫЛКИ
     ******************************************************************/
    const $ = id => shadow.querySelector('#' + id);
    const ui = {
        main:        $('mainPanel'),
        body:        $('bodyContent'),
        btnMin:      $('btnMinimize'),
        btnScaleUp:  $('btnScaleUp'),
        btnScaleDown:$('btnScaleDown'),
        scaleVal:    $('scaleVal'),
        colTimer:    $('colTimer'),
        colProject:  $('colProject'),
        collapsedInfo:$('collapsedInfo'),
        timerDisplay:$('timerDisplay'),
        timerMeta:   $('timerMeta'),
        progressFill:$('progressFill'),
        projectSelect:$('projectSelect'),
        btnAddProject:$('btnAddProject'),
        btnStart:    $('btnStart'),
        btnPause:    $('btnPause'),
        btnStop:     $('btnStop'),
        speedVal:    $('speedVal'),
        actInput:    $('actInput'),
        btnActPlus:  $('btnActPlus'),
        btnActMinus: $('btnActMinus'),
        btnTogStats: $('btnToggleStats'),
        statsPanel:  $('statsPanel'),
        statsList:   $('statsList'),
        modalAdd:    $('modalAdd'),
        inputName:   $('inputProjectName'),
        btnCancelAdd:$('btnCancelAdd'),
        btnConfirmAdd:$('btnConfirmAdd'),
    };

    /******************************************************************
     * ТАЙМЕР
     ******************************************************************/
    let running = false, paused = false;
    let sessionSec = 0, sessionStart = null, interval = null;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function saveTimerState() {
        db.timer = { running, paused, sessionStart, sessionSec };
        saveDb();
    }

    function tick() {
        if (!running || paused) return;
        sessionSec = Math.floor((Date.now() - sessionStart) / 1000);
        // Сохраняем каждые 10 секунд, чтобы не терять прогресс при перезагрузке
        if (sessionSec % 10 === 0) saveTimerState();
        updateDisplay();
    }

    function startTimer() {
        if (!db.activeId) { showNotif('Выберите проект'); return; }
        if (running && !paused) return;
        if (paused) {
            sessionStart = Date.now() - sessionSec * 1000;
            paused = false;
        } else {
            sessionStart = Date.now();
            sessionSec = 0;
            running = true;
            paused = false;
        }
        clearInterval(interval);
        interval = setInterval(tick, 500);
        saveTimerState();
        updateDisplay();
        showNotif('▶ Запущено');
    }

    function pauseTimer() {
        if (!running || paused) return;
        paused = true;
        clearInterval(interval);
        saveTimerState();
        updateDisplay();
        showNotif('⏸ Пауза');
    }

    function stopTimer() {
        if (!running) return;
        clearInterval(interval);
        const p = getProject();
        if (p && sessionSec > 0) {
            p.totalSecs += sessionSec;
            if (!p.sessions) p.sessions = [];
            p.sessions.push({ date: new Date().toLocaleDateString('ru-RU'), secs: sessionSec });
        }
        running = false; paused = false; sessionSec = 0; sessionStart = null;
        saveTimerState();
        updateDisplay();
        renderStats();
        showNotif('■ Сохранено');
    }

    /******************************************************************
     * ОТОБРАЖЕНИЕ
     ******************************************************************/
    function updateDisplay() {
        const p = getProject();
        const total = p ? p.totalSecs + sessionSec : sessionSec;
        const actions = p ? p.actions : 0;

        ui.timerDisplay.textContent = fmt(sessionSec);
        ui.timerDisplay.className = 'timer-display' + (running && !paused ? ' running' : paused ? ' paused' : '');
        ui.timerMeta.textContent = 'итого: ' + fmt(total);
        ui.colTimer.textContent = fmt(sessionSec);
        ui.colProject.textContent = p ? p.name : '—';

        // Скорость
        if (actions > 0 && total > 0) {
            const perHour = (actions / (total / 3600)).toFixed(1);
            ui.speedVal.textContent = perHour;
            ui.speedVal.className = 'speed-val ' + (parseFloat(perHour) >= 5 ? 'good' : 'ok');
        } else {
            ui.speedVal.textContent = '—';
            ui.speedVal.className = 'speed-val';
        }

        // Прогресс (8ч макс)
        const pct = Math.min(100, (total / (8 * 3600)) * 100);
        ui.progressFill.style.width = pct + '%';

        // Счётчик действий
        ui.actInput.value = actions;
    }

    /******************************************************************
     * ДЕЙСТВИЯ
     ******************************************************************/
    ui.btnActPlus.addEventListener('click', () => {
        const p = getProject();
        if (!p) { showNotif('Выберите проект'); return; }
        p.actions++; saveDb(); updateDisplay(); renderStats();
    });
    ui.btnActMinus.addEventListener('click', () => {
        const p = getProject();
        if (!p || p.actions <= 0) return;
        p.actions--; saveDb(); updateDisplay(); renderStats();
    });
    ui.actInput.addEventListener('change', () => {
        const p = getProject();
        if (!p) return;
        const v = Math.max(0, parseInt(ui.actInput.value) || 0);
        p.actions = v; saveDb(); updateDisplay(); renderStats();
    });
    // Не даём сфокусированному инпуту перехватывать Enter
    ui.actInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { ui.actInput.blur(); }
    });

    /******************************************************************
     * КНОПКИ ТАЙМЕРА
     ******************************************************************/
    ui.btnStart.addEventListener('click', startTimer);
    ui.btnPause.addEventListener('click', pauseTimer);
    ui.btnStop.addEventListener('click',  stopTimer);

    /******************************************************************
     * ПРОЕКТЫ
     ******************************************************************/
    function renderProjects() {
        ui.projectSelect.innerHTML = '';
        const ids = Object.keys(db.projects);
        if (ids.length === 0) {
            const o = document.createElement('option');
            o.value = ''; o.textContent = '— нет проектов —';
            ui.projectSelect.appendChild(o);
            db.activeId = null;
        } else {
            ids.forEach(id => {
                const o = document.createElement('option');
                o.value = id;
                o.textContent = db.projects[id].name;
                if (id === db.activeId) o.selected = true;
                ui.projectSelect.appendChild(o);
            });
            if (!db.activeId || !db.projects[db.activeId]) {
                db.activeId = ids[0];
                ui.projectSelect.value = db.activeId;
            }
        }
        updateDisplay();
    }

    ui.projectSelect.addEventListener('change', () => {
        if (running) stopTimer();
        db.activeId = ui.projectSelect.value || null;
        saveDb(); sessionSec = 0;
        updateDisplay(); renderStats();
    });

    // Добавить проект
    ui.btnAddProject.addEventListener('click', () => {
        ui.inputName.value = '';
        ui.modalAdd.classList.add('show');
        setTimeout(() => ui.inputName.focus(), 50);
    });
    ui.btnCancelAdd.addEventListener('click', () => ui.modalAdd.classList.remove('show'));
    ui.btnConfirmAdd.addEventListener('click', createProject);
    ui.inputName.addEventListener('keydown', e => { if (e.key === 'Enter') createProject(); });
    ui.modalAdd.addEventListener('click', e => { if (e.target === ui.modalAdd) ui.modalAdd.classList.remove('show'); });

    function createProject() {
        const name = ui.inputName.value.trim();
        if (!name) { showNotif('Введите название'); return; }
        const id = 'p' + Date.now();
        db.projects[id] = { name, totalSecs: 0, actions: 0, sessions: [] };
        db.activeId = id;
        saveDb();
        renderProjects();
        renderStats();
        ui.modalAdd.classList.remove('show');
        showNotif('✓ Проект создан: ' + name);
    }

    /******************************************************************
     * СТАТИСТИКА
     ******************************************************************/
    let statsOpen = db.statsOpen || false;
    ui.btnTogStats.addEventListener('click', () => {
        statsOpen = !statsOpen;
        db.statsOpen = statsOpen;
        saveDb();
        ui.statsPanel.classList.toggle('open', statsOpen);
        ui.btnTogStats.style.background = statsOpen ? 'rgba(139,92,246,.4)' : 'rgba(255,255,255,.1)';
        renderStats();
    });

    function renderStats() {
        if (!statsOpen) return;
        const ids = Object.keys(db.projects);
        if (ids.length === 0) {
            ui.statsList.innerHTML = '<div class="stats-empty">нет проектов</div>';
            return;
        }
        ui.statsList.innerHTML = ids.map(id => {
            const p = db.projects[id];
            const total = p.totalSecs + (id === db.activeId && running ? sessionSec : 0);
            const speed = p.actions > 0 && total > 0
                ? (p.actions / (total / 3600)).toFixed(1) + '/ч'
                : '—';
            const isActive = id === db.activeId;
            return `<div class="stat-row ${isActive ? 'active' : ''}" data-id="${id}">
                <span class="stat-name"><span class="stat-name-dot"></span>${p.name}</span>
                <span class="stat-vals">
                    <span class="stat-time">${fmt(total)}</span>
                    <span class="stat-speed">${p.actions}шт · ${speed}</span>
                    <button class="stat-del" data-del="${id}" title="Удалить">✕</button>
                </span>
            </div>`;
        }).join('');

        ui.statsList.querySelectorAll('.stat-row').forEach(row => {
            row.addEventListener('click', e => {
                if (e.target.closest('.stat-del')) return;
                const id = row.dataset.id;
                if (id === db.activeId) return;
                if (running) stopTimer();
                db.activeId = id;
                ui.projectSelect.value = id;
                saveDb(); sessionSec = 0;
                updateDisplay(); renderStats();
            });
        });
        ui.statsList.querySelectorAll('.stat-del').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = btn.dataset.del;
                const p = db.projects[id];
                if (!confirm(`Удалить проект "${p.name}"?`)) return;
                if (id === db.activeId) { if (running) stopTimer(); db.activeId = null; }
                delete db.projects[id];
                saveDb();
                renderProjects();
                renderStats();
                showNotif('Проект удалён');
            });
        });
    }

    /******************************************************************
     * МАСШТАБ
     ******************************************************************/
    function updateScale() {
        ui.main.style.transform = `scale(${db.scale / 100})`;
        ui.scaleVal.textContent = db.scale + '%';
    }
    ui.btnScaleUp.addEventListener('click',   () => { if (db.scale < 150) { db.scale += 5; updateScale(); saveDb(); } });
    ui.btnScaleDown.addEventListener('click', () => { if (db.scale > 60)  { db.scale -= 5; updateScale(); saveDb(); } });

    /******************************************************************
     * МИНИМИЗАЦИЯ
     ******************************************************************/
    ui.btnMin.addEventListener('click', () => {
        db.collapsed = !db.collapsed;
        ui.body.style.display = db.collapsed ? 'none' : 'flex';
        ui.statsPanel.style.display = db.collapsed ? 'none' : '';
        ui.collapsedInfo.classList.toggle('visible', db.collapsed);
        ui.btnMin.textContent = db.collapsed ? '+' : '−';
        saveDb();
    });

    /******************************************************************
     * ПЕРЕТАСКИВАНИЕ
     ******************************************************************/
    let dragging = false, ox, oy;
    shadow.querySelector('#dragHandle').addEventListener('mousedown', e => {
        dragging = true; ox = e.clientX - ui.main.offsetLeft; oy = e.clientY - ui.main.offsetTop;
        ui.main.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        ui.main.style.left = (e.clientX - ox) + 'px';
        ui.main.style.top  = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (dragging) {
            dragging = false; ui.main.style.cursor = '';
            db.pos = { x: parseInt(ui.main.style.left), y: parseInt(ui.main.style.top) };
            saveDb();
        }
    });

    /******************************************************************
     * УВЕДОМЛЕНИЯ
     ******************************************************************/
    function showNotif(msg) {
        const n = document.createElement('div');
        n.className = 'notification';
        n.textContent = msg;
        shadow.appendChild(n);
        setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity .3s'; setTimeout(() => n.remove(), 300); }, 2500);
    }

    /******************************************************************
     * ИНИЦИАЛИЗАЦИЯ — восстановление состояния после перезагрузки
     ******************************************************************/
    ui.main.style.left = db.pos.x + 'px';
    ui.main.style.top  = db.pos.y + 'px';
    if (db.collapsed) {
        ui.body.style.display = 'none';
        ui.collapsedInfo.classList.add('visible');
        ui.btnMin.textContent = '+';
    }
    updateScale();
    renderProjects();

    // Восстановить состояние таймера
    const savedTimer = db.timer;
    if (savedTimer && savedTimer.running) {
        running = true;
        paused  = savedTimer.paused;
        if (paused) {
            // Был на паузе — восстанавливаем накопленные секунды
            sessionSec   = savedTimer.sessionSec || 0;
            sessionStart = Date.now() - sessionSec * 1000;
        } else {
            // Был запущен — считаем сколько прошло с момента сохранения
            sessionStart = savedTimer.sessionStart;
            sessionSec   = Math.floor((Date.now() - sessionStart) / 1000);
        }
        clearInterval(interval);
        if (!paused) interval = setInterval(tick, 500);
        showNotif(paused ? '⏸ Таймер восстановлен (пауза)' : '▶ Таймер продолжает работу');
    }

    // Восстановить статистику
    if (statsOpen) {
        ui.statsPanel.classList.add('open');
        ui.btnTogStats.style.background = 'rgba(139,92,246,.4)';
        renderStats();
    }

    updateDisplay();
    console.log('⏱️ Work Tracker v1.0 готов | Created by KAST Team');
})();
