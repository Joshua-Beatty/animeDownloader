import { CronJob }  from 'cron';
import axios from 'axios';
import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { exec } from 'child_process';
const parser = new XMLParser();
const job = new CronJob(
	'0 0 * * * *',
	main,
    null,
    false
);
export {job, main};

async function main() {
	const config = JSON.parse(fs.readFileSync('src/config.json', 'utf8'));
	const response = await axios.get("https://subsplease.org/rss/?r=1080")
	const data = parser.parse(response.data);
	let configUpdated = false;
	for(const item of data.rss.channel.item){
		for(const show of config.shows){
			if(item.title.includes(show.titlePiece)){
				if(show.last != (item.title)){
					show.last = item.title;
					configUpdated = true;
					downloadTorrent(item.link)
				}
			}
		}
	}
	if(configUpdated){
		fs.writeFileSync('src/config.json', JSON.stringify(config, null, 4));
	}
}
function downloadTorrent(link){
	exec(`transmission-remote -a ${link} -n ${process.env.TRANSMISSION_N_ARG}`, (error, stdout, stderr) => {
		if (error) {
		  console.error(`exec error: ${error}`);
		  return;
		}
		console.log(`stdout: ${stdout}`);
		console.error(`stderr: ${stderr}`);
	  });
}
