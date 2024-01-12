/* eslint-disable max-len */
/* eslint-disable camelcase */
const core = require('@actions/core');
const github = require('@actions/github');
const {
	AttachmentBuilder, EmbedBuilder, WebhookClient, Attachment,
} = require('discord.js');
// we can remove this once github supports nodejs18
const fetch = (...args) => import('node-fetch').then(({
	// eslint-disable-next-line no-shadow
	default: fetch,
}) => fetch(...args));

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
		const pacSheetsLink = core.getInput('pacsheetslink');

		/*
		require('dotenv').config();
		const token = process.env.GITHUB_ACCESS_TOKEN;
		const webhook = new WebhookClient({
			url: process.env.DISCORD_WEBHOOK_URL,
		});
		const pacSheetsLink = process.env.PAC_SHEETS_LINK;
		*/

		const repoOwner = github.context.repo.owner;
		const repo = github.context.repo.repo;

		const list = await listPullRequests(token, repoOwner, repo);

		const updatesList = [];
		const blockedPluginsList = [];
		const newPluginsList = [];
		list.data.forEach(listitem => {
			const date = new Date(listitem.created_at);
			const timestamp = Math.floor(date.getTime() / 1000.0);

			if (listitem?.labels?.find(label => label.name == "new plugin")) {
				newPluginsList.push(
					{
						title: listitem.title,
						url: listitem.html_url,
						timestamp,
					}
				);
			}
			else if (listitem?.labels?.find(label => label.name == "blocked")) {
				blockedPluginsList.push(
					{
						title: listitem.title,
						url: listitem.html_url,
						timestamp,
					}
				);
			}
			else {
				updatesList.push(
					{
						title: listitem.title,
						url: listitem.html_url,
						timestamp,
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
				? updatesList.map(plogon => `[${plogon.title}](${plogon.url}) <t:${plogon.timestamp}:R>`).join("\n")
				: "No plugin updates to review!")
			.setColor("Green");

		const pluginUpdatesBlockedEmbed = new EmbedBuilder()
			.setTitle("Plugin updates that are currently blocked")
			.setDescription(blockedPluginsList?.length > 0
				? blockedPluginsList.map(plogon => `[${plogon.title}](${plogon.url}) <t:${plogon.timestamp}:R>`).join("\n")
				: "No blocked plugins to review!")
			.setColor("Yellow");

		const newPluginsEmbed = new EmbedBuilder()
			.setTitle("New plugins that need to be reviewed")
			.setDescription(newPluginsList?.length > 0
				? newPluginsList.map(plogon => `[${plogon.title}](${plogon.url}) <t:${plogon.timestamp}:R>`).join("\n")
				: "No new plugins to review!")
			.setColor("Red");

		const footerEmbed = new EmbedBuilder()
			.setDescription(`Don't forget to check the [Google Sheet](${pacSheetsLink})`)
			.setColor("LightGrey");

		// get a friendly capy
		// let capyjson = await fetch("https://api.tinyfox.dev/img?animal=capy&json");
		// capyjson = await capyjson.json();
		// console.log(await capyjson.json());
		let capyjson = await fetch("https://shibe.online/api/shibes");
		capyjson = await capyjson.json();
		// await console.log(capyjson);

		webhook.send({
			content: "PAC-Nag in action",
			embeds: [
				pluginUpdatesEmbed,
				pluginUpdatesBlockedEmbed,
				newPluginsEmbed,
				footerEmbed,
			],
			// files: [new AttachmentBuilder().setFile(`https://tinyfox.dev${capyjson.loc}`)],
			files: [new AttachmentBuilder().setFile(`${await capyjson[0]}`)],
		});
	}
	catch (error) {
		core.setFailed(error.message);
		// console.log(error.message);
	}
}

run();
