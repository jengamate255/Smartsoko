# SmartSoko marketing agent

## Studio and daily operator

The studio now includes a command centre, owner brief, review inbox with bulk approval and editing, Tanzania-time content calendar, persistent agent activity, and brand/automation controls. Counts describe the latest 200 stored posts; they are not social reach or engagement metrics. Broken creative previews show an attention state. No follower/revenue/impression data is invented.

The daily operator stores its brief, configuration, last run and latest 30 run summaries in `admin_settings` under `marketing_agent_control`. It uses a persisted compare-and-swap lease and deterministic post IDs to prevent overlapping workers from creating duplicate daily campaigns. An expired unfinished run checks for already-created posts before generating again. Failed provider runs stop for the day; an administrator may retry manually. One invalid model output receives one bounded rewrite attempt. HTTP/provider failures do not silently switch providers.

At the configured planning hour it rotates catalogue products, cycles the content pillar, creates channel-specific drafts with staggered suggested publication times, validates output, and leaves an owner brief. Availability is checked again before a product post is published; unavailable products return to draft with a hold reason. The quality screen checks missing media, product links and a limited set of promotional claims. It is a heuristic, not proof of factual accuracy or image rights.

Two operating modes are available:
- **Review:** autonomous daily preparation; the owner approves the saved posts. With the daily agent enabled, due approved posts are sent by the scheduler.
- **Automatic publication:** the operator approves eligible new posts and schedules them without per-post review. This mode is rejected until credentials exist for every selected channel. A confirmation in the studio makes the standing publishing authorization explicit. Posts with missing creative/heuristic flags remain in review.

Pause disables future daily preparation and automated sends. It cannot undo an in-flight social network request. A live publication whose result is unknown is never retried automatically. Every platform-confirmed post stores its remote ID. Facebook currently publishes text-only posts; the preview image is creative reference. Instagram publishes a single image; X publishes text. Engagement analysis, social inbox/DM management, paid ad buying, new image generation and video production are not implemented.

The live local configuration was enabled for daily preparation at 09:00 EAT in review mode. Social connections are still missing, so publication is blocked. This is a worker inside the Express process, not an always-on cloud agent: the computer/server must remain running until an always-running backend is deployed. The static Firebase site cannot run this worker.

Open `/marketing-agent.html` locally with a platform admin login, or use Admin → Marketing → Open marketing workspace.

The first version creates 1–14 days of English or Kiswahili campaign drafts from the product catalogue (three drafts per day). Catalogue templates work without an AI key. Optional Gemini copywriting sends only campaign names and public product copy to Google; choose AI copywriter after setting GEMINI_API_KEY and MARKETING_AI_MODEL to an available Gemini model. Generated copy is validated for IDs, platform limits and original links, remains a draft and needs human factual review. Invalid model output fails without saving a partial campaign. Drafts and approval/publication history persist in the existing Supabase `admin_settings` JSONB table under `marketing_post:<uuid>`; no database migration is required. The queue shows the latest 200 posts. Catalogue retrieval is currently limited to 100 products.

Review copy, stock and image rights before approving. Instagram requires a public HTTPS image. Saving changes resets approval. Platform network failures are recorded as **unknown**; check the social account before manually creating another post. Publishing claims the record using compare-and-swap so two workers cannot publish the same approved record. A process crash leaves `publishing` and requires manual reconciliation. Never clear that state without checking the platform.

## Server configuration

Image selection runs automatically for new campaigns. The agent checks the featured product's photo first, then exact-name catalogue matches. Only allowed public image hosts are probed, HTTPS is required, redirects are rejected and responses must have an image MIME type. Results are cached for five minutes per product. “Find image” repeats selection for an unpublished post and resets its approval. It does not scrape arbitrary search-engine images or claim to visually recognize product photos.

Optional `PEXELS_API_KEY` enables licensed stock-photo search when no usable catalogue image exists. Matching uses the product name and photo metadata, with a minimum 640×640 source size. Stock photos are explicitly illustrative, retain source/photographer attribution, and remain in human review before publication. A saved image URL alone is not proof that it depicts the seller's actual item. Without a Pexels key, catalogue selection still works; unresolved images are flagged.

Set credentials only in the server environment; never in HTML, browser storage or Git:

```
MARKETING_META_VERSION=<supported Graph API version for your Meta app, e.g. vNN.N>
MARKETING_FB_PAGE_ID=<Facebook Page ID>
MARKETING_FB_TOKEN=<Page access token with pages_manage_posts>
MARKETING_IG_USER_ID=<linked professional Instagram account ID>
MARKETING_IG_TOKEN=<Facebook Login token with instagram_content_publish and required Page permissions>
MARKETING_X_USER_TOKEN=<OAuth user access token with tweet.write>
MARKETING_SCHEDULER_ENABLED=false
GEMINI_API_KEY=<optional Google Gemini API key>
MARKETING_AI_MODEL=<available Gemini model name>
GROQ_API_KEY=<optional Groq API key>
MARKETING_GROQ_MODEL=<available Groq chat model name>
```

Facebook uses Page text posts; images are not attached by this adapter. Instagram uses the Facebook Login media-container / media_publish flow for a single image. X uses text posts. Reels, Stories, carousel posts, automatic replies, DMs, paid ads, token refresh and engagement analytics are not implemented. API permissions/app review and any platform access fees must be handled in the platform developer accounts. The configured indicators only check required environment values; they do not certify token validity.

Keep scheduling off until accounts and draft quality are verified. When explicitly enabled, the running Express process checks due approved posts once per minute. Stopping the process stops scheduling; overdue approved posts are handled after restart. Use an always-running hosted backend for production. There is no background service on Firebase static hosting.

The agent sends only the approved public copy and selected media URL to the configured social platform. It does not send customer data. Never put credentials or private information in draft text.

## Verification

`npm.cmd --prefix food_delivery_app test -- --run tests/marketing-agent.test.js`

Live account publication has not been tested or performed. To activate production, first connect the public Express backend, configure the official platform credentials, review one draft and publish a single test post from this workspace.

Official API references:
- https://developers.facebook.com/docs/pages-api/posts/
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- https://docs.x.com/x-api/posts/manage-tweets/introduction
- https://ai.google.dev/api/generate-content
- https://console.groq.com/docs/text-chat

The writing selector supports catalogue templates, Gemini and Groq. Choosing Groq sends the same public campaign brief to Groq's Chat Completions endpoint; both providers share the same validation and private draft workflow. There is no automatic provider fallback: the selected provider's error is shown without silently sending copy to another service.
