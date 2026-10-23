# SmartSoko merchant and customer booklets

The current **Visual Edition** provides a twelve-page merchant manual and an eight-page customer guide in English and Swahili. PDFs are saved under `output/pdf/` at the repository root with names ending in `Visual-Edition.pdf`. It replaces the earlier illustrated edition with four distinct generated illustrations and eight full-page visual explanations, four in each booklet. Pages are in reading order; select booklet printing in the printer or PDF application for folded copies. Test one copy before a larger print run.

Fill in customer and merchant links, support contacts, service area, fees, delivery arrangements, payout terms and returns procedure before distribution. Confirm the instructions against the deployed merchant and customer experience during onboarding. The illustrations are original artwork and do not depict actual staff, shops or app screens.

## Editable sources

- `create_booklets.py` contains the bilingual manuscript and the original Word document builder.
- `visual_booklets.py` creates the current Visual Edition, including editable vector diagrams and infographics.
- `illustrated_booklets.py` creates the illustrated PDF edition with ReportLab.
- `print_booklets.py` creates the original plain PDF edition.
- `assets/smartsoko-marketplace-illustration.png` contains the original generated illustration used in the illustrated edition.
- `assets/catalogue.png`, `assets/shopping.png`, `assets/packing.png` and `assets/delivery.png` are the four separate illustrations in the current Visual Edition.
- `assets/illustration-prompts.json` preserves the exact prompts and the generation method for the four new images.
- `assets/smartsoko-header-logo.png` is the transparent horizontal header adaptation of the user's `Gemini_Generated_Image.jpeg` logo. It retains the emblem and wordmark, omits the small slogans and SS badge for readability, and appears on every page with larger sizing on covers. The original image remains unchanged. The built-in image editing prompt is in `assets/header-logo-prompt.txt`.

## Visual explanations in the current edition

Merchant pages 4, 7, 9 and 11 explain product listing fields, order fulfilment, payment reconciliation and the customer-shop-delivery journey. Customer pages 3, 4, 5 and 7 explain ordering, an illustrative checkout total, delivery progress and issue resolution. Other pages include smaller icon sequences and checklists. Schematic product cards and sample amounts are labelled as illustrative.

Use the Python runtime returned by the Codex workspace dependency loader. The PDF builder uses ReportLab and pypdfium2. Visual QA images are held in the `qa-*` directories.

## Illustration direction

Generated with the built-in image generation tool. Prompt: a polished editorial illustration sheet for SmartSoko supermarket training booklets, showing a Tanzanian woman shop manager using a smartphone, an assistant checking and packing everyday groceries, and a customer receiving a grocery bag from a helmeted delivery rider. Modern hand-painted editorial style, forest green and burnt orange accents, cream background, three distinct scenes, no text, logos, watermarks or app interface.

## Product references

Instructions were derived from the merchant product editor, order desk, Finance and Settings in `food_delivery_app/public/merchant.html`, customer checkout in `food_delivery_app/public/checkout.html`, order links in `food_delivery_app/public/customer-orders.html`, and merchant readiness notes in `food_delivery_app/docs/merchant-order-desk-readiness.md`. Repository behavior is evidence of implemented workflows, not certification of live payment or delivery performance.
