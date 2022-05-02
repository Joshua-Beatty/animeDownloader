import { CronJob } from 'cron';
import axios from 'axios';
import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { spawn } from 'child_process';
const parser = new XMLParser();
const job = new CronJob(
	'0 0 * * * *',
	main,
	null,
	false
);
export { job, main };

async function main() {
	const config = JSON.parse(fs.readFileSync('src/config.json', 'utf8'));
	const response = await axios.get("https://subsplease.org/rss/?r=1080")
	const data = parser.parse(response.data);
	let configUpdated = false;
	for (const item of data.rss.channel.item) {
		for (const show of config.shows) {
			if (item.title.includes(show.titlePiece)) {
				if (!show.downloaded.includes(item.guid)) {
					downloadTorrent(item.title, item.link, (success) => {
						if (!success)
							return;
						if(!show.downloaded)
							show.downloaded = []
						show.downloaded.push(item.guid);
						configUpdated = true;
						console.log(`${item.title} successfully sent to transmission`)
					})

				}
			}
		}
	}
	if (configUpdated) {
		fs.writeFileSync('src/config.json', JSON.stringify(config, null, 4));
	}
}
function downloadTorrent(title, link, callback) {
	const tr = spawn(`transmission-remote`, ['-a', link, '-n', process.env.TRANSMISSION_N_ARG])
	tr.stdout.on('data', (data) => {
		console.log(`${title}-stdout: ${`${data}`.replace(process.env.TRANSMISSION_N_ARG, '*'.repeat(process.env.TRANSMISSION_N_ARG.length))}`);
	});

	tr.stderr.on('data', (data) => {
		console.log(`${title}-stderr: ${`${data}`.replace(process.env.TRANSMISSION_N_ARG, '*'.repeat(process.env.TRANSMISSION_N_ARG.length))}`);
	});

	tr.on('close', (code) => {
		callback(code == 0)
	});
}
