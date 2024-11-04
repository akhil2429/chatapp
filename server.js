const express = require('express');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');


const app = express();
const PORT = process.env.PORT || 3000;



// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle API requests from the client-side for chatbot
app.post('/generate-answer', async (req, res) => {
    const question = req.body.question;

    try {
        const response = await axios({
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCWw9rvMg_ju49UCzpxWNXyGf9WWdvVRt0`, // Replace with your actual API key
            method: 'post',
            data: {
                contents: [{ parts: [{ text: question }] }],
            },
        });

        const answer = response.data.candidates[0].content.parts[0].text;
        res.json({ answer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// Handle image upload and recognition using Amazon Rekognition
app.post('/upload-image', upload.single('image'), async (req, res) => {
    const imagePath = req.file.path;

    try {
        // Read the image file
        const imageBuffer = fs.readFileSync(imagePath);

        // Call Amazon Rekognition to detect labels
        const params = {
            Image: {
                Bytes: imageBuffer
            },
            MaxLabels: 10,
            MinConfidence: 75
        };

        rekognition.detectLabels(params, async (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Image recognition failed!' });
                return;
            }

            // Extract labels from Rekognition response
            const labels = data.Labels.map(label => label.Name);

            // Generate descriptive answers based on recognized objects
            const descriptionPromises = labels.map(async (label) => {
                const question = `Tell me more about ${label}`;
                try {
                    const response = await axios({
                        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCWw9rvMg_ju49UCzpxWNXyGf9WWdvVRt0`, // Replace with your actual API key
                        method: 'post',
                        data: {
                            contents: [{ parts: [{ text: question }] }],
                        },
                    });
                    return {
                        label,
                        description: response.data.candidates[0].content.parts[0].text,
                    };
                } catch (error) {
                    console.error(error);
                    return {
                        label,
                        description: 'Failed to get description.',
                    };
                }
            });

            const descriptions = await Promise.all(descriptionPromises);

            // Clean up uploaded file
            fs.unlinkSync(imagePath);

            res.json({ results: descriptions });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Image processing failed!' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
