/*
 * MiniJDOM.js  -  CelCamp Phoenix (2026)
 *
 * TelaInicial read the .3dm files with JDOM (org.jdom.input.SAXBuilder).
 * This is the small subset of that API it used, over a tiny XML parser:
 *   new SAXBuilder().build(text).getRootElement()
 *   Element.getName(), getAttributeValue(), getChild(), getChildren()
 */

export class Element {
    constructor(name, attributes) {
        this.name = name;
        this.attributes = attributes;
        this.children = [];
    }
    getName() { return this.name; }
    getAttributeValue(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n) ? this.attributes[n] : null; }
    getChild(n) { return this.children.find(c => c.name === n) || null; }
    getChildren(n) { return n === undefined ? this.children.slice() : this.children.filter(c => c.name === n); }
}

export class Document {
    constructor(root) { this.root = root; }
    getRootElement() { return this.root; }
}

export class JDOMException extends Error {}

function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (m, e) => {
        const l = e.toLowerCase();
        if (l === 'lt') return '<';
        if (l === 'gt') return '>';
        if (l === 'amp') return '&';
        if (l === 'quot') return '"';
        if (l === 'apos') return "'";
        if (l[1] === 'x') return String.fromCodePoint(parseInt(l.substring(2), 16));
        return String.fromCodePoint(parseInt(l.substring(1), 10));
    });
}

export class SAXBuilder {
    build(text) {
        let pos = 0;
        const stack = [];
        let root = null;
        const tagRe = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
        const attrRe = /([\w.:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
        while (pos < text.length) {
            const lt = text.indexOf('<', pos);
            if (lt < 0) break;
            if (text.startsWith('<!--', lt)) {
                const end = text.indexOf('-->', lt + 4);
                if (end < 0) throw new JDOMException("Unterminated comment");
                pos = end + 3; continue;
            }
            if (text.startsWith('<?', lt)) {
                const end = text.indexOf('?>', lt + 2);
                if (end < 0) throw new JDOMException("Unterminated processing instruction");
                pos = end + 2; continue;
            }
            if (text.startsWith('<!', lt)) {
                const end = text.indexOf('>', lt + 2);
                pos = end < 0 ? text.length : end + 1; continue;
            }
            tagRe.lastIndex = lt;
            const m = tagRe.exec(text);
            if (!m) throw new JDOMException("Malformed XML near character " + lt + ": " + text.substring(lt, lt + 40));
            pos = tagRe.lastIndex;
            const [, closing, name, attrText, selfClosing] = m;
            if (closing) {
                const open = stack.pop();
                if (!open || open.name !== name) throw new JDOMException("Mismatched </" + name + ">");
                continue;
            }
            const attrs = {};
            let a;
            attrRe.lastIndex = 0;
            while ((a = attrRe.exec(attrText)) !== null) attrs[a[1]] = decodeEntities(a[3] !== undefined ? a[3] : a[4]);
            const e = new Element(name, attrs);
            if (stack.length) stack[stack.length - 1].children.push(e);
            else if (!root) root = e;
            else throw new JDOMException("More than one root element");
            if (!selfClosing) stack.push(e);
        }
        if (!root) throw new JDOMException("No root element");
        if (stack.length) throw new JDOMException("Unclosed <" + stack[stack.length - 1].name + ">");
        return new Document(root);
    }
}
