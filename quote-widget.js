// Widget de cotización rápida: se abre solo a los pocos segundos y pide
// los datos mínimos para poder cotizar (nombre, correo, empresa, medidas,
// micraje y cantidad). Al enviar, queda guardado en el buzón del sitio y
// se le manda un mail a ETP Polimer con la solicitud.
document.addEventListener('DOMContentLoaded', () => {
    const SHOW_AFTER = 5000;
    const SESSION_KEY = 'quote_widget_shown';

    const toggle = document.createElement('button');
    toggle.className = 'quote-widget-toggle';
    toggle.setAttribute('aria-label', 'Abrir formulario de cotización');
    toggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`;
    document.body.appendChild(toggle);

    const panel = document.createElement('div');
    panel.className = 'quote-widget-panel';
    panel.innerHTML = `
        <div class="quote-widget-head">
            <div>
                <div class="quote-widget-head-title">ETP Polimer</div>
                <div class="quote-widget-head-status">Cotización rápida</div>
            </div>
            <button type="button" class="quote-widget-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="quote-widget-body">
            <div class="quote-widget-msg">Completá estos datos y nuestro equipo te envía la cotización por correo. Todos los campos son obligatorios para poder cotizar.</div>
            <form class="quote-widget-form" id="quoteWidgetForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="qwNombre">Nombre *</label>
                        <input type="text" id="qwNombre" name="nombre" placeholder="Tu nombre" required>
                    </div>
                    <div class="form-group">
                        <label for="qwEmpresa">Empresa *</label>
                        <input type="text" id="qwEmpresa" name="empresa" placeholder="Nombre de tu empresa" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="qwEmail">Correo *</label>
                    <input type="email" id="qwEmail" name="email" placeholder="tu@empresa.cl" required>
                </div>
                <div class="form-group">
                    <label for="qwProducto">¿Qué necesitás? *</label>
                    <textarea id="qwProducto" name="producto" placeholder="Ej: bolsas de basura industrial" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="qwAncho">Ancho (mm) *</label>
                        <input type="number" id="qwAncho" name="ancho_mm" placeholder="Ej: 250" min="1" required>
                    </div>
                    <div class="form-group">
                        <label for="qwLargo">Largo (mm) *</label>
                        <input type="number" id="qwLargo" name="largo_mm" placeholder="Ej: 400" min="1" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="qwMicraje">Micraje / Calibre *</label>
                    <select id="qwMicraje" name="micraje" required>
                        <option value="">Seleccionar…</option>
                        <option>20 micrones (muy ligero)</option>
                        <option>30 micrones</option>
                        <option>50 micrones (estándar)</option>
                        <option>70 micrones</option>
                        <option>100 micrones (resistente)</option>
                        <option>150 micrones (muy resistente)</option>
                        <option>200+ micrones (industrial)</option>
                        <option>No lo sé, necesito asesoría</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="qwVolumen">Cantidad mensual estimada *</label>
                    <select id="qwVolumen" name="volumen_mensual" required>
                        <option value="">Seleccionar…</option>
                        <option>300 – 500 kg/mes</option>
                        <option>500 – 1.000 kg/mes</option>
                        <option>1.000 – 3.000 kg/mes</option>
                        <option>3.000 – 10.000 kg/mes</option>
                        <option>Más de 10.000 kg/mes</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Enviar solicitud de cotización →</button>
                <div class="quote-widget-error" id="quoteWidgetError"></div>
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
    panel.querySelector('.quote-widget-close').addEventListener('click', closePanel);

    let alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}
    if (!alreadyShown) {
        setTimeout(openPanel, SHOW_AFTER);
    } else {
        toggle.classList.add('show');
    }

    const form = document.getElementById('quoteWidgetForm');
    const errorEl = document.getElementById('quoteWidgetError');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        errorEl.textContent = '';

        const payload = {
            nombre: document.getElementById('qwNombre').value.trim(),
            empresa: document.getElementById('qwEmpresa').value.trim(),
            email: document.getElementById('qwEmail').value.trim(),
            producto: document.getElementById('qwProducto').value.trim(),
            ancho_mm: document.getElementById('qwAncho').value.trim(),
            largo_mm: document.getElementById('qwLargo').value.trim(),
            micraje: document.getElementById('qwMicraje').value,
            volumen_mensual: document.getElementById('qwVolumen').value,
            origen: location.pathname,
        };

        for (const key in payload) {
            if (key !== 'origen' && !payload[key]) {
                errorEl.textContent = 'Completá todos los campos para poder cotizar.';
                return;
            }
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando…';

        fetch('/api/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then((r) => r.json())
            .then((data) => {
                if (!data.ok) throw new Error(data.error || 'bad_response');
                panel.querySelector('.quote-widget-body').innerHTML = `
                    <div class="quote-widget-done">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <p>¡Listo! Recibimos tu solicitud, te enviamos la cotización por correo a la brevedad.</p>
                    </div>
                `;
            })
            .catch(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar solicitud de cotización →';
                errorEl.textContent = 'No pudimos enviar tu solicitud. Probá de nuevo en unos minutos.';
            });
    });
});
