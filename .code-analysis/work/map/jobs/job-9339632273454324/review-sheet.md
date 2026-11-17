# Review sheet: the code of PolicyPlus/EditSetting.vb and 10 more files

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- link-31345133613928486513
- link-43767922184744363578
- link-72764219616260251579
- link-33806252030263168707
- link-78257567539566862802
- link-58505712414641871689
- link-51004039802875193716
- definition-07984472905044917603
- definition-07255456577007096161
- definition-65490449858537291672
- block-79286982229210596008
- block-28742694885972931184
- block-59813638978307207520

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/EditSetting.vb:169-169
PolicyPlus/EditSetting.vb:191-191
PolicyPlus/ExportReg.Designer.vb:143-147
PolicyPlus/FilterOptions.Designer.vb:215-224
PolicyPlus/FilterOptions.vb:17-17
PolicyPlus/FilterOptions.vb:155-158
PolicyPlus/FindById.vb:29-29
PolicyPlus/FindById.vb:32-32
PolicyPlus/FindById.vb:35-35
PolicyPlus/FindById.vb:41-41
PolicyPlus/FindByRegistry.Designer.vb:100-102
PolicyPlus/FindByRegistry.vb:17-35
PolicyPlus/FindByText.vb:24-71

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-9339632273454324/brief.json
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
link-44910822784359737018 (call) PolicyPlus/FilterOptions.Designer.vb:34-34: Me.AllowedProductsTreeview = New PolicyPlus.DoubleClickIgnoringTreeView()  ->  PolicyPlus/FilterOptions.vb:153: Friend Class DoubleClickIgnoringTreeView
link-74563765612957400783 (renders) PolicyPlus/ExportReg.vb:8-8: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-63802949279099487103 (renders) PolicyPlus/ExportReg.vb:13-13: If sfd.ShowDialog = DialogResult.OK Then TextReg.Text = sfd.FileName  ->  external-29531700766871564844 SaveFileDialog.ShowDialog
link-02153832345586254225 (renders) PolicyPlus/ExportReg.vb:21-21: MsgBox("Please specify a filename and path for the exported REG.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-95192301735671989465 (renders) PolicyPlus/ExportReg.vb:30-30: MsgBox("REG exported successfully.", MsgBoxStyle.Information)  ->  external-29531700766871564844 MsgBox
link-74478322699984823820 (renders) PolicyPlus/ExportReg.vb:33-33: MsgBox("Failed to export REG!", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-70266136654544096579 (call) PolicyPlus/ExportReg.vb:25-25: reg.SetPrefix(TextRoot.Text)  ->  PolicyPlus/RegFile.vb:276: Public Sub SetPrefix(Prefix As String)
link-53984617289515780299 (call) PolicyPlus/ExportReg.vb:26-26: reg.SetSourceBranch(TextBranch.Text)  ->  PolicyPlus/RegFile.vb:280: Public Sub SetSourceBranch(Branch As String)
link-96530010967884412125 (call) PolicyPlus/ExportReg.vb:28-28: Source.Apply(reg)  ->  PolicyPlus/PolicySource.vb:179: Public Sub Apply(Target As IPolicySource)
link-04379904789642480627 (call) PolicyPlus/ExportReg.vb:29-29: reg.Save(TextReg.Text)  ->  PolicyPlus/RegFile.vb:182: Public Sub Save(File As String)
link-87650413696672390788 (call) PolicyPlus/FilterOptions.vb:18-18: PrepareDialog(Configuration)  ->  PolicyPlus/FilterOptions.vb:21: Sub PrepareDialog(Configuration As FilterConfiguration)
link-44473769075626566391 (renders) PolicyPlus/FilterOptions.vb:19-19: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-46452234463482903603 (call) PolicyPlus/FilterOptions.vb:83-83: PrepareDialog(New FilterConfiguration)  ->  PolicyPlus/FilterOptions.vb:21: Sub PrepareDialog(Configuration As FilterConfiguration)
link-04213755678662992778 (call) PolicyPlus/FilterOptions.vb:128-128: PropogateCheckStateDown(e.Node)  ->  PolicyPlus/FilterOptions.vb:130: Sub PropogateCheckStateDown(Node As TreeNode)
link-13468563545472319171 (call) PolicyPlus/FilterOptions.vb:133-133: PropogateCheckStateDown(subnode)  ->  PolicyPlus/FilterOptions.vb:130: Sub PropogateCheckStateDown(Node As TreeNode)
link-95226462875558889134 (call) PolicyPlus/FilterOptions.vb:157-157: If m.Msg <> &H203 Then MyBase.WndProc(m)  ->  external-29531700766871564844 TreeView.WndProc
link-94345177620135116070 (reads) PolicyPlus/FindById.vb:15-20: CategoryImage = Main.PolicyIcons.Images(0)  ->  PolicyPlus/Main.Designer.vb:716: Friend WithEvents PolicyIcons As ImageList
link-90525924149357758120 (renders) PolicyPlus/FindByRegistry.vb:10-10: MsgBox("Please enter search terms.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-11470027705959711208 (renders) PolicyPlus/FindByRegistry.vb:14-14: MsgBox("Policies' root keys are determined only by their section. Remove the root key from the search terms and try again.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-34258622853123253653 (call) PolicyPlus/FindByRegistry.vb:18-18: Dim affected = PolicyProcessing.GetReferencedRegistryValues(Policy)  ->  PolicyPlus/PolicyProcessing.vb:207: Public Shared Function GetReferencedRegistryValues(Policy As PolicyPlusPolicy) As List(Of RegistryKeyValuePair)
link-01610350522292327802 (renders) PolicyPlus/FindByText.vb:6-6: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-79247034253812574419 (renders) PolicyPlus/FindByText.vb:14-14: MsgBox("Please enter search terms.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-27597907581646754380 (renders) PolicyPlus/FindByText.vb:21-21: MsgBox("At least one attribute must be searched. Check one of the boxes and try again.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-95466630930236085386 (call) PolicyPlus/EditSetting.vb:21-21: HelpTextbox.Text = Main.PrettifyDescription(CurrentSetting.DisplayExplanation)  ->  PolicyPlus/Main.vb:863: Shared Function PrettifyDescription(Description As String) As String
link-52380132221142424067 (call) PolicyPlus/EditSetting.vb:32-32: PreparePolicyElements()  ->  PolicyPlus/EditSetting.vb:38: Sub PreparePolicyElements()
link-26723893213504095434 (call) PolicyPlus/EditSetting.vb:34-34: SectionDropdown_SelectedIndexChanged(Nothing, Nothing) ' Force an update of the current source  ->  PolicyPlus/EditSetting.vb:305: Private Sub SectionDropdown_SelectedIndexChanged(sender As Object, e As EventArgs) Handles SectionDropdown.SelectedIndexChanged
link-59019240234126381075 (call) PolicyPlus/EditSetting.vb:35-35: PreparePolicyState()  ->  PolicyPlus/EditSetting.vb:189: Sub PreparePolicyState()
link-65323776166389395029 (call) PolicyPlus/EditSetting.vb:36-36: StateRadiosChanged(Nothing, Nothing)  ->  PolicyPlus/EditSetting.vb:298: Private Sub StateRadiosChanged(sender As Object, e As EventArgs) Handles DisabledOption.CheckedChanged, EnabledOption.CheckedChanged, NotConfiguredOption.Checke
link-67432655592656124001 (call) PolicyPlus/EditSetting.vb:151-151: Dim map = New DropdownPresentationMap With {.ID = itemId, .DisplayName = AdmxWorkspace.ResolveString(entry.DisplayCode, CurrentSetting.RawPolicy.DefinedIn)}  ->  PolicyPlus/AdmxBundle.vb:193: Public Function ResolveString(DisplayCode As String, Admx As AdmxFile) As String
link-86526784129638741137 (call) PolicyPlus/EditSetting.vb:186-186: OptionsTableResized()  ->  PolicyPlus/EditSetting.vb:320: Private Sub OptionsTableResized()
link-32332734802551023995 (call) PolicyPlus/EditSetting.vb:169-169: If ListEditor.PresentDialog(listPres.Label, button.Tag, list.UserProvidesNames) = DialogResult.OK Then button.Tag = ListEditor.FinalData  ->  PolicyPlus/ListEditor.vb:4: Public Function PresentDialog(Title As String, Data As Object, TwoColumn As Boolean) As DialogResult
link-40746075964610336144 (call) PolicyPlus/EditSetting.vb:196-196: Dim optionStates = PolicyProcessing.GetPolicyOptionStates(CurrentSource, CurrentSetting)  ->  PolicyPlus/PolicyProcessing.vb:133: Public Shared Function GetPolicyOptionStates(PolicySource As IPolicySource, Policy As PolicyPlusPolicy) As Dictionary(Of String, Object)
link-76493520443971315426 (call) PolicyPlus/EditSetting.vb:226-226: Dim canWrite = (CurrentLoader.GetWritability <> PolicySourceWritability.NoWriting)  ->  PolicyPlus/PolicyLoader.vb:163: Public Function GetWritability() As PolicySourceWritability
link-82049571045704041829 (call) PolicyPlus/EditSetting.vb:242-242: PolicyProcessing.ForgetPolicy(CurrentSource, CurrentSetting)  ->  PolicyPlus/PolicyProcessing.vb:210: Public Shared Sub ForgetPolicy(PolicySource As IPolicySource, Policy As PolicyPlusPolicy)
link-36316312985344365689 (call) PolicyPlus/EditSetting.vb:272-272: PolicyProcessing.SetPolicyState(CurrentSource, CurrentSetting, PolicyState.Enabled, options)  ->  PolicyPlus/PolicyProcessing.vb:265: Public Shared Sub SetPolicyState(PolicySource As IPolicySource, Policy As PolicyPlusPolicy, State As PolicyState, Options As Dictionary(Of String, Object))
link-04031699344271005664 (call) PolicyPlus/EditSetting.vb:274-274: PolicyProcessing.SetPolicyState(CurrentSource, CurrentSetting, PolicyState.Disabled, Nothing)  ->  PolicyPlus/PolicyProcessing.vb:265: Public Shared Sub SetPolicyState(PolicySource As IPolicySource, Policy As PolicyPlusPolicy, State As PolicyState, Options As Dictionary(Of String, Object))
link-10926100134813954744 (renders) PolicyPlus/EditSetting.vb:296-296: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-10446376859720679066 (call) PolicyPlus/EditSetting.vb:310-310: PreparePolicyState()  ->  PolicyPlus/EditSetting.vb:189: Sub PreparePolicyState()
link-27301006748926327439 (call) PolicyPlus/EditSetting.vb:313-313: ApplyToPolicySource()  ->  PolicyPlus/EditSetting.vb:240: Sub ApplyToPolicySource()
link-90286436742595549555 (call) PolicyPlus/EditSetting.vb:317-317: ApplyToPolicySource()  ->  PolicyPlus/EditSetting.vb:240: Sub ApplyToPolicySource()
link-72253781040347213054 (call) PolicyPlus/EditSetting.vb:341-341: OptionsTableResized()  ->  PolicyPlus/EditSetting.vb:320: Private Sub OptionsTableResized()
link-31345133613928486513 (call) PolicyPlus/EditSetting.vb:191-191: Select Case PolicyProcessing.GetPolicyState(CurrentSource, CurrentSetting)  ->  PolicyPlus/PolicyProcessing.vb:2: Public Shared Function GetPolicyState(PolicySource As IPolicySource, Policy As PolicyPlusPolicy) As PolicyState
link-43767922184744363578 (reads) PolicyPlus/FindById.vb:29-29: If AdmxWorkspace.FlatCategories.ContainsKey(id) Then  ->  PolicyPlus/AdmxBundle.vb:11: Public FlatCategories As New Dictionary(Of String, PolicyPlusCategory)
link-72764219616260251579 (reads) PolicyPlus/FindById.vb:32-32: ElseIf AdmxWorkspace.FlatProducts.ContainsKey(id) Then  ->  PolicyPlus/AdmxBundle.vb:12: Public FlatProducts As New Dictionary(Of String, PolicyPlusProduct)
link-33806252030263168707 (reads) PolicyPlus/FindById.vb:35-35: ElseIf AdmxWorkspace.SupportDefinitions.ContainsKey(id) Then  ->  PolicyPlus/AdmxBundle.vb:17: Public SupportDefinitions As New Dictionary(Of String, PolicyPlusSupport)
link-78257567539566862802 (reads) PolicyPlus/FindById.vb:41-41: If AdmxWorkspace.Policies.ContainsKey(policyId) Then  ->  PolicyPlus/AdmxBundle.vb:16: Public Policies As New Dictionary(Of String, PolicyPlusPolicy)
link-58505712414641871689 (reads) PolicyPlus/FilterOptions.vb:17-17: addProductsToNodeCollection(Workspace.Products.Values, AllowedProductsTreeview.Nodes) ' Recursively add products  ->  PolicyPlus/AdmxBundle.vb:15: Public Products As New Dictionary(Of String, PolicyPlusProduct)
link-51004039802875193716 (reads) PolicyPlus/EditSetting.vb:169-169: If ListEditor.PresentDialog(listPres.Label, button.Tag, list.UserProvidesNames) = DialogResult.OK Then button.Tag = ListEditor.FinalData  ->  PolicyPlus/ListEditor.vb:3: Public FinalData As Object
