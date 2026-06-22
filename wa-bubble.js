// Burbuja de aviso sobre el botón flotante de WhatsApp
document.addEventListener('DOMContentLoaded', () => {
    const waFloat = document.querySelector('.wa-float');
    if (!waFloat) return;

    const SHOW_AFTER = 4000;
    const HIDE_AFTER = 9000;

    setTimeout(() => {
        const bubble = document.createElement('div');
        bubble.className = 'wa-bubble';
        bubble.innerHTML = `
            <button class="wa-bubble-close" aria-label="Cerrar">&times;</button>
            <strong>¡Cotiza aquí!</strong>
            <span>Respuesta inmediata por WhatsApp</span>
        `;
        document.body.appendChild(bubble);
        requestAnimationFrame(() => bubble.classList.add('show'));

        let hideTimer = setTimeout(hideBubble, HIDE_AFTER);

        function hideBubble() {
            bubble.classList.remove('show');
            setTimeout(() => bubble.remove(), 300);
        }

        bubble.querySelector('.wa-bubble-close').addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(hideTimer);
            hideBubble();
        });
        bubble.addEventListener('click', () => {
            clearTimeout(hideTimer);
            waFloat.click();
            hideBubble();
        });
    }, SHOW_AFTER);
});
