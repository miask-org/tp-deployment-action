const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const FormData = require('form-data');

async function main() {
  const GITHUB_TOKEN = process.env.github_token;
  const CLIENT_ID = process.env.client_id;
  const CLIENT_SECRET = process.env.client_secret;
  const ORG_ID = 'fdebe0d5-a2d7-4594-b1d3-db10e283e63b';

  const release_tag = core.getInput('release-tag');
  const cloudhub_apps = parseJSON(core.getInput('cloudhub-apps'));

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { context = {} } = github;

  try {
    const release = await getRelease(octokit, context, release_tag);
    const {id, name} = filterArtifact(release, release_tag);
    console.log(`Artifact Id: ${id},  Artifact Name: ${name}`);

    const artifact_stream = await getReleaseAsset(octokit, context, id);
    console.log('Release asset downloaded.');

    const artifact_buffer = toBuffer(artifact_stream);
    console.log('ArrayBuffer converted to Buffer.');

    uploadToCloudHub(CLIENT_ID, CLIENT_SECRET, ORG_ID, artifact_buffer, name, cloudhub_apps);

    return true;
  }
  catch (error) {
    console.error(error);
    core.setFailed(error.message)
    return;
  }
}

main();

function filterArtifact(release, release_tag) {
  const artifact = release.assets
                    .filter(asset => 
                      asset.name
                        .includes(release_tag));
  if (!artifact[0]) {
    throw new Error("Release artifact not found");
  }
  return artifact[0];
}

async function getRelease(octokit, context, release_tag) {
  const release = await octokit.repos.getReleaseByTag({
    ...context.repo,
    tag: release_tag
  });
  return release.data;
}

async function getReleaseAsset(octokit, context, assetId) {
  const response = await octokit.request("GET /repos/{owner}/{repo}/releases/assets/{asset_id}", {
    headers: {
      Accept: "application/octet-stream",
    },
    ...context.repo,
    asset_id: assetId
  });
  return response.data;
}

function uploadToCloudHub(CLIENT_ID, CLIENT_SECRET, ORG_ID, artifact, artifact_name, cloudhub_apps) {   
  const environments = getEnvByOrgId(CLIENT_ID, CLIENT_SECRET, ORG_ID);

  for (const app of cloudhub_apps) {   
    const env = environments.filter(env => env.name.toUpperCase() == app.name.toUpperCase());
    var form_data = new FormData();
    form_data.append('file', artifact, artifact_name);
    axios({
      method: "post",
      url: `https://anypoint.mulesoft.com/cloudhub/api/v2/applications/${app.name}/files`,
      auth: { username: CLIENT_ID,  password: CLIENT_SECRET },
      data: form_data,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: { 
        ...form_data.getHeaders(),
        "Content-Length": form_data.getLengthSync(), 
        'X-ANYPNT-ENV-ID': env[0].id }
    })
    .then( () => {
      console.log(app.env + " updated successfully.");
    }, (error) => {
      console.error(error);
      core.setFailed(error.message);
    })
  }
}

async function getEnvByOrgId(CLIENT_ID, CLIENT_SECRET, ORG_ID) {
  try {
    const response = await axios({
      method: "get",
      url: `https://anypoint.mulesoft.com/accounts/api/organizations/${ORG_ID}/environments`,
      auth: { username: CLIENT_ID,  password: CLIENT_SECRET }
    })
    return response.data.data;
  }
  catch(error) {
    console.error(error);
    core.setFailed(error.message);
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