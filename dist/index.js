module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 929:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(368);
const github = __nccwpck_require__(99);
const cp = __nccwpck_require__(129);
const util = __nccwpck_require__(669);
const fs = __nccwpck_require__(747);
const exec = util.promisify(cp.exec);
const https = __nccwpck_require__(211);

let deployArgs = {};

async function main() {
  const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
  deployArgs = parseJSON(core.getInput('deployArgs'));

  if (!deployArgs) return;

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { context = {} } = github;

  try {
    const release = await getRelease(octokit, context);
    console.log('Release: ' + release);
    const artifactId = filterArtifactId(release);
    console.log('ArtifactId: ' + artifactId);
    const artifact = await getReleaseAsset(octokit, context, artifactId);
    console.log('artifact: ' + artifactId);
    await uploadToCloudHub(artifact);
    
    console.log("Action executed successfully.");
    return true;
  }
  catch (error) {
    console.error(error);
    core.setFailed(error.message)
    return;
  }
}

main();

function filterArtifactId(release) {

  const artifact = release.assets
                    .filter(asset => 
                      asset.name
                        .includes(deployArgs.release_tag)
                    );
  
  if (!artifact[0].id) {
    throw new Error("Release artifact not found");
  }
  return artifact[0].id
}

async function getRelease(octokit, context) {

  if (!deployArgs.release_tag) {
    throw new Error("Release tag name not provided.");
  }

  return (await octokit.repos.getReleaseByTag({
    ...context.repo,
    tag: buildArgs.release_tag
  })).data;
}

async function getReleaseAsset(octokit, context, assetId) {

  return (await octokit.repos.getReleaseAsset({
    ...context.repo,
    asset_id: assetId
  })).data;
}

async function uploadToCloudHub(artifact) {   
  const {client_id, client_secret} = deployArgs.cloudhub_creds;

  for (const app of deployArgs.cloudhub_apps) {   
    //await exec("anypoint-cli --client_id=" + client_id + " --client_secret=" + client_secret + " --environment=" + app.env + " runtime-mgr cloudhub-application modify " + app.name + " " + artifactInfo.path);
    const options = {
      hostname: 'https://anypoint.mulesoft.com/cloudhub/api',
      path: '/v2/applications/'+ app.name +'/files',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fea1269d-19bd-422d-a9f2-7a7714abb487',
        'X-ANYPNT-ENV-ID': '2d3e57e6-2165-48ac-9d9a-29f7e3367204'
      },
      body: artifact
    }
    const req = https.request(options, res => {
      console.log(`statusCode: ${res.statusCode}`)
    
      res.on('data', d => {
        process.stdout.write(d)
      })
    })
    
    req.on('error', error => {
      console.error(error)
    })
    
    req.write(data)
    req.end()

    console.log(app.env + " updated successfully.");
  };
  return true;
}

function parseJSON(string) {
  try {
    var json = JSON.parse(string);
    return json;
  }
  catch (error) {
    console.error(error);
    core.setFailed(error.message)
  }
  return null;
}

/***/ }),

/***/ 368:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 99:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");;

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ }),

/***/ 211:
/***/ ((module) => {

"use strict";
module.exports = require("https");;

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = require("util");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __nccwpck_require__(929);
/******/ })()
;