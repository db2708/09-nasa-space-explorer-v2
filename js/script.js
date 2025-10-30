// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Get references to DOM elements
const gallery = document.getElementById('gallery');
const getImageBtn = document.getElementById('getImageBtn');
// Fact box (random "Did you know?") — populated on page load
const factBoxEl = document.getElementById('fact-box');

// Small collection of fun space facts shown randomly each load
const spaceFacts = [
	"Venus spins backward – Venus rotates clockwise, so the Sun rises in the west and sets in the east.",
	"Neutron stars are insanely dense – A sugar-cube of neutron star material would weigh about a billion tons on Earth.",
	"Saturn could float in water – Its average density is less than water, so it would float if you had a giant bathtub.",
	"NASA made the coldest spot in the universe – Scientists cooled atoms to a billionth of a degree above absolute zero to study quantum effects.",
	"Jupiter has diamond storms – Extreme pressure in Jupiter's atmosphere may compress carbon into solid diamond, raining down like hail.",
	"Some planets are faster than their stars – WASP-19b orbits its star in under a day, making its 'year' shorter than its rotation.",
	"A star can spin so fast it flattens – Altair spins so rapidly that it bulges at the equator, making it look more like a squashed sphere.",
	"Some moons glow faintly – Jupiter's moon Io and Saturn's moon Enceladus emit faint visible light due to volcanic activity or geysers interacting with charged particles."
];

// Pick and show a random fact once DOM is ready
function showRandomFact() {
	if (!factBoxEl) return;
	const idx = Math.floor(Math.random() * spaceFacts.length);
		// Use a small bold label on the first line and the fact on the second line
		factBoxEl.innerHTML = `<div class="fact-label">Fun Fact!</div><div class="fact-text">${spaceFacts[idx]}</div>`;
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', showRandomFact);
} else {
	showRandomFact();
}
// Keep fetched items and current index for modal navigation
let currentItems = [];
let currentIndex = -1;
let modalListenersAdded = false;
// dynamic video element (created when needed for direct video files)
let modalVideoEl = null;

// Add click handler to fetch and display images
getImageBtn.addEventListener('click', async () => {
	// Compact the UI: show top nav and hide the button
	document.body.classList.add('compact');
	// hide the button visually and from assistive tech once clicked
	getImageBtn.style.display = 'none';
	getImageBtn.setAttribute('aria-hidden', 'true');

	// Allow vertical scrolling so the gallery can be fully viewed
	document.documentElement.style.overflowY = 'auto';
	document.body.style.overflowY = 'auto';

	// Show loading message in the gallery for accessibility and feedback
	gallery.innerHTML = '';
	const loadingDiv = document.createElement('div');
	loadingDiv.className = 'placeholder';
	loadingDiv.setAttribute('role', 'status');
	loadingDiv.setAttribute('aria-live', 'polite');
	loadingDiv.innerHTML = `<div class="placeholder-icon">🔄</div><p>Fetching space images...</p>`;
	gallery.appendChild(loadingDiv);

	// Small UX delay so the loading message is visible even on fast networks
	// (750ms = 0.75s)
	await new Promise((res) => setTimeout(res, 750));

	try {
		const resp = await fetch(apodData);
		if (!resp.ok) throw new Error(`Network response was not ok (${resp.status})`);
		const data = await resp.json();

		// store items for modal navigation
		let fetched = Array.isArray(data) ? data : [];

		// Desired gallery ordering (user-specified). We'll try to match titles
		// case-insensitively and by a normalized substring match. If an item
		// isn't found we'll leave the remaining items in their original order.
		const desiredOrder = [
			"NGC 6960: The Witch's Broom Nebula",
			"GW250114: Rotating Black Holes Collide",
			"The NGC 6914 Complex",
			"Comet Lemmon Brightens",
			"Comet C/2025 R2 (SWAN)",
			"A SWAN, an ATLAS, and Mars",
			"saturn opposite the sun",
			"Earthrise: A Video Reconstruction",
			"a rocket in the sun"
		];

		function normalize(str) {
			return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
		}

		function reorderItems(items, orderList) {
			const remaining = items.slice();
			const ordered = [];
			for (const want of orderList) {
				const wantNorm = normalize(want);
				let foundIdx = -1;
				for (let i = 0; i < remaining.length; i++) {
					const t = remaining[i].title || '';
					if (normalize(t).includes(wantNorm) || normalize(want).includes(normalize(t))) {
						foundIdx = i;
						break;
					}
				}
				if (foundIdx !== -1) {
					ordered.push(remaining.splice(foundIdx, 1)[0]);
				}
			}
			// append any items we didn't explicitly order
			return ordered.concat(remaining);
		}

		currentItems = reorderItems(fetched, desiredOrder);
		renderGallery(currentItems);
	} catch (err) {
		// Show a simple error state inside the gallery
		gallery.innerHTML = '';
		const errorDiv = document.createElement('div');
		errorDiv.className = 'placeholder';
		errorDiv.innerHTML = `<div class="placeholder-icon">⚠️</div><p>Unable to fetch images. ${err.message}</p>`;
		gallery.appendChild(errorDiv);
		console.error('Fetch error:', err);
	} finally {
		// keep the button hidden after click (we don't re-enable it)
	}
});

// Render gallery items (image, title, date)
function renderGallery(items) {
	// Clear existing content (placeholder or previous results)
	gallery.innerHTML = '';

	if (!Array.isArray(items) || items.length === 0) {
		const noData = document.createElement('div');
		noData.className = 'placeholder';
		noData.innerHTML = `<p>No images found.</p>`;
		gallery.appendChild(noData);
		return;
	}

		// For each item create a gallery card
		items.forEach((item, idx) => {
		const card = document.createElement('div');
		card.className = 'gallery-item';

		// If the item is an image, show it. For video items show a thumbnail with a play overlay.
		if (item.media_type === 'image' && item.url) {
			const img = document.createElement('img');
			img.src = item.url;
			img.alt = item.title || 'NASA image';
			// Add basic loading performance hint
			img.loading = 'lazy';
			card.appendChild(img);
		} else if (item.media_type === 'video') {
			// Create a video thumbnail container
			const thumbWrap = document.createElement('div');
			thumbWrap.className = 'video-thumb';

			// Determine thumbnail source: thumbnail_url if provided, otherwise try YouTube thumbnail
			let thumbSrc = item.thumbnail_url || '';
			if (!thumbSrc && item.url && /youtu(?:be)?\.com|youtu\.be/.test(item.url)) {
				// extract youtube id
				const idMatch = item.url.match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
				const ytId = idMatch ? idMatch[1] : null;
				if (ytId) thumbSrc = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
			}

				if (thumbSrc) {
				const timg = document.createElement('img');
				timg.src = thumbSrc;
				timg.alt = item.title || 'Video thumbnail';
				timg.loading = 'lazy';
				thumbWrap.appendChild(timg);

				const play = document.createElement('div');
				play.className = 'video-play';
				play.textContent = '▶';
				thumbWrap.appendChild(play);
			} else {
				// fallback icon
				const fallback = document.createElement('div');
				fallback.style.padding = '30px 10px';
				fallback.style.textAlign = 'center';
				fallback.innerHTML = '<div style="font-size:28px">🎞️</div>';
				thumbWrap.appendChild(fallback);
			}

						// expose the original media url for downstream handling
						if (item.url) thumbWrap.dataset.mediaUrl = item.url;
						card.appendChild(thumbWrap);

						// Make the whole card keyboard accessible and announce it's a video
						card.setAttribute('role', 'button');
						card.tabIndex = 0;
						const ariaTitle = item.title ? `${item.title} (video)` : 'Open video';
						card.setAttribute('aria-label', ariaTitle);
						// allow keyboard activation (Enter / Space)
						card.addEventListener('keydown', (ev) => {
							if (ev.key === 'Enter' || ev.key === ' ') {
								ev.preventDefault();
								openModalAt(idx);
							}
						});

			// Provide a direct link below the thumbnail for accessibility/fallback
			// (removed inline "View media" link; thumbnail itself and modal/open behavior provide access)
		} else {
			// Other non-image media: show thumbnail if available or a placeholder and a link
			const placeholder = document.createElement('div');
			placeholder.style.padding = '30px 10px';
			placeholder.style.textAlign = 'center';
			placeholder.innerHTML = item.thumbnail_url
				? `<img src="${item.thumbnail_url}" alt="${item.title || 'media'}" style="width:100%;height:160px;object-fit:cover;border-radius:4px;">`
				: '<div style="font-size:28px">🎞️</div>';
			card.appendChild(placeholder);

			if (item.url) {
				// removed the textual fallback link to reduce visual clutter; users can click the thumbnail or card
			}
		}

		// Title
		const title = document.createElement('h3');
		title.textContent = item.title || 'Untitled';
		title.style.marginTop = '6px';
		title.style.fontSize = '16px';
		title.style.color = '#222';
		card.appendChild(title);

		// Date
		const date = document.createElement('p');
		date.textContent = item.date || '';
		date.style.color = '#666';
		date.style.fontSize = '13px';
		card.appendChild(date);

			// Clicking the card opens the modal with details (track index for navigation)
				card.addEventListener('click', () => openModalAt(idx));

			gallery.appendChild(card);
	});
}

// End of script

	// --- Modal logic ---
	const modal = document.getElementById('modal');
	const modalImage = document.getElementById('modal-image');
	const modalTitle = document.getElementById('modal-title');
	const modalDate = document.getElementById('modal-date');
	const modalExplanation = document.getElementById('modal-explanation');
	const modalCloseBtn = document.querySelector('.modal-close');
	const modalBackdrop = document.querySelector('.modal-backdrop');
	const modalPrevBtn = document.querySelector('.modal-prev');
	const modalNextBtn = document.querySelector('.modal-next');
	// iframe reference added earlier
	const modalIframeEl = document.getElementById('modal-iframe');

	function openModal(item) {
		// Populate text content first (so we can measure heights)
		modalTitle.textContent = item.title || '';
		modalDate.textContent = item.date || '';
		// reset any previous font-size adjustments
		modalExplanation.style.fontSize = '';
		modalExplanation.textContent = item.explanation || '';

		// Show modal (we'll size the image so text fits)
		modal.classList.add('show');
		modal.setAttribute('aria-hidden', 'false');

		// Compute sizing on the next frame
		requestAnimationFrame(() => {
			// measure text heights
			const titleH = modalTitle.scrollHeight;
			const dateH = modalDate.scrollHeight;
			let explH = modalExplanation.scrollHeight;

			// panel vertical padding from CSS: 18px top + 18px bottom = 36
			const panelPadding = 36;
			const extraBuffer = 28; // breathing room for close button / margins

			const viewportH = window.innerHeight;

			// If the combined text is taller than available space, reduce explanation font-size
			const spaceForText = viewportH - (panelPadding + extraBuffer);
			if (titleH + dateH + explH > spaceForText) {
				const allowedExpl = Math.max(24, spaceForText - titleH - dateH);
				const currFont = parseFloat(getComputedStyle(modalExplanation).fontSize) || 15;
				const scale = allowedExpl / Math.max(1, explH);
				const newFont = Math.max(12, currFont * scale);
				modalExplanation.style.fontSize = newFont + 'px';
				explH = modalExplanation.scrollHeight;
			}

			const availableForImage = Math.max(80, viewportH - (titleH + dateH + explH + panelPadding + extraBuffer));

			// If this is a video item, show iframe; otherwise show image.
			if (item.media_type === 'video') {
				// Hide any previous external link
				const prevExternal = document.getElementById('modal-external-link');
				if (prevExternal) prevExternal.remove();

				// compute embed url if possible (YouTube will return an embed URL; Vimeo returns null)
				const embed = makeEmbedUrl(item.url);

				if (embed && modalIframeEl) {
					// Show iframe embed for hosts we can safely embed (YouTube)
					modalImage.style.display = 'none';
					modalIframeEl.style.display = 'block';
					modalIframeEl.style.height = availableForImage + 'px';
					modalIframeEl.src = embed;
				} else {
					// Fallback: do NOT attempt to embed (common for Vimeo restricted videos)
					// Hide iframe and remove any previously created video
					if (modalIframeEl) { modalIframeEl.style.display = 'none'; modalIframeEl.src = ''; }
					if (modalVideoEl) {
						try { modalVideoEl.pause(); } catch(e){}
						modalVideoEl.remove();
						modalVideoEl = null;
					}
					// Show thumbnail in the modal panel (cover style)
					modalImage.style.display = 'block';
					modalImage.style.maxHeight = availableForImage + 'px';
					modalImage.style.objectFit = 'cover';
					modalImage.src = item.thumbnail_url || item.hdurl || item.url || '';
					modalImage.alt = item.title || 'Video thumbnail';

					// If the item.url is a direct video file (mp4/webm), create an inline <video> element
					if (item.url && /\.(mp4|webm|ogg)(\?|$)/i.test(item.url)) {
						modalVideoEl = document.createElement('video');
						modalVideoEl.controls = true;
						modalVideoEl.autoplay = true;
						modalVideoEl.playsInline = true;
						modalVideoEl.src = item.url;
						modalVideoEl.style.maxHeight = availableForImage + 'px';
						modalExplanation.insertAdjacentElement('afterend', modalVideoEl);
						// hide the static image when a video element is present
						modalImage.style.display = 'none';
					}

					// Create an external-open link so users can view the video on the host site (Vimeo or others)
					const ext = document.createElement('a');
					ext.id = 'modal-external-link';
					ext.href = item.url || '#';
					ext.target = '_blank';
					ext.rel = 'noopener noreferrer';
					ext.className = 'modal-external';
					ext.textContent = 'Open video on host site';
					// place the link right after the explanation (or after the created video)
					if (modalVideoEl) modalVideoEl.insertAdjacentElement('afterend', ext);
					else modalExplanation.insertAdjacentElement('afterend', ext);
				}
			} else {
				// Ensure iframe is hidden and image shown
				if (modalIframeEl) { modalIframeEl.style.display = 'none'; modalIframeEl.src = ''; }
				modalImage.style.display = 'block';
				modalImage.style.maxHeight = availableForImage + 'px';
				modalImage.style.objectFit = 'contain';
				modalImage.src = item.hdurl || item.url || item.thumbnail_url || '';
				modalImage.alt = item.title || 'NASA image';
			}

			// Add key listener for Escape and resize handler
			if (!modalListenersAdded) {
				document.addEventListener('keydown', onKeyDown);
				window.addEventListener('resize', onModalResize);
				modalListenersAdded = true;
			}
		});
	}

	// Helper: transform a video URL into an embeddable URL where possible.
	// Only allow explicit YouTube embeds here. Returning the original URL
	// for other hosts often results in a broken iframe due to X-Frame-Options
	// or provider restrictions (Vimeo is commonly restricted). Returning
	// null forces the modal fallback (thumbnail + external link), which is
	// safer UX than showing a broken player.
	function makeEmbedUrl(url) {
		if (!url) return null;
		try {
			const u = new URL(url);
			const host = u.hostname.toLowerCase();

			// YouTube watch links -> embed
			if (host.includes('youtube.com')) {
				const v = u.searchParams.get('v');
				if (v) return `https://www.youtube.com/embed/${v}?rel=0&modestbranding=1`;
				// if already /embed/ path, normalize and use a safe embed URL
				if (u.pathname.startsWith('/embed/')) {
					const parts = u.pathname.split('/');
					const id = parts[parts.length - 1];
					if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
				}
			}

			// youtu.be short links
			if (host === 'youtu.be') {
				const id = u.pathname.slice(1);
				if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
			}

			// Explicitly refuse to embed Vimeo and other providers to avoid
			// showing a broken player due to provider restrictions.
			return null;
		} catch (e) {
			return null;
		}
	}

	function closeModal() {
		modal.classList.remove('show');
		modal.setAttribute('aria-hidden', 'true');
		// Clear image src to stop downloads/playing
		modalImage.src = '';
		if (modalIframeEl) {
			modalIframeEl.src = '';
			modalIframeEl.style.display = 'none';
		}
		// remove any external-open link we may have added for restricted videos
		const prevExternal = document.getElementById('modal-external-link');
		if (prevExternal) prevExternal.remove();
		// ensure image is visible again next time
		modalImage.style.display = 'block';
		document.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('resize', onModalResize);
		modalListenersAdded = false;
		// restore any adjusted font-size
		modalExplanation.style.fontSize = '';
	}

	function onKeyDown(e) {
	 	if (e.key === 'Escape') closeModal();
	 	else if (e.key === 'ArrowLeft') prevModal();
	 	else if (e.key === 'ArrowRight') nextModal();
	}

	// Close when clicking backdrop or close button
	modalBackdrop.addEventListener('click', closeModal);
	modalCloseBtn.addEventListener('click', closeModal);
	// Wire prev/next buttons
	if (modalPrevBtn) modalPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevModal(); });
	if (modalNextBtn) modalNextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextModal(); });

	function onModalResize() {
		// Recompute available image height so text remains visible after resize
		if (!modal.classList.contains('show')) return;

		const titleH = modalTitle.scrollHeight;
		const dateH = modalDate.scrollHeight;
		let explH = modalExplanation.scrollHeight;
		const panelPadding = 36;
		const extraBuffer = 28;
		const viewportH = window.innerHeight;

		// Keep explanation visible by reducing font-size if needed
		const spaceForText = viewportH - (panelPadding + extraBuffer);
		if (titleH + dateH + explH > spaceForText) {
			const allowedExpl = Math.max(24, spaceForText - titleH - dateH);
			const currFont = parseFloat(getComputedStyle(modalExplanation).fontSize) || 15;
			const scale = allowedExpl / Math.max(1, explH);
			const newFont = Math.max(12, currFont * scale);
			modalExplanation.style.fontSize = newFont + 'px';
			explH = modalExplanation.scrollHeight;
		}
		const availableForImage = Math.max(80, viewportH - (titleH + dateH + explH + panelPadding + extraBuffer));
			modalImage.style.maxHeight = availableForImage + 'px';
			// if iframe is visible, adjust its height as well
			if (modalIframeEl && modalIframeEl.style.display === 'block') {
				modalIframeEl.style.height = availableForImage + 'px';
			}
	}

// Navigate modal items (top-level so keyboard/buttons can call them)
function openModalAt(idx) {
  if (!Array.isArray(currentItems) || currentItems.length === 0) return;
  if (idx < 0) idx = 0;
  if (idx >= currentItems.length) idx = currentItems.length - 1;
  currentIndex = idx;
  openModal(currentItems[currentIndex]);
}

function prevModal() {
  if (!Array.isArray(currentItems) || currentItems.length === 0) return;
  // wrap-around navigation
  currentIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
  openModal(currentItems[currentIndex]);
}

function nextModal() {
  if (!Array.isArray(currentItems) || currentItems.length === 0) return;
  currentIndex = (currentIndex + 1) % currentItems.length;
  openModal(currentItems[currentIndex]);
}
