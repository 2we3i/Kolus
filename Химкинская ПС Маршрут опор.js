// ==UserScript==
// @name         Маршрут опор v3.2
// @namespace    pillar.route.v32.kast
// @version      3.2.0
// @description  Визуальный маршрут · старт с любой цифры · авто-фото · пауза при ошибке
// @match        https://moe2.agentumit.ru/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════
    //  КОНСТАНТЫ
    // ═══════════════════════════════════════════════════
    const SK           = 'route_opor_v32';
    const DOT_R        = 7;
    const HIT_R        = 13;
    const CLUSTER_D    = 20;
    const RU_ALPHA     = 'абвгдежзийклмнопрстуфхцчшщыьэюя'.split('');
    const T_WAIT_MODAL = 10000;
    const T_SIGN_WAIT  = 8000;
    const T_BETWEEN    = 900;

    // ═══════════════════════════════════════════════════
    //  СОСТОЯНИЕ
    // ═══════════════════════════════════════════════════
    let dots         = [];
    let mainCounter  = 0;
    let startFrom    = 1;   // ← с какой цифры начинать
    let subMode      = null;
    let appMode      = 'idle';
    let gHeld        = false;
    let running      = false;
    let runAborted   = false;
    let activeDotIdx = -1;
    let openCluster  = null;

    function loadState() {
        try {
            const s = JSON.parse(localStorage.getItem(SK) || '{}');
            dots        = s.dots        || [];
            mainCounter = s.mainCounter || 0;
            startFrom   = s.startFrom   || 1;
        } catch (_) {}
    }
    function saveState() {
        localStorage.setItem(SK, JSON.stringify({ dots, mainCounter, startFrom }));
    }

    // ═══════════════════════════════════════════════════
    //  НУМЕРАЦИЯ
    // ═══════════════════════════════════════════════════
    function peekNext() {
        if (!subMode) return String(startFrom + mainCounter);
        const idx = subMode.counter;
        if (subMode.mode === 'alpha')        return `${subMode.baseLabel}/${RU_ALPHA[idx] ?? (idx + 1)}`;
        if (subMode.mode === 'alpha-concat') return `${subMode.baseLabel}${RU_ALPHA[idx] ?? (idx + 1)}`;
        return `${subMode.baseLabel}/${idx + 1}`;
    }

    function consumeNext() {
        if (!subMode) {
            const label = String(startFrom + mainCounter);
            mainCounter++;
            return { label, type: 'main', parentLabel: null };
        }
        const idx = subMode.counter;
        const label = subMode.mode === 'alpha'
            ? `${subMode.baseLabel}/${RU_ALPHA[idx] ?? (idx + 1)}`
            : subMode.mode === 'alpha-concat'
            ? `${subMode.baseLabel}${RU_ALPHA[idx] ?? (idx + 1)}`
            : `${subMode.baseLabel}/${idx + 1}`;
        subMode.counter++;
        return { label, type: 'sub', parentLabel: subMode.baseLabel };
    }

    // ═══════════════════════════════════════════════════
    //  ДИАЛОГ ПАУЗЫ
    // ═══════════════════════════════════════════════════
    function askUser(question, context = '') {
        return new Promise(resolve => {
            document.getElementById('rt-ask-dialog')?.remove();
            document.getElementById('rt-ask-overlay')?.remove();

            const overlay = Object.assign(document.createElement('div'), { id: 'rt-ask-overlay' });
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999999;backdrop-filter:blur(4px)';
            document.body.appendChild(overlay);

            const div = Object.assign(document.createElement('div'), { id: 'rt-ask-dialog' });
            div.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000000;
                width:440px;max-width:92vw;background:linear-gradient(145deg,#0d0a20,#1a1040);
                border:1px solid rgba(239,68,68,.35);border-radius:20px;
                box-shadow:0 0 0 1px rgba(239,68,68,.12),0 40px 100px rgba(0,0,0,.9),0 0 60px rgba(239,68,68,.08);
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;overflow:hidden;
                animation:askIn .25s cubic-bezier(.16,1,.3,1)`;

            div.innerHTML = `
            <style>
                @keyframes askIn{from{opacity:0;transform:translate(-50%,-46%) scale(.9)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
                #rt-ask-dialog .ah{padding:20px 22px 16px;background:linear-gradient(135deg,rgba(239,68,68,.12),transparent);border-bottom:1px solid rgba(239,68,68,.15);display:flex;align-items:center;gap:14px}
                #rt-ask-dialog .ah-icon{width:44px;height:44px;background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.35);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
                #rt-ask-dialog .ah-t{font-size:14px;font-weight:800;color:#fca5a5;letter-spacing:-.2px}
                #rt-ask-dialog .ah-s{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px}
                #rt-ask-dialog .ab{padding:20px 22px}
                #rt-ask-dialog .aq{font-size:13px;font-weight:600;color:rgba(255,255,255,.9);line-height:1.6;margin-bottom:14px}
                #rt-ask-dialog .ac{font-size:9.5px;color:rgba(255,255,255,.35);background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:9px 12px;font-family:monospace;margin-bottom:18px;word-break:break-all;display:${context?'block':'none'}}
                #rt-ask-dialog .aa{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
                #rt-ask-dialog .ab-btn{padding:11px 8px;border-radius:11px;border:1px solid;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px}
                #rt-ask-dialog .retry{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.3);color:#a5b4fc}
                #rt-ask-dialog .retry:hover{background:rgba(99,102,241,.25);transform:translateY(-1px)}
                #rt-ask-dialog .skip{background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.3);color:#fde68a}
                #rt-ask-dialog .skip:hover{background:rgba(251,191,36,.22);transform:translateY(-1px)}
                #rt-ask-dialog .abort{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3);color:#fca5a5}
                #rt-ask-dialog .abort:hover{background:rgba(239,68,68,.22);transform:translateY(-1px)}
                #rt-ask-dialog .sep{height:1px;background:rgba(255,255,255,.07);margin-bottom:14px}
                #rt-ask-dialog .ai-row{display:flex;gap:8px}
                #rt-ask-dialog .ai{flex:1;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:10px 13px;color:#fff;font-size:12px;outline:none;font-family:inherit;transition:border-color .15s}
                #rt-ask-dialog .ai:focus{border-color:rgba(99,102,241,.55);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
                #rt-ask-dialog .ai::placeholder{color:rgba(255,255,255,.22)}
                #rt-ask-dialog .as{padding:10px 16px;background:linear-gradient(135deg,#4f46e5,#6d28d9);border:none;border-radius:11px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;box-shadow:0 4px 14px rgba(79,70,229,.35)}
                #rt-ask-dialog .as:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.5)}
            </style>
            <div class="ah">
                <div class="ah-icon">⏸</div>
                <div><div class="ah-t">Бот приостановлен</div><div class="ah-s">Требуется ваше внимание</div></div>
            </div>
            <div class="ab">
                <div class="aq">${question}</div>
                <div class="ac">${context}</div>
                <div class="aa">
                    <button class="ab-btn retry" id="akR">🔄 Повторить</button>
                    <button class="ab-btn skip"  id="akS">⏭ Пропустить</button>
                    <button class="ab-btn abort" id="akA">⛔ Стоп</button>
                </div>
                <div class="sep"></div>
                <div class="ai-row">
                    <input class="ai" id="akI" placeholder="Введите комментарий или уточнение…">
                    <button class="as" id="akC">Продолжить →</button>
                </div>
            </div>`;

            document.body.appendChild(div);

            const close = ans => { div.remove(); overlay.remove(); resolve(ans); };
            div.querySelector('#akR').addEventListener('click', () => close('retry'));
            div.querySelector('#akS').addEventListener('click', () => close('skip'));
            div.querySelector('#akA').addEventListener('click', () => close('abort'));
            div.querySelector('#akC').addEventListener('click', () => close(div.querySelector('#akI').value.trim() || 'continue'));
            div.querySelector('#akI').addEventListener('keydown', e => { if (e.key === 'Enter') div.querySelector('#akC').click(); });
            setTimeout(() => div.querySelector('#akI')?.focus(), 120);
        });
    }

    // ═══════════════════════════════════════════════════
    //  SVG ОВЕРЛЕЙ
    // ═══════════════════════════════════════════════════
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'rt-svg');
    svg.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999990;pointer-events:none;overflow:visible';
    svg.innerHTML = `
    <defs>
        <filter id="sd"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="rgba(0,0,0,.7)"/></filter>
        <filter id="sdErr">
            <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="rgba(239,68,68,.9)"/>
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,.6)"/>
        </filter>
        <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glowErr">
            <feGaussianBlur stdDeviation="7" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="gMain"    cx="30%" cy="25%"><stop offset="0%" stop-color="#bfdbfe"/><stop offset="100%" stop-color="#1d4ed8"/></radialGradient>
        <radialGradient id="gSub"     cx="30%" cy="25%"><stop offset="0%" stop-color="#a7f3d0"/><stop offset="100%" stop-color="#065f46"/></radialGradient>
        <radialGradient id="gActive"  cx="30%" cy="25%"><stop offset="0%" stop-color="#fef9c3"/><stop offset="100%" stop-color="#b45309"/></radialGradient>
        <radialGradient id="gDone"    cx="30%" cy="25%"><stop offset="0%" stop-color="#d1fae5"/><stop offset="100%" stop-color="#14532d"/></radialGradient>
        <radialGradient id="gCluster" cx="30%" cy="25%"><stop offset="0%" stop-color="#f5d0fe"/><stop offset="100%" stop-color="#701a75"/></radialGradient>
        <radialGradient id="gErr"     cx="30%" cy="25%"><stop offset="0%" stop-color="#fff1f2"/><stop offset="100%" stop-color="#991b1b"/></radialGradient>
        <style>
            @keyframes errPulse{0%{opacity:.15;r:${DOT_R+6}px}50%{opacity:.55;r:${DOT_R+14}px}100%{opacity:.15;r:${DOT_R+6}px}}
            @keyframes errRing{0%,100%{stroke-opacity:.9;stroke-width:2}50%{stroke-opacity:.3;stroke-width:1}}
            @keyframes actPulse{0%,100%{opacity:.2}50%{opacity:.6}}
            @keyframes fanIn{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
        </style>
    </defs>
    <g id="rtLines"></g>
    <g id="rtDots"></g>
    <g id="rtFan"></g>
    <g id="rtGuide"></g>`;
    document.body.appendChild(svg);

    const gLines = svg.querySelector('#rtLines');
    const gDots  = svg.querySelector('#rtDots');
    const gFan   = svg.querySelector('#rtFan');
    const gGuide = svg.querySelector('#rtGuide');

    function buildClusters() {
        const used = new Array(dots.length).fill(false);
        const groups = [];
        for (let i = 0; i < dots.length; i++) {
            if (used[i]) continue;
            const g = [i];
            for (let j = i + 1; j < dots.length; j++) {
                if (!used[j] && Math.hypot(dots[j].x - dots[i].x, dots[j].y - dots[i].y) < CLUSTER_D) {
                    g.push(j); used[j] = true;
                }
            }
            used[i] = true;
            groups.push(g);
        }
        return groups;
    }

    function render() {
        gLines.innerHTML = '';
        gDots.innerHTML  = '';
        gFan.innerHTML   = '';
        gGuide.innerHTML = '';

        // Линии маршрута
        for (let i = 1; i < dots.length; i++) {
            const a = dots[i-1], b = dots[i];
            gLines.appendChild(ms('line', {
                x1:a.x,y1:a.y,x2:b.x,y2:b.y,
                stroke:'rgba(99,102,241,.38)','stroke-width':'1.6','stroke-dasharray':'5,4'
            }));
            const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
            const ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI;
            gLines.appendChild(ms('polygon',{
                points:'-4,-2.5 4,0 -4,2.5', fill:'rgba(99,102,241,.5)',
                transform:`translate(${mx},${my}) rotate(${ang})`
            }));
        }

        // Точки
        buildClusters().forEach(grp => {
            if (grp.length === 1) renderDot(grp[0]);
            else renderCluster(grp);
        });

        if (openCluster) renderFan(openCluster);

        // Подсказка подрежима
        if (subMode) {
            const bd = dots.find(d => d.label === subMode.baseLabel);
            if (bd) gGuide.appendChild(makeTag(bd.x + DOT_R + 6, bd.y, `▶ ${peekNext()}`, '#34d399'));
        }
    }

    function renderDot(idx) {
        const dot    = dots[idx];
        const isAct  = idx === activeDotIdx;
        const isDone = running && idx < activeDotIdx;
        const isErr  = !!dot.hasError;
        const isSub  = dot.type === 'sub';

        const grad   = isErr ? 'url(#gErr)' : isAct ? 'url(#gActive)' : isDone ? 'url(#gDone)' : isSub ? 'url(#gSub)' : 'url(#gMain)';
        const ring   = isErr ? '#ef4444'    : isAct ? '#fbbf24'       : isDone ? '#34d399'      : isSub ? '#6ee7b7'    : '#60a5fa';
        const filter = isErr ? 'url(#sdErr)' : 'url(#sd)';

        const g = ms('g', { transform:`translate(${dot.x},${dot.y})` });
        g.dataset.idx = idx;

        if (isErr) {
            // Мощная красная пульсация
            g.appendChild(ms('circle', { r:DOT_R+6,  fill:'rgba(239,68,68,.18)', style:'animation:errPulse 1s ease-in-out infinite' }));
            g.appendChild(ms('circle', { r:DOT_R+10, fill:'rgba(239,68,68,.07)', style:'animation:errPulse 1s ease-in-out infinite;animation-delay:.3s' }));
            g.appendChild(ms('circle', { r:DOT_R+2, fill:'none', stroke:'#ef4444', 'stroke-width':'2', style:'animation:errRing 1s ease-in-out infinite', filter:'url(#glowErr)' }));
        } else if (isAct) {
            g.appendChild(ms('circle', { r:DOT_R+5, fill:'rgba(251,191,36,.2)', style:'animation:actPulse 1.1s ease-out infinite' }));
            g.appendChild(ms('circle', { r:DOT_R+2, fill:'none', stroke:ring, 'stroke-width':'1.4', opacity:'.65' }));
        } else {
            g.appendChild(ms('circle', { r:DOT_R+2, fill:'none', stroke:ring, 'stroke-width':'1.2', opacity:'.5' }));
        }

        g.appendChild(ms('circle', { r:DOT_R, fill:grad, filter }));
        g.appendChild(ms('circle', { r:DOT_R*.4, cx:-DOT_R*.28, cy:-DOT_R*.28, fill:'rgba(255,255,255,.38)' }));

        if (dot.label.length <= 4) {
            const fs = dot.label.length > 3 ? 5 : 5.5;
            const t = ms('text', {
                'text-anchor':'middle','dominant-baseline':'central',
                fill: isErr ? '#fff' : '#fff',
                'font-size':fs,'font-weight':'900','font-family':'monospace',
                'pointer-events':'none','paint-order':'stroke',
                stroke: isErr ? 'rgba(120,0,0,.6)' : 'rgba(0,0,0,.5)', 'stroke-width':'1.5'
            });
            t.textContent = dot.label;
            g.appendChild(t);
        }

        if (isErr) {
            // Восклицательный знак справа
            const ex = ms('text', {
                x: DOT_R + 3, y: -(DOT_R),
                'text-anchor':'start','dominant-baseline':'central',
                fill:'#ef4444','font-size':'9','font-weight':'900',
                'font-family':'monospace','pointer-events':'none',
                filter:'url(#glowErr)',
            });
            ex.textContent = '⚠';
            g.appendChild(ex);
        }

        const title = ms('title', {});
        title.textContent = `#${idx+1} · ${dot.label}${isErr ? ' ⚠ ОШИБКА' : ''}`;
        g.appendChild(title);
        gDots.appendChild(g);
    }

    function renderCluster(indices) {
        const cx = indices.reduce((s,i)=>s+dots[i].x,0)/indices.length;
        const cy = indices.reduce((s,i)=>s+dots[i].y,0)/indices.length;
        const R  = DOT_R + 3;
        const hasErr = indices.some(i => dots[i].hasError);
        const isOpen = openCluster && openCluster.indices.join() === indices.join();

        const g = ms('g', { transform:`translate(${cx},${cy})` });
        if (isOpen) g.appendChild(ms('circle', { r:R+6, fill:'rgba(232,121,249,.1)', filter:'url(#glow)' }));
        if (hasErr) {
            g.appendChild(ms('circle', { r:R+6, fill:'rgba(239,68,68,.15)', style:'animation:errPulse 1s ease-in-out infinite' }));
        }
        g.appendChild(ms('circle', { r:R+2, fill:'none', stroke: hasErr ? '#ef4444' : 'rgba(232,121,249,.5)', 'stroke-width':'1.4' }));
        g.appendChild(ms('circle', { r:R, fill:'url(#gCluster)', filter:'url(#sd)' }));
        g.appendChild(ms('circle', { r:R*.4, cx:-R*.28, cy:-R*.28, fill:'rgba(255,255,255,.35)' }));
        const t = ms('text', { 'text-anchor':'middle','dominant-baseline':'central', fill:'#fff','font-size':'7','font-weight':'900','font-family':'monospace','pointer-events':'none','paint-order':'stroke',stroke:'rgba(0,0,0,.5)','stroke-width':'1.5' });
        t.textContent = indices.length;
        g.appendChild(t);
        const title = ms('title', {}); title.textContent = indices.map(i=>dots[i].label).join(', ');
        g.appendChild(title);
        g._clusterData = { cx, cy, indices };
        gDots.appendChild(g);
    }

    function renderFan({ cx, cy, indices }) {
        const N = indices.length;
        const fanR = Math.max(34, 20 + N * 5);
        const step = Math.min((2*Math.PI)/N, (Math.PI * 1.5)/N);
        const start = -Math.PI/2 - (step*(N-1))/2;

        gFan.appendChild(ms('circle', { cx,cy, r:fanR+DOT_R+8, fill:'rgba(0,0,0,.3)', filter:'url(#sd)' }));

        indices.forEach((dotIdx, k) => {
            const angle = start + k * step;
            const fx = cx + fanR * Math.cos(angle);
            const fy = cy + fanR * Math.sin(angle);
            const dot = dots[dotIdx];
            const isErr = !!dot.hasError;
            const isSub = dot.type === 'sub';
            const isDone = running && dotIdx < activeDotIdx;
            const isAct = dotIdx === activeDotIdx;
            const grad = isErr ? 'url(#gErr)' : isAct ? 'url(#gActive)' : isDone ? 'url(#gDone)' : isSub ? 'url(#gSub)' : 'url(#gMain)';
            const ring = isErr ? '#ef4444' : isAct ? '#fbbf24' : isDone ? '#34d399' : isSub ? '#6ee7b7' : '#60a5fa';

            gFan.appendChild(ms('line', { x1:cx,y1:cy,x2:fx,y2:fy, stroke:'rgba(255,255,255,.14)','stroke-width':'.9','stroke-dasharray':'3,3' }));

            const g = ms('g', { transform:`translate(${fx},${fy})`, style:'animation:fanIn .22s cubic-bezier(.16,1,.3,1)' });
            g.dataset.idx = dotIdx; g.dataset.fanItem = '1';

            if (isErr) {
                g.appendChild(ms('circle', { r:DOT_R+5, fill:'rgba(239,68,68,.25)', style:'animation:errPulse .9s ease-in-out infinite' }));
                g.appendChild(ms('circle', { r:DOT_R+2, fill:'none', stroke:'#ef4444','stroke-width':'1.8',filter:'url(#glowErr)' }));
            } else {
                g.appendChild(ms('circle', { r:DOT_R+2, fill:'none', stroke:ring,'stroke-width':'1.3',opacity:'.7' }));
            }

            g.appendChild(ms('circle', { r:DOT_R, fill:grad, filter: isErr ? 'url(#sdErr)' : 'url(#sd)' }));
            g.appendChild(ms('circle', { r:DOT_R*.4, cx:-DOT_R*.28, cy:-DOT_R*.28, fill:'rgba(255,255,255,.38)' }));

            const t = ms('text', { 'text-anchor':'middle','dominant-baseline':'central', fill:'#fff','font-size':'5','font-weight':'900','font-family':'monospace','pointer-events':'none','paint-order':'stroke',stroke:'rgba(0,0,0,.5)','stroke-width':'1.2' });
            t.textContent = dot.label.length > 5 ? dot.label.slice(-4) : dot.label;
            g.appendChild(t);

            // Метка снаружи
            const labelText = `${isErr?'⚠ ':''}#${dotIdx+1}·${dot.label}`;
            const lw = labelText.length * 5 + 8;
            const lx = fx > cx ? fx+DOT_R+2 : fx-DOT_R-2-lw;
            gFan.appendChild(ms('rect', { x:lx, y:fy-9, width:lw, height:18, rx:5, fill: isErr ? 'rgba(127,0,0,.75)' : 'rgba(0,0,0,.6)' }));
            const lt = ms('text', {
                x: fx>cx ? fx+DOT_R+6 : fx-DOT_R-6, y:fy,
                'text-anchor': fx>cx ? 'start':'end', 'dominant-baseline':'central',
                fill: isErr ? '#fca5a5' : '#e2e8f0', 'font-size':'6.5','font-weight':'700','font-family':'monospace','pointer-events':'none'
            });
            lt.textContent = labelText;
            gFan.appendChild(lt);
            gFan.appendChild(g);
        });
    }

    function makeTag(x, y, text, color='#6366f1') {
        const g = ms('g', {});
        const W = text.length * 5.5 + 12, H = 17;
        g.appendChild(ms('rect', { x, y:y-H/2, width:W, height:H, rx:6, fill:color, opacity:'.92', filter:'url(#sd)' }));
        const t = ms('text', { x:x+W/2, y, 'text-anchor':'middle','dominant-baseline':'central', fill:'#fff','font-size':'7.5','font-weight':'800','font-family':'monospace','pointer-events':'none' });
        t.textContent = text; g.appendChild(t);
        return g;
    }

    function ms(tag, attrs) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, String(v));
        return el;
    }

    // ── Курсор-предпросмотр ─────────────────────────
    let cursorEl = null;
    svg.addEventListener('mousemove', e => {
        if (appMode !== 'place') return;
        if (cursorEl) cursorEl.remove();
        if (findDotAt(e.clientX,e.clientY) >= 0 || findClusterAt(e.clientX,e.clientY)) return;
        const isSub = !!subMode;
        cursorEl = ms('g', { transform:`translate(${e.clientX},${e.clientY})`, opacity:'.45', 'pointer-events':'none' });
        cursorEl.appendChild(ms('circle', { r:DOT_R, fill:isSub?'url(#gSub)':'url(#gMain)', filter:'url(#sd)' }));
        const lbl = peekNext();
        const t = ms('text', { 'text-anchor':'middle','dominant-baseline':'central', fill:'#fff','font-size':'5.5','font-weight':'900','font-family':'monospace','pointer-events':'none' });
        t.textContent = lbl.length > 4 ? '…' : lbl;
        cursorEl.appendChild(t);
        gGuide.appendChild(cursorEl);
        svg.style.cursor = 'crosshair';
    });
    svg.addEventListener('mouseleave', () => { if (cursorEl) { cursorEl.remove(); cursorEl = null; } });

    // ═══════════════════════════════════════════════════
    //  ХИТ-ТЕСТ
    // ═══════════════════════════════════════════════════
    function findDotAt(x, y) {
        for (const el of gFan.querySelectorAll('[data-fan-item]')) {
            const i = parseInt(el.dataset.idx);
            const t = el.transform?.baseVal?.[0]?.matrix;
            if (t && Math.hypot(t.e-x, t.f-y) <= HIT_R+4) return i;
        }
        for (const el of gDots.querySelectorAll('g[data-idx]')) {
            const i = parseInt(el.dataset.idx);
            if (i < dots.length && Math.hypot(dots[i].x-x, dots[i].y-y) <= HIT_R) return i;
        }
        return -1;
    }

    function findClusterAt(x, y) {
        for (const el of gDots.querySelectorAll('g')) {
            const cd = el._clusterData;
            if (cd && Math.hypot(cd.cx-x, cd.cy-y) <= DOT_R+6) return cd;
        }
        return null;
    }

    // ═══════════════════════════════════════════════════
    //  КЛИКИ ПО ОВЕРЛЕЮ
    // ═══════════════════════════════════════════════════
    svg.addEventListener('click', e => {
        if (appMode !== 'place') return;
        const { clientX: x, clientY: y } = e;

        const cluster = findClusterAt(x, y);
        if (cluster) {
            openCluster = openCluster && openCluster.indices.join()===cluster.indices.join() ? null : cluster;
            render(); return;
        }

        const hitIdx = findDotAt(x, y);
        if (hitIdx >= 0) {
            if (gHeld) showSubMenu(dots[hitIdx], x, y);
            return;
        }

        openCluster = null;
        const info = consumeNext();
        dots.push({ x, y, label:info.label, type:info.type, parentLabel:info.parentLabel });
        saveState(); render(); updateUI();
        showToast(`📍 ${info.label}`, 'dot');
    });

    svg.addEventListener('contextmenu', e => {
        if (appMode !== 'place') return;
        e.preventDefault();
        const hitIdx = findDotAt(e.clientX, e.clientY);
        if (hitIdx >= 0) {
            const rm = dots.splice(hitIdx, 1)[0];
            if (rm.type==='main') mainCounter = Math.max(0, mainCounter-1);
            else if (subMode&&rm.parentLabel===subMode.baseLabel) subMode.counter = Math.max(0, subMode.counter-1);
            openCluster=null; saveState(); render(); updateUI();
            showToast(`🗑 ${rm.label}`, 'warning');
        } else { openCluster=null; render(); }
    });

    // ═══════════════════════════════════════════════════
    //  МЕНЮ ПОДРЕЖИМА
    // ═══════════════════════════════════════════════════
    let subMenuEl = null;
    function closeSubMenu() { if (subMenuEl) { subMenuEl.remove(); subMenuEl = null; } }

    function showSubMenu(dot, mx, my) {
        closeSubMenu();
        const div = document.createElement('div');
        div.id = 'rt-sub-menu';
        div.style.cssText = `position:fixed;left:${Math.min(mx+14,window.innerWidth-260)}px;top:${Math.min(my-10,window.innerHeight-210)}px;z-index:9999999;
            background:linear-gradient(150deg,#0a0618,#160b38);border:1px solid rgba(255,255,255,.12);border-radius:16px;
            box-shadow:0 24px 60px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.05);
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;min-width:235px;overflow:hidden;
            animation:smI .18s cubic-bezier(.16,1,.3,1)`;
        div.innerHTML = `
        <style>
            @keyframes smI{from{opacity:0;transform:scale(.88) translateY(5px)}to{opacity:1;transform:scale(1) translateY(0)}}
            #rt-sub-menu .sh{padding:10px 14px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:rgba(255,255,255,.32);border-bottom:1px solid rgba(255,255,255,.07)}
            #rt-sub-menu .sb{padding:9px 14px;display:flex;align-items:center;gap:9px;border-bottom:1px solid rgba(255,255,255,.06)}
            #rt-sub-menu .sbadge{background:rgba(99,102,241,.22);border:1px solid rgba(99,102,241,.38);border-radius:8px;padding:3px 12px;font-size:16px;font-weight:900;color:#c7d2fe;font-family:monospace}
            #rt-sub-menu .so{padding:12px 14px;cursor:pointer;display:flex;flex-direction:column;gap:4px;transition:background .12s;border-bottom:1px solid rgba(255,255,255,.05)}
            #rt-sub-menu .so:hover{background:rgba(255,255,255,.05)}
            #rt-sub-menu .st{font-size:12px;font-weight:700;display:flex;align-items:center;gap:7px}
            #rt-sub-menu .sp{font-size:9px;color:rgba(167,139,250,.7);font-family:monospace;letter-spacing:.3px}
            #rt-sub-menu .se{padding:10px 14px;cursor:pointer;font-size:10px;font-weight:600;color:rgba(239,68,68,.75);display:flex;align-items:center;gap:5px;border-top:1px solid rgba(255,255,255,.06);transition:background .12s}
            #rt-sub-menu .se:hover{background:rgba(239,68,68,.07)}
        </style>
        <div class="sh">⚡ Подгруппа опоры</div>
        <div class="sb"><span style="font-size:10px;color:rgba(255,255,255,.35)">База:</span><span class="sbadge">${dot.label}</span></div>
        <div class="so" id="smA"><div class="st">🔤 Буква через слеш</div><div class="sp">${dot.label}/а &nbsp;${dot.label}/б &nbsp;${dot.label}/в …</div></div>
        <div class="so" id="smC"><div class="st">🔡 Буква слитно</div><div class="sp">${dot.label}а &nbsp;${dot.label}б &nbsp;${dot.label}в …</div></div>
        <div class="so" id="smN"><div class="st">🔢 Цифра через слеш</div><div class="sp">${dot.label}/1 &nbsp;${dot.label}/2 &nbsp;${dot.label}/3 …</div></div>
        ${subMode?`<div class="se" id="smE">✕ Выйти из подрежима</div>`:''}`;
        document.body.appendChild(div); subMenuEl = div;

        div.querySelector('#smA').addEventListener('click', () => {
            subMode={baseLabel:dot.label,mode:'alpha',counter:0}; closeSubMenu(); render(); updateUI();
            showToast(`🔤 ${dot.label}/а, ${dot.label}/б…`,'sub');
        });
        div.querySelector('#smC').addEventListener('click', () => {
            subMode={baseLabel:dot.label,mode:'alpha-concat',counter:0}; closeSubMenu(); render(); updateUI();
            showToast(`🔡 ${dot.label}а, ${dot.label}б…`,'sub');
        });
        div.querySelector('#smN').addEventListener('click', () => {
            subMode={baseLabel:dot.label,mode:'numeric',counter:0}; closeSubMenu(); render(); updateUI();
            showToast(`🔢 ${dot.label}/1, ${dot.label}/2…`,'sub');
        });
        div.querySelector('#smE')?.addEventListener('click', () => {
            subMode=null; closeSubMenu(); render(); updateUI(); showToast('↩️ Основная нумерация','info');
        });
        setTimeout(()=>{
            const fn=e=>{ if(subMenuEl&&!subMenuEl.contains(e.target)){closeSubMenu();document.removeEventListener('click',fn,true);} };
            document.addEventListener('click',fn,true);
        },80);
    }

    // ═══════════════════════════════════════════════════
    //  КЛАВИАТУРА
    // ═══════════════════════════════════════════════════
    document.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (k==='g'||k==='г') { gHeld=true; if(appMode==='place') svg.style.cursor='pointer'; }
        if (e.key==='Escape') {
            closeSubMenu();
            if (running) { runAborted=true; return; }
            if (subMode) { subMode=null; render(); updateUI(); return; }
            openCluster=null; render();
            if (appMode==='place') setMode('idle');
        }
    });
    document.addEventListener('keyup', e => {
        const k = e.key.toLowerCase();
        if (k==='g'||k==='г') { gHeld=false; if(appMode==='place') svg.style.cursor='crosshair'; }
    });

    function setMode(mode) {
        appMode = mode;
        if (mode==='place') { svg.style.pointerEvents='all'; svg.style.cursor='crosshair'; }
        else { svg.style.pointerEvents='none'; svg.style.cursor='default'; if(cursorEl){cursorEl.remove();cursorEl=null;} }
        updateUI(); render();
    }

    // ═══════════════════════════════════════════════════
    //  АВТОМАТИЗАЦИЯ
    // ═══════════════════════════════════════════════════
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function setReactInput(el, value) {
        if (!el) return false;
        try {
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
            el.dispatchEvent(new Event('input',  { bubbles:true }));
            el.dispatchEvent(new Event('change', { bubbles:true }));
            return true;
        } catch (_) { return false; }
    }

    async function waitFor(selector, timeout=10000) {
        const t0 = Date.now();
        while (Date.now()-t0 < timeout) {
            const el = document.querySelector(selector);
            if (el) return el;
            await sleep(150);
        }
        return null;
    }

    async function waitForVisible(selector, timeout=10000) {
        const t0 = Date.now();
        while (Date.now()-t0 < timeout) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) return el;
            await sleep(150);
        }
        return null;
    }

    function clickEl(el) {
        if (!el) return;
        ['mousedown','mouseup','click'].forEach(t =>
            el.dispatchEvent(new MouseEvent(t, { bubbles:true, cancelable:true, view:window })));
    }

    function dispatchMapClick(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return;
        const opts = { bubbles:true, cancelable:true, view:window, clientX:x, clientY:y, button:0, buttons:1 };
        ['mousedown','mouseup','click'].forEach(t => el.dispatchEvent(new MouseEvent(t, opts)));
    }

    async function clickAllCameraButtons() {
        let clicked = 0;
        for (const fs of document.querySelectorAll('fieldset')) {
            const hasPhoto = [...fs.querySelectorAll('img')].some(img => {
                const src = img.src || '';
                return (src.startsWith('https://')||src.startsWith('blob:'))
                    && !src.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')
                    && img.naturalWidth > 10;
            });
            if (hasPhoto) continue;
            const cam = fs.querySelector('button.smwb-fab');
            if (!cam) continue;
            fs.scrollIntoView({ behavior:'smooth', block:'center' });
            await sleep(170);
            clickEl(cam);
            clicked++;
            await sleep(260);
        }
        return clicked;
    }

    async function runAutomation() {
        if (!dots.length) { showToast('❌ Нет точек!','error'); return; }
        running=true; runAborted=false;
        setMode('run');
        elLog.innerHTML=''; showLog(true);
        log(`🚀 Старт · точек: ${dots.length} · старт с ${startFrom}`, 'info');
        await sleep(600);

        let i = 0;
        while (i < dots.length) {
            if (runAborted) { log('⛔ Прервано','warn'); break; }

            activeDotIdx = i;
            dots[i].hasError = false;
            render(); updateProgress(i, dots.length); updateUI();

            const dot = dots[i];
            log(`\n[${i+1}/${dots.length}] Опора ${dot.label}`, 'info');

            // ① Клик по карте
            log('  🖱 Клик по карте…','info');
            dispatchMapClick(dot.x, dot.y);

            // ② Ждём "Редактировать"
            const editBtn = await waitForVisible('#report-table-actions-edit', T_WAIT_MODAL);
            if (!editBtn) {
                log('  ❌ Кнопка "Редактировать" не появилась','error');
                dots[i].hasError=true; render();
                const ans = await askUser(
                    `Не открылась карточка опоры №${dot.label}.\nПроверьте что клик попадает в нужную точку на карте.`,
                    `Точка #${i+1}: ${dot.label} (x=${Math.round(dot.x)}, y=${Math.round(dot.y)})`
                );
                if (ans==='abort'){runAborted=true;break;}
                if (ans==='skip'){i++;continue;}
                continue;
            }
            log('  ✅ Модальное открылось','success');
            await sleep(300);

            // ③ Редактировать
            clickEl(editBtn);
            log('  🖊 "Редактировать"','info');

            // ④ Ждём поле
            const dispField = await waitFor('input[name="dispatcherNumber"]', T_WAIT_MODAL);
            if (!dispField) {
                log('  ❌ Поле dispatcherNumber не найдено','error');
                dots[i].hasError=true; render();
                const ans = await askUser(
                    `Форма редактирования не открылась для опоры №${dot.label}.`,
                    `Точка #${i+1}: ${dot.label}`
                );
                if (ans==='abort'){runAborted=true;break;}
                if (ans==='skip'){i++;continue;}
                continue;
            }
            log('  ✅ Форма открылась','success');
            await sleep(400);

            // ⑤ Заполняем номер
            dispField.scrollIntoView({behavior:'smooth',block:'center'});
            await sleep(200); dispField.focus();
            const filled = setReactInput(dispField, dot.label);
            if (!filled) {
                log('  ❌ Не удалось заполнить поле','error');
                dots[i].hasError=true; render();
                const ans = await askUser(
                    `Не удалось вписать номер "${dot.label}" в поле "Диспетчерский номер опоры".\nЗаполните вручную, затем нажмите Продолжить.`,
                    `input[name="dispatcherNumber"]`
                );
                if (ans==='abort'){runAborted=true;break;}
                if (ans==='skip'){i++;continue;}
                continue;
            }
            dispField.style.transition='box-shadow .3s';
            dispField.style.boxShadow='0 0 0 3px rgba(99,102,241,.75)';
            setTimeout(()=>{dispField.style.boxShadow='';},900);
            log(`  ✅ Номер "${dot.label}" введён`,'success');
            await sleep(350);

            // ⑥ Авто-фото
            log('  📸 Фото…','info');
            const photos = await clickAllCameraButtons();
            log(`  📸 Кнопок камеры: ${photos}`, photos>0?'success':'info');
            await sleep(300);

            // ⑦ Отпечаток пальца
            const fpBtn = document.querySelector('#create-report');
            if (!fpBtn) {
                log('  ❌ #create-report не найден','error');
                dots[i].hasError=true; render();
                const ans = await askUser(
                    `Кнопка подписи (отпечаток) не найдена для опоры №${dot.label}.`,
                    `#create-report`
                );
                if (ans==='abort'){runAborted=true;break;}
                if (ans==='skip'){i++;continue;}
                continue;
            }
            fpBtn.scrollIntoView({behavior:'smooth',block:'center'});
            await sleep(200); clickEl(fpBtn);
            log('  👆 Кнопка подписи нажата','info');

            // ⑧ Ждём "Подписать"
            await sleep(600);
            let signBtn=null;
            const tSign=Date.now();
            while (!signBtn && Date.now()-tSign < T_WAIT_MODAL) {
                for (const btn of document.querySelectorAll('.smwb-button.smwb-contained')) {
                    const txt = (btn.textContent||'').trim();
                    if (txt.includes('Подписать')&&!txt.includes('Отмена')){signBtn=btn;break;}
                }
                if (!signBtn) await sleep(200);
            }
            if (!signBtn) {
                log('  ❌ "Подписать" не найдено','error');
                dots[i].hasError=true; render();
                const ans = await askUser(
                    `Попап подписи не появился для опоры №${dot.label}.\nНажмите кнопку подписи вручную, затем Продолжить.`,
                    `.smwb-button.smwb-contained — "Подписать"`
                );
                if (ans==='abort'){runAborted=true;break;}
                if (ans==='skip'){i++;continue;}
                continue;
            }
            signBtn.scrollIntoView({behavior:'smooth',block:'center'});
            await sleep(250); clickEl(signBtn);
            log('  ✅ "Подписать" нажато','success');

            // ⑨ 8 секунд
            log(`  ⏳ ${T_SIGN_WAIT/1000}с ожидание…`,'info');
            for (let w=0; w<T_SIGN_WAIT; w+=300) {
                if (runAborted) break;
                await sleep(300);
            }

            dots[i].hasError=false;
            await sleep(T_BETWEEN);
            updateProgress(i+1, dots.length);
            log(`  ✔ ${dot.label} — готово`,'success');
            i++;
        }

        activeDotIdx=-1; running=false;
        setMode('idle'); render();
        updateProgress(dots.length, dots.length);
        if (!runAborted) { log('\n🎉 Всё готово!','success'); showToast('✅ Готово!','success'); }
        updateUI();
    }

    // ═══════════════════════════════════════════════════
    //  UI ПАНЕЛЬ (Shadow DOM)
    // ═══════════════════════════════════════════════════
    const pHost = document.createElement('div');
    pHost.id = 'rt-panel-host';
    pHost.style.cssText = 'position:fixed;top:18px;right:18px;z-index:9999995;';
    document.body.appendChild(pHost);
    const sh = pHost.attachShadow({ mode:'open' });

    sh.innerHTML = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700;800&display=swap');

        /* ── Анимации ── */
        @keyframes panelIn{
            from{opacity:0;transform:translateX(24px) scale(.94);filter:blur(4px)}
            to  {opacity:1;transform:translateX(0)    scale(1);  filter:blur(0)}
        }
        @keyframes borderRot{to{transform:rotate(360deg)}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes neonPulse{0%,100%{opacity:.7}50%{opacity:1}}
        @keyframes blip{0%,100%{opacity:1}50%{opacity:.15}}
        @keyframes shimProg{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes numIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(8px,-12px) scale(1.1)}}
        @keyframes orb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-10px,8px) scale(.9)}}
        @keyframes tIn{from{opacity:0;transform:translateY(12px) scale(.85)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes glitch1{0%,94%,100%{clip-path:none;transform:none}95%{clip-path:polygon(0 30%,100% 30%,100% 35%,0 35%);transform:translateX(-2px)}97%{clip-path:polygon(0 65%,100% 65%,100% 70%,0 70%);transform:translateX(2px)}}
        @keyframes cornerBlink{0%,100%{opacity:1}50%{opacity:.3}}

        *{box-sizing:border-box;margin:0;padding:0}
        :host{display:block}

        /* ════════════════════════════════════
           ПАНЕЛЬ
        ════════════════════════════════════ */
        .panel{
            width:248px;
            position:relative;
            background:#05030f;
            border-radius:16px;
            font-family:'Space Grotesk',-apple-system,sans-serif;
            color:#fff;
            animation:panelIn .45s cubic-bezier(.16,1,.3,1);
            user-select:none;
            overflow:hidden;
            /* Светящийся бордер через outline + box-shadow */
            outline:1px solid rgba(0,255,200,.18);
            box-shadow:
                0 0 0 1px rgba(0,255,200,.06),
                0 0 30px rgba(0,255,180,.07),
                0 0 80px rgba(80,0,255,.08),
                0 40px 100px rgba(0,0,0,.9),
                inset 0 0 60px rgba(0,255,200,.02);
        }

        /* Фоновые orb-шары */
        .panel::before,.panel::after{
            content:'';position:absolute;border-radius:50%;pointer-events:none;z-index:0;
        }
        .panel::before{
            width:180px;height:180px;
            top:-60px;right:-50px;
            background:radial-gradient(circle,rgba(99,102,241,.14) 0%,transparent 70%);
            animation:orb1 7s ease-in-out infinite;
        }
        .panel::after{
            width:140px;height:140px;
            bottom:-40px;left:-40px;
            background:radial-gradient(circle,rgba(0,255,180,.1) 0%,transparent 70%);
            animation:orb2 9s ease-in-out infinite;
        }

        /* Сканлайн */
        .scanline{
            position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;border-radius:inherit;
        }
        .scanline::after{
            content:'';
            position:absolute;left:0;right:0;height:2px;
            background:linear-gradient(transparent,rgba(0,255,200,.04),transparent);
            animation:scanline 5s linear infinite;
        }

        /* Угловые декоры */
        .corners{position:absolute;inset:0;pointer-events:none;z-index:2}
        .corners span{
            position:absolute;width:12px;height:12px;
            border-color:rgba(0,255,180,.55);border-style:solid;
            animation:cornerBlink 3s ease-in-out infinite;
        }
        .corners span:nth-child(1){top:8px;left:8px;border-width:1.5px 0 0 1.5px;animation-delay:0s}
        .corners span:nth-child(2){top:8px;right:8px;border-width:1.5px 1.5px 0 0;animation-delay:.75s}
        .corners span:nth-child(3){bottom:8px;left:8px;border-width:0 0 1.5px 1.5px;animation-delay:1.5s}
        .corners span:nth-child(4){bottom:8px;right:8px;border-width:0 1.5px 1.5px 0;animation-delay:2.25s}

        /* Всё содержимое поверх фона */
        .head,.body{position:relative;z-index:3}

        /* ════════════════════════════════════
           ШАПКА
        ════════════════════════════════════ */
        .head{
            padding:13px 14px 11px;
            cursor:move;
            display:flex;align-items:center;justify-content:space-between;
            border-bottom:1px solid rgba(0,255,180,.08);
            background:rgba(0,0,0,.45);
        }
        .hinner{display:flex;align-items:center;gap:10px}

        /* Иконка-шестерёнка */
        .hicon{
            width:32px;height:32px;flex-shrink:0;
            background:linear-gradient(135deg,rgba(0,255,200,.15),rgba(99,102,241,.25));
            border:1px solid rgba(0,255,180,.25);
            border-radius:10px;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            box-shadow:0 0 12px rgba(0,255,180,.15),inset 0 1px 0 rgba(255,255,255,.06);
        }
        .htitles{}
        .htitle{
            font-size:11px;font-weight:700;
            color:#fff;letter-spacing:.3px;
            text-shadow:0 0 20px rgba(0,255,200,.4);
        }
        .hsub{
            font-size:8px;color:rgba(0,255,180,.45);
            font-family:'JetBrains Mono',monospace;
            margin-top:2px;letter-spacing:.5px;
        }
        .hbtn{
            width:24px;height:24px;
            background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.08);
            border-radius:7px;
            color:rgba(255,255,255,.35);cursor:pointer;font-size:13px;
            display:flex;align-items:center;justify-content:center;
            transition:all .15s;flex-shrink:0;
        }
        .hbtn:hover{background:rgba(0,255,180,.1);border-color:rgba(0,255,180,.3);color:rgba(0,255,180,.9)}

        /* ════════════════════════════════════
           ТЕЛО
        ════════════════════════════════════ */
        .body{padding:13px 12px 14px;display:flex;flex-direction:column;gap:10px}

        /* ── Счётчики ── */
        .stats{display:grid;grid-template-columns:1fr 1fr;gap:7px}
        .stile{
            position:relative;overflow:hidden;
            background:rgba(255,255,255,.025);
            border:1px solid rgba(255,255,255,.07);
            border-radius:12px;padding:11px 8px 9px;text-align:center;
        }
        .stile::after{
            content:'';position:absolute;top:0;left:0;right:0;height:1px;
            background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
        }
        .sval{
            font-size:30px;font-weight:700;line-height:1;
            font-family:'JetBrains Mono',monospace;
            font-variant-numeric:tabular-nums;
            animation:numIn .2s ease-out;
        }
        .stile:nth-child(1) .sval{
            color:#00ffc8;
            text-shadow:0 0 20px rgba(0,255,200,.5),0 0 40px rgba(0,255,200,.2);
        }
        .stile:nth-child(2) .sval{
            color:#818cf8;
            text-shadow:0 0 20px rgba(129,140,248,.5),0 0 40px rgba(129,140,248,.2);
        }
        .slbl{font-size:7px;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:.8px;margin-top:5px;font-family:'JetBrains Mono',monospace}

        /* ── Следующий номер — большой дисплей ── */
        .next-display{
            position:relative;overflow:hidden;
            background:linear-gradient(135deg,rgba(0,255,200,.04),rgba(99,102,241,.04));
            border:1px solid rgba(0,255,200,.2);
            border-radius:13px;
            padding:14px 14px 11px;
            display:flex;flex-direction:column;gap:3px;
        }
        .next-display::before{
            content:'';position:absolute;inset:0;
            background:radial-gradient(ellipse at 50% 0%,rgba(0,255,200,.06),transparent 70%);
        }
        .ndlbl{
            font-size:7.5px;font-weight:600;text-transform:uppercase;letter-spacing:1px;
            color:rgba(0,255,200,.45);font-family:'JetBrains Mono',monospace;
        }
        .ndval{
            font-size:28px;font-weight:700;
            font-family:'JetBrains Mono',monospace;
            color:#00ffc8;letter-spacing:-1px;
            text-shadow:0 0 24px rgba(0,255,200,.6),0 0 50px rgba(0,255,200,.25);
            animation:numIn .15s ease-out;
            line-height:1.1;
        }
        .ndval.glitch{animation:glitch1 .4s ease-out}

        /* ── Блок НАЧАТЬ С ── */
        .start-block{
            background:rgba(99,102,241,.05);
            border:1px solid rgba(99,102,241,.18);
            border-radius:12px;
            padding:10px 12px;
            display:flex;flex-direction:column;gap:7px;
        }
        .start-block-lbl{
            font-size:7.5px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;
            color:rgba(129,140,248,.55);font-family:'JetBrains Mono',monospace;
            display:flex;align-items:center;gap:5px;
        }
        .start-block-lbl::before{content:'//';opacity:.4}
        .start-ctrl{display:flex;align-items:center;gap:7px}
        .step-btn{
            width:30px;height:30px;flex-shrink:0;
            background:rgba(99,102,241,.1);
            border:1px solid rgba(99,102,241,.25);
            border-radius:8px;
            color:#818cf8;cursor:pointer;
            font-size:18px;font-weight:700;line-height:1;
            display:flex;align-items:center;justify-content:center;
            transition:all .14s;
        }
        .step-btn:hover{background:rgba(99,102,241,.22);border-color:rgba(99,102,241,.5);color:#a5b4fc;transform:scale(1.08)}
        .step-btn:active{transform:scale(.94)}
        .start-inp{
            flex:1;min-width:0;
            background:rgba(0,0,0,.45);
            border:1px solid rgba(99,102,241,.22);
            border-radius:8px;
            padding:6px 8px;
            color:#a5b4fc;
            font-size:18px;font-weight:700;
            font-family:'JetBrains Mono',monospace;
            outline:none;text-align:center;
            transition:all .15s;letter-spacing:-.5px;
        }
        .start-inp:focus{border-color:rgba(0,255,200,.4);box-shadow:0 0 0 2px rgba(0,255,200,.08);color:#00ffc8}
        .start-inp::-webkit-inner-spin-button,.start-inp::-webkit-outer-spin-button{-webkit-appearance:none}
        .start-hint{font-size:7.5px;color:rgba(255,255,255,.18);text-align:center;font-family:'JetBrains Mono',monospace}

        /* ── Статус ── */
        .status-bar{
            display:flex;align-items:center;gap:8px;
            padding:7px 11px;border-radius:9px;
            font-size:9px;font-weight:600;
            font-family:'JetBrains Mono',monospace;
            transition:all .25s;
        }
        .status-bar.idle {background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.3)}
        .status-bar.place{background:rgba(0,255,200,.05);border:1px solid rgba(0,255,200,.22);color:rgba(0,255,200,.8)}
        .status-bar.sub  {background:rgba(168,85,247,.06);border:1px solid rgba(168,85,247,.22);color:rgba(196,148,255,.85)}
        .status-bar.run  {background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.22);color:rgba(251,220,100,.85)}
        .sled{width:7px;height:7px;border-radius:50%;flex-shrink:0;transition:all .3s}
        .status-bar.idle  .sled{background:rgba(255,255,255,.2)}
        .status-bar.place .sled{background:#00ffc8;box-shadow:0 0 8px #00ffc8;animation:neonPulse 1.5s infinite}
        .status-bar.sub   .sled{background:#a855f7;box-shadow:0 0 8px #a855f7;animation:blip 1.1s infinite}
        .status-bar.run   .sled{background:#fbbf24;box-shadow:0 0 8px #fbbf24;animation:blip .65s infinite}

        /* ── Кнопка расстановки ── */
        .btn-place{
            width:100%;padding:10px;
            background:rgba(0,255,200,.06);
            border:1px solid rgba(0,255,200,.22);
            border-radius:11px;
            color:rgba(0,255,200,.85);
            font-size:10.5px;font-weight:600;
            cursor:pointer;transition:all .18s;
            font-family:'Space Grotesk',sans-serif;
            display:flex;align-items:center;justify-content:center;gap:7px;
            letter-spacing:.1px;
        }
        .btn-place:hover{
            background:rgba(0,255,200,.12);
            border-color:rgba(0,255,200,.4);
            color:#00ffc8;
            box-shadow:0 0 20px rgba(0,255,200,.12);
        }
        .btn-place.active{
            background:rgba(0,255,200,.14);
            border-color:rgba(0,255,200,.55);
            color:#00ffc8;
            box-shadow:0 0 0 2px rgba(0,255,200,.1),0 0 24px rgba(0,255,200,.15);
        }
        .btn-place:disabled{opacity:.35;cursor:not-allowed}

        .btn-exit-sub{
            width:100%;padding:7px;
            background:rgba(168,85,247,.07);
            border:1px solid rgba(168,85,247,.22);
            border-radius:9px;color:rgba(196,148,255,.8);
            font-size:9px;font-weight:600;
            cursor:pointer;transition:all .15s;
            font-family:'JetBrains Mono',monospace;
            display:flex;align-items:center;justify-content:center;gap:5px;
        }
        .btn-exit-sub:hover{background:rgba(168,85,247,.15);border-color:rgba(168,85,247,.4);color:#d8b4fe}

        /* ── Фото-бейдж ── */
        .photo-badge{
            display:flex;align-items:center;justify-content:center;gap:8px;
            padding:5px 10px;
            background:rgba(16,185,129,.04);
            border:1px solid rgba(16,185,129,.15);
            border-radius:8px;
            font-size:8px;font-weight:600;
            color:rgba(110,231,183,.65);
            font-family:'JetBrains Mono',monospace;
            letter-spacing:.2px;
        }
        .photo-badge::before{content:'●';color:rgba(16,185,129,.6);font-size:6px;animation:blip 2.5s infinite}

        /* ── Прогресс ── */
        .prog-wrap{
            background:rgba(255,255,255,.05);
            border:1px solid rgba(255,255,255,.06);
            border-radius:99px;
            height:4px;overflow:hidden;
        }
        .prog-bar{
            height:100%;
            background:linear-gradient(90deg,#00ffc8,#818cf8,#a855f7,#00ffc8);
            background-size:300% auto;
            border-radius:99px;
            transition:width .5s cubic-bezier(.4,0,.2,1);
            animation:shimProg 2.5s linear infinite;
            box-shadow:0 0 8px rgba(0,255,200,.4);
        }
        .prog-txt{
            font-size:8px;color:rgba(0,255,200,.4);
            text-align:right;margin-top:4px;
            font-family:'JetBrains Mono',monospace;letter-spacing:.3px;
        }

        /* ── Лог ── */
        .logbox{
            background:rgba(0,0,0,.6);
            border:1px solid rgba(0,255,200,.08);
            border-radius:10px;padding:8px 9px;
            max-height:90px;overflow-y:auto;
            display:none;
            font-family:'JetBrains Mono',monospace;
        }
        .logbox.show{display:block}
        .logbox::-webkit-scrollbar{width:2px}
        .logbox::-webkit-scrollbar-thumb{background:rgba(0,255,200,.3);border-radius:1px}
        .le{font-size:8px;line-height:1.8}

        /* ── Разделитель ── */
        .sep{
            height:1px;
            background:linear-gradient(90deg,transparent,rgba(0,255,200,.12) 30%,rgba(99,102,241,.12) 70%,transparent);
        }

        /* ── КНОПКА ЗАПУСКА ── */
        .btn-run{
            width:100%;padding:12px;
            position:relative;overflow:hidden;
            background:linear-gradient(135deg,rgba(0,200,160,.15),rgba(99,102,241,.2),rgba(168,85,247,.15));
            border:1px solid rgba(0,255,200,.35);
            border-radius:12px;
            color:#00ffc8;font-size:11.5px;font-weight:700;
            cursor:pointer;transition:all .2s;
            font-family:'Space Grotesk',sans-serif;
            display:flex;align-items:center;justify-content:center;gap:8px;
            letter-spacing:.2px;
            box-shadow:0 0 20px rgba(0,255,200,.1),0 6px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06);
        }
        .btn-run::before{
            content:'';position:absolute;inset:0;
            background:linear-gradient(135deg,rgba(0,255,200,.08),transparent 50%,rgba(99,102,241,.08));
            opacity:0;transition:opacity .2s;
        }
        .btn-run:hover:not(:disabled)::before{opacity:1}
        .btn-run:hover:not(:disabled){
            border-color:rgba(0,255,200,.6);
            color:#fff;
            box-shadow:0 0 30px rgba(0,255,200,.2),0 8px 28px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.1);
            transform:translateY(-1px);
        }
        .btn-run:active:not(:disabled){transform:translateY(0)}
        .btn-run:disabled{opacity:.25;cursor:not-allowed;border-color:rgba(255,255,255,.08);color:rgba(255,255,255,.3);box-shadow:none}
        .btn-run.abort{
            background:linear-gradient(135deg,rgba(239,68,68,.15),rgba(153,27,27,.2));
            border-color:rgba(239,68,68,.4);color:#fca5a5;
            box-shadow:0 0 20px rgba(239,68,68,.12),0 6px 20px rgba(0,0,0,.4);
        }
        .btn-run.abort:hover:not(:disabled){border-color:rgba(239,68,68,.65);color:#fff;box-shadow:0 0 30px rgba(239,68,68,.22),0 8px 28px rgba(0,0,0,.5)}

        /* ── Мелкие кнопки ── */
        .brow{display:flex;gap:5px}
        .bsm{
            flex:1;padding:7px 4px;
            border:1px solid rgba(255,255,255,.07);
            border-radius:9px;
            background:rgba(255,255,255,.03);
            color:rgba(255,255,255,.38);
            font-size:8.5px;font-weight:600;cursor:pointer;
            transition:all .14s;font-family:'Space Grotesk',sans-serif;
            display:flex;align-items:center;justify-content:center;gap:3px;
        }
        .bsm:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);border-color:rgba(255,255,255,.15)}
        .bsm.danger:hover{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.25);color:#fca5a5}
        .bsm.alog{background:rgba(0,255,200,.07);border-color:rgba(0,255,200,.22);color:rgba(0,255,200,.7)}

        /* ── Подсказки ── */
        .hints{display:flex;flex-direction:column;gap:3px}
        .hint{
            font-size:7.5px;color:rgba(255,255,255,.16);
            display:flex;align-items:baseline;gap:5px;line-height:1.55;
            font-family:'JetBrains Mono',monospace;
        }
        kbd{
            display:inline-flex;align-items:center;justify-content:center;
            background:rgba(0,255,200,.07);
            border:1px solid rgba(0,255,200,.2);
            border-bottom-width:2px;
            border-radius:4px;
            padding:0px 4px;
            font-size:7px;font-family:inherit;
            color:rgba(0,255,200,.6);
            min-width:14px;
        }

        /* ── Тосты ── */
        .ta{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);z-index:9999999;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}
        .toast{
            padding:9px 22px;border-radius:24px;
            font-size:11px;font-weight:600;color:#fff;
            white-space:nowrap;
            font-family:'Space Grotesk',sans-serif;
            animation:tIn .22s cubic-bezier(.16,1,.3,1);
            backdrop-filter:blur(12px);
        }
        .toast.dot    {background:rgba(0,255,200,.15);border:1px solid rgba(0,255,200,.35);color:#00ffc8;box-shadow:0 0 24px rgba(0,255,200,.2),0 8px 32px rgba(0,0,0,.5)}
        .toast.sub    {background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.35);color:#d8b4fe;box-shadow:0 0 24px rgba(168,85,247,.2),0 8px 32px rgba(0,0,0,.5)}
        .toast.success{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.35);color:#6ee7b7;box-shadow:0 0 24px rgba(16,185,129,.2),0 8px 32px rgba(0,0,0,.5)}
        .toast.error  {background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.35);color:#fca5a5;box-shadow:0 0 24px rgba(239,68,68,.2),0 8px 32px rgba(0,0,0,.5)}
        .toast.warning{background:rgba(234,179,8,.15);border:1px solid rgba(234,179,8,.35);color:#fde047;box-shadow:0 0 24px rgba(234,179,8,.2),0 8px 32px rgba(0,0,0,.5)}
        .toast.info   {background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.35);color:#a5b4fc;box-shadow:0 0 24px rgba(99,102,241,.2),0 8px 32px rgba(0,0,0,.5)}

        .collapsed .body{display:none}
    </style>

    <div class="panel" id="panel">
        <div class="scanline"></div>
        <div class="corners"><span></span><span></span><span></span><span></span></div>

        <!-- Шапка -->
        <div class="head" id="dh">
            <div class="hinner">
                <div class="hicon">⚡</div>
                <div class="htitles">
                    <div class="htitle">МАРШРУТ ОПОР</div>
                    <div class="hsub">v3.2 · SYS_ONLINE</div>
                </div>
            </div>
            <button class="hbtn" id="bMin">⊟</button>
        </div>

        <div class="body">

            <!-- Счётчики -->
            <div class="stats">
                <div class="stile">
                    <div class="sval" id="cTotal">0</div>
                    <div class="slbl">ТОЧЕК</div>
                </div>
                <div class="stile">
                    <div class="sval" id="cMain">0</div>
                    <div class="slbl">ОСНОВНЫХ</div>
                </div>
            </div>

            <!-- Большой дисплей следующего номера -->
            <div class="next-display">
                <div class="ndlbl">// СЛЕДУЮЩИЙ НОМЕР</div>
                <div class="ndval" id="nNext">1</div>
            </div>

            <!-- Начать с -->
            <div class="start-block">
                <div class="start-block-lbl">СТАРТ НУМЕРАЦИИ</div>
                <div class="start-ctrl">
                    <button class="step-btn" id="bSfMinus">−</button>
                    <input class="start-inp" id="inpStart" type="number" min="1" max="9999" value="1">
                    <button class="step-btn" id="bSfPlus">+</button>
                </div>
                <div class="start-hint">точки не меняются после расстановки</div>
            </div>

            <!-- Статус -->
            <div class="status-bar idle" id="mBadge">
                <div class="sled"></div>
                <span id="mText">STANDBY</span>
            </div>

            <!-- Расстановка -->
            <button class="btn-place" id="bPlace">◎ &nbsp;Расставить точки</button>
            <div id="subW" style="display:none">
                <button class="btn-exit-sub" id="bExitSub">↩ Выйти из подрежима</button>
            </div>

            <!-- Фото бейдж -->
            <div class="photo-badge">АВТО-ФОТО ВКЛЮЧЕНО &nbsp;·&nbsp; 8с ОЖИДАНИЕ</div>

            <!-- Прогресс -->
            <div id="progW" style="display:none">
                <div class="prog-wrap"><div class="prog-bar" id="progB" style="width:0%"></div></div>
                <div class="prog-txt" id="progT">0 / 0</div>
            </div>

            <!-- Лог -->
            <div class="logbox" id="logEl">
                <div class="le" style="color:rgba(0,255,200,.2);font-style:italic">> инициализация…</div>
            </div>

            <div class="sep"></div>

            <!-- Запуск -->
            <button class="btn-run" id="bRun" disabled>▶&nbsp; ЗАПУСТИТЬ АВТОЗАПОЛНЕНИЕ</button>

            <!-- Мелкие кнопки -->
            <div class="brow">
                <button class="bsm" id="bUndo">↩ Отмена</button>
                <button class="bsm danger" id="bClear">✕ Сброс</button>
                <button class="bsm" id="bLog">⌨ Лог</button>
            </div>

            <!-- Подсказки -->
            <div class="hints">
                <div class="hint"><kbd>ЛКМ</kbd> по карте — добавить точку</div>
                <div class="hint"><kbd>G</kbd>+<kbd>ЛКМ</kbd> по точке — подгруппа</div>
                <div class="hint"><kbd>ПКМ</kbd> по точке — удалить</div>
                <div class="hint">клик по кластеру — раскрыть веер</div>
            </div>

        </div>
    </div>
    <div class="ta" id="ta"></div>`;

    // ── Refs ───────────────────────────────────────────
    const elTotal  = sh.querySelector('#cTotal');
    const elMain   = sh.querySelector('#cMain');
    const elNNext  = sh.querySelector('#nNext');
    const elMBadge = sh.querySelector('#mBadge');
    const elMText  = sh.querySelector('#mText');
    const elBPlace = sh.querySelector('#bPlace');
    const elSubW   = sh.querySelector('#subW');
    const elBExSub = sh.querySelector('#bExitSub');
    const elProgW  = sh.querySelector('#progW');
    const elProgB  = sh.querySelector('#progB');
    const elProgT  = sh.querySelector('#progT');
    const elLog    = sh.querySelector('#logEl');
    const elBRun   = sh.querySelector('#bRun');
    const elBUndo  = sh.querySelector('#bUndo');
    const elBClear = sh.querySelector('#bClear');
    const elBLog   = sh.querySelector('#bLog');
    const elTA     = sh.querySelector('#ta');
    const elPanel  = sh.querySelector('#panel');
    const elBMin   = sh.querySelector('#bMin');
    const elInpStart = sh.querySelector('#inpStart');
    const elBSfMinus = sh.querySelector('#bSfMinus');
    const elBSfPlus  = sh.querySelector('#bSfPlus');

    // ── Начать с ───────────────────────────────────────
    elInpStart.value = startFrom;
    function applyStartFrom(v) {
        const n = Math.max(1, Math.min(9999, parseInt(v) || 1));
        startFrom = n;
        elInpStart.value = n;
        saveState(); updateUI();
    }
    elInpStart.addEventListener('change', () => applyStartFrom(elInpStart.value));
    elInpStart.addEventListener('input',  () => applyStartFrom(elInpStart.value));
    elBSfMinus.addEventListener('click',  () => applyStartFrom(startFrom - 1));
    elBSfPlus.addEventListener('click',   () => applyStartFrom(startFrom + 1));

    // ── UI update ──────────────────────────────────────
    function updateUI() {
        elTotal.textContent = dots.length;
        elMain.textContent  = dots.filter(d=>d.type==='main').length;
        elNNext.textContent = peekNext();
        // Glitch эффект при смене числа
        elNNext.classList.remove('glitch');
        void elNNext.offsetWidth;
        elNNext.classList.add('glitch');
        elBRun.disabled = dots.length === 0 || running;

        if (running) {
            elMBadge.className = 'status-bar run'; elMText.textContent = 'ВЫПОЛНЯЕТСЯ…';
            elBRun.className = 'btn-run abort'; elBRun.textContent = '⛔  ПРЕРВАТЬ'; elBRun.disabled = false;
            elBPlace.disabled = true; elProgW.style.display = 'block';
        } else if (appMode === 'place') {
            elMBadge.className = 'status-bar place'; elMText.textContent = 'РАССТАНОВКА';
            elBPlace.className = 'btn-place active'; elBPlace.textContent = '✋  Выйти из расстановки';
            elBPlace.disabled = false; elBRun.className = 'btn-run'; elBRun.textContent = '▶  ЗАПУСТИТЬ АВТОЗАПОЛНЕНИЕ';
            elProgW.style.display = 'none';
        } else {
            elMBadge.className = 'status-bar idle'; elMText.textContent = 'STANDBY';
            elBPlace.className = 'btn-place'; elBPlace.textContent = '◎  Расставить точки';
            elBPlace.disabled = false; elBRun.className = 'btn-run'; elBRun.textContent = '▶  ЗАПУСТИТЬ АВТОЗАПОЛНЕНИЕ';
            elProgW.style.display = 'none';
        }

        if (subMode && !running) {
            elMBadge.className = 'status-bar sub';
            elMText.textContent = subMode.mode==='alpha' ? `ПОДГРУППА ${subMode.baseLabel}/а,б…`
                : subMode.mode==='alpha-concat' ? `ПОДГРУППА ${subMode.baseLabel}а,б…`
                : `ПОДГРУППА ${subMode.baseLabel}/1,2…`;
            elSubW.style.display = 'block';
        } else { elSubW.style.display = 'none'; }
    }

    function updateProgress(cur, total) {
        elProgB.style.width = total ? (cur/total*100)+'%' : '0%';
        elProgT.textContent = `${cur} / ${total}`;
    }

    let logVis = false;
    function showLog(v) { logVis=v; elLog.classList.toggle('show',v); elBLog.classList.toggle('alog',v); }

    function log(msg, type='info') {
        const c = { success:'#34d399', error:'#f87171', warn:'#fbbf24', info:'rgba(255,255,255,.35)' };
        const el = document.createElement('div');
        el.className='le'; el.style.color=c[type]||c.info; el.textContent=msg;
        elLog.appendChild(el); elLog.scrollTop=elLog.scrollHeight;
    }

    function showToast(msg, type='success') {
        const el = document.createElement('div');
        el.className=`toast ${type}`; el.textContent=msg;
        elTA.appendChild(el);
        setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 2400);
    }

    // ── Кнопки ────────────────────────────────────────
    elBPlace.addEventListener('click', () => {
        setMode(appMode==='place'?'idle':'place');
        if (appMode==='place') showToast('🎯 Кликайте по карте для расстановки','info');
    });
    elBExSub.addEventListener('click', () => { subMode=null; render(); updateUI(); showToast('↩ Основная нумерация','info'); });
    elBLog.addEventListener('click',   () => showLog(!logVis));
    elBUndo.addEventListener('click',  () => {
        if (!dots.length) return;
        const rm = dots.pop();
        if (rm.type==='main') mainCounter=Math.max(0,mainCounter-1);
        else if (subMode&&rm.parentLabel===subMode.baseLabel) subMode.counter=Math.max(0,subMode.counter-1);
        openCluster=null; saveState(); render(); updateUI();
        showToast(`↩ ${rm.label}`,'warning');
    });
    elBClear.addEventListener('click', () => {
        if (!confirm('Очистить весь маршрут?')) return;
        dots=[]; mainCounter=0; subMode=null; openCluster=null;
        saveState(); render(); updateUI(); showToast('🗑 Маршрут очищен','warning');
    });
    elBRun.addEventListener('click', async () => {
        if (running) { runAborted=true; return; }
        elLog.innerHTML=''; showLog(true); runAutomation();
    });

    let collapsed=false;
    elBMin.addEventListener('click', () => {
        collapsed=!collapsed; elPanel.classList.toggle('collapsed',collapsed);
        elBMin.textContent=collapsed?'+':'−';
    });

    // Перетаскивание
    let pDrag=false,pDx=0,pDy=0;
    sh.querySelector('#dh').addEventListener('mousedown',e=>{
        pDrag=true; const r=pHost.getBoundingClientRect();
        pDx=e.clientX-r.left; pDy=e.clientY-r.top; e.preventDefault();
    });
    document.addEventListener('mousemove',e=>{ if(!pDrag)return; pHost.style.right='auto'; pHost.style.left=(e.clientX-pDx)+'px'; pHost.style.top=(e.clientY-pDy)+'px'; });
    document.addEventListener('mouseup',()=>{ pDrag=false; });

    // ═══════════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════════
    loadState();
    elInpStart.value = startFrom;
    render();
    updateUI();

    console.log('✅ Маршрут опор v3.2 | KAST Team');
    console.log('🔢 Старт с любой цифры · 📸 Авто-фото · ⏸ Пауза с вопросом · ⏱ 8с');
})();
