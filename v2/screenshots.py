"""Docshots scenarios for docs/USER_GUIDE.html.

Run `npm run build && npm run preview -- --host 127.0.0.1` from v2 first,
then `python /Users/antonyjoyce/git-repos/docshots/docshots.py` from v2.
"""

config = {
    "base_url": "http://127.0.0.1:4173",
    "output_dir": "docs/screenshots/user-guide",
    "viewport": [1600, 900],
    "default_wait": ".transport-bar",
}

open_motion = [
    {"click": ".toolbar-actions button:has-text('Templates')"},
    {"click": ".template-card:has-text('Tony T · September Mix Motion')"},
    {"wait": 350},
]

seek_five_seconds = {
    "js": "(() => { const input = document.querySelector('.transport-scrubber'); input.value = '5000'; input.dispatchEvent(new Event('input', { bubbles: true })); })()"
}

scenarios = [
    {
        "name": "01-editor-overview",
        "caption": "The editor with the Tony T September Mix Motion project",
        "actions": open_motion + [seek_five_seconds],
    },
    {
        "name": "02-template-library",
        "caption": "Built-in templates, including Tony T motion templates",
        "actions": [{"click": ".toolbar-actions button:has-text('Templates')"}],
    },
    {
        "name": "03-layer-properties",
        "caption": "Select a text layer to edit timing, transform, text and style",
        "actions": open_motion + [
            {"click": ".layer-item:has-text('Headline')"},
            seek_five_seconds,
        ],
    },
    {
        "name": "04-timeline-events",
        "caption": "Layer tracks and clickable animation events",
        "actions": open_motion + [
            {"click": ".layer-item:has-text('Headline')"},
            {"js": "(() => { const input = document.querySelector('.transport-scrubber'); input.value = '1000'; input.dispatchEvent(new Event('input', { bubbles: true })); })()"},
        ],
    },
    {
        "name": "05-background-crop",
        "caption": "Choose a photo and frame the crop to match the video aspect ratio",
        "actions": open_motion + [
            {"click": "button.rollup-header:has-text('Project')"},
            {"click": ".settings-photo-action button"},
            {"wait": ".bg-photo-preview"},
        ],
    },
    {
        "name": "06-audio-controls",
        "caption": "Audio import and duration options",
        "actions": open_motion + [
            {"click": "button.rollup-header:has-text('Audio')"},
            {"wait": ".audio-panel"},
        ],
    },
    {
        "name": "07-group-animation",
        "caption": "Group spectrum layers and configure a staggered slide entrance",
        "actions": open_motion + [
            {"check": ".layer-item:has-text('Spectrum 1') .layer-multi-check"},
            {"check": ".layer-item:has-text('Spectrum 2') .layer-multi-check"},
            {"click": ".layer-selection-toolbar button"},
            {"select": "select[aria-label='Group slide direction']", "value": "left"},
            {"js": "(() => { const input = document.querySelector('.transport-scrubber'); input.value = '1100'; input.dispatchEvent(new Event('input', { bubbles: true })); const group = [...document.querySelectorAll('.layer-item')].find(item => item.textContent.includes('New group')); group?.scrollIntoView({ block: 'center' }); document.querySelector('.inspector-scroll').scrollTop = 250; })()"},
            {"wait": 200},
        ],
    },
    {
        "name": "08-save-for-reuse",
        "caption": "Save the current project as a post or reusable template",
        "actions": open_motion + [seek_five_seconds, {"click": ".toolbar-actions button:has-text('Save / Save As')"}],
    },
    {
        "name": "09-posts-and-json",
        "caption": "View post thumbnails and edit the associated JSON",
        "actions": [{"click": ".toolbar-actions button:has-text('Posts')"}],
    },
    {
        "name": "10-export-video",
        "caption": "Choose an export preset before rendering",
        "actions": open_motion + [seek_five_seconds, {"click": ".toolbar-actions button:has-text('Export MP4')"}],
    },
    {
        "name": "11-design-library",
        "caption": "Browse and save design configurations",
        "actions": [{"click": ".toolbar-actions button:has-text('Designs')"}],
    },
]
