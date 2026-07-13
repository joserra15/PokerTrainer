/*
 * legal-seo.js — Meta tags, canonical, Open Graph y JSON-LD en páginas legales.
 */
(function () {
  'use strict';

  function siteUrl() {
    var s = window.PT_SEO || {};
    var u = s.siteUrl || (window.PT_SITE && window.PT_SITE.appUrl) || '';
    return String(u).replace(/\/+$/, '');
  }

  function pageName() {
    var path = (location.pathname || '').split('/').pop() || '';
    return path || 'index.html';
  }

  function upsertMeta(attr, key, value) {
    if (!value) return;
    var sel = 'meta[' + attr + '="' + key + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  function upsertLink(rel, href, extra) {
    if (!href) return;
    var sel = 'link[rel="' + rel + '"]';
    if (extra && extra.hreflang) sel += '[hreflang="' + extra.hreflang + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
    if (extra && extra.hreflang) el.setAttribute('hreflang', extra.hreflang);
  }

  function injectJsonLd(obj) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  function init() {
    var seo = window.PT_SEO || {};
    var page = pageName();
    var cfg = (seo.legal && seo.legal[page]) || null;
    if (!cfg) return;

    var base = siteUrl();
    var canonical = base + '/legal/' + page;
    var title = cfg.title || document.title;
    var desc = cfg.description || '';
    var image = seo.ogImage || (base + '/icons/logo-512.png');
    var lang = cfg.lang || seo.defaultLocale || 'es';

    document.title = title;
    upsertLink('canonical', canonical);
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', 'index, follow');
    upsertMeta('property', 'og:type', cfg.type === 'FAQPage' ? 'website' : 'article');
    upsertMeta('property', 'og:site_name', seo.siteName || 'PokerForgeAI');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:locale', lang === 'en' ? 'en_US' : 'es_ES');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', image);

    if (cfg.hreflang) {
      upsertLink('alternate', base + '/legal/' + cfg.hreflang.es, { hreflang: 'es' });
      upsertLink('alternate', base + '/legal/' + cfg.hreflang.en, { hreflang: 'en' });
      upsertLink('alternate', base + '/legal/' + cfg.hreflang.es, { hreflang: 'x-default' });
    }

    var graph = [{
      '@type': 'WebPage',
      '@id': canonical + '#webpage',
      url: canonical,
      name: title,
      description: desc,
      inLanguage: lang,
      isPartOf: { '@type': 'WebSite', '@id': base + '/#website', url: base + '/', name: seo.siteName || 'PokerForgeAI' }
    }];

    if (cfg.type === 'FAQPage' && cfg.faq && cfg.faq.length) {
      graph.push({
        '@type': 'FAQPage',
        '@id': canonical + '#faq',
        mainEntity: cfg.faq.map(function (item) {
          return {
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a }
          };
        })
      });
    }

    if (cfg.type === 'Article') {
      graph[0]['@type'] = 'Article';
      graph[0].headline = title;
      graph[0].author = { '@type': 'Organization', name: seo.siteName || 'PokerForgeAI' };
    }

    injectJsonLd({ '@context': 'https://schema.org', '@graph': graph });
  }

  init();
})();
