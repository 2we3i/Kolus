// ==UserScript==
// @name         Копирование абонента - v3.0.0 (KOLUS Style)
// @namespace    subscriber.copy.advanced
// @version      3.0.0
// @description  📋 Копирование абонента с кешем между столбами | Created by KAST Team
// @match        https://moe2.agentumit.ru/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log('📋 Копирование абонента v3.0.0 загружен | Created by KAST Team');

    const CACHE_KEY = 'sub_copy_cache_v3';
    const POS_KEY   = 'sub_copy_pos_v3';

    /******************************************************************
     * КЕШ
     ******************************************************************/
    function saveCache(data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            savedAt: new Date().toLocaleTimeString('ru-RU'),
            savedDate: new Date().toLocaleDateString('ru-RU'),
        }));
    }

    function loadCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
    }

    /******************************************************************
     * УТИЛИТЫ
     ******************************************************************/
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function setReactInput(input, value) {
        if (!input) return false;
        try {
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
                .set.call(input, value);
            input.dispatchEvent(new Event('input',  { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        } catch (e) { return false; }
    }

    async function waitForField(selector, timeout = 6000) {
        const t0 = Date.now();
        let el = document.querySelector(selector);
        while (!el && Date.now() - t0 < timeout) {
            await sleep(150);
            el = document.querySelector(selector);
        }
        return el || null;
    }

    async function fillField(selector, value) {
        if (value === null || value === undefined || value === '') return true;
        const el = await waitForField(selector, 5000);
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(80);
        if ((el.value || '') === value) return true;
        for (let i = 0; i < 5; i++) {
            setReactInput(el, value);
            await sleep(150);
            if ((el.value || '') === value) return true;
        }
        return false;
    }

    async function setToggle(selector, desiredChecked) {
        const el = await waitForField(selector, 3000);
        if (!el) return false;
        const isChecked = el.getAttribute('aria-checked') === 'true' || el.checked;
        if (isChecked !== desiredChecked) {
            ['mousedown', 'mouseup', 'click'].forEach(t =>
                el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
            );
            await sleep(250);
        }
        return true;
    }

    async function setUnnamedToggle(slideEl, labelText, desiredChecked) {
        if (!slideEl) return false;
        for (const lbl of slideEl.querySelectorAll('.smwb-toggle__label')) {
            if (lbl.textContent.trim() === labelText) {
                const cb = lbl.closest('.smwb-toggle__wrapper')?.querySelector('input[type="checkbox"]');
                if (!cb) continue;
                const isChecked = cb.getAttribute('aria-checked') === 'true' || cb.checked;
                if (isChecked !== desiredChecked) {
                    ['mousedown', 'mouseup', 'click'].forEach(t =>
                        cb.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
                    );
                    await sleep(250);
                }
                return true;
            }
        }
        return false;
    }

    async function clickReactSelect(fieldsetSelector, value) {
        if (!value || value.trim() === '') return false;
        const fs = document.querySelector(fieldsetSelector);
        if (!fs) return false;
        const curVal = fs.querySelector('.smwb-select-field__values');
        if (curVal && curVal.textContent.trim() === value) return true;
        const sel = fs.querySelector('.smwb-select-field');
        if (!sel) return false;
        ['mousedown', 'mouseup', 'click'].forEach(t =>
            sel.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
        );
        await sleep(350);
        for (let i = 0; i < 40; i++) {
            const opt = [...document.querySelectorAll('.smwb-menu__item')]
                .find(o => o.textContent.trim() === value);
            if (opt) {
                ['mousedown', 'mouseup', 'click'].forEach(t =>
                    opt.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
                );
                await sleep(200);
                return true;
            }
            await sleep(100);
        }
        return false;
    }

    /******************************************************************
     * КАРУСЕЛЬ АБОНЕНТОВ
     ******************************************************************/
    function getSubscriberCarousel() {
        const countInp = document.querySelector('input[name="subscribers.count"]');
        if (!countInp) return null;
        const card = countInp.closest('.smwb-card');
        if (card) { const c = card.querySelector('.smwb-carousel'); if (c) return c; }
        let el = countInp.parentElement;
        for (let i = 0; i < 8; i++) {
            if (!el) break;
            const c = el.querySelector('.smwb-carousel');
            if (c) return c;
            el = el.parentElement;
        }
        return null;
    }

    async function goToSubscriberSlide(target) {
        const carousel = getSubscriberCarousel();
        if (!carousel) return false;
        const getDots    = () => carousel.querySelectorAll('.smwb-carousel__navigation__dot');
        const getCurrent = () => {
            const dots = getDots();
            for (let i = 0; i < dots.length; i++) if (dots[i].classList.contains('current')) return i;
            return 0;
        };
        for (let attempt = 0; attempt < 8; attempt++) {
            if (getCurrent() === target) return true;
            const diff    = target - getCurrent();
            const nextBtn = carousel.querySelector('.smwb-carousel__arrow_next');
            const prevBtn = carousel.querySelector('.smwb-carousel__arrow_prev');
            const btn     = diff > 0 ? nextBtn : prevBtn;
            if (btn) {
                for (let c = 0; c < Math.abs(diff); c++) {
                    ['mousedown', 'mouseup', 'click'].forEach(t =>
                        btn.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
                    );
                    await sleep(350);
                }
            }
            if (getCurrent() === target) return true;
            const dots = getDots();
            if (target < dots.length) {
                const dot = dots[target].querySelector('button') || dots[target];
                ['mousedown', 'mouseup', 'click'].forEach(t =>
                    dot.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
                );
                await sleep(500);
                if (getCurrent() === target) return true;
            }
            await sleep(300);
        }
        return false;
    }

    function getActiveSubscriberSlide() {
        const carousel = getSubscriberCarousel();
        if (!carousel) return null;
        const slides = carousel.querySelectorAll('.smwb-carousel__slide');
        for (const slide of slides) {
            const layer = slide.closest('.smwb-carousel__layer');
            if (layer) {
                const t = layer.style.transform || '';
                if (t.includes('0%') || t === '') return slide;
            }
        }
        return slides[0] || null;
    }

    async function waitForSubscriberFields(index) {
        for (let r = 0; r < 20; r++) {
            if (document.querySelector(`input[name="subscribers.info[${index}].street"]`)) return true;
            await sleep(300);
        }
        return false;
    }

    /******************************************************************
     * ЧТЕНИЕ
     ******************************************************************/
    function readSubscriberData(index) {
        const i   = index;
        const txt = sel => { const el = document.querySelector(sel); return el ? el.value : ''; };
        const tog = sel => {
            const el = document.querySelector(sel);
            if (!el) return false;
            return el.getAttribute('aria-checked') === 'true' || el.checked;
        };
        const selVal = sel => {
            const el = document.querySelector(sel);
            return el ? el.textContent.trim() : '';
        };

        const slideEl = getActiveSubscriberSlide();
        let subscriberBranch = false;
        if (slideEl) {
            for (const lbl of slideEl.querySelectorAll('.smwb-toggle__label')) {
                if (lbl.textContent.trim() === 'Абонентский отвод') {
                    const cb = lbl.closest('.smwb-toggle__wrapper')?.querySelector('input[type="checkbox"]');
                    if (cb) subscriberBranch = cb.getAttribute('aria-checked') === 'true' || cb.checked;
                    break;
                }
            }
        }

        return {
            type:               txt(`input[name="subscribers.info[${i}].type"]`),
            settlement:         txt(`input[name="subscribers.info[${i}].settlement"]`),
            street:             txt(`input[name="subscribers.info[${i}].street"]`),
            houseNumber:        txt(`input[name="subscribers.info[${i}].houseNumber"]`),
            comment:            txt(`input[name="subscribers.info[${i}].comment"]`),
            phasesType:         txt(`input[name="subscribers.info[${i}].phasesType"]`),
            subscriberBranch,
            withoutHouseNumber: tog(`input[name="subscribers.info[${i}].withoutHouseNumber"]`),
            cableTypeIsCustom:  tog(`input[name="subscribers.info[${i}].cableTypeIsCustom"]`),
            fasteningType:      txt(`input[name="subscribers.info[${i}].fastening.type"]`),
            wireTension:        txt(`input[name="subscribers.info[${i}].wireTension"]`),
            lineSuspensionType: txt(`input[name="subscribers.info[${i}].lineSuspensionType"]`),
            crossingExists:     tog(`input[name="subscribers.info[${i}].crossing.exists"]`),
            crossingType:       txt(`input[name="subscribers.info[${i}].crossing.type"]`),
            crossingObject:     txt(`input[name="subscribers.info[${i}].crossing.object"]`),
            counterExists:      tog(`input[name="subscribers.info[${i}].counter.exists"]`),
            counterNoAccess:    tog(`input[name="subscribers.info[${i}].counter.numberNoAccess"]`),
            counterType:        txt(`input[name="subscribers.info[${i}].counter.type"]`),
            counterNumber:      txt(`input[name="subscribers.info[${i}].counter.number"]`),
            substation: selVal(`fieldset[name="subscribers.info[${i}].substation"] .smwb-select-field__values`),
            fider:      selVal(`fieldset[name="subscribers.info[${i}].fider"] .smwb-select-field__values`),
            cableType:  selVal(`fieldset[name="subscribers.info[${i}].cableType"] .smwb-select-field__values`)
                        || txt(`input[name="subscribers.info[${i}].cableType"]`),
        };
    }

    /******************************************************************
     * ЗАПИСЬ
     ******************************************************************/
    async function writeSubscriberData(index, data) {
        const i = index;
        const slideEl = getActiveSubscriberSlide();

        await setUnnamedToggle(slideEl, 'Абонентский отвод', data.subscriberBranch);
        await sleep(100);
        await setToggle(`input[name="subscribers.info[${i}].withoutHouseNumber"]`, data.withoutHouseNumber);
        await sleep(200);
        await fillField(`input[name="subscribers.info[${i}].type"]`, data.type);
        await sleep(100);
        await fillField(`input[name="subscribers.info[${i}].settlement"]`, data.settlement);
        await sleep(100);
        await fillField(`input[name="subscribers.info[${i}].street"]`, data.street);
        await sleep(100);
        if (!data.withoutHouseNumber && data.houseNumber) {
            await fillField(`input[name="subscribers.info[${i}].houseNumber"]`, data.houseNumber);
            await sleep(100);
        }
        if (data.substation) { await clickReactSelect(`fieldset[name="subscribers.info[${i}].substation"]`, data.substation); await sleep(200); }
        if (data.fider)      { await clickReactSelect(`fieldset[name="subscribers.info[${i}].fider"]`, data.fider);           await sleep(200); }
        await setToggle(`input[name="subscribers.info[${i}].cableTypeIsCustom"]`, data.cableTypeIsCustom);
        await sleep(200);
        if (data.cableType) {
            const ok = await clickReactSelect(`fieldset[name="subscribers.info[${i}].cableType"]`, data.cableType);
            if (!ok) await fillField(`input[name="subscribers.info[${i}].cableType"]`, data.cableType);
            await sleep(200);
        }
        await fillField(`input[name="subscribers.info[${i}].phasesType"]`, data.phasesType);
        await sleep(100);
        await fillField(`input[name="subscribers.info[${i}].fastening.type"]`, data.fasteningType);
        await sleep(100);
        await setToggle(`input[name="subscribers.info[${i}].crossing.exists"]`, data.crossingExists);
        await sleep(200);
        if (data.crossingExists) {
            await fillField(`input[name="subscribers.info[${i}].crossing.type"]`, data.crossingType);
            await sleep(100);
            await fillField(`input[name="subscribers.info[${i}].crossing.object"]`, data.crossingObject);
            await sleep(100);
        }
        await fillField(`input[name="subscribers.info[${i}].lineSuspensionType"]`, data.lineSuspensionType);
        await sleep(100);
        await fillField(`input[name="subscribers.info[${i}].wireTension"]`, data.wireTension);
        await sleep(100);
        await setToggle(`input[name="subscribers.info[${i}].counter.exists"]`, data.counterExists);
        await sleep(200);
        if (data.counterExists) {
            await setToggle(`input[name="subscribers.info[${i}].counter.numberNoAccess"]`, data.counterNoAccess);
            await sleep(150);
            if (!data.counterNoAccess) {
                await fillField(`input[name="subscribers.info[${i}].counter.type"]`, data.counterType);
                await sleep(100);
                await fillField(`input[name="subscribers.info[${i}].counter.number"]`, data.counterNumber);
                await sleep(100);
            }
        }
        await fillField(`input[name="subscribers.info[${i}].comment"]`, data.comment);
        await sleep(100);
    }

    /******************************************************************
     * ВСПОМОГАТЕЛЬНЫЕ
     ******************************************************************/
    function getSubscriberCount() {
        const inp = document.querySelector('input[name="subscribers.count"]');
        return inp ? parseInt(inp.value) || 0 : 0;
    }

    function hasSubscriberForm() {
        return !!document.querySelector('input[name="subscribers.count"]');
    }

    /******************************************************************
     * UI (SHADOW DOM)
     ******************************************************************/
    const host = document.createElement('div');
    host.id = 'sub-copy-host-v3';
    // ВСЕГДА виден — убираем display:none
    host.style.cssText = 'position:fixed;z-index:1000000;top:0;left:0;pointer-events:none;';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const css = `
    @keyframes fadeIn  { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.55; } }
    @keyframes blink   { 0%,100% { opacity:1; } 50% { opacity:.3; } }
    * { box-sizing:border-box; margin:0; padding:0; }

    .root {
        position: fixed;
        width: 316px;
        background: linear-gradient(160deg, #080d1a 0%, #0f172a 100%);
        border-radius: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        box-shadow:
            0 28px 60px rgba(0,0,0,0.75),
            0 0 0 1px rgba(255,255,255,0.07),
            inset 0 1px 0 rgba(255,255,255,0.05);
        color: #e2e8f0;
        overflow: hidden;
        animation: fadeIn 0.35s cubic-bezier(0.16,1,0.3,1);
        pointer-events: all;
    }
    .root.minimized .body { display: none; }

    /* ── Шапка ── */
    .header {
        background: rgba(0,0,0,0.45);
        padding: 10px 12px;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        user-select: none;
        gap: 8px;
    }
    .header-left { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
    .header-icon {
        width:28px; height:28px; flex-shrink:0;
        background: linear-gradient(135deg,#0ea5e9,#06b6d4);
        border-radius:7px;
        display:flex; align-items:center; justify-content:center;
        font-size:14px;
        box-shadow:0 2px 10px rgba(6,182,212,.4);
    }
    .header-text { flex:1; min-width:0; }
    .header-title { font-weight:700; font-size:12px; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .header-sub { font-size:9px; color:rgba(100,116,139,.8); font-weight:500; margin-top:1px; }
    .header-ver {
        font-size:9px; flex-shrink:0;
        background:rgba(6,182,212,.12); border:1px solid rgba(6,182,212,.22);
        color:#22d3ee; border-radius:4px; padding:2px 6px; font-weight:700;
    }
    .header-controls { display:flex; gap:5px; flex-shrink:0; }
    .hbtn {
        width:22px; height:22px; border-radius:50%;
        background:rgba(255,255,255,.07); border:none;
        color:rgba(255,255,255,.45); cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        font-size:12px; transition:all .18s;
    }
    .hbtn:hover { background:rgba(255,255,255,.14); color:#fff; }
    .hbtn.min-btn:hover { background:rgba(234,179,8,.2); color:#fbbf24; }

    /* ── Тело ── */
    .body { padding:12px; display:flex; flex-direction:column; gap:10px; }

    /* ── Кеш-баннер ── */
    .cache-banner {
        background:rgba(6,182,212,.08);
        border:1px solid rgba(6,182,212,.2);
        border-radius:9px;
        padding:9px 11px;
        display:flex;
        flex-direction:column;
        gap:5px;
    }
    .cache-banner.empty {
        background:rgba(30,41,59,.7);
        border-color:rgba(255,255,255,.07);
    }
    .cache-banner.empty .cache-title { color:rgba(100,116,139,.8); }
    .cache-banner.empty .cache-meta  { color:rgba(71,85,105,.7); }
    .cache-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .cache-title { font-size:11px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:5px; }
    .cache-dot {
        width:7px; height:7px; border-radius:50%;
        background:#22d3ee;
        box-shadow:0 0 6px #22d3ee;
        animation:blink 2s infinite;
        flex-shrink:0;
    }
    .cache-dot.off { background:rgba(100,116,139,.4); box-shadow:none; animation:none; }
    .cache-meta { font-size:9px; color:rgba(6,182,212,.7); font-weight:500; }
    .cache-preview {
        display:grid; grid-template-columns:1fr 1fr; gap:3px 8px;
        margin-top:2px;
    }
    .cache-row { font-size:10px; color:rgba(148,163,184,.75); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cache-row b { color:rgba(6,182,212,.8); font-weight:600; }
    .cache-actions { display:flex; gap:5px; margin-top:2px; }
    .cache-clear-btn {
        font-size:9px; font-weight:700; letter-spacing:.3px;
        background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.2);
        color:rgba(239,68,68,.7); border-radius:5px; padding:3px 8px;
        cursor:pointer; transition:all .18s;
    }
    .cache-clear-btn:hover { background:rgba(239,68,68,.2); color:#fca5a5; }

    /* ── Разделитель ── */
    .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent); }

    /* ── Секция (форма открыта) ── */
    .form-section { display:flex; flex-direction:column; gap:10px; }
    .form-section.hidden { display:none; }

    .no-form-note {
        background:rgba(30,41,59,.8);
        border:1px solid rgba(255,255,255,.06);
        border-radius:9px;
        padding:10px 12px;
        font-size:11px;
        color:rgba(100,116,139,.8);
        text-align:center;
        line-height:1.6;
    }
    .no-form-note b { color:rgba(148,163,184,.9); }

    .section-label {
        font-size:9px; font-weight:700; text-transform:uppercase;
        letter-spacing:.7px; color:rgba(100,116,139,.6);
    }

    /* ── Слоты ── */
    .slots-row { display:flex; align-items:center; gap:8px; }
    .slot-box { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
    .slot-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:rgba(100,116,139,.7); }
    .slot-counter {
        display:flex; align-items:center; gap:6px;
        background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.08);
        border-radius:8px; padding:6px 10px; width:100%; justify-content:center;
    }
    .slot-btn {
        width:22px; height:22px; border-radius:5px; border:none;
        background:rgba(6,182,212,.12); color:#22d3ee;
        cursor:pointer; font-size:16px; font-weight:700;
        display:flex; align-items:center; justify-content:center;
        transition:all .18s; flex-shrink:0; line-height:1;
    }
    .slot-btn:hover { background:rgba(6,182,212,.28); transform:scale(1.12); }
    .slot-num { font-size:18px; font-weight:800; color:#38bdf8; min-width:22px; text-align:center; }
    .arrow-zone { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
    .arrow-icon { font-size:20px; color:rgba(6,182,212,.35); }
    .arrow-label { font-size:8px; color:rgba(71,85,105,.6); font-weight:700; letter-spacing:.3px; }

    /* ── Кнопки ── */
    .btns-row { display:flex; gap:6px; }
    .btn {
        flex:1; padding:10px 8px; border:none; border-radius:9px;
        font-size:12px; font-weight:700; cursor:pointer;
        transition:all .2s; display:flex; align-items:center;
        justify-content:center; gap:6px;
        font-family:inherit; letter-spacing:.2px;
    }
    .btn:disabled { opacity:.35; cursor:not-allowed; }
    .btn-copy {
        background:linear-gradient(135deg,#0ea5e9,#06b6d4);
        color:#fff; box-shadow:0 4px 14px rgba(6,182,212,.3);
    }
    .btn-copy:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 6px 20px rgba(6,182,212,.45); }
    .btn-paste {
        background:linear-gradient(135deg,#7c3aed,#8b5cf6);
        color:#fff; box-shadow:0 4px 14px rgba(139,92,246,.3);
    }
    .btn-paste:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 6px 20px rgba(139,92,246,.45); }
    .btn-paste:disabled { background:rgba(30,41,59,.8); box-shadow:none; }

    /* ── Статус ── */
    .status-badge {
        display:flex; align-items:center; justify-content:center; gap:6px;
        padding:7px 12px; border-radius:8px;
        font-size:11px; font-weight:600;
    }
    .status-badge.idle  { background:rgba(15,23,42,.8); color:rgba(100,116,139,.8); border:1px solid rgba(255,255,255,.05); }
    .status-badge.run   { background:rgba(234,179,8,.08); color:#fbbf24; border:1px solid rgba(234,179,8,.18); animation:pulse 1.2s infinite; }
    .status-badge.done  { background:rgba(34,197,94,.08); color:#4ade80; border:1px solid rgba(34,197,94,.18); }
    .status-badge.error { background:rgba(239,68,68,.08); color:#f87171; border:1px solid rgba(239,68,68,.18); }

    /* ── Лог ── */
    .log-box {
        background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.05);
        border-radius:8px; padding:8px 10px;
        max-height:100px; overflow-y:auto;
        display:flex; flex-direction:column; gap:2px;
    }
    .log-box::-webkit-scrollbar { width:3px; }
    .log-box::-webkit-scrollbar-thumb { background:rgba(6,182,212,.3); border-radius:2px; }
    .log-entry { font-size:10px; font-family:'Menlo',monospace; line-height:1.5; }

    .footer-note { font-size:9px; color:rgba(51,65,85,.8); text-align:center; letter-spacing:.2px; }
    `;

    const html = `
    <div class="root" id="mainPanel">

        <div class="header" id="dragHandle">
            <div class="header-left">
                <div class="header-icon">📋</div>
                <div class="header-text">
                    <div class="header-title">Копирование абонента</div>
                    <div class="header-sub">Кеш сохраняется между столбами</div>
                </div>
                <span class="header-ver">v3.0</span>
            </div>
            <div class="header-controls">
                <button class="hbtn min-btn" id="btnMin" title="Свернуть">−</button>
            </div>
        </div>

        <div class="body" id="bodyEl">

            <!-- Кеш-баннер -->
            <div class="cache-banner empty" id="cacheBanner">
                <div class="cache-top">
                    <div class="cache-title">
                        <div class="cache-dot off" id="cacheDot"></div>
                        <span id="cacheTitle">Кеш пуст</span>
                    </div>
                    <div class="cache-meta" id="cacheMeta">—</div>
                </div>
                <div class="cache-preview" id="cachePreview"></div>
                <div class="cache-actions" id="cacheActions" style="display:none;">
                    <button class="cache-clear-btn" id="btnClearCache">🗑 Очистить кеш</button>
                </div>
            </div>

            <div class="divider"></div>

            <!-- Когда форма открыта -->
            <div class="form-section" id="formSection">

                <div>
                    <div class="section-label">Выбор абонента</div>
                    <div class="slots-row" style="margin-top:6px;">
                        <div class="slot-box">
                            <div class="slot-title">📤 Копировать</div>
                            <div class="slot-counter">
                                <button class="slot-btn" id="btnSrcDown">−</button>
                                <div class="slot-num" id="numSrc">1</div>
                                <button class="slot-btn" id="btnSrcUp">+</button>
                            </div>
                        </div>
                        <div class="arrow-zone">
                            <div class="arrow-icon">⇆</div>
                            <div class="arrow-label">СЛОТ</div>
                        </div>
                        <div class="slot-box">
                            <div class="slot-title">📥 Вставить</div>
                            <div class="slot-counter">
                                <button class="slot-btn" id="btnDstDown">−</button>
                                <div class="slot-num" id="numDst">1</div>
                                <button class="slot-btn" id="btnDstUp">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="btns-row">
                    <button class="btn btn-copy" id="btnCopy">
                        <span>📤</span><span>Скопировать</span>
                    </button>
                    <button class="btn btn-paste" id="btnPaste" disabled>
                        <span>📥</span><span>Вставить</span>
                    </button>
                </div>

            </div>

            <!-- Когда форма НЕ открыта -->
            <div class="no-form-note hidden" id="noFormNote">
                Форма абонентов <b>не открыта</b>.<br>
                Откройте столб с абонентами —<br>
                кнопки появятся автоматически.
            </div>

            <div class="status-badge idle" id="statusBadge">⏸ Ожидание</div>

            <div class="log-box" id="logBox">
                <div class="log-entry" style="color:rgba(51,65,85,.8);font-style:italic;">Здесь появятся логи...</div>
            </div>

            <div class="footer-note">KAST Team • ALT+К — показать/скрыть</div>
        </div>
    </div>
    `;

    shadow.innerHTML = `<style>${css}</style>${html}`;

    /******************************************************************
     * ССЫЛКИ
     ******************************************************************/
    const ui = {
        root:         shadow.querySelector('#mainPanel'),
        body:         shadow.querySelector('#bodyEl'),
        btnMin:       shadow.querySelector('#btnMin'),
        cacheBanner:  shadow.querySelector('#cacheBanner'),
        cacheDot:     shadow.querySelector('#cacheDot'),
        cacheTitle:   shadow.querySelector('#cacheTitle'),
        cacheMeta:    shadow.querySelector('#cacheMeta'),
        cachePreview: shadow.querySelector('#cachePreview'),
        cacheActions: shadow.querySelector('#cacheActions'),
        btnClearCache:shadow.querySelector('#btnClearCache'),
        formSection:  shadow.querySelector('#formSection'),
        noFormNote:   shadow.querySelector('#noFormNote'),
        btnSrcUp:     shadow.querySelector('#btnSrcUp'),
        btnSrcDown:   shadow.querySelector('#btnSrcDown'),
        btnDstUp:     shadow.querySelector('#btnDstUp'),
        btnDstDown:   shadow.querySelector('#btnDstDown'),
        numSrc:       shadow.querySelector('#numSrc'),
        numDst:       shadow.querySelector('#numDst'),
        btnCopy:      shadow.querySelector('#btnCopy'),
        btnPaste:     shadow.querySelector('#btnPaste'),
        logBox:       shadow.querySelector('#logBox'),
        status:       shadow.querySelector('#statusBadge'),
    };

    let srcSlot = 1, dstSlot = 1;

    /******************************************************************
     * КЕШ-БАННЕР
     ******************************************************************/
    function updateCacheBanner() {
        const cached = loadCache();
        if (!cached) {
            ui.cacheBanner.className = 'cache-banner empty';
            ui.cacheDot.className    = 'cache-dot off';
            ui.cacheTitle.textContent= 'Кеш пуст';
            ui.cacheMeta.textContent = '—';
            ui.cachePreview.innerHTML= '';
            ui.cacheActions.style.display = 'none';
            ui.btnPaste.disabled = true;
            return;
        }
        const d = cached.data;
        ui.cacheBanner.className = 'cache-banner';
        ui.cacheDot.className    = 'cache-dot';
        ui.cacheTitle.textContent= '✅ Данные в кеше';
        ui.cacheMeta.textContent = `${cached.savedDate} ${cached.savedAt}`;
        ui.cachePreview.innerHTML = `
            <div class="cache-row"><b>Тип:</b> ${d.type || '—'}</div>
            <div class="cache-row"><b>Нас.пункт:</b> ${d.settlement || '—'}</div>
            <div class="cache-row"><b>Улица:</b> ${d.street || '—'}</div>
            <div class="cache-row"><b>Фазы:</b> ${d.phasesType || '—'}</div>
            <div class="cache-row"><b>ТП:</b> ${d.substation || '—'}</div>
            <div class="cache-row"><b>Фидер:</b> ${(d.fider || '—').substring(0,18)}</div>
            <div class="cache-row"><b>Провод:</b> ${d.cableType || '—'}</div>
            <div class="cache-row"><b>ПУ №:</b> ${d.counterNumber || '—'}</div>
        `;
        ui.cacheActions.style.display = 'flex';
        ui.btnPaste.disabled = false;
    }

    ui.btnClearCache.addEventListener('click', () => {
        clearCache();
        updateCacheBanner();
        setStatus('idle', '⏸ Кеш очищен');
        addLog('Кеш очищен', 'warning');
    });

    /******************************************************************
     * ВИДИМОСТЬ СЕКЦИЙ
     ******************************************************************/
    function updateFormVisibility() {
        const has = hasSubscriberForm();
        ui.formSection.classList.toggle('hidden', !has);
        ui.noFormNote.classList.toggle('hidden', has);
    }

    /******************************************************************
     * ЛОГ + СТАТУС
     ******************************************************************/
    function clearLog() { ui.logBox.innerHTML = ''; }
    function addLog(msg, type = 'info') {
        const clr = { success:'#4ade80', warning:'#fbbf24', error:'#f87171', info:'rgba(100,116,139,.8)' };
        const ico = { success:'✅', warning:'⚠️', error:'❌', info:'·' };
        const el = document.createElement('div');
        el.className = 'log-entry';
        el.style.color = clr[type] || clr.info;
        el.textContent = `${ico[type]||'·'} ${msg}`;
        ui.logBox.appendChild(el);
        ui.logBox.scrollTop = ui.logBox.scrollHeight;
    }
    function setStatus(state, text) {
        ui.status.className = `status-badge ${state}`;
        ui.status.textContent = text;
    }

    /******************************************************************
     * СЛОТЫ
     ******************************************************************/
    function clamp(v) { return Math.min(Math.max(1, v), Math.max(1, getSubscriberCount())); }
    function updateSlots() { ui.numSrc.textContent = srcSlot; ui.numDst.textContent = dstSlot; }

    ui.btnSrcUp.addEventListener('click',   () => { srcSlot = clamp(srcSlot + 1); updateSlots(); });
    ui.btnSrcDown.addEventListener('click', () => { srcSlot = clamp(srcSlot - 1); updateSlots(); });
    ui.btnDstUp.addEventListener('click',   () => { dstSlot = clamp(dstSlot + 1); updateSlots(); });
    ui.btnDstDown.addEventListener('click', () => { dstSlot = clamp(dstSlot - 1); updateSlots(); });

    /******************************************************************
     * КНОПКА «СКОПИРОВАТЬ» — читаем и сохраняем в кеш
     ******************************************************************/
    ui.btnCopy.addEventListener('click', async () => {
        const total = getSubscriberCount();
        if (total === 0) {
            setStatus('error', '❌ Форма абонентов не найдена'); return;
        }
        const src = srcSlot - 1;
        if (src >= total) {
            setStatus('error', `❌ Слот ${srcSlot} не существует (всего: ${total})`); return;
        }

        clearLog();
        ui.btnCopy.disabled = true;
        ui.btnCopy.innerHTML = '<span>⏳</span><span>Читаю...</span>';
        setStatus('run', `⏳ Читаю абонента №${srcSlot}...`);

        try {
            addLog(`Переход к слайду ${srcSlot}`, 'info');
            await goToSubscriberSlide(src);
            await waitForSubscriberFields(src);
            await sleep(400);

            const data = readSubscriberData(src);
            saveCache(data);
            updateCacheBanner();

            addLog(`Тип: "${data.type}"`, 'success');
            addLog(`${data.settlement}, ул. "${data.street}"`, 'success');
            addLog(`ТП: "${data.substation}"`, 'success');
            addLog(`Провод: "${data.cableType}", Фазы: "${data.phasesType}"`, 'success');
            addLog(`ПУ: ${data.counterExists ? `"${data.counterType}" №${data.counterNumber}` : 'нет'}`, 'success');
            addLog('💾 Данные сохранены в кеш!', 'warning');

            setStatus('done', `✅ Сохранено в кеш — теперь вставь на любом столбе`);

        } catch (err) {
            setStatus('error', `❌ ${err.message}`);
            addLog(`Ошибка: ${err.message}`, 'error');
        } finally {
            ui.btnCopy.disabled = false;
            ui.btnCopy.innerHTML = '<span>📤</span><span>Скопировать</span>';
        }
    });

    /******************************************************************
     * КНОПКА «ВСТАВИТЬ» — берём из кеша и пишем
     ******************************************************************/
    ui.btnPaste.addEventListener('click', async () => {
        const cached = loadCache();
        if (!cached) {
            setStatus('error', '❌ Кеш пуст — сначала скопируй абонента');
            addLog('Кеш пуст!', 'error'); return;
        }
        const total = getSubscriberCount();
        if (total === 0) {
            setStatus('error', '❌ Форма абонентов не найдена'); return;
        }
        const dst = dstSlot - 1;
        if (dst >= total) {
            setStatus('error', `❌ Слот ${dstSlot} не существует (всего: ${total})`); return;
        }

        clearLog();
        ui.btnPaste.disabled = true;
        ui.btnPaste.innerHTML = '<span>⏳</span><span>Вставляю...</span>';
        setStatus('run', `⏳ Вставляю в абонента №${dstSlot}...`);

        try {
            addLog(`Переход к слайду ${dstSlot}`, 'info');
            await goToSubscriberSlide(dst);
            await waitForSubscriberFields(dst);
            await sleep(500);

            addLog('Записываю данные из кеша...', 'info');
            await writeSubscriberData(dst, cached.data);

            setStatus('done', `✅ Вставлено в абонента №${dstSlot}`);
            addLog('Готово! Фото добавьте вручную.', 'warning');

        } catch (err) {
            setStatus('error', `❌ ${err.message}`);
            addLog(`Ошибка: ${err.message}`, 'error');
        } finally {
            ui.btnPaste.disabled = false;
            ui.btnPaste.innerHTML = '<span>📥</span><span>Вставить</span>';
            updateCacheBanner(); // обновим — кеш остался
        }
    });

    /******************************************************************
     * СВЕРНУТЬ / РАЗВЕРНУТЬ
     ******************************************************************/
    ui.btnMin.addEventListener('click', () => {
        ui.root.classList.toggle('minimized');
        ui.btnMin.textContent = ui.root.classList.contains('minimized') ? '+' : '−';
        savePosAndState();
    });

    /******************************************************************
     * ПЕРЕТАСКИВАНИЕ
     ******************************************************************/
    function savePosAndState() {
        localStorage.setItem(POS_KEY, JSON.stringify({
            x:         parseInt(ui.root.style.left) || 80,
            y:         parseInt(ui.root.style.top)  || 80,
            minimized: ui.root.classList.contains('minimized'),
        }));
    }

    const savedState = JSON.parse(localStorage.getItem(POS_KEY) || '{"x":80,"y":80,"minimized":false}');
    ui.root.style.left = savedState.x + 'px';
    ui.root.style.top  = savedState.y + 'px';
    if (savedState.minimized) {
        ui.root.classList.add('minimized');
        ui.btnMin.textContent = '+';
    }

    let dragging = false, ox = 0, oy = 0;
    shadow.querySelector('#dragHandle').addEventListener('mousedown', e => {
        dragging = true;
        ox = e.clientX - ui.root.offsetLeft;
        oy = e.clientY - ui.root.offsetTop;
        ui.root.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        ui.root.style.left = (e.clientX - ox) + 'px';
        ui.root.style.top  = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false; ui.root.style.cursor = '';
        savePosAndState();
    });

    /******************************************************************
     * ВСЕГДА ВИДЕН — только ALT+К скрывает/показывает
     ******************************************************************/
    window.subCopyHidden = false;
    document.addEventListener('keydown', e => {
        if (e.altKey && (e.key === 'к' || e.key === 'К' || e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            window.subCopyHidden = !window.subCopyHidden;
            host.style.display = window.subCopyHidden ? 'none' : '';
        }
    });

    /******************************************************************
     * АВТО-ОБНОВЛЕНИЕ ПРИ ИЗМЕНЕНИИ DOM
     ******************************************************************/
    new MutationObserver(() => {
        updateFormVisibility();
    }).observe(document.body, { childList: true, subtree: true });

    /******************************************************************
     * ИНИЦИАЛИЗАЦИЯ
     ******************************************************************/
    updateCacheBanner();
    updateFormVisibility();
    updateSlots();

    console.log('✅ SubCopy v3.0.0 готов | ALT+К — скрыть/показать');
})();
