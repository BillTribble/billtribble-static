const fs = require('fs');
const path = require('path');
const posts = require('./posts');

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const OUTPUT_DIR = __dirname;
const POSTS_OUTPUT_DIR = path.join(__dirname, 'posts');

// Proper nouns list to preserve capitalization in sentence case conversion
const PROPER_NOUNS = new Set([
  'japan', 'tokyo', 'vimeo', 'youtube', 'soundcloud', 'tiktok', 'samsara', 'looper',
  'bill', 'tribble', 'ministry', 'sound', 'ecstatic', 'dance', 'uk', 'london', 'dj',
  'womb', 'ageha', 'bristol', 'devon', 'somerset', 'moebius', 'jean', 'giraud',
  'shakti', 'buddhists', 'siddhis', 'theravada', 'buddhist', 'daniel', 'ingram',
  'scriptures', 'lucifer', 'kenneth', 'anger', 'garage', 'hermétique', 'holy',
  'portal', 'records', 'tpj', 'theau', 'badrico', 'million', 'movers',
  'crystal', 'temple', 'guides', 'forever', 'nihon', 'actual', 'vibes'
]);

function toSentenceCase(str) {
  if (!str) return str;
  // Convert first character to uppercase and the rest to lowercase,
  // except for words in the proper nouns list.
  const words = str.trim().split(/\s+/);
  const result = words.map((word, index) => {
    // Strip punctuation to check matching
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (PROPER_NOUNS.has(cleanWord)) {
      // Capitalize proper nouns correctly
      // e.g. "youtube" -> "YouTube", "japan" -> "Japan"
      if (cleanWord === 'youtube') return 'YouTube';
      if (cleanWord === 'soundcloud') return 'SoundCloud';
      if (cleanWord === 'tiktok') return 'TikTok';
      if (cleanWord === 'dj') return 'DJ';
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    }
    if (index === 0) {
      // Always capitalize the first word's first character
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word.toLowerCase();
  });
  return result.join(' ');
}

function preventWidows(html) {
  // Replace the last space before the last word of any tag with flat text content
  // Matches tags like <p>, <h1>-<h6>, <li>, <a> with text content containing no nested HTML
  return html.replace(/(<(p|h[1-6]|li|a)[^>]*>)([^<]+)(<\/\2>)/gi, (match, openTag, tagName, text, closeTag) => {
    const trimmed = text.trim();
    const lastSpaceIndex = trimmed.lastIndexOf(' ');
    if (lastSpaceIndex !== -1) {
      const newText = trimmed.substring(0, lastSpaceIndex) + '&nbsp;' + trimmed.substring(lastSpaceIndex + 1);
      return openTag + newText + closeTag;
    }
    return match;
  });
}

function ensureDirectoryExistence(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.html`), 'utf8');
}

function compilePage(templateName, title, description, contentReplacements = {}, isNested = false) {
  const baseUrl = isNested ? '../' : './';
  
  const header = loadTemplate('partials/header')
    .replace('{{title}}', toSentenceCase(title))
    .replace('{{description}}', description);
  const footer = loadTemplate('partials/footer');

  let pageTemplate = loadTemplate(templateName)
    .replace('{{header}}', header)
    .replace('{{footer}}', footer);

  // Replace base_url placeholder
  pageTemplate = pageTemplate.split('{{base_url}}').join(baseUrl);

  // Apply custom content replacements
  for (const [key, value] of Object.entries(contentReplacements)) {
    pageTemplate = pageTemplate.split(key).join(value);
  }

  // Convert header title tags to sentence case
  let finalHtml = pageTemplate.replace(/<h1 class="entry-title">([^<]+)<\/h1>/gi, (match, hText) => {
    return `<h1 class="entry-title">${toSentenceCase(hText)}</h1>`;
  });
  finalHtml = finalHtml.replace(/<h1 class="category-page-title">([^<]+)<\/h1>/gi, (match, hText) => {
    return `<h1 class="category-page-title">${toSentenceCase(hText)}</h1>`;
  });
  finalHtml = finalHtml.replace(/<h2 class="entry-title">([^<]+)<\/h2>/gi, (match, hText) => {
    return `<h2 class="entry-title">${toSentenceCase(hText)}</h2>`;
  });
  finalHtml = finalHtml.replace(/<h2 class="section-title">([^<]+)<\/h2>/gi, (match, hText) => {
    return `<h2 class="section-title">${toSentenceCase(hText)}</h2>`;
  });
  finalHtml = finalHtml.replace(/<h3 class="progress-title">([^<]+)<\/h3>/gi, (match, hText) => {
    return `<h3 class="progress-title">${toSentenceCase(hText)}</h3>`;
  });

  // Prevent widows
  finalHtml = preventWidows(finalHtml);

  return finalHtml;
}

function build() {
  console.log('Compiling static pages...');

  // 1. Compile Homepage
  const homeHtml = compilePage('home', 'Home', 'Musician, DJ, and facilitator.');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), homeHtml);
  console.log('Compiled: index.html');

  // 2. Compile Contact Page
  const contactHtml = compilePage('contact', 'Contact', 'Get in touch with Bill Tribble.');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'contact.html'), contactHtml);
  console.log('Compiled: contact.html');

  // 3. Compile Million Movers Page
  const moversHtml = compilePage('millionmovers', '1 Million Movers', 'Join our global dance facilitator map.');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'millionmovers.html'), moversHtml);
  console.log('Compiled: millionmovers.html');

  // 4. Compile Map Page
  const mapHtml = compilePage('map', 'Map', 'Global facilitator interactive map.');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'map.html'), mapHtml);
  console.log('Compiled: map.html');

  const postsLoopHtml = posts.map(post => {
    const featuredImageHtml = post.featuredImage 
      ? `<a class="post-featured-image-link" href="./posts/${post.slug}.html">
           <img src="${post.featuredImage}" class="post-featured-image" alt="${post.title}" />
         </a>`
      : '';
    return `
      <div class="post-item">
        <h2 class="entry-title"><a href="./posts/${post.slug}.html">${toSentenceCase(post.title)}</a></h2>
        <div class="post-meta"><span class="post-date">${post.date}</span></div>
        ${featuredImageHtml}
        <div class="entry-content">${post.content}</div>
      </div>
    `;
  }).join('\n');

  const actualvibesHtml = compilePage('actualvibes', 'Actual vibes records', 'Release catalogue and ambient experiments.', {
    '{{posts_loop}}': postsLoopHtml
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'actualvibes.html'), actualvibesHtml);
  console.log('Compiled: actualvibes.html');

  // 6. Compile Individual Post Pages
  ensureDirectoryExistence(POSTS_OUTPUT_DIR);
  posts.forEach(post => {
    const postHtml = compilePage('post', post.title, `Story and media for ${post.title}`, {
      '{{post_title}}': toSentenceCase(post.title),
      '{{post_date}}': post.date,
      '{{post_content}}': post.content
    }, true);
    fs.writeFileSync(path.join(POSTS_OUTPUT_DIR, `${post.slug}.html`), postHtml);
    console.log(`Compiled: posts/${post.slug}.html`);
  });

  console.log('Build completed successfully!');
}

build();
