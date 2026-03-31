"use strict";
/**
 * I18n - Internationalization module for Adlaire Platform.
 * Loads translation strings from JSON files and provides a t() helper.
 *
 * Supported languages: 'ja', 'en'
 * Translation files: lang/ja.json, lang/en.json
 */
const i18n = {
    lang: 'ja',
    translations: {},
    /**
     * Initialize i18n by loading the translation file for the given language.
     */
    async init(lang) {
        if (lang !== 'ja' && lang !== 'en') {
            lang = 'ja';
        }
        this.lang = lang;
        try {
            const response = await fetch(`data/lang/${lang}.json`);
            if (response.ok) {
                this.translations = await response.json();
            }
        }
        catch {
            // Silently fall back to empty translations (keys returned as-is)
        }
    },
    /**
     * Translate a key with optional parameter substitution.
     * Parameters use :name syntax (e.g. ':page', ':year').
     */
    t(key, params) {
        let str = this.translations[key] ?? key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                str = str.replaceAll(':' + k, v);
            }
        }
        return str;
    },
};
