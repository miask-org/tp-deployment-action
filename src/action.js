const core = require('@actions/core');
const github = require('@actions/github');
const cp = require('child_process');
const util = require('util');
const fs = require('fs');
const exec = util.promisify(cp.exec);


let artifactInfo = {};
let deployArgs = {};

async function main() {
  const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
  deployArgs = parseJSON(core.getInput('deployArgs'));

  if (!deployArgs) return;

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { context = {} } = github;

  try {
    const release = await getRelease(octokit, context);
    const artifactId = filterArtifactId(release);
    const artifact = await getReleaseAsset(octokit, context, artifactId);
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

async function uploadToCloudHub() {   
  const {client_id, client_secret} = deployArgs.cloudhub_creds;

  for (const app of deployArgs.cloudhub_apps) {   
    await exec("anypoint-cli --client_id=" + client_id + " --client_secret=" + client_secret + " --environment=" + app.env + " runtime-mgr cloudhub-application modify " + app.name + " " + artifactInfo.path);
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