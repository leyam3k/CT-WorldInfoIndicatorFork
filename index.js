import {
  chat,
  chat_metadata,
  event_types,
  eventSource,
  main_api,
} from "../../../../script.js";
import { metadata_keys } from "../../../authors-note.js";
import { extension_settings } from "../../../extensions.js";
import { promptManager } from "../../../openai.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { delay } from "../../../utils.js";
import { world_info_position } from "../../../world-info.js";

const strategy = {
  constant: "🔵",
  normal: "🟢",
  vectorized: "🔗",
};
const getStrategy = (entry) => {
  if (entry.constant === true) {
    return "constant";
  } else if (entry.vectorized === true) {
    return "vectorized";
  } else {
    return "normal";
  }
};

let generationType;
eventSource.on(
  event_types.GENERATION_STARTED,
  (genType) => (generationType = genType)
);

const init = () => {
  const leftSendForm = document.getElementById("leftSendForm");
  if (!leftSendForm) {
    console.error(
      "[CT-WorldInfoIndicatorFork] Could not find #leftSendForm element"
    );
    return;
  }

  const trigger = document.createElement("div");
  {
    trigger.id = "stwii--trigger";
    trigger.classList.add("stwii--trigger");
    trigger.classList.add("fa-solid", "fa-fw", "fa-book-atlas");
    trigger.classList.add("interactable");
    trigger.tabIndex = 0;
    trigger.title = "Active World Info Entries";
    trigger.addEventListener("click", () => {
      panel.classList.toggle("stwii--isActive");
    });
    leftSendForm.append(trigger);
  }
  const panel = document.createElement("div");
  {
    panel.id = "stwii--panel";
    panel.classList.add("stwii--panel");
    panel.innerHTML = "?";
    document.body.append(panel);
  }

  let entries = [];

  let count = -1;
  const updateBadge = async (newEntries) => {
    if (count != newEntries.length) {
      if (newEntries.length == 0) {
        trigger.classList.add("stwii--badge-out");
        await delay(510);
        trigger.setAttribute(
          "data-stwii--badge-count",
          newEntries.length.toString()
        );
        trigger.classList.remove("stwii--badge-out");
      } else if (count == 0) {
        trigger.classList.add("stwii--badge-in");
        trigger.setAttribute(
          "data-stwii--badge-count",
          newEntries.length.toString()
        );
        await delay(510);
        trigger.classList.remove("stwii--badge-in");
      } else {
        trigger.setAttribute(
          "data-stwii--badge-count",
          newEntries.length.toString()
        );
        trigger.classList.add("stwii--badge-bounce");
        await delay(1010);
        trigger.classList.remove("stwii--badge-bounce");
      }
      count = newEntries.length;
    } else if (new Set(newEntries).difference(new Set(entries)).size > 0) {
      trigger.classList.add("stwii--badge-bounce");
      await delay(1010);
      trigger.classList.remove("stwii--badge-bounce");
    }
    entries = newEntries;
  };
  let currentEntryList = [];
  let currentChat = [];
  eventSource.on(event_types.WORLD_INFO_ACTIVATED, async (entryList) => {
    // Filter out entries from World Info books containing 'CozyWI' in their name
    entryList = entryList.filter((entry) => !entry.world.includes("CozyWI"));

    panel.innerHTML = "Updating...";
    updateBadge(entryList.map((it) => `${it.world}§§§${it.uid}`));
    for (const entry of entryList) {
      entry.type = "wi";
      entry.sticky = parseInt(
        /**@type {string}*/ (
          await SlashCommandParser.commands["wi-get-timed-effect"].callback(
            {
              effect: "sticky",
              format: "number",
              file: `${entry.world}`,
              _scope: null,
              _abortController: null,
            },
            entry.uid
          )
        )
      );
    }
    currentEntryList = [...entryList];
    updatePanel(entryList, true);
  });

  const updatePanel = (entryList, newChat = false) => {
    const isGrouped = extension_settings.worldInfoInfo?.group ?? true;
    const isOrdered = extension_settings.worldInfoInfo?.order ?? true;
    const isMes = extension_settings.worldInfoInfo?.mes ?? true;
    panel.innerHTML = "";
    let grouped;
    if (isGrouped) {
      grouped = Object.groupBy(entryList, (it, idx) => it.world);
    } else {
      grouped = {
        "WI Entries": [...entryList],
      };
    }
    const depthPos = [
      world_info_position.ANBottom,
      world_info_position.ANTop,
      world_info_position.atDepth,
    ];
    for (const [world, entries] of Object.entries(grouped)) {
      for (const e of entries) {
        e.depth =
          e.position == world_info_position.atDepth
            ? e.depth
            : chat_metadata[metadata_keys.depth] +
              (e.position == world_info_position.ANTop ? 0.1 : 0);
      }
      const w = document.createElement("div");
      {
        w.classList.add("stwii--world");
        w.textContent = world;
        panel.append(w);
        entries.sort((a, b) => {
          if (isOrdered) {
            // order by strategy / depth / order
            if (
              !depthPos.includes(a.position) &&
              !depthPos.includes(b.position)
            )
              return a.position - b.position;
            if (depthPos.includes(a.position) && !depthPos.includes(b.position))
              return 1;
            if (!depthPos.includes(a.position) && depthPos.includes(b.position))
              return -1;
            if (
              (a.depth ?? Number.MAX_SAFE_INTEGER) <
              (b.depth ?? Number.MAX_SAFE_INTEGER)
            )
              return 1;
            if (
              (a.depth ?? Number.MAX_SAFE_INTEGER) >
              (b.depth ?? Number.MAX_SAFE_INTEGER)
            )
              return -1;
            if (
              (a.order ?? Number.MAX_SAFE_INTEGER) >
              (b.order ?? Number.MAX_SAFE_INTEGER)
            )
              return 1;
            if (
              (a.order ?? Number.MAX_SAFE_INTEGER) <
              (b.order ?? Number.MAX_SAFE_INTEGER)
            )
              return -1;
            return (a.comment ?? a.key.join(", "))
              .toLowerCase()
              .localeCompare((b.comment ?? b.key.join(", ")).toLowerCase());
          } else {
            // order alphabetically
            return (a.comment?.length ? a.comment : a.key.join(", "))
              .toLowerCase()
              .localeCompare(b.comment?.length ? b.comment : b.key.join(", "));
          }
        });
        if (!isGrouped && isOrdered && isMes) {
          const an = chat_metadata[metadata_keys.prompt];
          const ad = chat_metadata[metadata_keys.depth];
          if (an?.length) {
            const idx = entries.findIndex(
              (e) => depthPos.includes(e.position) && e.depth <= ad
            );
            entries.splice(idx, 0, {
              type: "note",
              position: world_info_position.ANBottom,
              depth: ad,
              text: an,
            });
          }
          if (newChat) {
            currentChat = [...chat];
            if (generationType == "swipe") currentChat.pop();
          }
          const segmenter = new Intl.Segmenter("en", {
            granularity: "sentence",
          });
          let currentDepth = currentChat.length - 1;
          let isDumped = false;
          for (let i = entries.length - 1; i >= -1; i--) {
            if (i < 0 && currentDepth < 0) continue;
            if (isDumped) continue;
            if (
              (i < 0 && currentDepth >= 0) ||
              !depthPos.includes(entries[i].position)
            ) {
              // anything not @D is considered as "before chat"
              isDumped = true;
              const depth = -1;
              const mesList = currentChat.slice(depth + 1, currentDepth + 1);
              const text = mesList
                .map((it) => it.mes)
                .map((it) =>
                  it
                    .replace(/```.+```/gs, "")
                    .replace(/<[^>]+?>/g, "")
                    .trim()
                )
                .filter((it) => it.length)
                .join("\n");
              const sentences = [...segmenter.segment(text)].map((it) =>
                it.segment.trim()
              );
              entries.splice(i + 1, 0, {
                type: "mes",
                count: mesList.length,
                from: depth + 1,
                to: currentDepth,
                first: sentences.at(0),
                last: sentences.length > 1 ? sentences.at(-1) : null,
              });
              currentDepth = -1;
              continue;
            }
            let depth = Math.max(-1, currentChat.length - entries[i].depth - 1);
            if (depth >= currentDepth) continue;
            depth = Math.ceil(depth);
            if (depth == currentDepth) continue;
            const mesList = currentChat.slice(depth + 1, currentDepth + 1);
            const text = mesList
              .map((it) => it.mes)
              .map((it) =>
                it
                  .replace(/```.+```/gs, "")
                  .replace(/<[^>]+?>/g, "")
                  .trim()
              )
              .filter((it) => it.length)
              .join("\n");
            const sentences = [...segmenter.segment(text)].map((it) =>
              it.segment.trim()
            );
            entries.splice(i + 1, 0, {
              type: "mes",
              count: mesList.length,
              from: depth + 1,
              to: currentDepth,
              first: sentences.at(0),
              last: sentences.length > 1 ? sentences.at(-1) : null,
            });
            currentDepth = depth;
          }
        }
        for (const entry of entries) {
          const e = document.createElement("div");
          {
            e.classList.add("stwii--entry");
            const wipChar = [
              world_info_position.before,
              world_info_position.after,
            ];
            const wipEx = [
              world_info_position.EMTop,
              world_info_position.EMBottom,
            ];
            // not needed after all?
            if (false && [...wipChar, ...wipEx].includes(entry.position)) {
              if (main_api == "openai") {
                const pm = promptManager.getPromptCollection().collection;
                if (
                  wipChar.includes(entry.position) &&
                  !pm.find((it) => it.identifier == "charDescription")
                ) {
                  e.classList.add("stwii--isBroken");
                  e.title =
                    "⚠️ Not sent because position anchor is missing (Char Description)!\n";
                } else if (
                  wipEx.includes(entry.position) &&
                  !pm.find((it) => it.identifier == "dialogueExamples")
                ) {
                  e.classList.add("stwii--isBroken");
                  e.title =
                    "⚠️ Not sent because position anchor is missing (Example Messages)!\n";
                }
              }
            } else {
              e.title = "";
            }
            if (entry.type == "mes") e.classList.add("stwii--messages");
            if (entry.type == "note") e.classList.add("stwii--note");
            const strat = document.createElement("div");
            {
              strat.classList.add("stwii--strategy");
              if (entry.type == "wi") {
                strat.textContent = strategy[getStrategy(entry)];
              } else if (entry.type == "mes") {
                strat.classList.add("fa-solid", "fa-fw", "fa-comments");
                strat.setAttribute("data-stwii--count", entry.count.toString());
              } else if (entry.type == "note") {
                strat.classList.add("fa-solid", "fa-fw", "fa-note-sticky");
              }
              e.append(strat);
            }
            const title = document.createElement("div");
            {
              title.classList.add("stwii--title");
              if (entry.type == "wi") {
                title.textContent = entry.comment?.length
                  ? entry.comment
                  : entry.key.join(", ");
                e.title += `[${entry.world}] ${
                  entry.comment?.length ? entry.comment : entry.key.join(", ")
                }\n---\n${entry.content}`;
              } else if (entry.type == "mes") {
                const first = document.createElement("div");
                {
                  first.classList.add("stwii--first");
                  first.textContent = entry.first;
                  title.append(first);
                }
                if (entry.last) {
                  e.title = `Messages #${entry.from}-${entry.to}\n---\n${entry.first}\n...\n${entry.last}`;
                  const sep = document.createElement("div");
                  {
                    sep.classList.add("stwii--sep");
                    sep.textContent = "...";
                    title.append(sep);
                  }
                  const last = document.createElement("div");
                  {
                    last.classList.add("stwii--last");
                    last.textContent = entry.last;
                    title.append(last);
                  }
                } else {
                  e.title = `Message #${entry.from}\n---\n${entry.first}`;
                }
              } else if (entry.type == "note") {
                title.textContent = "Author's Note";
                e.title = `Author's Note\n---\n${entry.text}`;
              }
              e.append(title);
            }
            const sticky = document.createElement("div");
            {
              sticky.classList.add("stwii--sticky");
              sticky.textContent = entry.sticky ? `📌 ${entry.sticky}` : "";
              sticky.title = `Sticky for ${entry.sticky} more rounds`;
              e.append(sticky);
            }
            panel.append(e);
          }
        }
      }
    }
  };

  //! HACK: no event when no entries are activated, only a debug message
  const original_debug = console.debug;
  console.debug = function (...args) {
    const triggers = [
      "[WI] Found 0 world lore entries. Sorted by strategy",
      "[WI] Adding 0 entries to prompt",
    ];
    if (triggers.includes(args[0])) {
      panel.innerHTML = "No active entries";
      updateBadge([]);
      currentEntryList = [];
    }
    return original_debug.bind(console)(...args);
  };
  const original_log = console.log;
  console.log = function (...args) {
    const triggers = [
      "[WI] Found 0 world lore entries. Sorted by strategy",
      "[WI] Adding 0 entries to prompt",
    ];
    if (triggers.includes(args[0])) {
      panel.innerHTML = "No active entries";
      updateBadge([]);
      currentEntryList = [];
    }
    return original_log.bind(console)(...args);
  };

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: "wi-triggered",
      callback: (args, value) => {
        return JSON.stringify(currentEntryList);
      },
      returns: "list of triggered WI entries",
      helpString:
        "Get the list of World Info entries triggered on the last generation.",
    })
  );
};
init();
