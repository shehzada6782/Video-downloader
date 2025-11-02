const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Facebook & Instagram Video Downloader',
        error: null,
        videoInfo: null,
        downloadLinks: null,
        platform: null
    });
});

app.post('/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.render('index', {
                title: 'Facebook & Instagram Video Downloader',
                error: 'Please enter a video URL',
                videoInfo: null,
                downloadLinks: null,
                platform: null
            });
        }

        // Detect platform
        const platform = detectPlatform(videoUrl);
        
        if (!platform) {
            return res.render('index', {
                title: 'Facebook & Instagram Video Downloader',
                error: 'Please enter a valid Facebook or Instagram video URL',
                videoInfo: null,
                downloadLinks: null,
                platform: null
            });
        }

        let videoData;
        
        if (platform === 'facebook') {
            videoData = await fetchFacebookVideo(videoUrl);
        } else if (platform === 'instagram') {
            videoData = await fetchInstagramVideo(videoUrl);
        }
        
        res.render('index', {
            title: 'Facebook & Instagram Video Downloader',
            error: null,
            videoInfo: videoData.videoInfo,
            downloadLinks: videoData.downloadLinks,
            platform: platform
        });

    } catch (error) {
        console.error('Error:', error);
        res.render('index', {
            title: 'Facebook & Instagram Video Downloader',
            error: 'Failed to fetch video. Please check the URL and try again.',
            videoInfo: null,
            downloadLinks: null,
            platform: null
        });
    }
});

// API endpoints
app.get('/api/download', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        const platform = detectPlatform(url);
        let videoData;

        if (platform === 'facebook') {
            videoData = await fetchFacebookVideo(url);
        } else if (platform === 'instagram') {
            videoData = await fetchInstagramVideo(url);
        } else {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        res.json({ ...videoData, platform });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch video' });
    }
});

// Helper functions
function detectPlatform(url) {
    const facebookRegex = /(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+/;
    const instagramRegex = /(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(p|reel|stories)\/.+/;
    
    if (facebookRegex.test(url)) return 'facebook';
    if (instagramRegex.test(url)) return 'instagram';
    return null;
}

async function fetchFacebookVideo(url) {
    try {
        // Method 1: Using fbdown API
        const response = await axios.get(`https://api.fbdown.net/api/download`, {
            params: { url },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;
        
        if (data && data.hd) {
            return {
                videoInfo: {
                    title: 'Facebook Video',
                    thumbnail: data.thumb || '',
                    platform: 'facebook'
                },
                downloadLinks: [
                    { quality: 'HD', url: data.hd },
                    { quality: 'SD', url: data.sd }
                ]
            };
        } else {
            throw new Error('No video found');
        }
    } catch (error) {
        // Fallback to direct scraping
        return await facebookFallback(url);
    }
}

async function facebookFallback(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(response.data);
        
        const videoUrl = $('meta[property="og:video"]').attr('content') || 
                        $('meta[property="og:video:url"]').attr('content');
        
        const thumbnail = $('meta[property="og:image"]').attr('content');
        const title = $('meta[property="og:title"]').attr('content') || 'Facebook Video';

        if (videoUrl) {
            return {
                videoInfo: { title, thumbnail, platform: 'facebook' },
                downloadLinks: [
                    { quality: 'Original', url: videoUrl }
                ]
            };
        } else {
            throw new Error('Video URL not found');
        }
    } catch (error) {
        throw new Error('Failed to fetch Facebook video');
    }
}

async function fetchInstagramVideo(url) {
    try {
        // Method 1: Using instagram API service
        const response = await axios.get(`https://downloadigram.com/wp-json/aio-dl/video/`, {
            params: { url },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        const data = response.data;
        
        if (data && data.media) {
            return {
                videoInfo: {
                    title: 'Instagram Video',
                    thumbnail: data.thumbnail || '',
                    platform: 'instagram'
                },
                downloadLinks: [
                    { quality: 'Original', url: data.media }
                ]
            };
        } else {
            throw new Error('No video found');
        }
    } catch (error) {
        // Fallback to direct scraping
        return await instagramFallback(url);
    }
}

async function instagramFallback(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(response.data);
        
        // Look for video URL in various meta tags
        const videoUrl = $('meta[property="og:video"]').attr('content') || 
                        $('meta[property="og:video:url"]').attr('content') ||
                        $('meta[property="og:video:secure_url"]').attr('content');
        
        const thumbnail = $('meta[property="og:image"]').attr('content');
        const title = $('meta[property="og:title"]').attr('content') || $('meta[property="og:description"]').attr('content') || 'Instagram Video';

        if (videoUrl) {
            return {
                videoInfo: { title, thumbnail, platform: 'instagram' },
                downloadLinks: [
                    { quality: 'Original', url: videoUrl }
                ]
            };
        } else {
            // For Instagram images or carousel posts
            const imageUrl = $('meta[property="og:image"]').attr('content');
            if (imageUrl) {
                return {
                    videoInfo: { 
                        title: 'Instagram Image', 
                        thumbnail: imageUrl,
                        platform: 'instagram' 
                    },
                    downloadLinks: [
                        { quality: 'Original', url: imageUrl }
                    ]
                };
            }
            throw new Error('Video/Image URL not found');
        }
    } catch (error) {
        throw new Error('Failed to fetch Instagram video');
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});
