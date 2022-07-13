const fs = require('fs');
const url = require('url');
const https = require('https');
// const { exec } = require("child_process");

if (process.argv.length < 3) {
    console.log(`Usage: node download.js {Video LINK} quality`);
    return;
}
let id = process.argv[2];
let quality = process.argv[3] || 1080;
id = id.replace('https://player.vimeo.com/video/', '').replace('?', '').replace('autoplay=1', '').replace(/[&?]/gm, '').replace(/app_id=(.*)/gm, '');

// Default APP ID is 122963
startDownloadByID(id, quality, 122963)

async function startDownloadByID(vID, quality, appID) {
    try {
        let pageData = await getVimeoPageByID(vID, quality, appID)
        let videoURL = pageData.videoURL;
        let courseTitle = pageData.title || vID;
        let fileName = courseTitle.replace(/[^a-zA-Z0-9 ]/g, '-') + '.mp4';

        if (videoURL !== null) {
            console.log(courseTitle + ', Downloading...');
            await downloadFile(videoURL, fileName).then(function gotData(data) {
                console.log(courseTitle + ', Download Complete.');
            }, reason => {
                console.log('Error, ' + reason);
            });
        } else
            console.log('Video not found');

    } catch (e) {
        console.log('Error On video:' + vID);
        console.error(e);
        return;
    }
}

async function downloadFile(url, name) {
    const file = fs.createWriteStream(name);
    return new Promise((resolve, reject) => {
        let request = https.get(url, function (response) {
            response.pipe(file);

            file.on('finish', function () {
                file.close();
                resolve(response);
            });
        });

        /* if there's an error, then reject the Promise
             * (can be handled with Promise.prototype.catch) */
        request.on('error', reject);

        request.end();
    });
}

async function getVimeoPageByID(id, quality, appID) {
    return new Promise(function (resolve, reject) {
        const headers = {
            'User-Agent': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        https.get('https://player.vimeo.com/video/' + id + '?autoplay=1&app_id=' + appID,
            {headers: headers}, res => {
                res.setEncoding("utf8");
                let body = "";
                res.on("data", data => {
                    body += data;
                });
                res.on("end", () => {
                    resolve({
                        videoURL: findVideoUrl(body, quality),
                        title: findTitle(body)
                    });
                });
                res.on('error', (e) => {
                    reject(e)
                });
            });
    })
}

function findVideoUrl(str, quality) {
    const regex = /(?:config = )(?:\{)(.*(\n.*?)*)(?:\"\})/gm;
    let res = regex.exec(str);
    if (res !== null) {
        if (typeof res[0] !== "undefined") {
            let config = res[0].replace('config = ', '');
            config = JSON.parse(config);
            let progressive = config.request.files.progressive, videoURL;
            for (let item of progressive) {
                videoURL = item.url;
                if (quality + 'p' === item.quality)
                    break;
            }
            return videoURL;
        }
    }
    return null;
}

function findTitle(str) {
    const VIMEO_NAME = "on Vimeo"
    let title = str.match(/<title.*?>(.*)<\/title>/)[1];
    if (title) {
        return title.split(VIMEO_NAME)[0].trim();
    } else {
        return null;
    }
}