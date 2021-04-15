const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const FormData = require('form-data');

let deployArgs = {};

async function main() {
  const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
  deployArgs = parseJSON(core.getInput('deployArgs'));
  console.log(deployArgs);

  if (!deployArgs) return;

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { context = {} } = github;

  try {
    const release = await getRelease(octokit, context);
    const {id, name} = filterArtifact(release);
    console.log(`artifact_id: ${id},  artifact_name: ${name}`);
    const artifact_stream = await getReleaseAsset(octokit, context, id);
    const buffer = toBuffer(artifact_stream);
    await uploadToCloudHub(buffer, name);
    
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

function filterArtifact(release) {

  const artifact = release.assets
                    .filter(asset => 
                      asset.name
                        .includes(deployArgs.release_tag)
                    );
  
  if (!artifact[0]) {
    throw new Error("Release artifact not found");
  }
  return artifact[0];
}

async function getRelease(octokit, context) {

  if (!deployArgs.release_tag) {
    throw new Error("Release tag name not provided.");
  }

  return (await octokit.repos.getReleaseByTag({
    ...context.repo,
    tag: deployArgs.release_tag
  })).data;
}

async function getReleaseAsset(octokit, context, assetId) {

  return (await octokit.request("GET /repos/{owner}/{repo}/releases/assets/{asset_id}", {
    headers: {
      Accept: "application/octet-stream",
    },
    ...context.repo,
    asset_id: assetId
  })).data;
}

async function uploadToCloudHub(artifact, artifact_name) {   
  const { client_id, client_secret } = deployArgs.cloudhub_creds;

  for (const app of deployArgs.cloudhub_apps) {   

    var form_data = new FormData();
    form_data.append('file', artifact, artifact_name);

    axios({
      method: "post",
      url: `https://anypoint.mulesoft.com/cloudhub/api/v2/applications/${app.name}/files`,
      auth: { username: client_id,  password: client_secret },
      data: form_data,
      headers: { 
        ...form_data.getHeaders(),
        "Content-Length": form_data.getLengthSync(), 
        'X-ANYPNT-ENV-ID': app.env_id }
    })
    .then((response) => {
      console.log(app.env + " updated successfully.");
    }, (error) => {
      throw error;
    })
  }
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


function toBuffer(ab) {
  var buf = Buffer.alloc(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
      buf[i] = view[i];
  }
  return buf;
}