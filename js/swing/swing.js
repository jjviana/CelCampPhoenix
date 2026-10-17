/*
 * swing.js  -  CelCamp Phoenix (2026)
 *
 * A very small imitation of the javax.swing components used by CelCampJava,
 * so that the ported frames can keep their Java shape:
 *     NField.getText(), pBar.setValue(n), StartButton.setEnabled(false) ...
 *
 * Every component works with or without a DOM: without `document` (Node
 * tests) the components just keep their state.
 */

export const hasDOM = typeof document !== 'undefined';

function el(tag, cls, text) {
    if (!hasDOM) return null;
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
}
export { el };

export class JComponent {
    constructor(element) {
        this.el = element || null;
        this.enabled = true;
        this.toolTip = null;
    }
    setEnabled(b) {
        this.enabled = b;
        if (this.el) {
            if ('disabled' in this.el) this.el.disabled = !b;
            this.el.classList.toggle('disabled', !b);
        }
    }
    isEnabled() { return this.enabled; }
    setToolTipText(t) { this.toolTip = t; if (this.el) this.el.title = t; }
    setVisible(b) { if (this.el) this.el.style.display = b ? '' : 'none'; }
}

export class JLabel extends JComponent {
    constructor(text, cls) {
        super(el('span', 'jlabel' + (cls ? ' ' + cls : ''), text || ''));
        this.text = text || '';
    }
    setText(t) { this.text = String(t); if (this.el) this.el.textContent = this.text; }
    getText() { return this.text; }
}

export class JTextField extends JComponent {
    constructor(text, columns) {
        const e = el('input', 'jtextfield');
        if (e) { e.type = 'text'; e.value = text || ''; if (columns) e.size = columns; e.spellcheck = false; }
        super(e);
        this.text = text || '';
    }
    setText(t) { this.text = String(t); if (this.el) this.el.value = this.text; }
    getText() { return this.el ? this.el.value : this.text; }
}

export class JButton extends JComponent {
    constructor(text, onClick) {
        const e = el('button', 'jbutton', text);
        if (e) e.type = 'button';
        super(e);
        this.listeners = [];
        if (onClick) this.addActionListener(onClick);
        if (e) e.addEventListener('click', (ev) => { if (this.enabled) this.listeners.forEach(l => l(ev)); });
    }
    addActionListener(l) { this.listeners.push(l); }
    doClick() { if (this.enabled) this.listeners.forEach(l => l({})); }
    setText(t) { if (this.el) this.el.textContent = t; }
}

let groupCounter = 0;
export class ButtonGroup {
    constructor() { this.name = 'bg' + (++groupCounter); this.buttons = []; }
    add(b) { this.buttons.push(b); b.group = this; if (b.input) b.input.name = this.name; }
}

export class JRadioButton extends JComponent {
    constructor(text, selected) {
        const label = el('label', 'jradio');
        let input = null;
        if (label) {
            input = document.createElement('input');
            input.type = 'radio';
            label.append(input, document.createTextNode(' ' + text));
        }
        super(label);
        this.input = input;
        this.text = text;
        this.selected = !!selected;
        if (input) input.checked = this.selected;
    }
    setText(t) { this.text = t; if (this.el) this.el.lastChild.textContent = ' ' + t; }
    setSelected(b) {
        this.selected = b;
        if (b && this.group) this.group.buttons.forEach(o => { if (o !== this) o.selected = false; });
        if (this.input) this.input.checked = b;
    }
    isSelected() { return this.input ? this.input.checked : this.selected; }
    setEnabled(b) { super.setEnabled(b); if (this.input) this.input.disabled = !b; }
}

export class JCheckBox extends JComponent {
    constructor(text, selected) {
        const label = el('label', 'jcheckbox');
        let input = null;
        if (label) {
            input = document.createElement('input');
            input.type = 'checkbox';
            label.append(input, document.createTextNode(' ' + text));
        }
        super(label);
        this.input = input;
        this.selected = !!selected;
        if (input) input.checked = this.selected;
    }
    setSelected(b) { this.selected = b; if (this.input) this.input.checked = b; }
    isSelected() { return this.input ? this.input.checked : this.selected; }
    setEnabled(b) { super.setEnabled(b); if (this.input) this.input.disabled = !b; }
}

export class JComboBox extends JComponent {
    constructor(items, selected) {
        const e = el('select', 'jcombo');
        if (e) for (const it of items) { const o = document.createElement('option'); o.value = o.textContent = String(it); e.appendChild(o); }
        super(e);
        this.items = items.map(String);
        this.value = selected !== undefined ? String(selected) : this.items[0];
        if (e) e.value = this.value;
    }
    setSelectedItem(v) { this.value = String(v); if (this.el) this.el.value = this.value; }
    getSelectedItem() { return this.el ? this.el.value : this.value; }
}

export class JSpinner extends JComponent {
    constructor(value, min, max) {
        const e = el('input', 'jspinner');
        if (e) { e.type = 'number'; e.min = min; e.max = max; e.step = 1; e.value = value; }
        super(e);
        this.value = value;
    }
    setValue(v) { this.value = v; if (this.el) this.el.value = v; }
    getValue() { return this.el ? parseInt(this.el.value, 10) : this.value; }
}

export class JProgressBar extends JComponent {
    constructor() {
        const e = el('div', 'jprogress');
        let fill = null, txt = null;
        if (e) { fill = el('div', 'jprogress-fill'); txt = el('div', 'jprogress-text'); e.append(fill, txt); }
        super(e);
        this.fill = fill; this.txt = txt;
        this.min = 0; this.max = 100; this.value = 0;
    }
    setMinimum(m) { this.min = m; this._paint(); }
    setMaximum(m) { this.max = m; this._paint(); }
    setValue(v) { this.value = v; this._paint(); }
    getValue() { return this.value; }
    setString(s) { if (this.txt) this.txt.textContent = s; }
    _paint() {
        if (!this.fill) return;
        const f = this.max > this.min ? (this.value - this.min) / (this.max - this.min) : 0;
        this.fill.style.width = (Math.max(0, Math.min(1, f)) * 100).toFixed(1) + '%';
        if (this.txt) this.txt.textContent = this.max > 0 ? Math.round(Math.max(0, Math.min(1, f)) * 100) + '%' : '';
    }
}

/** A titled, etched panel (javax.swing.border.TitledBorder / EtchedBorder). */
export function panel(title, ...children) {
    const p = el('fieldset', 'jpanel');
    if (!p) return null;
    if (title) p.appendChild(el('legend', null, title));
    for (const c of children) if (c) p.appendChild(c.el || c);
    return p;
}

/** A horizontal row of components / strings. */
export function row(...children) {
    const r = el('div', 'jrow');
    if (!r) return null;
    for (const c of children) {
        if (c == null) continue;
        if (typeof c === 'string') r.appendChild(el('span', 'jlabel', c));
        else r.appendChild(c.el || c);
    }
    return r;
}
