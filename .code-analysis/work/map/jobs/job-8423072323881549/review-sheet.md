# Review sheet: the code of PolicyPlus/EditPol.vb and 13 more files

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- definition-07224515274833022927
- definition-11076807848819160295
- definition-53351280753634841522
- definition-67704222699406159151
- definition-83561331034137908442
- definition-91682890709721943807
- definition-02344583497421846154

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/EditPolDelete.Designer.vb:128-133
PolicyPlus/EditPolKey.Designer.vb:80-81
PolicyPlus/EditPolMultiStringData.Designer.vb:103-105
PolicyPlus/EditPolNumericData.Designer.vb:115-118
PolicyPlus/EditPolStringData.Designer.vb:101-103
PolicyPlus/EditPolValue.Designer.vb:103-105
PolicyPlus/EditSetting.Designer.vb:252-266

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-8423072323881549/brief.json
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
link-61386844975149000831 (call) PolicyPlus/EditPolNumericData.vb:23-23: If UserEdit Then HexParseEditText()  ->  PolicyPlus/EditPolNumericData.vb:40: Private Sub HexParseEditText()
link-21950114996874818343 (call) PolicyPlus/EditPolNumericData.vb:34-34: HexParseEditText()  ->  PolicyPlus/EditPolNumericData.vb:40: Private Sub HexParseEditText()
link-46040566123702522165 (call) PolicyPlus/EditPolNumericData.vb:35-35: UpdateEditText()  ->  PolicyPlus/EditPolNumericData.vb:21: Protected Overrides Sub UpdateEditText()
link-96409022037935096795 (call) PolicyPlus/EditPol.vb:13-13: Dim subkeys = EditingPol.GetKeyNames(Prefix)  ->  PolicyPlus/PolicySource.vb:196: Public Function GetKeyNames(Key As String) As List(Of String)
link-27558966031220988335 (call) PolicyPlus/EditPol.vb:23-23: Dim values = EditingPol.GetValueNames(Prefix, False)  ->  PolicyPlus/PolicySource.vb:139: Public Function GetValueNames(Key As String, OnlyValues As Boolean) As List(Of String)
link-82670262457455287188 (call) PolicyPlus/EditPol.vb:27-27: Dim data = EditingPol.GetValue(Prefix, value)  ->  PolicyPlus/PolicySource.vb:114: Public Function GetValue(Key As String, Value As String) As Object Implements IPolicySource.GetValue
link-69323653632369807826 (call) PolicyPlus/EditPol.vb:28-28: Dim kind = EditingPol.GetValueKind(Prefix, value)  ->  PolicyPlus/PolicySource.vb:208: Public Function GetValueKind(Key As String, Value As String) As RegistryValueKind
link-85670846878401651884 (call) PolicyPlus/EditPol.vb:79-79: UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-69608733427949113712 (call) PolicyPlus/EditPol.vb:81-81: LsvPol_SelectedIndexChanged(Nothing, Nothing)  ->  PolicyPlus/EditPol.vb:248: Private Sub LsvPol_SelectedIndexChanged(sender As Object, e As EventArgs) Handles LsvPol.SelectedIndexChanged
link-38370836967245369176 (call) PolicyPlus/EditPol.vb:111-111: Return Not EditingPol.GetKeyNames(ContainerPath).Any(Function(k) k.Equals(Name, StringComparison.InvariantCultureIgnoreCase))  ->  PolicyPlus/PolicySource.vb:196: Public Function GetKeyNames(Key As String) As List(Of String)
link-45709276951830024989 (call) PolicyPlus/EditPol.vb:114-114: Dim keyName = EditPolKey.PresentDialog("")  ->  PolicyPlus/EditPolKey.vb:9: Public Function PresentDialog(InitialName As String) As String
link-79615315110815781204 (call) PolicyPlus/EditPol.vb:116-116: If Not IsKeyNameValid(keyName) Then  ->  PolicyPlus/EditPol.vb:107: Function IsKeyNameValid(Name As String) As Boolean
link-52616210516226301945 (call) PolicyPlus/EditPol.vb:121-121: If Not IsKeyNameAvailable(containerKey, keyName) Then  ->  PolicyPlus/EditPol.vb:110: Function IsKeyNameAvailable(ContainerPath As String, Name As String) As Boolean
link-47834040199436130636 (call) PolicyPlus/EditPol.vb:126-126: EditingPol.SetValue(newPath, "", Array.CreateInstance(GetType(Byte), 0), RegistryValueKind.None)  ->  PolicyPlus/PolicySource.vb:105: Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue
link-50228789607289835112 (call) PolicyPlus/EditPol.vb:127-127: UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-60579782682366313581 (call) PolicyPlus/EditPol.vb:128-128: SelectKey(newPath)  ->  PolicyPlus/EditPol.vb:90: Sub SelectKey(KeyPath As String)
link-24627274225841155058 (call) PolicyPlus/EditPol.vb:132-132: If EditPolStringData.PresentDialog(ValueName, CurrentData) = DialogResult.OK Then  ->  PolicyPlus/EditPolStringData.vb:2: Public Function PresentDialog(ValueName As String, InitialData As String) As DialogResult
link-93100561437842754666 (call) PolicyPlus/EditPol.vb:138-138: If EditPolNumericData.PresentDialog(ValueName, CurrentData, Kind = RegistryValueKind.QWord) = DialogResult.OK Then  ->  PolicyPlus/EditPolNumericData.vb:2: Public Function PresentDialog(ValueName As String, InitialData As ULong, IsQword As Boolean) As DialogResult
link-26453602122841549541 (call) PolicyPlus/EditPol.vb:144-144: If EditPolMultiStringData.PresentDialog(ValueName, CurrentData) = DialogResult.OK Then  ->  PolicyPlus/EditPolMultiStringData.vb:5: Public Function PresentDialog(ValueName As String, InitialData As String()) As DialogResult
link-91465232332875146253 (call) PolicyPlus/EditPol.vb:156-156: If EditPolValue.PresentDialog() <> DialogResult.OK Then Exit Sub  ->  PolicyPlus/EditPolValue.vb:8: Public Function PresentDialog() As DialogResult
link-31953975018855818657 (call) PolicyPlus/EditPol.vb:167-167: Dim newData = PromptForNewValueData(value, defaultData, kind)  ->  PolicyPlus/EditPol.vb:130: Function PromptForNewValueData(ValueName As String, CurrentData As Object, Kind As RegistryValueKind) As Object
link-79314570594047896734 (call) PolicyPlus/EditPol.vb:169-169: EditingPol.SetValue(keyPath, value, newData, kind)  ->  PolicyPlus/PolicySource.vb:105: Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue
link-37817309037537400573 (call) PolicyPlus/EditPol.vb:170-170: UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-62935903086195737683 (call) PolicyPlus/EditPol.vb:171-171: SelectValue(keyPath, value)  ->  PolicyPlus/EditPol.vb:96: Sub SelectValue(KeyPath As String, ValueName As String)
link-21688541159584822241 (call) PolicyPlus/EditPol.vb:177-177: If EditPolDelete.PresentDialog(Split(tag, "\").Last) <> DialogResult.OK Then Exit Sub  ->  PolicyPlus/EditPolDelete.vb:2: Public Function PresentDialog(ContainerKey As String) As DialogResult
link-74070959638883315117 (call) PolicyPlus/EditPol.vb:179-179: EditingPol.ClearKey(tag) ' Delete everything  ->  PolicyPlus/PolicySource.vb:183: Public Sub ClearKey(Key As String) Implements IPolicySource.ClearKey
link-33174677843344530841 (call) PolicyPlus/EditPol.vb:181-181: EditingPol.ForgetKeyClearance(tag) ' So the clearance is before the values in the POL  ->  PolicyPlus/PolicySource.vb:190: Public Sub ForgetKeyClearance(Key As String) Implements IPolicySource.ForgetKeyClearance
link-45331039701476638229 (call) PolicyPlus/EditPol.vb:182-182: EditingPol.ClearKey(tag)  ->  PolicyPlus/PolicySource.vb:183: Public Sub ClearKey(Key As String) Implements IPolicySource.ClearKey
link-48251061838353941454 (call) PolicyPlus/EditPol.vb:191-191: If Not valueInfo.IsDeleter Then EditingPol.SetValue(valueInfo.Key, valueInfo.Name, valueInfo.Data, valueInfo.Kind)  ->  PolicyPlus/PolicySource.vb:105: Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue
link-18431610979630656714 (call) PolicyPlus/EditPol.vb:197-197: EditingPol.DeleteValue(tag, EditPolDelete.TextValueName.Text)  ->  PolicyPlus/PolicySource.vb:92: Public Sub DeleteValue(Key As String, Value As String) Implements IPolicySource.DeleteValue
link-35940505700939731765 (call) PolicyPlus/EditPol.vb:199-199: UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-66299570828201735122 (call) PolicyPlus/EditPol.vb:200-200: SelectKey(tag)  ->  PolicyPlus/EditPol.vb:90: Sub SelectKey(KeyPath As String)
link-90388109898438369319 (call) PolicyPlus/EditPol.vb:203-203: EditingPol.DeleteValue(info.Key, info.Name)  ->  PolicyPlus/PolicySource.vb:92: Public Sub DeleteValue(Key As String, Value As String) Implements IPolicySource.DeleteValue
link-42510591751138390933 (call) PolicyPlus/EditPol.vb:204-204: UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-73303898225555856485 (call) PolicyPlus/EditPol.vb:205-205: SelectValue(info.Key, "**del." & info.Name)  ->  PolicyPlus/EditPol.vb:96: Sub SelectValue(KeyPath As String, ValueName As String)
link-68865032137819949484 (call) PolicyPlus/EditPol.vb:217-217: For Each subkey In EditingPol.GetKeyNames(Key)  ->  PolicyPlus/PolicySource.vb:196: Public Function GetKeyNames(Key As String) As List(Of String)
link-24325841863600138961 (call) PolicyPlus/EditPol.vb:220-220: EditingPol.ClearKey(Key)  ->  PolicyPlus/PolicySource.vb:183: Public Sub ClearKey(Key As String) Implements IPolicySource.ClearKey
link-18289524795573370314 (call) PolicyPlus/EditPol.vb:221-221: EditingPol.ForgetKeyClearance(Key)  ->  PolicyPlus/PolicySource.vb:190: Public Sub ForgetKeyClearance(Key As String) Implements IPolicySource.ForgetKeyClearance
link-43116460292463283314 (call) PolicyPlus/EditPol.vb:227-227: EditingPol.ForgetValue(info.Key, info.Name)  ->  PolicyPlus/PolicySource.vb:99: Public Sub ForgetValue(Key As String, Value As String) Implements IPolicySource.ForgetValue
link-18574426785688747579 (call) PolicyPlus/EditPol.vb:229-229: UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-27069665767097661133 (call) PolicyPlus/EditPol.vb:233-233: SelectKey(String.Join("\", pathParts.Take(n)))  ->  PolicyPlus/EditPol.vb:90: Sub SelectKey(KeyPath As String)
link-21771172170054878668 (call) PolicyPlus/EditPol.vb:236-236: LsvPol_SelectedIndexChanged(Nothing, Nothing) ' Make sure the buttons don't stay enabled  ->  PolicyPlus/EditPol.vb:248: Private Sub LsvPol_SelectedIndexChanged(sender As Object, e As EventArgs) Handles LsvPol.SelectedIndexChanged
link-90305759331503334403 (call) PolicyPlus/EditPol.vb:241-241: Dim newData = PromptForNewValueData(info.Name, info.Data, info.Kind)  ->  PolicyPlus/EditPol.vb:130: Function PromptForNewValueData(ValueName As String, CurrentData As Object, Kind As RegistryValueKind) As Object
link-27502701433541577898 (call) PolicyPlus/EditPol.vb:243-243: EditingPol.SetValue(info.Key, info.Name, newData, info.Kind)  ->  PolicyPlus/PolicySource.vb:105: Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue
link-82251977999325122599 (call) PolicyPlus/EditPol.vb:244-244: UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-21904837157744990316 (call) PolicyPlus/EditPol.vb:245-245: SelectValue(info.Key, info.Name)  ->  PolicyPlus/EditPol.vb:96: Sub SelectValue(KeyPath As String, ValueName As String)
link-02335220809454398509 (call) PolicyPlus/EditPol.vb:277-277: If ImportReg.PresentDialog(EditingPol) = DialogResult.OK Then UpdateTree()  ->  PolicyPlus/ImportReg.vb:3: Public Function PresentDialog(Target As IPolicySource) As DialogResult
link-62591036026936772786 (call) PolicyPlus/EditPol.vb:277-277: If ImportReg.PresentDialog(EditingPol) = DialogResult.OK Then UpdateTree()  ->  PolicyPlus/EditPol.vb:5: Sub UpdateTree()
link-78256028241580354626 (call) PolicyPlus/EditPol.vb:282-282: ExportReg.PresentDialog(branch, EditingPol, EditingUserSource)  ->  PolicyPlus/ExportReg.vb:3: Public Function PresentDialog(Branch As String, Pol As PolFile, IsUser As Boolean) As DialogResult
