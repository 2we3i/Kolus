// ==UserScript==
// @name         KOLUS — Автозаполнение опоры
// @namespace    kolus.pillar
// @version      1.3.0
// @description  Постоянная панель автозаполнения формы опоры с настраиваемыми пресетами
// @match        https://lk.agentum.beget.tech/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'kolus_pillar_v1_2';

    const OPTIONS = {
        pillarTypes: ['Промежуточная', 'Концевая', 'Угловая', 'Отпаечная'],
        ownerships: ['РТК', 'Сторонняя'],
        materials: ['Железобетонная', 'Деревянная', 'Металлическая'],
        extraLoadTypes: [
            'Медная муфта',
            'Эксплуатационный запас кабеля',
            'УПМК',
            'Шкаф телекоммуникационный',
            'Шкаф с УПМК',
            'Шкаф электрический',
            'Точка подвеса линии связи УКН',
            'Точка подвеса линии связи УКП',
            'Точка подвеса линии связи Изолятор',
            'Коробка распределительная телефонная',
            'Коробка распределительная оптическая',
            'Маркировочные бирки',
            'Видеокамера',
            'Кабельная площадка',
            'Лестница',
            'Оптическая муфта'
        ]
    };

    // Типы оборудования, которые учитываются в количестве точек подвеса
    const SUSPENSION_POINT_TYPES = [
        'Лестница',
        'Кабельная площадка',
        'Видеокамера',
        'Коробка распределительная оптическая',
        'Коробка распределительная телефонная',
        'Точка подвеса линии связи Изолятор',
        'Точка подвеса линии связи УКП',
        'Точка подвеса линии связи УКН',
        'Шкаф электрический',
        'Шкаф с УПМК',
        'Шкаф телекоммуникационный',
        'УПМК',
        'Медная муфта'
    ];

    const DEFAULT_COMMENTS = [
        'Крепление не на штатном креплении.',
        'Нет панорамы.',
        'У опоры линия идет дальше.',
        'Опору не видно.',
        'Опору не можем установить.'
    ];

    function makeDefaultPreset(id, name, overrides = {}) {
        return {
            id,
            name,
            pillarType: 'Промежуточная',
            ownership: 'РТК',
            material: 'Железобетонная',
            communicationLines: '0',
            suspensionPoints: '0',
            pillarNumber: '',
            comment: '',
            footAccess: false,
            insertPlaceholder: true,
            autoCalcSuspension: true,
            uncheckEmergency: true,
            autoSign: false,
            attachments: [],
            extraLoads: [],
            ...overrides
        };
    }

    const defaultData = {
        presets: [
            makeDefaultPreset('pp1', '⚡ Стандарт ЖБ'),
            makeDefaultPreset('pp2', '🌲 Деревянная', {
                material: 'Деревянная',
                suspensionPoints: '1'
            })
        ],
        activeId: 'pp1',
        comments: [...DEFAULT_COMMENTS],
        pos: { x: 16, y: 16 },
        scale: 100,
        isCollapsed: false
    };

    let db = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultData;
    if (!Array.isArray(db.presets) || db.presets.length === 0) {
        db = { ...defaultData, ...db, presets: defaultData.presets };
    }
    if (!Array.isArray(db.comments) || db.comments.length === 0) {
        db.comments = [...DEFAULT_COMMENTS];
    }
    if (db.scale === undefined) db.scale = 100;
    if (db.isCollapsed === undefined) db.isCollapsed = false;

    // Миграция полей пресетов
    db.presets.forEach(p => {
        if (p.footAccess === undefined) p.footAccess = false;
        if (p.insertPlaceholder === undefined) p.insertPlaceholder = true;
        if (p.autoCalcSuspension === undefined) p.autoCalcSuspension = true;
        if (p.uncheckEmergency === undefined) p.uncheckEmergency = true;
        if (p.autoSign === undefined) p.autoSign = false;
    });

    const saveDb = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    const getActive = () => db.presets.find(p => p.id === db.activeId) || db.presets[0];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function calcSuspensionPoints(extraLoads) {
        return (extraLoads || []).reduce((sum, item) => {
            if (!item.type || !SUSPENSION_POINT_TYPES.includes(item.type)) return sum;
            return sum + (parseInt(item.quantity, 10) || 0);
        }, 0);
    }

    function isPillarForm() {
        return !!(
            document.querySelector('#report-pillar') &&
            document.querySelector('#pillar-type-select')
        );
    }

    function triggerFieldChange(el) {
        if (!el) return;
        if (window.jQuery) {
            jQuery(el).trigger('input').trigger('change');
        } else {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function setInputValue(input, value) {
        if (!input) return false;
        input.value = value;
        triggerFieldChange(input);
        return true;
    }

    function setCheckbox(selector, checked) {
        const el = document.querySelector(selector);
        if (!el) return false;
        el.checked = !!checked;
        triggerFieldChange(el);
        return true;
    }

    function setBootstrapSelect(selector, value) {
        const el = document.querySelector(selector);
        if (!el || value == null || value === '') return false;

        if (typeof SelectModule !== 'undefined') {
            SelectModule.add(selector, value);
            SelectModule.value(selector, value, false);
        } else {
            el.value = value;
            if (window.jQuery && jQuery(el).selectpicker) {
                jQuery(el).selectpicker('val', value);
                jQuery(el).selectpicker('refresh');
            }
        }
        triggerFieldChange(el);
        return true;
    }

    function invokeCheckChanges() {
        if (typeof Blank !== 'undefined' && typeof Blank.checkChanges === 'function') {
            Blank.checkChanges();
        } else if (typeof checkChanges === 'function') {
            checkChanges();
        }
    }

    async function waitForReportField(field, timeout = 8000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (typeof report !== 'undefined' && report[field]?.length > 0) return true;
            if (field === 'photos_pillar_general_view') {
                const img = document.querySelector('.photo-small-pillar-general-view');
                const src = img?.getAttribute('src') || '';
                if (src && !src.startsWith('data:image/png;base64,iVBORw0KGgo')) return true;
            }
            await sleep(100);
        }
        return false;
    }

    function syncReportFromPreset(preset, extraLoads, suspensionPoints) {
        if (typeof report === 'undefined' || !report) return;

        report.pillar_type = preset.pillarType;
        report.pillar_ownership = preset.ownership;
        report.pillar_material = preset.material;
        report.pillar_communication_lines_quantity = Math.max(0, parseInt(preset.communicationLines, 10) || 0);
        report.pillar_suspension_points_quantity = Math.max(0, parseInt(suspensionPoints, 10) || 0);
        report.pillar_comment = preset.comment || '';
        report.pillar_foot_access = !!preset.footAccess;

        if (preset.uncheckEmergency !== false) {
            report.pillar_emergency = false;
        }

        if (preset.pillarNumber) {
            report.pillar_number = preset.pillarNumber;
            report.pillar_name = String(preset.pillarNumber);
        }

        report.pillar_attachments = (preset.attachments || []).map(a => ({
            material: a.material || '',
            quantity: Math.min(10, Math.max(1, parseInt(a.quantity, 10) || 1))
        }));

        report.pillar_extra_loads = (extraLoads || []).map(e => ({
            type: e.type || '',
            quantity: Math.min(10, Math.max(1, parseInt(e.quantity, 10) || 1))
        }));
    }

    async function tryAutoSign(preset) {
        if (!preset.autoSign) return;

        invokeCheckChanges();

        const signBtn = document.querySelector('#create-report');
        if (signBtn?.classList.contains('locked')) {
            throw new Error('Автоподписание: кнопка «Подписать» недоступна — проверьте форму');
        }

        if (typeof Blank !== 'undefined' && typeof Blank.signingReport === 'function') {
            await new Promise(resolve => Blank.signingReport(resolve));
            return;
        }

        throw new Error('Автоподписание недоступно — модуль Blank.signingReport не найден');
    }

    function triggerQuantityChange(containerSelector, value) {
        const input = document.querySelector(`${containerSelector} input`);
        if (!input) return;
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function createWhiteSquareBlob(size = 200) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }

    async function insertPlaceholderPhoto() {
        const clipboardBtn = document.querySelector('#take-photo-clipboard-pillar-general-view');
        if (!clipboardBtn) {
            throw new Error('Кнопка вставки из буфера обмена не найдена на странице');
        }

        clipboardBtn.click();
        return true;
    }

    async function fillAttachments(attachments) {
        const count = Math.max(0, attachments.length);

        if (typeof report !== 'undefined') {
            report.pillar_attachments = attachments.map(a => ({
                material: a.material || '',
                quantity: Math.min(10, Math.max(1, parseInt(a.quantity, 10) || 1))
            }));
        }

        triggerQuantityChange('#adds-type-quantity', count);

        if (typeof renderPillarAttachments === 'function') {
            renderPillarAttachments(count);
        }

        await sleep(450);

        const materialSelects = [...document.querySelectorAll('[id$="-pillar-attachment-material"]')];
        const quantityInputs = [...document.querySelectorAll('[id$="-pillar-attachment-quantity"]')];

        attachments.forEach((item, i) => {
            if (materialSelects[i] && item.material) {
                setBootstrapSelect(`#${materialSelects[i].id}`, item.material);
            }
            if (quantityInputs[i] && item.quantity != null) {
                setInputValue(quantityInputs[i], String(item.quantity));
            }
        });
    }

    async function fillExtraLoads(extraLoads) {
        const count = Math.max(0, extraLoads.length);

        if (typeof report !== 'undefined') {
            report.pillar_extra_loads = extraLoads.map(e => ({
                type: e.type || '',
                quantity: Math.min(10, Math.max(1, parseInt(e.quantity, 10) || 1))
            }));
        }

        triggerQuantityChange('#extra-load-type-quantity', count);

        if (typeof renderPillarExtraLoads === 'function') {
            renderPillarExtraLoads(count);
        }

        await sleep(450);

        const typeSelects = [...document.querySelectorAll('[id$="-pillar-extra-load-type"]')];
        const quantityInputs = [...document.querySelectorAll('[id$="-pillar-extra-load-quantity"]')];

        extraLoads.forEach((item, i) => {
            if (typeSelects[i] && item.type) {
                setBootstrapSelect(`#${typeSelects[i].id}`, item.type);
            }
            if (quantityInputs[i] && item.quantity != null) {
                setInputValue(quantityInputs[i], String(item.quantity));
            }
        });
    }

    async function performFill(preset) {
        if (!isPillarForm()) {
            throw new Error('Откройте форму «Опора» — сейчас её нет на странице');
        }

        if (preset.insertPlaceholder !== false) {
            try {
                await insertPlaceholderPhoto();
            } catch (e) {
                console.warn('[KOLUS Pillar] Фото-заглушка:', e.message);
            }
        }

        const extraLoads = preset.extraLoads || [];
        let suspensionPoints = preset.suspensionPoints || '0';

        if (preset.autoCalcSuspension !== false) {
            suspensionPoints = String(calcSuspensionPoints(extraLoads));
        }

        setBootstrapSelect('#pillar-type-select', preset.pillarType);
        await sleep(120);
        setBootstrapSelect('#pillar-ownership-select', preset.ownership);
        await sleep(120);
        setBootstrapSelect('#pillar-material-select', preset.material);
        await sleep(120);

        setInputValue(
            document.querySelector('#pillar-communication-lines-quantity-input'),
            preset.communicationLines || '0'
        );

        await fillAttachments(preset.attachments || []);
        await fillExtraLoads(extraLoads);

        setInputValue(
            document.querySelector('#pillar-suspension-points-quantity-input'),
            suspensionPoints
        );

        if (preset.pillarNumber) {
            setInputValue(document.querySelector('#pillar-number-input'), preset.pillarNumber);
        }

        setInputValue(document.querySelector('#pillar-comment'), preset.comment || '');

        setCheckbox('#pillar-foot-access-checkbox', !!preset.footAccess);

        if (preset.uncheckEmergency !== false) {
            setCheckbox('#pillar-emergency-checkbox', false);
        }

        syncReportFromPreset(preset, extraLoads, suspensionPoints);
        invokeCheckChanges();

        if (preset.autoSign) {
            await tryAutoSign(preset);
        }
    }

    function scanSiteData() {
        const data = {};

        const typeEl = document.querySelector('#pillar-type-select');
        if (typeEl?.value) data.pillarType = typeEl.value;

        const ownershipEl = document.querySelector('#pillar-ownership-select');
        if (ownershipEl?.value) data.ownership = ownershipEl.value;

        const materialEl = document.querySelector('#pillar-material-select');
        if (materialEl?.value) data.material = materialEl.value;

        const commEl = document.querySelector('#pillar-communication-lines-quantity-input');
        if (commEl) data.communicationLines = commEl.value || '0';

        const suspEl = document.querySelector('#pillar-suspension-points-quantity-input');
        if (suspEl) data.suspensionPoints = suspEl.value || '0';

        const numberEl = document.querySelector('#pillar-number-input');
        if (numberEl?.value) data.pillarNumber = numberEl.value;

        const commentEl = document.querySelector('#pillar-comment');
        if (commentEl?.value) data.comment = commentEl.value;

        const footEl = document.querySelector('#pillar-foot-access-checkbox');
        if (footEl) data.footAccess = footEl.checked;

        data.attachments = [];
        document.querySelectorAll('[id$="-pillar-attachment-material"]').forEach((sel, i) => {
            const qtyEl = document.querySelectorAll('[id$="-pillar-attachment-quantity"]')[i];
            if (sel.value) {
                data.attachments.push({
                    material: sel.value,
                    quantity: qtyEl?.value || '1'
                });
            }
        });

        data.extraLoads = [];
        document.querySelectorAll('[id$="-pillar-extra-load-type"]').forEach((sel, i) => {
            const qtyEl = document.querySelectorAll('[id$="-pillar-extra-load-quantity"]')[i];
            if (sel.value) {
                data.extraLoads.push({
                    type: sel.value,
                    quantity: qtyEl?.value || '1'
                });
            }
        });

        return data;
    }

    function buildOptions(arr, selected) {
        return arr.map(v => `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`).join('');
    }

    function generatePresetId() {
        return 'pp' + Date.now() + Math.random().toString(36).slice(2, 6);
    }

    function initializeUI() {
        if (window.kolusPillarUI) return;
        window.kolusPillarUI = true;

        const host = document.createElement('div');
        host.id = 'kolus-pillar-host';
        host.style.cssText = 'position:fixed;z-index:1000000;pointer-events:none;';
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });

        const css = `
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
            .panel {
                position: fixed; width: 400px; pointer-events: auto;
                background: linear-gradient(145deg, #1a2e1f 0%, #14532d 100%);
                color: #fff; border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08);
                display: flex; flex-direction: column; max-height: 92vh;
                transform-origin: top left;
            }
            .header {
                padding: 12px 14px; cursor: move; user-select: none;
                background: rgba(0,0,0,.25); border-bottom: 1px solid rgba(255,255,255,.08);
                display: flex; justify-content: space-between; align-items: center;
            }
            .header-title { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
            .header-controls { display: flex; gap: 6px; align-items: center; }
            .icon-btn {
                width: 28px; height: 28px; border: none; border-radius: 6px;
                background: rgba(255,255,255,.1); color: #fff; cursor: pointer;
            }
            .icon-btn:hover { background: rgba(255,255,255,.18); }
            .scale-val { font-size: 11px; min-width: 36px; text-align: center; opacity: .85; }
            .status {
                margin: 10px 14px 0; padding: 8px 10px; border-radius: 10px; font-size: 12px;
                background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.08);
            }
            .status.ok { color: #86efac; border-color: rgba(34,197,94,.35); }
            .status.warn { color: #fde68a; border-color: rgba(234,179,8,.35); }
            .status.error { color: #fca5a5; border-color: rgba(239,68,68,.35); }
            .body {
                padding: 12px 14px 88px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
            }
            .body::-webkit-scrollbar { width: 6px; }
            .body::-webkit-scrollbar-thumb { background: rgba(34,197,94,.45); border-radius: 3px; }
            label {
                display: block; font-size: 10px; font-weight: 600; text-transform: uppercase;
                letter-spacing: .4px; color: rgba(255,255,255,.65); margin-bottom: 4px;
            }
            select, input, textarea {
                width: 100%; padding: 9px 11px; border-radius: 10px;
                border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.28); color: #fff;
                font-size: 13px; outline: none;
            }
            select:focus, input:focus, textarea:focus {
                border-color: rgba(34,197,94,.55);
                box-shadow: 0 0 0 3px rgba(34,197,94,.12);
            }
            textarea { min-height: 64px; resize: vertical; }
            .group { display: flex; flex-direction: column; }
            .row { display: flex; gap: 8px; }
            .row > .group { flex: 1; min-width: 0; }
            .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent); margin: 2px 0; }
            .preset-row { display: flex; gap: 6px; align-items: center; }
            .preset-row select { flex: 1; }
            .preset-btn {
                width: 34px; height: 34px; border: none; border-radius: 8px; cursor: pointer; flex-shrink: 0;
            }
            .preset-btn.add { background: rgba(34,197,94,.22); color: #86efac; }
            .preset-btn.edit { background: rgba(234,179,8,.22); color: #fde68a; }
            .preset-btn.delete { background: rgba(239,68,68,.22); color: #fca5a5; }
            .sub-block {
                border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 10px;
                display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,.15);
            }
            .sub-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.85); }
            .list-item {
                border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 8px;
                display: flex; flex-direction: column; gap: 6px; background: rgba(0,0,0,.12);
            }
            .list-item-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; opacity: .8; }
            .list-item-head button {
                border: none; background: rgba(239,68,68,.2); color: #fca5a5;
                border-radius: 6px; padding: 2px 8px; cursor: pointer; font-size: 11px;
            }
            .mini-btn {
                border: none; border-radius: 8px; padding: 8px 10px; cursor: pointer;
                background: rgba(34,197,94,.18); color: #86efac; font-size: 12px; font-weight: 600;
            }
            .mini-btn.secondary {
                background: rgba(255,255,255,.1); color: rgba(255,255,255,.85);
            }
            .footer {
                position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 14px;
                display: flex; gap: 8px; background: linear-gradient(180deg, transparent, rgba(0,0,0,.35));
                border-top: 1px solid rgba(255,255,255,.08);
            }
            .btn {
                flex: 1; border: none; border-radius: 10px; padding: 11px 12px;
                cursor: pointer; font-size: 13px; font-weight: 600;
            }
            .btn:disabled { opacity: .45; cursor: not-allowed; }
            .btn-fill { background: linear-gradient(135deg, #22c55e, #16a34a); color: #052e16; }
            .btn-scan { background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.12); }
            .btn-save { background: rgba(59,130,246,.25); color: #bfdbfe; border: 1px solid rgba(59,130,246,.35); }
            .toggle-row {
                display: flex; flex-wrap: wrap; gap: 8px;
            }
            .toggle-chip {
                display: flex; align-items: center; gap: 6px; padding: 7px 10px;
                border-radius: 10px; background: rgba(0,0,0,.22);
                border: 1px solid rgba(255,255,255,.12); cursor: pointer;
                font-size: 12px; user-select: none;
            }
            .toggle-chip input { width: auto; margin: 0; accent-color: #22c55e; }
            .toggle-chip.active { border-color: rgba(34,197,94,.45); background: rgba(34,197,94,.12); }
            .math-hint {
                font-size: 11px; padding: 6px 8px; border-radius: 8px;
                background: rgba(0,0,0,.2); border: 1px solid rgba(255,255,255,.08);
            }
            .math-hint.ok { color: #86efac; border-color: rgba(34,197,94,.3); }
            .math-hint.bad { color: #fca5a5; border-color: rgba(239,68,68,.3); }
            .comment-row { display: flex; gap: 6px; align-items: stretch; }
            .comment-row select { flex: 1; }
            .comment-row button {
                width: 34px; border: none; border-radius: 8px; cursor: pointer;
                background: rgba(234,179,8,.22); color: #fde68a; flex-shrink: 0;
            }
            .modal-overlay {
                display: none; position: fixed; inset: 0; background: rgba(0,0,0,.65);
                align-items: center; justify-content: center; z-index: 1000001;
            }
            .modal {
                width: 90%; max-width: 380px; max-height: 80vh; overflow-y: auto;
                background: #14532d; border-radius: 14px;
                padding: 18px; border: 1px solid rgba(255,255,255,.12);
            }
            .modal-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
            .modal-actions { display: flex; gap: 8px; margin-top: 14px; }
            .comment-item {
                display: flex; gap: 6px; margin-bottom: 8px; align-items: center;
            }
            .comment-item input { flex: 1; }
            .comment-item button {
                border: none; border-radius: 6px; padding: 6px 8px; cursor: pointer;
                background: rgba(239,68,68,.2); color: #fca5a5; flex-shrink: 0;
            }
            .notification {
                position: fixed; top: 16px; right: 16px; z-index: 1000002;
                padding: 12px 16px; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 600;
                box-shadow: 0 10px 30px rgba(0,0,0,.4);
            }
            .notification.success { background: linear-gradient(135deg, rgba(22,163,74,.95), rgba(0,0,0,.95)); }
            .notification.warning { background: linear-gradient(135deg, rgba(234,179,8,.95), rgba(0,0,0,.95)); }
            .notification.error { background: linear-gradient(135deg, rgba(239,68,68,.95), rgba(0,0,0,.95)); }
        `;

        const html = `
            <div class="panel" id="panel">
                <div class="header" id="dragHandle">
                    <div class="header-title"><span>🏗️</span><span>KOLUS — Опора</span></div>
                    <div class="header-controls">
                        <button class="icon-btn" id="btnScaleDown" title="Уменьшить">−</button>
                        <span class="scale-val" id="scaleValue">100%</span>
                        <button class="icon-btn" id="btnScaleUp" title="Увеличить">+</button>
                        <button class="icon-btn" id="btnMinimize" title="Свернуть">−</button>
                    </div>
                </div>

                <div class="status warn" id="formStatus">⏳ Панель всегда видна. Откройте форму «Опора» для заполнения.</div>

                <div class="body" id="bodyContent">
                    <div class="group">
                        <label>Пресет</label>
                        <div class="preset-row">
                            <select id="presetSelect"></select>
                            <button class="preset-btn add" id="btnAddPreset" title="Новый пресет">+</button>
                            <button class="preset-btn edit" id="btnEditPreset" title="Переименовать">✏️</button>
                            <button class="preset-btn delete" id="btnDeletePreset" title="Удалить">🗑️</button>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="toggle-row">
                        <label class="toggle-chip" id="chipFootAccess">
                            <input type="checkbox" id="footAccess"> Пеший выход
                        </label>
                        <label class="toggle-chip" id="chipPlaceholder">
                            <input type="checkbox" id="insertPlaceholder" checked> Фото-заглушка
                        </label>
                        <label class="toggle-chip" id="chipAutoCalc">
                            <input type="checkbox" id="autoCalcSuspension" checked> Авто-точки
                        </label>
                        <label class="toggle-chip" id="chipUncheckEmergency">
                            <input type="checkbox" id="uncheckEmergency" checked> Снять «аварийная»
                        </label>
                        <label class="toggle-chip" id="chipAutoSign">
                            <input type="checkbox" id="autoSign"> Автоподписание
                        </label>
                    </div>

                    <div class="group">
                        <label>Тип опоры</label>
                        <select id="pillarType"></select>
                    </div>

                    <div class="row">
                        <div class="group">
                            <label>Принадлежность опоры</label>
                            <select id="ownership"></select>
                        </div>
                        <div class="group">
                            <label>Материал опоры</label>
                            <select id="material"></select>
                        </div>
                    </div>

                    <div class="row">
                        <div class="group">
                            <label>Кол-во линий связи</label>
                            <input id="communicationLines" type="number" min="0" step="1">
                        </div>
                        <div class="group">
                            <label>Кол-во точек подвеса</label>
                            <input id="suspensionPoints" type="number" min="0" step="1">
                        </div>
                    </div>

                    <div class="math-hint" id="mathHint">Расчёт: 0 (нет доп. нагрузки)</div>

                    <div class="group">
                        <label>Номер опоры</label>
                        <input id="pillarNumber" type="text" placeholder="Например: 12">
                    </div>

                    <div class="sub-block">
                        <div class="sub-title">Приставки</div>
                        <div id="attachmentsList"></div>
                        <button class="mini-btn" id="btnAddAttachment" type="button">+ Добавить тип приставки</button>
                    </div>

                    <div class="sub-block">
                        <div class="sub-title">Доп. нагрузка</div>
                        <div id="extraLoadsList"></div>
                        <button class="mini-btn" id="btnAddExtraLoad" type="button">+ Добавить тип нагрузки</button>
                        <button class="mini-btn secondary" id="btnRecalcSuspension" type="button">↻ Пересчитать точки подвеса</button>
                    </div>

                    <div class="group">
                        <label>Комментарий (шаблон)</label>
                        <div class="comment-row">
                            <select id="commentSelect">
                                <option value="">— Выберите комментарий —</option>
                            </select>
                            <button id="btnEditComments" title="Редактировать шаблоны">✏️</button>
                        </div>
                    </div>

                    <div class="group">
                        <label>Комментарий (текст)</label>
                        <textarea id="comment" placeholder="Комментарий..."></textarea>
                    </div>
                </div>

                <div class="footer">
                    <button class="btn btn-scan" id="btnScan">🔍 Сканировать</button>
                    <button class="btn btn-save" id="btnSavePreset">💾 Сохранить</button>
                    <button class="btn btn-fill" id="btnFill">✨ Заполнить</button>
                </div>
            </div>

            <div class="modal-overlay" id="modalName">
                <div class="modal">
                    <div class="modal-title" id="modalNameTitle">Название пресета</div>
                    <input id="modalNameInput" type="text" placeholder="Введите название...">
                    <div class="modal-actions">
                        <button class="btn btn-scan" id="modalNameCancel">Отмена</button>
                        <button class="btn btn-fill" id="modalNameConfirm">OK</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" id="modalComments">
                <div class="modal">
                    <div class="modal-title">✏️ Шаблоны комментариев</div>
                    <div id="commentsEditor"></div>
                    <button class="mini-btn" id="btnAddComment" type="button" style="width:100%;margin-top:8px;">+ Добавить комментарий</button>
                    <div class="modal-actions">
                        <button class="btn btn-scan" id="modalCommentsCancel">Отмена</button>
                        <button class="btn btn-fill" id="modalCommentsSave">Сохранить</button>
                    </div>
                </div>
            </div>
        `;

        shadow.innerHTML = `<style>${css}</style>${html}`;

        const ui = {
            panel: shadow.querySelector('#panel'),
            body: shadow.querySelector('#bodyContent'),
            formStatus: shadow.querySelector('#formStatus'),
            presetSelect: shadow.querySelector('#presetSelect'),
            pillarType: shadow.querySelector('#pillarType'),
            ownership: shadow.querySelector('#ownership'),
            material: shadow.querySelector('#material'),
            communicationLines: shadow.querySelector('#communicationLines'),
            suspensionPoints: shadow.querySelector('#suspensionPoints'),
            pillarNumber: shadow.querySelector('#pillarNumber'),
            attachmentsList: shadow.querySelector('#attachmentsList'),
            extraLoadsList: shadow.querySelector('#extraLoadsList'),
            comment: shadow.querySelector('#comment'),
            commentSelect: shadow.querySelector('#commentSelect'),
            footAccess: shadow.querySelector('#footAccess'),
            insertPlaceholder: shadow.querySelector('#insertPlaceholder'),
            autoCalcSuspension: shadow.querySelector('#autoCalcSuspension'),
            uncheckEmergency: shadow.querySelector('#uncheckEmergency'),
            autoSign: shadow.querySelector('#autoSign'),
            mathHint: shadow.querySelector('#mathHint'),
            btnFill: shadow.querySelector('#btnFill'),
            btnScan: shadow.querySelector('#btnScan'),
            btnSavePreset: shadow.querySelector('#btnSavePreset'),
            btnAddPreset: shadow.querySelector('#btnAddPreset'),
            btnEditPreset: shadow.querySelector('#btnEditPreset'),
            btnDeletePreset: shadow.querySelector('#btnDeletePreset'),
            btnAddAttachment: shadow.querySelector('#btnAddAttachment'),
            btnAddExtraLoad: shadow.querySelector('#btnAddExtraLoad'),
            btnRecalcSuspension: shadow.querySelector('#btnRecalcSuspension'),
            btnEditComments: shadow.querySelector('#btnEditComments'),
            btnMinimize: shadow.querySelector('#btnMinimize'),
            btnScaleUp: shadow.querySelector('#btnScaleUp'),
            btnScaleDown: shadow.querySelector('#btnScaleDown'),
            scaleValue: shadow.querySelector('#scaleValue'),
            modalName: shadow.querySelector('#modalName'),
            modalNameTitle: shadow.querySelector('#modalNameTitle'),
            modalNameInput: shadow.querySelector('#modalNameInput'),
            modalNameCancel: shadow.querySelector('#modalNameCancel'),
            modalNameConfirm: shadow.querySelector('#modalNameConfirm'),
            modalComments: shadow.querySelector('#modalComments'),
            commentsEditor: shadow.querySelector('#commentsEditor'),
            btnAddComment: shadow.querySelector('#btnAddComment'),
            modalCommentsCancel: shadow.querySelector('#modalCommentsCancel'),
            modalCommentsSave: shadow.querySelector('#modalCommentsSave')
        };

        let draftAttachments = [];
        let draftExtraLoads = [];
        let modalResolve = null;
        let draftComments = [];

        function notify(message, type = 'success') {
            const n = document.createElement('div');
            n.className = `notification ${type}`;
            n.textContent = message;
            shadow.appendChild(n);
            setTimeout(() => n.remove(), 2800);
        }

        function updateToggleChips() {
            ['chipFootAccess', 'chipPlaceholder', 'chipAutoCalc', 'chipUncheckEmergency', 'chipAutoSign'].forEach(id => {
                const chip = shadow.querySelector('#' + id);
                const input = chip?.querySelector('input');
                if (chip && input) chip.classList.toggle('active', input.checked);
            });
        }

        function updateMathHint() {
            const calculated = calcSuspensionPoints(draftExtraLoads);
            const current = parseInt(ui.suspensionPoints.value, 10) || 0;
            const match = calculated === current;

            if (draftExtraLoads.length === 0) {
                ui.mathHint.textContent = 'Расчёт: 0 (нет доп. нагрузки для подсчёта)';
                ui.mathHint.className = 'math-hint';
                return;
            }

            if (match) {
                ui.mathHint.textContent = `✓ Математика сходится: ${calculated} точек подвеса`;
                ui.mathHint.className = 'math-hint ok';
            } else {
                ui.mathHint.textContent = `⚠ Расчёт: ${calculated}, указано: ${current} — не совпадает`;
                ui.mathHint.className = 'math-hint bad';
            }
        }

        function applyAutoSuspension() {
            if (!ui.autoCalcSuspension.checked) return;
            ui.suspensionPoints.value = String(calcSuspensionPoints(draftExtraLoads));
            updateMathHint();
        }

        function refreshCommentSelect() {
            ui.commentSelect.innerHTML =
                '<option value="">— Выберите комментарий —</option>' +
                db.comments.map(c => `<option value="${c.replace(/"/g, '&quot;')}">${c}</option>`).join('');
        }

        function updateFormStatus() {
            if (isPillarForm()) {
                ui.formStatus.textContent = '✅ Форма «Опора» открыта — можно заполнять';
                ui.formStatus.className = 'status ok';
            } else {
                ui.formStatus.textContent = '⚠️ Панель всегда видна. Откройте форму «Опора» для заполнения.';
                ui.formStatus.className = 'status warn';
            }
            ui.btnFill.disabled = false;
        }

        function updateScale() {
            ui.panel.style.transform = `scale(${db.scale / 100})`;
            ui.scaleValue.textContent = `${db.scale}%`;
        }

        function renderAttachmentEditor() {
            if (draftAttachments.length === 0) {
                ui.attachmentsList.innerHTML = '<div style="font-size:12px;opacity:.65;">Нет приставок</div>';
                return;
            }
            ui.attachmentsList.innerHTML = draftAttachments.map((item, i) => `
                <div class="list-item" data-index="${i}">
                    <div class="list-item-head">
                        <span>Тип ${i + 1}</span>
                        <button type="button" data-remove-attachment="${i}">Удалить</button>
                    </div>
                    <div class="group">
                        <label>Материал</label>
                        <select data-attachment-material="${i}">${buildOptions(OPTIONS.materials, item.material)}</select>
                    </div>
                    <div class="group">
                        <label>Количество приставок</label>
                        <input data-attachment-quantity="${i}" type="number" min="1" max="10" value="${item.quantity || '1'}">
                    </div>
                </div>
            `).join('');

            ui.attachmentsList.querySelectorAll('[data-attachment-material]').forEach(el => {
                el.addEventListener('change', e => {
                    draftAttachments[+e.target.dataset.attachmentMaterial].material = e.target.value;
                });
            });
            ui.attachmentsList.querySelectorAll('[data-attachment-quantity]').forEach(el => {
                el.addEventListener('input', e => {
                    draftAttachments[+e.target.dataset.attachmentQuantity].quantity = e.target.value;
                });
            });
            ui.attachmentsList.querySelectorAll('[data-remove-attachment]').forEach(el => {
                el.addEventListener('click', e => {
                    draftAttachments.splice(+e.currentTarget.dataset.removeAttachment, 1);
                    renderAttachmentEditor();
                });
            });
        }

        function renderExtraLoadEditor() {
            if (draftExtraLoads.length === 0) {
                ui.extraLoadsList.innerHTML = '<div style="font-size:12px;opacity:.65;">Нет доп. нагрузки</div>';
                applyAutoSuspension();
                return;
            }
            ui.extraLoadsList.innerHTML = draftExtraLoads.map((item, i) => `
                <div class="list-item" data-index="${i}">
                    <div class="list-item-head">
                        <span>Тип ${i + 1}${SUSPENSION_POINT_TYPES.includes(item.type) ? ' ⚡' : ''}</span>
                        <button type="button" data-remove-extra="${i}">Удалить</button>
                    </div>
                    <div class="group">
                        <label>Тип оборудования</label>
                        <select data-extra-type="${i}">${buildOptions(OPTIONS.extraLoadTypes, item.type)}</select>
                    </div>
                    <div class="group">
                        <label>Количество</label>
                        <input data-extra-quantity="${i}" type="number" min="1" max="10" value="${item.quantity || '1'}">
                    </div>
                </div>
            `).join('');

            ui.extraLoadsList.querySelectorAll('[data-extra-type]').forEach(el => {
                el.addEventListener('change', e => {
                    draftExtraLoads[+e.target.dataset.extraType].type = e.target.value;
                    renderExtraLoadEditor();
                });
            });
            ui.extraLoadsList.querySelectorAll('[data-extra-quantity]').forEach(el => {
                el.addEventListener('input', e => {
                    draftExtraLoads[+e.target.dataset.extraQuantity].quantity = e.target.value;
                    applyAutoSuspension();
                });
            });
            ui.extraLoadsList.querySelectorAll('[data-remove-extra]').forEach(el => {
                el.addEventListener('click', e => {
                    draftExtraLoads.splice(+e.currentTarget.dataset.removeExtra, 1);
                    renderExtraLoadEditor();
                });
            });
            applyAutoSuspension();
        }

        function readFormDraft() {
            return {
                pillarType: ui.pillarType.value,
                ownership: ui.ownership.value,
                material: ui.material.value,
                communicationLines: ui.communicationLines.value || '0',
                suspensionPoints: ui.suspensionPoints.value || '0',
                pillarNumber: ui.pillarNumber.value,
                comment: ui.comment.value,
                footAccess: ui.footAccess.checked,
                insertPlaceholder: ui.insertPlaceholder.checked,
                autoCalcSuspension: ui.autoCalcSuspension.checked,
                uncheckEmergency: ui.uncheckEmergency.checked,
                autoSign: ui.autoSign.checked,
                attachments: draftAttachments.map(a => ({
                    material: a.material,
                    quantity: String(a.quantity || '1')
                })),
                extraLoads: draftExtraLoads.map(e => ({
                    type: e.type,
                    quantity: String(e.quantity || '1')
                }))
            };
        }

        function loadDraftFromPreset(preset) {
            ui.pillarType.innerHTML = buildOptions(OPTIONS.pillarTypes, preset.pillarType);
            ui.ownership.innerHTML = buildOptions(OPTIONS.ownerships, preset.ownership);
            ui.material.innerHTML = buildOptions(OPTIONS.materials, preset.material);
            ui.communicationLines.value = preset.communicationLines || '0';
            ui.suspensionPoints.value = preset.suspensionPoints || '0';
            ui.pillarNumber.value = preset.pillarNumber || '';
            ui.comment.value = preset.comment || '';
            ui.footAccess.checked = !!preset.footAccess;
            ui.insertPlaceholder.checked = preset.insertPlaceholder !== false;
            ui.autoCalcSuspension.checked = preset.autoCalcSuspension !== false;
            ui.uncheckEmergency.checked = preset.uncheckEmergency !== false;
            ui.autoSign.checked = !!preset.autoSign;
            updateToggleChips();
            draftAttachments = (preset.attachments || []).map(a => ({ ...a }));
            draftExtraLoads = (preset.extraLoads || []).map(e => ({ ...e }));
            renderAttachmentEditor();
            renderExtraLoadEditor();
            updateMathHint();
        }

        function refreshPresetSelect() {
            ui.presetSelect.innerHTML = db.presets.map(p =>
                `<option value="${p.id}"${p.id === db.activeId ? ' selected' : ''}>${p.name}</option>`
            ).join('');
        }

        function updateUI() {
            refreshPresetSelect();
            refreshCommentSelect();
            loadDraftFromPreset(getActive());
            updateScale();
            updateFormStatus();
            ui.body.style.display = db.isCollapsed ? 'none' : 'block';
            ui.btnMinimize.textContent = db.isCollapsed ? '+' : '−';
        }

        function showNameModal(title, defaultValue = '') {
            return new Promise(resolve => {
                modalResolve = resolve;
                ui.modalNameTitle.textContent = title;
                ui.modalNameInput.value = defaultValue;
                ui.modalName.style.display = 'flex';
                setTimeout(() => ui.modalNameInput.focus(), 50);
            });
        }

        function hideNameModal(result) {
            ui.modalName.style.display = 'none';
            if (modalResolve) modalResolve(result);
            modalResolve = null;
        }

        function renderCommentsEditor() {
            ui.commentsEditor.innerHTML = draftComments.map((c, i) => `
                <div class="comment-item">
                    <input type="text" data-comment-index="${i}" value="${c.replace(/"/g, '&quot;')}">
                    <button type="button" data-delete-comment="${i}">✕</button>
                </div>
            `).join('');

            ui.commentsEditor.querySelectorAll('[data-comment-index]').forEach(el => {
                el.addEventListener('input', e => {
                    draftComments[+e.target.dataset.commentIndex] = e.target.value;
                });
            });
            ui.commentsEditor.querySelectorAll('[data-delete-comment]').forEach(el => {
                el.addEventListener('click', e => {
                    draftComments.splice(+e.currentTarget.dataset.deleteComment, 1);
                    renderCommentsEditor();
                });
            });
        }

        ui.modalNameCancel.addEventListener('click', () => hideNameModal(null));
        ui.modalNameConfirm.addEventListener('click', () => {
            const val = ui.modalNameInput.value.trim();
            hideNameModal(val || null);
        });
        ui.modalNameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') ui.modalNameConfirm.click();
            if (e.key === 'Escape') ui.modalNameCancel.click();
        });
        ui.modalName.addEventListener('click', e => {
            if (e.target === ui.modalName) hideNameModal(null);
        });

        ui.presetSelect.addEventListener('change', () => {
            db.activeId = ui.presetSelect.value;
            saveDb();
            loadDraftFromPreset(getActive());
        });

        ui.btnAddPreset.addEventListener('click', async () => {
            const name = await showNameModal('➕ Создать новый пресет');
            if (!name) return;
            const current = readFormDraft();
            const np = makeDefaultPreset(generatePresetId(), name, current);
            db.presets.push(np);
            db.activeId = np.id;
            saveDb();
            updateUI();
            notify(`Пресет «${name}» создан`);
        });

        ui.btnEditPreset.addEventListener('click', async () => {
            const preset = getActive();
            const name = await showNameModal('✏️ Переименовать пресет', preset.name);
            if (!name) return;
            preset.name = name;
            saveDb();
            updateUI();
            notify('Пресет переименован');
        });

        ui.btnDeletePreset.addEventListener('click', async () => {
            if (db.presets.length <= 1) {
                notify('Нельзя удалить последний пресет', 'warning');
                return;
            }
            const preset = getActive();
            const ok = confirm(`Удалить пресет «${preset.name}»?`);
            if (!ok) return;
            const idx = db.presets.findIndex(p => p.id === db.activeId);
            db.presets = db.presets.filter(p => p.id !== db.activeId);
            db.activeId = db.presets[Math.min(idx, db.presets.length - 1)].id;
            saveDb();
            updateUI();
            notify('Пресет удалён');
        });

        ui.btnSavePreset.addEventListener('click', () => {
            Object.assign(getActive(), readFormDraft());
            saveDb();
            notify('Пресет сохранён');
        });

        ui.btnAddAttachment.addEventListener('click', () => {
            draftAttachments.push({ material: OPTIONS.materials[0], quantity: '1' });
            renderAttachmentEditor();
        });

        ui.btnAddExtraLoad.addEventListener('click', () => {
            draftExtraLoads.push({ type: OPTIONS.extraLoadTypes[0], quantity: '1' });
            renderExtraLoadEditor();
        });

        ui.btnRecalcSuspension.addEventListener('click', () => {
            ui.suspensionPoints.value = String(calcSuspensionPoints(draftExtraLoads));
            updateMathHint();
            notify('Точки подвеса пересчитаны');
        });

        ui.commentSelect.addEventListener('change', () => {
            if (ui.commentSelect.value) {
                ui.comment.value = ui.commentSelect.value;
            }
        });

        ui.btnEditComments.addEventListener('click', () => {
            draftComments = [...db.comments];
            renderCommentsEditor();
            ui.modalComments.style.display = 'flex';
        });

        ui.btnAddComment.addEventListener('click', () => {
            draftComments.push('Новый комментарий');
            renderCommentsEditor();
        });

        ui.modalCommentsCancel.addEventListener('click', () => {
            ui.modalComments.style.display = 'none';
        });

        ui.modalCommentsSave.addEventListener('click', () => {
            db.comments = draftComments.map(c => c.trim()).filter(Boolean);
            if (db.comments.length === 0) db.comments = [...DEFAULT_COMMENTS];
            saveDb();
            refreshCommentSelect();
            ui.modalComments.style.display = 'none';
            notify('Шаблоны комментариев сохранены');
        });

        ui.modalComments.addEventListener('click', e => {
            if (e.target === ui.modalComments) ui.modalComments.style.display = 'none';
        });

        [ui.footAccess, ui.insertPlaceholder, ui.autoCalcSuspension, ui.uncheckEmergency, ui.autoSign].forEach(el => {
            el.addEventListener('change', () => {
                updateToggleChips();
                if (el === ui.autoCalcSuspension && ui.autoCalcSuspension.checked) {
                    applyAutoSuspension();
                }
                if (el === ui.footAccess && isPillarForm()) {
                    setCheckbox('#pillar-foot-access-checkbox', ui.footAccess.checked);
                }
            });
        });

        ui.suspensionPoints.addEventListener('input', updateMathHint);

        ui.btnScan.addEventListener('click', () => {
            if (!isPillarForm()) {
                notify('Форма «Опора» не найдена', 'warning');
                return;
            }
            const data = scanSiteData();
            if (data.pillarType) ui.pillarType.value = data.pillarType;
            if (data.ownership) ui.ownership.value = data.ownership;
            if (data.material) ui.material.value = data.material;
            ui.communicationLines.value = data.communicationLines || '0';
            ui.suspensionPoints.value = data.suspensionPoints || '0';
            ui.pillarNumber.value = data.pillarNumber || '';
            ui.comment.value = data.comment || '';
            ui.footAccess.checked = !!data.footAccess;
            updateToggleChips();
            draftAttachments = data.attachments || [];
            draftExtraLoads = data.extraLoads || [];
            renderAttachmentEditor();
            renderExtraLoadEditor();
            updateMathHint();
            notify('Данные считаны с формы');
        });

        ui.btnFill.addEventListener('click', async () => {
            ui.btnFill.disabled = true;
            ui.btnFill.textContent = '⏳...';
            try {
                const data = readFormDraft();
                await performFill(data);
                notify(data.autoSign ? 'Форма заполнена и подписана' : 'Форма заполнена');
            } catch (e) {
                console.error('[KOLUS Pillar]', e);
                notify(e.message, 'error');
            } finally {
                ui.btnFill.disabled = false;
                ui.btnFill.textContent = '✨ Заполнить';
            }
        });

        ui.btnMinimize.addEventListener('click', () => {
            db.isCollapsed = !db.isCollapsed;
            ui.body.style.display = db.isCollapsed ? 'none' : 'block';
            ui.btnMinimize.textContent = db.isCollapsed ? '+' : '−';
            saveDb();
        });

        ui.btnScaleUp.addEventListener('click', () => {
            if (db.scale < 150) { db.scale += 5; updateScale(); saveDb(); }
        });
        ui.btnScaleDown.addEventListener('click', () => {
            if (db.scale > 60) { db.scale -= 5; updateScale(); saveDb(); }
        });

        let dragging = false, ox = 0, oy = 0;
        shadow.querySelector('#dragHandle').addEventListener('mousedown', e => {
            if (e.target.closest('.icon-btn')) return;
            dragging = true;
            ox = e.clientX - ui.panel.offsetLeft;
            oy = e.clientY - ui.panel.offsetTop;
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            ui.panel.style.left = (e.clientX - ox) + 'px';
            ui.panel.style.top = (e.clientY - oy) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            db.pos = { x: ui.panel.offsetLeft, y: ui.panel.offsetTop };
            saveDb();
        });

        ui.panel.style.left = db.pos.x + 'px';
        ui.panel.style.top = db.pos.y + 'px';
        updateUI();

        setInterval(updateFormStatus, 1000);
        new MutationObserver(updateFormStatus).observe(document.body, { childList: true, subtree: true });

        console.log('✅ KOLUS Pillar v1.3.0 — панель всегда видна');
    }

    function boot() {
        if (document.body) {
            initializeUI();
            return;
        }
        const obs = new MutationObserver(() => {
            if (document.body) {
                obs.disconnect();
                initializeUI();
            }
        });
        obs.observe(document.documentElement, { childList: true });
    }

    boot();
})();
