/**
 * I18n - Internationalization module for Adlaire Platform.
 * Loads translation strings from JSON files and provides a t() helper.
 *
 * Supported languages: 'ja', 'en'
 * Translation files: data/lang/ja.json, data/lang/en.json
 */

type Translations = Record<string, string>;

const i18n = {
    lang: 'ja',
    translations: {} as Translations,
    ready: Promise.resolve(),

    /**
     * Initialize i18n by loading the translation file for the given language.
     */
    init(lang: string): Promise<void> {
        if (lang !== 'ja' && lang !== 'en') {
            lang = 'ja';
        }
        this.lang = lang;

        this.ready = fetch(`data/lang/${lang}.json`)
            .then(response => response.ok ? response.json() : {})
            .then(data => { this.translations = data; })
            .catch(() => { /* fall back to empty translations */ });
        return this.ready;
    },

    /**
     * Translate a key with optional parameter substitution.
     * Parameters use :name syntax (e.g. ':page', ':year').
     */
    t(key: string, params?: Record<string, string>): string {
        let str = this.translations[key] ?? key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                str = str.replaceAll(':' + k, v);
            }
        }
        return str;
    },
};
