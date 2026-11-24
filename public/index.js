"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

function showErr(msg, code) {
	error.textContent = msg;
	errorCode.textContent = code || "";
}

// sur certain navigateur mobile y'a pas de SharedWorker et bare-mux plante sans rien dire
window.addEventListener("error", (e) => showErr("Erreur", String(e.message)));
window.addEventListener("unhandledrejection", (e) =>
	showErr("Erreur", String(e.reason))
);

const wispUrl =
	(location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";

// on prepare le sw + le transport une seule fois au chargement de la page
// avant je le remettais a chaque recherche et ça cassait les requetes en cours (no bare clients)
let ready = null;
function prepare() {
	if (!ready) {
		ready = (async () => {
			await registerSW();
			await navigator.serviceWorker.ready;
			await connection.setTransport("/libcurl/index.mjs", [
				{ websocket: wispUrl },
			]);
		})();
		ready.catch(() => (ready = null));
	}
	return ready;
}
if (typeof SharedWorker !== "undefined") prepare();

async function go() {
	showErr("");
	if (!address.value.trim()) return;

	if (typeof SharedWorker === "undefined") {
		showErr(
			"Navigateur pas compatible (pas de SharedWorker).",
			"mets a jour chrome ou prend firefox / safari"
		);
		return;
	}

	try {
		await prepare();
	} catch (err) {
		showErr("Impossible de lancer le proxy.", err.toString());
		return;
	}

	const url = search(address.value, searchEngine.value);

	let frame = document.getElementById("sj-frame");
	if (frame) frame.remove();
	const f = scramjet.createFrame();
	f.frame.id = "sj-frame";
	document.body.appendChild(f.frame);
	f.go(url);
}

form.addEventListener("submit", (event) => {
	event.preventDefault();
	go();
});

document.getElementById("sj-go").addEventListener("click", (e) => {
	e.preventDefault();
	go();
});
