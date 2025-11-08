# ComfyUI-PromptSwitch Dramatically Speeds Up Prompt Work!
A custom node that allows intuitive ON/OFF switching and weight adjustment of prompts, just like a checklist.
---
Welcome to **PromptSwitch**, published on GitHub!  
This is a version based on the **Prompt Palette** concept, with dramatically improved **prompt management and usability**.

Japanese README is here:  
https://github.com/Boba-svg/ComfyUI-PromptSwitch/blob/main/README_jp.md

To distinguish the origin of features, we use the following notations:  
* **[Original]**: Core features inherited from Prompt Palette  
* **[Switch]**: Features added or improved in PromptSwitch

---
## Main Features
Note: The images may be outdated. **Refer to the latest shortcuts below** (e.g., R key → random, W key → reset, C key → /C toggle)

![Feature Explanation](images/setsumei.png)  
![Sample](images/sample.png)

Each prompt line can be operated independently and is highly customizable.

### 1. Interactive Prompt Management
In non-edit mode, each line is displayed like a checklist.

* **[Original]** ON/OFF per line  
  Click a line to enable/disable (adds `//`)
* **[Original]** Weight adjustment  
  Use `+` / `-` buttons on the right to adjust in `CONFIG.WEIGHT_STEP` (default `0.10`) increments
* **[Original]** Operable in edit mode  
  Edit and run repeatedly
* **[Switch]** Separator line on empty lines  
  Displays a thin light blue line (`#ADD8E6`) on empty lines
* **[Switch]** Comment separator `//,//`  
  `//,// comment` → Displayed in light blue text (`#ADD8E6`)  
  `//,//` → Gray line (`#888`) as divider
* **[Switch]** Display improvements
  - Long lines are automatically truncated (max 30 chars + `...`)
  - Comment lines (starting with `//`) hide `//`, use 80% font size, color `#ADD8E6`

### 2. Mode Switching
* **Edit Mode**  
  `F2` or `E` key, or double-click the node frame
* **[Switch]** Compact Mode  
  `V` key: Hide disabled lines (minimize height)  
  `Shift+V`: Toggle all nodes at once (`/v` excluded)

---

## Shortcut Keys (Latest)

| Key         | Function                        | Description |
|-------------|---------------------------------|-------------|
| `F1`        | Show Help                       | Displays shortcuts and tag info |
| `F2` / `E`  | Toggle Edit Mode                | Switch between normal ↔ edit mode |
| `Shift+E`   | **Toggle All Nodes Edit Mode**  | Maintains nodes already in edit; **completely prevents text input** |
| `A`         | Bulk ON/OFF                     | Toggles all lines in selected node |
| `Shift+A`   | Force Deactivate All Nodes      | Comments out all nodes (`/a` excluded) |
| `V`         | Toggle Compact Mode             | Hides disabled lines in selected node |
| `Shift+V`   | Toggle All Nodes Display        | Switches all nodes to compact/normal (`/v` excluded) |
| `W`         | Reset All Weights               | Resets all weights in selected node to `1.0` |
| `R`         | Random Pickup                   | Randomly selects from sections divided by empty lines (`/R` tag supported) |
| `Shift+R`   | Randomize All Nodes             | Applies random pickup to all nodes (`/r` excluded) |
| `C`         | **Toggle /C Tag**               | Adds/removes `/C` from title |
| `Shift+C`   | **Remove /C from All Nodes**    | Bulk removes `/C` from all nodes |

---

## Ultimate New Feature: `/C` Tag (Auto-Randomize on Every Generate)

> **"Prompts change randomly every time you press Generate"**  
> **This is the greatest strength of PromptSwitch.**

### How to Use (Just 2 Steps)
1. **Add `/R[number] /C` to the node title**  
   (Press `C` key to toggle `/C`)  
   (Example: `facial expression /R0-3 /C`)
2. **Press "Generate"**  
   → **0 to 3 elements are randomly selected each time, and the image is generated**

**No need to press R key at all!**

### Strengths of `/C` Tag

| Traditional Method       | With `/C` Tag                     |
|--------------------------|-----------------------------------|
| Manually press `R` each time | **Auto-update with 1 Generate**   |
| Same prompt repeats       | **Different composition every time** |
| Trial-and-error is tedious| **Reach desired image fastest**   |

### Full Control of Randomness with `/R` Tag

- **`/R1`** → Always select **exactly 1**  
- **`/R1-3`** → Random between **1 to 3**  
- **`/R-5`** → Up to **5** randomly  

→ **Narrow down to desired style,**  
　　**and test variations with just one Generate!**

---

## Tag Rules (`/C` + `/R` Required)

Add tags to the end of the node title.  
**Spaces, tabs, and line breaks are ignored**. **Compound tags (e.g., `/R2a`) are invalid → warning displayed**.

| Tag         | Meaning |
|-------------|---------|
| `/a`        | Exclude from `Shift+A` |
| `/v`        | Exclude from `Shift+V` |
| `/r`        | Exclude from `Shift+R` |
| `/R[n]`     | Select **exactly n** from section |
| `/R[n]-[m]` | Random between **n to m** |
| `/R-[m]`    | **1 to m** |
| **`/C`**    | **Auto-randomize on every Generate** |

> **Example: `pose /R2 /C`**  
> → Always selects **2 poses** automatically, reflected immediately on Generate

---

## Customization Settings (`web/index.js` → `CONFIG`)

| Variable                    | Default   | Description |
|-----------------------------|-----------|-------------|
| `WEIGHT_STEP`               | `0.10`    | Weight adjustment step |
| `minWeight`                 | `-1.0`    | Minimum weight |
| `maxWeight`                 | `2.0`     | Maximum weight |
| `COMMENT_FONT_SCALE`        | `0.8`     | Comment font size ratio |
| `PROMPT_MAX_LENGTH_DISPLAY` | `30`      | Max display chars (truncated with `...`) |
| `COLOR_PROMPT_ON`           | `"#FFF"`  | Active prompt color |
| `COLOR_COMMENT_ON`          | `"#ADD8E6"`| Active comment color |
| `COLOR_PROMPT_OFF`          | `"#AAAAAA"`| Inactive prompt color |
| `COLOR_COMMENT_OFF`         | `"#AAAAAA"`| Inactive comment color |
| `CommentLine_LineColor`     | `"#888"`  | Separator line color (`//,//`) |
| `CommentLine_FontColor`     | `"#ADD8E6"`| Separator comment color |

---

## Installation and Update

### 1. Via ComfyUI Manager (Recommended)
1. Open Manager  
2. Click "Install Custom Nodes"  
3. Search for `PromptSwitch`  
4. Install **ComfyUI-PromptSwitch**  
5. Restart ComfyUI

### 2. Manual Installation
1. Navigate to the folder:  
   `/path/to/ComfyUI/custom_nodes`
2. Run command:  
   `git clone https://github.com/Boba-svg/ComfyUI-PromptSwitch.git`

### 3. Update
1. Navigate to:  
   `/path/to/ComfyUI/custom_nodes/ComfyUI-PromptSwitch`
2. Run command:  
   `git pull`

---

## How to Use

1. Add **PromptSwitch** from node search (`utils` category)  
2. Set title to **`/R[number] /C`**  
3. Press **"Generate" → Generate images with different prompts every time!**

---

## Update History

| Date       | Content |
|------------|---------|
| 25/10/16   | Initial release |
| 25/10/17   | Added exclusion tags (`/a`, `/v`) |
| 25/10/20   | Unified weight operations |
| 25/10/30   | `R` key → random, `W` key → reset |
| 25/10/30   | `/R[number]` expansion |
| 25/11/05   | Unified tag parsing (compound tags prohibited) |
| **25/11/07** | **Definitive Update** |
|            | - **`/C` tag: Auto-randomize on every Generate** |
|            | - `C` key: Toggle `/C` |
|            | - `Shift+C`: Remove `/C` from all nodes |
|            | - `Shift+E`: Toggle all edit modes (**input fully prevented**) |
|            | - Fixed edit mode bugs |
| **25/11/08** | Fully fixed `/C` behavior (executes only once before generation) |
| **25/11/09** | Implemented comment separator `//,//` |

---

## Upcoming Features

1. Remove line breaks from empty lines  
2. Mode to avoid adding final newline  
3. Fix random bugs with multiple tags  

---

## Credits

This node is a fork and extension of **kambara's ComfyUI-PromptPalette**.

---

## License

MIT License  
See [LICENSE](LICENSE) file for details
