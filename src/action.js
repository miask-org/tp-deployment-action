const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');
const axios = require('axios');

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
    console.log('Release: ' + release);
    const artifactId = filterArtifactId(release);
    console.log('ArtifactId: ' + artifactId);
    const artifact = await getReleaseAsset(octokit, context, artifactId);
    console.log('artifact: ' + artifact.data);
    await uploadToCloudHub(artifact.data);
    
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
  
  if (!artifact[0] || !artifact[0].id) {
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
  }));
}

async function uploadToCloudHub(artifact) {   
  const {client_id, client_secret, basic_token} = deployArgs.cloudhub_creds;

  for (const app of deployArgs.cloudhub_apps) {   
    //await exec("anypoint-cli --client_id=" + client_id + " --client_secret=" + client_secret + " --environment=" + app.env + " runtime-mgr cloudhub-application modify " + app.name + " " + artifactInfo.path);
    const options = {
      hostname: 'https://anypoint.mulesoft.com/cloudhub/api/',
      port: 443,
      path: 'v2/applications/'+ app.name +'/files',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + basic_token,
        'X-ANYPNT-ENV-ID': app.env_id
      },
      body: artifact
    }
    /*const req = https.request(options, res => {
      console.log(`statusCode: ${res.statusCode}`)
    
      res.on('data', d => {
        process.stdout.write(d)
      })
    })
    
    req.on('error', error => {
      console.error('ERROR:: ', error)
    })
    
    req.end()*/

    axios.post('https://anypoint.mulesoft.com/cloudhub/api/v2/applications/' + app.name + '/files', {
      file: artifact
    },{
      auth: {
        username: client_id,
        password: client_secret
      },
      headers: {
        'X-ANYPNT-ENV-ID': app.env_id
      }
    })
    .then((response) => {
      console.log('Response:: ', response);
    }, (error) => {
      console.log('Error:: ', error);
    });

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