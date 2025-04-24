import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import fs from 'fs/promises';
import path from 'path';

// Define CSV file path (inside storage directory)
const storageDir = path.resolve('storage');
const csvFilePath = path.join(storageDir, 'form_submissions.csv');
const csvHeaders = 'Timestamp,User URL,Competitor URL,Email\n';

/** @type {OpenAI | null} */
let openai = null;
try {
	if (!OPENAI_API_KEY) {
		throw new Error('OPENAI_API_KEY environment variable is not set.');
	}
	openai = new OpenAI({
		apiKey: OPENAI_API_KEY,
	});
} catch (error) {
	// @ts-ignore - Error type is unknown
	console.error("Failed to initialize OpenAI client:", error.message);
}

// Function to safely append to CSV
/**
 * Appends form submission data to a CSV file.
 * @param {{ userUrl: string; competitorUrl: string; userEmail: string; }} data The data to append.
 */
async function appendToCsv(data) {
	try {
		// Ensure storage directory exists
		await fs.mkdir(storageDir, { recursive: true });

		// Check if file exists
		try {
			await fs.access(csvFilePath);
		} catch {
			// File doesn't exist, write headers first
			await fs.writeFile(csvFilePath, csvHeaders);
			console.log(`Created CSV file with headers: ${csvFilePath}`);
		}

		// Format data line (handle potential commas in fields by quoting)
		/**
		 * Escapes a string for CSV field.
		 * @param {string | number | boolean} field The field value to escape.
		 * @returns {string} The CSV-escaped string.
		 */
		const escapeCsvField = (field) => `"${String(field).replace(/"/g, '""')}"`;
		const line = [
			new Date().toISOString(),
			escapeCsvField(data.userUrl),
			escapeCsvField(data.competitorUrl),
			escapeCsvField(data.userEmail)
		].join(',') + '\n';

		// Append data to the file
		await fs.appendFile(csvFilePath, line);
		// console.log('Appended data to CSV.'); // Optional: Log success
	} catch (err) {
		console.error("Error writing to CSV file:", err);
		// Decide how to handle this error - maybe log it but don't block the main request
	}
}

// Function to extract a simple name from URL
/**
 * Extracts a simplified company name from a URL.
 * @param {string} url The URL to extract the name from.
 * @returns {string} A simplified company name or the original URL on error.
 */
const getCompanyNameFromUrl = (url) => {
    try {
        const hostname = new URL(url).hostname;
        // Basic extraction, remove www. and split by dot
        const parts = hostname.replace(/^www\./, '').split('.');
        // Capitalize first part
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch (e) {
        return url; // Fallback to URL if parsing fails
    }
};

const battlecardPromptTemplate = `
## ROLE
You are a **senior strategist & B2B sales-enablement expert**.

## TASK
Create a world-class **competitive battlecard** for internal sales use.
It must be **punchy, data-accurate, and copy-pastable** in live calls.

---

### INPUT:

**Company A (Us):**
- Name: {companyAName}
- Website: {companyAUrl}

**Company B (Competitor):**
- Name: {companyBName}
- Website: {companyBUrl}

**Additional_Attributes:** [Optional; CSV list—e.g., "Security,Compliance" - Currently not provided by form]

---

### DATA SOURCES & RULES
1. Use information ONLY from:
   • the two websites above ({companyAUrl}, {companyBUrl})
   • press releases or blog posts **≤ 12 months old**
   • G2, Gartner, or Forrester pages
2. **Never** invent facts. If data is missing, output "—".
3. Keep total response **≤ 800 words**.

---

### OUTPUT (use this structure exactly):

**IMPORTANT**: Use the provided HTML structure (card, card-body, card-title). **Use direct HTML markup** (e.g., \`<table>\`, \`<ul>\`, \`<li>\`, \`<blockquote>\`, \`<strong>\`, \`<p>\`) instead of Markdown within the card bodies.**

<h2>🛡️ Competitive Battlecard: {companyBName} vs. {companyAName}</h2>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_summary">
<div class="card-body">
<h2 class="card-title">👤 Who Are We Selling Against?</h2>
<p>[Clear synopsis of Competitor—what they're known for, whom they serve, key offer.]</p>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_quick_summary">
<div class="card-body">
<h2 class="card-title">🧠 Quick Summary: [{companyAName} vs. {companyBName}]</h2>
<div class="overflow-x-auto">
<table class="table w-full">
<thead>
<tr>
<th>Attribute</th>
<th><strong>{companyAName} (Us)</strong></th>
<th><strong>{companyBName} (Them)</strong></th>
</tr>
</thead>
<tbody>
<tr><td>Ease of Use</td><td>[:white_check_mark: / :large_green_circle: / :red_circle:] – 1-line note</td><td>[:white_check_mark: / :large_green_circle: / :red_circle:] – 1-line note</td></tr>
<tr><td>Ideal Customer</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Pricing</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Speed to Value</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Customization</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Integration</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Support & Service</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<!-- Add rows here if Additional_Attributes are provided -->
</tbody>
</table>
<p><small>Rating keys: ✅ = best-in-class, 🟢 = parity, 🔴 = weakness.</small></p>
</div>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_proof_points">
<div class="card-body">
<h2 class="card-title">🚀 Proof Points</h2>
<ul class="list-disc list-inside space-y-1">
<li>[Customer logo + ROI stat - max 20 words]</li>
<li>[Analyst quote - max 20 words]</li>
<li>[Time-to-value win - max 20 words]</li>
<!-- Max 3 bullets -->
</ul>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_core">
<div class="card-body">
<h2 class="card-title">🗣️ Core Talk Tracks (Why We Win)</h2>
<ol class="list-decimal list-inside space-y-2">
<li>
<strong>[Title]</strong>
<blockquote class="pl-4 italic border-l-4 border-gray-300"><p>"[≤ 40 words sound-bite reps can quote]"</p></blockquote>
</li>
<li>
<strong>[Title]</strong>
<blockquote class="pl-4 italic border-l-4 border-gray-300"><p>"[≤ 40 words sound-bite reps can quote]"</p></blockquote>
</li>
<li>
<strong>[Title]</strong>
<blockquote class="pl-4 italic border-l-4 border-gray-300"><p>"[≤ 40 words sound-bite reps can quote]"</p></blockquote>
</li>
</ol>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_objections">
<div class="card-body">
<h2 class="card-title">🛑 Common Objections → Confident Responses</h2>
<div class="overflow-x-auto">
<table class="table w-full">
<thead>
<tr><th><strong>Objection</strong></th><th><strong>Reframe / Response (≤ 25 words)</strong></th></tr>
</thead>
<tbody>
<tr><td>"[Customer objection 1]"</td><td>"[Response 1]"</td></tr>
<tr><td>"[Customer objection 2]"</td><td>"[Response 2]"</td></tr>
<tr><td>"[Customer objection 3]"</td><td>"[Response 3]"</td></tr>
</tbody>
</table>
</div>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_landmine">
<div class="card-body">
<h2 class="card-title">🚨 Landmine Questions (Plant Doubt Subtly)</h2>
<ul class="list-disc list-inside space-y-1">
<li>"What did {companyBName} quote you for onboarding, and how long will that take?"</li>
<li>"How many active users log in weekly?"</li>
<li>"Which integrations require paid services?"</li>
<li>[Add 1-2 more questions, ≤ 15 words each]</li>
<!-- 3–4 total -->
</ul>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_positioning">
<div class="card-body">
<h2 class="card-title">❌ Positioning Landmines to Avoid</h2>
<ul class="list-disc list-inside space-y-1">
<li>Don't bash; frame them as <strong>mis-aligned</strong> to buyer needs.</li>
<li>Avoid language implying we're smaller or less proven.</li>
<li>Keep focus on <strong>business outcomes</strong>, not features.</li>
</ul>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_taglines">
<div class="card-body">
<h2 class="card-title">🧩 Taglines for Messaging</h2>
<ul class="list-disc list-inside space-y-1">
<li>"[Sticky tagline 1]"</li>
<li>"[Tagline 2]"</li>
<li>"[Tagline 3]"</li>
</ul>
</div>
</div>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_close">
<div class="card-body">
<h2 class="card-title">🔚 Close With Confidence</h2>
<p>[Two-sentence rally-cry: **When we win** (ideal scenario) and **next action** (qualify budget → book technical validation call). Use paragraph tags.]</p>
</div>
</div>

---

Make your tone confident, crisp, and practical. This should feel like it was written by a VP of Sales who knows exactly what reps need to win deals.
`;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	if (!openai) {
		return json({ error: 'OpenAI client not initialized. Check server logs and environment variables.' }, { status: 500 });
	}

	/** @type {any} */
	const body = await request.json();

	const { userUrl, competitorUrl, userEmail } = body;
	if (typeof userUrl !== 'string' || typeof competitorUrl !== 'string' || typeof userEmail !== 'string') {
		return json({ error: 'Invalid input data types.' }, { status: 400 });
	}

	// --- Append to CSV --- 
	await appendToCsv({ userUrl, competitorUrl, userEmail });
	// --------------------

	const companyAName = getCompanyNameFromUrl(userUrl);
	const companyBName = getCompanyNameFromUrl(competitorUrl);

	console.log('Received battlecard generation request:');
	console.log({ userUrl, competitorUrl, userEmail, companyAName, companyBName });

	try {
		// 1. Fetch content from userUrl and competitorUrl (Requires additional libraries/logic) - STILL PENDING
		//console.log("Placeholder: Fetching website content...");

		// 2. Construct the prompt
		const finalPrompt = battlecardPromptTemplate
			.replace(/{companyAName}/g, companyAName)
			.replace(/{companyAUrl}/g, userUrl)
			.replace(/{companyBName}/g, companyBName)
			.replace(/{companyBUrl}/g, competitorUrl);

		// 3. Make the OpenAI API call
		//console.log("Making OpenAI API call...");

		const completion = await openai.chat.completions.create({
			model: "o3-mini", // Using gpt-4o as per your example
			messages: [
				{ role: "system", content: "You are a senior strategist and B2B sales enablement expert." }, // System message from prompt
				{ role: "user", content: finalPrompt } // User message is the constructed prompt
			],
		});

		let battlecardContent = completion.choices[0]?.message?.content;

		if (!battlecardContent) {
			throw new Error("Failed to get content from OpenAI response.");
		}

		// Clean the response: remove potential markdown fences and trim whitespace
		battlecardContent = battlecardContent.replace(/```html\n?|```/g, '').trim();

		//console.log("Cleaned battlecard content (snippet):");
		//console.log(battlecardContent.substring(0, 200) + "...");
//
		// Return the cleaned content directly
		return json(
			{ 
				message: 'Battlecard generated successfully.', 
				battlecard: battlecardContent // Include cleaned content here
			},
			{ status: 200 }
		);

	} catch (error) {
		// @ts-ignore - Error type is unknown
		console.error("Error during battlecard generation process:", error);
		if (error instanceof OpenAI.APIError) {
			return json({ error: `OpenAI API Error: ${error.status} ${error.message}` }, { status: error.status || 500 });
		} else {
			return json({ error: 'An internal server error occurred during generation.' }, { status: 500 });
		}
	}
} 