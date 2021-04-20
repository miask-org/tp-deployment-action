const core = require('@actions/core');
const github = require('@actions/github')
const axios = require('axios');
const FormData = require('form-data');

async function main() {
    const release_tag = core.getInput('release-tag');
    const cloudhub_envs = core.getInput('cloudhub-envs');
    const cloudhub_org_id = core.getInput('cloudhub-org-id');
    const cloudhub_app_name_pattern = core.getInput('cloudhub-app-name-pattern');
    if (!release_tag || !cloudhub_envs || !cloudhub_app_name_pattern || !cloudhub_org_id) return;

    const GITHUB_TOKEN = process.env.github_token;
    const cloudhub_user = process.env.cloudhub_user;
    const cloudhub_password = process.env.cloudhub_password;

    const octokit = github.getOctokit(GITHUB_TOKEN);
    const { context = {} } = github;

    try {
        const release = await getRelease(octokit, context, release_tag);
        const { id, name } = release.assets.filter(asset => asset.name.includes(release_tag))[0];
        console.log(`id: ${id} name: ${name}`);
        const artifact = getReleaseAsset(octokit, context, id);
        console.log("artifact: ", artifact);
        await uploadToCloudHub(cloudhub_org_id, cloudhub_envs, cloudhub_app_name_pattern, artifact, name, cloudhub_user, cloudhub_password);
        console.log("action executed successfully.");
        return true;
    }
    catch (error) {
        console.error(error);
        core.setFailed(error.message);
        return;
    }
}

main();


async function getRelease(octokit, context, release_tag) {
    try {
        return (await octokit.repos.getReleaseByTag({
            ...context.repo,
            tag: release_tag
        })).data;
    }
    catch (error) {
        core.setFailed(error.message);
        console.error(error);
    }
}

async function getReleaseAsset(octokit, context, assetId) {
    let result = null;
    try {
        result = (await octokit.request("GET /repos/{owner}/{repo}/releases/assets/{asset_id}", {
            headers: {
                Accept: "application/octet-stream",
            },
            ...context.repo,
            asset_id: assetId
        }));
        return toBuffer(result.data);
    }
    catch (error) {
        core.setFailed(error.message);
        console.error(error);
    }
}

async function uploadToCloudHub(cloudhub_org_id, cloudhub_envs, cloudhub_app_name_pattern, artifact, artifact_name, cloudhub_user, cloudhub_password) {
    try {
        const environments = await getEnvByOrgId(cloudhub_user, cloudhub_password, cloudhub_org_id);
        const cloudhub_apps = toJSON(cloudhub_envs, cloudhub_app_name_pattern);
        for (const app of cloudhub_apps) {
            const env = environments.filter(e => e.name.toUpperCase() == app.env.toUpperCase());
            if (env) {
                var form_data = new FormData();
                form_data.append('file', artifact, artifact_name);

                await axios({
                    method: "post",
                    url: `https://anypoint.mulesoft.com/cloudhub/api/v2/applications/${app.name}/files`,
                    auth: { username: cloudhub_user, password: cloudhub_password },
                    data: form_data,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    headers: {
                        ...form_data.getHeaders(),
                        "Content-Length": form_data.getLengthSync(),
                        'X-ANYPNT-ENV-ID': env[0].id
                    }
                })
                    .then(() => {
                        console.log(env[0].id + " updated successfully.");
                    }, (error) => {
                        console.error(error);
                        core.setFailed(error.message);
                    })
            }
        }
    }
    catch (error) {
        core.setFailed(error.message);
        console.error(error);
    }
}

async function getEnvByOrgId(cloudhub_user, cloudhub_password, org_id) {
    try {
        const response = await axios({
            method: "get",
            url: `https://anypoint.mulesoft.com/accounts/api/organizations/${org_id}/environments`,
            auth: { username: cloudhub_user, password: cloudhub_password }
        })
        return response.data.data;
    }
    catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
}

function toBuffer(value) {
    var buf = Buffer.alloc(value.byteLength);
    var view = new Uint8Array(value);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

function toJSON(cloudhub_envs, cloudhub_app_name_pattern) {

    var envArray = cloudhub_envs.split(",");
    var jsonString = '['

    envArray.forEach((element, index) => {
        var app_name = element.trim().toUpperCase() == "PROD" ? cloudhub_app_name_pattern.replace("-{ENV}", "") : cloudhub_app_name_pattern.replace("{ENV}", element.trim());
        jsonString = jsonString.concat(`{ "env": "${element.trim()}", "name":  "${app_name}" }`);
        jsonString = (index === envArray.length - 1) ? jsonString : jsonString.concat(',');
    });
    jsonString = jsonString.concat(']');

    return JSON.parse(jsonString);
}