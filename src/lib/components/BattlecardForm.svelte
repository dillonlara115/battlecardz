<script lang="ts">
	let userUrl = '';
	let competitorUrl = '';
	let userEmail = '';
	let isLoading = false;
	let resultMessage = '';
	let generatedBattlecard: string | null = null;

	async function handleSubmit() {
		console.log('handleSubmit called');
		isLoading = true;
		resultMessage = '';
		generatedBattlecard = null;
		try {
			console.log('Sending fetch request to /api/generate-battlecard');
			console.log('Request body:', JSON.stringify({ userUrl, competitorUrl, userEmail }));
			const response = await fetch('/api/generate-battlecard', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userUrl,
					competitorUrl,
					userEmail
				})
			});

			if (response.ok) {
				const data = await response.json();
				resultMessage = data.message || 'Battlecard generation successful.';
				generatedBattlecard = data.battlecard || null;
				console.log('Fetch successful:', data);
				// Optionally clear the form
				// userUrl = '';
				// competitorUrl = '';
				// userEmail = '';
			} else {
				const errorData = await response.json();
				resultMessage = `Error: ${errorData.error || 'Failed to start generation.'}`;
				console.error('Fetch failed:', response.status, errorData);
			}
		} catch (error) {
			console.error('Form submission error (catch block):', error);
			resultMessage = 'An unexpected error occurred. Please try again.';
		} finally {
			isLoading = false;
			console.log('handleSubmit finished');
		}
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Your Website URL:</legend>
		<input
			type="url"
			id="userUrl"
			bind:value={userUrl}
			required
			class="input input-bordered w-full mt-1" 
			placeholder="https://yourcompany.com"
			pattern="^(https?://)?([a-zA-Z0-9]([a-zA-Z0-9\-].*[a-zA-Z0-9])?\.)+[a-zA-Z].*$"
			title="Must be a valid URL (e.g., https://example.com)" 
		/>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Competitor's Website URL:</legend>
		<input
			type="url"
			id="competitorUrl"
			bind:value={competitorUrl}
			required
			class="input input-bordered w-full mt-1" 
			placeholder="https://competitor.com"
			pattern="^(https?://)?([a-zA-Z0-9]([a-zA-Z0-9\-].*[a-zA-Z0-9])?\.)+[a-zA-Z].*$"
			title="Must be a valid URL (e.g., https://example.com)" 
		/>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Your Email Address:</legend>
		<input
			type="email"
			id="userEmail"
			bind:value={userEmail}
			required
			class="input input-bordered w-full mt-1" 
			placeholder="you@example.com"
		/>
		<p class="mt-1 text-xs text-gray-500">The generated battlecard will be sent here.</p>
	</fieldset>

	<div>
		<button
			type="submit"
			disabled={isLoading}
			class="btn btn-primary"
		>
			{#if isLoading}
				<span class="loading loading-spinner"></span>
				Generating...
			{:else}
				Generate Battlecard
			{/if}
		</button>
	</div>
</form>

<!-- Display Result Section -->
{#if resultMessage && !generatedBattlecard}
	<div class="alert alert-info mt-4" role="alert">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
		<span>{resultMessage}</span>
	</div>
{/if}

{#if generatedBattlecard}
	<div class="mt-6 pt-6 border-t border-gray-200">
		<h2 class="text-lg font-semibold mb-3">Generated Battlecard:</h2>
		<div class="max-w-none p-4 overflow-x-auto battlecard-container">
			{@html generatedBattlecard}
		</div>
	</div>
{/if} 