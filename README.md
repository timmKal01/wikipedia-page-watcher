# Wikipedia Page Watcher — Edit History Tracker

Track recent edits to any Wikipedia page: who made the change, when,
how many bytes of text changed, and whether the edit summary looks like
a revert or undo.

Built for PR, comms, and research teams watching a company, executive,
or topic page for vandalism, edit wars, or someone quietly rewriting the
narrative.

## Input

```json
{
  "pageTitle": "Tesla, Inc.",
  "language": "en",
  "daysBack": 30,
  "maxResults": 25
}
```

| Field | Type | Description |
|---|---|---|
| `pageTitle` | string | Exact Wikipedia page title, e.g. `"Tesla, Inc."` or `"Elon Musk"`. Check the URL after `/wiki/` if unsure. |
| `language` | string | Wikipedia language edition code. Default `"en"`. |
| `daysBack` | number | How many days back from today to search, by edit timestamp. Default `30`, max `365`. |
| `maxResults` | number | Max edits to return, most recent first. Default `25`, max `100`. |

## Output

One record per edit:

```json
{
  "pageTitle": "Tesla, Inc.",
  "revisionId": 1368347298,
  "parentRevisionId": 1368346447,
  "user": "RickyCourtney",
  "isAnonymous": false,
  "isMinorEdit": false,
  "timestamp": "2026-08-08T14:48:25Z",
  "sizeBytes": 351876,
  "sizeChangeBytes": -113,
  "comment": "/* Automotive products */ The Cybercab is not yet offered/sold/produced beyond prototypes",
  "looksLikeRevert": false,
  "diffUrl": "https://en.wikipedia.org/w/index.php?title=Tesla%2C%20Inc.&diff=1368347298&oldid=1368346447"
}
```

`isAnonymous` is `true` when the edit was made by an IP address rather
than a registered account — often worth a second look. `looksLikeRevert`
is a simple keyword match on the edit summary (`undo`, `undid`,
`revert`, `rv`), not an authoritative signal, but a fast way to spot
edit wars in the list.

A page with no edits in the requested window returns no items but is
still billed once for the search.

## How it works

Direct calls to the official [MediaWiki Action
API](https://www.mediawiki.org/wiki/API:Main_page) (`wikipedia.org/w/api.php`)
— no proxy, no key, no scraping. Wikipedia content and edit metadata are
freely reusable under Wikimedia's terms.

## Pricing note

Billed per **search**, not per edit returned — one charge whether the
search returns 0 edits or 100.

## Related products

- [News Intelligence Crawler](https://github.com/timmKal01/news-intelligence-crawler) — broader news coverage for the same brand/person monitoring use case
