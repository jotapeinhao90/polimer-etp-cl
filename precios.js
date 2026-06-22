document.addEventListener('DOMContentLoaded', () => {
    fetch('data/precios.json?v=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
            renderPricesPage(data);
            renderNavDropdown(data);
        })
        .catch(() => {
            const statusEl = document.getElementById('preciosStatus');
            if (statusEl) statusEl.textContent = 'No se pudieron cargar los datos en este momento. Intenta más tarde.';
        });

    function isValid(card) {
        return card && Array.isArray(card.series) && card.series.length > 1;
    }

    function formatDate(iso, mode) {
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d)) return iso;
        if (mode === 'axis-year') return d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
        if (mode === 'axis-short') return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ───────────────────────── PÁGINA DE PRECIOS COMPLETA ─────────────────────────
    function renderPricesPage(data) {
        const statusEl = document.getElementById('preciosStatus');
        const cardsEl = document.getElementById('priceCards');
        if (!statusEl || !cardsEl) return;

        const hasOil = isValid(data.oil);
        const hasResin = isValid(data.resin_ppi);

        if (!hasOil && !hasResin) {
            statusEl.textContent = 'Todavía no hay datos disponibles — la primera actualización automática está pendiente.';
            return;
        }
        statusEl.style.display = 'none';
        cardsEl.style.display = '';

        if (hasOil) {
            setupCard(data.oil, 'oil', {
                decimals: 2, valuePrefix: 'US$ ',
                ranges: [{ label: '30D', n: 30 }, { label: '60D', n: 60 }, { label: 'Todo', n: Infinity }]
            });
        } else hideCard('oil');

        if (hasResin) {
            setupCard(data.resin_ppi, 'resin', {
                decimals: 1, valuePrefix: '',
                ranges: [{ label: '1A', n: 12 }, { label: '3A', n: 36 }, { label: 'Todo', n: Infinity }]
            });
        } else hideCard('resin');
    }

    function hideCard(prefix) {
        const el = document.getElementById(prefix + 'Label');
        if (el && el.closest('.price-card')) el.closest('.price-card').style.display = 'none';
    }

    function setupCard(card, prefix, opts) {
        const ids = {
            label: prefix + 'Label', source: prefix + 'Source', value: prefix + 'Value',
            change: prefix + 'Change', chart: prefix + 'Chart', updated: prefix + 'Updated',
            tooltip: prefix + 'Tooltip', rangeFilter: prefix + 'RangeFilter', axisLabels: prefix + 'AxisLabels'
        };

        document.getElementById(ids.label).textContent = card.label;
        document.getElementById(ids.source).textContent = card.source || '';

        const series = card.series;
        const last = series[series.length - 1];
        const prev = series[series.length - 2];

        document.getElementById(ids.value).textContent = opts.valuePrefix + last.value.toFixed(opts.decimals);

        const diff = last.value - prev.value;
        const pct = (diff / prev.value) * 100;
        const changeEl = document.getElementById(ids.change);
        changeEl.textContent = `${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
        changeEl.className = 'price-card-change ' + (diff >= 0 ? 'up' : 'down');

        document.getElementById(ids.updated).textContent =
            `${card.unit} · Precio oficial del ${formatDate(last.date)}`;

        const filterEl = document.getElementById(ids.rangeFilter);
        filterEl.innerHTML = '';
        opts.ranges.forEach((r, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'range-btn' + (i === 0 ? ' active' : '');
            btn.textContent = r.label;
            btn.addEventListener('click', () => {
                filterEl.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const sliced = r.n === Infinity ? series : series.slice(-r.n);
                drawChart(ids, sliced, opts.decimals, opts.valuePrefix);
            });
            filterEl.appendChild(btn);
        });

        const initialRange = opts.ranges[0];
        const initialSlice = initialRange.n === Infinity ? series : series.slice(-initialRange.n);
        drawChart(ids, initialSlice, opts.decimals, opts.valuePrefix);
    }

    function drawChart(ids, series, decimals, valuePrefix) {
        const svg = document.getElementById(ids.chart);
        const tooltip = document.getElementById(ids.tooltip);
        const axisLabelsEl = document.getElementById(ids.axisLabels);
        if (!svg || series.length < 2) return;

        const w = 340, h = 170;
        const padL = 40, padR = 8, padT = 10, padB = 10;
        const plotW = w - padL - padR;
        const plotH = h - padT - padB;

        const values = series.map(p => p.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = (max - min) || 1;
        const vMin = min - range * 0.1;
        const vMax = max + range * 0.1;
        const vRange = vMax - vMin;

        const points = series.map((p, i) => ({
            x: padL + (i / (series.length - 1)) * plotW,
            y: padT + (1 - (p.value - vMin) / vRange) * plotH,
            date: p.date,
            value: p.value
        }));

        const rising = values[values.length - 1] >= values[0];
        const color = rising ? '#DC2626' : '#059669';

        const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
        const areaPath = linePath + ` L${points[points.length - 1].x.toFixed(1)},${padT + plotH} L${points[0].x.toFixed(1)},${padT + plotH} Z`;

        let gridSvg = '';
        const gridCount = 4;
        for (let i = 0; i <= gridCount; i++) {
            const gy = padT + (i / gridCount) * plotH;
            const gValue = vMax - (i / gridCount) * vRange;
            gridSvg += `<line class="price-chart-gridline" x1="${padL}" y1="${gy.toFixed(1)}" x2="${w - padR}" y2="${gy.toFixed(1)}"></line>`;
            gridSvg += `<text x="${padL - 6}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#94A3B8">${valuePrefix}${gValue.toFixed(decimals > 0 ? 1 : 0)}</text>`;
        }

        const lastPoint = points[points.length - 1];

        svg.innerHTML = `
            ${gridSvg}
            <path d="${areaPath}" fill="${color}" opacity="0.08"></path>
            <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
            <circle cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="3.5" fill="${color}"></circle>
            <line class="price-chart-hover-line" data-hover="line" x1="0" y1="${padT}" x2="0" y2="${padT + plotH}"></line>
            <circle class="price-chart-hover-dot" data-hover="dot" r="4" fill="${color}" stroke="white" stroke-width="2"></circle>
        `;

        const hoverLine = svg.querySelector('[data-hover="line"]');
        const hoverDot = svg.querySelector('[data-hover="dot"]');

        svg.onmousemove = (e) => {
            const rect = svg.getBoundingClientRect();
            const mx = ((e.clientX - rect.left) / rect.width) * w;
            let closest = points[0], minDist = Infinity;
            points.forEach(p => {
                const d = Math.abs(p.x - mx);
                if (d < minDist) { minDist = d; closest = p; }
            });
            hoverLine.setAttribute('x1', closest.x.toFixed(1));
            hoverLine.setAttribute('x2', closest.x.toFixed(1));
            hoverLine.style.opacity = 1;
            hoverDot.setAttribute('cx', closest.x.toFixed(1));
            hoverDot.setAttribute('cy', closest.y.toFixed(1));
            hoverDot.style.opacity = 1;

            if (tooltip) {
                tooltip.style.left = ((closest.x / w) * rect.width) + 'px';
                tooltip.style.top = ((closest.y / h) * rect.height) + 'px';
                tooltip.innerHTML = `<strong>${valuePrefix}${closest.value.toFixed(decimals)}</strong>${formatDate(closest.date)}`;
                tooltip.classList.add('show');
            }
        };
        svg.onmouseleave = () => {
            hoverLine.style.opacity = 0;
            hoverDot.style.opacity = 0;
            if (tooltip) tooltip.classList.remove('show');
        };

        if (axisLabelsEl) {
            const firstYear = new Date(series[0].date + 'T00:00:00').getFullYear();
            const lastYear = new Date(series[series.length - 1].date + 'T00:00:00').getFullYear();
            const axisMode = firstYear !== lastYear ? 'axis-year' : 'axis-short';

            const labelCount = Math.min(5, series.length);
            axisLabelsEl.innerHTML = '';
            for (let i = 0; i < labelCount; i++) {
                const idx = labelCount === 1 ? 0 : Math.round((i / (labelCount - 1)) * (series.length - 1));
                const span = document.createElement('span');
                span.textContent = formatDate(series[idx].date, axisMode);
                axisLabelsEl.appendChild(span);
            }
        }
    }

    // ───────────────────────── MINI GRÁFICOS DEL MENÚ ─────────────────────────
    function renderNavDropdown(data) {
        if (isValid(data.oil)) drawMiniChart('navOilChart', 'navOilValue', data.oil.series, 2, 'US$ ');
        if (isValid(data.resin_ppi)) drawMiniChart('navResinChart', 'navResinValue', data.resin_ppi.series, 1, '');
    }

    function drawMiniChart(svgId, valueElId, series, decimals, prefix) {
        const svg = document.getElementById(svgId);
        if (!svg) return;
        const last = series[series.length - 1];
        const valueEl = document.getElementById(valueElId);
        if (valueEl) valueEl.textContent = prefix + last.value.toFixed(decimals);

        const w = 120, h = 40, pad = 3;
        const values = series.slice(-30).map(p => p.value);
        const min = Math.min(...values), max = Math.max(...values);
        const range = (max - min) || 1;
        const points = values.map((v, i) => [
            pad + (i / (values.length - 1)) * (w - pad * 2),
            h - pad - ((v - min) / range) * (h - pad * 2)
        ]);
        const rising = values[values.length - 1] >= values[0];
        const color = rising ? '#DC2626' : '#059669';
        const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
        const areaPath = linePath + ` L${points[points.length - 1][0].toFixed(1)},${h} L${points[0][0].toFixed(1)},${h} Z`;
        svg.innerHTML = `
            <path d="${areaPath}" fill="${color}" opacity="0.1"></path>
            <path d="${linePath}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"></path>
        `;
    }
});
