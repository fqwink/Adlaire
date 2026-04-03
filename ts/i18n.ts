/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * I18n - Internationalization module for Adlaire Static CMS.
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
    // #45: fetch失敗時のPromise確実resolve
    init(lang: string): Promise<void> {
        if (lang !== 'ja' && lang !== 'en') {
            lang = 'ja';
        }
        this.lang = lang;

        this.ready = fetch(`data/lang/${lang}.json`)
            .then(response => {
                if (!response.ok) return {};
                return response.json().catch(() => ({}));
            })
            .then(data => {
                if (data && typeof data === 'object') {
                    this.translations = data as Translations;
                }
            })
            .catch(() => {
                // #45: fetch失敗時もPromiseをresolveし、空翻訳でフォールバック
                this.translations = {};
            });
        return this.ready;
    },

    /**
     * Translate a key with optional parameter substitution.
     * Parameters use :name syntax (e.g. ':page', ':year').
     */
    // Ver.2.9 #22: i18n — キー不在時のフォールバック改善とパラメータ安全性
    t(key: string, params?: Record<string, string>): string {
        let str = this.translations[key] ?? key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                // Ver.2.9 #22: パラメータ値がundefined/nullの場合は空文字にフォールバック
                str = str.replaceAll(':' + k, v ?? '');
            }
        }
        return str;
    },

    /**
     * Ver.2.9 #22: Check if a translation key exists.
     */
    has(key: string): boolean {
        return key in this.translations;
    },
};
