const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const FormData = require('form-data');
const https = require('https');

main();

function main() {

    var filpath = path.join(os.homedir(), 'Downloads', 'tp-transformation-api-1.16.1-SNAPSHOT-mule-application.jar');
    const file = fs.readFileSync(filpath);
    //console.log(file);

    var form = new FormData();
    form.append('file', fs.createReadStream(filpath), { knownLength: fs.statSync(filpath).size });

    upload(form);

}


function upload(formData) {

    axios({
      method: "post",
      url: "https://anypoint.mulesoft.com/cloudhub/api/v2/applications/my-transformation-sandbox-api/files",
      data: formData,
      headers: { ...formData.getHeaders(),
        "Content-Length": formData.getLengthSync(), 'X-ANYPNT-ENV-ID': '2d3e57e6-2165-48ac-9d9a-29f7e3367204' },
      auth: { username: 'Muzammal008',  password: 'Y100hott' }
    })
    .then((response) => {
      console.log('Response:: ', response);
    }, (error) => {
      console.log('Error:: ', error);
    });
}

function uploadHttps(artifact) {

    const options = {
        hostname: 'https://anypoint.mulesoft.com/cloudhub/api/',
        port: 443,
        path: 'v2/applications/my-transformation-sandbox-api/files',
        method: 'POST',
        headers: {
            "Content-Type": "multipart/form-data", 'X-ANYPNT-ENV-ID': '2d3e57e6-2165-48ac-9d9a-29f7e3367204'
        },
        body: {},
        auth: 'Muzammal008:Y100hott' 
      }
      const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)
      
        res.on('data', d => {
          process.stdout.write(d)
        })
      })
      
      req.on('error', error => {
        console.error('ERROR:: ', error)
      })
      
      req.end()
}

function toBuffer(ab) {
    var buf = Buffer.alloc(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}