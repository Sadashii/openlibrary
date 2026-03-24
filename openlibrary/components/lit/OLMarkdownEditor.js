import { LitElement, html, css } from 'lit';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Placeholder from '@tiptap/extension-placeholder';

/**
 * OLMarkdownEditor - A web component for the tiptap wysiwyg editor
 *
 * Implemented with Tiptap, this component is the new WYSIWYG editor that works with markdown format.
 *
 * Important: Ensure that the `target-id` provided matches an existing input element in
 * the DOM, which needs to be hidden
 *
 * Example:
 * <textarea id="body-input">value</textarea>
 * <ol-markdown-editor target-id="body-input" placeholder="Type here..."></ol-markdown-editor>
 *
 * @property {String} target-id - The ID of the DOM element to sync the Markdown output with.
 * @property {String} placeholder - Text to display when the editor is empty (default: 'Write something...').
 * * @fires markdown-change - Dispatched whenever the editor content changes. `e.detail.value` contains the raw markdown string.
 *
 * @example
 * <form action="/save" method="POST">
 * <div class="formElement">
 * <label for="page--body">Document Body:</label>
 * <textarea id="page--body" name="body">**Initial** markdown.</textarea>
 * <ol-markdown-editor target-id="page--body" placeholder="Write the main content..."></ol-markdown-editor>
 * </div>
 * <button type="submit">Save Document</button>
 * </form>
 */

const ICONS = {
    undo: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
    redo: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>`,
    h1: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 12l3-2v8"/></svg>`,
    h2: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-2.5 4-4.5 4-6s-2.5-2-4-1"/></svg>`,
    bold: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`,
    italic: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
    underline: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`,
    link: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    save: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    remove: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    quote: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
    hr: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    ul: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    ol: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`
};

export class OLMarkdownEditor extends LitElement {
    static properties = {
        targetId: { type: String, attribute: 'target-id' },
        placeholder: { type: String },
        editor: { state: true },
        showLinkPopover: { state: true },
        linkInputValue: { state: true },
        _errorMsg: { state: true }
    };

    static styles = css`
    .editor-wrapper {
      border: var(--border-card);
      border-radius: var(--border-radius-lg);
      background: var(--white);
      color: var(--grey);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-inline-sm);
      padding: var(--spacing-inset-sm);
      border-bottom: var(--border-card);
      background: var(--grey-f4f4f4);
      align-items: center;
    }

    .toolbar-divider {
      height: var(--spacing-xl);
      margin: 0 var(--spacing-inline-sm);
      border-left: var(--border-divider);
    }

    .editor-input {
      padding: var(--spacing-inset-lg);
      min-height: 250px;
      display: flex;
      flex-direction: column;
      cursor: text;
    }

    .editor-input .tiptap {
      outline: none;
      flex-grow: 1;
      font-family: var(--font-family-body);
      line-height: var(--line-height-body);
    }

    .editor-input .tiptap a {
      color: var(--link-blue);
    }

    .editor-input .tiptap blockquote {
      margin-left: var(--spacing-lg);
      padding: var(--spacing-sm) var(--spacing-lg);
      border-left: var(--border-width-heavy) solid var(--darker-brand-blue);
      color: var(--dark-grey);
      background: var(--lightest-grey);
      font-style: italic;
      font-family: var(--font-family-quote, var(--font-family-body));
    }

    .editor-input .tiptap blockquote p {
      margin: 0;
    }

    .tiptap p.is-editor-empty:first-child::before {
      color: var(--light-grey);
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }

    .toolbar-btn {
      background: transparent;
      border: var(--border-width-none, 0);
      border-radius: var(--border-radius-button);
      width: var(--spacing-3xl);
      height: var(--spacing-3xl);
      cursor: pointer;
      color: var(--darker-grey);
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toolbar-btn svg { width: var(--spacing-xl); height: var(--spacing-xl); stroke-width: 2.2; }
    .toolbar-btn:hover:not(:disabled) { background: var(--lighter-grey); }

    .toolbar-btn.is-active {
      background: var(--light-grey);
      box-shadow: inset 0 1px 2px var(--boxshadow-black);
      color: var(--black);
    }

    .toolbar-btn:focus-visible {
      outline: var(--focus-width, 2px) solid var(--color-focus-ring);
      outline-offset: -2px;
    }

    .toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .link-popover-wrapper { position: relative; display: inline-flex; }

    .link-popover {
      position: absolute;
      top: calc(100% + var(--spacing-xs));
      border: var(--border-card);
      border-radius: var(--border-radius-overlay);
      padding: var(--spacing-inset-sm);
      box-shadow: 0 4px 15px var(--boxshadow-black);
      background: var(--white);
      display: flex;
      gap: var(--spacing-inline-md);
      min-width: 260px;
      z-index: var(--z-index-level-5, 999);
    }

    .link-input {
      flex-grow: 1;
      border: var(--border-input);
      border-radius: var(--border-radius-input);
      padding: var(--spacing-xs) var(--spacing-md);
      outline: none;
      transition: border-color 0.2s;
      font-family: var(--font-family-body);
    }

    .link-input:focus {
      border: var(--border-input-focused);
      box-shadow: var(--box-shadow-focus);
    }

    .error-state {
      padding: var(--spacing-inset-lg);
      border: var(--border-width-control, 1px) solid var(--color-border-error);
      background: var(--baby-pink);
      color: var(--dark-red);
      border-radius: var(--border-radius-notification);
      font-family: var(--font-family-body);
      margin-bottom: var(--spacing-stack-sm);
    }
  `;

    constructor() {
        super();
        this.editor = null;
        this.targetElement = null;
        this.showLinkPopover = false;
        this.linkInputValue = '';
        this._errorMsg = null;
        this._handleDocumentClick = this._handleDocumentClick.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('mousedown', this._handleDocumentClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('mousedown', this._handleDocumentClick);

        if (this.targetElement) {
            this.targetElement.style.display = '';
            if (this._associatedLabel && this._labelClickHandler) {
                this._associatedLabel.removeEventListener('click', this._labelClickHandler);
            }
        }

        if (this.editor) this.editor.destroy();
    }

    _handleDocumentClick(e) {
        if (!this.showLinkPopover) return;
        if (!e.composedPath().includes(this)) {
            this.showLinkPopover = false;
        }
    }

    firstUpdated() {
        if (!this.targetId) {
            this._errorMsg = 'Missing \'target-id\' attribute.';
            throw new Error(`OLMarkdownEditor: ${this._errorMsg}`);
        }

        this.targetElement = document.getElementById(this.targetId);

        if (!this.targetElement) {
            this._errorMsg = `Target element with ID "${this.targetId}" not found in the DOM.`;
            throw new Error(`OLMarkdownEditor: ${this._errorMsg}`);
        }

        const initialContent = this.targetElement.value || '';
        const editorRoot = this.shadowRoot.getElementById('editor-root');

        this.editor = new Editor({
            element: editorRoot,
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2] },
                    codeBlock: false,
                    code: false,
                    hardBreak: false,
                    link: { openOnClick: false },
                    strike: false
                }),
                Markdown,
                Placeholder.configure({ placeholder: this.placeholder || 'Write something...' })
            ],
            content: initialContent,
            onUpdate: ({ editor }) => {
                let markdownOutput = editor.storage.markdown.getMarkdown();

                // Note, tiptap uses 2 spaces for list indentation, olmarkdown uses 4.
                // Normalize nested list indentation from 2-space-per-level (tiptap) to
                // 4-space-per-level (olmarkdown) without injecting extra newlines.
                markdownOutput = markdownOutput.replace(
                    /^(\s{2,})([*+-]|\d+\.) /gm,
                    (match, spaces, marker) => {
                        const depth = Math.round(spaces.length / 2);
                        const newIndent = ' '.repeat(depth * 4);
                        return `${newIndent}${marker} `;
                    }
                );

                if (this.targetElement) {
                    this.targetElement.value = markdownOutput;
                }

                this.dispatchEvent(new CustomEvent('markdown-change', {
                    detail: { value: markdownOutput },
                    bubbles: true,
                    composed: true
                }));
            },
            onTransaction: () => this.requestUpdate()
        });

        this.targetElement.style.display = 'none';

        const associatedLabel = document.querySelector(`label[for="${this.targetId}"]`);
        if (associatedLabel) {
            this._associatedLabel = associatedLabel;
            this._labelClickHandler = (e) => {
                e.preventDefault();
                this._focusEditor();
            };
            associatedLabel.addEventListener('click', this._labelClickHandler);
        }
    }

    _handleToolbarMouseDown(e) { e.preventDefault(); }

    _focusEditor() {
        if (!this.editor) return;
        if (!this.editor.isFocused) this.editor.commands.focus();
    }

    formatHeading(level) { if (!this.editor) return; this.editor.chain().focus().toggleHeading({ level }).run(); }
    formatText(type) { if (!this.editor) return; this.editor.chain().focus()[`toggle${type.charAt(0).toUpperCase() + type.slice(1)}`]().run(); }
    insertRule() { if (!this.editor) return; this.editor.chain().focus().setHorizontalRule().run(); }
    formatQuote() { if (!this.editor) return; this.editor.chain().focus().toggleBlockquote().run(); }
    formatList(type) { if (!this.editor) return; this.editor.chain().focus()[type === 'bullet' ? 'toggleBulletList' : 'toggleOrderedList']().run(); }

    toggleLinkPopover() {
        if (!this.editor) return;
        this.showLinkPopover = !this.showLinkPopover;
        if (this.showLinkPopover) {
            this.linkInputValue = this.editor.getAttributes('link').href || '';
            setTimeout(() => this.shadowRoot.querySelector('.link-input')?.focus(), 0);
        }
    }

    handleLinkInput(e) { this.linkInputValue = e.target.value; }

    handleLinkKeydown(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.applyLink(); }
        if (e.key === 'Escape') { this.showLinkPopover = false; this._focusEditor(); }
    }

    applyLink() {
        if (!this.editor) return;
        const chain = this.editor.chain().focus().extendMarkRange('link');
        this.linkInputValue === '' ? chain.unsetLink().run() : chain.setLink({ href: this.linkInputValue }).run();
        this.showLinkPopover = false;
    }

    removeLink() {
        if (!this.editor) return;
        this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
        this.showLinkPopover = false;
    }

    _isActive(type, options = {}) {
        return this.editor ? this.editor.isActive(type, options) : false;
    }

    _renderButton({ title, icon, action, isActive = false, isDisabled = false, customColor = null }) {
        const isBtnDisabled = !this.editor || isDisabled;

        return html`
      <button
        type="button"
        title="${title}"
        aria-label="${title}"
        aria-pressed="${isActive}"
        class="toolbar-btn ${isActive ? 'is-active' : ''}"
        style="${customColor ? `color: ${customColor};` : ''}"
        @click="${action}"
        ?disabled="${isBtnDisabled}"
      >
        ${icon}
      </button>
    `;
    }

    render() {
        if (this._errorMsg) {
            return html`
                <div class="error-state">
                    <strong>Editor Initialization Failed:</strong> ${this._errorMsg}<br>
                    <small>The standard text input has been kept active as a fallback.</small>
                </div>
            `;
        }

        return html`
      <div class="editor-wrapper">
        <div class="toolbar" @mousedown="${this._handleToolbarMouseDown}">
          ${this._renderButton({ title: 'Undo', icon: ICONS.undo, action: () => this.editor.chain().focus().undo().run(), isDisabled: !this.editor || !this.editor.can().undo() })}
          ${this._renderButton({ title: 'Redo', icon: ICONS.redo, action: () => this.editor.chain().focus().redo().run(), isDisabled: !this.editor || !this.editor.can().redo() })}
          <div class="toolbar-divider"></div>
          ${this._renderButton({ title: 'Heading 1', icon: ICONS.h1, action: () => this.formatHeading(1), isActive: this._isActive('heading', { level: 1 }) })}
          ${this._renderButton({ title: 'Heading 2', icon: ICONS.h2, action: () => this.formatHeading(2), isActive: this._isActive('heading', { level: 2 }) })}
          <div class="toolbar-divider"></div>
          ${this._renderButton({ title: 'Bold', icon: ICONS.bold, action: () => this.formatText('bold'), isActive: this._isActive('bold') })}
          ${this._renderButton({ title: 'Italic', icon: ICONS.italic, action: () => this.formatText('italic'), isActive: this._isActive('italic') })}
          ${this._renderButton({ title: 'Underline', icon: ICONS.underline, action: () => this.formatText('underline'), isActive: this._isActive('underline') })}
          <div class="toolbar-divider"></div>
          <div class="link-popover-wrapper">
            ${this._renderButton({ title: 'Link', icon: ICONS.link, action: this.toggleLinkPopover.bind(this), isActive: this._isActive('link') || this.showLinkPopover })}
            ${this.showLinkPopover ? html`
              <div class="link-popover" @mousedown="${(e) => e.stopPropagation()}">
                <input type="url" class="link-input" placeholder="https://..." .value="${this.linkInputValue}" @input="${this.handleLinkInput}" @keydown="${this.handleLinkKeydown}" />
                ${this._renderButton({ title: 'Save Link', icon: ICONS.save, action: this.applyLink.bind(this) })}
                ${this._isActive('link') ? this._renderButton({ title: 'Remove Link', icon: ICONS.remove, action: this.removeLink.bind(this), customColor: 'var(--red)' }) : ''}
              </div>
            ` : ''}
          </div>
          ${this._renderButton({ title: 'Blockquote', icon: ICONS.quote, action: this.formatQuote.bind(this), isActive: this._isActive('blockquote') })}
          ${this._renderButton({ title: 'Divider', icon: ICONS.hr, action: this.insertRule.bind(this) })}
          <div class="toolbar-divider"></div>
          ${this._renderButton({ title: 'Bullet List', icon: ICONS.ul, action: () => this.formatList('bullet'), isActive: this._isActive('bulletList') })}
          ${this._renderButton({ title: 'Numbered List', icon: ICONS.ol, action: () => this.formatList('number'), isActive: this._isActive('orderedList') })}
        </div>

        <div id="editor-root" class="editor-input" @click="${this._focusEditor}"></div>
      </div>
    `;
    }
}

customElements.define('ol-markdown-editor', OLMarkdownEditor);
