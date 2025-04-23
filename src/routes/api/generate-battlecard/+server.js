import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

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
You are a senior strategist and B2B sales enablement expert.

Your task is to create a world-class battlecard for internal sales use.

Use the following structure, tone, and format to compare our company (Company A) against a specific competitor (Company B). Make it bold, tactical, and useful in live sales conversations.

For extra context, both companies are resellers of Laserfiche. We need to identify why we are the better choice.

---

### INPUT:

**Company A (Us):**
Name: {companyAName}
Website: {companyAUrl}

**Company B (Competitor):**
Name: {companyBName}
Website: {companyBUrl}


### OUTPUT FORMAT (USE THIS EXACTLY):

**IMPORTANT**: Wrap each major section (starting from "Who Are We Selling Against?" up to and including "Close With Confidence") in a \`div\` with the class \`card bg-neutral text-neutral-content shadow-xl w-full mb-4\`. Inside that, add a \`div\` with class \`card-body\`. Start each section\'s content with an \`h2\` with class \`card-title text-primary-\`. **Use direct HTML markup** (e.g., \`<table>\`, \`<ul>\`, \`<li>\`, \`<blockquote>\`, \`<strong>\`) instead of Markdown within the card bodies.**

<h2>🛡️ Competitive Battlecard: {companyBName} vs. {companyAName}</h2>

<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_summary">
<div class="card-body">
<h2 class="card-title ">👤 Who Are We Selling Against?</h2>
<p>[Brief summary of the competitor: what they're known for, target customers, what they offer. Use paragraph tags.]</p>
</div>
</div>


<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_quick_summary">
<div class="card-body">
<h2 class="card-title ">🧠 Quick Summary: [{companyAName} vs. {companyBName}]</h2>
<div class="overflow-x-auto">
<table class="table  w-full">
<thead>
<tr>
<th>Attribute</th>
<th><strong>{companyAName} (Us)</strong></th>
<th><strong>{companyBName} (Them)</strong></th>
</tr>
</thead>
<tbody>
<tr><td>Ease of Use</td><td>[✅ / 🟢 / 🔴 and 1-line description]</td><td>[✅ / 🟢 / 🔴 and 1-line description]</td></tr>
<tr><td>Ideal Customer</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Pricing</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Speed to Value</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Customization</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Integration</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
<tr><td>Support & Service</td><td>[1-line summary]</td><td>[1-line summary]</td></tr>
</tbody>
</table>
</div>
</div>
</div>


<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_core">
<div class="card-body">
<h2 class="card-title ">🗣️ Core Talk Tracks (Why We Win)</h2>
<ol class="list-decimal list-inside space-y-2">
<li>
<strong>[Talk Track Title]</strong>
<blockquote class="pl-4 italic border-l-4 border-gray-300">
<p>"[Sharp, memorable quote your sales team can use]"</p>
</blockquote>
</li>
<li>
<strong>[Talk Track Title]</strong>
<blockquote class="pl-4 italic border-l-4 border-gray-300">
<p>"[Another punchy message focused on our strength]"</p>
</blockquote>
</li>
<li>
<strong>[Talk Track Title]</strong>
<blockquote class="pl-4 italic border-l-4 border-gray-300">
<p>"[Third key talking point that sets us apart]"</p>
</blockquote>
</li>
</ol>
</div>
</div>


<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_objections">
<div class="card-body">
<h2 class="card-title ">🛑 Common Objections + Responses</h2>
<div class="overflow-x-auto">
<table class="table w-full">
<thead>
<tr><th><strong>Objection</strong></th><th><strong>Reframe or Response</strong></th></tr>
</thead>
<tbody>
<tr><td>"[Customer objection]"</td><td>"Here's how we respond to that clearly and directly."</td></tr>
<tr><td>"[Customer objection]"</td><td>"Short, confidence-building response."</td></tr>
<tr><td>"[Customer objection]"</td><td>"Empathetic, but strong counter-message."</td></tr>
</tbody>
</table>
</div>
</div>
</div>


<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_landmine">
<div class="card-body">
<h2 class="card-title ">🚨 Landmine Questions (Use to Plant Doubt Subtly)</h2>
<ul class="list-disc list-inside space-y-1">
<li>"What does your onboarding process look like with {companyBName}?"</li>
<li>"How many of your team members are actually logging in every day?"</li>
<li>"How flexible is it without needing a developer?"</li>
<li>"How long did implementation take?"</li>
</ul>
</div>
</div>


<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_positioning">
<div class="card-body">
<h2 class="card-title ">🧨 Positioning Landmines to Avoid</h2>
<ul class="list-disc list-inside space-y-1">
<li>Don't bash the competitor — frame them as misaligned.</li>
<li>Avoid language that makes us sound smaller or less serious.</li>
<li>Keep focus on business impact, not feature comparisons.</li>
</ul>
</div>
</div>


<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_taglines">
<div class="card-body">
<h2 class="card-title ">🧩 Taglines You Can Use in Messaging</h2>
<ul class="list-disc list-inside space-y-1">
<li>"[Bold, sticky tagline 1]"</li>
<li>"[Tagline 2]"</li>
<li>"[Tagline 3]"</li>
</ul>
</div>
</div>


<div class="card bg-neutral text-neutral-content shadow-xl w-full mb-4 comp_close">
<div class="card-body">
<h2 class="card-title ">🔚 Close With Confidence</h2>
<p>[Wrap up with a strong paragraph reminding the rep when we win and how to confidently guide the conversation. Use paragraph tags.]</p>
</div>
</div>


Make your tone confident, crisp, and practical. This should feel like it was written by a VP of Sales who knows exactly what reps need to win deals.
`;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	if (!openai) {
		return json({ error: 'OpenAI client not initialized. Check server logs and environment variables.' }, { status: 500 });
	}

	/** @type {any} */ // Replace 'any' with a more specific type or use Zod for validation
	const body = await request.json();

	const { userUrl, competitorUrl, userEmail } = body;
	if (typeof userUrl !== 'string' || typeof competitorUrl !== 'string' || typeof userEmail !== 'string') {
		return json({ error: 'Invalid input data types.' }, { status: 400 });
	}

	const companyAName = getCompanyNameFromUrl(userUrl);
	const companyBName = getCompanyNameFromUrl(competitorUrl);

	console.log('Received battlecard generation request:');
	console.log({ userUrl, competitorUrl, userEmail, companyAName, companyBName });

	try {
		// 1. Fetch content from userUrl and competitorUrl (Requires additional libraries/logic) - STILL PENDING
		console.log("Placeholder: Fetching website content...");

		// 2. Construct the prompt
		const finalPrompt = battlecardPromptTemplate
			.replace(/{companyAName}/g, companyAName)
			.replace(/{companyAUrl}/g, userUrl)
			.replace(/{companyBName}/g, companyBName)
			.replace(/{companyBUrl}/g, competitorUrl);

		// 3. Make the OpenAI API call
		console.log("Making OpenAI API call...");

		const completion = await openai.chat.completions.create({
			model: "gpt-4o", // Using gpt-4o as per your example
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

		console.log("Cleaned battlecard content (snippet):");
		console.log(battlecardContent.substring(0, 200) + "...");

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