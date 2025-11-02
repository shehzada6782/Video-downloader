const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - ERROR FIXED: Extra bracket removed
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // ✅ YEH LINE FIX HOGAYI
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
        
        console.log('Received URL:', videoUrl);
        
        if (!videoUrl) {
            return res.render('index', {
                error: 'Please enter a URL',
                success: null,
                videoInfo: null,
                downloadLinks: null
            });
        }

        // Simple URL validation
        if (!videoUrl.includes('http')) {
            return res.render('index', {
                error: 'Please enter a valid URL starting with http or https',
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

        // Success case
        res.render('index', {
            error: null,
            success: 'Video found! Click download link below.',
            videoInfo: result.videoInfo,
            downloadLinks: result.downloadLinks
        });

    } catch (error) {
        console.error('Main error:', error);
        res.render('index', {
            error: 'Server error. Please try again with different URL.',
            success: null,
            videoInfo: null,
            downloadLinks: null
        });
    }
});

// Facebook Download Function
async function downloadFacebookVideo(url) {
    try {
        console.log('Downloading Facebook video:', url);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 30000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Method 1: Look for og:video meta tag
        let videoUrl = $('meta[property="og:video"]').attr('content') || 
                      $('meta[property="og:video:url"]').attr('content') ||
                      $('meta[property="og:video:secure_url"]').attr('content');

        // Method 2: Look for video in script tags
        if (!videoUrl) {
            const scriptTags = $('script');
            scriptTags.each((i, script) => {
                const scriptContent = $(script).html();
                if (scriptContent && scriptContent.includes('video_url')) {
                    const match = scriptContent.match(/"video_url":"([^"]+)"/);
                    if (match && match[1]) {
                        videoUrl = match[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
                    }
                }
            });
        }

        // Method 3: Look for HD source
        if (!videoUrl) {
            const hdSource = html.match(/"hd_src":"([^"]+)"/);
            if (hdSource && hdSource[1]) {
                videoUrl = hdSource[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
            }
        }

        // Method 4: Look for SD source
        if (!videoUrl) {
            const sdSource = html.match(/"sd_src":"([^"]+)"/);
            if (sdSource && sdSource[1]) {
                videoUrl = sdSource[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
            }
        }

        if (videoUrl) {
            const thumbnail = $('meta[property="og:image"]').attr('content') || '';
            const title = $('meta[property="og:title"]').attr('content') || 'Facebook Video';
            
            console.log('Found Facebook video:', videoUrl);
            
            return {
                videoInfo: {
                    title: title,
                    thumbnail: thumbnail,
                    platform: 'Facebook'
                },
                downloadLinks: [
                    { quality: 'HD', url: videoUrl }
                ]
            };
        } else {
            return { error: 'Facebook video not found. Video might be private or URL is incorrect.' };
        }

    } catch (error) {
        console.error('Facebook download error:', error.message);
        return { error: 'Failed to download Facebook video. Make sure the video is public.' };
    }
}

// Instagram Download Function
async function downloadInstagramVideo(url) {
    try {
        console.log('Downloading Instagram video:', url);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 30000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Method 1: Look for og:video meta tag
        let videoUrl = $('meta[property="og:video"]').attr('content') || 
                      $('meta[property="og:video:url"]').attr('content') ||
                      $('meta[property="og:video:secure_url"]').attr('content');

        // Method 2: Look for video in JSON-LD
        if (!videoUrl) {
            const jsonLd = $('script[type="application/ld+json"]').html();
            if (jsonLd) {
                try {
                    const jsonData = JSON.parse(jsonLd);
                    if (jsonData.video) {
                        videoUrl = jsonData.video.contentUrl || jsonData.video.url;
                    }
                } catch (e) {
                    // Ignore JSON parse error
                }
            }
        }

        // Method 3: Look for video in script tags
        if (!videoUrl) {
            const scriptTags = $('script');
            for (let i = 0; i < scriptTags.length; i++) {
                const scriptContent = $(scriptTags[i]).html();
                if (scriptContent && scriptContent.includes('video_url')) {
                    const videoMatch = scriptContent.match(/"video_url":"([^"]+)"/);
                    if (videoMatch) {
                        videoUrl = videoMatch[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
                        break;
                    }
                }
            }
        }

        if (videoUrl) {
            const thumbnail = $('meta[property="og:image"]').attr('content') || '';
            const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Instagram Video';
            
            console.log('Found Instagram video:', videoUrl);
            
            return {
                videoInfo: {
                    title: title,
                    thumbnail: thumbnail,
                    platform: 'Instagram'
                },
                downloadLinks: [
                    { quality: 'Original', url: videoUrl }
                ]
            };
        } else {
            // If no video found, check if it's an image
            const imageUrl = $('meta[property="og:image"]').attr('content');
            if (imageUrl) {
                return {
                    videoInfo: {
                        title: 'Instagram Image',
                        thumbnail: imageUrl,
                        platform: 'Instagram'
                    },
                    downloadLinks: [
                        { quality: 'Original', url: imageUrl }
                    ]
                };
            }
            return { error: 'Instagram video/image not found. Make sure the account is public and URL is correct.' };
        }

    } catch (error) {
        console.error('Instagram download error:', error.message);
        return { error: 'Failed to download Instagram content. Make sure the account is public.' };
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});
