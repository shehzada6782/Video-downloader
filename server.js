const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Home route
app.get('/', (req, res) => {
    res.render('index', {
        error: null,
        videoInfo: null,
        downloadLinks: null
    });
});

// Download route - FIXED
app.post('/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;

        if (!videoUrl) {
            return res.render('index', {
                error: 'Please enter a URL',
                videoInfo: null,
                downloadLinks: null
            });
        }

        let videoData;

        // Check platform and process accordingly
        if (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch')) {
            videoData = await handleFacebookDownload(videoUrl);
        } else if (videoUrl.includes('instagram.com')) {
            videoData = await handleInstagramDownload(videoUrl);
        } else {
            return res.render('index', {
                error: 'Please provide a valid Facebook or Instagram URL',
                videoInfo: null,
                downloadLinks: null
            });
        }

        // If no video found in the response
        if (!videoData || videoData.downloadLinks.length === 0) {
            return res.render('index', {
                error: 'Could not find a downloadable video at this URL. It might be private or the link might be incorrect.',
                videoInfo: null,
                downloadLinks: null
            });
        }

        // Render results on success
        res.render('index', {
            error: null,
            videoInfo: videoData.videoInfo,
            downloadLinks: videoData.downloadLinks
        });

    } catch (error) {
        console.error('Main Download Error:', error);
        res.render('index', {
            error: 'An unexpected server error occurred. Please check the URL and try again.',
            videoInfo: null,
            downloadLinks: null
        });
    }
});

// Facebook Download Handler - FIXED METHOD
async function handleFacebookDownload(url) {
    try {
        // Using a reliable public API
        const response = await axios.get(`https://fbdown.net/api/api.php`, {
            params: { url: url }
        });

        const data = response.data;

        if (data && data.url) {
            return {
                videoInfo: {
                    title: 'Facebook Video',
                    thumbnail: data.thumb || ''
                },
                downloadLinks: [
                    { quality: 'HD', url: data.hd || data.url },
                    { quality: 'SD', url: data.sd || data.url }
                ].filter(link => link.url) // Remove empty links
            };
        } else {
            throw new Error('Facebook API did not return a video link');
        }
    } catch (apiError) {
        console.error('Facebook API method failed:', apiError);
        // Fallback to direct page scraping if API fails
        return await facebookFallbackScraper(url);
    }
}

// Facebook Fallback Scraper
async function facebookFallbackScraper(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Improved search for video URL in the page HTML
        const videoElement = $('meta[property="og:video"]').attr('content') ||
                           $('meta[property="og:video:url"]').attr('content') ||
                           $('meta[property="og:video:secure_url"]').attr('content');

        const thumbnail = $('meta[property="og:image"]').attr('content');

        if (videoElement) {
            return {
                videoInfo: {
                    title: 'Facebook Video',
                    thumbnail: thumbnail
                },
                downloadLinks: [
                    { quality: 'Original', url: videoElement }
                ]
            };
        }
        throw new Error('Video link not found in page');
    } catch (error) {
        console.error('Facebook fallback also failed:', error);
        throw new Error('This Facebook video cannot be downloaded. It may be private, or Facebook has updated their structure.');
    }
}

// Instagram Download Handler - FIXED METHOD
async function handleInstagramDownload(url) {
    try {
        // Using a reliable public service for Instagram
        const response = await axios.get(`https://downloadigram.com/wp-json/aio-dl/video/`, {
            params: { url: url }
        });

        const data = response.data;

        if (data && data.media) {
            return {
                videoInfo: {
                    title: 'Instagram Video',
                    thumbnail: data.thumbnail || ''
                },
                downloadLinks: [
                    { quality: 'Original', url: data.media }
                ]
            };
        } else {
            throw new Error('Instagram API did not return a video link');
        }
    } catch (apiError) {
        console.error('Instagram API method failed:', apiError);
        // Fallback to direct page scraping
        return await instagramFallbackScraper(url);
    }
}

// Instagram Fallback Scraper
async function instagramFallbackScraper(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Look for video URL in meta tags
        const videoUrl = $('meta[property="og:video"]').attr('content') ||
                        $('meta[property="og:video:secure_url"]').attr('content');

        const thumbnail = $('meta[property="og:image"]').attr('content');
        const title = $('title').text() || 'Instagram Video';

        if (videoUrl) {
            return {
                videoInfo: { title, thumbnail },
                downloadLinks: [
                    { quality: 'Original', url: videoUrl }
                ]
            };
        }
        throw new Error('Instagram video link not found');
    } catch (error) {
        console.error('Instagram fallback also failed:', error);
        throw new Error('This Instagram video cannot be downloaded. It might be from a private account or the link is incorrect.');
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running perfectly on port ${PORT}`);
});
