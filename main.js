document.addEventListener('DOMContentLoaded', () => {

    // ── 1. STICKY HEADER ──────────────────────────────────
    const header = document.getElementById('siteHeader');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 60);
        }, { passive: true });
    }

    // ── 2. MOBILE NAV ─────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');

    const openNav = () => {
        if (mobileNav) mobileNav.classList.add('open');
        if (mobileNavOverlay) mobileNavOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    };
    const closeNav = () => {
        if (mobileNav) mobileNav.classList.remove('open');
        if (mobileNavOverlay) mobileNavOverlay.classList.remove('open');
        document.body.style.overflow = '';
    };

    if (hamburger) hamburger.addEventListener('click', openNav);
    if (mobileNavClose) mobileNavClose.addEventListener('click', closeNav);
    if (mobileNavOverlay) mobileNavOverlay.addEventListener('click', closeNav);
    document.querySelectorAll('.mobile-nav-link').forEach(l => l.addEventListener('click', closeNav));

    // ── 3. SCROLL REVEAL (IntersectionObserver) ───────────
    const revealObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                revealObs.unobserve(e.target);
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    // ── 4. COUNTER ANIMATION ──────────────────────────────
    const counterObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const el = e.target;
                const target = parseInt(el.dataset.count);
                const suffix = el.dataset.suffix || '';
                const duration = 1600;
                const steps = 60;
                const inc = target / steps;
                let cur = 0;
                let step = 0;
                const tick = () => {
                    step++;
                    cur = Math.min(Math.ceil(inc * step), target);
                    el.textContent = cur + suffix;
                    if (cur < target) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
                counterObs.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

    // ── 5. CATALOG PAGE LOGIC ─────────────────────────────
    const catalogGrid = document.getElementById('catalogGrid');
    if (catalogGrid && typeof PRODUCTOS !== 'undefined') {
        initCatalog();
    }

    function initCatalog() {
        const CATEGORY_MAP = {
            'bolsas': ['bolsas-hielo', 'bolsas-wicketer', 'bolsas-basura', 'bolsas-rollo-prepicadas', 'bolsas-contenedoras', 'bolsas-bins', 'fundas-cubre-pallet'],
            'films':  ['films-laminados', 'films-barrera', 'film-stretch'],
            'formatos': ['puche-doypack', 'pouche-vacio', 'envases-especiales']
        };

        const CATEGORY_LABELS = {
            'todos': 'Todos los productos',
            'bolsas': 'Bolsas Industriales',
            'films': 'Films',
            'formatos': 'Formatos Especiales'
        };

        // Read initial category from URL param
        const params = new URLSearchParams(window.location.search);
        let activeCat = params.get('cat') || 'todos';
        if (!CATEGORY_LABELS[activeCat]) activeCat = 'todos';

        // Set active filter item in sidebar
        document.querySelectorAll('.filter-item').forEach(item => {
            item.classList.toggle('active', item.dataset.cat === activeCat);
            item.addEventListener('click', () => {
                document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                renderCatalog(item.dataset.cat);
                // Update URL without reload
                const url = new URL(window.location);
                if (item.dataset.cat === 'todos') url.searchParams.delete('cat');
                else url.searchParams.set('cat', item.dataset.cat);
                window.history.replaceState({}, '', url);
            });
        });

        renderCatalog(activeCat);

        function renderCatalog(cat) {
            const keys = cat === 'todos'
                ? Object.keys(PRODUCTOS)
                : (CATEGORY_MAP[cat] || []);

            const title = document.getElementById('catalogTitle');
            const count = document.getElementById('catalogCount');
            if (title) title.textContent = CATEGORY_LABELS[cat] || 'Todos los productos';
            if (count) count.textContent = keys.length + ' producto' + (keys.length !== 1 ? 's' : '');

            catalogGrid.innerHTML = '';
            keys.forEach(key => {
                const p = PRODUCTOS[key];
                if (!p) return;

                const imgHtml = p.img
                    ? `<img src="${p.img}" alt="${p.titulo}" loading="lazy">`
                    : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

                const card = document.createElement('a');
                card.href = `producto.html?id=${key}`;
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-card-img">${imgHtml}</div>
                    <div class="product-card-body">
                        <span class="product-badge">${p.categoria}</span>
                        <h3>${p.titulo}</h3>
                        <p>${p.descripcion_corta}</p>
                        <span class="product-card-link">Ver especificaciones →</span>
                    </div>`;
                catalogGrid.appendChild(card);
            });
        }
    }

    // ── 6. WHATSAPP MESSAGE BY CATEGORY (productos.html?cat=...) ──
    const CATEGORY_WA_LABELS = {
        bolsas: 'bolsas industriales',
        films: 'films',
        formatos: 'formatos especiales'
    };
    const catParam = new URLSearchParams(window.location.search).get('cat');
    if (catParam && CATEGORY_WA_LABELS[catParam]) {
        const waMsg = encodeURIComponent(`Hola, estoy interesado en ${CATEGORY_WA_LABELS[catParam]} para mi empresa.`);
        const waUrl = `https://wa.me/56933643058?text=${waMsg}`;
        document.querySelectorAll('a[href*="wa.me"]').forEach(a => { a.href = waUrl; });
    }

});
