# Chrome Web Store listing

Fill these in on the Chrome Web Store developer dashboard.

## Store listing tab

**Name** (from the manifest): Grade Calculator for ManageBac

**Summary** (max 132 characters, comes from the manifest):
Predicts your IB grade (1-7) on your ManageBac tasks page using official IB boundaries. Estimates only. Settings stay local.

**Category:** Education (or Productivity)

**Language:** English

**Description:**

See where your IB grade is heading, right on your ManageBac tasks page.

Grade Calculator for ManageBac adds a small panel to each class's Tasks page. It reads the scores already shown there, weights them by your teacher's task categories, and shows a predicted IB grade from 1 to 7.

WHAT IT DOES
- Predicts your grade using the IB May 2026 grade boundaries for your subject and level (SL or HL), including the right exam timezone.
- Reads the category weights shown on the ManageBac page, or lets you set your own for each class.
- Lets you decide whether formative tasks count, and with what weight.
- Shows the grade boundaries in use, and how many percent you are from the next grade.
- "What if" planner: add several tasks you expect, in different categories, and see the new overall grade. Leave a score blank to find out what you would need to reach a target grade.
- Option to use your own grade boundaries.
- Colour themes and light or dark mode.
- Settings are saved separately for every class.

PRIVATE BY DESIGN
Your scores are read in your browser and never leave it. Settings are stored locally. There is no tracking, no ads and no account. The only thing ever sent is feedback you choose to write and send yourself.

PLEASE NOTE
- This is an estimate, not an official grade. Your teacher and the IB decide your real grades.
- Weights, scoring rules and subjects differ between schools and classes. Check the weights panel and adjust them if needed.
- Independent project. Not affiliated with or endorsed by ManageBac or the International Baccalaureate Organization.

Found a wrong grade or a bug? Use the "feedback" link inside the panel.

## Privacy tab

**Single purpose:** Show a predicted IB grade on the user's ManageBac class tasks page, calculated from the scores and category weights displayed there.

**Permission justifications**
- Host access to `https://*.managebac.com/*`: the extension is a content script that draws the grade panel on ManageBac tasks pages and reads the scores and categories shown on those pages. It does not run on any other site.
- `storage`: saves the user's per-class weights, subject and level choices, and appearance settings in local extension storage.

**Remote code:** No. All code is bundled in the extension.

**Data usage disclosure (tick these):**
- Website content (class name, task categories, scores): read on the user's device only, not transmitted. Because it is not collected off-device, leave unticked unless the dashboard asks about on-device handling.
- "User-provided content": tick if the form treats feedback messages as collected data. Feedback is optional and sent only when the user presses Send.
- Do not tick: personally identifiable information, health, financial, authentication, personal communications, location, web history, user activity.

**Certifications (tick all three):**
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes unrelated to the item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** the public address where you host `PRIVACY.md` (fill in your name and email first).

## Test instructions (for the review team)

The extension only appears on a ManageBac class "Tasks" page (`https://<school>.managebac.com/student/classes/<id>/core_tasks`) and needs a student login that a reviewer will not have. To help: describe it as "requires a ManageBac student account; screenshots show the panel on a sample page". If the reviewers ask for a way to test, offer a short screen recording.

## Graphics

- Icon: `icons/icon128.png` (already inside the extension).
- Screenshots: `store/screenshots/` (1280x800, five images). All use sample data.
- Small promo tile: `store/screenshots/promo-440x280.png`.
