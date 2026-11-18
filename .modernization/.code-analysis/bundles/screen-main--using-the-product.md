# Screen: Policy Plus main window, as Using the product

At a glance: 50 owned rules, 82 relied on, 5 actions, 17 files (1 own, 12 relied on, 3 of neighbour screens, 1 generated), 5 disputed.

How to read it: paths are relative to the source root and `file:a-b` is an inclusive line range. `BR-` rules, `ACT-` actions, `TR-` changes of state and `RK-` risks have stable ids. A record marked disputed was challenged in review and kept; the reviewer's words are under Trust. All of it was read from the code; nothing was run.

## Product context
Policy Plus is a Windows desktop editor for Group Policy settings, used by administrators and power users. It reads Microsoft's policy definition files and edits policy files directly, so it works on any Windows edition, including Home, which lacks the built-in editor.
Built with: .NET Framework v4.5.2, Microsoft Windows, System.DirectoryServices, System.Xml, Visual Basic .NET, Windows Forms (Policy Plus desktop editor).
Runs: It runs on the user's own Windows computer as one desktop program on .NET Framework 4.5.2. It asks for elevated rights when available but starts without them; loading registry hives, refreshing policy and editing local Group Policy files need them. It can also reach the domain's shared policy folder.
Reaches outside itself: Computer file system folders; Windows registry policy keys and loaded user hives; Administrative template files (ADMX and ADML); Windows registry settings key of Policy Plus; Generated version source file; Policy comment files (CMTX); Active Directory domain; Microsoft download site.

```mermaid
flowchart LR
  L0["Build tooling"]
  L1["Dialog windows and their reactions"]:::hit
  L2["Policy definitions and files"]:::hit
  L3["Program setup and settings"]:::hit
  L1 -->|"call, reads"| L2
  L1 -->|"call"| L3
  X0[("Computer file system folders")]
  L2 -.->|"reads, saves"| X0
  L1 -.->|"reads, saves"| X0
  X1[("Windows registry policy keys and loaded user hives")]
  L2 -.->|"reads, saves"| X1
  L1 -.->|"reads"| X1
  X2[("Administrative template files ADMX and ADML")]
  L2 -.->|"reads"| X2
  X3[("Windows registry settings key of Policy Plus")]
  L3 -.->|"reads, saves"| X3
  X4[("Generated version source file")]
  L0 -.->|"saves"| X4
  L1 -.->|"reads"| X4
  X5[("Policy comment files CMTX")]
  L2 -.->|"reads, saves"| X5
  X6[("Active Directory domain")]
  L1 -.->|"call"| X6
  X7[("Microsoft download site")]
  L1 -.->|"request"| X7
  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937
```

## Where this sits
Part of: Using the product (Starting the program and its settings).

```mermaid
flowchart LR
  E0[("Policy setting")]
  E1[("Administrative template")]
  E2[("Program preference")]
  E3[("Policy comment")]
  S0["Policy Plus main window, as Using the product"]:::hit
  N0["Choose policy sources"]
  S0 -->|"calls into"| N0
  N1["Choose the policy language"]
  S0 -->|"calls into"| N1
  N2["Search results"]
  S0 -->|"calls into"| N2
  S0 -.->|"reads and saves"| E0
  S0 -.->|"reads"| E1
  S0 -.->|"reads and saves"| E2
  S0 -.->|"reads and saves"| E3
  C0(["Using the product"])
  C0 --- S0
  classDef hit fill:#fde68a,stroke:#b45309,color:#1f2937
```

## Boundary
- Calls into **Choose policy sources** (bundle: screen choose-policy-sources), at `PolicyPlus/Main.vb:18-45`
- Calls into **Choose the policy language** (bundle: screen choose-the-policy-language), at `PolicyPlus/Main.vb:807-816`
- Calls into **Search results** (bundle: screen search-results), at `PolicyPlus/Main.vb:389-393`

## Contract: what it must do
### Policy Plus main window
Browse categories and policies, and reach every other action.
Controls (56): ": PolicyIsPrefLabel; Friend WithEvents AboutToolStripMenuItem As ToolStripMenuItem  [Text = "About"]: AboutToolStripMenuItem; Friend WithEvents AcquireADMXFilesToolStripMenuItem As ToolStripMenuItem  [Text = "Acquire ADMX Files"]: AcquireADMXFilesToolStripMenuItem; Friend WithEvents AllProductsToolStripMenuItem As ToolStripMenuItem  [Text = "All Products"]: AllProductsToolStripMenuItem; Friend WithEvents AllSupportDefinitionsToolStripMenuItem As ToolStripMenuItem  [Text = "All Support Definitions"]: AllSupportDefinitionsToolStripMenuItem; Friend WithEvents ByIDToolStripMenuItem As ToolStripMenuItem  [Text = "By ID": ByIDToolStripMenuItem; Friend WithEvents ByRegistryToolStripMenuItem As ToolStripMenuItem  [Text = "By Registry": ByRegistryToolStripMenuItem; Friend WithEvents ByTextToolStripMenuItem As ToolStripMenuItem  [Text = "By Text": ByTextToolStripMenuItem; Friend WithEvents CategoriesTree As TreeView  [TabIndex = 2]: CategoriesTree; Friend WithEvents ChSettingName As ColumnHeader  [Text = "Name": ChSettingName; Friend WithEvents CloseADMXWorkspaceToolStripMenuItem As ToolStripMenuItem  [Text = "Close ADMX Workspace"]: CloseADMXWorkspaceToolStripMenuItem; Friend WithEvents CmeAllDetails As ToolStripMenuItem  [Text = "Details"]: CmeAllDetails; Friend WithEvents CmeCatOpen As ToolStripMenuItem  [Text = "Open"]: CmeCatOpen; Friend WithEvents CmePolEdit As ToolStripMenuItem  [Text = "Edit"]: CmePolEdit; Friend WithEvents CmePolInspectElements As ToolStripMenuItem  [Text = "Element Inspector"]: CmePolInspectElements; Friend WithEvents CmePolSpolFragment As ToolStripMenuItem  [Text = "Semantic Policy Fragment"]: CmePolSpolFragment; Friend WithEvents ComboAppliesTo As ComboBox  [TabIndex = 1: ComboAppliesTo; Friend WithEvents ComputerSourceLabel As ToolStripStatusLabel  [Text = "Computer info"]: ComputerSourceLabel; Friend WithEvents DeduplicatePoliciesToolStripMenuItem As ToolStripMenuItem  [Text = "Deduplicate Policies": DeduplicatePoliciesToolStripMenuItem; Friend WithEvents EditRawPOLToolStripMenuItem As ToolStripMenuItem  [Text = "Edit Raw POL"]: EditRawPOLToolStripMenuItem; Friend WithEvents EmptyCategoriesToolStripMenuItem As ToolStripMenuItem  [Text = "Empty Categories"]: EmptyCategoriesToolStripMenuItem; Friend WithEvents ExitToolStripMenuItem As ToolStripMenuItem  [Text = "Exit"]: ExitToolStripMenuItem; Friend WithEvents ExportPOLToolStripMenuItem As ToolStripMenuItem  [Text = "Export POL"]: ExportPOLToolStripMenuItem; Friend WithEvents ExportREGToolStripMenuItem As ToolStripMenuItem  [Text = "Export REG"]: ExportREGToolStripMenuItem; Friend WithEvents FileToolStripMenuItem As ToolStripMenuItem  [Text = "File"]: FileToolStripMenuItem; Friend WithEvents FilterOptionsToolStripMenuItem As ToolStripMenuItem  [Text = "Filter Options"]: FilterOptionsToolStripMenuItem; Friend WithEvents FindNextToolStripMenuItem As ToolStripMenuItem  [Text = "Find Next": FindNextToolStripMenuItem; Friend WithEvents FindToolStripMenuItem As ToolStripMenuItem  [Text = "Find"]: FindToolStripMenuItem; Friend WithEvents HelpToolStripMenuItem As ToolStripMenuItem  [Text = "Help"]: HelpToolStripMenuItem; Friend WithEvents ImportPOLToolStripMenuItem As ToolStripMenuItem  [Text = "Import POL"]: ImportPOLToolStripMenuItem; Friend WithEvents ImportREGToolStripMenuItem As ToolStripMenuItem  [Text = "Import REG"]: ImportREGToolStripMenuItem; Friend WithEvents ImportSemanticPolicyToolStripMenuItem As ToolStripMenuItem  [Text = "Import Semantic Policy"]: ImportSemanticPolicyToolStripMenuItem; Friend WithEvents InfoStrip As StatusStrip  [Text = "StatusStrip1": InfoStrip; Friend WithEvents LoadedADMXFilesToolStripMenuItem As ToolStripMenuItem  [Text = "Loaded ADMX Files"]: LoadedADMXFilesToolStripMenuItem; Friend WithEvents MainMenu As MenuStrip  [Text = "MenuStrip1": MainMenu; Friend WithEvents OnlyFilteredObjectsToolStripMenuItem As ToolStripMenuItem  [Text = "Only Filtered Policies"]: OnlyFilteredObjectsToolStripMenuItem; Friend WithEvents OpenADMXFileToolStripMenuItem As ToolStripMenuItem  [Text = "Open ADMX File"]: OpenADMXFileToolStripMenuItem; Friend WithEvents OpenADMXFolderToolStripMenuItem As ToolStripMenuItem  [Text = "Open ADMX Folder"]: OpenADMXFolderToolStripMenuItem; Friend WithEvents OpenPolicyResourcesToolStripMenuItem As ToolStripMenuItem  [Text = "Open Policy Resources": OpenPolicyResourcesToolStripMenuItem; Friend WithEvents PictureBox1 As PictureBox  [TabIndex = 0: PictureBox1; Friend WithEvents PoliciesList As ListView  [TabIndex = 3: PoliciesList; Friend WithEvents PolicyDescLabel As Label  [Text = "Policy description": PolicyDescLabel; Friend WithEvents PolicyIcons As ImageList: PolicyIcons; Friend WithEvents PolicyInfoTable As TableLayoutPanel  [TabIndex = 0]: PolicyInfoTable; Friend WithEvents PolicyIsPrefTable As TableLayoutPanel  [TabIndex = 4]: PolicyIsPrefTable; Friend WithEvents PolicyObjectContext As ContextMenuStrip: PolicyObjectContext; Friend WithEvents PolicySupportedLabel As Label  [Text = "Requirements": PolicySupportedLabel; Friend WithEvents PolicyTitleLabel As Label  [Text = "Policy title": PolicyTitleLabel; Friend WithEvents SavePoliciesToolStripMenuItem As ToolStripMenuItem  [Text = "Save Policies": SavePoliciesToolStripMenuItem; Friend WithEvents SearchResultsToolStripMenuItem As ToolStripMenuItem  [Text = "Search Results": SearchResultsToolStripMenuItem; Friend WithEvents SetADMLLanguageToolStripMenuItem As ToolStripMenuItem  [Text = "Set ADML Language"]: SetADMLLanguageToolStripMenuItem; Friend WithEvents SettingInfoPanel As Panel  [TabIndex = 0]: SettingInfoPanel; Friend WithEvents ShareToolStripMenuItem As ToolStripMenuItem  [Text = "Share"]: ShareToolStripMenuItem; Friend WithEvents SplitContainer As SplitContainer  [TabIndex = 1: SplitContainer; Friend WithEvents UserSourceLabel As ToolStripStatusLabel  [Text = "User info"]: UserSourceLabel; Friend WithEvents ViewToolStripMenuItem As ToolStripMenuItem  [Text = "View"]: ViewToolStripMenuItem

Actions
- **ACT-08938260** Starts the program: restores the last definitions folder and policy sources, then fills the category tree. — `PolicyPlus/Main.vb:18-45`; started by person
- **ACT-12171282** Closes the program window. — `PolicyPlus/Main.vb:507-509`; started by person
- **ACT-46428672** Shows author and version information. — `PolicyPlus/Main.vb:639-644`; started by person
- **ACT-11313080** Cleans up the open policy sources before the program ends. — `PolicyPlus/Main.vb:685-687`; started by person
- **ACT-21115058** Chooses the language of the definition text and offers to reload the workspace. — `PolicyPlus/Main.vb:807-816`; started by person

Rules
- **BR-24462204** The program allows secure connections using TLS 1.0, 1.1 and 1.2 only, so downloads use no other protocol. — `PolicyPlus/Main.vb:20`
- **BR-42782673** On first start, when no policy sources were saved, both the user source and the computer source open as the local Group Policy files (Local GPO) with no extra location. — `PolicyPlus/Main.vb:25-30`; also rests on `PolicyPlus/Main.vb:630-633`
- **BR-19919134** When the previously saved policy sources cannot be opened, the person is told "The previous policy sources are not accessible. The defaults will be loaded." and both sources are saved as Local GPO, then opened quietly. Only the source type is reset; any saved location text stays. — `PolicyPlus/Main.vb:31-36`; gates TR-65225985
- **BR-79220846** The list of areas starts on "User or Computer", the first choice, so both user and computer policies are shown at start. — `PolicyPlus/Main.vb:39`; also rests on `PolicyPlus/Main.Designer.vb:410`
- **BR-84894130** The definitions folder to load is the one saved last time; when none is saved it is the Windows PolicyDefinitions folder. — `PolicyPlus/Main.vb:59-62`
- **BR-50552574** When loading the saved definitions reports problems, the person is asked whether to keep using the workspace. Yes keeps the partly loaded workspace. No raises the failure "You decided to not use the problematic ADMX bundle.", which goes into the failed-load handling: the workspace is thrown away, and for a non-default folder the person is asked to load the default, while for the default folder the person is told the definitions could not be loaded. — `PolicyPlus/Main.vb:62-65`; also rests on `PolicyPlus/Main.vb:470-476`; gates TR-92493091
- **BR-36661517** When the saved folder is not the Windows default and fails to load, the person is told "Policy definitions could not be loaded from "<folder>": <reason> Load from the default location?". Yes saves the Windows default folder as the definitions folder; No leaves the workspace empty with no further message. — `PolicyPlus/Main.vb:67-71`; gates TR-59167574
- **BR-36981389** When the person chooses to load the default location, the workspace is replaced by an empty one and the Windows default folder is loaded into it. — `PolicyPlus/Main.vb:72-73`; gates TR-27627314
- **BR-98270380** When the Windows default folder itself fails to load, or fails to load after the person chose Yes, the person is told "Policy definitions could not be loaded: <reason>" and the workspace stays empty. — `PolicyPlus/Main.vb:72-81`; **disputed**
- **BR-22463982** A category appears in the tree only when it passes the visibility rule; each shown category gets an icon by its kind and carries its visible subcategories below it, and the tree is sorted. — `PolicyPlus/Main.vb:90-95`; also rests on `PolicyPlus/Main.vb:98-99`
- **BR-11308115** After the category tree is rebuilt from the loaded definitions, no category, policy or highlighted item is selected and the information pane shows the empty state. — `PolicyPlus/Main.vb:100-103`
- **BR-74199547** When the list is rebuilt, the policy already selected is selected again and revealed only if it is still listed, that is, it sits in the category shown and passes the visibility rule; otherwise nothing is selected. Then, if the policy is in the same category and the list still has that many rows, the earlier top row is put back, so the policy is not guaranteed to stay in view. — `PolicyPlus/Main.vb:109-112`; also rests on `PolicyPlus/Main.vb:130-138`
- **BR-49856909** The right pane lists the chosen category in this order: an "Up: <parent name>" row marked "Parent" when the category has a parent, then visible subcategories by name, then visible policies by name. Each policy row shows its state and its comment text. — `PolicyPlus/Main.vb:113-129`; also rests on `PolicyPlus/Main.vb:116-117`
- **BR-64147870** The category tree selection follows the category shown in the right pane. — `PolicyPlus/Main.vb:139-141`
- **BR-99672368** When nothing is selected, the title and support lines are hidden and the pane reads "Select an item to see its description.". — `PolicyPlus/Main.vb:146-148`; also rests on `PolicyPlus/Main.vb:164-167`
- **BR-21119593** For a selected policy the information pane shows its title, "(no requirements information)" when it has no support rule or "Requirements:" plus the support name, and its explanation. A notice that the policy is a preference appears only for preferences. — `PolicyPlus/Main.vb:149-157`; also rests on `PolicyPlus/Main.Designer.vb:669-670`
- **BR-25403263** For a selected or highlighted category the pane shows its title, "This category contains N policies and M subcategories." ("The selected category" when highlighted but not opened) and its explanation. The counts include every policy and subcategory, hidden or not. — `PolicyPlus/Main.vb:158-163`
- **BR-80796596** A category is orphaned when it has no parent among the loaded definitions although its definition names one. — `PolicyPlus/Main.vb:171`
- **BR-01098949** A category is empty when it holds no subcategories and no policies at all, counting hidden ones. — `PolicyPlus/Main.vb:174`
- **BR-68396159** A category's icon is chosen in this order: orphaned, then empty, then normal. — `PolicyPlus/Main.vb:177-183`
- **BR-57678995** A policy's icon is chosen in this order: preference, then plain when it has no configurable elements, then "extra configuration" when it has some. — `PolicyPlus/Main.vb:186-192`
- **BR-47152124** A category is visible when empty categories are switched on. Otherwise it is visible only if it has at least one visible policy or one visible subcategory. — `PolicyPlus/Main.vb:196-200`
- **BR-86583005** A policy is visible only if it applies to a chosen area (user, computer or both). With "Only Filtered Policies" on, it must also pass the filter for a chosen area it applies to; passing for either one is enough. — `PolicyPlus/Main.vb:204-215`; also rests on `PolicyPlus/Main.vb:436-439`
- **BR-14109370** When a view setting changes, the program moves up to the nearest visible category, drops the selected policy if the move happened or the policy is now hidden, then rebuilds the tree and list. A policy kept after the move appears in the information pane only: rebuilding the list reselects the category in the tree, which clears the selection, so its row is not highlighted. — `PolicyPlus/Main.vb:221-230`; also rests on `PolicyPlus/Main.vb:139-141`, `PolicyPlus/Main.vb:480-486`
- **BR-70802702** With both areas shown, a policy that applies to both areas shows its common state followed by "(2)" when both match, the computer state followed by "(C)" when only the user is Not Configured, the user state followed by "(U)" when only the computer is Not Configured, and "Mixed" otherwise. — `PolicyPlus/Main.vb:234-247`
- **BR-75647919** With both areas shown, a policy that applies to one area shows that area's state followed by "(C)" for computer or "(U)" for user. With a single area shown, only that area's state is shown, without a suffix. — `PolicyPlus/Main.vb:248-252`
- **BR-27401870** A policy's state in one area reads "Enabled", "Disabled", "Not Configured" or "Unknown"; the computer source is read for the computer area and the user source for any other. — `PolicyPlus/Main.vb:257-266`
- **BR-65013329** With both areas shown, the comment column is empty when neither area has a comment, shows "(multiple)" when both have one, and otherwise shows the single comment. — `PolicyPlus/Main.vb:270-281`; also rests on `PolicyPlus/Main.vb:283`
- **BR-11436933** A policy's comment in one area is empty when that source has no comment file or holds no comment for the policy, and otherwise the saved text. — `PolicyPlus/Main.vb:288-293`
- **BR-04807958** A policy is a preference, not a managed policy, when it names a registry key outside the three policy locations: software\policies, software\microsoft\windows\currentversion\policies and system\currentcontrolset\policies. — `PolicyPlus/Main.vb:296`
- **BR-82203251** Opening new policy sources first closes the ones already open. Unsaved changes are discarded for sources backed by a POL file (local Group Policy files, a chosen POL file, a per-user Group Policy object) and for the empty source. A registry source applies changes at once, and a user hive file is applied when it is closed, so those lose nothing. — `PolicyPlus/Main.vb:311-315`; also rests on `PolicyPlus/PolicyLoader.vb:136-148`, `PolicyPlus/PolicyLoader.vb:88-91`
- **BR-42629987** A policy source's writability is described as "is fully writable", "cannot be saved" (changes work in memory only) or "cannot be modified"; anything but fully writable counts as a problem. — `PolicyPlus/Main.vb:318-327`
- **BR-79543464** A source's comments are used only when it has a comment file location. The folder is created if missing; an existing file is loaded and a missing file gives no comments yet. Any failure leaves that source without comments. — `PolicyPlus/Main.vb:330-344`
- **BR-22378254** After opening, if either source is not fully writable the person is told "Not all policy sources are fully writable." with the state of the user and the computer source; if both are fully writable, "Both the user and computer policy sources are loaded and writable." appears only when opening was not quiet (never at start). — `PolicyPlus/Main.vb:352-360`
- **BR-99082543** Closing the policy sources tells the person "Cleanup did not complete fully because the loaded resources are open in other programs." when any source could not release its resources. — `PolicyPlus/Main.vb:364-373`; also rests on `PolicyPlus/Main.vb:685-687`
- **BR-52925601** Closing the workspace or replacing it with a new one discards all loaded definitions and the previous search results. — `PolicyPlus/Main.vb:391-392`; also rests on `PolicyPlus/Main.vb:540-541`, `PolicyPlus/Main.vb:760`, `PolicyPlus/Main.vb:811`; gates TR-41291404
- **BR-01595450** A filter on managed policies hides preferences when managed policies are wanted, and hides managed policies when preferences are wanted. — `PolicyPlus/Main.vb:411-413`
- **BR-23822249** A policy passes the filter only when it passes every active part of it. — `PolicyPlus/Main.vb:411-434`
- **BR-95943001** A filter on state keeps only policies whose state in the checked area is Configured (Enabled or Disabled), Not Configured, Disabled or Enabled, as chosen. — `PolicyPlus/Main.vb:414-426`
- **BR-30112593** A filter on comments keeps only policies that have a non-empty comment in the checked area, or only those that have none, as chosen. — `PolicyPlus/Main.vb:427-430`
- **BR-57225531** A filter on products keeps only policies supported by the chosen products, honouring the options to match any product and to include policies with blank support. — `PolicyPlus/Main.vb:431-433`
- **BR-78263418** A policy applies to an area when its definition declares that area; a policy declared for both applies to each. — `PolicyPlus/Main.vb:438`
- **BR-30179948** When loading definitions reports no problems nothing is shown; otherwise the person sees "Errors were encountered while adding administrative templates to the workspace." with each problem, and, only where a choice is wanted, is asked "Continue trying to use this workspace?". — `PolicyPlus/Main.vb:471-475`
- **BR-44319678** The language for definition text is the saved language code, or the computer's own language when none is saved. — `PolicyPlus/Main.vb:478`
- **BR-36444400** Selecting a category in the tree makes it the current category and clears any selected policy. — `PolicyPlus/Main.vb:482-485`
- **BR-60984241** Highlighting a policy makes it the selected policy and clears any highlighted category; highlighting a category does the reverse; highlighting nothing clears both. — `PolicyPlus/Main.vb:493-504`
- **BR-06051090** The area choice "User" shows user policies, "Computer" shows computer policies and any other choice shows both. — `PolicyPlus/Main.vb:551-558`
- **BR-48406586** The About box names the author and the GitHub address, and adds the version only when a version was built into the program. — `PolicyPlus/Main.vb:641-643`
- **BR-13275464** Setting the language saves the new language code at once, then asks "Language changes will take effect when ADML files are next loaded. Would you like to reload the workspace now?". Yes empties the workspace and reloads the saved definitions folder. — `PolicyPlus/Main.vb:809-813`
- **BR-56579605** The text of a policy description is tidied for display: leading and trailing spaces are removed from every line and blank space at the end of the text is dropped. — `PolicyPlus/Main.vb:863-870`


## Relied on: decided elsewhere
**Core code, run by 4 or more other capabilities**
- `PolicyPlus/PolicyProcessing.vb`
  - **BR-59240838** A policy's lists of on-values and off-values count as enabled or disabled evidence for each value in them that is present, using the list's own key when it names one. — `PolicyPlus/PolicyProcessing.vb:11-18`; also rests on `PolicyPlus/PolicyProcessing.vb:32-33`
  - **BR-16213931** A policy with a registry value of its own counts as enabled evidence when that value holds its 'on' value, which is the number 1 when the template gives none, and as disabled evidence when it holds its 'off' value or is marked for deletion when the template gives none. — `PolicyPlus/PolicyProcessing.vb:20-31`; also rests on `PolicyPlus/PolicyProcessing.vb:87-105`
  - **BR-43129633** For a policy's list elements, a marked-for-deletion list counts as one deleted element, and a list that holds any values counts as a present element and cancels that deletion. — `PolicyPlus/PolicyProcessing.vb:40-49`
  - **BR-29429916** For a checkbox element: a value marked for deletion counts as one deleted element. … — `PolicyPlus/PolicyProcessing.vb:50-61`; also rests on `PolicyPlus/PolicyProcessing.vb:11-18`, `PolicyPlus/PolicyProcessing.vb:87-105`
  - **BR-73157702** For any other element (number, text, choice, multi-line text), a value marked for deletion counts as a deleted element and a value that is present counts as a present element. — `PolicyPlus/PolicyProcessing.vb:62-68`
  - **BR-84295212** If any element is present, the elements add their count to the enabled evidence; only when none is present do deleted elements add to the disabled evidence. — `PolicyPlus/PolicyProcessing.vb:70-74`
  - **BR-02220135** A policy is Enabled when enabled evidence exceeds disabled evidence, Disabled when disabled exceeds enabled, Not configured when there is no evidence either way, and Unclear when both are equal and above zero. — `PolicyPlus/PolicyProcessing.vb:77-85`
  - **BR-26486738** A value counts as present when: for a deletion marker, it is marked for deletion; for a number, it exists as a whole number and equals the expected number; for text, it exists as text and equals the expected text. … — `PolicyPlus/PolicyProcessing.vb:87-105`
  - **BR-24272603** When a policy lists no supported-on information, it counts as supported only if the caller allows unlisted policies. … — `PolicyPlus/PolicyProcessing.vb:382-384`
  - **BR-60691407** A support entry for a product counts as met in two cases. … — `PolicyPlus/PolicyProcessing.vb:385`; also rests on `PolicyPlus/PolicyProcessing.vb:386-395`
  - **BR-00666232** A support entry for a product that has versions beneath it, whether a version range or a plain entry for a parent product that is not itself chosen, counts as met when any version in its range, or a sub-product directly beneath one, is chosen. … — `PolicyPlus/PolicyProcessing.vb:386-396`; also rests on `PolicyPlus/PolicyProcessing.vb:385`
  - **BR-83901255** A support definition met a second time anywhere in one evaluation counts as not met, because the list of definitions seen is never emptied. … — `PolicyPlus/PolicyProcessing.vb:401-402`; also rests on `PolicyPlus/PolicyProcessing.vb:413-420`
  - **BR-22807804** When the caller asks for 'any' matching, a support definition whose logic is all-of needs every entry met, and any other definition needs one entry met. … — `PolicyPlus/PolicyProcessing.vb:403-421`; **disputed**
- `PolicyPlus/PolicySource.vb`
  - **BR-24603885** When a value is deleted in the live registry and its key does not exist, nothing happens. … — `PolicyPlus/PolicySource.vb:365-370`
  - **BR-49391310** A registry key counts as a policy key when it is one of the three policy branches (software\policies, software\microsoft\windows\currentversion\policies, system\currentcontrolset\policies) or lies below one, regardless of case. — `PolicyPlus/PolicySource.vb:412-415`; also rests on `PolicyPlus/PolicySource.vb:429-434`

**Code shared with a few capabilities**
- `PolicyPlus/AdmlFile.vb`
  - **BR-87946479** When a language file has no policy resources section, or its revision is missing or not a number, the file is refused as invalid and its template file is not loaded. — `PolicyPlus/AdmlFile.vb:18-19`; also rests on `PolicyPlus/AdmxBundle.vb:64-70`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-74812053** A language file's text table is read only from its first text table, and each text is kept under its id; when the same text id appears twice, the file is refused as invalid and its template file is not loaded. — `PolicyPlus/AdmlFile.vb:29-37`; also rests on `PolicyPlus/AdmxBundle.vb:64-70`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-95606012** A language file's screen layouts are read only from its first presentation table; when the same layout id appears twice, the file is refused as invalid and its template file is not loaded. — `PolicyPlus/AdmlFile.vb:40-46`; also rests on `PolicyPlus/AdmlFile.vb:112`, `PolicyPlus/AdmxBundle.vb:64-70`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-69767562** A number box takes default value 1, shows its up-down spinner and steps by 1 unless the language file says otherwise; an unreadable attribute value falls back to the same defaults. — `PolicyPlus/AdmlFile.vb:54-58` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-45723180** A check box starts unticked unless the language file marks it ticked. — `PolicyPlus/AdmlFile.vb:74` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-64538717** Entries of a combo box or drop-down list are sorted unless the language file says not to sort them. — `PolicyPlus/AdmlFile.vb:79`; also rests on `PolicyPlus/AdmlFile.vb:93` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-45585276** A drop-down list has a preselected item only when the language file names one; otherwise none is preselected. — `PolicyPlus/AdmlFile.vb:94` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-76839356** Only labels, number boxes, text boxes, check boxes, combo boxes, drop-down lists, list boxes and multi-line text boxes are kept in a screen layout; any other control in the language file is dropped without notice. — `PolicyPlus/AdmlFile.vb:106-110`; also rests on `PolicyPlus/AdmlFile.vb:49-104` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-96794889** A control keeps the reference id the language file gives it, which ties it to the matching setting option in the template file; a control without one has no id. — `PolicyPlus/AdmlFile.vb:107` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
- `PolicyPlus/AdmxBundle.vb`
  - **BR-06148106** Only files directly in the chosen folder whose names end in .admx (in any letter case) are loaded as templates; subfolders and other files are ignored. — `PolicyPlus/AdmxBundle.vb:20-21` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-89456229** When a template file is refused with a reported failure (unparsable, invalid, namespace already owned, or no usable language file), it is skipped and the failure is listed; the other files in the folder still load and the structures are built from those that loaded. — `PolicyPlus/AdmxBundle.vb:22-26`; also rests on `PolicyPlus/AdmxBundle.vb:27` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-93665036** When a template file cannot be parsed as XML, it is refused with the message "Couldn't load <path>: The ADMX XML couldn't be parsed: <detail>."; any other read problem is refused with "The ADMX is invalid: <detail>". — `PolicyPlus/AdmxBundle.vb:37-43`; also rests on `PolicyPlus/AdmxBundle.vb:259-261`, `PolicyPlus/AdmxBundle.vb:252-254`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-73876158** When a template declares no target namespace, loading the folder stops at once with an error: the files after it are not read, nothing is built, and the person sees the error text (a start-up load also discards the workspace). — `PolicyPlus/AdmxBundle.vb:44`; also rests on `PolicyPlus/AdmxFile.vb:27-28`, `PolicyPlus/AdmxBundle.vb:20-28`, `PolicyPlus/Main.vb:60-82`, `PolicyPlus/Main.vb:515-520`; **disputed** (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-37401208** When a template file's namespace is already held by a template file loaded earlier, it is refused with "The <namespace> namespace is already owned by a different ADMX file", so the same file cannot be added twice. — `PolicyPlus/AdmxBundle.vb:44`; also rests on `PolicyPlus/AdmxBundle.vb:268-269`, `PolicyPlus/AdmxBundle.vb:77`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-36627036** The language file for a template is taken from the subfolder named exactly by the language code if it holds this template's file; else from the first subfolder whose name starts with the same language part (before the dash, compared with capital letters mattering) that holds this template's file; else from the en-US subfolder if it holds it. … — `PolicyPlus/AdmxBundle.vb:46-61`; also rests on `PolicyPlus/AdmxBundle.vb:49-59` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-77556361** When no language file is found in any of those places, the template file is refused with "The corresponding ADML is missing" and none of its content is loaded. — `PolicyPlus/AdmxBundle.vb:62`; also rests on `PolicyPlus/AdmxBundle.vb:262-263`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-14942665** When the chosen language file cannot be parsed as XML, the template is refused with "The ADML XML couldn't be parsed: <detail>"; any other read problem gives "The ADML is invalid: <detail>". — `PolicyPlus/AdmxBundle.vb:64-70`; also rests on `PolicyPlus/AdmxBundle.vb:264-267`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-82821065** When both a template file and its language file load, the template's categories, products, support rules and policies are staged for the next build and the pair is recorded as loaded under the template's namespace. — `PolicyPlus/AdmxBundle.vb:72-77`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-26854331** A policy gets a settings screen layout only when the template names one, the name is written as "$(presentation.<id>)", and the language file holds a layout with that id; in every other case the policy has none. — `PolicyPlus/AdmxBundle.vb:122`; also rests on `PolicyPlus/AdmxBundle.vb:201-207`; gates TR-40406069 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-50759553** A category whose parent is named is attached under that parent, found among items of this load or of files loaded earlier; when the parent is not found, the category has no parent but is still listed among the top-level categories. — `PolicyPlus/AdmxBundle.vb:128-136`; also rests on `PolicyPlus/AdmxBundle.vb:163-166`, `PolicyPlus/DetailCategory.vb:17-18`; gates TR-40406069 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-48575269** A child product (major or minor version) is attached under its parent product, which must be defined in the same template file; only products without a parent are listed as top-level products. — `PolicyPlus/AdmxBundle.vb:137-143`; also rests on `PolicyPlus/AdmxBundle.vb:167-170`; gates TR-40406069 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-92969564** A support rule entry is linked to the product its reference names; when no such product exists it is linked to the support rule of that name; when neither exists it stays unlinked. — `PolicyPlus/AdmxBundle.vb:145-151`; gates TR-40406069 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-47053337** A policy is listed under the category its reference names, found in this load or earlier ones; when that category is not found the policy is kept in the policy list but belongs to no category. — `PolicyPlus/AdmxBundle.vb:152-158`; gates TR-40406069 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-84833685** A policy shows the 'supported on' rule its reference names, found in this load or earlier ones; when none is found it has none. — `PolicyPlus/AdmxBundle.vb:159-160`; gates TR-40406069 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-76510565** When the structures are built, all new categories, products, support rules and policies join the final lists and the staged items are cleared, so loading further files adds to what is already available. — `PolicyPlus/AdmxBundle.vb:163-181`; gates TR-40406069 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-86135547** A name or description written as "$(string.<id>)" shows the language file's text for that id; an unknown id shows the code itself; any other text is shown as written; an empty value stays empty. — `PolicyPlus/AdmxBundle.vb:195-199` (also used by Browsing policy definitions, Getting Microsoft policy definitions, Changing policy settings)
  - **BR-46332356** An item's unique name is its template's namespace, a colon and its own name, so equal names in different templates stay apart. — `PolicyPlus/AdmxBundle.vb:209` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-69896082** A reference containing a colon uses the namespace the template declared for its prefix; with an unknown prefix it is taken as already complete; a reference without a colon belongs to the template's own namespace. — `PolicyPlus/AdmxBundle.vb:213-223` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
- `PolicyPlus/AdmxFile.vb`
  - **BR-41132501** A template file is refused as invalid when any of these is missing or unreadable: the policy definitions section; a namespace entry's prefix or namespace; a superseded-ADM file name; a minimum revision (missing or not a number); a support rule's name or display name; a support reference or range without its reference, or a version bound that is not a whole number; a product's name, display name or version index; a category's name or display name; a category's parent entry or its reference when the category has content; a policy's name, display name, key or class; a policy's category or supported-on reference; a number value's value; a list item's value name; a choice item's display name; or an option's id. — `PolicyPlus/AdmxFile.vb:20-33`; also rests on `PolicyPlus/AdmxFile.vb:40-41`, `PolicyPlus/AdmxFile.vb:56-64`, `PolicyPlus/AdmxFile.vb:80-82`, `PolicyPlus/AdmxFile.vb:104-109`, `PolicyPlus/AdmxFile.vb:123`, `PolicyPlus/AdmxFile.vb:140`, `PolicyPlus/AdmxFile.vb:170-174`, `PolicyPlus/AdmxFile.vb:191-193`, `PolicyPlus/AdmxFile.vb:232`, `PolicyPlus/AdmxFile.vb:251`, `PolicyPlus/AdmxBundle.vb:37-43`; gates TR-86518382; **disputed** (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-78345469** The namespace of a template is the one listed as its target; each prefix a template declares must be unique, and a repeated prefix refuses the file as invalid. — `PolicyPlus/AdmxFile.vb:24-29`; also rests on `PolicyPlus/AdmxBundle.vb:37-43`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-26589422** A template's superseded-ADM file name and minimum language revision are read when present; a superseded entry without a file name, or a minimum revision that is missing or not a number, refuses the template as invalid. — `PolicyPlus/AdmxFile.vb:30-33`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-18271508** A support rule is 'any of' when its first logic element is "or", 'all of' when it is "and", and blank otherwise; only that first logic element is read, each reference or range in it becomes an entry, and a range may carry a minimum and maximum version. — `PolicyPlus/AdmxFile.vb:42-69` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-84897081** Products form three levels: a product, its major versions and their minor versions; deeper levels are not read, and each version must carry a version index or the file is refused as invalid. — `PolicyPlus/AdmxFile.vb:74-98`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-31960533** A category's explanation is optional. … — `PolicyPlus/AdmxFile.vb:105-110`; also rests on `PolicyPlus/AdmxBundle.vb:37-43`; gates TR-86518382 (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-96272616** A registry value in a template is a delete marker, a number or a text, decided by the first of those it contains; a value with none of them is treated as a delete marker. — `PolicyPlus/AdmxFile.vb:115-132`; also rests on `PolicyPlus/AdmxFile.vb:22-26` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-30326801** A policy's switched-on and switched-off effects are read from its enabled and disabled values and lists; a list entry names a value and optionally its own key, falling back to the list's default key. — `PolicyPlus/AdmxFile.vb:133-166`; also rests on `PolicyPlus/AdmxFile.vb:187` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-01189825** A policy applies to computers when its class is "Machine", to users when "User", and to both for any other class value. — `PolicyPlus/AdmxFile.vb:174-182` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-80370921** A policy takes its category and its 'supported on' rule from the references in its own content, and has options only when it contains an options section. — `PolicyPlus/AdmxFile.vb:188-195` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-07337703** A number option accepts 0 to 4,294,967,295 unless the template sets other limits, overwrites existing values unless marked soft, and is stored as a number unless marked as text; unreadable attribute values fall back to these defaults. — `PolicyPlus/AdmxFile.vb:199-205` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-30685557** A yes/no option takes its registry effect for true and false from true and false values and lists. — `PolicyPlus/AdmxFile.vb:206-209` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-00526059** A text option allows 255 characters, is optional, is stored as plain text and overwrites existing values unless the template says otherwise; unreadable attribute values fall back to these defaults. — `PolicyPlus/AdmxFile.vb:210-216` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-95390671** A list option replaces other entries of its key unless marked additive, stores plain text unless marked expandable, numbers entries automatically unless the template says the person names them, and counts as prefixed only when a value prefix is given. — `PolicyPlus/AdmxFile.vb:217-224` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-61990816** A choice option is optional unless marked required. … — `PolicyPlus/AdmxFile.vb:225-243` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-92899810** A policy option of any kind other than number, yes/no, text, list, choice or multi-line text is dropped without notice. — `PolicyPlus/AdmxFile.vb:244-254`; also rests on `PolicyPlus/AdmxFile.vb:198-246` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
  - **BR-23867676** An option's registry value name is taken from its own value name, except for a list option that has a value prefix attribute: the prefix is used and the own value name only when that prefix is empty. … — `PolicyPlus/AdmxFile.vb:248-250`; also rests on `PolicyPlus/AdmxFile.vb:222-224` (also used by Browsing policy definitions, Getting Microsoft policy definitions)
- `PolicyPlus/CmtxFile.vb`
  - **BR-80198306** A comment file is refused as unreadable when it has no comment-definitions section, a namespace entry without a prefix, a comment without a policy reference, a text without an id, or a repeated prefix, policy reference or text id. … — `PolicyPlus/CmtxFile.vb:13-44`; also rests on `PolicyPlus/Main.vb:337-343` (also used by Choosing and saving policy sources)
  - **BR-95982343** No comment of a comment file can be read when any comment's policy reference has no colon or a prefix that is not declared, its text is not written as "$(resource.<id>)", its text id is missing, or two comments resolve to the same policy. — `PolicyPlus/CmtxFile.vb:69-76`; also rests on `PolicyPlus/Main.vb:337-343` (also used by Choosing and saving policy sources)
- `PolicyPlus/ConfigurationStorage.vb`
  - **BR-77612083** When the program's settings area in the registry cannot be opened or created, the program carries on without it: settings read as their defaults, changes are dropped, and the person is not told, so settings are not remembered between runs. — `PolicyPlus/ConfigurationStorage.vb:5-9`; also rests on `PolicyPlus/ConfigurationStorage.vb:12`, `PolicyPlus/ConfigurationStorage.vb:15`, `PolicyPlus/ConfigurationStorage.vb:18`
- `PolicyPlus/PolicyLoader.vb`
  - **BR-37182202** The path of a policy source is fixed by its kind: Local GPO uses the Registry.pol file of the system's local Group Policy (user or machine folder) and its gpt.ini; a per-user GPO uses the folder named by the person's SID under GroupPolicyUsers; a POL file and a user hive use the path given; Scratch space has none. — `PolicyPlus/PolicyLoader.vb:16-19`; also rests on `PolicyPlus/PolicyLoader.vb:40-47` (also used by Choosing and saving policy sources)
  - **BR-49645879** A registry source must start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any case); otherwise it is refused with "The root key is not valid." A path after the root is opened, and created if missing. — `PolicyPlus/PolicyLoader.vb:20-37` (also used by Choosing and saving policy sources)
  - **BR-90862562** A registry source counts as writable only when a test value can be written under Software\Policies and removed again; otherwise it is read-only. — `PolicyPlus/PolicyLoader.vb:52-61` (also used by Choosing and saving policy sources)
  - **BR-06011599** A user hive source is mounted by loading the hive file under a fresh temporary name in the machine registry, after the backup and restore privileges are switched on. … — `PolicyPlus/PolicyLoader.vb:62-79` (also used by Choosing and saving policy sources)
  - **BR-07794280** A Scratch space source is an empty policy store that can be changed but is never saved anywhere. — `PolicyPlus/PolicyLoader.vb:80-81` (also used by Choosing and saving policy sources)
  - **BR-91850050** A source read through the file branch covers a POL file, the local Group Policy and a per-user Group Policy, each with a Registry.pol path. … — `PolicyPlus/PolicyLoader.vb:83-92`; also rests on `PolicyPlus/PolicyLoader.vb:16-19`, `PolicyPlus/PolicyLoader.vb:40-47`; **disputed** (also used by Choosing and saving policy sources)
  - **BR-52738237** When the Registry.pol of a POL file source, the local Group Policy or a per-user Group Policy does not exist, it is created empty with its folder and treated as writable; a mistyped SID therefore creates a new folder and empty file under the per-user policy folder. … — `PolicyPlus/PolicyLoader.vb:93-105`; also rests on `PolicyPlus/PolicyLoader.vb:16-19`, `PolicyPlus/PolicyLoader.vb:40-47`; gates TR-88587247 (also used by Choosing and saving policy sources)
  - **BR-61394212** When a source is closed, a mounted user hive is unloaded and the result tells whether unloading succeeded; every other kind of source closes successfully. — `PolicyPlus/PolicyLoader.vb:109-116` (also used by Choosing and saving policy sources)
  - **BR-81932578** The comment file for a source sits beside its file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); Scratch space has none, so comments are unavailable. — `PolicyPlus/PolicyLoader.vb:151-162` (also used by Choosing and saving policy sources)
  - **BR-96952745** A source is writable by default for Scratch space; for a registry source it is 'no writing' when the write test failed; for others it is 'no commit' when the file or hive could not be opened for writing. — `PolicyPlus/PolicyLoader.vb:163-172` (also used by Changing policy settings, Choosing and saving policy sources)
  - **BR-28853779** The source name shown in the status bar is Local GPO, Registry, File, User GPO, User hive or Scratch space, followed by the path or SID in brackets when there is one. — `PolicyPlus/PolicyLoader.vb:218-236` (also used by Choosing and saving policy sources)
- `PolicyPlus/PolicySource.vb`
  - **BR-21980743** A policy file is refused when it does not start with the 'PReg' signature, with the message 'Missing PReg signature'. — `PolicyPlus/PolicySource.vb:33` (also used by Editing policy files directly, Choosing and saving policy sources)
  - **BR-85451423** A policy file is refused when its format version is not 1, with the message 'Unknown (newer) version of POL format'. — `PolicyPlus/PolicySource.vb:34` (also used by Editing policy files directly, Choosing and saving policy sources)
  - **BR-97783570** When a policy file is read, an extra empty character after the value name, as Microsoft's documentation allows, is skipped. — `PolicyPlus/PolicySource.vb:50` (also used by Editing policy files directly, Choosing and saving policy sources)
  - **BR-57630746** When a policy file is read and the same key and value name occur twice, the later entry wins. … — `PolicyPlus/PolicySource.vb:59`; also rests on `PolicyPlus/PolicySource.vb:20-25`, `PolicyPlus/PolicySource.vb:79-82` (also used by Editing policy files directly, Choosing and saving policy sources)
  - **BR-97144286** When a policy file is saved, entries are written in alphabetical order, so a key-clearing marker is always written before the values it clears. — `PolicyPlus/PolicySource.vb:77-90`; also rests on `PolicyPlus/PolicySource.vb:16-18` (also used by Editing policy files directly, Choosing and saving policy sources)
  - **BR-68722859** When a number is saved to the live registry, an unsigned 32-bit or 64-bit number is converted to the signed number the registry stores with the same bits, and the key is created if missing. — `PolicyPlus/PolicySource.vb:374-383` (also used by Editing policy files directly, Changing policy settings, Choosing and saving policy sources)
- `PolicyPlus/XmlExtensions.vb`
  - **BR-20753656** An XML attribute that is absent gives nothing. — `PolicyPlus/XmlExtensions.vb:6-8` (also used by Browsing policy definitions, Getting Microsoft policy definitions, Choosing and saving policy sources)
  - **BR-84213793** An XML attribute that is absent, or whose text is not valid for the type of the stated default, gives that default. — `PolicyPlus/XmlExtensions.vb:9-16` (also used by Browsing policy definitions, Getting Microsoft policy definitions)


## Data and states
- Policy setting: reads and saves; kept in Computer file system folders, Windows registry policy keys and loaded user hives
- Administrative template: reads; kept in Active Directory domain, Administrative template files (ADMX and ADML), Computer file system folders, Microsoft download site
- Program preference: reads and saves; kept in Windows registry settings key of Policy Plus
- Policy comment: reads and saves; kept in Computer file system folders, Policy comment files (CMTX)

Life of Administrative template
```mermaid
stateDiagram-v2
  direction LR
  state "Downloaded package" as s1
  state "Unpacked" as s2
  state "Installed in a template folder" as s3
  state "Loaded into the workspace" as s4
  state "Available as policy definitions" as s5
  state "Cleared from the workspace" as s6
  s1 --> s2 : TR-01601518
  s2 --> s3 : TR-84472391
  s4 --> s5 : TR-40406069
  s4 --> s6 : TR-41291404
  s5 --> s6 : TR-41291404
  s4 --> s6 : TR-92493091
  s5 --> s6 : TR-92493091
  s4 --> s6 : TR-27627314
  s5 --> s6 : TR-27627314
  [*] --> s1 : TR-33372599
  s3 --> s4 : TR-86518382
  s5 --> s4 : TR-86518382
```

| Change | From | To | Written at | In this code | Reading |
| --- | --- | --- | --- | --- | --- |
| TR-01601518 | Downloaded package | Unpacked | `PolicyPlus/DownloadAdmx.vb:89-93` | no | reviewed |
| TR-84472391 | Unpacked | Installed in a template folder | `PolicyPlus/DownloadAdmx.vb:103-111` | no | reviewed |
| TR-40406069 | Loaded into the workspace | Available as policy definitions | `PolicyPlus/AdmxBundle.vb:163-181` | yes | reviewed |
| TR-41291404 | Loaded into the workspace or Available as policy definitions | Cleared from the workspace | `PolicyPlus/Main.vb:391` | yes | reviewed |
| TR-92493091 | Loaded into the workspace or Available as policy definitions | Cleared from the workspace | `PolicyPlus/Main.vb:65` | yes | reviewed |
| TR-27627314 | Loaded into the workspace or Available as policy definitions | Cleared from the workspace | `PolicyPlus/Main.vb:72` | yes | reviewed |
| TR-33372599 | created | Downloaded package | `PolicyPlus/DownloadAdmx.vb:83-86` | no | reviewed |
| TR-86518382 | Installed in a template folder or Available as policy definitions | Loaded into the workspace | `PolicyPlus/AdmxBundle.vb:72-77` | yes | corrected |

Life of Policy setting
```mermaid
stateDiagram-v2
  direction LR
  state "Not configured" as s1
  state "Enabled" as s2
  state "Disabled" as s3
  state "Unclear" as s4
  [*] --> s1 : TR-88587247
```

| Change | From | To | Written at | In this code | Reading |
| --- | --- | --- | --- | --- | --- |
| TR-88587247 | created | Not configured | `PolicyPlus/PolicyLoader.vb:94-100` | yes | corrected |

Life of Program preference
```mermaid
stateDiagram-v2
  direction LR
  state "Welcome download offer not yet considered" as s1
  state "Welcome download offer considered" as s2
  state "Raw POL editing warning not yet accepted" as s3
  state "Raw POL editing warning accepted" as s4
  state "Policy sources at default Local GPO" as s5
  state "Policy sources remembered" as s6
  state "Templates folder at Windows default" as s7
  state "Templates folder chosen" as s8
  state "Language follows the system" as s9
  state "Language chosen" as s10
  s1 --> s2 : TR-31010563
  s3 --> s4 : TR-23621291
  s6 --> s5 : TR-65225985
  s5 --> s6 : TR-20340422
  s6 --> s6 : TR-20340422
  s8 --> s7 : TR-59167574
  s7 --> s8 : TR-74508233
  s8 --> s8 : TR-74508233
  s7 --> s8 : TR-21496222
  s8 --> s8 : TR-21496222
```

| Change | From | To | Written at | In this code | Reading |
| --- | --- | --- | --- | --- | --- |
| TR-31010563 | Welcome download offer not yet considered | Welcome download offer considered | `PolicyPlus/Main.vb:49` | no | reviewed |
| TR-23621291 | Raw POL editing warning not yet accepted | Raw POL editing warning accepted | `PolicyPlus/Main.vb:787` | no | corrected |
| TR-65225985 | Policy sources remembered | Policy sources at default (Local GPO) | `PolicyPlus/Main.vb:33-34` | yes | corrected |
| TR-20340422 | Policy sources at default (Local GPO) or Policy sources remembered | Policy sources remembered | `PolicyPlus/Main.vb:630-633` | no | corrected |
| TR-59167574 | Templates folder chosen | Templates folder at Windows default | `PolicyPlus/Main.vb:71` | yes | corrected |
| TR-74508233 | Templates folder at Windows default or Templates folder chosen | Templates folder chosen | `PolicyPlus/Main.vb:517` | no | corrected |
| TR-21496222 | Templates folder at Windows default or Templates folder chosen | Templates folder chosen | `PolicyPlus/Main.vb:762` | no | corrected |

## Trust: what to doubt
**Challenged in review and kept**
- **BR-73876158** `PolicyPlus/AdmxBundle.vb:44`: The rule refuses the template at line 44, before its items are staged (lines 72-77), so it governs the same staging transition (transition-86521319960986518382) as the other refusal rules of the job (unparsable template, namespace already owned, missing language file), which all gate it. It has no gates, which the checklist counts as a defect. Add the gates to that transition. Say too that templates read before the faulty one stay staged but unbuilt, so that a later load builds them.
- **BR-91850050** `PolicyPlus/PolicyLoader.vb:83-92`: The reach is now right, but 'each with a Registry.pol path' is false for a POL file source: its path is whatever file the person typed or browsed to (line 39, OpenPol.vb browse filter is *.pol), not a Registry.pol; only the local and per-user Group Policy have a Registry.pol path (lines 18, 41). Say: a POL file at the path given, the local Group Policy and a per-user Group Policy at their Registry.pol.
- **BR-22807804** `PolicyPlus/PolicyProcessing.vb:403-421`: 'A definition with no entries, or none met, is met only when all are required' is false for 'none met'. When all are required (requireAll) the first unmet entry returns False at 408 or 416, so a definition with entries and none met is never met; when not required, no entry met falls to line 421 and returns False. Only a definition with NO entries is met, and only when all are required (421 returns the flag). Correct the clause to the empty case alone.
- **BR-98270380** `PolicyPlus/Main.vb:72-81`: The rule says the workspace 'stays empty' also when the load fails after the person chose Yes. The workspace is emptied at line 65 (and again at 72) but is not reset in the inner Catch (74-76); a load that fails after some definition files were added would leave a partly filled workspace. The lines do not show whether LoadFolder can fail after adding files, so say 'the workspace is not reset again after that failure' or confirm it from the loader before claiming it is empty.
- **BR-41132501** `PolicyPlus/AdmxFile.vb:20-33`: The clause 'a policy's category or supported-on reference' can be read as a policy that has no parent-category or supported-on entry. Such a policy is not refused by the file load: the file loads and the failure comes later, when the structures are built (AdmxBundle.vb:153 and 159 read the missing reference), which is the case the build-failure finding states. Only an entry that is present without its reference is refused here (AdmxFile.vb:191, 193). Write it as 'a policy's parent-category or supported-on entry without a reference' so a tester does not expect a refusal for a policy with no entry.

**Risks**
- **RK-74899486** [medium] A failed load of policy templates leaves the workspace inconsistent. Staged items survive and make later loads fail, partly filled lists make retries fail on duplicate names, and a download reloads after clearing the workspace, so a failure leaves it empty. Several actions reset it; others do not. (Data can end up wrong, lost or inconsistent) — at `PolicyPlus/AdmxBundle.vb:18-28`, `PolicyPlus/AdmxBundle.vb:44`, `PolicyPlus/AdmxBundle.vb:72-77`, `PolicyPlus/AdmxBundle.vb:89-126`, `PolicyPlus/AdmxBundle.vb:153-160`, and 4 more
- **RK-55763020** [medium] Applying a policy file's held changes to the live registry writes, deletes or clears whatever keys the file names. Only forgetting old values is limited to policy branches, so a crafted policy file, a different route from a REG import, can change other registry keys. (Input from outside is used without checks, so it can change what the code does) — at `PolicyPlus/PolicySource.vb:374-383`
- **RK-46585729** [medium] Comment loading and saving failures are hidden. An unreadable comment file silently disables comments for that source, a failed save is dropped so typed comments are lost, and turning on the comment filter then fails with an unhandled error. (Failures are hidden, lost or not retried) — at `PolicyPlus/CmtxFile.vb:12-44`, `PolicyPlus/CmtxFile.vb:66-77`, `PolicyPlus/Main.vb:328-344`, `PolicyPlus/Main.vb:426-430`
- **RK-90398632** [medium] Policy files and REG files are saved by overwriting in place. A failure partway leaves a truncated or damaged file, with no copy of the old one. (Data can end up wrong, lost or inconsistent) — at `PolicyPlus/PolicySource.vb:63-67`
- **RK-09803396** [medium] Policy template and comment XML files are read with default settings and no stated limit on external references. The folders or domain share they come from may be writable by others, and whether external entities resolve depends on the framework default. (Input from outside is used without checks, so it can change what the code does) — at `PolicyPlus/AdmlFile.vb:15-16`, `PolicyPlus/AdmxFile.vb:18-19`, `PolicyPlus/CmtxFile.vb:11-12`
- **RK-00344106** [medium] Results of requesting Windows privileges and loading a user registry file are discarded. The person learns a source cannot be saved, or silently gets an empty read-only source, never why. A refused privilege passes silently and fails later with an unrelated error. (Failures are hidden, lost or not retried) — at `PolicyPlus/ConfigurationStorage.vb:5-9`, `PolicyPlus/Main.vb:314-328`, `PolicyPlus/PolicyLoader.vb:63-78`, `PolicyPlus/PolicyLoader.vb:163-172`, `PolicyPlus/Privilege.vb:6-13`
- **RK-27440237** [medium] Saving a local or per-user policy writes the policy file first and the version file second. A failure on the second step, or a malformed version line that truncates the version file, leaves new settings with an old or damaged version, which Group Policy clients use to detect change. (Data can end up wrong, lost or inconsistent) — at `PolicyPlus/PolicySource.vb:63-67`
- **RK-17348566** [medium] Text typed by the person, a user identifier or a language code, is used unchecked as part of a folder path. Path characters redirect where policy and version files are created or which folder is searched for definition text, using the person's own rights. (Input from outside is used without checks, so it can change what the code does) — at `PolicyPlus/PolicyLoader.vb:40-42`, `PolicyPlus/PolicyLoader.vb:93-98`, `PolicyPlus/AdmxBundle.vb:46-47`
- **RK-58667149** [medium] The program allows TLS 1.0 and 1.1 as well as 1.2 for every web request, which is only the template download, to keep Vista working. A server or on-path party forcing an old protocol would be accepted. The download address is fixed HTTPS. (Data is protected by weak or fixed encryption) — at `PolicyPlus/Main.vb:19-20`
- **RK-17712152** [medium] Unsaved policy changes are lost without warning for sources backed by a policy file. Opening other sources or exiting closes them with no prompt. Registry sources apply at once, so lose nothing. (Data can end up wrong, lost or inconsistent) — at `PolicyPlus/Main.vb:311-315`, `PolicyPlus/Main.vb:685-687`
- **RK-05716765** [low] A failure to open or create the saved-settings registry area is silently swallowed. The program then runs without remembering anything and the person is never told. (Failures are hidden, lost or not retried) — at `PolicyPlus/ConfigurationStorage.vb:5-9`, `PolicyPlus/ConfigurationStorage.vb:14-16`
- **RK-46703143** [low] Changing or loading policy sources has no error handling. Sources are replaced one by one, so a failure leaves a mix or an empty workspace with an unhandled error. A start-up fallback still presets the failed sources, and a missing registry location stops a POL export. (Failures are hidden, lost or not retried) — at `PolicyPlus/Main.vb:25-28`, `PolicyPlus/Main.vb:29-37`, `PolicyPlus/Main.vb:311-315`
- **RK-18338823** [low] Each template states the minimum text-file revision it needs and each text file states its own, but nothing compares them. A template can be paired with text too old for it. (Data can end up wrong, lost or inconsistent) — at `PolicyPlus/AdmlFile.vb:19`, `PolicyPlus/AdmxBundle.vb:64-77`, `PolicyPlus/AdmxFile.vb:32-33`
- **RK-14502038** [low] Opening a live registry source tests writing by creating then deleting a probe value. A failure in between leaves the probe value behind, and the failure is swallowed. (Data can end up wrong, lost or inconsistent) — at `PolicyPlus/PolicyLoader.vb:52-61`
- **RK-32327045** [low] Reading a policy file trusts the length stored in each entry and the shape of the data. A damaged or hostile file can demand huge memory or fail unexplained, and REG files report no line number on error. (Input from outside is used without checks, so it can change what the code does) — at `PolicyPlus/PolicySource.vb:53-57`
- **RK-92566454** [low] The template download uses one fixed address naming a single dated Windows 11 package (26H2) and its folder layout, with no fallback. When Microsoft retires it, or a newer release appears, the feature fails until the program is rebuilt. (Releasing or running the system depends on manual or missing steps) — at `PolicyPlus/Main.vb:19-20`

**Assumed, not confirmed**
- When the person's language has no exact language folder, the folder picked among those of the same primary language is the first one the operating system lists; which that is, is not stated in code. Why unsettled: The folder listing order is left to the file system, and the template folders present are out of scope. Confirm with: the running system If wrong: A person could see a different regional variant of the policy text than expected when several variants are installed.
- The main window is a hub: it shows the policy template tree, but also the computer and user policy sources, the policy state filter, comments and saved preferences. We tie it to the template only because the tree is its main content. Why unsettled: The window holds several kinds of data at once, so no single kind of data fits it and no file says which one it is for. Confirm with: a decision If wrong: If the window belongs with policy settings instead, the template page loses one screen and the policy setting page gains it.


## Read order
| Tier | File | Lines | Why |
| --- | --- | --- | --- |
| own | `PolicyPlus/Main.vb` | whole file | starts 5 actions; decides 50 owned rules; used by 6 other capabilities |
| relied on | `PolicyPlus/AdmlFile.vb` | 11-116 | decides 9 relied-on rules; called code; used by 2 other capabilities |
| relied on | `PolicyPlus/AdmxBundle.vb` | 18-28, 34-224, 243-272 | decides 19 relied-on rules; called code; used by 3 other capabilities |
| relied on | `PolicyPlus/AdmxFile.vb` | 14-263 | decides 17 relied-on rules; called code; used by 2 other capabilities |
| relied on | `PolicyPlus/CmtxFile.vb` | 7-46, 66-77 | decides 2 relied-on rules; called code; used by 1 other capability |
| relied on | `PolicyPlus/ConfigurationStorage.vb` | 4-18 | decides 1 relied-on rule; called code; used by 4 other capabilities |
| relied on | `PolicyPlus/DetailCategory.vb` | 17-18 | called code |
| relied on | `PolicyPlus/PInvoke.vb` | 3-11 | called code; used by 3 other capabilities |
| relied on | `PolicyPlus/PolicyLoader.vb` | 11-116, 136-148, 151-172, 218-236 | decides 11 relied-on rules; called code; used by 2 other capabilities |
| relied on | `PolicyPlus/PolicyProcessing.vb` | 2-105, 380-424 | decides 13 relied-on rules; called code; used by 6 other capabilities |
| relied on | `PolicyPlus/PolicySource.vb` | 4-10, 16-91, 359-361, 365-370, 374-383, 412-415, 429-434 | decides 8 relied-on rules; called code; used by 6 other capabilities |
| relied on | `PolicyPlus/Privilege.vb` | 3-15 | called code; used by 2 other capabilities |
| relied on | `PolicyPlus/XmlExtensions.vb` | 6-16 | decides 2 relied-on rules; called code; used by 3 other capabilities |
| neighbour screen | `PolicyPlus/FindResults.vb` | 38-41 | called from this screen: Search results |
| neighbour screen | `PolicyPlus/LanguageOptions.vb` | 4-8 | called from this screen: Choose the policy language |
| neighbour screen | `PolicyPlus/OpenPol.vb` | 3-35 | called from this screen: Choose policy sources |
| generated | `PolicyPlus/Main.Designer.vb` | 410, 669-670 | generated layout; rules cite these lines, the controls table replaces the rest |

## Source

### PolicyPlus/Main.vb
```
1: ﻿Imports System.ComponentModel
2: Imports System.Text
3: Imports Microsoft.Win32
4: Public Class Main
5:     Dim Configuration As ConfigurationStorage
6:     Dim AdmxWorkspace As New AdmxBundle
7:     Dim UserPolicySource, CompPolicySource As IPolicySource
8:     Dim UserPolicyLoader, CompPolicyLoader As PolicyLoader
9:     Dim UserComments, CompComments As Dictionary(Of String, String)
10:     Dim CurrentCategory As PolicyPlusCategory
11:     Dim CurrentSetting As PolicyPlusPolicy
12:     Dim CurrentFilter As New FilterConfiguration
13:     Dim HighlightCategory As PolicyPlusCategory
14:     Dim CategoryNodes As New Dictionary(Of PolicyPlusCategory, TreeNode)
15:     Dim ViewEmptyCategories As Boolean = False
16:     Dim ViewPolicyTypes As AdmxPolicySection = AdmxPolicySection.Both
17:     Dim ViewFilteredOnly As Boolean = False
18:     Private Sub Main_Load(sender As Object, e As EventArgs) Handles MyBase.Load
19:         ' Enable the newest TLS versions supported by this Framework version (keeping Tls for Vista compatibility)
20:         Net.ServicePointManager.SecurityProtocol = Net.SecurityProtocolType.Tls Or Net.SecurityProtocolType.Tls11 Or Net.SecurityProtocolType.Tls12
21:         ' Create the configuration manager (for the Registry)
22:         Configuration = New ConfigurationStorage(RegistryHive.CurrentUser, "Software\Policy Plus")
23:         ' Restore the last ADMX source and policy loaders
24:         OpenLastAdmxSource()
25:         Dim compLoaderType As PolicyLoaderSource = Configuration.GetValue("CompSourceType", 0)
26:         Dim compLoaderData = Configuration.GetValue("CompSourceData", "")
27:         Dim userLoaderType As PolicyLoaderSource = Configuration.GetValue("UserSourceType", 0)
28:         Dim userLoaderData = Configuration.GetValue("UserSourceData", "")
29:         Try
30:             OpenPolicyLoaders(New PolicyLoader(userLoaderType, userLoaderData, True), New PolicyLoader(compLoaderType, compLoaderData, False), True)
31:         Catch ex As Exception
32:             MsgBox("The previous policy sources are not accessible. The defaults will be loaded.", MsgBoxStyle.Exclamation)
33:             Configuration.SetValue("CompSourceType", CInt(PolicyLoaderSource.LocalGpo))
34:             Configuration.SetValue("UserSourceType", CInt(PolicyLoaderSource.LocalGpo))
35:             OpenPolicyLoaders(New PolicyLoader(PolicyLoaderSource.LocalGpo, "", True), New PolicyLoader(PolicyLoaderSource.LocalGpo, "", False), True)
36:         End Try
37:         OpenPol.SetLastSources(compLoaderType, compLoaderData, userLoaderType, userLoaderData)
38:         ' Set up the UI
39:         ComboAppliesTo.Text = ComboAppliesTo.Items(0)
40:         CategoriesTree.Height -= InfoStrip.ClientSize.Height
41:         SettingInfoPanel.Height -= InfoStrip.ClientSize.Height
42:         PoliciesList.Height -= InfoStrip.ClientSize.Height
43:         InfoStrip.Items.Insert(2, New ToolStripSeparator)
44:         PopulateAdmxUi()
45:     End Sub
46:     Private Sub Main_Shown(sender As Object, e As EventArgs) Handles Me.Shown
47:         ' Check whether ADMX files probably need to be downloaded
48:         If CInt(Configuration.GetValue("CheckedPolicyDefinitions", 0)) = 0 Then
49:             Configuration.SetValue("CheckedPolicyDefinitions", 1)
50:             If (Not HasGroupPolicyInfrastructure()) AndAlso AdmxWorkspace.Categories.Values.Where(Function(c) IsOrphanCategory(c) And Not IsEmptyCategory(c)).Count() > 2 Then
51:                 If MsgBox($"Welcome to Policy Plus!{vbCrLf}{vbCrLf}Home editions do not come with the full set of policy definitions. Would you like to download them now? " +
52:                        "This can also be done later with Help | Acquire ADMX Files.", MsgBoxStyle.Information Or MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
53:                     AcquireADMXFilesToolStripMenuItem_Click(Nothing, Nothing)
54:                 End If
55:             End If
56:         End If
57:     End Sub
58:     Sub OpenLastAdmxSource()
59:         Dim defaultAdmxSource = Environment.ExpandEnvironmentVariables("%windir%\PolicyDefinitions")
60:         Dim admxSource As String = Configuration.GetValue("AdmxSource", defaultAdmxSource)
61:         Try
62:             Dim fails = AdmxWorkspace.LoadFolder(admxSource, GetPreferredLanguageCode())
63:             If DisplayAdmxLoadErrorReport(fails, True) = MsgBoxResult.No Then Throw New Exception("You decided to not use the problematic ADMX bundle.")
64:         Catch ex As Exception
65:             AdmxWorkspace = New AdmxBundle
66:             Dim loadFailReason As String = ""
67:             If admxSource <> defaultAdmxSource Then
68:                 If MsgBox("Policy definitions could not be loaded from """ & admxSource & """: " & ex.Message & vbCrLf & vbCrLf &
69:                           "Load from the default location?", MsgBoxStyle.YesNo Or MsgBoxStyle.Question) = MsgBoxResult.Yes Then
70:                     Try
71:                         Configuration.SetValue("AdmxSource", defaultAdmxSource)
72:                         AdmxWorkspace = New AdmxBundle
73:                         DisplayAdmxLoadErrorReport(AdmxWorkspace.LoadFolder(defaultAdmxSource, GetPreferredLanguageCode()))
74:                     Catch ex2 As Exception
75:                         loadFailReason = ex2.Message
76:                     End Try
77:                 End If
78:             Else
79:                 loadFailReason = ex.Message
80:             End If
81:             If loadFailReason <> "" Then MsgBox("Policy definitions could not be loaded: " & loadFailReason, MsgBoxStyle.Exclamation)
82:         End Try
83:     End Sub
84:     Sub PopulateAdmxUi()
85:         ' Populate the left categories tree
86:         CategoriesTree.Nodes.Clear()
87:         CategoryNodes.Clear()
88:         Dim addCategory As Action(Of IEnumerable(Of PolicyPlusCategory), TreeNodeCollection)
89:         addCategory = Sub(CategoryList, ParentNode)
90:                           For Each category In CategoryList.Where(AddressOf ShouldShowCategory)
91:                               Dim newNode = ParentNode.Add(category.UniqueID, category.DisplayName, GetImageIndexForCategory(category))
92:                               newNode.SelectedImageIndex = 3 ' "Go" arrow
93:                               newNode.Tag = category
94:                               CategoryNodes.Add(category, newNode)
95:                               addCategory(category.Children, newNode.Nodes)
96:                           Next
97:                       End Sub
98:         addCategory(AdmxWorkspace.Categories.Values, CategoriesTree.Nodes)
99:         CategoriesTree.Sort()
100:         CurrentCategory = Nothing
101:         UpdateCategoryListing()
102:         ClearSelections()
103:         UpdatePolicyInfo()
104:     End Sub
105:     Sub UpdateCategoryListing()
106:         ' Update the right pane to include the current category's children
107:         Dim topItemIndex As Integer?
108:         If PoliciesList.TopItem IsNot Nothing Then topItemIndex = PoliciesList.TopItem.Index
109:         Dim inSameCategory As Boolean = False
110:         PoliciesList.Items.Clear()
111:         If CurrentCategory IsNot Nothing Then
112:             If CurrentSetting IsNot Nothing AndAlso CurrentSetting.Category Is CurrentCategory Then inSameCategory = True
113:             If CurrentCategory.Parent IsNot Nothing Then ' Add the parent
114:                 Dim listItem = PoliciesList.Items.Add("Up: " & CurrentCategory.Parent.DisplayName)
115:                 listItem.Tag = CurrentCategory.Parent
116:                 listItem.ImageIndex = 6 ' Up arrow
117:                 listItem.SubItems.Add("Parent")
118:             End If
119:             For Each category In CurrentCategory.Children.Where(AddressOf ShouldShowCategory).OrderBy(Function(c) c.DisplayName) ' Add subcategories
120:                 Dim listItem = PoliciesList.Items.Add(category.DisplayName)
121:                 listItem.Tag = category
122:                 listItem.ImageIndex = GetImageIndexForCategory(category)
123:             Next
124:             For Each policy In CurrentCategory.Policies.Where(AddressOf ShouldShowPolicy).OrderBy(Function(p) p.DisplayName) ' Add policies
125:                 Dim listItem = PoliciesList.Items.Add(policy.DisplayName)
126:                 listItem.Tag = policy
127:                 listItem.ImageIndex = GetImageIndexForSetting(policy)
128:                 listItem.SubItems.Add(GetPolicyState(policy))
129:                 listItem.SubItems.Add(GetPolicyCommentText(policy))
130:                 If policy Is CurrentSetting Then ' Keep the current policy selected
131:                     listItem.Selected = True
132:                     listItem.Focused = True
133:                     listItem.EnsureVisible()
134:                 End If
135:             Next
136:             If topItemIndex.HasValue And inSameCategory Then ' Minimize the list view's jumping around when refreshing
137:                 If PoliciesList.Items.Count > topItemIndex.Value Then PoliciesList.TopItem = PoliciesList.Items(topItemIndex.Value)
138:             End If
139:             If CategoriesTree.SelectedNode Is Nothing OrElse CategoriesTree.SelectedNode.Tag IsNot CurrentCategory Then ' Update the tree view
140:                 CategoriesTree.SelectedNode = CategoryNodes(CurrentCategory)
141:             End If
142:         End If
143:     End Sub
144:     Sub UpdatePolicyInfo()
145:         ' Update the middle pane with the selected object's information
146:         Dim hasCurrentSetting = (CurrentSetting IsNot Nothing) Or (HighlightCategory IsNot Nothing) Or (CurrentCategory IsNot Nothing)
147:         PolicyTitleLabel.Visible = hasCurrentSetting
148:         PolicySupportedLabel.Visible = hasCurrentSetting
149:         If CurrentSetting IsNot Nothing Then
150:             PolicyTitleLabel.Text = CurrentSetting.DisplayName
151:             If CurrentSetting.SupportedOn Is Nothing Then
152:                 PolicySupportedLabel.Text = "(no requirements information)"
153:             Else
154:                 PolicySupportedLabel.Text = "Requirements:" & vbCrLf & CurrentSetting.SupportedOn.DisplayName
155:             End If
156:             PolicyDescLabel.Text = PrettifyDescription(CurrentSetting.DisplayExplanation)
157:             PolicyIsPrefTable.Visible = IsPreference(CurrentSetting)
158:         ElseIf HighlightCategory IsNot Nothing Or CurrentCategory IsNot Nothing Then
159:             Dim shownCategory = If(HighlightCategory, CurrentCategory)
160:             PolicyTitleLabel.Text = shownCategory.DisplayName
161:             PolicySupportedLabel.Text = If(HighlightCategory Is Nothing, "This", "The selected") & " category contains " & shownCategory.Policies.Count & " policies and " & shownCategory.Children.Count & " subcategories."
162:             PolicyDescLabel.Text = PrettifyDescription(shownCategory.DisplayExplanation)
163:             PolicyIsPrefTable.Visible = False
164:         Else
165:             PolicyDescLabel.Text = "Select an item to see its description."
166:             PolicyIsPrefTable.Visible = False
167:         End If
168:         SettingInfoPanel_ClientSizeChanged(Nothing, Nothing)
169:     End Sub
170:     Function IsOrphanCategory(Category As PolicyPlusCategory) As Boolean
171:         Return Category.Parent Is Nothing And Category.RawCategory.ParentID <> ""
172:     End Function
173:     Function IsEmptyCategory(Category As PolicyPlusCategory) As Boolean
174:         Return Category.Children.Count = 0 And Category.Policies.Count = 0
175:     End Function
176:     Function GetImageIndexForCategory(Category As PolicyPlusCategory) As Integer
177:         If IsOrphanCategory(Category) Then
178:             Return 1 ' Orphaned
179:         ElseIf IsEmptyCategory(Category) Then
180:             Return 2 ' Empty
181:         Else
182:             Return 0 ' Normal
183:         End If
184:     End Function
185:     Function GetImageIndexForSetting(Setting As PolicyPlusPolicy) As Integer
186:         If IsPreference(Setting) Then
187:             Return 7 ' Preference, not policy (exclamation mark)
188:         ElseIf Setting.RawPolicy.Elements Is Nothing OrElse Setting.RawPolicy.Elements.Count = 0 Then
189:             Return 4 ' Normal
190:         Else
191:             Return 5 ' Extra configuration
192:         End If
193:     End Function
194:     Function ShouldShowCategory(Category As PolicyPlusCategory) As Boolean
195:         ' Should this category be shown considering the current filter?
196:         If ViewEmptyCategories Then
197:             Return True
198:         Else ' Only if it has visible children
199:             Return Category.Policies.Any(AddressOf ShouldShowPolicy) OrElse Category.Children.Any(AddressOf ShouldShowCategory)
200:         End If
201:     End Function
202:     Function ShouldShowPolicy(Policy As PolicyPlusPolicy) As Boolean
203:         ' Should this policy be shown considering the current filter and active sections?
204:         If Not PolicyVisibleInSection(Policy, ViewPolicyTypes) Then Return False
205:         If ViewFilteredOnly Then
206:             If (ViewPolicyTypes And AdmxPolicySection.Machine) > 0 And PolicyVisibleInSection(Policy, AdmxPolicySection.Machine) Then
207:                 If IsPolicyVisibleAfterFilter(Policy, False) Then Return True
208:             End If
209:             If (ViewPolicyTypes And AdmxPolicySection.User) > 0 And PolicyVisibleInSection(Policy, AdmxPolicySection.User) Then
210:                 If IsPolicyVisibleAfterFilter(Policy, True) Then Return True
211:             End If
212:             Return False
213:         Else
214:             Return True
215:         End If
216:     End Function
217:     Sub MoveToVisibleCategoryAndReload()
218:         ' Move up in the categories tree until a visible one is found
219:         Dim newFocusCategory = CurrentCategory
220:         Dim newFocusPolicy = CurrentSetting
221:         Do Until newFocusCategory Is Nothing OrElse ShouldShowCategory(newFocusCategory)
222:             newFocusCategory = newFocusCategory.Parent
223:             newFocusPolicy = Nothing
224:         Loop
225:         If newFocusPolicy IsNot Nothing AndAlso Not ShouldShowPolicy(newFocusPolicy) Then newFocusPolicy = Nothing
226:         PopulateAdmxUi()
227:         CurrentCategory = newFocusCategory
228:         UpdateCategoryListing()
229:         CurrentSetting = newFocusPolicy
230:         UpdatePolicyInfo()
231:     End Sub
232:     Function GetPolicyState(Policy As PolicyPlusPolicy) As String
233:         ' Get a human-readable string describing the status of a policy, considering all active sections
234:         If ViewPolicyTypes = AdmxPolicySection.Both Then
235:             Dim userState = GetPolicyState(Policy, AdmxPolicySection.User)
236:             Dim machState = GetPolicyState(Policy, AdmxPolicySection.Machine)
237:             Dim section = Policy.RawPolicy.Section
238:             If section = AdmxPolicySection.Both Then
239:                 If userState = machState Then
240:                     Return userState & " (2)"
241:                 ElseIf userState = "Not Configured" Then
242:                     Return machState & " (C)"
243:                 ElseIf machState = "Not Configured" Then
244:                     Return userState & " (U)"
245:                 Else
246:                     Return "Mixed"
247:                 End If
248:             Else
249:                 If section = AdmxPolicySection.Machine Then Return machState & " (C)" Else Return userState & " (U)"
250:             End If
251:         Else
252:             Return GetPolicyState(Policy, ViewPolicyTypes)
253:         End If
254:     End Function
255:     Function GetPolicyState(Policy As PolicyPlusPolicy, Section As AdmxPolicySection) As String
256:         ' Get the human-readable status of a policy considering only one section
257:         Select Case PolicyProcessing.GetPolicyState(If(Section = AdmxPolicySection.Machine, CompPolicySource, UserPolicySource), Policy)
258:             Case PolicyState.Disabled
259:                 Return "Disabled"
260:             Case PolicyState.Enabled
261:                 Return "Enabled"
262:             Case PolicyState.NotConfigured
263:                 Return "Not Configured"
264:             Case Else
265:                 Return "Unknown"
266:         End Select
267:     End Function
268:     Function GetPolicyCommentText(Policy As PolicyPlusPolicy) As String
269:         ' Get the comment text to show in the Comment column, considering all active sections
270:         If ViewPolicyTypes = AdmxPolicySection.Both Then
271:             Dim userComment = GetPolicyComment(Policy, AdmxPolicySection.User)
272:             Dim compComment = GetPolicyComment(Policy, AdmxPolicySection.Machine)
273:             If userComment = "" And compComment = "" Then
274:                 Return ""
275:             ElseIf userComment <> "" And compComment <> "" Then
276:                 Return "(multiple)"
277:             ElseIf userComment <> "" Then
278:                 Return userComment
279:             Else
280:                 Return compComment
281:             End If
282:         Else
283:             Return GetPolicyComment(Policy, ViewPolicyTypes)
284:         End If
285:     End Function
286:     Function GetPolicyComment(Policy As PolicyPlusPolicy, Section As AdmxPolicySection) As String
287:         ' Get a policy's comment in one section
288:         Dim commentSource As Dictionary(Of String, String) = If(Section = AdmxPolicySection.Machine, CompComments, UserComments)
289:         If commentSource Is Nothing Then
290:             Return ""
291:         Else
292:             If commentSource.ContainsKey(Policy.UniqueID) Then Return commentSource(Policy.UniqueID) Else Return ""
293:         End If
294:     End Function
295:     Function IsPreference(Policy As PolicyPlusPolicy) As Boolean
296:         Return Policy.RawPolicy.RegistryKey <> "" And Not RegistryPolicyProxy.IsPolicyKey(Policy.RawPolicy.RegistryKey)
297:     End Function
298:     Sub ShowSettingEditor(Policy As PolicyPlusPolicy, Section As AdmxPolicySection)
299:         ' Show the Edit Policy Setting dialog for a policy and reload if changes were made
300:         If EditSetting.PresentDialog(Policy, Section, AdmxWorkspace, CompPolicySource, UserPolicySource, CompPolicyLoader, UserPolicyLoader, CompComments, UserComments) = DialogResult.OK Then
301:             ' Keep the selection where it is if possible
302:             If CurrentCategory Is Nothing OrElse ShouldShowCategory(CurrentCategory) Then UpdateCategoryListing() Else MoveToVisibleCategoryAndReload()
303:         End If
304:     End Sub
305:     Sub ClearSelections()
306:         CurrentSetting = Nothing
307:         HighlightCategory = Nothing
308:     End Sub
309:     Sub OpenPolicyLoaders(User As PolicyLoader, Computer As PolicyLoader, Quiet As Boolean)
310:         ' Create policy sources from the given loaders
311:         If CompPolicyLoader IsNot Nothing Or UserPolicyLoader IsNot Nothing Then ClosePolicySources()
312:         UserPolicyLoader = User
313:         UserPolicySource = User.OpenSource
314:         CompPolicyLoader = Computer
315:         CompPolicySource = Computer.OpenSource
316:         Dim allOk As Boolean = True
317:         Dim policyStatus = Function(Loader As PolicyLoader) As String
318:                                Select Case Loader.GetWritability
319:                                    Case PolicySourceWritability.Writable
320:                                        Return "is fully writable"
321:                                    Case PolicySourceWritability.NoCommit
322:                                        allOk = False
323:                                        Return "cannot be saved"
324:                                    Case Else ' No writing
325:                                        allOk = False
326:                                        Return "cannot be modified"
327:                                End Select
328:                            End Function
329:         Dim loadComments = Function(Loader As PolicyLoader) As Dictionary(Of String, String)
330:                                Dim cmtxPath = Loader.GetCmtxPath
331:                                If cmtxPath = "" Then
332:                                    Return Nothing
333:                                Else
334:                                    Try
335:                                        IO.Directory.CreateDirectory(IO.Path.GetDirectoryName(cmtxPath))
336:                                        If IO.File.Exists(cmtxPath) Then
337:                                            Return CmtxFile.Load(cmtxPath).ToCommentTable
338:                                        Else
339:                                            Return New Dictionary(Of String, String)
340:                                        End If
341:                                    Catch ex As Exception
342:                                        Return Nothing
343:                                    End Try
344:                                End If
345:                            End Function
346:         Dim userStatus = policyStatus(User)
347:         Dim compStatus = policyStatus(Computer)
348:         UserComments = loadComments(User)
349:         CompComments = loadComments(Computer)
350:         UserSourceLabel.Text = UserPolicyLoader.GetDisplayInfo
351:         ComputerSourceLabel.Text = CompPolicyLoader.GetDisplayInfo
352:         If allOk Then
353:             If Not Quiet Then
354:                 MsgBox("Both the user and computer policy sources are loaded and writable.", MsgBoxStyle.Information)
355:             End If
356:         Else
357:             Dim msgText = "Not all policy sources are fully writable." & vbCrLf & vbCrLf &
358:                 "The user source " & userStatus & "." & vbCrLf & vbCrLf & "The computer source " & compStatus & "."
359:             MsgBox(msgText, MsgBoxStyle.Exclamation)
360:         End If
361:     End Sub
362:     Sub ClosePolicySources()
363:         ' Clean up the policy sources
364:         Dim allOk As Boolean = True
365:         If UserPolicyLoader IsNot Nothing Then
366:             If Not UserPolicyLoader.Close() Then allOk = False
367:         End If
368:         If CompPolicyLoader IsNot Nothing Then
369:             If Not CompPolicyLoader.Close() Then allOk = False
370:         End If
371:         If Not allOk Then
372:             MsgBox("Cleanup did not complete fully because the loaded resources are open in other programs.", MsgBoxStyle.Exclamation)
373:         End If
374:     End Sub
375:     Sub ShowSearchDialog(Searcher As Func(Of PolicyPlusPolicy, Boolean))
376:         ' Show the search dialog and make it start a search if appropriate
377:         Dim result As DialogResult
378:         If Searcher Is Nothing Then
379:             result = FindResults.PresentDialog()
380:         Else
381:             result = FindResults.PresentDialogStartSearch(AdmxWorkspace, Searcher)
382:         End If
383:         If result = DialogResult.OK Then
384:             Dim selPol = FindResults.SelectedPolicy
385:             ShowSettingEditor(selPol, ViewPolicyTypes)
386:             FocusPolicy(selPol)
387:         End If
388:     End Sub
389:     Sub ClearAdmxWorkspace()
390:         ' Clear out all the per-workspace bookkeeping
391:         AdmxWorkspace = New AdmxBundle
392:         FindResults.ClearSearch()
393:     End Sub
394:     Sub FocusPolicy(Policy As PolicyPlusPolicy)
395:         ' Try to automatically select a policy in the list view
396:         If CategoryNodes.ContainsKey(Policy.Category) Then
397:             CurrentCategory = Policy.Category
398:             UpdateCategoryListing()
399:             For Each entry As ListViewItem In PoliciesList.Items
400:                 If entry.Tag Is Policy Then
401:                     entry.Selected = True
402:                     entry.Focused = True
403:                     entry.EnsureVisible()
404:                     Exit For
405:                 End If
406:             Next
407:         End If
408:     End Sub
409:     Function IsPolicyVisibleAfterFilter(Policy As PolicyPlusPolicy, IsUser As Boolean) As Boolean
410:         ' Calculate whether a policy is visible with the current filter
411:         If CurrentFilter.ManagedPolicy.HasValue Then
412:             If IsPreference(Policy) = CurrentFilter.ManagedPolicy.Value Then Return False
413:         End If
414:         If CurrentFilter.PolicyState.HasValue Then
415:             Dim policyState = PolicyProcessing.GetPolicyState(If(IsUser, UserPolicySource, CompPolicySource), Policy)
416:             Select Case CurrentFilter.PolicyState.Value
417:                 Case FilterPolicyState.Configured
418:                     If policyState = PolicyState.NotConfigured Then Return False
419:                 Case FilterPolicyState.NotConfigured
420:                     If policyState <> PolicyState.NotConfigured Then Return False
421:                 Case FilterPolicyState.Disabled
422:                     If policyState <> PolicyState.Disabled Then Return False
423:                 Case FilterPolicyState.Enabled
424:                     If policyState <> PolicyState.Enabled Then Return False
425:             End Select
426:         End If
427:         If CurrentFilter.Commented.HasValue Then
428:             Dim commentDict = If(IsUser, UserComments, CompComments)
429:             If (commentDict.ContainsKey(Policy.UniqueID) AndAlso commentDict(Policy.UniqueID) <> "") <> CurrentFilter.Commented.Value Then Return False
430:         End If
431:         If CurrentFilter.AllowedProducts IsNot Nothing Then
432:             If Not PolicyProcessing.IsPolicySupported(Policy, CurrentFilter.AllowedProducts, CurrentFilter.AlwaysMatchAny, CurrentFilter.MatchBlankSupport) Then Return False
433:         End If
434:         Return True
435:     End Function
436:     Function PolicyVisibleInSection(Policy As PolicyPlusPolicy, Section As AdmxPolicySection) As Boolean
437:         ' Does this policy apply to the given section?
438:         Return (Policy.RawPolicy.Section And Section) > 0
439:     End Function
440:     Function GetOrCreatePolFromPolicySource(Source As IPolicySource) As PolFile
441:         If TypeOf Source Is PolFile Then
442:             ' If it's already a POL, just save it
443:             Return Source
444:         ElseIf TypeOf Source Is RegistryPolicyProxy Then
445:             ' Recurse through the Registry branch and create a POL
446:             Dim regRoot = CType(Source, RegistryPolicyProxy).EncapsulatedRegistry
447:             Dim pol As New PolFile
448:             Dim addSubtree As Action(Of String, RegistryKey)
449:             addSubtree = Sub(PathRoot As String, Key As RegistryKey)
450:                              For Each valName In Key.GetValueNames
451:                                  Dim valData = Key.GetValue(valName, Nothing, RegistryValueOptions.DoNotExpandEnvironmentNames)
452:                                  pol.SetValue(PathRoot, valName, valData, Key.GetValueKind(valName))
453:                              Next
454:                              For Each subkeyName In Key.GetSubKeyNames
455:                                  Using subkey = Key.OpenSubKey(subkeyName, False)
456:                                      addSubtree(PathRoot & "\" & subkeyName, subkey)
457:                                  End Using
458:                              Next
459:                          End Sub
460:             For Each policyPath In RegistryPolicyProxy.PolicyKeys
461:                 Using policyKey = regRoot.OpenSubKey(policyPath, False)
462:                     addSubtree(policyPath, policyKey)
463:                 End Using
464:             Next
465:             Return pol
466:         Else
467:             Throw New InvalidOperationException("Policy source type not supported")
468:         End If
469:     End Function
470:     Function DisplayAdmxLoadErrorReport(Failures As IEnumerable(Of AdmxLoadFailure), Optional AskContinue As Boolean = False) As MsgBoxResult
471:         If Failures.Count = 0 Then Return MsgBoxResult.Ok
472:         Dim boxStyle = If(AskContinue, MsgBoxStyle.Exclamation Or MsgBoxStyle.YesNo, MsgBoxStyle.Exclamation)
473:         Dim header = "Errors were encountered while adding administrative templates to the workspace."
474:         Return MsgBox(header & If(AskContinue, " Continue trying to use this workspace?", "") & vbCrLf & vbCrLf &
475:                String.Join(vbCrLf & vbCrLf, Failures.Select(Function(f) f.ToString)), boxStyle)
476:     End Function
477:     Function GetPreferredLanguageCode() As String
478:         Return Configuration.GetValue("LanguageCode", Globalization.CultureInfo.CurrentCulture.Name)
479:     End Function
480:     Private Sub CategoriesTree_AfterSelect(sender As Object, e As TreeViewEventArgs) Handles CategoriesTree.AfterSelect
481:         ' When the user selects a new category in the left pane
482:         CurrentCategory = e.Node.Tag
483:         UpdateCategoryListing()
484:         ClearSelections()
485:         UpdatePolicyInfo()
486:     End Sub
487:     Private Sub ResizePolicyNameColumn(sender As Object, e As EventArgs) Handles Me.SizeChanged, PoliciesList.SizeChanged
488:         ' Fit the policy name column to the window size
489:         If IsHandleCreated Then BeginInvoke(Sub() PoliciesList.Columns(0).Width = PoliciesList.ClientSize.Width - (PoliciesList.Columns(1).Width + PoliciesList.Columns(2).Width))
490:     End Sub
491:     Private Sub PoliciesList_SelectedIndexChanged(sender As Object, e As EventArgs) Handles PoliciesList.SelectedIndexChanged
492:         ' When the user highlights an item in the right pane
493:         If PoliciesList.SelectedItems.Count > 0 Then
494:             Dim selObject = PoliciesList.SelectedItems(0).Tag
495:             If TypeOf selObject Is PolicyPlusPolicy Then
496:                 CurrentSetting = selObject
497:                 HighlightCategory = Nothing
498:             ElseIf TypeOf selObject Is PolicyPlusCategory Then
499:                 HighlightCategory = selObject
500:                 CurrentSetting = Nothing
501:             End If
502:         Else
503:             ClearSelections()
504:         End If
505:         UpdatePolicyInfo()
506:     End Sub
507:     Private Sub ExitToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ExitToolStripMenuItem.Click
508:         Close()
509:     End Sub
510:     Private Sub OpenADMXFolderToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles OpenADMXFolderToolStripMenuItem.Click
511:         ' Show the Open ADMX Folder dialog and load the policy definitions
512:         If OpenAdmxFolder.ShowDialog = DialogResult.OK Then
513:             Try
514:                 If OpenAdmxFolder.ClearWorkspace Then ClearAdmxWorkspace()
515:                 DisplayAdmxLoadErrorReport(AdmxWorkspace.LoadFolder(OpenAdmxFolder.SelectedFolder, GetPreferredLanguageCode()))
516:                 ' Only update the last source when successfully opening a complete source
517:                 If OpenAdmxFolder.ClearWorkspace Then Configuration.SetValue("AdmxSource", OpenAdmxFolder.SelectedFolder)
518:             Catch ex As Exception
519:                 MsgBox("The folder could not be fully added to the workspace. " & ex.Message, MsgBoxStyle.Exclamation)
520:             End Try
521:             PopulateAdmxUi()
522:         End If
523:     End Sub
524:     Private Sub OpenADMXFileToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles OpenADMXFileToolStripMenuItem.Click
525:         ' Open a single ADMX file
526:         Using ofd As New OpenFileDialog
527:             ofd.Filter = "Policy definitions files|*.admx"
528:             ofd.Title = "Open ADMX file"
529:             If ofd.ShowDialog <> DialogResult.OK Then Exit Sub
530:             Try
531:                 DisplayAdmxLoadErrorReport(AdmxWorkspace.LoadFile(ofd.FileName, GetPreferredLanguageCode()))
532:             Catch ex As Exception
533:                 MsgBox("The ADMX file could not be added to the workspace. " & ex.Message, MsgBoxStyle.Exclamation)
534:             End Try
535:             PopulateAdmxUi()
536:         End Using
537:     End Sub
538:     Private Sub CloseADMXWorkspaceToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles CloseADMXWorkspaceToolStripMenuItem.Click
539:         ' Close all policy definitions and clear the workspace
540:         ClearAdmxWorkspace()
541:         PopulateAdmxUi()
542:     End Sub
543:     Private Sub EmptyCategoriesToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles EmptyCategoriesToolStripMenuItem.Click
544:         ' Toggle whether empty categories are visible
545:         ViewEmptyCategories = Not ViewEmptyCategories
546:         EmptyCategoriesToolStripMenuItem.Checked = ViewEmptyCategories
547:         MoveToVisibleCategoryAndReload()
548:     End Sub
549:     Private Sub ComboAppliesTo_SelectedIndexChanged(sender As Object, e As EventArgs) Handles ComboAppliesTo.SelectedIndexChanged
550:         ' When the user chooses a different section to work with
551:         Select Case ComboAppliesTo.Text
552:             Case "User"
553:                 ViewPolicyTypes = AdmxPolicySection.User
554:             Case "Computer"
555:                 ViewPolicyTypes = AdmxPolicySection.Machine
556:             Case Else
557:                 ViewPolicyTypes = AdmxPolicySection.Both
558:         End Select
559:         MoveToVisibleCategoryAndReload()
560:     End Sub
561:     Private Sub PoliciesList_DoubleClick(sender As Object, e As EventArgs) Handles PoliciesList.DoubleClick
562:         ' When the user opens a policy object in the right pane
563:         If PoliciesList.SelectedItems.Count = 0 Then Exit Sub
564:         Dim policyItem = PoliciesList.SelectedItems(0).Tag
565:         If TypeOf policyItem Is PolicyPlusCategory Then
566:             CurrentCategory = policyItem
567:             UpdateCategoryListing()
568:         ElseIf TypeOf policyItem Is PolicyPlusPolicy Then
569:             ShowSettingEditor(policyItem, ViewPolicyTypes)
570:         End If
571:     End Sub
572:     Private Sub DeduplicatePoliciesToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles DeduplicatePoliciesToolStripMenuItem.Click
573:         ' Make otherwise-identical pairs of user and computer policies into single dual-section policies
574:         ClearSelections()
575:         Dim deduped = PolicyProcessing.DeduplicatePolicies(AdmxWorkspace)
576:         MsgBox("Deduplicated " & deduped & " policies.", MsgBoxStyle.Information)
577:         UpdateCategoryListing()
578:         UpdatePolicyInfo()
579:     End Sub
580:     Private Sub FindByIDToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ByIDToolStripMenuItem.Click
581:         ' Show the Find By ID window and try to move to the selected object
582:         FindById.AdmxWorkspace = AdmxWorkspace
583:         If FindById.ShowDialog() = DialogResult.OK Then
584:             Dim selCat = FindById.SelectedCategory
585:             Dim selPol = FindById.SelectedPolicy
586:             Dim selPro = FindById.SelectedProduct
587:             Dim selSup = FindById.SelectedSupport
588:             If selCat IsNot Nothing Then
589:                 If CategoryNodes.ContainsKey(selCat) Then
590:                     CurrentCategory = selCat
591:                     UpdateCategoryListing()
592:                 Else
593:                     MsgBox("The category is not currently visible. Change the view settings and try again.", MsgBoxStyle.Exclamation)
594:                 End If
595:             ElseIf selPol IsNot Nothing Then
596:                 ShowSettingEditor(selPol, Math.Min(ViewPolicyTypes, FindById.SelectedSection))
597:                 FocusPolicy(selPol)
598:             ElseIf selPro IsNot Nothing Then
599:                 DetailProduct.PresentDialog(selPro)
600:             ElseIf selSup IsNot Nothing Then
601:                 DetailSupport.PresentDialog(selSup)
602:             Else
603:                 MsgBox("That object could not be found.", MsgBoxStyle.Exclamation)
604:             End If
605:         End If
606:     End Sub
607:     Private Sub OpenPolicyResourcesToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles OpenPolicyResourcesToolStripMenuItem.Click
608:         ' Show the Open Policy Resources dialog and open its loaders
609:         If OpenPol.ShowDialog = DialogResult.OK Then
610:             OpenPolicyLoaders(OpenPol.SelectedUser, OpenPol.SelectedComputer, False)
611:             MoveToVisibleCategoryAndReload()
612:         End If
613:     End Sub
614:     Private Sub SavePoliciesToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles SavePoliciesToolStripMenuItem.Click
615:         ' Save policy state and comments to disk
616:         Dim saveComments = Sub(Comments As Dictionary(Of String, String), Loader As PolicyLoader)
617:                                Try
618:                                    If Comments IsNot Nothing Then CmtxFile.FromCommentTable(Comments).Save(Loader.GetCmtxPath)
619:                                Catch ex As Exception
620:                                    ' Doesn't matter, it's just comments
621:                                End Try
622:                            End Sub
623:         saveComments(UserComments, UserPolicyLoader)
624:         saveComments(CompComments, CompPolicyLoader)
625:         Try
626:             Dim compStatus = "not writable"
627:             Dim userStatus = "not writable"
628:             If CompPolicyLoader.GetWritability = PolicySourceWritability.Writable Then compStatus = CompPolicyLoader.Save
629:             If UserPolicyLoader.GetWritability = PolicySourceWritability.Writable Then userStatus = UserPolicyLoader.Save
630:             Configuration.SetValue("CompSourceType", CInt(CompPolicyLoader.Source))
631:             Configuration.SetValue("UserSourceType", CInt(UserPolicyLoader.Source))
632:             Configuration.SetValue("CompSourceData", If(CompPolicyLoader.LoaderData, ""))
633:             Configuration.SetValue("UserSourceData", If(UserPolicyLoader.LoaderData, ""))
634:             MsgBox("Success." & vbCrLf & vbCrLf & "User policies: " & userStatus & "." & vbCrLf & vbCrLf & "Computer policies: " & compStatus & ".", MsgBoxStyle.Information)
635:         Catch ex As Exception
636:             MsgBox("Saving failed!" & vbCrLf & vbCrLf & ex.Message, MsgBoxStyle.Exclamation)
637:         End Try
638:     End Sub
639:     Private Sub AboutToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles AboutToolStripMenuItem.Click
640:         ' Show author and version information if it was compiled into the program
641:         Dim about = $"Policy Plus by Ben Nordick.{vbCrLf}{vbCrLf}Available on GitHub: Fleex255/PolicyPlus."
642:         If Version.Trim() <> "" Then about &= $" Version: {Version.Trim()}."
643:         MsgBox(about, MsgBoxStyle.Information)
644:     End Sub
645:     Private Sub ByTextToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ByTextToolStripMenuItem.Click
646:         ' Show the Find By Text window and start the search
647:         If FindByText.PresentDialog(UserComments, CompComments) = DialogResult.OK Then
648:             ShowSearchDialog(FindByText.Searcher)
649:         End If
650:     End Sub
651:     Private Sub SearchResultsToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles SearchResultsToolStripMenuItem.Click
652:         ' Show the search results window but don't start a search
653:         ShowSearchDialog(Nothing)
654:     End Sub
655:     Private Sub FindNextToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles FindNextToolStripMenuItem.Click
656:         ' Move to the next policy in the search results
657:         Do
658:             Dim nextPol = FindResults.NextPolicy
659:             If nextPol Is Nothing Then
660:                 MsgBox("There are no more results that match the filter.", MsgBoxStyle.Information)
661:                 Exit Do
662:             ElseIf ShouldShowPolicy(nextPol) Then
663:                 FocusPolicy(nextPol)
664:                 Exit Do
665:             End If
666:         Loop
667:     End Sub
668:     Private Sub ByRegistryToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ByRegistryToolStripMenuItem.Click
669:         ' Show the Find By Registry window and start the search
670:         If FindByRegistry.ShowDialog = DialogResult.OK Then ShowSearchDialog(FindByRegistry.Searcher)
671:     End Sub
672:     Private Sub SettingInfoPanel_ClientSizeChanged(sender As Object, e As EventArgs) Handles SettingInfoPanel.ClientSizeChanged, SettingInfoPanel.SizeChanged
673:         ' Finagle the middle pane's UI elements
674:         SettingInfoPanel.AutoScrollMinSize = SettingInfoPanel.Size
675:         PolicyTitleLabel.MaximumSize = New Size(PolicyInfoTable.Width, 0)
676:         PolicySupportedLabel.MaximumSize = New Size(PolicyInfoTable.Width, 0)
677:         PolicyDescLabel.MaximumSize = New Size(PolicyInfoTable.Width, 0)
678:         PolicyIsPrefLabel.MaximumSize = New Size(PolicyInfoTable.Width - 22, 0) ' Leave room for the exclamation icon
679:         PolicyInfoTable.MaximumSize = New Size(SettingInfoPanel.Width - If(SettingInfoPanel.VerticalScroll.Visible, SystemInformation.VerticalScrollBarWidth, 0), 0)
680:         PolicyInfoTable.Width = PolicyInfoTable.MaximumSize.Width
681:         If PolicyInfoTable.ColumnCount > 0 Then PolicyInfoTable.ColumnStyles(0).Width = PolicyInfoTable.ClientSize.Width ' Only once everything is initialized
682:         PolicyInfoTable.PerformLayout() ' Force the table to take up its full desired size
683:         PInvoke.ShowScrollBar(SettingInfoPanel.Handle, 0, False) ' 0 means horizontal
684:     End Sub
685:     Private Sub Main_Closed(sender As Object, e As EventArgs) Handles Me.Closed
686:         ClosePolicySources() ' Make sure everything is cleaned up before quitting
687:     End Sub
688:     Private Sub PoliciesList_KeyDown(sender As Object, e As KeyEventArgs) Handles PoliciesList.KeyDown
689:         ' Activate a right pane item if the user presses Enter on it
690:         If e.KeyCode = Keys.Enter And PoliciesList.SelectedItems.Count > 0 Then PoliciesList_DoubleClick(sender, e)
691:     End Sub
692:     Private Sub FilterOptionsToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles FilterOptionsToolStripMenuItem.Click
693:         ' Show the Filter Options dialog and refresh if the filter changes
694:         If FilterOptions.PresentDialog(CurrentFilter, AdmxWorkspace) = DialogResult.OK Then
695:             CurrentFilter = FilterOptions.CurrentFilter
696:             ViewFilteredOnly = True
697:             OnlyFilteredObjectsToolStripMenuItem.Checked = True
698:             MoveToVisibleCategoryAndReload()
699:         End If
700:     End Sub
701:     Private Sub OnlyFilteredObjectsToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles OnlyFilteredObjectsToolStripMenuItem.Click
702:         ' Toggle whether the filter is used
703:         ViewFilteredOnly = Not ViewFilteredOnly
704:         OnlyFilteredObjectsToolStripMenuItem.Checked = ViewFilteredOnly
705:         MoveToVisibleCategoryAndReload()
706:     End Sub
707:     Private Sub ImportSemanticPolicyToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ImportSemanticPolicyToolStripMenuItem.Click
708:         ' Open the SPOL import dialog and apply the data
709:         If ImportSpol.ShowDialog() = DialogResult.OK Then
710:             Dim spol = ImportSpol.Spol
711:             Dim fails = spol.ApplyAll(AdmxWorkspace, UserPolicySource, CompPolicySource, UserComments, CompComments)
712:             MoveToVisibleCategoryAndReload()
713:             If fails = 0 Then
714:                 MsgBox("Semantic Policy successfully applied.", MsgBoxStyle.Information)
715:             Else
716:                 MsgBox(fails & " out of " & spol.Policies.Count & " could not be applied.", MsgBoxStyle.Exclamation)
717:             End If
718:         End If
719:     End Sub
720:     Private Sub ImportPOLToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ImportPOLToolStripMenuItem.Click
721:         ' Open a POL file and write it to a policy source
722:         Using ofd As New OpenFileDialog
723:             ofd.Filter = "POL files|*.pol"
724:             If ofd.ShowDialog = DialogResult.OK Then
725:                 Dim pol As PolFile = Nothing
726:                 Try
727:                     pol = PolFile.Load(ofd.FileName)
728:                 Catch ex As Exception
729:                     MsgBox("The POL file could not be loaded.", MsgBoxStyle.Exclamation)
730:                     Exit Sub
731:                 End Try
732:                 If OpenSection.PresentDialog(True, True) = DialogResult.OK Then
733:                     Dim section = If(OpenSection.SelectedSection = AdmxPolicySection.User, UserPolicySource, CompPolicySource)
734:                     pol.Apply(section)
735:                     MoveToVisibleCategoryAndReload()
736:                     MsgBox("POL import successful.", MsgBoxStyle.Information)
737:                 End If
738:             End If
739:         End Using
740:     End Sub
741:     Private Sub ExportPOLToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ExportPOLToolStripMenuItem.Click
742:         ' Create a POL file from a current policy source
743:         Using sfd As New SaveFileDialog
744:             sfd.Filter = "POL files|*.pol"
745:             If sfd.ShowDialog = DialogResult.OK AndAlso OpenSection.PresentDialog(True, True) = DialogResult.OK Then
746:                 Dim section = If(OpenSection.SelectedSection = AdmxPolicySection.Machine, CompPolicySource, UserPolicySource)
747:                 Try
748:                     GetOrCreatePolFromPolicySource(section).Save(sfd.FileName)
749:                     MsgBox("POL exported successfully.", MsgBoxStyle.Information)
750:                 Catch ex As Exception
751:                     MsgBox("The POL file could not be saved.", MsgBoxStyle.Exclamation)
752:                 End Try
753:             End If
754:         End Using
755:     End Sub
756:     Private Sub AcquireADMXFilesToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles AcquireADMXFilesToolStripMenuItem.Click
757:         ' Show the Acquire ADMX Files dialog and load the new ADMX files
758:         If DownloadAdmx.ShowDialog = DialogResult.OK Then
759:             If DownloadAdmx.NewPolicySourceFolder <> "" Then
760:                 ClearAdmxWorkspace()
761:                 DisplayAdmxLoadErrorReport(AdmxWorkspace.LoadFolder(DownloadAdmx.NewPolicySourceFolder, GetPreferredLanguageCode()))
762:                 Configuration.SetValue("AdmxSource", DownloadAdmx.NewPolicySourceFolder)
763:                 PopulateAdmxUi()
764:             End If
765:         End If
766:     End Sub
767:     Private Sub LoadedADMXFilesToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles LoadedADMXFilesToolStripMenuItem.Click
768:         LoadedAdmx.PresentDialog(AdmxWorkspace)
769:     End Sub
770:     Private Sub AllSupportDefinitionsToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles AllSupportDefinitionsToolStripMenuItem.Click
771:         LoadedSupportDefinitions.PresentDialog(AdmxWorkspace)
772:     End Sub
773:     Private Sub AllProductsToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles AllProductsToolStripMenuItem.Click
774:         LoadedProducts.PresentDialog(AdmxWorkspace)
775:     End Sub
776:     Private Sub EditRawPOLToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles EditRawPOLToolStripMenuItem.Click
777:         Dim userIsPol = TypeOf UserPolicySource Is PolFile
778:         Dim compIsPol = TypeOf CompPolicySource Is PolFile
779:         If Not (userIsPol Or compIsPol) Then
780:             MsgBox("Neither loaded source is backed by a POL file.", MsgBoxStyle.Exclamation)
781:             Exit Sub
782:         End If
783:         If CInt(Configuration.GetValue("EditPolDangerAcknowledged", 0)) = 0 Then
784:             If MsgBox("Caution! This tool is for very advanced users. Improper modifications may result in inconsistencies in policies' states." & vbCrLf & vbCrLf &
785:                       "Changes operate directly on the policy source, though they will not be committed to disk until you save. Are you sure you want to continue?",
786:                       MsgBoxStyle.Exclamation Or MsgBoxStyle.YesNo) = MsgBoxResult.No Then Exit Sub
787:             Configuration.SetValue("EditPolDangerAcknowledged", 1)
788:         End If
789:         If OpenSection.PresentDialog(userIsPol, compIsPol) = DialogResult.OK Then
790:             EditPol.PresentDialog(PolicyIcons, If(OpenSection.SelectedSection = AdmxPolicySection.Machine, CompPolicySource, UserPolicySource),
791:                                   OpenSection.SelectedSection = AdmxPolicySection.User)
792:         End If
793:         MoveToVisibleCategoryAndReload()
794:     End Sub
795:     Private Sub ExportREGToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ExportREGToolStripMenuItem.Click
796:         If OpenSection.PresentDialog(True, True) = DialogResult.OK Then
797:             Dim source = If(OpenSection.SelectedSection = AdmxPolicySection.Machine, CompPolicySource, UserPolicySource)
798:             ExportReg.PresentDialog("", GetOrCreatePolFromPolicySource(source), OpenSection.SelectedSection = AdmxPolicySection.User)
799:         End If
800:     End Sub
801:     Private Sub ImportREGToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles ImportREGToolStripMenuItem.Click
802:         If OpenSection.PresentDialog(True, True) = DialogResult.OK Then
803:             Dim source = If(OpenSection.SelectedSection = AdmxPolicySection.Machine, CompPolicySource, UserPolicySource)
804:             If ImportReg.PresentDialog(source) = DialogResult.OK Then MoveToVisibleCategoryAndReload()
805:         End If
806:     End Sub
807:     Private Sub SetADMLLanguageToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles SetADMLLanguageToolStripMenuItem.Click
808:         If LanguageOptions.PresentDialog(GetPreferredLanguageCode()) = DialogResult.OK Then
809:             Configuration.SetValue("LanguageCode", LanguageOptions.NewLanguage)
810:             If MsgBox("Language changes will take effect when ADML files are next loaded. Would you like to reload the workspace now?", MsgBoxStyle.YesNo Or MsgBoxStyle.Question) = MsgBoxResult.Yes Then
811:                 ClearAdmxWorkspace()
812:                 OpenLastAdmxSource()
813:                 PopulateAdmxUi()
814:             End If
815:         End If
816:     End Sub
817:     Private Sub PolicyObjectContext_Opening(sender As Object, e As CancelEventArgs) Handles PolicyObjectContext.Opening
818:         ' When the right-click menu is opened
819:         Dim showingForCategory As Boolean
820:         If PolicyObjectContext.SourceControl Is CategoriesTree Then
821:             showingForCategory = True
822:             PolicyObjectContext.Tag = CategoriesTree.SelectedNode.Tag
823:         ElseIf PoliciesList.SelectedItems.Count > 0 Then ' Shown from the main view
824:             Dim selEntryTag = PoliciesList.SelectedItems(0).Tag
825:             showingForCategory = (TypeOf selEntryTag Is PolicyPlusCategory)
826:             PolicyObjectContext.Tag = selEntryTag
827:         Else
828:             e.Cancel = True
829:             Exit Sub
830:         End If
831:         ' Items are tagged in the designer for the objects they apply to
832:         For Each item In PolicyObjectContext.Items.OfType(Of ToolStripMenuItem)
833:             Dim ok As Boolean = True
834:             If CStr(item.Tag) = "P" And showingForCategory Then ok = False
835:             If CStr(item.Tag) = "C" And Not showingForCategory Then ok = False
836:             item.Visible = ok
837:         Next
838:     End Sub
839:     Private Sub PolicyObjectContext_ItemClicked(sender As Object, e As ToolStripItemClickedEventArgs) Handles PolicyObjectContext.ItemClicked
840:         ' When the user clicks an item in the right-click menu
841:         Dim polObject = PolicyObjectContext.Tag ' The current policy object is in the Tag field
842:         If e.ClickedItem Is CmeCatOpen Then
843:             CurrentCategory = polObject
844:             UpdateCategoryListing()
845:         ElseIf e.ClickedItem Is CmePolEdit Then
846:             ShowSettingEditor(polObject, ViewPolicyTypes)
847:         ElseIf e.ClickedItem Is CmeAllDetails Then
848:             If TypeOf polObject Is PolicyPlusCategory Then
849:                 DetailCategory.PresentDialog(polObject)
850:             Else
851:                 DetailPolicy.PresentDialog(polObject)
852:             End If
853:         ElseIf e.ClickedItem Is CmePolInspectElements Then
854:             InspectPolicyElements.PresentDialog(polObject, PolicyIcons, AdmxWorkspace)
855:         ElseIf e.ClickedItem Is CmePolSpolFragment Then
856:             InspectSpolFragment.PresentDialog(polObject, AdmxWorkspace, CompPolicySource, UserPolicySource, CompComments, UserComments)
857:         End If
858:     End Sub
859:     Private Sub CategoriesTree_NodeMouseClick(sender As Object, e As TreeNodeMouseClickEventArgs) Handles CategoriesTree.NodeMouseClick
860:         ' Right-clicking doesn't actually select the node by default
861:         If e.Button = MouseButtons.Right Then CategoriesTree.SelectedNode = e.Node
862:     End Sub
863:     Shared Function PrettifyDescription(Description As String) As String
864:         ' Remove extra indentation from paragraphs
865:         Dim sb As New StringBuilder
866:         For Each line In Description.Split(vbCrLf)
867:             sb.AppendLine(line.Trim())
868:         Next
869:         Return sb.ToString().TrimEnd()
870:     End Function
871: End Class
```

### PolicyPlus/AdmlFile.vb
```
11:     Public Shared Function Load(File As String) As AdmlFile
12:         ' ADML documentation: https://technet.microsoft.com/en-us/library/cc772050(v=ws.10).aspx
13:         Dim adml As New AdmlFile
14:         adml.SourceFile = File
15:         Dim xmlDoc As New XmlDocument
16:         xmlDoc.Load(File)
17:         ' Load ADML metadata
18:         Dim policyDefinitionResources As XmlNode = xmlDoc.GetElementsByTagName("policyDefinitionResources")(0)
19:         adml.Revision = Decimal.Parse(policyDefinitionResources.Attributes("revision").Value, Globalization.CultureInfo.InvariantCulture)
20:         For Each child As XmlNode In policyDefinitionResources.ChildNodes
21:             Select Case child.LocalName
22:                 Case "displayName"
23:                     adml.DisplayName = child.InnerText
24:                 Case "description"
25:                     adml.Description = child.InnerText
26:             End Select
27:         Next
28:         ' Load localized strings
29:         Dim stringTableList = xmlDoc.GetElementsByTagName("stringTable")
30:         If stringTableList.Count > 0 Then
31:             Dim stringTable = stringTableList(0)
32:             For Each stringElement As XmlNode In stringTable.ChildNodes
33:                 If stringElement.LocalName <> "string" Then Continue For
34:                 Dim key = stringElement.Attributes("id").Value
35:                 Dim value = stringElement.InnerText
36:                 adml.StringTable.Add(key, value)
37:             Next
38:         End If
39:         ' Load presentations (UI arrangements)
40:         Dim presTableList = xmlDoc.GetElementsByTagName("presentationTable")
41:         If presTableList.Count > 0 Then
42:             Dim presTable = presTableList(0)
43:             For Each presElement As XmlNode In presTable.ChildNodes
44:                 If presElement.LocalName <> "presentation" Then Continue For
45:                 Dim presentation As New Presentation
46:                 presentation.Name = presElement.Attributes("id").Value
47:                 For Each uiElement As XmlNode In presElement.ChildNodes
48:                     Dim presPart As PresentationElement = Nothing
49:                     Select Case uiElement.LocalName
50:                         Case "text"
51:                             Dim textPart As New LabelPresentationElement
52:                             textPart.Text = uiElement.InnerText
53:                             presPart = textPart
54:                         Case "decimalTextBox"
55:                             Dim decTextPart As New NumericBoxPresentationElement
56:                             decTextPart.DefaultValue = AttributeOrDefault(uiElement, "defaultValue", 1)
57:                             decTextPart.HasSpinner = AttributeOrDefault(uiElement, "spin", True)
58:                             decTextPart.SpinnerIncrement = AttributeOrDefault(uiElement, "spinStep", 1)
59:                             decTextPart.Label = uiElement.InnerText
60:                             presPart = decTextPart
61:                         Case "textBox"
62:                             Dim textPart As New TextBoxPresentationElement
63:                             For Each textboxInfo As XmlNode In uiElement.ChildNodes
64:                                 Select Case textboxInfo.LocalName
65:                                     Case "label"
66:                                         textPart.Label = textboxInfo.InnerText
67:                                     Case "defaultValue"
68:                                         textPart.DefaultValue = textboxInfo.InnerText
69:                                 End Select
70:                             Next
71:                             presPart = textPart
72:                         Case "checkBox"
73:                             Dim checkPart As New CheckBoxPresentationElement
74:                             checkPart.DefaultState = AttributeOrDefault(uiElement, "defaultChecked", False)
75:                             checkPart.Text = uiElement.InnerText
76:                             presPart = checkPart
77:                         Case "comboBox"
78:                             Dim comboPart As New ComboBoxPresentationElement
79:                             comboPart.NoSort = AttributeOrDefault(uiElement, "noSort", False)
80:                             For Each comboInfo As XmlNode In uiElement.ChildNodes
81:                                 Select Case comboInfo.LocalName
82:                                     Case "label"
83:                                         comboPart.Label = comboInfo.InnerText
84:                                     Case "default"
85:                                         comboPart.DefaultText = comboInfo.InnerText
86:                                     Case "suggestion"
87:                                         comboPart.Suggestions.Add(comboInfo.InnerText)
88:                                 End Select
89:                             Next
90:                             presPart = comboPart
91:                         Case "dropdownList"
92:                             Dim dropPart As New DropDownPresentationElement
93:                             dropPart.NoSort = AttributeOrDefault(uiElement, "noSort", False)
94:                             dropPart.DefaultItemID = AttributeOrNull(uiElement, "defaultItem")
95:                             dropPart.Label = uiElement.InnerText
96:                             presPart = dropPart
97:                         Case "listBox"
98:                             Dim listPart As New ListPresentationElement
99:                             listPart.Label = uiElement.InnerText
100:                             presPart = listPart
101:                         Case "multiTextBox"
102:                             Dim multiTextPart As New MultiTextPresentationElement
103:                             multiTextPart.Label = uiElement.InnerText
104:                             presPart = multiTextPart
105:                     End Select
106:                     If presPart IsNot Nothing Then
107:                         If uiElement.Attributes("refId") IsNot Nothing Then presPart.ID = uiElement.Attributes("refId").Value
108:                         presPart.ElementType = uiElement.LocalName
109:                         presentation.Elements.Add(presPart)
110:                     End If
111:                 Next
112:                 adml.PresentationTable.Add(presentation.Name, presentation)
113:             Next
114:         End If
115:         Return adml
116:     End Function
```

### PolicyPlus/AdmxBundle.vb
```
18:     Public Function LoadFolder(Path As String, LanguageCode As String) As IEnumerable(Of AdmxLoadFailure)
19:         Dim fails As New List(Of AdmxLoadFailure)
20:         For Each file In Directory.EnumerateFiles(Path)
21:             If file.ToLowerInvariant.EndsWith(".admx") Then
22:                 Dim fail = AddSingleAdmx(file, LanguageCode)
23:                 If fail IsNot Nothing Then fails.Add(fail)
24:             End If
25:         Next
26:         BuildStructures()
27:         Return fails
28:     End Function
```
```
34:     Private Function AddSingleAdmx(AdmxPath As String, LanguageCode As String) As AdmxLoadFailure
35:         ' Load ADMX file
36:         Dim admx As AdmxFile, adml As AdmlFile
37:         Try
38:             admx = AdmxFile.Load(AdmxPath)
39:         Catch ex As Xml.XmlException
40:             Return New AdmxLoadFailure(AdmxLoadFailType.BadAdmxParse, AdmxPath, ex.Message)
41:         Catch ex As Exception
42:             Return New AdmxLoadFailure(AdmxLoadFailType.BadAdmx, AdmxPath, ex.Message)
43:         End Try
44:         If Namespaces.ContainsKey(admx.AdmxNamespace) Then Return New AdmxLoadFailure(AdmxLoadFailType.DuplicateNamespace, AdmxPath, admx.AdmxNamespace)
45:         ' Find the ADML file
46:         Dim fileTitle = Path.GetFileName(AdmxPath)
47:         Dim admlPath = Path.ChangeExtension(AdmxPath.Replace(fileTitle, LanguageCode & "\" & fileTitle), "adml")
48:         If Not File.Exists(admlPath) Then
49:             Dim language = LanguageCode.Split("-"c)(0)
50:             For Each langSubdir In Directory.EnumerateDirectories(Path.GetDirectoryName(AdmxPath))
51:                 Dim langSubdirTitle = Path.GetFileName(langSubdir)
52:                 If langSubdirTitle.Split("-"c)(0) = language Then
53:                     Dim similarLanguagePath = Path.ChangeExtension(AdmxPath.Replace(fileTitle, langSubdirTitle & "\" & fileTitle), "adml")
54:                     If File.Exists(similarLanguagePath) Then
55:                         admlPath = similarLanguagePath
56:                         Exit For
57:                     End If
58:                 End If
59:             Next
60:         End If
61:         If Not File.Exists(admlPath) Then admlPath = Path.ChangeExtension(AdmxPath.Replace(fileTitle, "en-US\" & fileTitle), "adml")
62:         If Not File.Exists(admlPath) Then Return New AdmxLoadFailure(AdmxLoadFailType.NoAdml, AdmxPath)
63:         ' Load the ADML
64:         Try
65:             adml = AdmlFile.Load(admlPath)
66:         Catch ex As Xml.XmlException
67:             Return New AdmxLoadFailure(AdmxLoadFailType.BadAdmlParse, AdmxPath, ex.Message)
68:         Catch ex As Exception
69:             Return New AdmxLoadFailure(AdmxLoadFailType.BadAdml, AdmxPath, ex.Message)
70:         End Try
71:         ' Stage the raw ADMX info for BuildStructures
72:         RawCategories.AddRange(admx.Categories)
73:         RawProducts.AddRange(admx.Products)
74:         RawPolicies.AddRange(admx.Policies)
75:         RawSupport.AddRange(admx.SupportedOnDefinitions)
76:         SourceFiles.Add(admx, adml)
77:         Namespaces.Add(admx.AdmxNamespace, admx)
78:         Return Nothing
79:     End Function
80:     Private Sub BuildStructures()
81:         Dim catIds As New Dictionary(Of String, PolicyPlusCategory)
82:         Dim productIds As New Dictionary(Of String, PolicyPlusProduct)
83:         Dim supIds As New Dictionary(Of String, PolicyPlusSupport)
84:         Dim polIds As New Dictionary(Of String, PolicyPlusPolicy)
85:         Dim findCatById = Function(UID As String) FindInTempOrFlat(UID, catIds, FlatCategories)
86:         Dim findSupById = Function(UID As String) FindInTempOrFlat(UID, supIds, SupportDefinitions)
87:         Dim findProductById = Function(UID As String) FindInTempOrFlat(UID, productIds, FlatProducts)
88:         ' First pass: Build the structures without resolving references
89:         For Each rawCat In RawCategories
90:             Dim cat As New PolicyPlusCategory
91:             cat.DisplayName = ResolveString(rawCat.DisplayCode, rawCat.DefinedIn)
92:             cat.DisplayExplanation = ResolveString(rawCat.ExplainCode, rawCat.DefinedIn)
93:             cat.UniqueID = QualifyName(rawCat.ID, rawCat.DefinedIn)
94:             cat.RawCategory = rawCat
95:             catIds.Add(cat.UniqueID, cat)
96:         Next
97:         For Each rawProduct In RawProducts
98:             Dim product As New PolicyPlusProduct
99:             product.DisplayName = ResolveString(rawProduct.DisplayCode, rawProduct.DefinedIn)
100:             product.UniqueID = QualifyName(rawProduct.ID, rawProduct.DefinedIn)
101:             product.RawProduct = rawProduct
102:             productIds.Add(product.UniqueID, product)
103:         Next
104:         For Each rawSup In RawSupport
105:             Dim sup As New PolicyPlusSupport
106:             sup.DisplayName = ResolveString(rawSup.DisplayCode, rawSup.DefinedIn)
107:             sup.UniqueID = QualifyName(rawSup.ID, rawSup.DefinedIn)
108:             If rawSup.Entries IsNot Nothing Then
109:                 For Each rawSupEntry In rawSup.Entries
110:                     Dim supEntry As New PolicyPlusSupportEntry
111:                     supEntry.RawSupportEntry = rawSupEntry
112:                     sup.Elements.Add(supEntry)
113:                 Next
114:             End If
115:             sup.RawSupport = rawSup
116:             supIds.Add(sup.UniqueID, sup)
117:         Next
118:         For Each rawPol In RawPolicies
119:             Dim pol As New PolicyPlusPolicy
120:             pol.DisplayExplanation = ResolveString(rawPol.ExplainCode, rawPol.DefinedIn)
121:             pol.DisplayName = ResolveString(rawPol.DisplayCode, rawPol.DefinedIn)
122:             If rawPol.PresentationID <> "" Then pol.Presentation = ResolvePresentation(rawPol.PresentationID, rawPol.DefinedIn)
123:             pol.UniqueID = QualifyName(rawPol.ID, rawPol.DefinedIn)
124:             pol.RawPolicy = rawPol
125:             polIds.Add(pol.UniqueID, pol)
126:         Next
127:         ' Second pass: Resolve references and link structures
128:         For Each cat In catIds.Values
129:             If cat.RawCategory.ParentID <> "" Then
130:                 Dim parentCatName = ResolveRef(cat.RawCategory.ParentID, cat.RawCategory.DefinedIn)
131:                 Dim parentCat = findCatById(parentCatName)
132:                 If parentCat Is Nothing Then Continue For ' In case the parent category doesn't exist
133:                 parentCat.Children.Add(cat)
134:                 cat.Parent = parentCat
135:             End If
136:         Next
137:         For Each product In productIds.Values
138:             If product.RawProduct.Parent IsNot Nothing Then
139:                 Dim parentProductId = QualifyName(product.RawProduct.Parent.ID, product.RawProduct.DefinedIn) ' Child products can't be defined in other files
140:                 Dim parentProduct = findProductById(parentProductId)
141:                 parentProduct.Children.Add(product)
142:                 product.Parent = parentProduct
143:             End If
144:         Next
145:         For Each sup In supIds.Values
146:             For Each supEntry In sup.Elements
147:                 Dim targetId = ResolveRef(supEntry.RawSupportEntry.ProductID, sup.RawSupport.DefinedIn) ' Support or product
148:                 supEntry.Product = findProductById(targetId)
149:                 If supEntry.Product Is Nothing Then supEntry.SupportDefinition = findSupById(targetId)
150:             Next
151:         Next
152:         For Each pol In polIds.Values
153:             Dim catId = ResolveRef(pol.RawPolicy.CategoryID, pol.RawPolicy.DefinedIn)
154:             Dim ownerCat = findCatById(catId)
155:             If ownerCat IsNot Nothing Then
156:                 ownerCat.Policies.Add(pol)
157:                 pol.Category = ownerCat
158:             End If
159:             Dim supportId = ResolveRef(pol.RawPolicy.SupportedCode, pol.RawPolicy.DefinedIn)
160:             pol.SupportedOn = findSupById(supportId)
161:         Next
162:         ' Third pass: Add items to the final lists
163:         For Each cat In catIds
164:             FlatCategories.Add(cat.Key, cat.Value)
165:             If cat.Value.Parent Is Nothing Then Categories.Add(cat.Key, cat.Value)
166:         Next
167:         For Each product In productIds
168:             FlatProducts.Add(product.Key, product.Value)
169:             If product.Value.Parent Is Nothing Then Products.Add(product.Key, product.Value)
170:         Next
171:         For Each pol In polIds
172:             Policies.Add(pol.Key, pol.Value)
173:         Next
174:         For Each sup In supIds
175:             SupportDefinitions.Add(sup.Key, sup.Value)
176:         Next
177:         ' Purge the temporary partially-constructed items
178:         RawCategories.Clear()
179:         RawProducts.Clear()
180:         RawSupport.Clear()
181:         RawPolicies.Clear()
182:     End Sub
183:     Private Function FindInTempOrFlat(Of T)(UniqueID As String, TempDict As Dictionary(Of String, T), FlatDict As Dictionary(Of String, T)) As T
184:         ' Get the best available structure for an ID
185:         If TempDict.ContainsKey(UniqueID) Then
186:             Return TempDict(UniqueID)
187:         ElseIf FlatDict IsNot Nothing AndAlso FlatDict.ContainsKey(UniqueID) Then
188:             Return FlatDict(UniqueID)
189:         Else
190:             Return Nothing
191:         End If
192:     End Function
193:     Public Function ResolveString(DisplayCode As String, Admx As AdmxFile) As String
194:         ' Find a localized string from a display code
195:         If DisplayCode = "" Then Return ""
196:         If Not DisplayCode.StartsWith("$(string.") Then Return DisplayCode
197:         Dim stringId = DisplayCode.Substring(9, DisplayCode.Length - 10)
198:         Dim dict = SourceFiles(Admx).StringTable
199:         If dict.ContainsKey(stringId) Then Return dict(stringId) Else Return DisplayCode
200:     End Function
201:     Public Function ResolvePresentation(DisplayCode As String, Admx As AdmxFile) As Presentation
202:         ' Find a presentation from a code
203:         If Not DisplayCode.StartsWith("$(presentation.") Then Return Nothing
204:         Dim presId = DisplayCode.Substring(15, DisplayCode.Length - 16)
205:         Dim dict = SourceFiles(Admx).PresentationTable
206:         If dict.ContainsKey(presId) Then Return dict(presId) Else Return Nothing
207:     End Function
208:     Private Function QualifyName(ID As String, Admx As AdmxFile) As String
209:         Return Admx.AdmxNamespace & ":" & ID
210:     End Function
211:     Private Function ResolveRef(Ref As String, Admx As AdmxFile) As String
212:         ' Get a fully qualified name from a code and the current scope
213:         If Ref.Contains(":") Then
214:             Dim parts = Split(Ref, ":", 2)
215:             If Admx.Prefixes.ContainsKey(parts(0)) Then
216:                 Dim srcNamespace = Admx.Prefixes(parts(0))
217:                 Return srcNamespace & ":" & parts(1)
218:             Else
219:                 Return Ref ' Assume a literal
220:             End If
221:         Else
222:             Return QualifyName(Ref, Admx)
223:         End If
224:     End Function
```
```
243:     Public Sub New(FailType As AdmxLoadFailType, AdmxPath As String, Info As String)
244:         Me.FailType = FailType
245:         Me.AdmxPath = AdmxPath
246:         Me.Info = Info
247:     End Sub
248:     Public Sub New(FailType As AdmxLoadFailType, AdmxPath As String)
249:         MyClass.New(FailType, AdmxPath, "")
250:     End Sub
251:     Public Overrides Function ToString() As String
252:         Dim failMsg = "Couldn't load " & AdmxPath & ": " & GetFailMessage(FailType, Info)
253:         If Not failMsg.EndsWith(".") Then failMsg &= "."
254:         Return failMsg
255:     End Function
256:     Private Shared Function GetFailMessage(FailType As AdmxLoadFailType, Info As String) As String
257:         Select Case FailType
258:             Case AdmxLoadFailType.BadAdmxParse
259:                 Return "The ADMX XML couldn't be parsed: " & Info
260:             Case AdmxLoadFailType.BadAdmx
261:                 Return "The ADMX is invalid: " & Info
262:             Case AdmxLoadFailType.NoAdml
263:                 Return "The corresponding ADML is missing"
264:             Case AdmxLoadFailType.BadAdmlParse
265:                 Return "The ADML XML couldn't be parsed: " & Info
266:             Case AdmxLoadFailType.BadAdml
267:                 Return "The ADML is invalid: " & Info
268:             Case AdmxLoadFailType.DuplicateNamespace
269:                 Return "The " & Info & " namespace is already owned by a different ADMX file"
270:         End Select
271:         Return If(Info = "", "An unknown error occurred", Info)
272:     End Function
```

### PolicyPlus/AdmxFile.vb
```
14:     Public Shared Function Load(File As String) As AdmxFile
15:         ' ADMX documentation: https://technet.microsoft.com/en-us/library/cc772138(v=ws.10).aspx
16:         Dim admx As New AdmxFile
17:         admx.SourceFile = File
18:         Dim xmlDoc As New XmlDocument
19:         xmlDoc.Load(File)
20:         Dim policyDefinitions = xmlDoc.GetElementsByTagName("policyDefinitions")(0)
21:         For Each child As XmlNode In policyDefinitions.ChildNodes
22:             Select Case child.LocalName
23:                 Case "policyNamespaces" ' Referenced namespaces and current namespace
24:                     For Each policyNamespace As XmlNode In child.ChildNodes
25:                         Dim prefix = policyNamespace.Attributes("prefix").Value
26:                         Dim fqNamespace = policyNamespace.Attributes("namespace").Value
27:                         If policyNamespace.LocalName = "target" Then admx.AdmxNamespace = fqNamespace
28:                         admx.Prefixes.Add(prefix, fqNamespace)
29:                     Next
30:                 Case "supersededAdm" ' The ADM file that this ADMX supersedes
31:                     admx.SupersededAdm = child.Attributes("fileName").Value
32:                 Case "resources" ' Minimum required version
33:                     admx.MinAdmlVersion = Decimal.Parse(child.Attributes("minRequiredRevision").Value, Globalization.CultureInfo.InvariantCulture)
34:                 Case "supportedOn" ' Support definitions
35:                     For Each supportInfo As XmlNode In child.ChildNodes
36:                         If supportInfo.LocalName = "definitions" Then
37:                             For Each supportDef As XmlNode In supportInfo.ChildNodes
38:                                 If supportDef.LocalName <> "definition" Then Continue For
39:                                 Dim definition As New AdmxSupportDefinition
40:                                 definition.ID = supportDef.Attributes("name").Value
41:                                 definition.DisplayCode = supportDef.Attributes("displayName").Value
42:                                 definition.Logic = AdmxSupportLogicType.Blank
43:                                 For Each logicElement As XmlNode In supportDef.ChildNodes
44:                                     Dim canLoad As Boolean = True
45:                                     If logicElement.LocalName = "or" Then
46:                                         definition.Logic = AdmxSupportLogicType.AnyOf
47:                                     ElseIf logicElement.LocalName = "and" Then
48:                                         definition.Logic = AdmxSupportLogicType.AllOf
49:                                     Else
50:                                         canLoad = False
51:                                     End If
52:                                     If canLoad Then
53:                                         definition.Entries = New List(Of AdmxSupportEntry)
54:                                         For Each conditionElement As XmlNode In logicElement.ChildNodes
55:                                             If conditionElement.LocalName = "reference" Then
56:                                                 Dim product = conditionElement.Attributes("ref").Value
57:                                                 definition.Entries.Add(New AdmxSupportEntry With {.ProductID = product, .IsRange = False})
58:                                             ElseIf conditionElement.LocalName = "range" Then
59:                                                 Dim entry As New AdmxSupportEntry With {.IsRange = True}
60:                                                 entry.ProductID = conditionElement.Attributes("ref").Value
61:                                                 Dim maxVerAttr = conditionElement.Attributes("maxVersionIndex")
62:                                                 If maxVerAttr IsNot Nothing Then entry.MaxVersion = Integer.Parse(maxVerAttr.Value)
63:                                                 Dim minVerAttr = conditionElement.Attributes("minVersionIndex")
64:                                                 If minVerAttr IsNot Nothing Then entry.MinVersion = Integer.Parse(minVerAttr.Value)
65:                                                 definition.Entries.Add(entry)
66:                                             End If
67:                                         Next
68:                                         Exit For
69:                                     End If
70:                                 Next
71:                                 definition.DefinedIn = admx
72:                                 admx.SupportedOnDefinitions.Add(definition)
73:                             Next
74:                         ElseIf supportInfo.LocalName = "products" Then ' Product definitions
75:                             Dim loadProducts As Action(Of XmlNode, String, AdmxProduct)
76:                             loadProducts = Sub(Node As XmlNode, ChildTagName As String, Parent As AdmxProduct)
77:                                                For Each subproductElement As XmlNode In Node.ChildNodes
78:                                                    If subproductElement.LocalName <> ChildTagName Then Continue For
79:                                                    Dim product As New AdmxProduct
80:                                                    product.ID = subproductElement.Attributes("name").Value
81:                                                    product.DisplayCode = subproductElement.Attributes("displayName").Value
82:                                                    If Parent IsNot Nothing Then product.Version = subproductElement.Attributes("versionIndex").Value
83:                                                    product.Parent = Parent
84:                                                    product.DefinedIn = admx
85:                                                    admx.Products.Add(product)
86:                                                    If Parent Is Nothing Then
87:                                                        product.Type = AdmxProductType.Product
88:                                                        loadProducts(subproductElement, "majorVersion", product)
89:                                                    ElseIf Parent.Parent Is Nothing Then
90:                                                        product.Type = AdmxProductType.MajorRevision
91:                                                        loadProducts(subproductElement, "minorVersion", product)
92:                                                    Else
93:                                                        product.Type = AdmxProductType.MinorRevision
94:                                                    End If
95:                                                Next
96:                                            End Sub
97:                             loadProducts(supportInfo, "product", Nothing) ' Start the recursive load
98:                         End If
99:                     Next
100:                 Case "categories" ' Categories
101:                     For Each categoryElement As XmlNode In child.ChildNodes
102:                         If categoryElement.LocalName <> "category" Then Continue For
103:                         Dim category As New AdmxCategory
104:                         category.ID = categoryElement.Attributes("name").Value
105:                         category.DisplayCode = categoryElement.Attributes("displayName").Value
106:                         category.ExplainCode = categoryElement.AttributeOrNull("explainText")
107:                         If categoryElement.HasChildNodes Then
108:                             Dim parentCatElement = categoryElement("parentCategory")
109:                             category.ParentID = parentCatElement.Attributes("ref").Value
110:                         End If
111:                         category.DefinedIn = admx
112:                         admx.Categories.Add(category)
113:                     Next
114:                 Case "policies" ' Policy settings
115:                     Dim loadRegItem = Function(Node As XmlNode) As PolicyRegistryValue
116:                                           Dim regItem As New PolicyRegistryValue
117:                                           For Each subElement As XmlNode In Node.ChildNodes
118:                                               If subElement.LocalName = "delete" Then
119:                                                   regItem.RegistryType = PolicyRegistryValueType.Delete
120:                                                   Exit For
121:                                               ElseIf subElement.LocalName = "decimal" Then
122:                                                   regItem.RegistryType = PolicyRegistryValueType.Numeric
123:                                                   regItem.NumberValue = subElement.Attributes("value").Value
124:                                                   Exit For
125:                                               ElseIf subElement.LocalName = "string" Then
126:                                                   regItem.RegistryType = PolicyRegistryValueType.Text
127:                                                   regItem.StringValue = subElement.InnerText
128:                                                   Exit For
129:                                               End If
130:                                           Next
131:                                           Return regItem
132:                                       End Function
133:                     Dim loadOneRegList = Function(Node As XmlNode) As PolicyRegistrySingleList
134:                                              Dim singleList As New PolicyRegistrySingleList
135:                                              singleList.DefaultRegistryKey = AttributeOrNull(Node, "defaultKey")
136:                                              singleList.AffectedValues = New List(Of PolicyRegistryListEntry)
137:                                              For Each itemElement As XmlNode In Node.ChildNodes
138:                                                  If itemElement.LocalName <> "item" Then Continue For
139:                                                  Dim listEntry As New PolicyRegistryListEntry
140:                                                  listEntry.RegistryValue = itemElement.Attributes("valueName").Value
141:                                                  listEntry.RegistryKey = AttributeOrNull(itemElement, "key")
142:                                                  For Each valElement As XmlNode In itemElement.ChildNodes
143:                                                      If valElement.LocalName = "value" Then
144:                                                          listEntry.Value = loadRegItem(valElement)
145:                                                          Exit For
146:                                                      End If
147:                                                  Next
148:                                                  singleList.AffectedValues.Add(listEntry)
149:                                              Next
150:                                              Return singleList
151:                                          End Function
152:                     Dim loadOnOffValList = Function(OnValueName As String, OffValueName As String, OnListName As String, OffListName As String, Node As XmlNode) As PolicyRegistryList
153:                                                Dim regList As New PolicyRegistryList
154:                                                For Each subElement As XmlNode In Node.ChildNodes
155:                                                    If subElement.Name = OnValueName Then
156:                                                        regList.OnValue = loadRegItem(subElement)
157:                                                    ElseIf subElement.Name = OffValueName Then
158:                                                        regList.OffValue = loadRegItem(subElement)
159:                                                    ElseIf subElement.Name = OnListName Then
160:                                                        regList.OnValueList = loadOneRegList(subElement)
161:                                                    ElseIf subElement.Name = OffListName Then
162:                                                        regList.OffValueList = loadOneRegList(subElement)
163:                                                    End If
164:                                                Next
165:                                                Return regList
166:                                            End Function
167:                     For Each polElement As XmlNode In child.ChildNodes
168:                         If polElement.LocalName <> "policy" Then Continue For
169:                         Dim policy As New AdmxPolicy
170:                         policy.ID = polElement.Attributes("name").Value
171:                         policy.DefinedIn = admx
172:                         policy.DisplayCode = polElement.Attributes("displayName").Value
173:                         policy.RegistryKey = polElement.Attributes("key").Value
174:                         Dim polClass = polElement.Attributes("class").Value
175:                         Select Case polClass
176:                             Case "Machine"
177:                                 policy.Section = AdmxPolicySection.Machine
178:                             Case "User"
179:                                 policy.Section = AdmxPolicySection.User
180:                             Case Else
181:                                 policy.Section = AdmxPolicySection.Both
182:                         End Select
183:                         policy.ExplainCode = AttributeOrNull(polElement, "explainText")
184:                         policy.PresentationID = AttributeOrNull(polElement, "presentation")
185:                         policy.ClientExtension = AttributeOrNull(polElement, "clientExtension")
186:                         policy.RegistryValue = AttributeOrNull(polElement, "valueName")
187:                         policy.AffectedValues = loadOnOffValList("enabledValue", "disabledValue", "enabledList", "disabledList", polElement)
188:                         For Each polInfo As XmlNode In polElement.ChildNodes
189:                             Select Case polInfo.LocalName
190:                                 Case "parentCategory"
191:                                     policy.CategoryID = polInfo.Attributes("ref").Value
192:                                 Case "supportedOn"
193:                                     policy.SupportedCode = polInfo.Attributes("ref").Value
194:                                 Case "elements"
195:                                     policy.Elements = New List(Of PolicyElement)
196:                                     For Each uiElement As XmlNode In polInfo.ChildNodes
197:                                         Dim entry As PolicyElement = Nothing
198:                                         Select Case uiElement.LocalName
199:                                             Case "decimal"
200:                                                 Dim decimalEntry As New DecimalPolicyElement
201:                                                 decimalEntry.Minimum = AttributeOrDefault(uiElement, "minValue", 0)
202:                                                 decimalEntry.Maximum = AttributeOrDefault(uiElement, "maxValue", UInteger.MaxValue)
203:                                                 decimalEntry.NoOverwrite = AttributeOrDefault(uiElement, "soft", False)
204:                                                 decimalEntry.StoreAsText = AttributeOrDefault(uiElement, "storeAsText", False)
205:                                                 entry = decimalEntry
206:                                             Case "boolean"
207:                                                 Dim boolEntry As New BooleanPolicyElement
208:                                                 boolEntry.AffectedRegistry = loadOnOffValList("trueValue", "falseValue", "trueList", "falseList", uiElement)
209:                                                 entry = boolEntry
210:                                             Case "text"
211:                                                 Dim textEntry As New TextPolicyElement
212:                                                 textEntry.MaxLength = AttributeOrDefault(uiElement, "maxLength", 255)
213:                                                 textEntry.Required = AttributeOrDefault(uiElement, "required", False)
214:                                                 textEntry.RegExpandSz = AttributeOrDefault(uiElement, "expandable", False)
215:                                                 textEntry.NoOverwrite = AttributeOrDefault(uiElement, "soft", False)
216:                                                 entry = textEntry
217:                                             Case "list"
218:                                                 Dim listEntry As New ListPolicyElement
219:                                                 listEntry.NoPurgeOthers = AttributeOrDefault(uiElement, "additive", False)
220:                                                 listEntry.RegExpandSz = AttributeOrDefault(uiElement, "expandable", False)
221:                                                 listEntry.UserProvidesNames = AttributeOrDefault(uiElement, "explicitValue", False)
222:                                                 listEntry.HasPrefix = (uiElement.Attributes("valuePrefix") IsNot Nothing)
223:                                                 listEntry.RegistryValue = AttributeOrNull(uiElement, "valuePrefix")
224:                                                 entry = listEntry
225:                                             Case "enum"
226:                                                 Dim enumEntry As New EnumPolicyElement
227:                                                 enumEntry.Required = AttributeOrDefault(uiElement, "required", False)
228:                                                 enumEntry.Items = New List(Of EnumPolicyElementItem)
229:                                                 For Each itemElement As XmlNode In uiElement.ChildNodes
230:                                                     If itemElement.LocalName = "item" Then
231:                                                         Dim enumItem As New EnumPolicyElementItem
232:                                                         enumItem.DisplayCode = itemElement.Attributes("displayName").Value
233:                                                         For Each valElement As XmlNode In itemElement.ChildNodes
234:                                                             If valElement.LocalName = "value" Then
235:                                                                 enumItem.Value = loadRegItem(valElement)
236:                                                             ElseIf valElement.LocalName = "valueList" Then
237:                                                                 enumItem.ValueList = loadOneRegList(valElement)
238:                                                             End If
239:                                                         Next
240:                                                         enumEntry.Items.Add(enumItem)
241:                                                     End If
242:                                                 Next
243:                                                 entry = enumEntry
244:                                             Case "multiText"
245:                                                 entry = New MultiTextPolicyElement
246:                                         End Select
247:                                         If entry IsNot Nothing Then
248:                                             entry.ClientExtension = AttributeOrNull(uiElement, "clientExtension")
249:                                             entry.RegistryKey = AttributeOrNull(uiElement, "key")
250:                                             If entry.RegistryValue = "" Then entry.RegistryValue = AttributeOrNull(uiElement, "valueName")
251:                                             entry.ID = uiElement.Attributes("id").Value
252:                                             entry.ElementType = uiElement.LocalName
253:                                             policy.Elements.Add(entry)
254:                                         End If
255:                                     Next
256:                             End Select
257:                         Next
258:                         admx.Policies.Add(policy)
259:                     Next
260:             End Select
261:         Next
262:         Return admx
263:     End Function
```

### PolicyPlus/CmtxFile.vb
```
7:     Public Shared Function Load(File As String) As CmtxFile
8:         ' CMTX documentation: https://msdn.microsoft.com/en-us/library/dn605929(v=vs.85).aspx
9:         Dim cmtx As New CmtxFile
10:         cmtx.SourceFile = File
11:         Dim xmlDoc As New XmlDocument
12:         xmlDoc.Load(File)
13:         Dim policyComments = xmlDoc.GetElementsByTagName("policyComments")(0)
14:         For Each child As XmlNode In policyComments.ChildNodes
15:             Select Case child.LocalName
16:                 Case "policyNamespaces" ' ADMX file prefixes
17:                     For Each usingElement As XmlNode In child.ChildNodes
18:                         If usingElement.LocalName <> "using" Then Continue For
19:                         Dim prefix = usingElement.AttributeOrNull("prefix")
20:                         Dim ns = usingElement.AttributeOrNull("namespace")
21:                         cmtx.Prefixes.Add(prefix, ns)
22:                     Next
23:                 Case "comments" ' Policy to comment ID mapping
24:                     For Each admTemplateElement As XmlNode In child.ChildNodes
25:                         If admTemplateElement.LocalName <> "admTemplate" Then Continue For
26:                         For Each commentElement As XmlNode In admTemplateElement.ChildNodes
27:                             If commentElement.LocalName <> "comment" Then Continue For
28:                             Dim policy = commentElement.AttributeOrNull("policyRef")
29:                             Dim text = commentElement.AttributeOrNull("commentText")
30:                             cmtx.Comments.Add(policy, text)
31:                         Next
32:                     Next
33:                 Case "resources" ' The actual comment text
34:                     For Each stringTable As XmlNode In child.ChildNodes
35:                         If stringTable.LocalName <> "stringTable" Then Continue For
36:                         For Each stringElement As XmlNode In stringTable.ChildNodes
37:                             If stringElement.LocalName <> "string" Then Continue For
38:                             Dim id = stringElement.AttributeOrNull("id")
39:                             Dim text = stringElement.InnerText
40:                             cmtx.Strings.Add(id, text)
41:                         Next
42:                     Next
43:             End Select
44:         Next
45:         Return cmtx
46:     End Function
```
```
66:     Public Function ToCommentTable() As Dictionary(Of String, String)
67:         ' Create a convenient policy-to-comment-text mapping
68:         Dim commentTable As New Dictionary(Of String, String)
69:         For Each comment In Comments
70:             Dim refParts = Split(comment.Key, ":", 2)
71:             Dim polNamespace = Prefixes(refParts(0))
72:             Dim stringRef = comment.Value
73:             Dim stringId = stringRef.Substring(11, stringRef.Length - 12) ' "$(resource." is 11 characters long
74:             commentTable.Add(polNamespace & ":" & refParts(1), Strings(stringId))
75:         Next
76:         Return commentTable
77:     End Function
```

### PolicyPlus/ConfigurationStorage.vb
```
4:     Public Sub New(RegistryBase As RegistryHive, Subkey As String)
5:         Try
6:             ConfigKey = RegistryKey.OpenBaseKey(RegistryBase, RegistryView.Default).CreateSubKey(Subkey)
7:         Catch ex As Exception
8:             ' The key couldn't be created
9:         End Try
10:     End Sub
11:     Public Function GetValue(ValueName As String, DefaultValue As Object) As Object
12:         If ConfigKey IsNot Nothing Then Return ConfigKey.GetValue(ValueName, DefaultValue) Else Return DefaultValue
13:     End Function
14:     Public Sub SetValue(ValueName As String, Data As Object)
15:         If ConfigKey IsNot Nothing Then ConfigKey.SetValue(ValueName, Data)
16:     End Sub
17:     Public Function HasValue(ValueName As String) As Boolean
18:         Return ConfigKey IsNot Nothing AndAlso ConfigKey.GetValue(ValueName) IsNot Nothing
```

### PolicyPlus/DetailCategory.vb
```
17:         ElseIf Category.RawCategory.ParentID <> "" Then
18:             ParentTextbox.Text = "<orphaned from " & Category.RawCategory.ParentID & ">"
```

### PolicyPlus/PInvoke.vb
```
3:     Declare Function ShowScrollBar Lib "user32.dll" (Handle As IntPtr, Scrollbar As Integer, Show As Boolean) As Boolean
4:     Declare Function RefreshPolicyEx Lib "userenv.dll" (IsMachine As Boolean, Options As UInteger) As Boolean
5:     Declare Unicode Function RegLoadKeyW Lib "advapi32.dll" (HiveKey As IntPtr, Subkey As String, File As String) As Integer
6:     Declare Unicode Function RegUnLoadKeyW Lib "advapi32.dll" (HiveKey As IntPtr, Subkey As String) As Integer
7:     Declare Function GetCurrentProcess Lib "kernel32.dll" () As IntPtr
8:     Declare Function OpenProcessToken Lib "advapi32.dll" (Process As IntPtr, Access As UInteger, ByRef TokenHandle As IntPtr) As Boolean
9:     Declare Function AdjustTokenPrivileges Lib "advapi32.dll" (Token As IntPtr, DisableAll As Boolean, ByRef NewState As PInvokeTokenPrivileges, BufferLength As UInteger, Null As IntPtr, ByRef ReturnLength As UInteger) As Boolean
10:     Declare Unicode Function LookupPrivilegeValueW Lib "advapi32.dll" (SystemName As String, Name As String, ByRef LUID As PInvokeLuid) As Boolean
11:     Declare Function CloseHandle Lib "kernel32.dll" (Handle As IntPtr) As Boolean
```

### PolicyPlus/PolicyLoader.vb
```
11:     Public Sub New(Source As PolicyLoaderSource, Argument As String, IsUser As Boolean)
12:         SourceType = Source
13:         User = IsUser
14:         OriginalArgument = Argument
15:         ' Parse the argument and open the physical resource
16:         Select Case Source
17:             Case PolicyLoaderSource.LocalGpo
18:                 MainSourcePath = Environment.ExpandEnvironmentVariables("%SYSTEMROOT%\System32\GroupPolicy\" & If(IsUser, "User", "Machine") & "\Registry.pol")
19:                 GptIniPath = Environment.ExpandEnvironmentVariables("%SYSTEMROOT%\System32\GroupPolicy\gpt.ini")
20:             Case PolicyLoaderSource.LocalRegistry
21:                 Dim pathParts = Split(Argument, "\", 2)
22:                 Dim baseName = pathParts(0).ToLowerInvariant
23:                 Dim baseKey As RegistryKey
24:                 If baseName = "hkcu" Or baseName = "hkey_current_user" Then
25:                     baseKey = RegistryKey.OpenBaseKey(RegistryHive.CurrentUser, RegistryView.Default)
26:                 ElseIf baseName = "hku" Or baseName = "hkey_users" Then
27:                     baseKey = RegistryKey.OpenBaseKey(RegistryHive.Users, RegistryView.Default)
28:                 ElseIf baseName = "hklm" Or baseName = "hkey_local_machine" Then
29:                     baseKey = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Default)
30:                 Else
31:                     Throw New Exception("The root key is not valid.")
32:                 End If
33:                 If pathParts.Length = 2 Then
34:                     MainSourceRegKey = baseKey.CreateSubKey(pathParts(1))
35:                 Else
36:                     MainSourceRegKey = baseKey
37:                 End If
38:             Case PolicyLoaderSource.PolFile
39:                 MainSourcePath = Argument
40:             Case PolicyLoaderSource.SidGpo
41:                 MainSourcePath = Environment.ExpandEnvironmentVariables("%SYSTEMROOT%\System32\GroupPolicyUsers\" & Argument & "\User\Registry.pol")
42:                 GptIniPath = Environment.ExpandEnvironmentVariables("%SYSTEMROOT%\System32\GroupPolicyUsers\" & Argument & "\gpt.ini")
43:             Case PolicyLoaderSource.NtUserDat
44:                 MainSourcePath = Argument
45:             Case PolicyLoaderSource.Null
46:                 MainSourcePath = ""
47:         End Select
48:     End Sub
49:     Public Function OpenSource() As IPolicySource
50:         ' Create an IPolicySource so PolicyProcessing can work
51:         Select Case SourceType
52:             Case PolicyLoaderSource.LocalRegistry
53:                 Dim regPol = RegistryPolicyProxy.EncapsulateKey(MainSourceRegKey)
54:                 Try
55:                     regPol.SetValue("Software\Policies", "_PolicyPlusSecCheck", "Testing to see whether Policy Plus can write to policy keys", RegistryValueKind.String)
56:                     regPol.DeleteValue("Software\Policies", "_PolicyPlusSecCheck")
57:                     Writable = True
58:                 Catch ex As Exception
59:                     Writable = False
60:                 End Try
61:                 SourceObject = regPol
62:             Case PolicyLoaderSource.NtUserDat
63:                 ' Turn on the backup and restore privileges to allow the use of RegLoadKey
64:                 Privilege.EnablePrivilege("SeBackupPrivilege")
65:                 Privilege.EnablePrivilege("SeRestorePrivilege")
66:                 ' Load the hive
67:                 Using machHive = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Default)
68:                     Dim subkeyName = "PolicyPlusMount:" & Guid.NewGuid().ToString
69:                     PInvoke.RegLoadKeyW(New IntPtr(&H80000002), subkeyName, MainSourcePath) ' HKEY_LOCAL_MACHINE
70:                     MainSourceRegKey = machHive.OpenSubKey(subkeyName, True)
71:                     If MainSourceRegKey Is Nothing Then
72:                         Writable = False
73:                         SourceObject = New PolFile
74:                         Return SourceObject
75:                     Else
76:                         Writable = True
77:                     End If
78:                 End Using
79:                 SourceObject = RegistryPolicyProxy.EncapsulateKey(MainSourceRegKey)
80:             Case PolicyLoaderSource.Null
81:                 SourceObject = New PolFile
82:             Case Else
83:                 If IO.File.Exists(MainSourcePath) Then
84:                     ' Open a POL file
85:                     Try
86:                         Using fPol As New IO.FileStream(MainSourcePath, IO.FileMode.Open, IO.FileAccess.ReadWrite)
87:                             Writable = True
88:                         End Using
89:                     Catch ex As Exception
90:                         Writable = False
91:                     End Try
92:                     SourceObject = PolFile.Load(MainSourcePath)
93:                 Else
94:                     ' Create a new POL file
95:                     Try
96:                         IO.Directory.CreateDirectory(IO.Path.GetDirectoryName(MainSourcePath))
97:                         Dim pol As New PolFile
98:                         pol.Save(MainSourcePath)
99:                         SourceObject = pol
100:                         Writable = True
101:                     Catch ex As Exception
102:                         SourceObject = New PolFile
103:                         Writable = False
104:                     End Try
105:                 End If
106:         End Select
107:         Return SourceObject
108:     End Function
109:     Public Function Close() As Boolean ' Whether cleanup was successful
110:         If SourceType = PolicyLoaderSource.NtUserDat And TypeOf SourceObject Is RegistryPolicyProxy Then
111:             Dim subkeyName = Split(MainSourceRegKey.Name, "\", 2)(1) ' Remove the host hive name
112:             MainSourceRegKey.Dispose()
113:             Return PInvoke.RegUnLoadKeyW(New IntPtr(&H80000002), subkeyName) = 0
114:         End If
115:         Return True
116:     End Function
```
```
136:             Case PolicyLoaderSource.NtUserDat
137:                 Return "will apply when policy source is closed"
138:             Case PolicyLoaderSource.Null
139:                 Return "discarded"
140:             Case PolicyLoaderSource.PolFile
141:                 CType(SourceObject, PolFile).Save(MainSourcePath)
142:                 Return "saved to disk"
143:             Case PolicyLoaderSource.SidGpo
144:                 CType(SourceObject, PolFile).Save(MainSourcePath)
145:                 UpdateGptIni()
146:                 PInvoke.RefreshPolicyEx(False, 0)
147:                 Return "saved to disk and invoked policy refresh"
148:         End Select
```
```
151:     Public Function GetCmtxPath() As String
152:         ' Get the path to the comments file, or nothing if comments don't work
153:         If SourceType = PolicyLoaderSource.PolFile Or SourceType = PolicyLoaderSource.NtUserDat Then
154:             Return IO.Path.ChangeExtension(MainSourcePath, "cmtx")
155:         ElseIf SourceType = PolicyLoaderSource.LocalRegistry Then
156:             Return Environment.ExpandEnvironmentVariables("%LOCALAPPDATA%\Policy Plus\Reg" & If(User, "User", "Machine") & ".cmtx")
157:         ElseIf MainSourcePath <> "" Then
158:             Return IO.Path.Combine(IO.Path.GetDirectoryName(MainSourcePath), "comment.cmtx")
159:         Else
160:             Return ""
161:         End If
162:     End Function
163:     Public Function GetWritability() As PolicySourceWritability
164:         ' Get whether the source can be updated
165:         If SourceType = PolicyLoaderSource.Null Then
166:             Return PolicySourceWritability.Writable
167:         ElseIf SourceType = PolicyLoaderSource.LocalRegistry Then
168:             Return If(Writable, PolicySourceWritability.Writable, PolicySourceWritability.NoWriting)
169:         Else
170:             Return If(Writable, PolicySourceWritability.Writable, PolicySourceWritability.NoCommit)
171:         End If
172:     End Function
```
```
218:     Public Function GetDisplayInfo() As String
219:         ' Get the human-readable name of the loader for display in the status bar
220:         Dim name As String = ""
221:         Select Case SourceType
222:             Case PolicyLoaderSource.LocalGpo
223:                 name = "Local GPO"
224:             Case PolicyLoaderSource.LocalRegistry
225:                 name = "Registry"
226:             Case PolicyLoaderSource.PolFile
227:                 name = "File"
228:             Case PolicyLoaderSource.SidGpo
229:                 name = "User GPO"
230:             Case PolicyLoaderSource.NtUserDat
231:                 name = "User hive"
232:             Case PolicyLoaderSource.Null
233:                 name = "Scratch space"
234:         End Select
235:         If OriginalArgument <> "" Then Return name & " (" & OriginalArgument & ")" Else Return name
236:     End Function
```

### PolicyPlus/PolicyProcessing.vb
```
2:     Public Shared Function GetPolicyState(PolicySource As IPolicySource, Policy As PolicyPlusPolicy) As PolicyState
3:         ' Determine the basic state of a policy
4:         Dim enabledEvidence As Decimal = 0
5:         Dim disabledEvidence As Decimal = 0
6:         Dim rawpol = Policy.RawPolicy
7:         Dim checkOneVal = Sub(Value As PolicyRegistryValue, Key As String, ValueName As String, ByRef EvidenceVar As Decimal)
8:                               If Value Is Nothing Then Exit Sub
9:                               If ValuePresent(Value, PolicySource, Key, ValueName) Then EvidenceVar += 1
10:                           End Sub
11:         Dim checkValList = Sub(ValList As PolicyRegistrySingleList, DefaultKey As String, ByRef EvidenceVar As Decimal)
12:                                If ValList Is Nothing Then Exit Sub
13:                                Dim listKey = If(ValList.DefaultRegistryKey = "", DefaultKey, ValList.DefaultRegistryKey)
14:                                For Each regVal In ValList.AffectedValues
15:                                    Dim entryKey = If(regVal.RegistryKey = "", listKey, regVal.RegistryKey)
16:                                    checkOneVal(regVal.Value, entryKey, regVal.RegistryValue, EvidenceVar)
17:                                Next
18:                            End Sub
19:         ' Check the policy's standard Registry values
20:         If rawpol.RegistryValue <> "" Then
21:             If rawpol.AffectedValues.OnValue Is Nothing Then
22:                 checkOneVal(New PolicyRegistryValue With {.NumberValue = 1UI, .RegistryType = PolicyRegistryValueType.Numeric}, rawpol.RegistryKey, rawpol.RegistryValue, enabledEvidence)
23:             Else
24:                 checkOneVal(rawpol.AffectedValues.OnValue, rawpol.RegistryKey, rawpol.RegistryValue, enabledEvidence)
25:             End If
26:             If rawpol.AffectedValues.OffValue Is Nothing Then
27:                 checkOneVal(New PolicyRegistryValue With {.RegistryType = PolicyRegistryValueType.Delete}, rawpol.RegistryKey, rawpol.RegistryValue, disabledEvidence)
28:             Else
29:                 checkOneVal(rawpol.AffectedValues.OffValue, rawpol.RegistryKey, rawpol.RegistryValue, disabledEvidence)
30:             End If
31:         End If
32:         checkValList(rawpol.AffectedValues.OnValueList, rawpol.RegistryKey, enabledEvidence)
33:         checkValList(rawpol.AffectedValues.OffValueList, rawpol.RegistryKey, disabledEvidence)
34:         ' Check the policy's elements
35:         If rawpol.Elements IsNot Nothing Then
36:             Dim deletedElements As Decimal = 0
37:             Dim presentElements As Decimal = 0
38:             For Each elem In rawpol.Elements
39:                 Dim elemKey = If(elem.RegistryKey = "", rawpol.RegistryKey, elem.RegistryKey)
40:                 If elem.ElementType = "list" Then
41:                     Dim neededValues = 0
42:                     If PolicySource.WillDeleteValue(elemKey, "") Then
43:                         deletedElements += 1
44:                         neededValues = 1
45:                     End If
46:                     If PolicySource.GetValueNames(elemKey).Count > 0 Then
47:                         deletedElements -= neededValues
48:                         presentElements += 1
49:                     End If
50:                 ElseIf elem.ElementType = "boolean" Then
51:                     Dim booleanElem As BooleanPolicyElement = elem
52:                     If PolicySource.WillDeleteValue(elemKey, elem.RegistryValue) Then
53:                         deletedElements += 1 ' Implicit checkboxes are deleted when the policy is disabled
54:                     Else
55:                         Dim checkboxDisabled As Decimal = 0
56:                         checkOneVal(booleanElem.AffectedRegistry.OffValue, elemKey, elem.RegistryValue, checkboxDisabled)
57:                         checkValList(booleanElem.AffectedRegistry.OffValueList, elemKey, checkboxDisabled)
58:                         deletedElements += checkboxDisabled * 0.1D ' Checkboxes in the off state are weak evidence for the policy being disabled
59:                         checkOneVal(booleanElem.AffectedRegistry.OnValue, elemKey, elem.RegistryValue, presentElements)
60:                         checkValList(booleanElem.AffectedRegistry.OnValueList, elemKey, presentElements)
61:                     End If
62:                 Else
63:                     If PolicySource.WillDeleteValue(elemKey, elem.RegistryValue) Then
64:                         deletedElements += 1
65:                     ElseIf PolicySource.ContainsValue(elemKey, elem.RegistryValue) Then
66:                         presentElements += 1
67:                     End If
68:                 End If
69:             Next
70:             If presentElements > 0 Then
71:                 enabledEvidence += presentElements
72:             ElseIf deletedElements > 0 Then
73:                 disabledEvidence += deletedElements
74:             End If
75:         End If
76:         ' Judge the evidence collected
77:         If enabledEvidence > disabledEvidence Then
78:             Return PolicyState.Enabled
79:         ElseIf disabledEvidence > enabledEvidence Then
80:             Return PolicyState.Disabled
81:         ElseIf enabledEvidence = 0 Then ' No evidence for either side
82:             Return PolicyState.NotConfigured
83:         Else
84:             Return PolicyState.Unknown
85:         End If
86:     End Function
87:     Private Shared Function ValuePresent(Value As PolicyRegistryValue, Source As IPolicySource, Key As String, ValueName As String) As Boolean
88:         ' Determine whether the given value is found in the Registry
89:         Select Case Value.RegistryType
90:             Case PolicyRegistryValueType.Delete
91:                 Return Source.WillDeleteValue(Key, ValueName)
92:             Case PolicyRegistryValueType.Numeric
93:                 If Not Source.ContainsValue(Key, ValueName) Then Return False
94:                 Dim sourceVal = Source.GetValue(Key, ValueName)
95:                 If TypeOf sourceVal IsNot UInteger And TypeOf sourceVal IsNot Integer Then Return False
96:                 Return CLng(sourceVal) = Value.NumberValue
97:             Case PolicyRegistryValueType.Text
98:                 If Not Source.ContainsValue(Key, ValueName) Then Return False
99:                 Dim sourceVal = Source.GetValue(Key, ValueName)
100:                 If TypeOf sourceVal IsNot String Then Return False
101:                 Return CStr(sourceVal) = Value.StringValue
102:             Case Else
103:                 Throw New InvalidOperationException("Illegal value type")
104:         End Select
105:     End Function
```
```
380:     Public Shared Function IsPolicySupported(Policy As PolicyPlusPolicy, Products As List(Of PolicyPlusProduct), AlwaysUseAny As Boolean, ApproveLiterals As Boolean) As Boolean
381:         ' Whether a policy is supported on a computer with the given products
382:         If Policy.SupportedOn Is Nothing OrElse Policy.SupportedOn.RawSupport.Logic = AdmxSupportLogicType.Blank Then Return ApproveLiterals
383:         Dim supEntryMet = Function(SupportEntry As PolicyPlusSupportEntry) As Boolean ' Only for products (not support definitions)
384:                               If SupportEntry.Product Is Nothing Then Return ApproveLiterals
385:                               If Products.Contains(SupportEntry.Product) And Not SupportEntry.RawSupportEntry.IsRange Then Return True
386:                               If SupportEntry.Product.Children Is Nothing OrElse SupportEntry.Product.Children.Count = 0 Then Return False ' Ranges only apply to parent products
387:                               Dim rangeMin = If(SupportEntry.RawSupportEntry.MinVersion, 0)
388:                               Dim rangeMax = If(SupportEntry.RawSupportEntry.MaxVersion, SupportEntry.Product.Children.Max(Function(p) p.RawProduct.Version))
389:                               For v = rangeMin To rangeMax
390:                                   Dim version = v ' To suppress compiler warnings about iteration variable in lambdas
391:                                   Dim subproduct = SupportEntry.Product.Children.FirstOrDefault(Function(p) p.RawProduct.Version = version)
392:                                   If subproduct Is Nothing Then Continue For
393:                                   If Products.Contains(subproduct) Then Return True
394:                                   If subproduct.Children IsNot Nothing AndAlso subproduct.Children.Any(Function(p) Products.Contains(p)) Then Return True
395:                               Next
396:                               Return False
397:                           End Function
398:         Dim entriesSeen As New List(Of PolicyPlusSupport)
399:         Dim supDefMet As Func(Of PolicyPlusSupport, Boolean)
400:         supDefMet = Function(Support As PolicyPlusSupport) As Boolean
401:                         If entriesSeen.Contains(Support) Then Return False ' Cyclic dependencies
402:                         entriesSeen.Add(Support)
403:                         Dim requireAll = If(AlwaysUseAny, Support.RawSupport.Logic = AdmxSupportLogicType.AllOf, False)
404:                         ' It's much faster to check for plain products, so do that first
405:                         For Each supElem In Support.Elements.Where(Function(e) e.SupportDefinition Is Nothing)
406:                             Dim isMet = supEntryMet(supElem)
407:                             If requireAll Then
408:                                 If Not isMet Then Return False
409:                             Else
410:                                 If isMet Then Return True
411:                             End If
412:                         Next
413:                         For Each subDef In Support.Elements.Where(Function(e) e.SupportDefinition IsNot Nothing)
414:                             Dim isMet = supDefMet(subDef.SupportDefinition)
415:                             If requireAll Then
416:                                 If Not isMet Then Return False
417:                             Else
418:                                 If isMet Then Return True
419:                             End If
420:                         Next
421:                         Return requireAll ' If all were required and this function hasn't exited yet, all are matched
422:                     End Function
423:         Return supDefMet(Policy.SupportedOn)
424:     End Function
```

### PolicyPlus/PolicySource.vb
```
4:     Function ContainsValue(Key As String, Value As String) As Boolean
5:     Function GetValue(Key As String, Value As String) As Object
6:     Function WillDeleteValue(Key As String, Value As String) As Boolean
7:     Function GetValueNames(Key As String) As List(Of String)
8:     Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind)
9:     Sub ForgetValue(Key As String, Value As String) ' Stop keeping track of a value
10:     Sub DeleteValue(Key As String, Value As String) ' Mark a value as queued for deletion
```
```
16:     ' The sortedness is important because key clearances need to be processed before the addition of their values
17:     ' Fortunately, clearing entries start with **, which sorts before normal values
18:     Private ReadOnly Entries As New SortedDictionary(Of String, PolEntryData) ' Keys are lowercase Registry keys and values, separated by "\\"
19:     Private ReadOnly CasePreservation As New Dictionary(Of String, String) ' Keep track of the original cases
20:     Private Function GetDictKey(Key As String, Value As String) As String
21:         Dim origCase = Key & "\\" & Value
22:         Dim lowerCase = origCase.ToLowerInvariant
23:         If Not CasePreservation.ContainsKey(lowerCase) Then CasePreservation.Add(lowerCase, origCase)
24:         Return lowerCase
25:     End Function
26:     Public Shared Function Load(File As String) As PolFile
27:         Using fPol As New FileStream(File, FileMode.Open, FileAccess.Read), binary As New BinaryReader(fPol)
28:             Return Load(binary)
29:         End Using
30:     End Function
31:     Public Shared Function Load(Stream As BinaryReader) As PolFile
32:         Dim pol As New PolFile
33:         If Stream.ReadUInt32() <> &H67655250 Then Throw New InvalidDataException("Missing PReg signature")
34:         If Stream.ReadUInt32() <> 1 Then Throw New InvalidDataException("Unknown (newer) version of POL format")
35:         Dim readSz = Function() As String ' Read a null-terminated UTF-16LE string
36:                          Dim sb As New Text.StringBuilder
37:                          Do
38:                              Dim charCode As Integer = Stream.ReadUInt16
39:                              If charCode = 0 Then Exit Do
40:                              sb.Append(ChrW(charCode))
41:                          Loop
42:                          Return sb.ToString
43:                      End Function
44:         Do Until Stream.BaseStream.Position = Stream.BaseStream.Length
45:             Dim ped As New PolEntryData
46:             Stream.BaseStream.Position += 2 ' Skip the "[" character
47:             Dim key = readSz()
48:             Stream.BaseStream.Position += 2 ' Skip ";"
49:             Dim value = readSz()
50:             If Stream.ReadUInt16 <> Asc(";"c) Then Stream.BaseStream.Position += 2 ' MS documentation indicates there might be an extra null before the ";" after the value name
51:             ped.Kind = Stream.ReadInt32
52:             Stream.BaseStream.Position += 2 ' ";"
53:             Dim length = Stream.ReadUInt32
54:             Stream.BaseStream.Position += 2 ' ";"
55:             Dim data(length - 1) As Byte
56:             Stream.Read(data, 0, length)
57:             ped.Data = data
58:             Stream.BaseStream.Position += 2 ' "]"
59:             pol.Entries(pol.GetDictKey(key, value)) = ped
60:         Loop
61:         Return pol
62:     End Function
63:     Public Sub Save(File As String)
64:         Using fPol As New FileStream(File, FileMode.Create), binary As New BinaryWriter(fPol, Text.Encoding.Unicode)
65:             Save(binary)
66:         End Using
67:     End Sub
68:     Public Sub Save(Writer As BinaryWriter)
69:         Dim writeSz = Sub(Text As String)
70:                           For Each c In Text
71:                               Writer.Write(c)
72:                           Next
73:                           Writer.Write(0S)
74:                       End Sub
75:         Writer.Write(&H67655250UI)
76:         Writer.Write(1)
77:         For Each kv In Entries
78:             Writer.Write("["c)
79:             Dim pathparts = Split(CasePreservation(kv.Key), "\\", 2)
80:             writeSz(pathparts(0)) ' Key name
81:             Writer.Write(";"c)
82:             writeSz(pathparts(1)) ' Value name
83:             Writer.Write(";"c)
84:             Writer.Write(kv.Value.Kind)
85:             Writer.Write(";"c)
86:             Writer.Write(kv.Value.Data.Length)
87:             Writer.Write(";"c)
88:             Writer.Write(kv.Value.Data)
89:             Writer.Write("]"c)
90:         Next
91:     End Sub
```
```
359:     Public Shared Function EncapsulateKey(Key As RegistryKey) As RegistryPolicyProxy
360:         Return New RegistryPolicyProxy With {.RootKey = Key}
361:     End Function
```
```
365:     Public Sub DeleteValue(Key As String, Value As String) Implements IPolicySource.DeleteValue
366:         Using regKey = RootKey.OpenSubKey(Key, True)
367:             If regKey Is Nothing Then Exit Sub
368:             regKey.DeleteValue(Value, False)
369:         End Using
370:     End Sub
```
```
374:     Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue
375:         If TypeOf Data Is UInteger Then
376:             Data = (New ReinterpretableDword With {.Unsigned = Data}).Signed
377:         ElseIf TypeOf Data Is ULong Then
378:             Data = (New ReinterpretableQword With {.Unsigned = Data}).Signed
379:         End If
380:         Using regKey = RootKey.CreateSubKey(Key)
381:             regKey.SetValue(Value, Data, DataType)
382:         End Using
383:     End Sub
```
```
412:     Public Shared Function IsPolicyKey(KeyPath As String) As Boolean
413:         Return PolicyKeys.Any(Function(pk) KeyPath.StartsWith(pk & "\", StringComparison.InvariantCultureIgnoreCase) Or
414:                                   KeyPath.Equals(pk, StringComparison.InvariantCultureIgnoreCase))
415:     End Function
```
```
429:     Public Shared ReadOnly Property PolicyKeys As IEnumerable(Of String)
430:         Get
431:             ' Values outside these branches are not tracked by PolFile.ApplyDifference
432:             Return {"software\policies", "software\microsoft\windows\currentversion\policies", "system\currentcontrolset\policies"}
433:         End Get
434:     End Property
```

### PolicyPlus/Privilege.vb
```
3:     Public Shared Sub EnablePrivilege(Name As String)
4:         ' Enable the given Win32 privilege
5:         Dim luid As PInvokeLuid
6:         Dim priv As PInvokeTokenPrivileges
7:         Dim thisProcToken As IntPtr
8:         PInvoke.OpenProcessToken(PInvoke.GetCurrentProcess, &H28, thisProcToken) ' 0x28 = TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY
9:         PInvoke.LookupPrivilegeValueW(Nothing, Name, luid)
10:         priv.Attributes = 2 ' SE_PRIVILEGE_ENABLED
11:         priv.PrivilegeCount = 1
12:         priv.LUID = luid
13:         PInvoke.AdjustTokenPrivileges(thisProcToken, False, priv, Marshal.SizeOf(priv), IntPtr.Zero, 0)
14:         PInvoke.CloseHandle(thisProcToken)
15:     End Sub
```

### PolicyPlus/XmlExtensions.vb
```
6:     <Extension> Public Function AttributeOrNull(Node As XmlNode, Attribute As String) As String
7:         If Node.Attributes(Attribute) Is Nothing Then Return Nothing Else Return Node.Attributes(Attribute).Value
8:     End Function
9:     <Extension> Public Function AttributeOrDefault(Node As XmlNode, Attribute As String, DefaultVal As Object) As Object
10:         If Node.Attributes(Attribute) Is Nothing Then Return DefaultVal
11:         Dim converter As TypeConverter = TypeDescriptor.GetConverter(DefaultVal.GetType())
12:         If converter.IsValid(Node.Attributes(Attribute).Value) Then
13:             Return converter.ConvertFromString(Node.Attributes(Attribute).Value)
14:         End If
15:         Return DefaultVal
16:     End Function
```

### PolicyPlus/FindResults.vb
```
38:     Public Sub ClearSearch()
39:         HasSearched = False
40:         ResultsListview.Items.Clear()
41:     End Sub
```

### PolicyPlus/LanguageOptions.vb
```
4:     Public Function PresentDialog(CurrentLanguage As String) As DialogResult
5:         OriginalLanguage = CurrentLanguage
6:         TextAdmlLanguage.Text = CurrentLanguage
7:         Return ShowDialog()
8:     End Function
```

### PolicyPlus/OpenPol.vb
```
3:     Public Sub SetLastSources(ComputerType As PolicyLoaderSource, ComputerData As String, UserType As PolicyLoaderSource, UserData As String)
4:         ' Set up the UI to show the given configuration
5:         Select Case ComputerType
6:             Case PolicyLoaderSource.LocalGpo
7:                 CompLocalOption.Checked = True
8:             Case PolicyLoaderSource.LocalRegistry
9:                 CompRegistryOption.Checked = True
10:                 CompRegTextbox.Text = ComputerData
11:             Case PolicyLoaderSource.PolFile
12:                 CompFileOption.Checked = True
13:                 CompPolFilenameTextbox.Text = ComputerData
14:             Case PolicyLoaderSource.Null
15:                 CompNullOption.Checked = True
16:         End Select
17:         Select Case UserType
18:             Case PolicyLoaderSource.LocalGpo
19:                 UserLocalOption.Checked = True
20:             Case PolicyLoaderSource.LocalRegistry
21:                 UserRegistryOption.Checked = True
22:                 UserRegTextbox.Text = UserData
23:             Case PolicyLoaderSource.PolFile
24:                 UserFileOption.Checked = True
25:                 UserPolFilenameTextbox.Text = UserData
26:             Case PolicyLoaderSource.SidGpo
27:                 UserPerUserGpoOption.Checked = True
28:                 UserGpoSidTextbox.Text = UserData
29:             Case PolicyLoaderSource.NtUserDat
30:                 UserPerUserRegOption.Checked = True
31:                 UserHivePathTextbox.Text = UserData
32:             Case PolicyLoaderSource.Null
33:                 UserNullOption.Checked = True
34:         End Select
35:     End Sub
```
