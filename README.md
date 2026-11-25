# WP Plugin Detector (Chrome extension)

Click the icon on any WordPress site and it lists the plugins that page loads, based on the `/wp-content/plugins/<name>/` paths in its scripts, styles and images.

I use it daily when a client sends a competitor's site and asks "can we have this?". It tells me in two seconds whether the feature is a known plugin or custom work.

## Features

- Scans every element on the current tab for asset URLs: scripts, stylesheets and images.
- Groups the hits by plugin slug and shows how many assets each plugin loads.
- Buttons to copy the plugin list or the raw asset URLs.

## How it works

- Manifest V3, with only the `activeTab` and `scripting` permissions. It reads nothing until you click Scan.
- `chrome.scripting.executeScript` injects one function into the page. The function collects asset URLs and matches them with a regex, and the popup renders the result.
- No build step, no libraries, no network requests.

## Limits

It only sees plugins that load files on the front end. Admin-only plugins, or sites that combine and rename assets (some cache plugins), won't show everything.

## Install

1. Download this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder.
