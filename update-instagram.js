const fs = require('fs');
const path = require('path');
const https = require('https');

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_JSON_PATH = path.join(__dirname, 'assets/instagram.json');
const INSTAGRAM_IMAGES_DIR = path.join(__dirname, 'assets/images/instagram');

function ensureDirectoryExistence(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    }).on('error', reject);
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: HTTP Status ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  if (!ACCESS_TOKEN) {
    console.error('Error: INSTAGRAM_ACCESS_TOKEN environment variable is missing.');
    process.exit(1);
  }

  try {
    console.log('Fetching latest media from Instagram API...');
    const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${ACCESS_TOKEN}`;
    const response = await httpGet(mediaUrl);

    if (!response.data || response.data.length === 0) {
      console.log('No Instagram posts found.');
      return;
    }

    // Limit to latest 6 posts
    const posts = response.data.slice(0, 6);
    ensureDirectoryExistence(INSTAGRAM_IMAGES_DIR);

    const savedPosts = [];
    for (const post of posts) {
      const imgUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
      const imgName = `${post.id}.jpg`;
      const imgDest = path.join(INSTAGRAM_IMAGES_DIR, imgName);

      console.log(`Downloading image for post ${post.id}...`);
      try {
        await downloadImage(imgUrl, imgDest);
        savedPosts.push({
          id: post.id,
          caption: post.caption || '',
          permalink: post.permalink,
          media_type: post.media_type,
          local_image_url: `assets/images/instagram/${imgName}`,
          timestamp: post.timestamp
        });
      } catch (err) {
        console.error(`Failed to download image for post ${post.id}:`, err.message);
      }
    }

    // Save metadata JSON
    fs.writeFileSync(INSTAGRAM_JSON_PATH, JSON.stringify(savedPosts, null, 2));
    console.log(`Saved Instagram feed metadata to ${INSTAGRAM_JSON_PATH}`);

    // Refresh Token
    console.log('Refreshing Instagram Access Token...');
    const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${ACCESS_TOKEN}`;
    const refreshResult = await httpGet(refreshUrl);
    console.log(`Token refreshed successfully. Next expiration in: ${refreshResult.expires_in} seconds`);

  } catch (err) {
    console.error('Failed to update Instagram feed:', err.message);
    process.exit(1);
  }
}

run();
