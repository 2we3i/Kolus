// ==UserScript==
// @name         KOLUS - Умный помощник заполнения форм
// @namespace    kolus.ultimate
// @version      1.6.3
// @description  Интеллектуальный помощник заполнения форм с автодополнением, умным сканированием и заметками | Created by KAST Team
// @match        https://moe2.agentumit.ru/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 KOLUS v1.6.3 загружен | Created by KAST Team');

    const STORAGE_KEY = 'kolus_ultimate_v1';

    const WIRE_DATABASE = [
        'СИП 2х16', 'СИП 4х16', 'СИП 4х25', 'СИП 4х35', 'СИП 4х50', 'СИП 4х70', 'СИП 4х95', 'СИП 4х120', 'СИП 4х150',
        'СИП 3х25', 'СИП 3х35', 'СИП 3х50', 'СИП 3х70', 'СИП 3х95', 'СИП 3х120',
        'А-16', 'А-25', 'А-35', 'А-50', 'А-70', 'А-95', 'А-120', 'А-150', 'А-185', 'А-240',
        'А 16', 'А 25', 'А 35', 'А 50', 'А 70', 'А 95', 'А 120', 'А 150', 'А 185', 'А 240',
        'АС-16/2.7', 'АС-25/4.2', 'АС-35/6.2', 'АС-50/8', 'АС-70/11', 'АС-95/16', 'АС-120/19', 'АС-150/24', 'АС-185/29', 'АС-240/32',
        'АВВГ 2х2.5', 'АВВГ 2х4', 'АВВГ 2х6', 'АВВГ 2х10', 'АВВГ 2х16', 'АВВГ 2х25', 'АВВГ 2х35',
        'АВВГ 3х2.5', 'АВВГ 3х4', 'АВВГ 3х6', 'АВВГ 3х10', 'АВВГ 3х16', 'АВВГ 3х25', 'АВВГ 3х35',
        'АВВГ 4х2.5', 'АВВГ 4х4', 'АВВГ 4х6', 'АВВГ 4х10', 'АВВГ 4х16', 'АВВГ 4х25', 'АВВГ 4х35', 'АВВГ 4х50', 'АВВГ 4х70',
        'АВВГ 5х2.5', 'АВВГ 5х4', 'АВВГ 5х6', 'АВВГ 5х10', 'АВВГ 5х16', 'АВВГ 5х25',
        'ВВГ 2х1.5', 'ВВГ 2х2.5', 'ВВГ 2х4', 'ВВГ 2х6', 'ВВГ 2х10', 'ВВГ 2х16', 'ВВГ 2х25',
        'ВВГ 3х1.5', 'ВВГ 3х2.5', 'ВВГ 3х4', 'ВВГ 3х6', 'ВВГ 3х10', 'ВВГ 3х16', 'ВВГ 3х25', 'ВВГ 3х35',
        'ВВГ 4х1.5', 'ВВГ 4х2.5', 'ВВГ 4х6', 'ВВГ 4х10', 'ВВГ 4х16', 'ВВГ 4х25', 'ВВГ 4х35', 'ВВГ 4х50',
        'ВВГ 5х1.5', 'ВВГ 5х2.5', 'ВВГ 5х4', 'ВВГ 5х6', 'ВВГ 5х10', 'ВВГ 5х16', 'ВВГ 5х25',
        'ПУГВ 1х1.5', 'ПУГВ 1х2.5', 'ПУГВ 1х4', 'ПУГВ 1х6', 'ПУГВ 1х10', 'ПУГВ 1х16', 'ПУГВ 1х25', 'ПУГВ 1х35', 'ПУГВ 1х50', 'ПУГВ 1х70', 'ПУГВ 1х95', 'ПУГВ 1х120',
        'ПВ-1 1.5', 'ПВ-1 2.5', 'ПВ-1 4', 'ПВ-1 6', 'ПВ-1 10', 'ПВ-1 16', 'ПВ-1 25', 'ПВ-1 35', 'ПВ-1 50',
        'ПВ-3 1.5', 'ПВ-3 2.5', 'ПВ-3 4', 'ПВ-3 6', 'ПВ-3 10', 'ПВ-3 16', 'ПВ-3 25', 'ПВ-3 35',
        'АПВ 2.5', 'АПВ 4', 'АПВ 6', 'АПВ 10', 'АПВ 16', 'АПВ 25', 'АПВ 35', 'АПВ 50', 'АПВ 70', 'АПВ 95', 'АПВ 120',
        'ПВС 2х0.75', 'ПВС 2х1.5', 'ПВС 2х2.5', 'ПВС 3х0.75', 'ПВС 3х1.5', 'ПВС 3х2.5', 'ПВС 4х1.5', 'ПВС 4х2.5',
        'NYM 2х1.5', 'NYM 2х2.5', 'NYM 3х1.5', 'NYM 3х2.5', 'NYM 4х1.5', 'NYM 5х1.5',
        'КВВГ 4х1.5', 'КВВГ 4х2.5', 'КВВГ 7х1.5', 'КВВГ 14х1.5', 'КВВГ 19х1.5',
        'КГ 3х2.5', 'КГ 3х4', 'КГ 3х6', 'КГ 3х10', 'КГ 3х16', 'КГ 3х25'
    ];

    const defaultData = {
        wireLength: '',
        clearance: '5.0',
        fastening: 'Натяжное',
        crossingObject: 'Дерево',
        couplingCount: '0',
        notes: '',
        presets: [
            { id: 'p1', name: '⚡ СИП Натяжка',  wireBrand: 'СИП 4х50', roadType: 'Асфальтовая', construction: 'ВЛ', terrain: 'населенная местность', designation: 'магистраль' },
            { id: 'p2', name: '🔧 СИП Поддержка', wireBrand: 'СИП 4х50', roadType: 'Асфальтовая', construction: 'ВЛ', terrain: 'населенная местность', designation: 'магистраль' },
            { id: 'p3', name: '🏙️ Город',         wireBrand: 'СИП 4х25', roadType: 'Асфальтовая', construction: 'ВЛ', terrain: 'населенная местность', designation: 'магистраль' }
        ],
        activeId: 'p1',
        isCrossingEnabled: true,
        pos: { x: 20, y: 20 },
        isCollapsed: false,
        isVisible: true,
        scale: 100,
        compactMode: false
    };

    let db = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData;

    // Миграция старых данных
    if (!db.wireLength && db.wireLength !== '') db.wireLength = '';
    if (!db.fastening) db.fastening = 'Натяжное';
    if (!db.crossingObject) {
        const firstPreset = db.presets && db.presets[0];
        db.crossingObject = (firstPreset && firstPreset.crossingObject) || 'Дерево';
    }
    if (db.clearance === undefined) db.clearance = '5.0';
    if (db.couplingCount === undefined) db.couplingCount = '0';
    if (db.notes === undefined) db.notes = '';
    if (db.presets && db.presets.length > 0) {
        db.presets = db.presets.map(p => {
            if (Array.isArray(p.fastenings)) delete p.fastenings;
            delete p.fastening; delete p.wireLength; delete p.clearance;
            delete p.crossingType; delete p.crossingObject;
            return p;
        });
    }
    if (db.scale === undefined) db.scale = 100;
    if (db.isVisible === undefined) db.isVisible = true;
    if (db.compactMode === undefined) db.compactMode = false;

    const saveDb = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    const getActive = () => db.presets.find(p => p.id === db.activeId) || db.presets[0];

    /******************************************************************
     * 📡 ПЕРЕХВАТ КЛИКОВ ПО ПРОВОДУ — АВТОЗАПОЛНЕНИЕ ДЛИНЫ
     ******************************************************************/
    var lastClickTime = 0;
    var CLICK_WINDOW_MS = 1000;

    document.addEventListener('click', function () {
        lastClickTime = Date.now();
    }, true);

    function calcLengthFromCoords(locations) {
        if (!Array.isArray(locations) || locations.length < 2) return null;
        var toRad = function(d) { return d * Math.PI / 180; };
        var total = 0;
        for (var i = 0; i < locations.length - 1; i++) {
            var lat1 = locations[i].latitude,   lon1 = locations[i].longitude;
            var lat2 = locations[i+1].latitude, lon2 = locations[i+1].longitude;
            if (lat1 == null || lat2 == null) return null;
            var dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
            var a = Math.sin(dLat/2) * Math.sin(dLat/2)
                + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
                * Math.sin(dLon/2) * Math.sin(dLon/2);
            total += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        return total.toFixed(2);
    }

    window.kolusSetWireLength = null;

    function applyWireLength(lengthStr) {
        db.wireLength = lengthStr;
        saveDb();
        if (typeof window.kolusSetWireLength === 'function') {
            window.kolusSetWireLength(lengthStr);
        }
        console.log('[KOLUS] 📏 Длина из клика: ' + lengthStr + ' м');
    }

    function handleClickJson(data, url) {
        if (!data || typeof data !== 'object') return;
        if (Array.isArray(data)) {
            data.forEach(function(item) { handleClickJson(item, url); });
            return;
        }
        if (data.subtype !== 'create-line') return;
        var len = calcLengthFromCoords(data.location);
        if (len !== null) applyWireLength(len);
    }

    var OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        var xhr = new OrigXHR();
        var _url = '';
        var _clickTime = 0;
        var origOpen = xhr.open.bind(xhr);
        xhr.open = function(method, url) {
            _url = url;
            return origOpen.apply(this, arguments);
        };
        var origSend = xhr.send.bind(xhr);
        xhr.send = function() {
            _clickTime = lastClickTime;
            return origSend.apply(this, arguments);
        };
        xhr.addEventListener('load', function() {
            if (_clickTime === 0 || (Date.now() - _clickTime) > CLICK_WINDOW_MS) return;
            try {
                var ct = xhr.getResponseHeader('content-type') || '';
                if (ct.indexOf('application/json') === -1) return;
                var data = JSON.parse(xhr.responseText);
                handleClickJson(data, _url);
            } catch(e) {}
        });
        return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    var _fetch = window.fetch;
    window.fetch = function() {
        var args = Array.prototype.slice.call(arguments);
        var url = (typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '') || '';
        var clickTime = lastClickTime;
        var promise = _fetch.apply(this, args);
        promise.then(function(response) {
            if (clickTime === 0 || (Date.now() - clickTime) > CLICK_WINDOW_MS) return;
            var ct = response.headers.get('content-type') || '';
            if (ct.indexOf('application/json') === -1) return;
            response.clone().json().then(function(data) { handleClickJson(data, url); }).catch(function(){});
        }).catch(function(){});
        return promise;
    };

    console.log('[KOLUS] 📡 Перехватчик кликов по проводу активен ✅');

    /******************************************************************
     * ПРОВЕРКА ТИПА ФОРМЫ
     ******************************************************************/
    function isWireForm() {
        return !!(
            document.querySelector('fieldset[name="cableType"]') ||
            document.querySelector('input[name="cableType"]') ||
            document.querySelector('input[name="wireTension"]') ||
            document.querySelector('input[name="phaseCount"]') ||
            document.querySelector('input[name="designation"]')
        );
    }

    function checkFormTypeAndInitialize() {
        if (window.kolusUIInitialized) return true;
        if (!isWireForm()) {
            console.log('⚠️ KOLUS: Форма столба обнаружена, скрипт не активирован');
            return false;
        }
        console.log('✅ KOLUS: Форма провода обнаружена, инициализация...');
        return true;
    }

    /******************************************************************
     * УТИЛИТЫ
     ******************************************************************/
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function findSimilarWires(input) {
        if (!input || input.length < 1) return [];
        const normalized = input.toLowerCase().trim();
        return WIRE_DATABASE.filter(wire => wire.toLowerCase().includes(normalized)).slice(0, 5);
    }

    function wireMatches(wire1, wire2) {
        if (!wire1 || !wire2) return false;
        const n1 = wire1.toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
        const n2 = wire2.toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
        if (wire1 == '') { return true; }
        return n1 === n2;
    }

    function isWireTypeA(wireBrand) {
        if (!wireBrand) return false;
        const n = wireBrand.trim().toUpperCase();
        return (/^А[\s-]\d+/.test(n) || /^A[\s-]\d+/.test(n)) &&
               !n.startsWith('АС') && !n.startsWith('AC') &&
               !n.startsWith('АВ') && !n.startsWith('AB') &&
               !n.startsWith('АП') && !n.startsWith('AP');
    }

    function isWireTypeAC(wireBrand) {
        if (!wireBrand) return false;
        const n = wireBrand.trim().toUpperCase();
        return n.startsWith('АС') || n.startsWith('AC');
    }

    function isWireTypeAorAC(wireBrand) {
        return isWireTypeA(wireBrand) || isWireTypeAC(wireBrand);
    }

    function isSIP2x16(wireBrand) {
        if (!wireBrand) return false;
        const normalized = wireBrand.trim().toUpperCase().replace(/\s+/g, '').replace(/[-_]/g, '');
        return normalized === 'СИП2Х16' || normalized === 'СИП2X16';
    }

    /******************************************************************
     * РАБОТА С САЙТОМ
     ******************************************************************/
    function setReactInputValue(input, value) {
        if (!input) return false;
        try {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        } catch(e) {
            console.warn('Ошибка установки значения:', e);
            return false;
        }
    }

    async function waitForInput(selector, timeout = 5000) {
        const start = Date.now();
        let input = document.querySelector(selector);
        while (!input && Date.now() - start < timeout) {
            await sleep(200);
            input = document.querySelector(selector);
        }
        return input;
    }

    async function selectWireBrandReact(value) {
        const select = document.querySelector('fieldset[name="cableType"] .smwb-select-field');
        if (!select) {
            console.warn('Селект марки провода не найден');
            return false;
        }
        ['mousedown', 'mouseup', 'click'].forEach(t =>
            select.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
        );
        await sleep(300);
        let option = null;
        for (let i = 0; i < 50; i++) {
            option = [...document.querySelectorAll('.smwb-menu__item')].find(o => o.textContent.trim() === value);
            if (option) break;
            await sleep(100);
        }
        if (option) {
            ['mousedown', 'mouseup', 'click'].forEach(t =>
                option.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
            );
            await sleep(200);
            return true;
        }
        console.warn('Марка провода не найдена в списке:', value);
        return false;
    }

    function scanSiteData() {
        const data = {};
        const wireEl = document.querySelector('fieldset[name="cableType"] .smwb-select-field span') ||
                       document.querySelector('input[name="cableType"]');
        if (wireEl) data.wireBrand = (wireEl.textContent || wireEl.value || '').trim();
        const fasteningEl = document.querySelector('input[name="fastening.type"]');
        if (fasteningEl) data.fastening = fasteningEl.value;
        const terrainEl = document.querySelector('input[name="areaType"]');
        if (terrainEl) data.terrain = terrainEl.value;
        const roadEl = document.querySelector('input[name="roadType"]');
        if (roadEl) data.roadType = roadEl.value;
        const constructionEl = document.querySelector('input[name="construction"]');
        if (constructionEl) data.construction = constructionEl.value;
        const crossObjEl = document.querySelector('input[name="crossing.object"]');
        if (crossObjEl) data.crossingObject = crossObjEl.value;
        const lengthSelectors = ['input[name*="length"]','input[name*="wireLength"]','input[name*="cableLength"]','input[placeholder*="метр"]','input[placeholder*="длин"]','[data-name*="length"] input','fieldset[name*="length"] input'];
        for (const sel of lengthSelectors) {
            const el = document.querySelector(sel);
            if (el && el.value && !isNaN(parseFloat(el.value))) { data.wireLength = el.value; break; }
        }
        return data;
    }

    /******************************************************************
     * НАБЛЮДАТЕЛЬ ЗА ФОРМОЙ (авто show/hide)
     ******************************************************************/
    function startFormObserver() {
        initializeUI();

        function checkFormPresence() {
            const formVisible = isWireForm();
            const host = document.getElementById('kolus-ui-host');
            if (!host) return;
            if (formVisible && !window.kolusManuallyHidden) {
                const wasHidden = host.style.display === 'none';
                host.style.display = 'block';
                if (wasHidden && typeof window.kolusSetWireLength === 'function' && db.wireLength) {
                    window.kolusSetWireLength(db.wireLength);
                }
            } else {
                host.style.display = 'none';
            }
        }

        checkFormPresence();
        const observer = new MutationObserver(() => checkFormPresence());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /******************************************************************
     * UI (SHADOW DOM)
     ******************************************************************/
    function initializeUI() {
        if (window.kolusUIInitialized) { console.log('⚠️ KOLUS: UI уже инициализирован'); return; }
        window.kolusUIInitialized = true;

        const host = document.createElement('div');
        host.id = 'kolus-ui-host';
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });

        const css = `
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes lengthPop { 0% { transform: scale(1); } 50% { transform: scale(1.08); background: rgba(34,197,94,0.4); } 100% { transform: scale(1); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .root { position: fixed; width: 340px; background: linear-gradient(145deg, #1e1b4b 0%, #312e81 100%); border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; z-index: 1000000; box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1); color: #fff; overflow: hidden; animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top left; display: flex; flex-direction: column; max-height: 90vh; }
        .header { background: rgba(0,0,0,0.3); backdrop-filter: blur(10px); padding: 8px 12px; cursor: move; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); user-select: none; flex-shrink: 0; }
        .header-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; }
        .header-icon { width: 18px; height: 18px; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 11px; }
        .header-controls { display: flex; gap: 6px; align-items: center; }
        .header-btn { width: 24px; height: 24px; border-radius: 5px; background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 14px; line-height: 1; }
        .header-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .collapsed-info { padding: 8px 12px; display: none; flex-direction: column; gap: 6px; background: rgba(0,0,0,0.2); }
        .collapsed-info.visible { display: flex; }
        .collapsed-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
        .collapsed-label { color: rgba(255,255,255,0.6); font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; font-size: 9px; }
        .collapsed-value { font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.3); }
        .collapsed-value.match-green { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .collapsed-value.match-red { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .collapsed-value.match-yellow { background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.3); animation: pulse 2s infinite; }
        .body { padding: 10px 12px; padding-bottom: 70px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; }
        .body::-webkit-scrollbar { width: 5px; }
        .body::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 3px; }
        .body::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.5); border-radius: 3px; }
        .body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.7); }
        .status-panel { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .status-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
        .status-label { color: rgba(255,255,255,0.6); font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; font-size: 9px; }
        .status-value { font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 5px; background: rgba(0,0,0,0.3); transition: all 0.3s; }
        .status-value.match-green { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .status-value.match-red { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .status-value.match-yellow { background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.3); animation: pulse 2s infinite; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); margin: 2px 0; }
        .field-group { display: flex; flex-direction: column; gap: 4px; }
        .field-label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.3px; }
        .field-label-icon { font-size: 12px; }
        .field-input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 7px; padding: 7px 10px; color: #fff; font-size: 12px; transition: all 0.2s; outline: none; font-family: inherit; }
        .field-input::placeholder { color: rgba(255,255,255,0.4); }
        .field-input:focus { border-color: rgba(139,92,246,0.6); background: rgba(0,0,0,0.4); box-shadow: 0 0 0 2px rgba(139,92,246,0.1); }
        .field-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .field-input.length-updated { animation: lengthPop 0.5s ease-out; border-color: rgba(34,197,94,0.6); }
        .preset-controls { display: flex; gap: 5px; }
        .preset-controls .field-input { flex: 1; }
        .preset-btn { width: 30px; height: 30px; border-radius: 6px; border: none; background: rgba(139,92,246,0.2); color: #8b5cf6; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s; flex-shrink: 0; }
        .preset-btn:hover { background: rgba(139,92,246,0.3); transform: translateY(-1px); }
        .preset-btn.add { background: rgba(34,197,94,0.2); color: #22c55e; }
        .preset-btn.add:hover { background: rgba(34,197,94,0.3); }
        .preset-btn.delete { background: rgba(239,68,68,0.2); color: #ef4444; }
        .preset-btn.delete:hover { background: rgba(239,68,68,0.3); }
        .preset-btn.edit { background: rgba(234,179,8,0.2); color: #eab308; }
        .preset-btn.edit:hover { background: rgba(234,179,8,0.3); }
        .compact-row { display: flex; gap: 6px; }
        .compact-row .field-group { flex: 1; }
        .number-control { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 8px; }
        .number-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.3px; }
        .number-controls { display: flex; align-items: center; gap: 6px; }
        .number-input { width: 50px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 4px 8px; color: #fff; font-size: 12px; font-weight: 700; text-align: center; outline: none; }
        .number-input:focus { border-color: rgba(139,92,246,0.6); box-shadow: 0 0 0 2px rgba(139,92,246,0.1); }
        .number-btn { width: 24px; height: 24px; border-radius: 5px; border: none; background: rgba(139,92,246,0.2); color: #8b5cf6; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; transition: all 0.2s; }
        .number-btn:hover { background: rgba(139,92,246,0.3); transform: scale(1.05); }
        .radio-group { display: flex; gap: 4px; flex-wrap: wrap; }
        .radio-option { flex: 1; min-width: calc(33.33% - 3px); }
        .radio-input { display: none; }
        .radio-label { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 7px; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 500; }
        .radio-label:hover { background: rgba(0,0,0,0.4); border-color: rgba(139,92,246,0.4); }
        .radio-input:checked + .radio-label { background: rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.6); color: #a78bfa; }
        .radio-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .radio-input:checked + .radio-label .radio-dot { border-color: #8b5cf6; background: #8b5cf6; box-shadow: 0 0 0 2px rgba(139,92,246,0.2); }
        .radio-input:checked + .radio-label .radio-dot::after { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #fff; }
        .toggle-section { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; cursor: pointer; transition: all 0.2s; }
        .toggle-section:hover { background: rgba(0,0,0,0.4); }
        .toggle-switch { position: relative; width: 44px; height: 22px; flex-shrink: 0; }
        .toggle-input { display: none; }
        .toggle-slider { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.2); border-radius: 11px; transition: 0.3s; cursor: pointer; }
        .toggle-slider::before { content: ''; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .toggle-input:checked + .toggle-slider { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .toggle-input:checked + .toggle-slider::before { transform: translateX(22px); }
        .toggle-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; flex: 1; pointer-events: none; }
        .toggle-status { margin-left: auto; font-size: 9px; font-weight: 700; padding: 3px 6px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.3px; }
        .toggle-status.active { background: rgba(34,197,94,0.2); color: #22c55e; }
        .toggle-status.inactive { background: rgba(239,68,68,0.2); color: #ef4444; }
        .crossing-fields { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; transition: all 0.3s; }
        .crossing-fields.hidden { opacity: 0; max-height: 0; overflow: hidden; margin-top: 0; pointer-events: none; }
        .crossing-objects { display: flex; flex-wrap: wrap; gap: 4px; }
        .crossing-obj-option { flex: 1; min-width: calc(50% - 2px); }
        .crossing-obj-input { display: none; }
        .crossing-obj-label { display: flex; align-items: center; justify-content: center; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 7px; cursor: pointer; transition: all 0.2s; font-size: 10px; font-weight: 500; text-align: center; }
        .crossing-obj-label:hover { background: rgba(0,0,0,0.4); border-color: rgba(139,92,246,0.4); }
        .crossing-obj-input:checked + .crossing-obj-label { background: rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.6); color: #a78bfa; }
        .crossing-obj-input:disabled + .crossing-obj-label { opacity: 0.4; cursor: not-allowed; }
        .footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 12px; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.4)); display: flex; gap: 6px; backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.1); }
        .btn { flex: 1; padding: 9px 16px; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn:disabled:hover { transform: none; }
        .btn-fill { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; box-shadow: 0 3px 10px rgba(139,92,246,0.3); }
        .btn-fill:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(139,92,246,0.4); }
        .btn-scan { background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.3)); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .btn-scan:hover:not(:disabled) { background: linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.4)); transform: translateY(-1px); }
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; z-index: 1000001; animation: slideIn 0.2s ease-out; }
        .modal { background: linear-gradient(145deg, #1e1b4b 0%, #312e81 100%); border-radius: 12px; padding: 20px; width: 90%; max-width: 340px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
        .modal-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #fff; display: flex; align-items: center; gap: 6px; }
        .modal-content { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .modal-text { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.5; }
        .modal-highlight { color: #8b5cf6; font-weight: 600; }
        .modal-buttons { display: flex; gap: 6px; }
        .modal-btn { flex: 1; padding: 9px 16px; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .modal-btn-primary { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; }
        .modal-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(139,92,246,0.4); }
        .modal-btn-secondary { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .modal-btn-secondary:hover { background: rgba(255,255,255,0.15); }
        .suggestions { margin-top: 4px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); border-radius: 7px; overflow: hidden; max-height: 180px; overflow-y: auto; animation: slideIn 0.2s ease-out; }
        .suggestions-title { padding: 6px 10px; font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.3px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1); }
        .suggestions-list { display: flex; flex-direction: column; }
        .suggestion-item { padding: 8px 10px; font-size: 12px; color: rgba(255,255,255,0.9); cursor: pointer; transition: all 0.15s; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .suggestion-item:last-child { border-bottom: none; }
        .suggestion-item:hover { background: rgba(139,92,246,0.2); color: #a78bfa; }
        .notification { position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, rgba(34,197,94,0.95), rgba(0,0,0,0.95)); border: 1px solid rgba(34,197,94,0.5); border-radius: 10px; padding: 12px 16px; color: #fff; font-size: 12px; font-weight: 600; z-index: 1000002; box-shadow: 0 8px 24px rgba(0,0,0,0.5); animation: slideIn 0.3s ease-out; max-width: 280px; }
        .notification-warning { background: linear-gradient(135deg, rgba(234,179,8,0.95), rgba(0,0,0,0.95)); border-color: rgba(234,179,8,0.5); }
        .notification-error { background: linear-gradient(135deg, rgba(239,68,68,0.95), rgba(0,0,0,0.95)); border-color: rgba(239,68,68,0.5); }
        .discord-link { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 10px; background: rgba(88,101,242,0.2); border: 1px solid rgba(88,101,242,0.3); border-radius: 7px; color: #5865f2; font-size: 10px; font-weight: 600; text-decoration: none; transition: all 0.2s; margin-top: 8px; }
        .discord-link:hover { background: rgba(88,101,242,0.3); transform: translateY(-1px); }
        .scale-controls { display: flex; align-items: center; gap: 4px; }
        .scale-btn { width: 20px; height: 20px; border-radius: 4px; border: none; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; transition: all 0.2s; }
        .scale-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .scale-value { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.8); min-width: 32px; text-align: center; }
        .settings-bar { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; }
        .settings-bar-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.3px; }
        .settings-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; }
        .settings-toggle-input { display: none; }
        .settings-toggle-slider { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.2); border-radius: 10px; transition: 0.3s; cursor: pointer; }
        .settings-toggle-slider::before { content: ''; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .settings-toggle-input:checked + .settings-toggle-slider { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .settings-toggle-input:checked + .settings-toggle-slider::before { transform: translateX(18px); }

        /* ===== ЗАМЕТКИ ===== */
        .notes-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000001; pointer-events: none; }
        .notes-overlay.visible { display: block; }
        .notes-panel { pointer-events: all; position: absolute; width: 300px; background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%); border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1); overflow: hidden; display: flex; flex-direction: column; animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        .notes-header { background: rgba(0,0,0,0.5); padding: 8px 12px; cursor: move; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); user-select: none; }
        .notes-title { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0.3px; }
        .notes-title-icon { background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 5px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
        .notes-close { width: 22px; height: 22px; border-radius: 5px; background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; transition: all 0.2s; }
        .notes-close:hover { background: rgba(239,68,68,0.4); }
        .notes-body { padding: 10px; display: flex; flex-direction: column; gap: 0; flex: 1; }
        .notes-textarea { background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 10px 12px; color: #f1f5f9; font-size: 12.5px; font-family: 'Consolas', 'Courier New', monospace; resize: none; outline: none; line-height: 1.65; min-height: 240px; transition: border-color 0.2s; width: 100%; }
        .notes-textarea::placeholder { color: rgba(255,255,255,0.25); font-size: 11px; line-height: 1.7; }
        .notes-textarea:focus { border-color: rgba(245,158,11,0.55); box-shadow: 0 0 0 2px rgba(245,158,11,0.08); }
        .notes-textarea::-webkit-scrollbar { width: 4px; }
        .notes-textarea::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 2px; }
        .notes-textarea::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.4); border-radius: 2px; }
        .notes-footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px 10px; border-top: 1px solid rgba(255,255,255,0.07); margin-top: 8px; }
        .notes-counter { font-size: 9px; color: rgba(255,255,255,0.35); font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; }
        .notes-clear { padding: 5px 10px; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; background: rgba(239,68,68,0.1); color: #ef4444; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .notes-clear:hover { background: rgba(239,68,68,0.22); transform: translateY(-1px); }

        .root.compact { max-height: none; }
        .root.compact .body { max-height: none; overflow-y: visible; }
        `;

        const html = `
        <div class="root" id="mainPanel">
            <div class="header" id="dragHandle">
                <div class="header-title">
                    <div class="header-icon">⚡</div>
                    <span>KOLUS v1.6.3</span>
                </div>
                <div class="header-controls">
                    <div class="scale-controls">
                        <button class="scale-btn" id="btnScaleDown">−</button>
                        <span class="scale-value" id="scaleValue">100%</span>
                        <button class="scale-btn" id="btnScaleUp">+</button>
                    </div>
                    <button class="header-btn" id="btnNotes" title="Заметки 📝">📝</button>
                    <button class="header-btn" id="btnSettings" title="Настройки">⚙️</button>
                    <button class="header-btn" id="btnMinimize">−</button>
                </div>
            </div>

            <div class="collapsed-info" id="collapsedInfo">
                <div class="collapsed-row">
                    <span class="collapsed-label">📡 Марка</span>
                    <span class="collapsed-value match-yellow" id="collapsedWire">...</span>
                </div>
                <div class="collapsed-row">
                    <span class="collapsed-label">🎯 Пресет</span>
                    <span class="collapsed-value" id="collapsedPreset" style="color:#8b5cf6;">—</span>
                </div>
                <div class="collapsed-row">
                    <span class="collapsed-label">📏 Длина</span>
                    <span class="collapsed-value" id="collapsedLength" style="color:#22c55e;">—</span>
                </div>
            </div>

            <div class="body" id="bodyContent">
                <div class="status-panel">
                    <div class="status-row">
                        <span class="status-label">📡 Марка на сайте</span>
                        <span class="status-value match-yellow" id="statusWire">...</span>
                    </div>
                    <div class="status-row">
                        <span class="status-label">🎯 Пресет</span>
                        <span class="status-value" id="statusPreset" style="color:#8b5cf6;">—</span>
                    </div>
                </div>

                <div class="field-group">
                    <label class="field-label"><span class="field-label-icon">🎯</span>Пресет</label>
                    <div class="preset-controls">
                        <select class="field-input" id="presetSelect"></select>
                        <button class="preset-btn add" id="btnAddPreset" title="Создать">+</button>
                        <button class="preset-btn edit" id="btnEditPreset" title="Редактировать">✏️</button>
                        <button class="preset-btn delete" id="btnDeletePreset" title="Удалить">🗑️</button>
                    </div>
                </div>

                <div class="divider"></div>

                <div id="settingsPanel" style="display:none; flex-direction:column; gap:6px;">
                    <div class="settings-bar">
                        <span class="settings-bar-label">📐 Компактный режим</span>
                        <label class="settings-toggle">
                            <input type="checkbox" class="settings-toggle-input" id="toggleCompact">
                            <span class="settings-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="divider"></div>
                </div>

                <div class="compact-row">
                    <div class="field-group">
                        <label class="field-label"><span class="field-label-icon">📏</span>Габарит</label>
                        <div class="number-controls">
                            <button class="number-btn" id="btnClearanceMinus">−</button>
                            <input type="number" class="number-input" id="inputClearance" step="0.5" min="1.0" max="15.0" value="5.0">
                            <button class="number-btn" id="btnClearancePlus">+</button>
                        </div>
                    </div>
                    <div class="field-group">
                        <label class="field-label"><span class="field-label-icon">🔌</span>Муфты</label>
                        <div class="number-controls">
                            <button class="number-btn" id="btnCouplingMinus">−</button>
                            <input type="number" class="number-input" id="inputCouplingCount" step="1" min="0" max="50" value="0">
                            <button class="number-btn" id="btnCouplingPlus">+</button>
                        </div>
                    </div>
                </div>

                <div class="field-group">
                    <label class="field-label"><span class="field-label-icon">📐</span>Длина (м)</label>
                    <input type="number" min="0" step="0.1" class="field-input" id="inputWireLength" placeholder="Нажмите на провод...">
                </div>

                <div class="field-group">
                    <label class="field-label"><span class="field-label-icon">🔌</span>Марка провода</label>
                    <input type="text" class="field-input" id="inputWireBrand" placeholder="Марка провода..." autocomplete="off">
                    <div id="wireSuggestions" class="suggestions" style="display:none;">
                        <div class="suggestions-title">💡 Похожие:</div>
                        <div class="suggestions-list" id="wireSuggestionsList"></div>
                    </div>
                </div>

                <div class="field-group">
                    <label class="field-label"><span class="field-label-icon">⚙️</span>Крепление</label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" class="radio-input" id="fasteningNatyazhnoe" name="fastening" value="Натяжное" checked>
                            <label class="radio-label" for="fasteningNatyazhnoe"><span class="radio-dot"></span><span>Натяж.</span></label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" class="radio-input" id="fasteningPodderzh" name="fastening" value="Поддерживающее">
                            <label class="radio-label" for="fasteningPodderzh"><span class="radio-dot"></span><span>Поддер.</span></label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" class="radio-input" id="fasteningAnkernoe" name="fastening" value="Анкерное">
                            <label class="radio-label" for="fasteningAnkernoe"><span class="radio-dot"></span><span>Анкер.</span></label>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="toggle-section" id="toggleCrossing">
                    <div class="toggle-switch">
                        <input type="checkbox" class="toggle-input" id="crossingToggle" checked>
                        <span class="toggle-slider"></span>
                    </div>
                    <div class="toggle-label">
                        <span>🔀</span><span>Пересечения</span>
                        <span class="toggle-status active" id="toggleStatus">ВКЛ</span>
                    </div>
                </div>

                <div class="crossing-fields" id="crossingFields">
                    <div class="field-group">
                        <label class="field-label"><span class="field-label-icon">🌳</span>Объект</label>
                        <div class="crossing-objects">
                            <div class="crossing-obj-option">
                                <input type="radio" class="crossing-obj-input" id="crossTree" name="crossingObject" value="Дерево" checked>
                                <label class="crossing-obj-label" for="crossTree">🌲 Дерево</label>
                            </div>
                            <div class="crossing-obj-option">
                                <input type="radio" class="crossing-obj-input" id="crossFence" name="crossingObject" value="Забор">
                                <label class="crossing-obj-label" for="crossFence">🚧 Забор</label>
                            </div>
                            <div class="crossing-obj-option">
                                <input type="radio" class="crossing-obj-input" id="crossRoad" name="crossingObject" value="Автодорога">
                                <label class="crossing-obj-label" for="crossRoad">🛣️ Автодорога</label>
                            </div>
                            <div class="crossing-obj-option">
                                <input type="radio" class="crossing-obj-input" id="crossBuilding" name="crossingObject" value="Строение">
                                <label class="crossing-obj-label" for="crossBuilding">🏠 Строен.</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="compact-row">
                    <div class="field-group">
                        <label class="field-label"><span class="field-label-icon">🏗️</span>Констр.</label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" class="radio-input" id="constructionVL" name="construction" value="ВЛ" checked>
                                <label class="radio-label" for="constructionVL"><span class="radio-dot"></span><span>ВЛ</span></label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" class="radio-input" id="constructionKL" name="construction" value="КЛ">
                                <label class="radio-label" for="constructionKL"><span class="radio-dot"></span><span>КЛ</span></label>
                            </div>
                        </div>
                    </div>
                    <div class="field-group">
                        <label class="field-label"><span class="field-label-icon">🛣️</span>Автодорога</label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" class="radio-input" id="roadAsphalt" name="roadType" value="Асфальтовая" checked>
                                <label class="radio-label" for="roadAsphalt"><span class="radio-dot"></span><span>Асфальт</span></label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" class="radio-input" id="roadGround" name="roadType" value="Грунтовая">
                                <label class="radio-label" for="roadGround"><span class="radio-dot"></span><span>Грунт</span></label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="field-group">
                    <label class="field-label"><span class="field-label-icon">🌍</span>Местность</label>
                    <input type="text" class="field-input" id="inputTerrain" placeholder="Тип местности...">
                </div>

                <a href="#" class="discord-link" id="discordLink">
                    <span>💬</span><span>Discord: KAST Team</span>
                </a>
            </div>

            <div class="footer">
                <button class="btn btn-scan" id="btnScan">
                    <span>🔍</span><span>Сканировать</span>
                </button>
                <button class="btn btn-fill" id="btnFill">
                    <span>✨</span><span>Заполнить</span>
                </button>
            </div>
        </div>

        <!-- ЗАМЕТКИ -->
        <div class="notes-overlay" id="notesOverlay">
            <div class="notes-panel" id="notesPanel">
                <div class="notes-header" id="notesDragHandle">
                    <div class="notes-title">
                        <div class="notes-title-icon">📝</div>
                        <span>Заметки по проводам</span>
                    </div>
                    <button class="notes-close" id="notesClose">✕</button>
                </div>
                <div class="notes-body">
                    <textarea class="notes-textarea" id="notesTextarea" placeholder="Записывай всё нужное сюда:\n\nф 1000 (СИП 4х35)\nф 9   (СИП 4х35)\nф 3   (СИП 4х35)\nф 7   (АВВГ 4х35)\n\n→ Следующий: ВВГ 3х2.5, муфта, КЛ\n\nЛюбые заметки — сохраняются сами."></textarea>
                </div>
                <div class="notes-footer">
                    <span class="notes-counter" id="notesCounter">0 символов</span>
                    <button class="notes-clear" id="notesClear">🗑 Очистить</button>
                </div>
            </div>
        </div>

        <!-- Модалки -->
        <div class="modal-overlay" id="modalAddPreset">
            <div class="modal">
                <div class="modal-title">➕ Новый пресет</div>
                <div class="modal-content">
                    <input type="text" class="field-input" id="inputNewPresetName" placeholder="Название...">
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-secondary" id="btnCancelAdd">Отмена</button>
                    <button class="modal-btn modal-btn-primary" id="btnConfirmAdd">Создать</button>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="modalEditPreset">
            <div class="modal">
                <div class="modal-title">✏️ Переименовать</div>
                <div class="modal-content">
                    <input type="text" class="field-input" id="inputEditPresetName" placeholder="Новое название...">
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-secondary" id="btnCancelEdit">Отмена</button>
                    <button class="modal-btn modal-btn-primary" id="btnConfirmEdit">Сохранить</button>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="modalDeletePreset">
            <div class="modal">
                <div class="modal-title">🗑️ Удалить?</div>
                <div class="modal-content">
                    <p class="modal-text">Удалить пресет <span class="modal-highlight" id="deletePresetName"></span>?</p>
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-secondary" id="btnCancelDelete">Отмена</button>
                    <button class="modal-btn modal-btn-primary" id="btnConfirmDelete">Удалить</button>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="modalWireBinding">
            <div class="modal">
                <div class="modal-title">🔗 Тип вязки</div>
                <div class="modal-content">
                    <p class="modal-text">
                        Марка: <span class="modal-highlight" id="wireTypeDisplay"></span><br>
                        Крепление: <span class="modal-highlight" id="fasteningTypeDisplay"></span>
                    </p>
                    <div class="radio-group" style="flex-direction:column;">
                        <div class="radio-option" style="min-width:100%;">
                            <input type="radio" class="radio-input" id="bindingEnd" name="bindingType" value="end" checked>
                            <label class="radio-label" for="bindingEnd" style="font-size:11px;"><span class="radio-dot"></span><span>Концевая</span></label>
                        </div>
                        <div class="radio-option" style="min-width:100%;">
                            <input type="radio" class="radio-input" id="bindingThrough" name="bindingType" value="through">
                            <label class="radio-label" for="bindingThrough" style="font-size:11px;"><span class="radio-dot"></span><span>Проходная</span></label>
                        </div>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-secondary" id="btnCancelBinding">Отмена</button>
                    <button class="modal-btn modal-btn-primary" id="btnConfirmBinding">Далее</button>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="modalAnchorType">
            <div class="modal">
                <div class="modal-title">⚓ Тип анкерного крепления</div>
                <div class="modal-content" id="anchorOptions"></div>
                <div class="modal-buttons">
                    <button class="modal-btn modal-btn-secondary" id="btnCancelAnchor">Отмена</button>
                    <button class="modal-btn modal-btn-primary" id="btnConfirmAnchor">Далее</button>
                </div>
            </div>
        </div>
        `;

        shadow.innerHTML = `<style>${css}</style>${html}`;

        const ui = {
            main: shadow.querySelector('#mainPanel'),
            body: shadow.querySelector('#bodyContent'),
            btnMinimize: shadow.querySelector('#btnMinimize'),
            btnFill: shadow.querySelector('#btnFill'),
            btnScan: shadow.querySelector('#btnScan'),
            inputWireLength: shadow.querySelector('#inputWireLength'),
            inputWireBrand: shadow.querySelector('#inputWireBrand'),
            inputTerrain: shadow.querySelector('#inputTerrain'),
            wireSuggestions: shadow.querySelector('#wireSuggestions'),
            wireSuggestionsList: shadow.querySelector('#wireSuggestionsList'),
            fasteningNatyazhnoe: shadow.querySelector('#fasteningNatyazhnoe'),
            fasteningPodderzh: shadow.querySelector('#fasteningPodderzh'),
            fasteningAnkernoe: shadow.querySelector('#fasteningAnkernoe'),
            crossingToggle: shadow.querySelector('#crossingToggle'),
            toggleStatus: shadow.querySelector('#toggleStatus'),
            crossingFields: shadow.querySelector('#crossingFields'),
            constructionKL: shadow.querySelector('#constructionKL'),
            constructionVL: shadow.querySelector('#constructionVL'),
            roadGround: shadow.querySelector('#roadGround'),
            roadAsphalt: shadow.querySelector('#roadAsphalt'),
            crossTree: shadow.querySelector('#crossTree'),
            crossFence: shadow.querySelector('#crossFence'),
            crossRoad: shadow.querySelector('#crossRoad'),
            crossBuilding: shadow.querySelector('#crossBuilding'),
            statusWire: shadow.querySelector('#statusWire'),
            statusPreset: shadow.querySelector('#statusPreset'),
            collapsedWire: shadow.querySelector('#collapsedWire'),
            collapsedPreset: shadow.querySelector('#collapsedPreset'),
            collapsedLength: shadow.querySelector('#collapsedLength'),
            collapsedInfo: shadow.querySelector('#collapsedInfo'),
            presetSelect: shadow.querySelector('#presetSelect'),
            btnAddPreset: shadow.querySelector('#btnAddPreset'),
            btnEditPreset: shadow.querySelector('#btnEditPreset'),
            btnDeletePreset: shadow.querySelector('#btnDeletePreset'),
            modalAddPreset: shadow.querySelector('#modalAddPreset'),
            modalEditPreset: shadow.querySelector('#modalEditPreset'),
            modalDeletePreset: shadow.querySelector('#modalDeletePreset'),
            inputNewPresetName: shadow.querySelector('#inputNewPresetName'),
            inputEditPresetName: shadow.querySelector('#inputEditPresetName'),
            deletePresetName: shadow.querySelector('#deletePresetName'),
            btnCancelAdd: shadow.querySelector('#btnCancelAdd'),
            btnConfirmAdd: shadow.querySelector('#btnConfirmAdd'),
            btnCancelEdit: shadow.querySelector('#btnCancelEdit'),
            btnConfirmEdit: shadow.querySelector('#btnConfirmEdit'),
            btnCancelDelete: shadow.querySelector('#btnCancelDelete'),
            btnConfirmDelete: shadow.querySelector('#btnConfirmDelete'),
            discordLink: shadow.querySelector('#discordLink'),
            modalWireBinding: shadow.querySelector('#modalWireBinding'),
            btnCancelBinding: shadow.querySelector('#btnCancelBinding'),
            btnConfirmBinding: shadow.querySelector('#btnConfirmBinding'),
            wireTypeDisplay: shadow.querySelector('#wireTypeDisplay'),
            fasteningTypeDisplay: shadow.querySelector('#fasteningTypeDisplay'),
            bindingEnd: shadow.querySelector('#bindingEnd'),
            bindingThrough: shadow.querySelector('#bindingThrough'),
            modalAnchorType: shadow.querySelector('#modalAnchorType'),
            anchorOptions: shadow.querySelector('#anchorOptions'),
            btnCancelAnchor: shadow.querySelector('#btnCancelAnchor'),
            btnConfirmAnchor: shadow.querySelector('#btnConfirmAnchor'),
            inputClearance: shadow.querySelector('#inputClearance'),
            btnClearanceMinus: shadow.querySelector('#btnClearanceMinus'),
            btnClearancePlus: shadow.querySelector('#btnClearancePlus'),
            btnScaleUp: shadow.querySelector('#btnScaleUp'),
            btnScaleDown: shadow.querySelector('#btnScaleDown'),
            scaleValue: shadow.querySelector('#scaleValue'),
            btnSettings: shadow.querySelector('#btnSettings'),
            settingsPanel: shadow.querySelector('#settingsPanel'),
            toggleCompact: shadow.querySelector('#toggleCompact'),
            inputCouplingCount: shadow.querySelector('#inputCouplingCount'),
            btnCouplingMinus: shadow.querySelector('#btnCouplingMinus'),
            btnCouplingPlus: shadow.querySelector('#btnCouplingPlus'),
            btnNotes: shadow.querySelector('#btnNotes'),
            notesOverlay: shadow.querySelector('#notesOverlay'),
            notesPanel: shadow.querySelector('#notesPanel'),
            notesDragHandle: shadow.querySelector('#notesDragHandle'),
            notesClose: shadow.querySelector('#notesClose'),
            notesTextarea: shadow.querySelector('#notesTextarea'),
            notesCounter: shadow.querySelector('#notesCounter'),
            notesClear: shadow.querySelector('#notesClear')
        };

        /******************************************************************
         * 📏 КОЛБЭК ДЛЯ АВТОУСТАНОВКИ ДЛИНЫ ПРИ КЛИКЕ ПО ПРОВОДУ
         ******************************************************************/
        window.kolusSetWireLength = function(lengthStr) {
            ui.inputWireLength.value = lengthStr;
            if (ui.collapsedLength) ui.collapsedLength.textContent = lengthStr + ' м';
            ui.inputWireLength.classList.remove('length-updated');
            void ui.inputWireLength.offsetWidth;
            ui.inputWireLength.classList.add('length-updated');
            setTimeout(() => ui.inputWireLength.classList.remove('length-updated'), 600);
            showNotification('📏 Длина: ' + lengthStr + ' м', 'success');
        };

        /******************************************************************
         * АВТОДОПОЛНЕНИЕ МАРКИ ПРОВОДА
         ******************************************************************/
        ui.inputWireBrand.addEventListener('input', (e) => {
            const v = e.target.value.trim();
            if (v.length >= 1) {
                const similar = findSimilarWires(v);
                if (similar.length > 0) {
                    ui.wireSuggestionsList.innerHTML = similar.map(w =>
                        `<div class="suggestion-item" data-wire="${w}">${w}</div>`
                    ).join('');
                    ui.wireSuggestions.style.display = 'block';
                } else {
                    ui.wireSuggestions.style.display = 'none';
                }
            } else {
                ui.wireSuggestions.style.display = 'none';
            }
        });
        ui.wireSuggestionsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                const wire = e.target.dataset.wire;
                ui.inputWireBrand.value = wire;
                getActive().wireBrand = wire;
                saveDb();
                ui.wireSuggestions.style.display = 'none';
            }
        });
        document.addEventListener('click', (e) => {
            if (!shadow.contains(e.target)) ui.wireSuggestions.style.display = 'none';
        });

        /******************************************************************
         * СОХРАНЕНИЕ ПОЛЕЙ
         ******************************************************************/
        ui.inputWireLength.addEventListener('input', (e) => { db.wireLength = e.target.value; saveDb(); });
        ui.inputWireBrand.addEventListener('input', (e) => { getActive().wireBrand = e.target.value; saveDb(); });
        ui.inputTerrain.addEventListener('input',    (e) => { getActive().terrain = e.target.value; saveDb(); });
        [ui.fasteningNatyazhnoe, ui.fasteningPodderzh, ui.fasteningAnkernoe].forEach(r =>
            r.addEventListener('change', (e) => { if (e.target.checked) { db.fastening = e.target.value; saveDb(); } })
        );
        [ui.constructionKL, ui.constructionVL].forEach(r =>
            r.addEventListener('change', (e) => { if (e.target.checked) { getActive().construction = e.target.value; saveDb(); updateCrossingFieldsState(); } })
        );
        [ui.roadGround, ui.roadAsphalt].forEach(r =>
            r.addEventListener('change', (e) => { if (e.target.checked) { getActive().roadType = e.target.value; saveDb(); } })
        );
        [ui.crossTree, ui.crossFence, ui.crossRoad, ui.crossBuilding].forEach(r =>
            r.addEventListener('change', (e) => { if (e.target.checked) { db.crossingObject = e.target.value; saveDb(); } })
        );

        /******************************************************************
         * ГАБАРИТ
         ******************************************************************/
        function clampClearance(val) { return Math.max(1.0, Math.min(15.0, val)); }
        function updateClearanceDisplay() { ui.inputClearance.value = db.clearance; }
        ui.btnClearanceMinus.addEventListener('click', () => {
            db.clearance = clampClearance(parseFloat(db.clearance) - 0.5).toFixed(1);
            updateClearanceDisplay(); saveDb();
        });
        ui.btnClearancePlus.addEventListener('click', () => {
            db.clearance = clampClearance(parseFloat(db.clearance) + 0.5).toFixed(1);
            updateClearanceDisplay(); saveDb();
        });
        ui.inputClearance.addEventListener('change', () => {
            const v = parseFloat(ui.inputClearance.value);
            if (!isNaN(v)) db.clearance = clampClearance(v).toFixed(1);
            updateClearanceDisplay(); saveDb();
        });

        /******************************************************************
         * КОЛИЧЕСТВО МУФТ
         ******************************************************************/
        function clampCouplingCount(val) { return Math.max(0, Math.min(50, val)); }
        function updateCouplingDisplay() { ui.inputCouplingCount.value = db.couplingCount; }

        ui.btnCouplingMinus.addEventListener('click', () => {
            db.couplingCount = clampCouplingCount(parseInt(db.couplingCount) - 1).toString();
            updateCouplingDisplay(); saveDb();
        });
        ui.btnCouplingPlus.addEventListener('click', () => {
            db.couplingCount = clampCouplingCount(parseInt(db.couplingCount) + 1).toString();
            updateCouplingDisplay(); saveDb();
        });
        ui.inputCouplingCount.addEventListener('change', () => {
            const v = parseInt(ui.inputCouplingCount.value);
            if (!isNaN(v)) db.couplingCount = clampCouplingCount(v).toString();
            updateCouplingDisplay(); saveDb();
        });

        /******************************************************************
         * ВАЛИДАЦИЯ ЧИСЛОВЫХ ПОЛЕЙ
         ******************************************************************/
        function validateNumberInput(input) {
            const value = parseFloat(input.value);
            if (value < 0 || input.value === '' || isNaN(value)) {
                input.value = '';
                showNotification('⚠️ Буксин не шали!', 'warning');
                return false;
            }
            return true;
        }
        ui.inputWireLength.addEventListener('blur', function() {
            if (this.value && !validateNumberInput(this)) { db.wireLength = ''; saveDb(); }
        });

        /******************************************************************
         * МАСШТАБИРОВАНИЕ
         ******************************************************************/
        function updateScale() {
            ui.main.style.transform = `scale(${db.scale / 100})`;
            ui.scaleValue.textContent = `${db.scale}%`;
        }
        ui.btnScaleUp.addEventListener('click',   () => { if (db.scale < 150) { db.scale += 5; updateScale(); saveDb(); } });
        ui.btnScaleDown.addEventListener('click', () => { if (db.scale > 60)  { db.scale -= 5; updateScale(); saveDb(); } });

        /******************************************************************
         * НАСТРОЙКИ — ПАНЕЛЬ И КОМПАКТНЫЙ РЕЖИМ
         ******************************************************************/
        let settingsPanelOpen = false;
        function updateCompactMode() {
            ui.main.classList.toggle('compact', db.compactMode);
            ui.toggleCompact.checked = db.compactMode;
        }
        ui.btnSettings.addEventListener('click', () => {
            settingsPanelOpen = !settingsPanelOpen;
            ui.settingsPanel.style.display = settingsPanelOpen ? 'flex' : 'none';
            ui.btnSettings.style.background = settingsPanelOpen ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)';
        });
        ui.toggleCompact.addEventListener('change', (e) => {
            db.compactMode = e.target.checked;
            updateCompactMode();
            saveDb();
            showNotification(db.compactMode ? '📐 Компактный режим включён' : '📐 Компактный режим выключен', 'success');
        });

        /******************************************************************
         * УВЕДОМЛЕНИЯ
         ******************************************************************/
        function showNotification(message, type = 'success') {
            const n = document.createElement('div');
            n.className = `notification notification-${type}`;
            n.textContent = message;
            shadow.appendChild(n);
            setTimeout(() => { n.style.animation = 'slideIn 0.3s ease-out reverse'; setTimeout(() => n.remove(), 300); }, 3000);
        }

        /******************************************************************
         * УПРАВЛЕНИЕ ПРЕСЕТАМИ
         ******************************************************************/
        function generatePresetId() { return 'p' + Date.now() + Math.random().toString(36).substr(2, 5); }

        function createPreset(name) {
            const cur = getActive();
            const np = { id: generatePresetId(), name, wireBrand: cur.wireBrand || '', roadType: cur.roadType || 'Асфальтовая', construction: cur.construction || 'ВЛ', terrain: cur.terrain || '', designation: cur.designation || 'магистраль' };
            db.presets.push(np); db.activeId = np.id; saveDb(); updateUI();
            showNotification(`✅ Пресет "${name}" создан!`, 'success');
        }
        function renamePreset(newName) {
            const p = getActive();
            if (p) { p.name = newName; saveDb(); updateUI(); showNotification(`✅ Пресет переименован в "${newName}"`, 'success'); }
        }
        function deletePreset() {
            if (db.presets.length <= 1) { showNotification('⚠️ Нельзя удалить последний пресет!', 'warning'); return; }
            const idx = db.presets.findIndex(p => p.id === db.activeId);
            db.presets = db.presets.filter(p => p.id !== db.activeId);
            db.activeId = db.presets[Math.min(idx, db.presets.length - 1)].id;
            saveDb(); updateUI(); showNotification('✅ Пресет удалён', 'success');
        }
        function showModal(m) { m.style.display = 'flex'; }
        function hideModal(m) { m.style.display = 'none'; }

        /******************************************************************
         * ОБНОВЛЕНИЕ UI
         ******************************************************************/
        function updateToggleStatus() {
            const on = ui.crossingToggle.checked;
            ui.toggleStatus.textContent = on ? 'ВКЛ' : 'ВЫКЛ';
            ui.toggleStatus.className = on ? 'toggle-status active' : 'toggle-status inactive';
            ui.crossingFields.classList.toggle('hidden', !on);
        }
        function updateCrossingFieldsState() {
            const kl = ui.constructionKL.checked, on = ui.crossingToggle.checked;
            [ui.crossTree, ui.crossFence, ui.crossRoad, ui.crossBuilding].forEach(r => r.disabled = kl);
            ui.crossingFields.classList.toggle('hidden', !on);
        }
        function updateUI() {
            const preset = getActive();
            ui.inputWireLength.value = db.wireLength || '';
            ui.inputWireBrand.value  = preset.wireBrand || '';
            ui.inputTerrain.value    = preset.terrain || '';
            if (ui.collapsedLength) ui.collapsedLength.textContent = db.wireLength ? db.wireLength + ' м' : '—';
            updateClearanceDisplay();
            updateCouplingDisplay();

            const f = db.fastening || 'Натяжное';
            ui.fasteningNatyazhnoe.checked = f === 'Натяжное';
            ui.fasteningPodderzh.checked   = f === 'Поддерживающее';
            ui.fasteningAnkernoe.checked   = f === 'Анкерное';

            (preset.construction === 'КЛ' ? ui.constructionKL : ui.constructionVL).checked = true;
            (preset.roadType === 'Грунтовая' ? ui.roadGround : ui.roadAsphalt).checked = true;

            const co = db.crossingObject || 'Дерево';
            if (co === 'Дерево')     ui.crossTree.checked     = true;
            if (co === 'Забор')      ui.crossFence.checked    = true;
            if (co === 'Автодорога') ui.crossRoad.checked     = true;
            if (co === 'Строение')   ui.crossBuilding.checked = true;

            ui.presetSelect.innerHTML = db.presets.map(p =>
                `<option value="${p.id}" ${p.id === db.activeId ? 'selected' : ''}>${p.name}</option>`
            ).join('');

            ui.statusPreset.textContent = preset.name;
            ui.collapsedPreset.textContent = preset.name;
            ui.crossingToggle.checked = db.isCrossingEnabled;
            updateToggleStatus();
            updateCrossingFieldsState();
            updateScale();
            updateCompactMode();
        }

        /******************************************************************
         * ПЕРЕКЛЮЧАТЕЛЬ ПЕРЕСЕЧЕНИЙ
         ******************************************************************/
        ui.crossingToggle.addEventListener('change', (e) => {
            db.isCrossingEnabled = e.target.checked; updateToggleStatus(); updateCrossingFieldsState(); saveDb();
            showNotification(e.target.checked ? '✅ Пересечения включены' : '⚠️ Пересечения отключены', e.target.checked ? 'success' : 'warning');
        });
        shadow.querySelector('#toggleCrossing').addEventListener('click', (e) => {
            if (e.target === ui.crossingToggle || e.target.classList.contains('toggle-slider')) return;
            ui.crossingToggle.checked = !ui.crossingToggle.checked;
            db.isCrossingEnabled = ui.crossingToggle.checked; updateToggleStatus(); updateCrossingFieldsState(); saveDb();
            showNotification(ui.crossingToggle.checked ? '✅ Пересечения включены' : '⚠️ Пересечения отключены', ui.crossingToggle.checked ? 'success' : 'warning');
        });

        /******************************************************************
         * ПЕРЕКЛЮЧЕНИЕ ПРЕСЕТОВ
         ******************************************************************/
        ui.presetSelect.addEventListener('change', (e) => { db.activeId = e.target.value; saveDb(); updateUI(); showNotification('Пресет изменён', 'success'); });

        /******************************************************************
         * КНОПКИ УПРАВЛЕНИЯ ПРЕСЕТАМИ
         ******************************************************************/
        ui.btnAddPreset.addEventListener('click', () => { ui.inputNewPresetName.value = ''; showModal(ui.modalAddPreset); setTimeout(() => ui.inputNewPresetName.focus(), 100); });
        ui.btnCancelAdd.addEventListener('click', () => hideModal(ui.modalAddPreset));
        ui.btnConfirmAdd.addEventListener('click', () => {
            const n = ui.inputNewPresetName.value.trim();
            if (!n) { showNotification('⚠️ Введите название пресета!', 'warning'); return; }
            createPreset(n); hideModal(ui.modalAddPreset);
        });
        ui.inputNewPresetName.addEventListener('keypress', (e) => { if (e.key === 'Enter') ui.btnConfirmAdd.click(); });

        ui.btnEditPreset.addEventListener('click', () => { ui.inputEditPresetName.value = getActive().name; showModal(ui.modalEditPreset); setTimeout(() => { ui.inputEditPresetName.focus(); ui.inputEditPresetName.select(); }, 100); });
        ui.btnCancelEdit.addEventListener('click', () => hideModal(ui.modalEditPreset));
        ui.btnConfirmEdit.addEventListener('click', () => {
            const n = ui.inputEditPresetName.value.trim();
            if (!n) { showNotification('⚠️ Введите название пресета!', 'warning'); return; }
            renamePreset(n); hideModal(ui.modalEditPreset);
        });
        ui.inputEditPresetName.addEventListener('keypress', (e) => { if (e.key === 'Enter') ui.btnConfirmEdit.click(); });

        ui.btnDeletePreset.addEventListener('click', () => { ui.deletePresetName.textContent = getActive().name; showModal(ui.modalDeletePreset); });
        ui.btnCancelDelete.addEventListener('click',  () => hideModal(ui.modalDeletePreset));
        ui.btnConfirmDelete.addEventListener('click', () => { deletePreset(); hideModal(ui.modalDeletePreset); });

        [ui.modalAddPreset, ui.modalEditPreset, ui.modalDeletePreset, ui.modalWireBinding, ui.modalAnchorType].forEach(m =>
            m.addEventListener('click', (e) => { if (e.target === m) hideModal(m); })
        );
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') [ui.modalAddPreset, ui.modalEditPreset, ui.modalDeletePreset, ui.modalWireBinding, ui.modalAnchorType].forEach(hideModal);
        });

        /******************************************************************
         * СКАНИРОВАНИЕ САЙТА
         ******************************************************************/
        ui.btnScan.addEventListener('click', async () => {
            ui.btnScan.disabled = true;
            ui.btnScan.innerHTML = '<span>⏳</span><span>Сканирую...</span>';
            try {
                const data = scanSiteData();
                const preset = getActive();
                let updated = false;
                if (data.wireBrand && data.wireBrand !== '...')    { preset.wireBrand    = data.wireBrand;    updated = true; }
                if (data.fastening)                                 { db.fastening        = data.fastening;    updated = true; }
                if (data.terrain)                                   { preset.terrain      = data.terrain;      updated = true; }
                if (data.roadType)                                  { preset.roadType     = data.roadType;     updated = true; }
                if (data.construction)                              { preset.construction = data.construction; updated = true; }
                if (data.crossingObject)                            { db.crossingObject   = data.crossingObject; updated = true; }
                if (data.wireLength)                                { db.wireLength       = data.wireLength;   updated = true; }
                if (updated) { saveDb(); updateUI(); showNotification('✅ Данные успешно считаны!', 'success'); }
                else showNotification('⚠️ Не удалось найти данные', 'warning');
            } catch (err) {
                console.error(err);
                showNotification('❌ Ошибка при сканировании', 'error');
            } finally {
                ui.btnScan.disabled = false;
                ui.btnScan.innerHTML = '<span>🔍</span><span>Сканировать</span>';
            }
        });

        /******************************************************************
         * ЗАПОЛНЕНИЕ ФОРМЫ
         ******************************************************************/
        ui.btnFill.addEventListener('click', async () => {
            const preset = getActive();
            if (db.wireLength && parseFloat(db.wireLength) < 0) { showNotification('⚠️ Буксин не шали!', 'warning'); return; }
            if (!preset.wireBrand) { showNotification('⚠️ Укажите марку провода!', 'warning'); return; }
            if (!db.fastening)     { showNotification('⚠️ Выберите способ крепления!', 'warning'); return; }

            if (db.fastening === 'Анкерное') {
                if (isWireTypeAorAC(preset.wireBrand)) {
                    ui.anchorOptions.innerHTML = `
                        <div class="radio-group" style="flex-direction:column;">
                            <div class="radio-option" style="min-width:100%;"><input type="radio" class="radio-input" id="anchorBindingEnd"     name="anchorType" value="Вязка концевая"  checked><label class="radio-label" for="anchorBindingEnd"    style="font-size:10px;"><span class="radio-dot"></span><span>Вязка концевая</span></label></div>
                            <div class="radio-option" style="min-width:100%;"><input type="radio" class="radio-input" id="anchorBindingThrough" name="anchorType" value="Вязка проходная">       <label class="radio-label" for="anchorBindingThrough" style="font-size:10px;"><span class="radio-dot"></span><span>Вязка проходная</span></label></div>
                        </div>`;
                } else {
                    ui.anchorOptions.innerHTML = `
                        <div class="radio-group" style="flex-direction:column;">
                            <div class="radio-option" style="min-width:100%;"><input type="radio" class="radio-input" id="anchorClamp" name="anchorType" value="Зажим анкерный клиновой" checked><label class="radio-label" for="anchorClamp" style="font-size:10px;"><span class="radio-dot"></span><span>Зажим анкерный</span></label></div>
                            <div class="radio-option" style="min-width:100%;"><input type="radio" class="radio-input" id="anchorBolt"  name="anchorType" value="Болтовой зажим">                  <label class="radio-label" for="anchorBolt"  style="font-size:10px;"><span class="radio-dot"></span><span>Болтовой зажим</span></label></div>
                        </div>`;
                }
                ui.btnConfirmAnchor.disabled = false;
                showModal(ui.modalAnchorType);
                return;
            }

            if (isWireTypeAorAC(preset.wireBrand)) {
                ui.wireTypeDisplay.textContent    = preset.wireBrand;
                ui.fasteningTypeDisplay.textContent = db.fastening || '—';
                (db.fastening === 'Поддерживающее' ? ui.bindingThrough : ui.bindingEnd).checked = true;
                showModal(ui.modalWireBinding);
                return;
            }

            await performFill();
        });

        ui.btnCancelBinding.addEventListener('click',  () => hideModal(ui.modalWireBinding));
        ui.btnConfirmBinding.addEventListener('click', async () => {
            const sel = ui.bindingEnd.checked ? 'Вязка концевая' : 'Вязка проходная';
            hideModal(ui.modalWireBinding);
            await performFill(sel);
        });

        ui.btnCancelAnchor.addEventListener('click', () => { hideModal(ui.modalAnchorType); ui.btnConfirmAnchor.disabled = false; });
        ui.btnConfirmAnchor.addEventListener('click', async () => {
            const r = shadow.querySelector('input[name="anchorType"]:checked');
            if (!r) { showNotification('⚠️ Выберите тип крепления!', 'warning'); return; }
            hideModal(ui.modalAnchorType); ui.btnConfirmAnchor.disabled = false;
            await performFill(null, r.value);
        });

        async function performFill(wireTension = null, anchorType = null) {
            ui.btnFill.disabled = true;
            ui.btnFill.innerHTML = '<span>⏳</span><span>Заполняю...</span>';
            try {
                const preset      = getActive();
                const construction = ui.constructionKL.checked ? 'КЛ' : 'ВЛ';
                const roadType     = ui.roadGround.checked ? 'Грунтовая' : 'Асфальтовая';
                const fastening    = db.fastening || 'Натяжное';

                const designationInput = await waitForInput('input[name="designation"]');
                if (!designationInput) throw new Error('Не найдено поле "designation".');
                setReactInputValue(designationInput, preset.designation || 'магистраль');

                const wireEl = document.querySelector('fieldset[name="cableType"] .smwb-select-field span') ||
                               document.querySelector('input[name="cableType"]');
                const siteWireRaw = wireEl ? (wireEl.textContent || wireEl.value || '') : '';
                const siteWire = siteWireRaw.trim().replace(/\u00a0/g, '').replace(/\s+/g, ' ');
                const hasPlaceholderClass = wireEl && (
                    wireEl.closest('.smwb-select-field')?.classList.contains('smwb-select-field--placeholder') ||
                    wireEl.classList.contains('smwb-select-field__placeholder')
                );
                const siteWireIsEmpty = !siteWire || siteWire === '...' || siteWire.length <= 2 || hasPlaceholderClass;

                if (siteWireIsEmpty) {
                    const ok = await selectWireBrandReact(preset.wireBrand);
                    if (!ok) {
                        showNotification('⚠️ Не удалось выбрать марку', 'warning');
                        alert(`[KOLUS] ⚠️ Не удалось выбрать марку "${preset.wireBrand}".`);
                    }
                } else if (wireMatches(siteWire, preset.wireBrand)) {
                    console.log('⏭️ KOLUS: Марка совпадает');
                } else {
                    const msg = `Марка на сайте (${siteWire}) ≠ пресет (${preset.wireBrand})!`;
                    showNotification('⚠️ ' + msg, 'warning');
                    alert('[KOLUS] ⚠️ ' + msg);
                    return;
                }

                await sleep(200);

                const phaseInput = await waitForInput('input[name="phaseCount"]');
                if (!phaseInput) throw new Error('Не найдено поле "phaseCount".');

                const isSIP2 = isSIP2x16(preset.wireBrand);
                if (isSIP2) {
                    setReactInputValue(phaseInput, '1');
                } else {
                    setReactInputValue(phaseInput, '3');
                }

                const wireCountInput = await waitForInput('input[name="wireCountInPhase"]');
                if (wireCountInput) setReactInputValue(wireCountInput, '1');

                setReactInputValue(await waitForInput('input[name="construction"]'), construction);
                setReactInputValue(await waitForInput('input[name="fastening.type"]'), fastening);
                setReactInputValue(await waitForInput('input[name="areaType"]'), preset.terrain);
                setReactInputValue(await waitForInput('input[name="overallDimension.height"]'), db.clearance);

                const tension = anchorType || wireTension ||
                    (fastening === 'Натяжное' ? 'Зажим натяжной клиновой' : 'Зажим поддерживающий');
                setReactInputValue(await waitForInput('input[name="wireTension"]'), tension);
                setReactInputValue(await waitForInput('input[name="roadType"]'), roadType);

                if (db.wireLength) {
                    const li = await waitForInput('input[name*="length"]') ||
                               await waitForInput('input[name*="wireLength"]') ||
                               await waitForInput('input[name*="cableLength"]');
                    if (li) setReactInputValue(li, db.wireLength);
                }

                if (db.couplingCount && parseInt(db.couplingCount) > 0) {
                    const couplingInput = await waitForInput('input[name*="coupling"]') ||
                                         await waitForInput('input[name*="муфт"]') ||
                                         await waitForInput('input[name*="muff"]');
                    if (couplingInput) setReactInputValue(couplingInput, db.couplingCount);
                }

                if (construction === 'ВЛ' && db.isCrossingEnabled) {
                    const cb = document.querySelector('input[name="crossing.exists"]');
                    if (cb && !cb.checked) cb.click();
                    await sleep(200);
                    setReactInputValue(await waitForInput('input[name="crossing.type"]'),   'воздушный переход');
                    setReactInputValue(await waitForInput('input[name="crossing.object"]'), db.crossingObject);
                } else {
                    const cb = document.querySelector('input[name="crossing.exists"]');
                    if (cb && cb.checked) cb.click();
                }

                await sleep(300);
                const cards = [...document.querySelectorAll('.smwb-card')];
                for (const title of ['Габарит над землей', 'Способ крепления на опоре']) {
                    const card = cards.find(c => c.querySelector('.smwb-card__title')?.textContent.includes(title));
                    if (!card) continue;
                    const photoGrid = card.querySelector('[name$="photoUrls"]');
                    if (photoGrid?.querySelectorAll('img,video').length > 0) continue;
                    const btn = card.querySelector('button.smwb-fab');
                    if (btn) ['mousedown', 'mouseup', 'click'].forEach(t =>
                        btn.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
                    );
                }

                showNotification('✅ Форма заполнена!', 'success');

            } catch (err) {
                console.error('❌ KOLUS:', err);
                showNotification('❌ Ошибка заполнения', 'error');
                alert(`[KOLUS] ❌ Ошибка: ${err.message}`);
            } finally {
                ui.btnFill.disabled = false;
                ui.btnFill.innerHTML = '<span>✨</span><span>Заполнить</span>';
            }
        }

        /******************************************************************
         * МИНИМИЗАЦИЯ ОКНА
         ******************************************************************/
        ui.btnMinimize.addEventListener('click', () => {
            db.isCollapsed = !db.isCollapsed;
            ui.body.style.display = db.isCollapsed ? 'none' : 'flex';
            ui.collapsedInfo.classList.toggle('visible', db.isCollapsed);
            ui.btnMinimize.textContent = db.isCollapsed ? '+' : '−';
            saveDb();
        });

        /******************************************************************
         * ПЕРЕТАСКИВАНИЕ ОСНОВНОГО ОКНА
         ******************************************************************/
        let isDragging = false, offsetX, offsetY;
        shadow.querySelector('#dragHandle').addEventListener('mousedown', (e) => {
            isDragging = true; offsetX = e.clientX - ui.main.offsetLeft; offsetY = e.clientY - ui.main.offsetTop; ui.main.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', (e) => {
            if (isDragging) { ui.main.style.left = (e.clientX - offsetX) + 'px'; ui.main.style.top = (e.clientY - offsetY) + 'px'; }
            if (notesIsDragging) { ui.notesPanel.style.left = (e.clientX - notesOffX) + 'px'; ui.notesPanel.style.top = (e.clientY - notesOffY) + 'px'; }
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; ui.main.style.cursor = ''; db.pos = { x: parseInt(ui.main.style.left), y: parseInt(ui.main.style.top) }; saveDb(); }
            if (notesIsDragging) { notesIsDragging = false; ui.notesPanel.style.cursor = ''; }
        });

        /******************************************************************
         * 📝 ЗАМЕТКИ
         ******************************************************************/
        function updateNotesCounter() {
            const len = ui.notesTextarea.value.length;
            ui.notesCounter.textContent = len > 0 ? len + ' симв.' : '0 символов';
        }

        // Загружаем сохранённые заметки
        ui.notesTextarea.value = db.notes || '';
        updateNotesCounter();

        ui.notesTextarea.addEventListener('input', () => {
            db.notes = ui.notesTextarea.value;
            saveDb();
            updateNotesCounter();
        });

        ui.notesClear.addEventListener('click', () => {
            if (!ui.notesTextarea.value) return;
            if (confirm('Очистить все заметки?')) {
                ui.notesTextarea.value = '';
                db.notes = '';
                saveDb();
                updateNotesCounter();
                showNotification('🗑 Заметки очищены', 'warning');
            }
        });

        ui.notesClose.addEventListener('click', () => {
            ui.notesOverlay.classList.remove('visible');
            ui.btnNotes.style.background = 'rgba(255,255,255,0.1)';
        });

        ui.btnNotes.addEventListener('click', () => {
            const isVisible = ui.notesOverlay.classList.contains('visible');
            ui.notesOverlay.classList.toggle('visible', !isVisible);
            ui.btnNotes.style.background = !isVisible ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.1)';
            if (!isVisible) {
                // Позиционируем панель рядом с основным окном
                const mainRect = ui.main.getBoundingClientRect();
                let nx = mainRect.right + 12;
                let ny = mainRect.top;
                if (nx + 300 > window.innerWidth) nx = mainRect.left - 312;
                if (ny + 340 > window.innerHeight) ny = window.innerHeight - 350;
                ui.notesPanel.style.left = Math.max(5, nx) + 'px';
                ui.notesPanel.style.top  = Math.max(5, ny) + 'px';
                setTimeout(() => ui.notesTextarea.focus(), 100);
            }
        });

        // Перетаскивание панели заметок
        let notesIsDragging = false, notesOffX, notesOffY;
        ui.notesDragHandle.addEventListener('mousedown', (e) => {
            notesIsDragging = true;
            notesOffX = e.clientX - ui.notesPanel.offsetLeft;
            notesOffY = e.clientY - ui.notesPanel.offsetTop;
            ui.notesPanel.style.cursor = 'grabbing';
            e.preventDefault();
        });

        // Закрытие заметок по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                [ui.modalAddPreset, ui.modalEditPreset, ui.modalDeletePreset, ui.modalWireBinding, ui.modalAnchorType].forEach(hideModal);
                if (ui.notesOverlay.classList.contains('visible')) {
                    ui.notesOverlay.classList.remove('visible');
                    ui.btnNotes.style.background = 'rgba(255,255,255,0.1)';
                }
            }
        });

        /******************************************************************
         * МОНИТОРИНГ МАРКИ ПРОВОДА
         ******************************************************************/
        function monitorWire() {
            try {
                const wireEl    = document.querySelector('fieldset[name="cableType"] .smwb-select-field span') || document.querySelector('input[name="cableType"]');
                const siteWire  = wireEl ? (wireEl.textContent || wireEl.value || '').trim() : '';
                const presetWire = ui.inputWireBrand.value.trim();

                function updateWireStatus(el, wire, preset) {
                    if (!wire || wire === '...') {
                        el.textContent = 'Пусто';
                        el.className = el.className.replace(/match-\w+/g, '') + ' match-yellow';
                        return false;
                    } else if (wireMatches(wire, preset)) {
                        el.textContent = wire;
                        el.className = el.className.replace(/match-\w+/g, '') + ' match-green';
                        return true;
                    } else {
                        el.textContent = wire;
                        el.className = el.className.replace(/match-\w+/g, '') + ' match-red';
                        return false;
                    }
                }

                updateWireStatus(ui.statusWire,    siteWire, presetWire);
                updateWireStatus(ui.collapsedWire, siteWire, presetWire);

                const siteWireIsEmpty = !siteWire || siteWire === '...' || siteWire.length <= 2;
                const brandMismatch = !siteWireIsEmpty && !wireMatches(siteWire, presetWire);
                ui.btnFill.disabled = !presetWire || brandMismatch;
                if (brandMismatch) {
                    ui.btnFill.style.opacity = '0.4';
                    ui.btnFill.title = `Марка на сайте (${siteWire}) ≠ пресет (${presetWire})`;
                } else {
                    ui.btnFill.style.opacity = '';
                    ui.btnFill.title = '';
                }
            } catch (e) { /* ignore */ }
            requestAnimationFrame(monitorWire);
        }

        /******************************************************************
         * DISCORD
         ******************************************************************/
        ui.discordLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://discord.gg/RC6HhTqCdR', '_blank');
        });

        /******************************************************************
         * ИНИЦИАЛИЗАЦИЯ
         ******************************************************************/
        ui.main.style.left = db.pos.x + 'px';
        ui.main.style.top  = db.pos.y + 'px';
        if (db.isCollapsed) {
            ui.body.style.display = 'none';
            ui.collapsedInfo.classList.add('visible');
            ui.btnMinimize.textContent = '+';
        }

        updateUI();
        monitorWire();

        console.log('✅ KOLUS v1.6.3 готов! | Created by KAST Team');
        document.getElementById('kolus-ui-host').style.display = db.isVisible ? 'block' : 'none';
    }

    /******************************************************************
     * УПРАВЛЕНИЕ ВИДИМОСТЬЮ UI
     ******************************************************************/
    function showUI() {
        const h = document.getElementById('kolus-ui-host');
        if (h) { h.style.display = 'block'; console.log('✅ KOLUS: UI показан'); }
    }
    function hideUI() {
        const h = document.getElementById('kolus-ui-host');
        if (h) { h.style.display = 'none'; console.log('🙈 KOLUS: UI скрыт'); }
    }
    function toggleUI() {
        window.kolusManuallyHidden = !window.kolusManuallyHidden;
        if (window.kolusManuallyHidden) {
            hideUI();
            showNotificationGlobal('🙈 KOLUS скрыт. ALT + З для показа', 'warning');
        } else if (isWireForm()) {
            showUI();
            showNotificationGlobal('✅ KOLUS показан. ALT + З для скрытия', 'success');
        }
    }
    function showNotificationGlobal(message, type = 'success') {
        const n = document.createElement('div');
        n.style.cssText = `position:fixed;top:20px;right:20px;background:${type==='success'?'linear-gradient(135deg,rgba(22,163,74,0.95),rgba(0,0,0,0.95))':'linear-gradient(135deg,rgba(234,179,8,0.95),rgba(0,0,0,0.95))'};border:1px solid ${type==='success'?'rgba(34,197,94,0.5)':'rgba(234,179,8,0.5)'};border-radius:10px;padding:12px 16px;color:#fff;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;z-index:1000001;box-shadow:0 8px 24px rgba(0,0,0,0.5);max-width:280px;`;
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => { setTimeout(() => n.remove(), 300); }, 3000);
    }

    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'з') { e.preventDefault(); toggleUI(); }
    });

    console.log('🚀 KOLUS v1.6.3 загружается...');
    console.log('💡 Горячая клавиша: ALT + З - показать/скрыть UI');

    window.kolusManuallyHidden = false;
    startFormObserver();
})();
