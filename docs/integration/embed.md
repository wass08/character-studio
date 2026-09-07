# Embed Character Studio

Embed the Character Studio creator when visitors should design a character inside your site and return an animation-ready GLB to your app, game, or viewer. Visitors work as guests, with no login inside the iframe. The host receives the finished model through the `cs.v1` postMessage contract.

Try the [live interactive demo](https://characterstudio.wawasensei.dev/embed-demo.html). Its single-file source is [`public/embed-demo.html`](../../public/embed-demo.html). For local development, serve `/embed-demo.html` from the app; it defaults to the current origin. To target another studio deployment, add `?studio=` followed by its URL-encoded origin.

## Add the iframe and message listener

Use `https://characterstudio.wawasensei.dev/embed?origin=<url-encoded host origin>&gender=man|woman`. Set `origin` to the host page's `window.location.origin`, including its scheme and port when present. `gender` is optional; omit it or choose `man` or `woman`.

```html
<iframe
  id="character-studio"
  title="Character Studio creator"
  allow="clipboard-write"
  loading="eager"
  style="width: 100%; min-height: 640px; aspect-ratio: 16 / 10; border: 0"
></iframe>
<script>
  const studioOrigin = "https://characterstudio.wawasensei.dev";
  const iframe = document.getElementById("character-studio");

  // Register before navigating the iframe so the ready event is not missed.
  window.addEventListener("message", async (event) => {
    // Required: never trust a message without checking the sender's origin.
    if (event.origin !== "https://characterstudio.wawasensei.dev") return;
    if (event.source !== iframe.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;

    switch (data.type) {
      case "cs.v1.ready":
        console.log("Creator ready", data.version);
        break;
      case "cs.v1.character.exported":
        try {
          const response = await fetch(data.manifestUrl);
          if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
          const manifest = await response.json();
          // Persist data.glbUrl for a pinned model. Load manifest.urls.model
          // and manifest.urls.animations using the GLB guide linked below.
          console.log("Exported character", data, manifest);
        } catch (error) {
          console.error("Could not load the character manifest", error);
        }
        break;
      case "cs.v1.error":
        console.error(data.code, data.message);
        break;
    }
  });

  const params = new URLSearchParams({ origin: window.location.origin });
  // Optional: params.set("gender", "woman"); // "man" or "woman"
  iframe.src = `${studioOrigin}/embed?${params}`;
</script>
```

Hosts MUST verify `event.origin === "https://characterstudio.wawasensei.dev"` before trusting a message. The example enforces this by returning on inequality, then also checks the iframe window. The iframe posts to `window.parent`, targeting the `origin` query parameter, or `"*"` if absent. Always supply the exact host origin; the wildcard fallback does not replace the host's required sender-origin check.

## Events (cs.v1)

These are the exact contract shapes in JavaScript object notation. Unquoted field names such as `characterId` below stand for the corresponding returned values; the objects are delivered as `event.data`, not JSON strings. There are exactly three event types.

### Ready

```js
{ type: "cs.v1.ready", version: "1" }
```

Fires once the creator has booted.

### Character exported

```js
{ type: "cs.v1.character.exported", characterId, bakeId, name, gender, glbUrl, characterUrl, animationsUrl, manifestUrl }
```

Fires when the visitor clicks Done and the server bake is ready. `characterId` identifies the guest character, `bakeId` identifies its immutable bake, `name` is the character name, and `gender` is `man` or `woman`.

| Field | Returned URL | Host usage |
| --- | --- | --- |
| `glbUrl` | `https://characterstudio.wawasensei.dev/api/models/b/{bakeId}.glb` | Immutable pinned model; persist this for reproducible builds. |
| `characterUrl` | `https://characterstudio.wawasensei.dev/api/models/c/{characterId}.glb` | Mutable model following the character's latest bake; do not cache. |
| `animationsUrl` | `https://characterstudio.wawasensei.dev/api/models/animations/{gender}.glb` | Shared animation library for this body type. |
| `manifestUrl` | `https://characterstudio.wawasensei.dev/api/models/b/{bakeId}.json` | Fetch first to discover model, animations, rig, and other metadata. |

### Error

```js
{ type: "cs.v1.error", code, message }
```

Fires when an embed operation fails. `code` is one of `"save_failed" | "bake_timeout" | "rate_limited"`; `message` describes the error. These codes report a failed save, a bake that did not finish in time, or rate limiting, respectively. Show the error to the visitor and avoid rapid automatic retries.

## Load the delivered character

The complete asset integration contract is at [llms.txt](https://characterstudio.wawasensei.dev/llms.txt) and in [`docs/integration/character-studio-glb.md`](character-studio-glb.md). Use that guide for rendering details:

- [What you get](character-studio-glb.md#1-what-you-get) and [manifest reference](character-studio-glb.md#11-manifest-reference-character-studiomanifestv1): fetch `manifestUrl` first. Use `urls.model`, `urls.animations`, `animations.clips[]`, and `rig.sockets`. Model URLs redirect to CDN objects; loaders must follow redirects. The asset routes support CORS.
- [three.js quick start](character-studio-glb.md#3-quick-start-threejs) and [React Three Fiber quick start](character-studio-glb.md#4-quick-start-react-three-fiber--drei): default models need Meshopt decoding. Clone skinned instances with `SkeletonUtils.clone()` and use one animation mixer per instance.
- [Rig contract](character-studio-glb.md#5-rig-contract) and [animations](character-studio-glb.md#6-animations): the character faces negative Z, uses metres and Y-up, and already contains its height scale. Move a parent group instead of the `Rig` node. Strip every `.scale` animation track before playback; start with `Rig|Idle_Loop`. Read socket names and clip metadata from the manifest.
- [Variants](character-studio-glb.md#2-variants-query-parameters) and [several characters](character-studio-glb.md#8-several-characters-at-once-teams-crowds): choose model quality and morphs for your use case, and share the animation library across characters of the same gender.

## Guest ownership and retention

The visitor creates a guest character without signing in inside the iframe. Its **Save to Character Studio** button opens `https://characterstudio.wawasensei.dev/claim?code=…` in a new tab. The code is single-use with an approximately 15-minute TTL. In that tab, the visitor signs in with an email OTP and the character attaches to their account. The host does not handle credentials or implement the claim UI, and no additional claim event is part of `cs.v1`.

Unclaimed guest characters are deleted after 30 days. Any bake already delivered to a host keeps its immutable URL forever. Store `glbUrl` when you need durable access; the mutable character URL depends on the character record continuing to exist.

## Sizing, performance, and limits

The creator uses a WebGPU canvas. Give the iframe at least 640px of height and use only one iframe per page to limit GPU and memory usage. A responsive width with a 16:10 aspect ratio works well; on narrow screens, retain the minimum height. The demo's separate host preview uses three.js WebGL.

Rate limits are approximately **10 guest character creations per minute per IP** and **60 other embed API calls per minute per IP**. Shared networks share the IP budget. HTTP 429 indicates rate limiting; wait before retrying.

## Troubleshooting

- **No events received:** usually the `origin` parameter is wrong or missing, or the host's CSP or browser settings block third-party iframes. Pass the exact `window.location.origin`, register the listener before setting the iframe URL, and ensure the host's `frame-src` policy allows `https://characterstudio.wawasensei.dev`.
- **HTTP 429 or `rate_limited`:** the per-IP budget was exceeded. Pause requests before retrying.
- **Preview fails after export:** catch manifest and model fetch errors and show a visible error. Check the browser's network console and host `connect-src` policy, including redirected CDN destinations. See the GLB guide's [gotchas](character-studio-glb.md#10-gotchas) for decoder, scale, and rig issues.
