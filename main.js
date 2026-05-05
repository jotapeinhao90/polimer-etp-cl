document.addEventListener('DOMContentLoaded', () => {

    // ── 1. STICKY HEADER ─────────────────────────────────
    const header = document.getElementById('siteHeader');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    // ── 2. MOBILE NAV ─────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');

    function openMobileNav() {
        mobileNav.classList.add('open');
        mobileNavOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeMobileNav() {
        mobileNav.classList.remove('open');
        mobileNavOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (hamburger) hamburger.addEventListener('click', openMobileNav);
    if (mobileNavClose) mobileNavClose.addEventListener('click', closeMobileNav);
    if (mobileNavOverlay) mobileNavOverlay.addEventListener('click', closeMobileNav);

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', closeMobileNav);
    });

    // ── 3. SCROLL REVEAL ──────────────────────────────────
    const reveals = document.querySelectorAll('.reveal');

    function runReveals() {
        const wh = window.innerHeight;
        reveals.forEach(el => {
            if (el.getBoundingClientRect().top < wh - 60) {
                el.classList.add('active');
            }
        });
    }
    window.addEventListener('scroll', runReveals, { passive: true });
    runReveals(); // run on load

    // ── 4. COUNTER ANIMATIONS ─────────────────────────────
    let counted = false;
    function countStats() {
        if (counted) return;
        const stats = document.querySelectorAll('[data-count]');
        if (!stats.length) return;
        const first = stats[0].getBoundingClientRect().top;
        if (first < window.innerHeight - 50) {
            counted = true;
            stats.forEach(el => {
                const target = parseInt(el.dataset.count);
                const suffix = el.dataset.suffix || '';
                const inc = target / (1800 / 16);
                let cur = 0;
                const tick = () => {
                    cur += inc;
                    if (cur < target) {
                        el.textContent = Math.ceil(cur) + suffix;
                        requestAnimationFrame(tick);
                    } else {
                        el.textContent = target + suffix;
                    }
                };
                tick();
            });
        }
    }
    window.addEventListener('scroll', countStats, { passive: true });
    countStats();

    // ── 5. ACTIVE NAV LINK on SCROLL ──────────────────────
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(s => {
            if (window.scrollY >= s.offsetTop - 120) current = s.id;
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) link.classList.add('active');
        });
    }, { passive: true });

    // ── 6. PRODUCT CARDS (now links, no modal needed) ────
    const productsData = {
        hielo: {
            title: "Bolsas para Hielo",
            badge: "Bolsas para Hielo",
            desc: "Resistentes a bajas temperaturas y roturas.",
            details: "Fabricadas con resinas de polietileno de baja densidad (PEBD) para soportar congelación sin perder flexibilidad ni resistencia. Disponibles en distintas capacidades y con impresión a full color con tu marca.",
            img: "img/prod-hielo.jpg"
        },
        pallet: {
            title: "Fundas Cubre Pallet",
            badge: "Cubre Pallets",
            desc: "Protección total contra polvo y humedad.",
            details: "Protegen pallets completos durante almacenamiento y transporte. Fabricadas en polietileno termocontraíble o normal. Se adaptan a las dimensiones exactas de tu carga.",
            img: "img/prod-cubre-pallet.jpg"
        },
        basura: {
            title: "Bolsas de Basura",
            badge: "Bolsas de Basura",
            desc: "Alta resistencia para todo tipo de uso.",
            details: "Para uso domiciliario, comercial e industrial. Disponibles desde 50 hasta 240 litros en distintos calibres y colores para manejo diferenciado de residuos.",
            img: "img/prod-basura.jpg"
        },
        wicketer: {
            title: "Bolsas Wicketer",
            badge: "Bolsas Wicketer",
            desc: "Ideales para envasado automático.",
            details: "Bolsas apiladas y sujetas por gancho (wicket) para líneas automáticas o semi-automáticas. Muy usadas en panaderías, avícolas y productos de higiene.",
            img: "img/prod-wicketer.jpg"
        },
        films: {
            title: "Films Especiales",
            badge: "Films Especiales",
            desc: "Laminados, barrera y stretch.",
            details: "Films coextruidos de alta barrera contra humedad y oxígeno. Film Stretch de alto rendimiento para paletización segura que minimiza daños en transporte.",
            img: "img/prod-films.jpg"
        },
        formatos: {
            title: "Formatos Especiales",
            badge: "Formatos Especiales",
            desc: "Doypack, vacío y envases a medida.",
            details: "Pouche Doypack con o sin zipper para alimentos sólidos, polvos o líquidos. Bolsas al vacío para prolongar vida útil de productos perecederos. 100% personalizados.",
            img: "img/prod-formatos.jpg"
        }
    };

    const modal = document.getElementById('productModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalImg = document.getElementById('modalImg');
    const modalBadge = document.getElementById('modalBadge');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalDetails = document.getElementById('modalDetails');
    const modalWaBtn = document.getElementById('modalWaBtn');

    document.querySelectorAll('.cat-card').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.dataset.product;
            const data = productsData[key];
            if (!data) return;

            modalImg.src = data.img;
            modalImg.alt = data.title;
            modalBadge.textContent = data.badge;
            modalTitle.textContent = data.title;
            modalDesc.textContent = data.desc;
            modalDetails.textContent = data.details;
            modalWaBtn.href = `https://wa.me/56944843503?text=${encodeURIComponent(`Hola, me gustaría cotizar "${data.title}".`)}`;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

});
