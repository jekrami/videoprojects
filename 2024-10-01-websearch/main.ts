//edited by J.Ekrami 2024-10-18
import { Readability } from "jsr:@paoramen/cheer-reader";

import ollama from "npm:ollama";
import * as cheerio from "npm:cheerio@1.0.0";

const searchUrl = "http://localhost:8181/search";
const query = Deno.args.join(" ");

console.log(`Query: ${query}`);
const urls = await getNewsUrls(query);
const alltexts = await getCleanedText(urls);
await answerQuery(query, alltexts);

async function getNewsUrls(query: string): Promise<string[]> {

	const searchResults = await fetch(`${searchUrl}?q=${encodeURIComponent(query)}&format=json`);
	const searchResultsJson: { results: Array<{ url: string }> } =
		await searchResults.json();
	const urls = searchResultsJson.results
		.map((result) => result.url)
		.slice(0, 5); // Change the slice value to return more URLs if needed
	return urls;
}

async function getCleanedText(urls: string[]) {
	const texts = [];
	for await (const url of urls) {
		const getUrl = await fetch(url);
		console.log(`Fetching ${url}`);
		const html = await getUrl.text();
		const text = htmlToText(html);
		texts.push(`Source: ${url}\n${text}\n\n`);
	}
	return texts;
}

function htmlToText(html: string) {
	const $ = cheerio.load(html); //cheerio is wonderfull!
  	const text = new Readability($).parse();
	return text.textContent;
}

async function answerQuery(query: string, texts: string[]) {
	const result = await ollama.generate({
		model: "llama3.2:1b",
		prompt: `${query}. Summarize the information and provide an answer. Use only the information in the following articles to answer the question: ${texts.join("\n\n")}`,
		stream: true,
		options: {
			num_ctx: 16000,
		},
	});
	for await (const chunk of result) {
		if (chunk.done !== true) {
			await Deno.stdout.write(new TextEncoder().encode(chunk.response));
		}
	}
}
