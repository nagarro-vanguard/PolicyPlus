# Review sheet: the code of PolicyPlus/PolicyProcessing.vb and 5 more files

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- block-09820337158181120167
- block-05788683567674110757
- definition-54853067500944015012
- definition-92498909113820290746
- definition-71470158292409036351
- definition-77511985662945315247
- definition-15803272485283156743
- definition-84848513963024781021
- definition-35092281179795026748
- definition-18987633143849828224
- definition-46477409132239805301
- definition-16681320756504320618
- definition-93410464138548098452
- definition-09231979239875008486
- definition-23471071947586017828
- definition-13092697041824555525
- definition-42312196744306948382
- definition-77670680667408200257
- definition-96076586784355395441
- definition-70833654559703510305
- definition-23339805848113385097
- definition-86058553850737433971
- definition-38992379908141599202
- definition-56291334376925167866
- definition-03414365573327719300
- definition-45912292648393529759
- definition-20463680500734742280
- definition-12521801320787506415
- definition-19459142663306515102
- definition-48226228651046818379
- link-95848970650236781957

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/PolicyProcessing.vb:114-132
PolicyPlus/PolicyProcessing.vb:218-218
PolicyPlus/PolicyProcessing.vb:380-424
PolicyPlus/PolicyProcessing.vb:426-435
PolicyPlus/PolicySource.vb:228-230
PolicyPlus/PolicyStructures.vb:2-73
PolicyPlus/PresentationStructures.vb:2-52
PolicyPlus/RegFile.vb:301-304
PolicyPlus/RegFile.vb:309-314

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-1839121981032461/brief.json
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
link-29690463565094091489 (call) PolicyPlus/PolicyProcessing.vb:42-42: If PolicySource.WillDeleteValue(elemKey, "") Then  ->  PolicyPlus/PolicySource.vb:6: Function WillDeleteValue(Key As String, Value As String) As Boolean
link-45891701836636391590 (call) PolicyPlus/PolicyProcessing.vb:46-46: If PolicySource.GetValueNames(elemKey).Count > 0 Then  ->  PolicyPlus/PolicySource.vb:7: Function GetValueNames(Key As String) As List(Of String)
link-82867272234051588914 (call) PolicyPlus/PolicyProcessing.vb:65-65: ElseIf PolicySource.ContainsValue(elemKey, elem.RegistryValue) Then  ->  PolicyPlus/PolicySource.vb:4: Function ContainsValue(Key As String, Value As String) As Boolean
link-23678224017848868069 (call) PolicyPlus/PolicyProcessing.vb:9-9: If ValuePresent(Value, PolicySource, Key, ValueName) Then EvidenceVar += 1  ->  PolicyPlus/PolicyProcessing.vb:87: Private Shared Function ValuePresent(Value As PolicyRegistryValue, Source As IPolicySource, Key As String, ValueName As String) As Boolean
link-03027626762041365507 (call) PolicyPlus/PolicyProcessing.vb:91-91: Return Source.WillDeleteValue(Key, ValueName)  ->  PolicyPlus/PolicySource.vb:6: Function WillDeleteValue(Key As String, Value As String) As Boolean
link-35727601803716575848 (call) PolicyPlus/PolicyProcessing.vb:93-93: If Not Source.ContainsValue(Key, ValueName) Then Return False  ->  PolicyPlus/PolicySource.vb:4: Function ContainsValue(Key As String, Value As String) As Boolean
link-76763075009398441157 (call) PolicyPlus/PolicyProcessing.vb:94-94: Dim sourceVal = Source.GetValue(Key, ValueName)  ->  PolicyPlus/PolicySource.vb:5: Function GetValue(Key As String, Value As String) As Object
link-15743936855887102747 (call) PolicyPlus/PolicyProcessing.vb:111-111: Return ValuePresent(e.Value, Source, entryKey, e.RegistryValue)  ->  PolicyPlus/PolicyProcessing.vb:87: Private Shared Function ValuePresent(Value As PolicyRegistryValue, Source As IPolicySource, Key As String, ValueName As String) As Boolean
link-17664028057109365865 (call) PolicyPlus/PolicyProcessing.vb:141-141: state.Add(elem.ID, CUInt(PolicySource.GetValue(elemKey, elem.RegistryValue)))  ->  PolicyPlus/PolicySource.vb:5: Function GetValue(Key As String, Value As String) As Object
link-64921812724426814084 (call) PolicyPlus/PolicyProcessing.vb:144-144: state.Add(elem.ID, GetRegistryListState(PolicySource, booleanElem.AffectedRegistry, elemKey, elem.RegistryValue))  ->  PolicyPlus/PolicyProcessing.vb:190: Private Shared Function GetRegistryListState(PolicySource As IPolicySource, RegList As PolicyRegistryList, DefaultKey As String, DefaultValueName As String) As 
link-29633264983036169527 (call) PolicyPlus/PolicyProcessing.vb:151-151: For Each value In PolicySource.GetValueNames(elemKey)  ->  PolicyPlus/PolicySource.vb:7: Function GetValueNames(Key As String) As List(Of String)
link-63710219052428051258 (call) PolicyPlus/PolicyProcessing.vb:159-159: Do While PolicySource.ContainsValue(elemKey, elem.RegistryValue & n)  ->  PolicyPlus/PolicySource.vb:4: Function ContainsValue(Key As String, Value As String) As Boolean
link-84142329819359901063 (call) PolicyPlus/PolicyProcessing.vb:176-176: If ValuePresent(enumItem.Value, PolicySource, elemKey, elem.RegistryValue) Then  ->  PolicyPlus/PolicyProcessing.vb:87: Private Shared Function ValuePresent(Value As PolicyRegistryValue, Source As IPolicySource, Key As String, ValueName As String) As Boolean
link-00075715898270954382 (call) PolicyPlus/PolicyProcessing.vb:177-177: If enumItem.ValueList Is Nothing OrElse ValueListPresent(enumItem.ValueList, PolicySource, elemKey, elem.RegistryValue) Then  ->  PolicyPlus/PolicyProcessing.vb:106: Private Shared Function ValueListPresent(ValueList As PolicyRegistrySingleList, Source As IPolicySource, Key As String, ValueName As String) As Boolean
link-86073188949121286251 (call) PolicyPlus/PolicyProcessing.vb:192-192: Dim isListAllPresent = Function(l As PolicyRegistrySingleList) ValueListPresent(l, PolicySource, DefaultKey, DefaultValueName)  ->  PolicyPlus/PolicyProcessing.vb:106: Private Shared Function ValueListPresent(ValueList As PolicyRegistrySingleList, Source As IPolicySource, Key As String, ValueName As String) As Boolean
link-05365952067896702603 (call) PolicyPlus/PolicyProcessing.vb:194-194: If ValuePresent(RegList.OnValue, PolicySource, DefaultKey, DefaultValueName) Then Return True  ->  PolicyPlus/PolicyProcessing.vb:87: Private Shared Function ValuePresent(Value As PolicyRegistryValue, Source As IPolicySource, Key As String, ValueName As String) As Boolean
link-30350066794925328741 (call) PolicyPlus/PolicyProcessing.vb:198-198: If CUInt(PolicySource.GetValue(DefaultKey, DefaultValueName)) = 1UI Then Return True  ->  PolicyPlus/PolicySource.vb:5: Function GetValue(Key As String, Value As String) As Object
link-71720591776896268819 (call) PolicyPlus/PolicyProcessing.vb:208-208: Return WalkPolicyRegistry(Nothing, Policy, False)  ->  PolicyPlus/PolicyProcessing.vb:213: Private Shared Function WalkPolicyRegistry(PolicySource As IPolicySource, Policy As PolicyPlusPolicy, Forget As Boolean) As List(Of RegistryKeyValuePair)
link-59533111094035662379 (call) PolicyPlus/PolicyProcessing.vb:211-211: WalkPolicyRegistry(PolicySource, Policy, True)  ->  PolicyPlus/PolicyProcessing.vb:213: Private Shared Function WalkPolicyRegistry(PolicySource As IPolicySource, Policy As PolicyPlusPolicy, Forget As Boolean) As List(Of RegistryKeyValuePair)
link-84762035134702463635 (call) PolicyPlus/PolicyProcessing.vb:250-250: PolicySource.ClearKey(elemKey) ' Delete all the values  ->  PolicyPlus/PolicySource.vb:11: Sub ClearKey(Key As String) ' Destroy all values in a key
link-04647426113164443755 (call) PolicyPlus/PolicyProcessing.vb:251-251: PolicySource.ForgetKeyClearance(elemKey)  ->  PolicyPlus/PolicySource.vb:12: Sub ForgetKeyClearance(Key As String) ' Unmark a key as cleared
link-85999024113321410459 (call) PolicyPlus/PolicyProcessing.vb:260-260: PolicySource.ForgetValue(e.Key, e.Value)  ->  PolicyPlus/PolicySource.vb:9: Sub ForgetValue(Key As String, Value As String) ' Stop keeping track of a value
link-79628940633025360036 (call) PolicyPlus/PolicyProcessing.vb:271-271: PolicySource.DeleteValue(Key, ValueName)  ->  PolicyPlus/PolicySource.vb:10: Sub DeleteValue(Key As String, Value As String) ' Mark a value as queued for deletion
link-13994963250346955506 (call) PolicyPlus/PolicyProcessing.vb:273-273: PolicySource.SetValue(Key, ValueName, Value.NumberValue, Microsoft.Win32.RegistryValueKind.DWord)  ->  PolicyPlus/PolicySource.vb:8: Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind)
link-37332958893737351454 (call) PolicyPlus/PolicyProcessing.vb:330-330: If Not listElem.NoPurgeOthers Then PolicySource.ClearKey(elemKey)  ->  PolicyPlus/PolicySource.vb:11: Sub ClearKey(Key As String) ' Destroy all values in a key
link-66158229792483674245 (call) PolicyPlus/PolicyProcessing.vb:441-441: Return EqualsRKVP(obj)  ->  PolicyPlus/PolicyProcessing.vb:436: Public Function EqualsRKVP(other As RegistryKeyValuePair) As Boolean Implements IEquatable(Of RegistryKeyValuePair).Equals
link-94954276690263474739 (dispatches) PolicyPlus/PolicySource.vb:92-92: Public Sub DeleteValue(Key As String, Value As String) Implements IPolicySource.DeleteValue  ->  PolicyPlus/PolicySource.vb:10: Sub DeleteValue(Key As String, Value As String) ' Mark a value as queued for deletion
link-48508439653239739408 (dispatches) PolicyPlus/PolicySource.vb:99-99: Public Sub ForgetValue(Key As String, Value As String) Implements IPolicySource.ForgetValue  ->  PolicyPlus/PolicySource.vb:9: Sub ForgetValue(Key As String, Value As String) ' Stop keeping track of a value
link-14090972373648355238 (dispatches) PolicyPlus/PolicySource.vb:105-105: Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue  ->  PolicyPlus/PolicySource.vb:8: Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind)
link-95161225695426431064 (dispatches) PolicyPlus/PolicySource.vb:110-110: Public Function ContainsValue(Key As String, Value As String) As Boolean Implements IPolicySource.ContainsValue  ->  PolicyPlus/PolicySource.vb:4: Function ContainsValue(Key As String, Value As String) As Boolean
link-88100807227500271554 (dispatches) PolicyPlus/PolicySource.vb:114-114: Public Function GetValue(Key As String, Value As String) As Object Implements IPolicySource.GetValue  ->  PolicyPlus/PolicySource.vb:5: Function GetValue(Key As String, Value As String) As Object
link-25654434052700499297 (dispatches) PolicyPlus/PolicySource.vb:118-118: Public Function WillDeleteValue(Key As String, Value As String) As Boolean Implements IPolicySource.WillDeleteValue  ->  PolicyPlus/PolicySource.vb:6: Function WillDeleteValue(Key As String, Value As String) As Boolean
link-18570218747622984471 (dispatches) PolicyPlus/PolicySource.vb:136-136: Public Function GetValueNames(Key As String) As List(Of String) Implements IPolicySource.GetValueNames  ->  PolicyPlus/PolicySource.vb:7: Function GetValueNames(Key As String) As List(Of String)
link-00733278617642962963 (dispatches) PolicyPlus/PolicySource.vb:183-183: Public Sub ClearKey(Key As String) Implements IPolicySource.ClearKey  ->  PolicyPlus/PolicySource.vb:11: Sub ClearKey(Key As String) ' Destroy all values in a key
link-32536169525534479393 (dispatches) PolicyPlus/PolicySource.vb:190-190: Public Sub ForgetKeyClearance(Key As String) Implements IPolicySource.ForgetKeyClearance  ->  PolicyPlus/PolicySource.vb:12: Sub ForgetKeyClearance(Key As String) ' Unmark a key as cleared
link-85627766230637582241 (dispatches) PolicyPlus/PolicySource.vb:365-365: Public Sub DeleteValue(Key As String, Value As String) Implements IPolicySource.DeleteValue  ->  PolicyPlus/PolicySource.vb:10: Sub DeleteValue(Key As String, Value As String) ' Mark a value as queued for deletion
link-66772097358915347212 (dispatches) PolicyPlus/PolicySource.vb:371-371: Public Sub ForgetValue(Key As String, Value As String) Implements IPolicySource.ForgetValue  ->  PolicyPlus/PolicySource.vb:9: Sub ForgetValue(Key As String, Value As String) ' Stop keeping track of a value
link-57964664168544927726 (dispatches) PolicyPlus/PolicySource.vb:374-374: Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue  ->  PolicyPlus/PolicySource.vb:8: Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind)
link-93302313614779164396 (dispatches) PolicyPlus/PolicySource.vb:384-384: Public Function ContainsValue(Key As String, Value As String) As Boolean Implements IPolicySource.ContainsValue  ->  PolicyPlus/PolicySource.vb:4: Function ContainsValue(Key As String, Value As String) As Boolean
link-76199866243749880870 (dispatches) PolicyPlus/PolicySource.vb:391-391: Public Function GetValue(Key As String, Value As String) As Object Implements IPolicySource.GetValue  ->  PolicyPlus/PolicySource.vb:5: Function GetValue(Key As String, Value As String) As Object
link-07813745092363436073 (dispatches) PolicyPlus/PolicySource.vb:404-404: Public Function GetValueNames(Key As String) As List(Of String) Implements IPolicySource.GetValueNames  ->  PolicyPlus/PolicySource.vb:7: Function GetValueNames(Key As String) As List(Of String)
link-06592189406210868726 (dispatches) PolicyPlus/PolicySource.vb:409-409: Public Function WillDeleteValue(Key As String, Value As String) As Boolean Implements IPolicySource.WillDeleteValue  ->  PolicyPlus/PolicySource.vb:6: Function WillDeleteValue(Key As String, Value As String) As Boolean
link-95350037013088781113 (dispatches) PolicyPlus/PolicySource.vb:416-416: Public Sub ClearKey(Key As String) Implements IPolicySource.ClearKey  ->  PolicyPlus/PolicySource.vb:11: Sub ClearKey(Key As String) ' Destroy all values in a key
link-81630102753615580468 (dispatches) PolicyPlus/PolicySource.vb:421-421: Public Sub ForgetKeyClearance(Key As String) Implements IPolicySource.ForgetKeyClearance  ->  PolicyPlus/PolicySource.vb:12: Sub ForgetKeyClearance(Key As String) ' Unmark a key as cleared
link-84472571355529142431 (dispatches) PolicyPlus/RegFile.vb:214-214: Public Function ContainsValue(Key As String, Value As String) As Boolean Implements IPolicySource.ContainsValue  ->  PolicyPlus/PolicySource.vb:4: Function ContainsValue(Key As String, Value As String) As Boolean
link-66387722021715326218 (dispatches) PolicyPlus/RegFile.vb:217-217: Public Function GetValue(Key As String, Value As String) As Object Implements IPolicySource.GetValue  ->  PolicyPlus/PolicySource.vb:5: Function GetValue(Key As String, Value As String) As Object
link-38551245301948845232 (dispatches) PolicyPlus/RegFile.vb:220-220: Public Function WillDeleteValue(Key As String, Value As String) As Boolean Implements IPolicySource.WillDeleteValue  ->  PolicyPlus/PolicySource.vb:6: Function WillDeleteValue(Key As String, Value As String) As Boolean
link-38874126370547524513 (dispatches) PolicyPlus/RegFile.vb:223-223: Public Function GetValueNames(Key As String) As List(Of String) Implements IPolicySource.GetValueNames  ->  PolicyPlus/PolicySource.vb:7: Function GetValueNames(Key As String) As List(Of String)
link-97401515572588274605 (dispatches) PolicyPlus/RegFile.vb:226-226: Public Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind) Implements IPolicySource.SetValue  ->  PolicyPlus/PolicySource.vb:8: Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind)
link-27073978145247136976 (dispatches) PolicyPlus/RegFile.vb:237-237: Public Sub ForgetValue(Key As String, Value As String) Implements IPolicySource.ForgetValue  ->  PolicyPlus/PolicySource.vb:9: Sub ForgetValue(Key As String, Value As String) ' Stop keeping track of a value
link-33109841835808834985 (dispatches) PolicyPlus/RegFile.vb:240-240: Public Sub DeleteValue(Key As String, Value As String) Implements IPolicySource.DeleteValue  ->  PolicyPlus/PolicySource.vb:10: Sub DeleteValue(Key As String, Value As String) ' Mark a value as queued for deletion
link-46433156821030877243 (dispatches) PolicyPlus/RegFile.vb:248-248: Public Sub ClearKey(Key As String) Implements IPolicySource.ClearKey  ->  PolicyPlus/PolicySource.vb:11: Sub ClearKey(Key As String) ' Destroy all values in a key
link-84764557546841109960 (dispatches) PolicyPlus/RegFile.vb:254-254: Public Sub ForgetKeyClearance(Key As String) Implements IPolicySource.ForgetKeyClearance  ->  PolicyPlus/PolicySource.vb:12: Sub ForgetKeyClearance(Key As String) ' Unmark a key as cleared
link-97259565237584314451 (reads) PolicyPlus/PolicySource.vb:27-27: Using fPol As New FileStream(File, FileMode.Open, FileAccess.Read), binary As New BinaryReader(fPol)  ->  external-75125161121246095518 File
link-12282840928982462373 (call) PolicyPlus/PolicySource.vb:28-28: Return Load(binary)  ->  PolicyPlus/PolicySource.vb:31: Public Shared Function Load(Stream As BinaryReader) As PolFile
link-19007468340167822936 (call) PolicyPlus/PolicySource.vb:59-59: pol.Entries(pol.GetDictKey(key, value)) = ped  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-40387577913639165749 (saves) PolicyPlus/PolicySource.vb:64-64: Using fPol As New FileStream(File, FileMode.Create), binary As New BinaryWriter(fPol, Text.Encoding.Unicode)  ->  external-75125161121246095518 File
link-85491432974457288568 (call) PolicyPlus/PolicySource.vb:65-65: Save(binary)  ->  PolicyPlus/PolicySource.vb:68: Public Sub Save(Writer As BinaryWriter)
link-75478901059731806102 (call) PolicyPlus/PolicySource.vb:93-93: ForgetValue(Key, Value)  ->  PolicyPlus/PolicySource.vb:99: Public Sub ForgetValue(Key As String, Value As String) Implements IPolicySource.ForgetValue
link-82495402271560394200 (call) PolicyPlus/PolicySource.vb:94-94: If Not WillDeleteValue(Key, Value) Then  ->  PolicyPlus/PolicySource.vb:118: Public Function WillDeleteValue(Key As String, Value As String) As Boolean Implements IPolicySource.WillDeleteValue
link-12710222415447263470 (call) PolicyPlus/PolicySource.vb:95-95: Dim ped = PolEntryData.FromDword(32) ' It's what Microsoft does  ->  PolicyPlus/PolicySource.vb:255: Public Shared Function FromDword(Dword As UInteger) As PolEntryData
link-38514500964881625329 (call) PolicyPlus/PolicySource.vb:96-96: Entries.Add(GetDictKey(Key, "**del." & Value), ped)  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-67424845959068121774 (call) PolicyPlus/PolicySource.vb:100-100: Dim dictKey = GetDictKey(Key, Value)  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-35397789580725978707 (call) PolicyPlus/PolicySource.vb:106-106: Dim dictKey = GetDictKey(Key, Value)  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-59251645500760939404 (call) PolicyPlus/PolicySource.vb:108-108: Entries.Add(dictKey, PolEntryData.FromArbitrary(Data, DataType))  ->  PolicyPlus/PolicySource.vb:337: Public Shared Function FromArbitrary(Data As Object, Kind As RegistryValueKind) As PolEntryData
link-16996161115602287517 (call) PolicyPlus/PolicySource.vb:111-111: If WillDeleteValue(Key, Value) Then Return False  ->  PolicyPlus/PolicySource.vb:118: Public Function WillDeleteValue(Key As String, Value As String) As Boolean Implements IPolicySource.WillDeleteValue
link-06151508470582450131 (call) PolicyPlus/PolicySource.vb:112-112: Return Entries.ContainsKey(GetDictKey(Key, Value))  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-96430003841601538504 (call) PolicyPlus/PolicySource.vb:115-115: If Not ContainsValue(Key, Value) Then Return Nothing  ->  PolicyPlus/PolicySource.vb:110: Public Function ContainsValue(Key As String, Value As String) As Boolean Implements IPolicySource.ContainsValue
link-54388364302801345769 (call) PolicyPlus/PolicySource.vb:116-116: Return Entries(GetDictKey(Key, Value)).AsArbitrary  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-35691801062085636722 (call) PolicyPlus/PolicySource.vb:116-116: Return Entries(GetDictKey(Key, Value)).AsArbitrary  ->  PolicyPlus/PolicySource.vb:320: Public Function AsArbitrary() As Object
link-42275619938221401776 (call) PolicyPlus/PolicySource.vb:120-120: Dim keyRoot = GetDictKey(Key, "")  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-94536044719472571681 (call) PolicyPlus/PolicySource.vb:128-128: Dim deletedValues = Split(kv.Value.AsString, ";")  ->  PolicyPlus/PolicySource.vb:231: Public Function AsString() As String ' Get a UTF-16LE string
link-48783717157139051895 (call) PolicyPlus/PolicySource.vb:137-137: Return GetValueNames(Key, True)  ->  PolicyPlus/PolicySource.vb:139: Public Function GetValueNames(Key As String, OnlyValues As Boolean) As List(Of String)
link-51239622030897960920 (call) PolicyPlus/PolicySource.vb:140-140: Dim prefix = GetDictKey(Key, "")  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-29445429300640794611 (call) PolicyPlus/PolicySource.vb:158-158: Target.DeleteValue(parts(0), Split(parts(1), ".", 2)(1))  ->  PolicyPlus/PolicySource.vb:10: Sub DeleteValue(Key As String, Value As String) ' Mark a value as queued for deletion
link-35030108764218774776 (call) PolicyPlus/PolicySource.vb:160-160: Target.ClearKey(parts(0))  ->  PolicyPlus/PolicySource.vb:11: Sub ClearKey(Key As String) ' Destroy all values in a key
link-94099905691665412542 (call) PolicyPlus/PolicySource.vb:162-162: For Each entry In Split(kv.Value.AsString, ";")  ->  PolicyPlus/PolicySource.vb:231: Public Function AsString() As String ' Get a UTF-16LE string
link-96848165263624299758 (call) PolicyPlus/PolicySource.vb:170-170: Target.SetValue(casedParts(0), casedParts(1), kv.Value.AsArbitrary(), kv.Value.Kind)  ->  PolicyPlus/PolicySource.vb:8: Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind)
link-19257174985096483666 (call) PolicyPlus/PolicySource.vb:170-170: Target.SetValue(casedParts(0), casedParts(1), kv.Value.AsArbitrary(), kv.Value.Kind)  ->  PolicyPlus/PolicySource.vb:320: Public Function AsArbitrary() As Object
link-82907219449230477322 (call) PolicyPlus/PolicySource.vb:174-174: For Each e In oldEntries.Where(AddressOf RegistryPolicyProxy.IsPolicyKey) ' Remove the forgotten entries from the Registry  ->  PolicyPlus/PolicySource.vb:412: Public Shared Function IsPolicyKey(KeyPath As String) As Boolean
link-85535451869360394613 (call) PolicyPlus/PolicySource.vb:176-176: Target.ForgetValue(parts(0), parts(1))  ->  PolicyPlus/PolicySource.vb:9: Sub ForgetValue(Key As String, Value As String) ' Stop keeping track of a value
link-68677913385952749818 (call) PolicyPlus/PolicySource.vb:181-181: ApplyDifference(Nothing, Target)  ->  PolicyPlus/PolicySource.vb:150: Public Sub ApplyDifference(OldVersion As PolFile, Target As IPolicySource)
link-63089311429822510886 (call) PolicyPlus/PolicySource.vb:184-184: For Each value In GetValueNames(Key, False)  ->  PolicyPlus/PolicySource.vb:139: Public Function GetValueNames(Key As String, OnlyValues As Boolean) As List(Of String)
link-23150926107512987427 (call) PolicyPlus/PolicySource.vb:185-185: ForgetValue(Key, value)  ->  PolicyPlus/PolicySource.vb:99: Public Sub ForgetValue(Key As String, Value As String) Implements IPolicySource.ForgetValue
link-61788762951433862119 (call) PolicyPlus/PolicySource.vb:187-187: Dim ped = PolEntryData.FromString(" ")  ->  PolicyPlus/PolicySource.vb:240: Public Shared Function FromString(Text As String, Optional Expand As Boolean = False) As PolEntryData ' Save a UTF-16LE string
link-43769352681428927492 (call) PolicyPlus/PolicySource.vb:188-188: Entries.Add(GetDictKey(Key, "**delvals."), ped)  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-70491266907663477107 (call) PolicyPlus/PolicySource.vb:191-191: Dim keyDeleter = GetDictKey(Key, "**delvals")  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-19052993037937802606 (call) PolicyPlus/PolicySource.vb:209-209: Return Entries(GetDictKey(Key, Value)).Kind  ->  PolicyPlus/PolicySource.vb:20: Private Function GetDictKey(Key As String, Value As String) As String
link-60825717445296333849 (call) PolicyPlus/PolicySource.vb:214-214: Save(writer)  ->  PolicyPlus/PolicySource.vb:68: Public Sub Save(Writer As BinaryWriter)
link-29345188577513944286 (call) PolicyPlus/PolicySource.vb:218-218: Return Load(reader)  ->  PolicyPlus/PolicySource.vb:31: Public Shared Function Load(Stream As BinaryReader) As PolFile
link-89191563406380027803 (call) PolicyPlus/PolicySource.vb:223-223: Return PolEntryData.FromArbitrary(Data, Kind).Data  ->  PolicyPlus/PolicySource.vb:337: Public Shared Function FromArbitrary(Data As Object, Kind As RegistryValueKind) As PolEntryData
link-80819362181267910713 (call) PolicyPlus/PolicySource.vb:226-226: Return (New PolEntryData With {.Data = Data, .Kind = Kind}).AsArbitrary()  ->  PolicyPlus/PolicySource.vb:320: Public Function AsArbitrary() As Object
link-02640027693835462854 (call) PolicyPlus/PolicySource.vb:341-341: Return FromString(Data)  ->  PolicyPlus/PolicySource.vb:240: Public Shared Function FromString(Text As String, Optional Expand As Boolean = False) As PolEntryData ' Save a UTF-16LE string
link-77907891680502577707 (call) PolicyPlus/PolicySource.vb:343-343: Return FromDword(Data)  ->  PolicyPlus/PolicySource.vb:255: Public Shared Function FromDword(Dword As UInteger) As PolEntryData
link-35098657078960853531 (call) PolicyPlus/PolicySource.vb:345-345: Return FromString(Data, True)  ->  PolicyPlus/PolicySource.vb:240: Public Shared Function FromString(Text As String, Optional Expand As Boolean = False) As PolEntryData ' Save a UTF-16LE string
link-55487326027551724663 (call) PolicyPlus/PolicySource.vb:347-347: Return FromQword(Data)  ->  PolicyPlus/PolicySource.vb:272: Public Shared Function FromQword(Qword As ULong) As PolEntryData
link-09269286770631090943 (call) PolicyPlus/PolicySource.vb:349-349: Return FromMultiString(Data)  ->  PolicyPlus/PolicySource.vb:296: Public Shared Function FromMultiString(Strings As String()) As PolEntryData
link-60605381034528625860 (call) PolicyPlus/PolicySource.vb:351-351: Return FromBinary(Data, Kind)  ->  PolicyPlus/PolicySource.vb:315: Public Shared Function FromBinary(Binary As Byte(), Optional Kind As RegistryValueKind = RegistryValueKind.Binary) As PolEntryData
link-65127233429738408771 (call) PolicyPlus/PolicySource.vb:324-324: Return AsString()  ->  PolicyPlus/PolicySource.vb:231: Public Function AsString() As String ' Get a UTF-16LE string
link-27121190528909847630 (call) PolicyPlus/PolicySource.vb:326-326: Return AsDword()  ->  PolicyPlus/PolicySource.vb:252: Public Function AsDword() As UInteger
link-41875790897486281488 (call) PolicyPlus/PolicySource.vb:330-330: Return AsQword()  ->  PolicyPlus/PolicySource.vb:265: Public Function AsQword() As ULong
link-56030283835122050270 (call) PolicyPlus/PolicySource.vb:332-332: Return AsMultiString()  ->  PolicyPlus/PolicySource.vb:281: Public Function AsMultiString() As String()
link-95381289792734530606 (call) PolicyPlus/PolicySource.vb:334-334: Return AsBinary()  ->  PolicyPlus/PolicySource.vb:312: Public Function AsBinary() As Byte()
link-14709055937013936478 (reads) PolicyPlus/PolicySource.vb:363-363: Return EncapsulateKey(RegistryKey.OpenBaseKey(Key, RegistryView.Default))  ->  external-76952632453450489524 Key
link-65965803566172310064 (call) PolicyPlus/PolicySource.vb:363-363: Return EncapsulateKey(RegistryKey.OpenBaseKey(Key, RegistryView.Default))  ->  PolicyPlus/PolicySource.vb:359: Public Shared Function EncapsulateKey(Key As RegistryKey) As RegistryPolicyProxy
link-19165738500213762362 (saves) PolicyPlus/PolicySource.vb:366-366: Using regKey = RootKey.OpenSubKey(Key, True)  ->  external-76952632453450489524 Key
link-05409883854937002520 (call) PolicyPlus/PolicySource.vb:372-372: DeleteValue(Key, Value) ' The Registry has no concept of "will delete this when I see it"  ->  PolicyPlus/PolicySource.vb:365: Public Sub DeleteValue(Key As String, Value As String) Implements IPolicySource.DeleteValue
link-17694865287853292556 (saves) PolicyPlus/PolicySource.vb:380-380: Using regKey = RootKey.CreateSubKey(Key)  ->  external-76952632453450489524 Key
link-16056769770687513097 (reads) PolicyPlus/PolicySource.vb:385-385: Using regKey = RootKey.OpenSubKey(Key)  ->  external-76952632453450489524 Key
link-34618767484191365497 (reads) PolicyPlus/PolicySource.vb:392-392: Using regKey = RootKey.OpenSubKey(Key, False)  ->  external-76952632453450489524 Key
link-06821271994449915942 (reads) PolicyPlus/PolicySource.vb:405-405: Using regKey = RootKey.OpenSubKey(Key)  ->  external-76952632453450489524 Key
link-77093268452297876463 (call) PolicyPlus/PolicySource.vb:417-417: For Each value In GetValueNames(Key)  ->  PolicyPlus/PolicySource.vb:404: Public Function GetValueNames(Key As String) As List(Of String) Implements IPolicySource.GetValueNames
link-24599198718335988383 (call) PolicyPlus/PolicySource.vb:418-418: ForgetValue(Key, value)  ->  PolicyPlus/PolicySource.vb:371: Public Sub ForgetValue(Key As String, Value As String) Implements IPolicySource.ForgetValue
link-88797624772689641983 (call) PolicyPlus/PolicySource.vb:413-413: Return PolicyKeys.Any(Function(pk) KeyPath.StartsWith(pk & "\", StringComparison.InvariantCultureIgnoreCase) Or  ->  PolicyPlus/PolicySource.vb:429: Public Shared ReadOnly Property PolicyKeys As IEnumerable(Of String)
link-01441835326602425398 (call) PolicyPlus/Privilege.vb:8-8: PInvoke.OpenProcessToken(PInvoke.GetCurrentProcess, &H28, thisProcToken) ' 0x28 = TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY  ->  PolicyPlus/PInvoke.vb:8: Declare Function OpenProcessToken Lib "advapi32.dll" (Process As IntPtr, Access As UInteger, ByRef TokenHandle As IntPtr) As Boolean
link-18981096331228203708 (call) PolicyPlus/Privilege.vb:8-8: PInvoke.OpenProcessToken(PInvoke.GetCurrentProcess, &H28, thisProcToken) ' 0x28 = TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY  ->  PolicyPlus/PInvoke.vb:7: Declare Function GetCurrentProcess Lib "kernel32.dll" () As IntPtr
link-84142668714322177656 (call) PolicyPlus/Privilege.vb:9-9: PInvoke.LookupPrivilegeValueW(Nothing, Name, luid)  ->  PolicyPlus/PInvoke.vb:10: Declare Unicode Function LookupPrivilegeValueW Lib "advapi32.dll" (SystemName As String, Name As String, ByRef LUID As PInvokeLuid) As Boolean
link-99351259876974565654 (call) PolicyPlus/Privilege.vb:13-13: PInvoke.AdjustTokenPrivileges(thisProcToken, False, priv, Marshal.SizeOf(priv), IntPtr.Zero, 0)  ->  PolicyPlus/PInvoke.vb:9: Declare Function AdjustTokenPrivileges Lib "advapi32.dll" (Token As IntPtr, DisableAll As Boolean, ByRef NewState As PInvokeTokenPrivileges, BufferLength As UIn
link-99771600082414729675 (call) PolicyPlus/Privilege.vb:14-14: PInvoke.CloseHandle(thisProcToken)  ->  PolicyPlus/PInvoke.vb:11: Declare Function CloseHandle Lib "kernel32.dll" (Handle As IntPtr) As Boolean
link-62262860629983837252 (call) PolicyPlus/RegFile.vb:49-49: reg.SetPrefix(Prefix)  ->  PolicyPlus/RegFile.vb:276: Public Sub SetPrefix(Prefix As String)
link-26607222932609700787 (call) PolicyPlus/RegFile.vb:51-51: Dim keyHeader = ReadNonCommentingLine(Reader)  ->  PolicyPlus/RegFile.vb:37: Private Shared Function ReadNonCommentingLine(Reader As StreamReader, Optional StopAt As Char? = Nothing) As String
link-71763046021751261018 (call) PolicyPlus/RegFile.vb:69-69: valueName = UnescapeValue(parts(0).Substring(1))  ->  PolicyPlus/RegFile.vb:21: Private Shared Function UnescapeValue(Text As String) As String
link-08444163485793613477 (call) PolicyPlus/RegFile.vb:103-103: value.Data = PolFile.BytesToObject(allDehexedBytes.ToArray, value.Kind)  ->  PolicyPlus/PolicySource.vb:225: Public Shared Function BytesToObject(Data As Byte(), Kind As RegistryValueKind) As Object
link-49182133718713754560 (reads) PolicyPlus/RegFile.vb:113-113: Using reader As New StreamReader(File)  ->  external-75125161121246095518 File
link-88396050561786251014 (call) PolicyPlus/RegFile.vb:114-114: Return Load(reader, Prefix)  ->  PolicyPlus/RegFile.vb:46: Public Shared Function Load(Reader As StreamReader, Prefix As String) As RegFile
link-22143965150881325746 (call) PolicyPlus/RegFile.vb:131-131: Dim quotedName = """" & EscapeValue(value.Name) & """"  ->  PolicyPlus/RegFile.vb:11: Private Shared Function EscapeValue(Text As String) As String
link-35126535202108221638 (call) PolicyPlus/RegFile.vb:159-159: Dim bytes = PolFile.ObjectToBytes(value.Data, value.Kind)  ->  PolicyPlus/PolicySource.vb:222: Public Shared Function ObjectToBytes(Data As Object, Kind As RegistryValueKind) As Byte()
link-11537006031394644738 (saves) PolicyPlus/RegFile.vb:183-183: Using writer As New StreamWriter(File, False)  ->  external-75125161121246095518 File
link-98493024809162003523 (call) PolicyPlus/RegFile.vb:184-184: Save(writer)  ->  PolicyPlus/RegFile.vb:117: Public Sub Save(Writer As StreamWriter)
link-34724510861150561630 (call) PolicyPlus/RegFile.vb:197-197: Return GetKey(PrefixKeyName(Name))  ->  PolicyPlus/RegFile.vb:193: Private Function GetKey(Name As String) As RegFileKey
link-31720144820046715787 (call) PolicyPlus/RegFile.vb:197-197: Return GetKey(PrefixKeyName(Name))  ->  PolicyPlus/RegFile.vb:190: Private Function PrefixKeyName(Name As String) As String
link-04493909663194747266 (call) PolicyPlus/RegFile.vb:200-200: Dim key = GetKey(Name)  ->  PolicyPlus/RegFile.vb:193: Private Function GetKey(Name As String) As RegFileKey
link-49155277312075112335 (call) PolicyPlus/RegFile.vb:227-227: If Not IsSourceKeyAcceptable(Key) Then Exit Sub  ->  PolicyPlus/RegFile.vb:210: Private Function IsSourceKeyAcceptable(Key As String) As Boolean
link-45056555818170393962 (call) PolicyPlus/RegFile.vb:228-228: Dim fullKeyName = PrefixKeyName(Key)  ->  PolicyPlus/RegFile.vb:190: Private Function PrefixKeyName(Name As String) As String
link-99942735961893804274 (call) PolicyPlus/RegFile.vb:229-229: Dim keyRecord = GetNonDeleterKey(fullKeyName)  ->  PolicyPlus/RegFile.vb:207: Private Function GetNonDeleterKey(Name As String) As RegFileKey
link-15801861295889676691 (call) PolicyPlus/RegFile.vb:234-234: keyRecord.Values.Remove(keyRecord.GetValue(Value))  ->  PolicyPlus/RegFile.vb:305: Public Function GetValue(Value As String) As RegFileValue
link-26544416197157448794 (call) PolicyPlus/RegFile.vb:241-241: If Not IsSourceKeyAcceptable(Key) Then Exit Sub  ->  PolicyPlus/RegFile.vb:210: Private Function IsSourceKeyAcceptable(Key As String) As Boolean
link-17941503798999635038 (call) PolicyPlus/RegFile.vb:242-242: Dim fullKeyName = PrefixKeyName(Key)  ->  PolicyPlus/RegFile.vb:190: Private Function PrefixKeyName(Name As String) As String
link-75780235856220586833 (call) PolicyPlus/RegFile.vb:243-243: Dim keyRecord = GetOrCreateKey(fullKeyName)  ->  PolicyPlus/RegFile.vb:199: Private Function GetOrCreateKey(Name As String) As RegFileKey
link-35295485278262097130 (call) PolicyPlus/RegFile.vb:245-245: keyRecord.Values.Remove(keyRecord.GetValue(Value))  ->  PolicyPlus/RegFile.vb:305: Public Function GetValue(Value As String) As RegFileValue
link-61539611009263445179 (call) PolicyPlus/RegFile.vb:249-249: If Not IsSourceKeyAcceptable(Key) Then Exit Sub  ->  PolicyPlus/RegFile.vb:210: Private Function IsSourceKeyAcceptable(Key As String) As Boolean
link-04552125081804265857 (call) PolicyPlus/RegFile.vb:250-250: Dim fullName = PrefixKeyName(Key)  ->  PolicyPlus/RegFile.vb:190: Private Function PrefixKeyName(Name As String) As String
link-87158781183532236246 (call) PolicyPlus/RegFile.vb:251-251: Keys.Remove(GetKey(fullName))  ->  PolicyPlus/RegFile.vb:193: Private Function GetKey(Name As String) As RegFileKey
link-54410283755723144125 (call) PolicyPlus/RegFile.vb:255-255: If Not IsSourceKeyAcceptable(Key) Then Exit Sub  ->  PolicyPlus/RegFile.vb:210: Private Function IsSourceKeyAcceptable(Key As String) As Boolean
link-61574675953476992220 (call) PolicyPlus/RegFile.vb:256-256: Dim keyRecord = GetKeyByUnprefixedName(Key)  ->  PolicyPlus/RegFile.vb:196: Private Function GetKeyByUnprefixedName(Name As String) As RegFileKey
link-03571169828289453331 (call) PolicyPlus/RegFile.vb:262-262: Dim unprefixedKeyName = UnprefixKeyName(key.Name)  ->  PolicyPlus/RegFile.vb:187: Private Function UnprefixKeyName(Name As String) As String
link-07401672466060336856 (call) PolicyPlus/RegFile.vb:264-264: Target.ClearKey(unprefixedKeyName)  ->  PolicyPlus/PolicySource.vb:11: Sub ClearKey(Key As String) ' Destroy all values in a key
link-64094098772904451524 (call) PolicyPlus/RegFile.vb:268-268: Target.DeleteValue(unprefixedKeyName, value.Name)  ->  PolicyPlus/PolicySource.vb:10: Sub DeleteValue(Key As String, Value As String) ' Mark a value as queued for deletion
link-49231204965151810030 (call) PolicyPlus/RegFile.vb:270-270: Target.SetValue(unprefixedKeyName, value.Name, value.Data, value.Kind)  ->  PolicyPlus/PolicySource.vb:8: Sub SetValue(Key As String, Value As String, Data As Object, DataType As RegistryValueKind)
link-95848970650236781957 (call) PolicyPlus/PolicyProcessing.vb:218-218: If Not entries.Contains(rkvp) Then entries.Add(rkvp)  ->  PolicyPlus/PolicyProcessing.vb:437: Return other.Key.Equals(Key, StringComparison.InvariantCultureIgnoreCase) And other.Value.Equals(Value, StringComparison.InvariantCultureIgnoreCase)
