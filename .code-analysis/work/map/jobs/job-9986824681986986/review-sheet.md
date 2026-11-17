# Review sheet: the code of PolicyPlus/DetailPolicy.Designer.vb and 8 more files

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- link-21183219436982032946
- link-58394312392345284369
- link-95180478991335134389
- link-22065230874202215511
- link-14578052885535665385

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/DetailPolicy.vb:7-18
PolicyPlus/DetailProduct.vb:11-21
PolicyPlus/DetailProduct.vb:32-32
PolicyPlus/DetailSupport.vb:9-11
PolicyPlus/DetailSupport.vb:27-32

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-9986824681986986/brief.json
- the code kinds, layers and external systems to choose from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/registry.jsonl

## What this stage's findings are known for
# Review checklist: The Map

Every flow is followed along these records, from an entry point until another entry point or an external system ends it; a finding that is false, or missing, moves or ends a flow. A block claims its whole lines, from its declaration to its end, and its code kind; a link claims both its ends, so a challenge to one cites a line of each; an entry point claims its purpose and title; a data definition claims each field as declared.

An entry point is where control or data enters the system's code from something that is not that code's own flow: a host, framework, scheduler, runtime or another process calls it, including a handler a person triggers. The test is who starts it and whether we hold the starter's source: code we hold that starts it makes it a step of that code's flow, and a starter we do not hold makes it an entry point.

## Wrong

- An entry point on code the system's own code starts (for example a procedure the application runs, a handler it calls): it cuts that code's flow short.
- A block given a code kind whose `membershipRule` its lines do not meet, or one another code kind's `membershipRule` admits as well; a new code kind where an entry of the registry does fit, or one named as an entry is; a block whose name is not on its declaration line; a container listed as a block; two blocks sharing their lines, or overlapping without one holding the other.
- A link whose target does not answer the reaching by the brief's rules, of the wrong kind, whose lines start outside the job, or sent from a shared helper to every target it could reach where the call site that decides the target is in the job's lines; a save sent to the wrong external system, or a new external system where an entry of the registry fits; a link from a list of files to build or package (a project or solution file naming its sources), which says what is compiled, not where work goes.
- A link to an external system for a name the code uses to start work elsewhere (a command name, a topic, an address) when a definition of that name is in scope: it names a line inside each such definition (a file `find-files-in-scope.ts` does not list is not in scope).
- A link of kind `call`, `reads` or `saves` that starts inside a `DataDefinition`: a shape holds no behaviour, so lines that name where work goes are a block (navigation links from data are the exception).
- A `dispatches` link written at a call site, pointing from a block that is not the stand-in, or guessed where the code does not show the stand-in; an interface or abstract member written as a container, so that no link can reach it.
- A `unresolvedTarget` where a search of the code settles the target.
- An entry point's `purpose` or `reachedBy` its lines do not show, or written with ids or internal terms (for example block, link, entry point) a reader would not follow.
- A screen layout whose controls are not the fields of one `DataDefinition` named for the screen (the `container` of its handlers), a control missing from it, or a caption or limit not as the layout sets it.
- A `DataDefinition` whose lines do not declare one shape, a field not declared as written, a `declares` its lines do not name.
- `fieldsUsed` its own lines do not name (for example a service's members, variables or parameters).

## Missing

- A block that overrides or implements a member, with its declaration in the job's lines, and no `dispatches` link to that member; a member declared without a body and called from the job's lines, with no block.
- A block, or a place where work leaves the job's lines, with no link; a target decided at run time reached from the job's lines with no link, what a mapping run misses most (for example implementations, listeners, registrations and configuration that name code reached from these lines).
- An entry point the brief's rules admit, a shape of data in any layer, a call into code with no source in scope, or a navigation or permission rule, starting in the job's lines with no record.
- A `Span` named as comments, imports or configuration over lines that hold code that runs: a missed block.


## The links of the job: the line that makes each and the line it reaches
link-46650983704455681225 (renders) PolicyPlus/DetailPolicy.vb:35-35: ShowDialog()  ->  PolicyPlus/DetailPolicy.Designer.vb:279: Friend WithEvents NameTextbox As TextBox
link-07291646981685565002 (reads) PolicyPlus/DetailPolicy.vb:4-34: SelectedPolicy = Policy  ->  PolicyPlus/CompiledStructures.vb:30: Public UniqueID As String
link-38334034839423634771 (call) PolicyPlus/DetailPolicy.vb:38-38: DetailSupport.PresentDialog(SelectedPolicy.SupportedOn)  ->  PolicyPlus/DetailSupport.vb:3: PrepareDialog(Supported)
link-24756423844974877578 (call) PolicyPlus/DetailPolicy.vb:41-41: DetailCategory.PresentDialog(SelectedPolicy.Category)  ->  PolicyPlus/DetailCategory.vb:4: PrepareDialog(Category)
link-86088783124849544883 (call) PolicyPlus/DetailProduct.vb:4-4: PrepareDialog(Product)  ->  PolicyPlus/DetailProduct.vb:8: SelectedProduct = Product
link-27230971450945182362 (renders) PolicyPlus/DetailProduct.vb:5-5: ShowDialog()  ->  PolicyPlus/DetailProduct.Designer.vb:264: Friend WithEvents NameTextbox As TextBox
link-41034253224859950967 (reads) PolicyPlus/DetailProduct.vb:9-36: NameTextbox.Text = Product.DisplayName  ->  PolicyPlus/CompiledStructures.vb:12: Public UniqueID As String
link-99316045104897683545 (call) PolicyPlus/DetailProduct.vb:43-43: PrepareDialog(ChildrenListview.SelectedItems(0).Tag)  ->  PolicyPlus/DetailProduct.vb:8: SelectedProduct = Product
link-53615942779369373447 (call) PolicyPlus/DetailProduct.vb:46-46: PrepareDialog(SelectedProduct.Parent)  ->  PolicyPlus/DetailProduct.vb:8: SelectedProduct = Product
link-51027275925928629954 (call) PolicyPlus/DetailSupport.vb:3-3: PrepareDialog(Supported)  ->  PolicyPlus/DetailSupport.vb:7: NameTextbox.Text = Supported.DisplayName
link-96016570335240825745 (renders) PolicyPlus/DetailSupport.vb:4-4: ShowDialog()  ->  PolicyPlus/DetailSupport.Designer.vb:215: Friend WithEvents NameTextbox As TextBox
link-98550166009961209271 (reads) PolicyPlus/DetailSupport.vb:7-36: NameTextbox.Text = Supported.DisplayName  ->  PolicyPlus/CompiledStructures.vb:19: Public UniqueID As String
link-11284084070929791063 (reads) PolicyPlus/DetailSupport.vb:43-43: Dim supEntry As PolicyPlusSupportEntry = EntriesListview.SelectedItems(0).Tag  ->  PolicyPlus/CompiledStructures.vb:25: Public Product As PolicyPlusProduct
link-32626952788579064094 (call) PolicyPlus/DetailSupport.vb:45-45: DetailProduct.PresentDialog(supEntry.Product)  ->  PolicyPlus/DetailProduct.vb:4: PrepareDialog(Product)
link-80196606955426259643 (call) PolicyPlus/DetailSupport.vb:47-47: PrepareDialog(supEntry.SupportDefinition)  ->  PolicyPlus/DetailSupport.vb:7: NameTextbox.Text = Supported.DisplayName
link-47747836271009234153 (call) PolicyPlus/DownloadAdmx.vb:20-20: SetIsBusy(False)  ->  PolicyPlus/DownloadAdmx.vb:23: Downloading = Busy
link-07943335747288948092 (call) PolicyPlus/DownloadAdmx.vb:36-36: SetIsBusy(True)  ->  PolicyPlus/DownloadAdmx.vb:23: Downloading = Busy
link-41537199912235164371 (request) PolicyPlus/DownloadAdmx.vb:85-85: webcli.DownloadFile(MicrosoftMsiDownloadLink, downloadPath)  ->  external-89771222401799262922 MicrosoftMsiDownloadLink
link-00864581676610109357 (call) PolicyPlus/DownloadAdmx.vb:90-90: Dim proc = Process.Start("msiexec", "/a """ & downloadPath & """ /quiet /qn TARGETDIR=""" & unpackPath & """")  ->  external-81271641863071600139 msiexec /a /quiet /qn TARGETDIR
link-49865266232126720130 (call) PolicyPlus/DownloadAdmx.vb:97-98: Privilege.EnablePrivilege("SeTakeOwnershipPrivilege")  ->  PolicyPlus/Privilege.vb:4: ' Enable the given Win32 privilege [a comment]
link-67940400891482674842 (saves) PolicyPlus/DownloadAdmx.vb:80-80: IO.Directory.CreateDirectory(tempPath)  ->  external-75125161121246095518 %localappdata%\PolicyPlusAdmxDownload\
link-94398134555070749560 (saves) PolicyPlus/DownloadAdmx.vb:85-85: webcli.DownloadFile(MicrosoftMsiDownloadLink, downloadPath)  ->  external-75125161121246095518 %localappdata%\PolicyPlusAdmxDownload\
link-43271742457894688887 (saves) PolicyPlus/DownloadAdmx.vb:93-93: IO.File.Delete(downloadPath)  ->  external-75125161121246095518 %localappdata%\PolicyPlusAdmxDownload\
link-79876957677713683338 (saves) PolicyPlus/DownloadAdmx.vb:114-114: IO.Directory.Delete(tempPath, True)  ->  external-75125161121246095518 %localappdata%\PolicyPlusAdmxDownload\
link-49572120270859119983 (saves) PolicyPlus/DownloadAdmx.vb:43-50: Dim dacl = IO.Directory.GetAccessControl(Folder)  ->  external-75125161121246095518 destination folder
link-95882485555062425365 (saves) PolicyPlus/DownloadAdmx.vb:54-72: IO.Directory.CreateDirectory(Dest)  ->  external-75125161121246095518 destination folder
link-53471237842106722804 (reads) PolicyPlus/DownloadAdmx.vb:64-64: For Each file In IO.Directory.EnumerateFiles(Source)  ->  external-75125161121246095518 unpacked MSI folder
link-75318401177649003542 (reads) PolicyPlus/DownloadAdmx.vb:103-110: Dim unpackedDefsPath = unpackPath & PolicyDefinitionsMsiSubdirectory  ->  external-75125161121246095518 unpacked MSI folder
link-21183219436982032946 (reads) PolicyPlus/DetailPolicy.vb:7-18: DefinedTextbox.Text = Policy.RawPolicy.DefinedIn.SourceFile  ->  PolicyPlus/AdmxStructures.vb:40: Public Class AdmxPolicy
link-58394312392345284369 (reads) PolicyPlus/DetailProduct.vb:11-21: DefinedTextbox.Text = Product.RawProduct.DefinedIn.SourceFile  ->  PolicyPlus/AdmxStructures.vb:2: Public Class AdmxProduct
link-95180478991335134389 (reads) PolicyPlus/DetailProduct.vb:32-32: Dim lsvi = ChildrenListview.Items.Add(child.RawProduct.Version)  ->  PolicyPlus/AdmxStructures.vb:2: Public Class AdmxProduct
link-22065230874202215511 (reads) PolicyPlus/DetailSupport.vb:9-11: DefinedTextbox.Text = Supported.RawSupport.DefinedIn.SourceFile  ->  PolicyPlus/AdmxStructures.vb:15: Public Class AdmxSupportDefinition
link-14578052885535665385 (reads) PolicyPlus/DetailSupport.vb:27-32: If element.RawSupportEntry.IsRange Then  ->  PolicyPlus/AdmxStructures.vb:27: Public Class AdmxSupportEntry
