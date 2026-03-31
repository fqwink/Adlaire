"use strict";
/**
 * EditInplace - Inline content editing for Adlaire Platform.
 * Vanilla TypeScript replacement for jQuery-based editInplace.
 *
 * Requires: autosize.ts (loaded before this file)
 * Expects: global `csrfToken` variable set by PHP.
 */
let changing = false;
function nl2br(s) {
    return s.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
}
function fieldSave(key, val) {
    const body = new URLSearchParams();
    body.append('fieldname', key);
    body.append('content', val);
    body.append('csrf', csrfToken);
    fetch('index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    })
        .then(response => response.text())
        .then(data => {
        if (key === 'themeSelect') {
            location.reload();
            return;
        }
        const el = document.getElementById(key);
        if (!el) {
            changing = false;
            return;
        }
        if (val === '') {
            el.innerHTML = el.getAttribute('title') || '';
        }
        else {
            el.innerHTML = data;
        }
        changing = false;
    })
        .catch(() => {
        changing = false;
    });
}
/**
 * Rich text edit hook placeholder.
 * This function is replaced at runtime by the PHP-injected hook content.
 * The hook receives the clicked span element and performs rich text editing.
 */
function richTextHook(span) {
    // Default: same as plain text edit (overridden by rte hook injection)
    plainTextEdit(span);
}
function plainTextEdit(span) {
    const id = span.id;
    const title = span.getAttribute('title');
    const titleAttr = title ? `"${title}" ` : '';
    const content = span.innerHTML.replace(/<br\s*\/?>/gi, '');
    const textarea = document.createElement('textarea');
    textarea.name = 'textarea';
    textarea.id = id + '_field';
    textarea.setAttribute('title', titleAttr);
    textarea.value = content;
    let saved = false;
    textarea.addEventListener('blur', () => {
        if (saved)
            return;
        saved = true;
        fieldSave(id, nl2br(textarea.value));
    });
    span.textContent = '';
    span.appendChild(textarea);
    textarea.focus();
    autosize(textarea);
}
function initEditInplace() {
    // Editable text spans
    document.querySelectorAll('span.editText').forEach(span => {
        span.addEventListener('click', () => {
            if (changing)
                return;
            changing = true;
            if (span.classList.contains('richText')) {
                richTextHook(span);
            }
            else {
                plainTextEdit(span);
            }
        });
    });
    // Toggle sections
    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            document.querySelectorAll('.hide').forEach(el => {
                if (el.style.display === 'none' || el.style.display === '') {
                    el.style.display = 'block';
                }
                else {
                    el.style.display = 'none';
                }
            });
        });
    });
}
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditInplace);
}
else {
    initEditInplace();
}
