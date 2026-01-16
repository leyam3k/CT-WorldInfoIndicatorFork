# CT-WorldInfoIndicatorFork

A SillyTavern/CozyTavern extension that provides visual awareness of activated World Info entries. This fork is customized with the indicator button positioned inside the chat input area.

## Features

- **Visual Badge**: Shows the count of currently activated World Info entries with animated badge updates
- **Entry Panel**: Click the indicator to view a detailed panel of all active entries
- **Entry Grouping**: Entries are grouped by World Info book name
- **Ordering Options**: View entries in insertion depth/order or alphabetically
- **Entry Types**: Distinguishes between:
  - 🔵 Constant entries
  - 🟢 Normal entries
  - 🔗 Vectorized entries
- **Sticky Indicator**: Shows remaining rounds for sticky entries (📌)
- **Message Context**: When ungrouped and ordered, shows message history context
- **Author's Note**: Displays Author's Note position in the entry list
- **CozyWI Exclusion**: Automatically excludes World Info books containing "CozyWI" in their name (system prompt dedicated books)

## Installation and Usage

### Installation

Use SillyTavern's built-in extension installer:

1. Open SillyTavern
2. Go to Extensions → Install Extension
3. Enter the repository URL
4. Click Install

### Usage

- The World Info indicator button (📕) appears in the left side of the chat input area
- Click the button to toggle the active entries panel
- Hover over entries to see their full content in a tooltip
- The badge shows the number of currently active World Info entries
- Badge animations indicate when entries are added, removed, or changed

### Slash Command

- `/wi-triggered` - Returns the list of World Info entries triggered on the last generation as JSON

## Prerequisites

- SillyTavern (latest release version recommended)
- CozyTavern fork for optimal positioning

## Configuration

The extension uses persistent settings stored in `extension_settings.worldInfoInfo`:

- `group`: Group entries by World Info book (default: true)
- `order`: Show in insertion depth/order instead of alphabetically (default: true)
- `mes`: Show message history context when ungrouped and ordered (default: true)

## Support and Contributions

For issues or feature requests, please open an issue on the GitHub repository.

Contributions are welcome! Please submit pull requests for any improvements.

## License

AGPLv3 - See LICENSE file for details.
