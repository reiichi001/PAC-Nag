/* eslint-disable camelcase */
const core = require('@actions/core');
const github = require('@actions/github');
const {
	EmbedBuilder, WebhookClient,
} = require('discord.js');


async function listPullRequests(token, repoOwner, repo) {
	const octokit = github.getOctokit(token);
	const pullRequests = octokit.rest.pulls.list({
		owner: repoOwner,
		repo,
		state: 'open',
		sort: 'created',
		direction: 'desc',
		per_page: 100,
	});
	return pullRequests;
}

async function run() {
	try {
		const token = core.getInput('token');
		const webhook = new WebhookClient({
			url: core.getInput('discord_webhook'),
		});

		/*
        require('dotenv').config();
		const token = process.env.GITHUB_ACCESS_TOKEN;
		const webhook = new WebhookClient({
			url: process.env.DISCORD_WEBHOOK_URL,
		});
        */

		const repoOwner = github.context.repo.owner;
		const repo = github.context.repo.repo;

		const list = await listPullRequests(token, repoOwner, repo);

		const updatesList = [];
		const blockedPluginsList = [];
		const newPluginsList = [];
		list.data.forEach(listitem => {
			if (listitem?.labels?.find(label => label.name == "new plugin")) {
				newPluginsList.push(
					{
						title: listitem.title,
						url: listitem.url,
					}
				);
			}
			else if (listitem?.labels?.find(label => label.name == "blocked")) {
				blockedPluginsList.push(
					{
						title: listitem.title,
						url: listitem.url,
					}
				);
			}
			else {
				updatesList.push(
					{
						title: listitem.title,
						url: listitem.url,
					}
				);
			}
		});

		let prettyPrint = "";
		prettyPrint += "Plugin updates:\n";
		prettyPrint += JSON.stringify(updatesList, null, 2);
		prettyPrint += "\n";
		prettyPrint += "Blocked plugin updates:\n";
		prettyPrint += JSON.stringify(blockedPluginsList, null, 2);
		prettyPrint += "\n";
		prettyPrint += "New plugins:\n";
		prettyPrint += JSON.stringify(newPluginsList, null, 2);
		console.log(prettyPrint);

		const pluginUpdatesEmbed = new EmbedBuilder()
			.setTitle("Plugin updates to review and merge")
			.setDescription(updatesList?.length > 0
				? updatesList.map(plogon => `[${plogon.title}](${plogon.url})`).join("\n")
				: "No plugin updates to review!")
			.setColor("Green");

		const pluginUpdatesBlockedEmbed = new EmbedBuilder()
			.setTitle("Plugin updates that are currently blocked")
			.setDescription(blockedPluginsList?.length > 0
				? blockedPluginsList.map(plogon => `[${plogon.title}](${plogon.url})`).join("\n")
				: "No blocked plugins to review!")
			.setColor("Yellow");

		const newPluginsEmbed = new EmbedBuilder()
			.setTitle("New plugins that need to be reviewed")
			.setDescription(newPluginsList?.length > 0
				? newPluginsList.map(plogon => `[${plogon.title}](${plogon.url})`).join("\n")
				: "No new plugins to review!")
			.setColor("Red");


		webhook.send({
			content: "PAC-Nag in action",
			embeds: [
				pluginUpdatesEmbed,
				pluginUpdatesBlockedEmbed,
				newPluginsEmbed,
			],
		});
	}
	catch (error) {
		core.setFailed(error.message);
		// console.log(error.message);
	}
}

run();
