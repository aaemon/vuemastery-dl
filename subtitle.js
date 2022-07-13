const fs = require('fs');
const url = require('url');
const https = require('https');

try {
  var data = fs.readFileSync('./data.txt', 'utf8');
  data = data.split("\n");
  data.forEach(function (v, index) {
    if (v.length > 10) {
      let id = v.trim();
      id = id.replace('https://player.vimeo.com/video/', '').replace('?', '').replace('autoplay=1', '').replace(/[&?]/gm, '').replace(/app_id=(.*)/gm, '');
      // Default APP ID is 122963
      startDownloadByID(index, id, 1080, 122963);
    }
  })
} catch (e) {
  console.log('Error on read file: ', e.stack);
}

return;

async function startDownloadByID(index, vID, quality, appID) {
  try {
    var pageData = await getVimeoPageByID(vID, quality, appID)
    var courseTitle = pageData.title || vID;
    var subtitleUrl = "https://player.vimeo.com" + pageData.subtitle;
    if (pageData.subtitle !== null) {
        await downloadFile(subtitleUrl, courseTitle.replace(/[^\w\s]/gi, '-') + '.vtt' ).then(function gotData(data) {
            console.log(courseTitle + ', Download Complete.');
        }, reason => {
            console.log('Error, ' + reason);
        });
    } else
        console.log('Subtitle not found');

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
    }
    https.get('https://player.vimeo.com/video/' + id + '?autoplay=1&app_id=' + appID,
    {headers: headers}
    , res => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", data => {
        body += data;
      });
      res.on("end", () => {
        resolve({
          title: findTitle(body),
          subtitle: findSubtitle(body)
        });
      });
      res.on('error', (e) => {
        reject(e)
      });
    });
  })
}

function findSubtitle(str, lang = 'en') {
  const regex = /(?:config = )(?:\{)(.*(\n.*?)*)(?:\"\})/gm;
  let res = regex.exec(str);
  if (res !== null) {
    if (typeof res[0] !== "undefined") {
      let config = res[0].replace('config = ', '');
      config = JSON.parse(config);
      let subtitle = config.request.text_tracks.find(el => el.lang === lang).url

      return subtitle;
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
