# ComfyUI-PromptSwitch: Dramatically Speed Up Your Prompt Workflow!
Prompts ON/OFF switching and weight adjustment can be done intuitively like a checklist with this custom node.
---
Welcome to **"PromptSwitch,"** published on GitHub!

This is a version that **dramatically improves prompt management and usability**, based on the ideas of **Prompt Palette**.

To distinguish the origin of the features, we use the following notation:
* **[Original]**: Basic features inherited from Prompt Palette
* **[Switch]**: Features added or improved in PromptSwitch
---
## Key Features
\*Images might be outdated.

**Please refer to the list below for the latest shortcuts** (R key → Random, W key → Reset, C key → /C Toggle, etc.).

**The format for tags in the node title is / delimited.** Example: `/a/r/R0-4/C` (formats like `/ra` are now invalid).

![機能説明](images/setsumei.png)
![サンプル](images/sample.png)

Each prompt line can be manipulated independently and customized.

### 1. Interactive Prompt Management
In non-editing mode, each line is displayed like a checklist.
* **[Original]** ON/OFF Switching for lines
  * Click a line to enable/disable it (prefixed with ```//```)
* **[Original]** Weight Adjustment
  * Use the ```+``` / ```-``` buttons on the right of the line to adjust weights in increments of ```CONFIG.WEIGHT_STEP``` (default ```0.10```)
* **[Original]** Operable even in Edit Mode
  * You can repeat execution while editing
* **[Switch]** Empty lines are displayed as separators
  * These separators are also used to define groups for random pickup
  * Displayed as a faint light blue line (```#ADD8E6```)
* **[Switch]** Separator Line ```//,//```
  * ```//,//``` → Displays a gray line (```#888```) as a separator (purely for visual organization)
  * ```//,// Comment``` → Displays in light blue text (```#ADD8E6```) (a comment line not used as a prompt element)
* **[Switch]** Display Improvements
  * Long lines are automatically truncated (max 30 characters + ```...```)
  * For comments (the string after ```//```), the ```//``` is hidden, and the font size is 80% with color ```#ADD8E6```

### 2. Mode Switching
* **Edit Mode**
  * ```F2``` or ```E``` key, or double-click the node border (left, right, and bottom borders only; top is not possible)
* **[Switch]** Compact Mode
  * ```V``` key: Hides disabled lines (minimizes height)
  * ```Shift+V```: Toggles all nodes simultaneously (excluding nodes with ```/v```)
---
## Shortcut Keys (Latest Version)
| Key | Function | Description |
|--------------|-----------------------------|------|
| ```F1``` | Show Help | Explanations of shortcuts and tags |
| ```F2``` / ```E``` | Toggle Edit Mode | Normal Mode ↔ Edit Mode |
| ```Shift+E``` | **Toggle Edit Mode for ALL Nodes** | Useful in edit mode because browser search highlighting works (but jumping is not possible) |
| ```A``` | Batch ON/OFF | Toggles all lines in the selected node |
| ```Shift+A``` | Force Disable All Nodes | Comments out all nodes (excluding ```/a```). Useful when you want to reset everything. |
| ```V``` | Toggle Compact Mode | Hides disabled lines in the selected node |
| ```Shift+V``` | Toggle All Nodes Display | Toggles all nodes to Compact/Normal simultaneously (excluding ```/v```) |
| ```W``` | Instant Weight Reset | Resets all weights in the selected node to ```1.0``` |
| ```R``` | Random Pickup | Randomly selects from sections separated by empty lines (supports ```/R``` tag) |
| ```Shift+R``` | Randomize All Nodes | Performs random pickup on all nodes (excluding ```/r```) |
| ```C``` | **Toggle /C Tag** | Adds/removes ```/C``` to the title. Toggles the trigger for automatic random pickup during image generation. |
| ```Shift+C``` | **Remove /C from All Nodes** | Removes ```/C``` from all nodes simultaneously |
---
## The Ultimate New Feature: The ```/C``` Tag (Automatic Random Update on Every RUN Button Press)
> **"Every time you press the RUN (Generate) button, the prompt automatically changes randomly."**
> **This is PromptSwitch's biggest strength.**

### How to Use (Just 2 Steps)
1. **Add ```/C``` to the node title**
    (The ```C``` key can toggle ```/C```)
    (Example: ```Face Expression /R0-3 /C```)
2. **Press "RUN (Generate)"**
    → **Each time you press it, one element in the node is automatically selected randomly, and an image is generated.**
    (By adding the ```/R1-3``` tag, you can pick up 1 to 3 elements simultaneously. By using ```/R-100-2```, you can make the tag super rare, selecting 1-2 elements about once every 100 runs.)

### Strengths of the ```/C``` Tag
| Conventional Method | With ```/C``` Tag |
|--------------------|-----------------------------|
| Manual update with ```R``` key every time | **Automatic update with RUN (Generate)** |
| The same prompt continues | **A different configuration every time** |
| Trial and error is tedious | **Reaching the desired image in the shortest path** |

### Randomness is Fully Controlled by the ```/R``` Tag
- **```/R1```** → Always selects **exactly 1 item** randomly
- **```/R1-3```** → Randomly selects between **1 and 3 items**
- **```/R-5```** → Randomly selects between **0 and 5 items**
- **```/R-3-2```** → Randomly selects between **-3 and 2 items** (Negative value = 0 selection, 3 "miss" slots added, 3 misses out of 6 total possibilities, 0 probability ≈ 50%)
→ **You can try variations with a single press of the RUN (Generate) button, while narrowing down to a "target style"!**

### Ultimate Combo with Continuous Generation
> By combining it with [AutoBatchRunner](https://github.com/Boba-svg/ComfyUI_AutoBatchRunner), you can achieve **Automatic Random Update on Every RUN × 100 Batch Generation!**
> → Check the [**Integration Guide**](./COMBO_GUIDE_AUTO_BATCH.md) for details!

\* **ComfyUI's standard batch feature (the number next to the Run button) does not perform random pickup for each image, even if you specify 32 images.**
→ The standard feature only generates **32 consecutive images with the same prompt.**
To leverage the ```/C``` tag's automatic random update, you would need to **manually press the "Generate" button 32 times.**
**AutoBatchRunner** automates this process with **1 click**.
---
## Tag Rules (```/C``` + ```/R``` Required)
Add tags to the end of the node title.
**Spaces, tabs, and newlines are ignored**. **Compound tags (e.g., ```/R2a```) are invalid → A warning will be displayed**.
| Tag | Meaning |
|--------------|------|
| ```/a``` | Exclude from ```Shift+A``` |
| ```/v``` | Exclude from ```Shift+V``` |
| ```/r``` | Exclude from ```Shift+R``` |
| ```/R[n]``` | Select **exactly n items** from the section |
| ```/R[n]-[m]``` | Randomly select between **n and m items** |
| ```/R-[m]``` | Randomly select between **0 and m items** |
| **```/R-N-M```** | Randomly select between **-N and M items** (Negative value = 0 selection, N "miss" slots, Total possibilities = N+M+1) |
| **```/C```** | **Automatic random update on every RUN (Generate) button press** |
> **Example: ```Pose /R-8-2 /C```**
> → Automatically selects between **-8 and 2 items** every time (0 probability ≈ 72.7%, max=2), applied immediately upon Generate.
---
## Customization Settings (```CONFIG``` in ```web/index.js```)
| Variable | Default | Description |
|-----------------------------|------------|------|
| ```WEIGHT_STEP``` | ```0.10``` | Unit for weight increase/decrease |
| ```minWeight``` | ```-1.0``` | Minimum weight |
| ```maxWeight``` | ```2.0``` | Maximum weight |
| ```COMMENT_FONT_SCALE``` | ```0.8``` | Font size ratio for comments |
| ```PROMPT_MAX_LENGTH_DISPLAY``` | ```30``` | Maximum number of characters for display (truncated if exceeded) |
| ```COLOR_PROMPT_ON``` | ```"#FFF"``` | Color for enabled prompts |
| ```COLOR_COMMENT_ON``` | ```"#ADD8E6"``` | Color for enabled comments |
| ```COLOR_PROMPT_OFF``` | ```"#AAAAAA"``` | Color for disabled prompts |
| ```COLOR_COMMENT_OFF``` | ```"#AAAAAA"``` | Color for disabled comments |
| ```CommentLine_LineColor``` | ```"#888"``` | Separator line color (```//,//```) |
| ```CommentLine_FontColor``` | ```"#ADD8E6"``` | Separator comment color |
---
## Installation and Update
### 1. Via ComfyUI Manager (Recommended)
1. Open the Manager
2. Click "Install Custom Nodes"
3. Search for ```PromptSwitch```
4. Install **ComfyUI-PromptSwitch**
5. Restart ComfyUI
### 2. Manual Installation
1. Navigate to the following folder:
   ```/path/to/ComfyUI/custom_nodes```
2. Execute the command:
   ```git clone [https://github.com/Boba-svg/ComfyUI-PromptSwitch.git](https://github.com/Boba-svg/ComfyUI-PromptSwitch.git)```
### 3. Update
1. Navigate to the following folder:
   ```/path/to/ComfyUI/custom_nodes/ComfyUI-PromptSwitch```
2. Execute the command:
   ```git pull```
---
## Usage
1. Add **PromptSwitch** from the node search (```utils``` category).
2. Set the title to **```/R[number] /C```**.
3. **Press "Generate" → Image is generated with a different prompt every time!**
---
## Update History
| Date | Content |
|------------|------|
| 25/10/16 | Initial release |
| 25/10/17 | Exclusion tags added (```/a```, ```/v```) |
| 25/10/20 | Unified weight operation |
| 25/10/30 | ```R``` key → Random, ```W``` key → Reset |
| 25/10/30 | ```/R[number]``` extended |
| 25/11/05 | Unified tag parsing (compound prohibited) |
| **25/11/07** | **Definitive Update** |
| | - **```/C``` Tag: Automatic random update on 1 Generate press** |
| | - ```C``` Key: Toggle ```/C``` |
| | - ```Shift+C```: Remove ```/C``` from all nodes |
| | - ```Shift+E```: Toggle all edit modes (**prevents input**) |
| | - Fixed edit mode bug |
| **25/11/08** | ```/C``` behavior completely fixed (executed only once before generation) |
| **25/11/09** | Comment Separator ```//,//``` implemented |
| **25/11/10** | **Negative "Miss Slot" implementation (```/R-N-M``` format)** |
| | - ```/R-3-2``` → Added 3 miss slots, increased 0 selection probability ↑ |
| | - Enhanced probability control (e.g., ```/R-8-2``` → 0 probability ≈ 72.7%) |
| | - Bug fix: preventing max limit overshoot |
---
## Known Bugs
* **Starts in edit mode and cannot revert to normal mode no matter what**
  (Confirmed on 2025/11/10 with a large workflow)
  Please close the ComfyUI browser tab and reopen it (Ctrl+Shift+R or a non-cached reload might be better).
* **Stops with an error after long generation times combined with AutoBatchRunner (Fetch error related)**
  (Experienced daily by the author in a paperspace environment)
  AI suggested that doing it locally or lightening the workflow might prevent the error, but the workflow is still large...
  
## Next Steps Planned
1. Implementation of a mode that generates prompts using a wildcard system for random pickup and runs purely server-side.
2. Implementation of random pickup at the group level, separated by separators (e.g., ```RG0-2```).
3. Pickups other than random (e.g., enabling the next element after 20 images are generated).
4. Since it only outputs text, in combination with the above feature, is it possible to switch models or change the output image size every time?
---
## Credits
This node is a fork and extension of **kambara's ComfyUI-PromptPalette**.
---
## License
MIT License
See the [LICENSE](LICENSE) file for details.
