document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('preciosStatus');
    const cardsEl = document.getElementById('priceCards');
    if (!statusEl || !cardsEl) return;

    fetch('data/precios.json?v=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(renderData)
        .catch(() => {
            statusEl.textContent = 'No se pudieron cargar los datos en este momento. Intenta más tarde.';
        });

    function renderData(data) {
        const hasOil = data.oil && Array.isArray(data.oil.series) && data.oil.series.length > 0;
        const hasResin = data.resin_ppi && Array.isArray(data.resin_ppi.series) && data.resin_ppi.series.length > 0;

        if (!hasOil && !hasResin) {
            statusEl.textContent = 'Todavía no hay datos disponibles — la primera actualización automática está pendiente.';
            return;
        }

        statusEl.style.display = 'none';
        cardsEl.style.display = '';

        if (hasOil) renderCard(data.oil, {
            label: 'oilLabel', source: 'oilSource', value: 'oilValue',
            change: 'oilChange', chart: 'oilChart', updated: 'oilUpdated'
        }, { decimals: 2, prefix: 'US$ ' });
        else document.querySelector('.price-card').style.display = 'none';

        if (hasResin) renderCard(data.resin_ppi, {
            label: 'resinLabel', source: 'resinSource', value: 'resinValue',
            change: 'resinChange', chart: 'resinChart', updated: 'resinUpdated'
        }, { decimals: 1, prefix: '' });
        else document.querySelectorAll('.price-card')[1].style.display = 'none';
    }

    function renderCard(card, ids, fmt) {
        const series = card.series;
        const last = series[series.length - 1];
        const prev = series.length > 1 ? series[series.length - 2] : null;

        document.getElementById(ids.label).textContent = card.label;
        document.getElementById(ids.source).textContent = card.source || '';

        document.getElementById(ids.value).textContent =
            fmt.prefix + last.value.toFixed(fmt.decimals) + (card.unit && fmt.prefix ? '' : '');

        const changeEl = document.getElementById(ids.change);
        if (prev) {
            const diff = last.value - prev.value;
            const pct = (diff / prev.value) * 100;
            const sign = diff >= 0 ? '+' : '';
            changeEl.textContent = `${sign}${pct.toFixed(1)}%`;
            changeEl.className = 'price-card-change ' + (diff >= 0 ? 'up' : 'down');
        }

        document.getElementById(ids.updated).textContent =
            `${card.unit} · Actualizado ${formatDate(last.date)}`;

        drawSparkline(document.getElementById(ids.chart), series.map(p => p.value));
    }

    function formatDate(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function drawSparkline(svg, values) {
        if (!svg || values.length < 2) return;
        const w = 320, h = 80, pad = 6;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const points = values.map((v, i) => {
            const x = pad + (i / (values.length - 1)) * (w - pad * 2);
            const y = h - pad - ((v - min) / range) * (h - pad * 2);
            return [x, y];
        });

        const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
        const areaPath = linePath + ` L${points[points.length - 1][0].toFixed(1)},${h} L${points[0][0].toFixed(1)},${h} Z`;

        const rising = values[values.length - 1] >= values[0];
        const color = rising ? '#DC2626' : '#059669';

        svg.innerHTML = `
            <path d="${areaPath}" fill="${color}" opacity="0.08"></path>
            <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
            <circle cx="${points[points.length - 1][0]}" cy="${points[points.length - 1][1]}" r="3" fill="${color}"></circle>
        `;
    }
});
