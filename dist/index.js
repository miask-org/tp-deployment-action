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


let artifactInfo = {};
let buildArgs = {};
let deployArgs = {};

async function main() {
  const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
  buildArgs = parseJSON(core.getInput('buildArgs'));
  deployArgs = parseJSON(core.getInput('deployArgs'));

  if (!deployArgs || !buildArgs) return;

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { context = {} } = github;

  try {
    if (await releaseExists(octokit, context)) {
        core.setFailed("Cancelling the subsequent step(s). " + buildArgs.release_tag + " already exists!")
      return;
    }
    if (await buildPackage()) {
      if (await createRelease(octokit, context)) {
        await uploadToCloudHub();
      }
    }
    console.log("action executed successfully.");
    return true;
  }
  catch (error) {
    console.error(error);
    core.setFailed(error.message)
    return;
  }
}

main();


async function releaseExists(octokit, context) {
  if (buildArgs.release_tag) {
    try {
      await octokit.repos.getReleaseByTag({
        ...context.repo,
        tag: buildArgs.release_tag
      });
      console.log("Release exist!");
    }
    catch (error) {
      if (error.status == 404) return false;
      else throw error;
    }
  }
  return true;
}

async function buildPackage() {
  console.log("Building project artifact ...");
  const build = await exec('mvn -B package --file pom.xml');
  console.log('Build logs ', build.stdout);
  return true;
}

async function createRelease(octokit, context) {
  const response = await octokit.repos.createRelease({
    ...context.repo,
    tag_name: buildArgs.release_tag,
    name: "Release " + buildArgs.release_tag,
    draft: false,
    prerelease: true
  });

  console.log('Release '+ buildArgs.release_tag +' created.');
  return await uploadReleaseAsset(octokit, context, response.data);
}

async function uploadReleaseAsset(octokit, context, release) {
  artifactInfo = parseJSON(await getArtifactInfo());

    await octokit.repos.uploadReleaseAsset({
      ...context.repo,
      release_id: release.id,
      origin: release.upload_url,
      name: artifactInfo.name,
      data: fs.readFileSync(artifactInfo.path)
    });
    return true;
}

async function uploadToCloudHub() {   
  const {client_id, client_secret} = deployArgs.cloudhub_creds;

  for (const app of deployArgs.cloudhub_apps) {   
    await exec("anypoint-cli --client_id=" + client_id + " --client_secret=" + client_secret + " --environment=" + app.env + " runtime-mgr cloudhub-application modify " + app.name + " " + artifactInfo.path);
    console.log(app.env + " updated successfully.");
  };
  return true;
}

async function getArtifactInfo() {
  var asset_name = await exec('cd target/ && ls *.jar | head -1');
  asset_name = asset_name.stdout.replace(/\r?\n|\r/g, "");
  const artifactInfo = JSON.stringify({ name: asset_name, path: "target/" + asset_name });
  console.log('Artifact Info: ', artifactInfo);
  return artifactInfo;
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