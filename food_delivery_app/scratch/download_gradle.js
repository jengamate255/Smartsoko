const fs = require('fs');
const http = require('https');
const path = require('path');

const url = 'https://mirrors.cloud.tencent.com/gradle/gradle-8.9-bin.zip';
const dest = 'D:\\gradle-8.9-bin.zip';

console.log(`Starting robust download of ${url} to ${dest}`);

function download(attempt = 1) {
    const file = fs.createWriteStream(dest);
    const request = http.get(url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Server returned status code: ${response.statusCode}`);
            file.close();
            fs.unlink(dest, () => {});
            retry(attempt);
            return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        let lastReported = 0;

        response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const percentage = Math.floor((downloadedSize / totalSize) * 100);
            if (percentage % 10 === 0 && percentage !== lastReported) {
                console.log(`Downloaded ${percentage}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
                lastReported = percentage;
            }
        });

        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log('Download completed successfully!');
            process.exit(0);
        });
    });

    request.on('error', (err) => {
        console.error(`Request error: ${err.message}`);
        file.close();
        fs.unlink(dest, () => {});
        retry(attempt);
    });

    request.setTimeout(30000, () => {
        console.error('Request timed out.');
        request.destroy();
        file.close();
        fs.unlink(dest, () => {});
        retry(attempt);
    });
}

function retry(attempt) {
    if (attempt >= 10) {
        console.error('Max attempts reached. Download failed.');
        process.exit(1);
    }
    console.log(`Retrying in 5 seconds (Attempt ${attempt + 1}/10)...`);
    setTimeout(() => download(attempt + 1), 5000);
}

download();
