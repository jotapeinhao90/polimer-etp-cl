// Widget de pre-chat: se abre solo a los pocos segundos y pide nombre,
// empresa y producto antes de continuar la conversación por WhatsApp.
document.addEventListener('DOMContentLoaded', () => {
    const waFloat = document.querySelector('.wa-float');
    if (!waFloat) return;

    const SHOW_AFTER = 5000;
    const SESSION_KEY = 'wa_widget_shown';

    const toggle = document.createElement('button');
    toggle.className = 'wa-chat-toggle';
    toggle.setAttribute('aria-label', 'Abrir chat');
    toggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`;
    document.body.appendChild(toggle);

    const panel = document.createElement('div');
    panel.className = 'wa-chat-panel';
    panel.innerHTML = `
        <div class="wa-chat-head">
            <div>
                <div class="wa-chat-head-title">ETP Polimer</div>
                <div class="wa-chat-head-status">En línea</div>
            </div>
            <button type="button" class="wa-chat-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="wa-chat-body">
            <div class="wa-chat-msg">¡Hola! Contanos tu nombre, empresa y qué producto necesitás, y te respondemos enseguida por WhatsApp.</div>
            <form class="wa-chat-form" id="waChatForm">
                <div class="form-group">
                    <label for="waNombre">Nombre *</label>
                    <input type="text" id="waNombre" name="nombre" placeholder="Tu nombre" required>
                </div>
                <div class="form-group">
                    <label for="waEmpresa">Empresa</label>
                    <input type="text" id="waEmpresa" name="empresa" placeholder="Nombre de tu empresa">
                </div>
                <div class="form-group">
                    <label for="waProducto">¿Qué producto necesitás? *</label>
                    <textarea id="waProducto" name="producto" placeholder="Ej: bolsas de basura industrial, 500 kg/mes" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Enviar y continuar por WhatsApp →</button>
                <div class="wa-chat-error" id="waChatError"></div>
            </form>
        </div>
    `;
    document.body.appendChild(panel);

    function openPanel() {
        panel.classList.add('show');
        toggle.classList.remove('show');
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
    }
    function closePanel() {
        panel.classList.remove('show');
        toggle.classList.add('show');
    }

    toggle.addEventListener('click', openPanel);
    panel.querySelector('.wa-chat-close').addEventListener('click', closePanel);

    let alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}
    if (!alreadyShown) {
        setTimeout(openPanel, SHOW_AFTER);
    } else {
        toggle.classList.add('show');
    }

    const form = document.getElementById('waChatForm');
    const errorEl = document.getElementById('waChatError');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        const nombre = document.getElementById('waNombre').value.trim();
        const empresa = document.getElementById('waEmpresa').value.trim();
        const producto = document.getElementById('waProducto').value.trim();
        if (!nombre || !producto) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando…';

        fetch('/api/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, empresa, producto, origen: location.pathname }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (!data.ok || !data.whatsapp) throw new Error('bad_response');
                panel.querySelector('.wa-chat-body').innerHTML = `
                    <div class="wa-chat-done">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <p>¡Listo! Te avisamos y abrimos WhatsApp para que sigas la conversación.</p>
                        <a href="${data.whatsapp}" target="_blank" rel="noopener" class="btn btn-primary btn-block">Abrir WhatsApp →</a>
                    </div>
                `;
                window.open(data.whatsapp, '_blank', 'noopener');
            })
            .catch(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar y continuar por WhatsApp →';
                errorEl.textContent = 'No pudimos enviar tus datos. Probá de nuevo o escribinos directo por WhatsApp.';
            });
    });
});
