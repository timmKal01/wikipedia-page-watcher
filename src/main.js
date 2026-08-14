import { Actor, log } from 'apify';
import { fetchEdits } from './wikipedia.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { pageTitle, language = 'en', daysBack = 30, maxResults = 25 } = input;

if (!pageTitle) {
    throw new Error('"pageTitle" is required.');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const PAGE_WATCH_EVENT = 'page-watch';

const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

const edits = await fetchEdits({
    pageTitle,
    language,
    startDate,
    maxResults: Math.min(maxResults, 100),
});

for (const edit of edits) {
    await Actor.pushData(edit);
}

await Actor.charge({ eventName: PAGE_WATCH_EVENT });

log.info(`Pushed ${edits.length} edit(s)`);

await Actor.exit();
