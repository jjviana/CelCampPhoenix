/*
 * JFrame.js  -  CelCamp Phoenix (2026)
 *
 * Windows, menus and dialogs in the style of Java's Metal look and feel:
 * every JFrame of CelCampJava becomes a draggable window on a "desktop".
 */
import { hasDOM, el, JComponent } from './swing.js';

let desktop = null;
let zTop = 10;
let cascade = 0;
const ICON = new URL('../../img/iconeApp_small.gif', import.meta.url).href;

function getDesktop() {
    if (!hasDOM) return null;
    if (!desktop) desktop = document.getElementById('desktop') || document.body;
    return desktop;
}

const isNarrow = () => hasDOM && window.matchMedia('(max-width: 700px)').matches;

export class JFrame {
    constructor(title) {
        this.title = title || "";
        this.visible = false;
        this.disposed = false;
        this.closeListeners = [];
        this.defaultCloseOperation = 'hide';
        if (!hasDOM) return;

        this.win = el('div', 'jframe');
        this.win.setAttribute('role', 'dialog');
        this.win.style.display = 'none';
        const bar = el('div', 'jframe-title');
        const icon = el('img', 'jframe-icon');
        icon.src = ICON; icon.alt = '';
        this.titleEl = el('span', 'jframe-title-text', this.title);
        const close = el('button', 'jframe-close', '×');
        close.type = 'button';
        close.title = 'Close';
        close.setAttribute('aria-label', 'Close ' + this.title);
        close.addEventListener('click', () => this.processWindowClosing());
        bar.append(icon, this.titleEl, close);
        this.menuBarSlot = el('div', 'jframe-menubar-slot');
        this.contentPane = el('div', 'jframe-content');
        this.win.append(bar, this.menuBarSlot, this.contentPane);
        this.win.addEventListener('pointerdown', () => this.toFront(), true);
        this._makeDraggable(bar);
        getDesktop().appendChild(this.win);
        // keep the window inside the desktop when its content grows
        if (typeof ResizeObserver !== 'undefined')
            new ResizeObserver(() => this._keepInside()).observe(this.win);
    }

    _keepInside() {
        if (!this.visible || isNarrow()) return;
        const d = getDesktop();
        const bottom = this.win.offsetTop + this.win.offsetHeight;
        if (bottom > d.clientHeight - 4) this.win.style.top = Math.max(0, d.clientHeight - this.win.offsetHeight - 4) + 'px';
    }

    _makeDraggable(bar) {
        let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
        bar.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button') || isNarrow()) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            ox = this.win.offsetLeft; oy = this.win.offsetTop;
            bar.setPointerCapture(e.pointerId);
        });
        bar.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const d = getDesktop();
            const x = Math.max(-this.win.offsetWidth + 60, Math.min(d.clientWidth - 60, ox + e.clientX - sx));
            const y = Math.max(0, Math.min(d.clientHeight - 30, oy + e.clientY - sy));
            this.win.style.left = x + 'px';
            this.win.style.top = y + 'px';
        });
        const end = () => { dragging = false; };
        bar.addEventListener('pointerup', end);
        bar.addEventListener('pointercancel', end);
    }

    getContentPane() { return this.contentPane; }
    setTitle(t) { this.title = t; if (this.titleEl) this.titleEl.textContent = t; }
    getTitle() { return this.title; }
    setJMenuBar(mb) { if (this.menuBarSlot) { this.menuBarSlot.innerHTML = ''; this.menuBarSlot.appendChild(mb.el); } }
    setIconImage() {}
    setDefaultCloseOperation(op) { this.defaultCloseOperation = op; }
    addWindowListener(l) { this.closeListeners.push(l); }
    pack() {}
    setLocationByPlatform() {
        if (!this.win) return;
        if (isNarrow()) { this.win.style.left = ''; this.win.style.top = ''; return; }
        const d = getDesktop();
        const step = 28;
        // to the right of the main window when there is room
        const main = document.querySelector('.telainicial');
        const x0 = d.clientWidth > 900 ? (main && main.offsetWidth ? main.offsetLeft + main.offsetWidth + 20 : 336) : 40;
        const x = x0 + (cascade * step) % Math.max(step, d.clientWidth - x0 - 460);
        const y = 16 + (cascade * step) % Math.max(step, d.clientHeight - 300);
        cascade++;
        this.win.style.left = x + 'px';
        this.win.style.top = y + 'px';
    }
    setLocation(x, y) { if (this.win) { this.win.style.left = x + 'px'; this.win.style.top = y + 'px'; } }
    toFront() { if (this.win) this.win.style.zIndex = String(++zTop); }
    setVisible(b) {
        this.visible = b;
        if (!this.win) return;
        this.win.style.display = b ? '' : 'none';
        if (b) {
            this.toFront();
            // keep the window inside the desktop
            const d = getDesktop();
            if (!isNarrow() && this.win.offsetLeft + 60 > d.clientWidth) this.win.style.left = Math.max(0, d.clientWidth - this.win.offsetWidth - 10) + 'px';
        }
    }
    isVisible() { return this.visible; }
    processWindowClosing() {
        for (const l of this.closeListeners) if (l.windowClosing) l.windowClosing(this);
        if (this.defaultCloseOperation === 'dispose') this.dispose();
        else if (this.defaultCloseOperation === 'hide') this.setVisible(false);
    }
    dispose() {
        this.disposed = true;
        this.visible = false;
        if (this.win && this.win.parentNode) this.win.parentNode.removeChild(this.win);
    }
}

/* ------------------------------ menus ------------------------------ */

let openMenu = null;
function closeMenus() { if (openMenu) { openMenu.close(); openMenu = null; } }
if (hasDOM) {
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.jmenubar')) closeMenus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
}

function mnemonicLabel(text, mnemonic) {
    const span = el('span');
    const idx = mnemonic ? text.indexOf(mnemonic) : -1;
    if (idx < 0) { span.textContent = text; return span; }
    span.append(document.createTextNode(text.substring(0, idx)), el('u', null, text[idx]), document.createTextNode(text.substring(idx + 1)));
    return span;
}

export class JMenuBar extends JComponent {
    constructor() { super(el('div', 'jmenubar')); this.menus = []; if (this.el) this.el.setAttribute('role', 'menubar'); }
    add(menu) { this.menus.push(menu); menu.bar = this; if (this.el) this.el.appendChild(menu.el); }
}

export class JMenu extends JComponent {
    constructor(text, mnemonic) {
        super(el('div', 'jmenu'));
        this.items = [];
        if (!this.el) return;
        this.button = el('button', 'jmenu-button');
        this.button.type = 'button';
        this.button.setAttribute('aria-haspopup', 'true');
        this.button.appendChild(mnemonicLabel(text, mnemonic));
        this.popup = el('div', 'jmenu-popup');
        this.popup.setAttribute('role', 'menu');
        this.el.append(this.button, this.popup);
        this.button.addEventListener('click', () => { if (openMenu === this) closeMenus(); else this.open(); });
        this.button.addEventListener('pointerenter', () => { if (openMenu && openMenu !== this) this.open(); });
    }
    open() { closeMenus(); this.el.classList.add('open'); openMenu = this; }
    close() { this.el.classList.remove('open'); }
    add(item) { this.items.push(item); item.menu = this; if (this.popup) this.popup.appendChild(item.el); }
    addSeparator() { if (this.popup) this.popup.appendChild(el('div', 'jmenu-separator')); }
}

export class JMenuItem extends JComponent {
    constructor(text, mnemonic, action) {
        const b = el('button', 'jmenuitem');
        super(b);
        this.listeners = [];
        if (action) this.listeners.push(action);
        if (!b) return;
        b.type = 'button';
        b.setAttribute('role', 'menuitem');
        b.appendChild(mnemonicLabel(text, mnemonic));
        b.addEventListener('click', () => { if (!this.enabled) return; closeMenus(); this.listeners.forEach(l => l()); });
    }
    addActionListener(l) { this.listeners.push(l); }
    doClick() { if (this.enabled) this.listeners.forEach(l => l()); }
}

/* ----------------------------- dialogs ------------------------------ */

export class JOptionPane {
    static ERROR_MESSAGE = 0;
    static INFORMATION_MESSAGE = 1;
    static WARNING_MESSAGE = 2;
    static QUESTION_MESSAGE = 3;
    static PLAIN_MESSAGE = -1;
    static YES_NO_OPTION = 0;

    /** Phoenix: dialogs are asynchronous; the returned Promise resolves when closed. */
    static showMessageDialog(parent, message, title, messageType, icon) {
        if (!hasDOM) { console.log("[" + (title || "Message") + "] " + message); return Promise.resolve(); }
        return JOptionPane._dialog(message, title || "Message", messageType === undefined ? 1 : messageType, ["OK"], icon).then(() => undefined);
    }

    /** Resolves to 0 (yes) or 1 (no), like JOptionPane.YES_OPTION / NO_OPTION. */
    static showConfirmDialog(parent, message, title, optionType) {
        if (!hasDOM) return Promise.resolve(0);
        return JOptionPane._dialog(message, title || "Select an Option", 3, ["Yes", "No"]);
    }

    static _dialog(message, title, type, buttons, icon) {
        return new Promise((resolve) => {
            const veil = el('div', 'joption-veil');
            const box = el('div', 'jframe joption');
            box.setAttribute('role', 'alertdialog');
            box.setAttribute('aria-label', title);
            const bar = el('div', 'jframe-title');
            const ic = el('img', 'jframe-icon'); ic.src = ICON; ic.alt = '';
            bar.append(ic, el('span', 'jframe-title-text', title));
            const body = el('div', 'joption-body');
            const glyph = el('div', 'joption-glyph joption-type-' + type);
            if (icon) { glyph.className = 'joption-glyph'; const im = el('img'); im.src = icon; im.alt = ''; glyph.appendChild(im); }
            else glyph.textContent = ({ 0: '!', 1: 'i', 2: '!', 3: '?' })[type] || '';
            const msg = el('div', 'joption-message');
            msg.textContent = String(message);
            body.append(glyph, msg);
            const btns = el('div', 'joption-buttons');
            const done = (i) => { veil.remove(); document.removeEventListener('keydown', onKey); resolve(i); };
            const onKey = (e) => { if (e.key === 'Escape') done(buttons.length - 1); if (e.key === 'Enter') done(0); };
            buttons.forEach((t, i) => {
                const b = el('button', 'jbutton', t); b.type = 'button';
                b.addEventListener('click', () => done(i));
                btns.appendChild(b);
            });
            box.append(bar, body, btns);
            veil.appendChild(box);
            document.body.appendChild(veil);
            document.addEventListener('keydown', onKey);
            btns.firstChild.focus();
        });
    }
}
