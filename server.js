const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (FIXED: Removed extra parenthesis)
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // This line was causing the error
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', {
        error: null,
        success: null,
        videoInfo: null,
        downloadLinks: null
    });
});

app.post('/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;

        if (!videoUrl) {
            return res.render('index', {
                error: 'Please enter a URL',
                success: null,
                videoInfo: null,
                downloadLinks: null
            });
        }

        let result;
        if (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch')) {
            result = await downloadFacebookVideo(videoUrl);
        } else if (videoUrl.includes('instagram.com')) {
            result = await downloadInstagramVideo(videoUrl);
        } else {
            return res.render('index', {
                error: 'Only Facebook and Instagram URLs are supported',
                success: null,
                videoInfo: null,
                downloadLinks: null
            });
        }

        if (result.error) {
            return res.render('index', {
                error: result.error,
                success: null,
                videoInfo: null,
                downloadLinks: null
            });
        }

        // Success
        res.render('index', {
            error: null,
            success: 'Video found! Click download link below.',
            videoInfo: result.videoInfo,
            downloadLinks: result.downloadLinks
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.render('index', {
            error: 'A server error occurred. Please try a different video URL.',
            success: null,
            videoInfo: null,
            downloadLinks: null
        });
    }
});

// Download Functions (using a more direct approach)
async function downloadFacebookVideo(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 15000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Try to find video URL in multiple ways
        let videoUrl = $('meta[property="og:video"]').attr('content') ||
                      $('meta[property="og:video:url"]').attr('content') ||
                      $('meta[property="og:video:secure_url"]').attr('content');

        // Fallback: look for video data in script tags
        if (!videoUrl) {
            const scriptContents = $('script').toString();
            const videoMatch = scriptContents.match(/"video_url":"([^"]+)"/);
            if (videoMatch) {
                videoUrl = videoMatch[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
            }
        }

        if (videoUrl) {
            const thumbnail = $('meta[property="og:image"]').attr('content') || '';
            return {
                videoInfo: { title: 'Facebook Video', thumbnail, platform: 'Facebook' },
                downloadLinks: [{ quality: 'HD', url: videoUrl }]
            };
        } else {
            return { error: 'Could not find a downloadable video at this link. The video might be private, or the link incorrect.' };
        }

    } catch (error) {
        console.error('Facebook Download Error:', error.message);
        return { error: 'Failed to process this Facebook video. Please ensure it is a public video.' };
    }
}

async function downloadInstagramVideo(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const videoUrl = $('meta[property="og:video"]').attr('content') ||
                        $('meta[property="og:video:secure_url"]').attr('content');

        if (videoUrl) {
            const thumbnail = $('meta[property="og:image"]').attr('content') || '';
            const title = $('title').text() || 'Instagram Video';
            return {
                videoInfo: { title, thumbnail, platform: 'Instagram' },
                downloadLinks: [{ quality: 'Original', url: videoUrl }]
            };
        } else {
            return { error: 'Could not find a downloadable video at this Instagram link.' };
        }

    } catch (error) {
        console.error('Instagram Download Error:', error.message);
        return { error: 'Failed to process this Instagram link. Please ensure the account is public.' };
    }
}

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
