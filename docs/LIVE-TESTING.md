# Live-host verification

Use a disposable Pagelove host for these checks. Never put its API key in a
command committed to the repository, a screenshot, or a test fixture.

## 1. Deploy a clean bundle

```text
python scripts/prepare-deploy.py --host your-host.onpagelove.com
```

Upload the contents of `.deploy/` to the matching paths on the test host.

## 2. Run the non-destructive checks

```text
python scripts/check-live.py --host your-host.onpagelove.com
```

The command verifies that the gallery, five demos, favicon, and Open Graph
image return `200`. It also verifies that an anonymous request to the
accountability feed returns `401`.

## 3. Verify write behavior in the browser

Use unique names for each run so existing seeded data cannot affect the
result. Record the HTTP status from the browser network panel.

1. Event: submit one RSVP, then repeat the same member and event. The first
   request should succeed and the duplicate should return `422`.
2. Show and tell: publish a project, react once, and repeat the same reaction
   as the same member. The duplicate should return `422`.
3. Resource exchange: claim an open listing, then attempt a second claim as a
   different member. The second claim should return `422`. Release the first
   claim after testing.
4. Accountability: submit one check-in and repeat it as the same member on the
   same UTC date. The duplicate should return `422`. Confirm the feed remains
   `401` in a private browser window and is readable when signed in.
5. Professional: publish a topic, reply, and share an `https://` resource.
   Confirm a `javascript:` resource URL is rejected before any request occurs.

## 4. Clean up

Delete records created by the test through the demo UI where supported. If a
flow has no delete control, restore the disposable host from the same prepared
bundle before using it for another verification run.
