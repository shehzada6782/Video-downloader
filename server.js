const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Basic route with error handling
app.get('/', (req, res) => {
    try {
        res.render('index', {
            title: 'Social Video Downloader',
            error: null,
            videoInfo: null,
            downloadLinks: null,
            platform: null
        });
    } catch (error) {
        console.error('Error rendering index:', error);
        res.send(`
            <html>
                <body>
                    <h1>Social Video Downloader</h1>
                    <p>Website is working. Video download features will be added soon.</p>
                    <form action="/download" method="POST">
                        <input type="url" name="videoUrl" placeholder="Enter Facebook/Instagram URL" required>
                        <button type="submit">Download</button>
                    </form>
                </body>
            </html>
        `);
    }
});

// Download route with basic functionality
app.post('/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.render('index', {
                title: 'Social Video Downloader',
                error: 'Please enter a URL',
                videoInfo: null,
                downloadLinks: null,
                platform: null
            });
        }

        // Simple response for testing
        res.render('index', {
            title: 'Social Video Downloader',
            error: 'Download feature will be available soon. Currently in testing mode.',
            videoInfo: null,
            downloadLinks: null,
            platform: null
        });

    } catch (error) {
        console.error('Download error:', error);
        res.render('index', {
            title: 'Social Video Downloader',
            error: 'Something went wrong. Please try again.',
            videoInfo: null,
            downloadLinks: null,
            platform: null
        });
    }
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).render('index', {
        title: 'Error - Social Video Downloader',
        error: 'Internal Server Error. Please try again later.',
        videoInfo: null,
        downloadLinks: null,
        platform: null
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('index', {
        title: '404 - Page Not Found',
        error: 'Page not found',
        videoInfo: null,
        downloadLinks: null,
        platform: null
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Visit: http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});
