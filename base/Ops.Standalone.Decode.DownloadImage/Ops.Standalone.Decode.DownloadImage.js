const fs = op.require('fs');
const path = op.require('path');
const https = op.require('https');
const http = op.require('http');
const url = op.require('url');

// Define inputs
const inTrigger = op.inTriggerButton("Download Image");
const inImageUrl = op.inString("Image URL", "");
const inFileName = op.inString("File Name", "image.jpg");
const inFilePath = op.inString("File Path", "/assets");

// Define outputs
const outFinished = op.outTrigger("Finished");
const outError = op.outString("Error Message");

inTrigger.onTriggered = () => {
    const imageUrl = inImageUrl.get();
    const fileName = inFileName.get();
    const filePath = inFilePath.get();

    // Parse the URL
    const parsedUrl = url.parse(imageUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Combine the file path and file name
    const fullPath = path.join(filePath, fileName);

    // Ensure that the directory exists
    fs.mkdir(filePath, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
            outError.set(`Error creating directory: ${mkdirErr.message}`);
            op.logError("Error creating directory:", mkdirErr);
            return;
        }

        // Request the image
        protocol.get(imageUrl, (response) => {
            // Check for successful response
            if (response.statusCode !== 200) {
                outError.set(`Failed to get image: ${response.statusCode} ${response.statusMessage}`);
                return;
            }

            // Pipe the response data into a file
            const fileStream = fs.createWriteStream(fullPath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close(() => {
                    outFinished.trigger();
                    outError.set(""); // Clear any previous error
                });
            });

            fileStream.on('error', (writeErr) => {
                fs.unlink(fullPath, (unlinkErr) => {
                    if (unlinkErr) {
                        op.logError("Error deleting partial file:", unlinkErr);
                    }
                    outError.set(`Error writing file: ${writeErr.message}`);
                    op.logError("Error writing file:", writeErr);
                });
            });
        }).on('error', (requestErr) => {
            outError.set(`Request error: ${requestErr.message}`);
            op.logError("Request error:", requestErr);
        });
    });
};
