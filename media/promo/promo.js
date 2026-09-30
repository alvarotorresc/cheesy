// Fills a promo page from its query string:
//   ?lang=es|en  language of the texts (Spanish by default)
//   ?img=<URL>   screenshot shown inside the frame (pages without a frame ignore it)
const params = new URLSearchParams(location.search);
const lang = params.get('lang') === 'en' ? 'en' : 'es';

// The line is the headline of the Home page (home.title in the app dictionaries), with a
// non-breaking space so that no line ends on the preposition.
const TEXT = {
  es: { line: 'Aperturas, finales y táctica, en\u00a0tu navegador.' },
  en: { line: 'Openings, endgames and tactics, in\u00a0your browser.' },
}[lang];

document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = TEXT[el.dataset.t];

const shot = document.getElementById('shot');
const img = params.get('img');
if (shot && img) shot.src = img;
