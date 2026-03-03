# Research articles

Edit **`research.ts`** to add or change articles on the [Research](/research) page.

## Adding a new article

Add an object to the `researchArticles` array with:

| Field        | Required | Description |
|-------------|----------|-------------|
| `title`     | Yes      | Article title |
| `description` | Yes    | Short summary (shown on the card) |
| `category`  | Yes      | Label, e.g. "Equity Analysis", "Macro Strategy" |
| `date`      | No       | Display date, e.g. "Dec 2024" |
| `pdfUrl`    | No       | Full URL to the PDF or article. Omit or use `''` to hide the "View Report" button |
| `tags`      | No       | Array of strings, e.g. `['Technology', 'Q4 2024']` |

## Example

```ts
{
  title: 'Your Report Title',
  description: 'One or two sentences summarizing the report.',
  category: 'Equity Analysis',
  date: 'Feb 2025',
  pdfUrl: 'https://yoursite.com/pdfs/my-report.pdf',
  tags: ['Tech', 'Valuation'],
}
```

You can host PDFs in `/public` (e.g. `public/pdfs/report.pdf`) and set `pdfUrl: '/pdfs/report.pdf'`, or use any external URL.

---

# Videos

Edit **`videos.ts`** to add or change videos on the [Videos](/videos) page.

## Adding a new video

Add an object to the `videos` array with: `title`, `description`, `videoUrl` (YouTube watch or embed URL), and optionally `thumbnailUrl`, `date`, `duration`.

## View counts from YouTube

To show view counts and sort by "Most views" / "Least views", set **`YOUTUBE_API_KEY`** in your environment (e.g. in `.env.local`):

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create or select a project, and enable **YouTube Data API v3**.
2. Create an API key under Credentials and add it to `.env.local`:  
   `YOUTUBE_API_KEY=your_key_here`

If the key is not set, the videos page still works; view counts are simply not shown and sort-by-views uses the order of the list.
