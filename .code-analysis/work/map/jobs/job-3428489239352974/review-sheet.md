# Review sheet: the code of PolicyPlus/LoadedAdmx.vb and 5 more files

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/LoadedAdmx.vb:1-25
PolicyPlus/LoadedProducts.Designer.vb:1-194
PolicyPlus/LoadedProducts.vb:1-69
PolicyPlus/LoadedSupportDefinitions.Designer.vb:1-111
PolicyPlus/LoadedSupportDefinitions.vb:1-30
PolicyPlus/Main.Designer.vb:1-762

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-3428489239352974/brief.json
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
link-65110773282947861413 (call) PolicyPlus/LoadedAdmx.vb:11-11: LoadedAdmx_SizeChanged(Nothing, Nothing)  ->  PolicyPlus/LoadedAdmx.vb:20: ChNamespace.Width = Math.Max(30, LsvAdmx.ClientRectangle.Width - ChFolder.Width - ChFileTitle.Width)
link-47177063731173055679 (call) PolicyPlus/LoadedAdmx.vb:14-14: ShowDialog()  ->  external-29531700766871564844 ShowDialog
link-09242558114325178068 (call) PolicyPlus/LoadedAdmx.vb:17-17: DetailAdmx.PresentDialog(LsvAdmx.SelectedItems(0).Tag, Bundle)  ->  PolicyPlus/DetailAdmx.vb:2: Public Sub PresentDialog(Admx As AdmxFile, Workspace As AdmxBundle)
link-54059874331579456029 (call) PolicyPlus/LoadedAdmx.vb:23-23: If e.KeyCode = Keys.Enter And LsvAdmx.SelectedItems.Count > 0 Then LsvAdmx_DoubleClick(sender, e)  ->  PolicyPlus/LoadedAdmx.vb:17: DetailAdmx.PresentDialog(LsvAdmx.SelectedItems(0).Tag, Bundle)
link-33608776956894411463 (call) PolicyPlus/LoadedProducts.vb:12-12: UpdateMajorList()  ->  PolicyPlus/LoadedProducts.vb:23: Sub UpdateMajorList() Handles LsvTopLevelProducts.SelectedIndexChanged
link-78837111429370566909 (call) PolicyPlus/LoadedProducts.vb:21-21: ShowDialog()  ->  external-29531700766871564844 ShowDialog
link-02108193585036273369 (call) PolicyPlus/LoadedProducts.vb:39-39: UpdateMinorList()  ->  PolicyPlus/LoadedProducts.vb:41: Sub UpdateMinorList() Handles LsvMajorVersions.SelectedIndexChanged
link-95443864962039993738 (call) PolicyPlus/LoadedProducts.vb:61-61: DetailProduct.PresentDialog(product)  ->  PolicyPlus/DetailProduct.vb:3: Public Sub PresentDialog(Product As PolicyPlusProduct)
link-28953110353842292474 (call) PolicyPlus/LoadedProducts.vb:65-65: OpenProductDetails(sender, e)  ->  PolicyPlus/LoadedProducts.vb:57: Sub OpenProductDetails(sender As Object, e As EventArgs) Handles LsvTopLevelProducts.DoubleClick, LsvMajorVersions.DoubleClick, LsvMinorVersions.DoubleClick
link-09925673401495392739 (call) PolicyPlus/LoadedSupportDefinitions.vb:6-6: UpdateListing()  ->  PolicyPlus/LoadedSupportDefinitions.vb:10: Sub UpdateListing()
link-59968960935295355810 (call) PolicyPlus/LoadedSupportDefinitions.vb:8-8: ShowDialog()  ->  external-29531700766871564844 ShowDialog
link-17381954781288509726 (call) PolicyPlus/LoadedSupportDefinitions.vb:21-21: DetailSupport.PresentDialog(LsvSupport.SelectedItems(0).Tag)  ->  PolicyPlus/DetailSupport.vb:2: Public Sub PresentDialog(Supported As PolicyPlusSupport)
link-89279672740826329489 (call) PolicyPlus/LoadedSupportDefinitions.vb:25-25: If Visible Then UpdateListing()  ->  PolicyPlus/LoadedSupportDefinitions.vb:10: Sub UpdateListing()
link-70161751506619619918 (call) PolicyPlus/LoadedSupportDefinitions.vb:28-28: If e.KeyCode = Keys.Enter And LsvSupport.SelectedItems.Count > 0 Then LsvSupport_DoubleClick(sender, e)  ->  PolicyPlus/LoadedSupportDefinitions.vb:20: Private Sub LsvSupport_DoubleClick(sender As Object, e As EventArgs) Handles LsvSupport.DoubleClick
link-72747598177622926775 (call) PolicyPlus/LoadedProducts.Designer.vb:13-13: MyBase.Dispose(disposing)  ->  external-29531700766871564844 Form.Dispose
link-81738712942626845131 (call) PolicyPlus/LoadedProducts.Designer.vb:33-33: Me.LsvTopLevelProducts = New System.Windows.Forms.ListView()  ->  external-29531700766871564844 Control construction and layout
link-21258094522461714988 (call) PolicyPlus/LoadedSupportDefinitions.Designer.vb:13-13: MyBase.Dispose(disposing)  ->  external-29531700766871564844 Form.Dispose
link-79666621524536947113 (call) PolicyPlus/LoadedSupportDefinitions.Designer.vb:26-26: Me.LsvSupport = New System.Windows.Forms.ListView()  ->  external-29531700766871564844 Control construction and layout
link-33337845922683180992 (call) PolicyPlus/Main.Designer.vb:13-13: MyBase.Dispose(disposing)  ->  external-29531700766871564844 Form.Dispose
link-17744025066326405269 (call) PolicyPlus/Main.Designer.vb:37-37: Me.MainMenu = New System.Windows.Forms.MenuStrip()  ->  external-29531700766871564844 Control construction and layout
link-98328224480903401576 (call) PolicyPlus/Main.Designer.vb:477-477: Me.PolicyIcons.ImageStream = CType(resources.GetObject("PolicyIcons.ImageStream"), System.Windows.Forms.ImageListStreamer)  ->  external-29531700766871564844 ComponentResourceManager.GetObject
