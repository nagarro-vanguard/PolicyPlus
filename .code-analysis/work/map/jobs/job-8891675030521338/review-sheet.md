# Review sheet: the code of PolicyPlus/FindResults.Designer.vb and 14 more files

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- definition-53160573699948860470
- definition-16484328867116774720
- definition-41460150713291398081
- definition-93433668862063337330

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/FindResults.Designer.vb:137-144
PolicyPlus/LanguageOptions.Designer.vb:96-97
PolicyPlus/ListEditor.Designer.vb:114-119
PolicyPlus/LoadedAdmx.Designer.vb:94-98

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-8891675030521338/brief.json
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
link-08525849901739248679 (call) PolicyPlus/FindResults.vb:25-25: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-89967486290670482669 (call) PolicyPlus/FindResults.vb:30-30: MsgBox("No search has been run yet, so there are no results to display.", MsgBoxStyle.Information)  ->  external-29531700766871564844 MsgBox
link-49579250985503361339 (call) PolicyPlus/FindResults.vb:36-36: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-81038995897860980084 (call) PolicyPlus/FindResults.vb:69-69: Dim isHit = Searcher(policy.Value) ' The potentially expensive check  ->  no target: The search test is a function handed in by the caller as a parameter (Searcher); the code here shows only that it takes a policy and returns whether it matches. The Find By dialogs that build it, or the main window passing it on, would show which test runs.
link-44782135065122896099 (call) PolicyPlus/FindResults.vb:75-75: Invoke(Sub()  ->  external-29531700766871564844 Control.Invoke
link-24971776439164740776 (call) PolicyPlus/FindResults.vb:83-83: Invoke(Sub()  ->  external-29531700766871564844 Control.Invoke
link-24405757906509301137 (call) PolicyPlus/FindResults.vb:97-97: Task.Factory.StartNew(Sub() SearchJob(AdmxWorkspace, SearchFunc))  ->  PolicyPlus/FindResults.vb:47: Sub SearchJob(Workspace As AdmxBundle, Searcher As Func(Of PolicyPlusPolicy, Boolean))
link-28545470327661637182 (call) PolicyPlus/FindResults.vb:107-107: StopSearch(False)  ->  PolicyPlus/FindResults.vb:91: Sub StopSearch(Force As Boolean)
link-55832623644614018331 (call) PolicyPlus/FindResults.vb:113-113: StopSearch(True)  ->  PolicyPlus/FindResults.vb:91: Sub StopSearch(Force As Boolean)
link-61653400821812563400 (call) PolicyPlus/FindResults.vb:128-128: Dim doubleBufferProp = GetType(Control).GetProperty("DoubleBuffered", Reflection.BindingFlags.NonPublic Or Reflection.BindingFlags.Instance)  ->  external-29531700766871564844 Type.GetProperty (reflection on Control.DoubleBuffered)
link-83910525446248394157 (call) PolicyPlus/ImportReg.vb:7-7: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-46294912649513298531 (call) PolicyPlus/ImportReg.vb:12-12: If ofd.ShowDialog() <> DialogResult.OK Then Exit Sub  ->  external-29531700766871564844 OpenFileDialog.ShowDialog
link-57912274366419558766 (call) PolicyPlus/ImportReg.vb:16-16: Dim reg = RegFile.Load(ofd.FileName, "")  ->  PolicyPlus/RegFile.vb:112: Public Shared Function Load(File As String, Prefix As String) As RegFile
link-88137167059211417012 (call) PolicyPlus/ImportReg.vb:17-17: TextRoot.Text = reg.GuessPrefix()  ->  PolicyPlus/RegFile.vb:284: Public Function GuessPrefix() As String
link-92606810967192589970 (call) PolicyPlus/ImportReg.vb:18-18: If reg.HasDefaultValues Then MsgBox("This REG file contains data for default values, which cannot be applied to all policy sources.", MsgBoxStyle.Exclamation)  ->  PolicyPlus/RegFile.vb:298: Public Function HasDefaultValues() As Boolean
link-46501760647645352440 (call) PolicyPlus/ImportReg.vb:18-18: If reg.HasDefaultValues Then MsgBox("This REG file contains data for default values, which cannot be applied to all policy sources.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-02176592442674965990 (call) PolicyPlus/ImportReg.vb:20-20: MsgBox("An error occurred while trying to guess the prefix.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-02475084249441905990 (call) PolicyPlus/ImportReg.vb:30-30: MsgBox("Please specify a REG file to import.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-59653664149589139269 (call) PolicyPlus/ImportReg.vb:34-34: MsgBox("Please specify the prefix used to fully qualify paths in the REG file.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-93683184035489464053 (call) PolicyPlus/ImportReg.vb:38-38: Dim reg = RegFile.Load(TextReg.Text, TextRoot.Text)  ->  PolicyPlus/RegFile.vb:112: Public Shared Function Load(File As String, Prefix As String) As RegFile
link-55218841563605311873 (call) PolicyPlus/ImportReg.vb:39-39: reg.Apply(PolicySource)  ->  PolicyPlus/RegFile.vb:260: Public Sub Apply(Target As IPolicySource)
link-67746480444728515081 (call) PolicyPlus/ImportReg.vb:42-42: MsgBox("Failed to import the REG file.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-85069961090267998951 (call) PolicyPlus/ImportSpol.vb:6-6: If ofd.ShowDialog = DialogResult.OK Then  ->  external-29531700766871564844 OpenFileDialog.ShowDialog
link-27933258214091764768 (reads) PolicyPlus/ImportSpol.vb:7-7: TextSpol.Text = IO.File.ReadAllText(ofd.FileName)  ->  external-75125161121246095518 IO.File.ReadAllText(ofd.FileName)
link-68204982205112256816 (call) PolicyPlus/ImportSpol.vb:13-13: Dim spol = SpolFile.FromText(TextSpol.Text)  ->  PolicyPlus/SpolFile.vb:4: Public Shared Function FromText(Text As String) As SpolFile
link-53196166552778728748 (call) PolicyPlus/ImportSpol.vb:14-14: MsgBox("Validation successful, " & spol.Policies.Count & " policy settings found.", MsgBoxStyle.Information)  ->  external-29531700766871564844 MsgBox
link-41508431993177126088 (call) PolicyPlus/ImportSpol.vb:16-16: MsgBox("SPOL validation failed: " & ex.Message, MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-87499481455929626737 (call) PolicyPlus/ImportSpol.vb:21-21: Spol = SpolFile.FromText(TextSpol.Text) ' Tell the main form that the SPOL is ready to be committed  ->  PolicyPlus/SpolFile.vb:4: Public Shared Function FromText(Text As String) As SpolFile
link-16968281867817670486 (call) PolicyPlus/ImportSpol.vb:24-24: MsgBox("The SPOL text is invalid: " & ex.Message, MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-16906282338334360515 (call) PolicyPlus/ImportSpol.vb:37-37: If MsgBox("Are you sure you want to reset the text box?", MsgBoxStyle.Question Or MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then  ->  external-29531700766871564844 MsgBox
link-00661992790854937076 (call) PolicyPlus/InspectPolicyElements.vb:162-162: itemNode.Nodes.Add("Display name: """ & AdmxWorkspace.ResolveString(item.DisplayCode, Policy.RawPolicy.DefinedIn) & """").ImageIndex = 21  ->  PolicyPlus/AdmxBundle.vb:193: Public Function ResolveString(DisplayCode As String, Admx As AdmxFile) As String
link-67217972086355107917 (call) PolicyPlus/InspectPolicyElements.vb:185-185: ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-74306403770606981434 (call) PolicyPlus/InspectPolicyElements.vb:189-189: My.Computer.Clipboard.SetText(InfoTreeview.SelectedNode.Text)  ->  external-29531700766871564844 Clipboard.SetText
link-58228196455682488383 (call) PolicyPlus/InspectPolicyElements.vb:193-193: DetailPolicy.PresentDialog(SelectedPolicy)  ->  PolicyPlus/DetailPolicy.vb:3: Public Sub PresentDialog(Policy As PolicyPlusPolicy)
link-54527326125710907398 (call) PolicyPlus/InspectSpolFragment.vb:15-15: spolState.BasicState = PolicyProcessing.GetPolicyState(polSource, Policy)  ->  PolicyPlus/PolicyProcessing.vb:2: Public Shared Function GetPolicyState(PolicySource As IPolicySource, Policy As PolicyPlusPolicy) As PolicyState
link-89913323032534995202 (call) PolicyPlus/InspectSpolFragment.vb:16-16: If spolState.BasicState = PolicyState.Enabled Then spolState.ExtraOptions = PolicyProcessing.GetPolicyOptionStates(polSource, Policy)  ->  PolicyPlus/PolicyProcessing.vb:133: Public Shared Function GetPolicyOptionStates(PolicySource As IPolicySource, Policy As PolicyPlusPolicy) As Dictionary(Of String, Object)
link-62832963493800338580 (call) PolicyPlus/InspectSpolFragment.vb:17-17: sb.AppendLine(SpolFile.GetFragment(spolState))  ->  PolicyPlus/SpolFile.vb:127: Public Shared Function GetFragment(State As SpolPolicyState) As String
link-08480436274795757695 (call) PolicyPlus/InspectSpolFragment.vb:23-23: UpdateTextbox()  ->  PolicyPlus/InspectSpolFragment.vb:37: Private Sub UpdateTextbox()
link-56780116528361185739 (call) PolicyPlus/InspectSpolFragment.vb:24-24: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-57300606333425911350 (call) PolicyPlus/InspectSpolFragment.vb:28-28: TextSpol.Copy()  ->  external-29531700766871564844 TextBox.Copy
link-04989575770553970513 (call) PolicyPlus/InspectSpolFragment.vb:35-35: UpdateTextbox()  ->  PolicyPlus/InspectSpolFragment.vb:37: Private Sub UpdateTextbox()
link-70232650706050278368 (call) PolicyPlus/LanguageOptions.vb:7-7: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-09351638977631490003 (call) PolicyPlus/LanguageOptions.vb:12-12: MsgBox("Please enter a valid language code.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-38137149252318165578 (call) PolicyPlus/ListEditor.vb:23-23: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-12465764617003262325 (call) PolicyPlus/ListEditor.vb:33-33: MsgBox("Multiple entries are named """ & key & """! Remove or rename all but one.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
