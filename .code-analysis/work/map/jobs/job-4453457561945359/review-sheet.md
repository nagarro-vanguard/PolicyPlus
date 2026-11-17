# Review sheet: the code of PolicyPlus/OpenPol.vb and 10 more files

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- block-25471216640260575426
- block-58654765347366674640
- block-02690637518137896045
- block-91511572324874268502
- block-14764930039742930697
- block-81933578054584948953
- block-84981333459386604473
- block-84879306412435834867
- block-55332698324657732598
- block-54963840872289651423
- link-75634264788748795551
- link-61262702585508312216
- codekind-19139261118210427968
- link-02502350730558781614
- link-82500255903800520866
- link-19700574552175938161

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/OpenUserRegistry.vb:8-11
PolicyPlus/PolicyLoader.vb:11-236

## Read besides the findings
- the rules for a block, and the facts on the parts and technologies the lines touch: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-4453457561945359/brief.json
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
link-88636378776239013095 (renders) PolicyPlus/OpenPol.vb:38-41: Using sfd As New SaveFileDialog  ->  external-29531700766871564844 SaveFileDialog.ShowDialog
link-16906604650503542657 (call) PolicyPlus/OpenPol.vb:67-67: BrowseForPol(CompPolFilenameTextbox)  ->  PolicyPlus/OpenPol.vb:37: ' Browse for a POL file and put it in a text box [a comment]
link-71262819408190436669 (call) PolicyPlus/OpenPol.vb:70-70: BrowseForPol(UserPolFilenameTextbox)  ->  PolicyPlus/OpenPol.vb:37: ' Browse for a POL file and put it in a text box [a comment]
link-43250146260443076673 (renders) PolicyPlus/OpenPol.vb:74-74: If OpenUserRegistry.ShowDialog = DialogResult.OK Then UserHivePathTextbox.Text = OpenUserRegistry.SelectedFilePath  ->  PolicyPlus/OpenUserRegistry.vb:4: ' Set up the UI [a comment]
link-52368084046206526177 (call) PolicyPlus/OpenPol.vb:79-87: If CompLocalOption.Checked Then  ->  PolicyPlus/PolicyLoader.vb:12: SourceType = Source
link-48757823488362270917 (call) PolicyPlus/OpenPol.vb:93-105: If UserLocalOption.Checked Then  ->  PolicyPlus/PolicyLoader.vb:12: SourceType = Source
link-88818514568802674067 (renders) PolicyPlus/OpenPol.vb:89-89: MsgBox("The computer policy loader could not be created. " & ex.Message, MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-90989306653065748292 (renders) PolicyPlus/OpenPol.vb:107-107: MsgBox("The user policy loader could not be created. " & ex.Message, MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-88966792067021675598 (renders) PolicyPlus/OpenPol.vb:114-114: If OpenUserGpo.ShowDialog = DialogResult.OK Then UserGpoSidTextbox.Text = OpenUserGpo.SelectedSid  ->  PolicyPlus/OpenUserGpo.vb:31: SidTextbox.Text = ""
link-46939351365274697020 (renders) PolicyPlus/OpenSection.vb:20-20: Return ShowDialog()  ->  external-29531700766871564844 Form.ShowDialog
link-74624212723471900427 (reads) PolicyPlus/OpenUserGpo.vb:7-9: Dim userAccount As New NTAccount(UsernameTextbox.Text)  ->  external-52206529630390924742 NTAccount.Translate
link-87719126555630761240 (renders) PolicyPlus/OpenUserGpo.vb:11-11: MsgBox("The name could not be translated to a SID.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-88504090060471387306 (call) PolicyPlus/OpenUserGpo.vb:17-17: SearchButton_Click(Nothing, Nothing)  ->  PolicyPlus/OpenUserGpo.vb:5: ' Resolve the username to a security identifier (SID) [a comment]
link-18876018355286999886 (renders) PolicyPlus/OpenUserGpo.vb:24-24: MsgBox("The SID is not valid. Enter a SID in the lower box, or enter a username in the top box and press Search to translate.", MsgBoxStyle.Exclamation)  ->  external-29531700766871564844 MsgBox
link-14450758018288914429 (reads) PolicyPlus/OpenUserRegistry.vb:12-17: Dim ntuserPath = folder & "\ntuser.dat"  ->  external-75125161121246095518 \ntuser.dat
link-61872170664276909507 (call) PolicyPlus/PInvoke.vb:3-3: Declare Function ShowScrollBar Lib "user32.dll" (Handle As IntPtr, Scrollbar As Integer, Show As Boolean) As Boolean  ->  external-87957439116533923526 ShowScrollBar
link-26616216425548132981 (call) PolicyPlus/PInvoke.vb:4-4: Declare Function RefreshPolicyEx Lib "userenv.dll" (IsMachine As Boolean, Options As UInteger) As Boolean  ->  external-87957439116533923526 RefreshPolicyEx
link-60429266076686553372 (call) PolicyPlus/PInvoke.vb:5-5: Declare Unicode Function RegLoadKeyW Lib "advapi32.dll" (HiveKey As IntPtr, Subkey As String, File As String) As Integer  ->  external-87957439116533923526 RegLoadKeyW
link-05463457693931860032 (call) PolicyPlus/PInvoke.vb:6-6: Declare Unicode Function RegUnLoadKeyW Lib "advapi32.dll" (HiveKey As IntPtr, Subkey As String) As Integer  ->  external-87957439116533923526 RegUnLoadKeyW
link-53963311680615981627 (call) PolicyPlus/PInvoke.vb:7-7: Declare Function GetCurrentProcess Lib "kernel32.dll" () As IntPtr  ->  external-87957439116533923526 GetCurrentProcess
link-57772892392814746817 (call) PolicyPlus/PInvoke.vb:8-8: Declare Function OpenProcessToken Lib "advapi32.dll" (Process As IntPtr, Access As UInteger, ByRef TokenHandle As IntPtr) As Boolean  ->  external-87957439116533923526 OpenProcessToken
link-61870362687382412219 (call) PolicyPlus/PInvoke.vb:9-9: Declare Function AdjustTokenPrivileges Lib "advapi32.dll" (Token As IntPtr, DisableAll As Boolean, ByRef NewState As PInvokeTokenPrivileges, BufferLength As UIn  ->  external-87957439116533923526 AdjustTokenPrivileges
link-65821701965264848307 (call) PolicyPlus/PInvoke.vb:10-10: Declare Unicode Function LookupPrivilegeValueW Lib "advapi32.dll" (SystemName As String, Name As String, ByRef LUID As PInvokeLuid) As Boolean  ->  external-87957439116533923526 LookupPrivilegeValueW
link-92067048497230914288 (call) PolicyPlus/PInvoke.vb:11-11: Declare Function CloseHandle Lib "kernel32.dll" (Handle As IntPtr) As Boolean  ->  external-87957439116533923526 CloseHandle
link-73395891593314206326 (call) PolicyPlus/PInvoke.vb:12-12: Declare Function GetProductInfo Lib "kernel32.dll" (MajorVersion As Integer, MinorVersion As Integer, SPMajor As Integer, SPMinor As Integer, ByRef EditionCode   ->  external-87957439116533923526 GetProductInfo
link-69171399886899925638 (call) PolicyPlus/PInvoke.vb:13-13: Declare Unicode Function SendNotifyMessageW Lib "user32.dll" (Handle As IntPtr, Message As Integer, WParam As UIntPtr, LParam As IntPtr) As Boolean  ->  external-87957439116533923526 SendNotifyMessageW
link-25309706857579579680 (reads) PolicyPlus/PolicyLoader.vb:24-32: If baseName = "hkcu" Or baseName = "hkey_current_user" Then  ->  external-76952632453450489524 RegistryKey.OpenBaseKey
link-94552061930386411219 (saves) PolicyPlus/PolicyLoader.vb:33-34: If pathParts.Length = 2 Then  ->  external-76952632453450489524 RegistryKey.CreateSubKey
link-24985586091132313569 (call) PolicyPlus/PolicyLoader.vb:53-53: Dim regPol = RegistryPolicyProxy.EncapsulateKey(MainSourceRegKey)  ->  PolicyPlus/PolicySource.vb:359: Public Shared Function EncapsulateKey(Key As RegistryKey) As RegistryPolicyProxy
link-78583581382669753553 (call) PolicyPlus/PolicyLoader.vb:55-55: regPol.SetValue("Software\Policies", "_PolicyPlusSecCheck", "Testing to see whether Policy Plus can write to policy keys", RegistryValueKind.String)  ->  PolicyPlus/PolicySource.vb:375: If TypeOf Data Is UInteger Then
link-32356672096312141700 (call) PolicyPlus/PolicyLoader.vb:56-56: regPol.DeleteValue("Software\Policies", "_PolicyPlusSecCheck")  ->  PolicyPlus/PolicySource.vb:366: Using regKey = RootKey.OpenSubKey(Key, True)
link-88088592013464232569 (call) PolicyPlus/PolicyLoader.vb:64-65: Privilege.EnablePrivilege("SeBackupPrivilege")  ->  PolicyPlus/Privilege.vb:4: ' Enable the given Win32 privilege [a comment]
link-65733747193935119694 (call) PolicyPlus/PolicyLoader.vb:69-69: PInvoke.RegLoadKeyW(New IntPtr(&H80000002), subkeyName, MainSourcePath) ' HKEY_LOCAL_MACHINE  ->  PolicyPlus/PInvoke.vb:5: Declare Unicode Function RegLoadKeyW Lib "advapi32.dll" (HiveKey As IntPtr, Subkey As String, File As String) As Integer
link-74063691377324114426 (reads) PolicyPlus/PolicyLoader.vb:70-70: MainSourceRegKey = machHive.OpenSubKey(subkeyName, True)  ->  external-76952632453450489524 PolicyPlusMount:
link-48726700999556993826 (reads) PolicyPlus/PolicyLoader.vb:83-92: If IO.File.Exists(MainSourcePath) Then  ->  external-75125161121246095518 MainSourcePath
link-34717882615001589729 (call) PolicyPlus/PolicyLoader.vb:92-92: SourceObject = PolFile.Load(MainSourcePath)  ->  PolicyPlus/PolicySource.vb:27: Using fPol As New FileStream(File, FileMode.Open, FileAccess.Read), binary As New BinaryReader(fPol)
link-74715823149397386549 (saves) PolicyPlus/PolicyLoader.vb:95-100: Try  ->  external-75125161121246095518 MainSourcePath
link-86137283972111934603 (call) PolicyPlus/PolicyLoader.vb:98-98: pol.Save(MainSourcePath)  ->  PolicyPlus/PolicySource.vb:64: Using fPol As New FileStream(File, FileMode.Create), binary As New BinaryWriter(fPol, Text.Encoding.Unicode)
link-07023724388254408934 (call) PolicyPlus/PolicyLoader.vb:113-113: Return PInvoke.RegUnLoadKeyW(New IntPtr(&H80000002), subkeyName) = 0  ->  PolicyPlus/PInvoke.vb:6: Declare Unicode Function RegUnLoadKeyW Lib "advapi32.dll" (HiveKey As IntPtr, Subkey As String) As Integer
link-96190814517149861237 (call) PolicyPlus/PolicyLoader.vb:121-121: If IO.File.Exists(MainSourcePath) Then oldPol = PolFile.Load(MainSourcePath) Else oldPol = New PolFile  ->  PolicyPlus/PolicySource.vb:27: Using fPol As New FileStream(File, FileMode.Open, FileAccess.Read), binary As New BinaryReader(fPol)
link-72126393594593997565 (call) PolicyPlus/PolicyLoader.vb:123-123: pol.Save(MainSourcePath)  ->  PolicyPlus/PolicySource.vb:64: Using fPol As New FileStream(File, FileMode.Create), binary As New BinaryWriter(fPol, Text.Encoding.Unicode)
link-89690876846073826544 (call) PolicyPlus/PolicyLoader.vb:124-124: UpdateGptIni()  ->  PolicyPlus/PolicyLoader.vb:174: ' Increment the version number in gpt.ini [a comment]
link-35194904749400959825 (call) PolicyPlus/PolicyLoader.vb:126-126: If HasGroupPolicyInfrastructure() Then  ->  PolicyPlus/SystemInfo.vb:4: Dim windowsEdition As Integer
link-25548013903994837989 (call) PolicyPlus/PolicyLoader.vb:127-127: PInvoke.RefreshPolicyEx(Not User, 0)  ->  PolicyPlus/PInvoke.vb:4: Declare Function RefreshPolicyEx Lib "userenv.dll" (IsMachine As Boolean, Options As UInteger) As Boolean
link-81373426563650838673 (call) PolicyPlus/PolicyLoader.vb:130-130: pol.ApplyDifference(oldPol, RegistryPolicyProxy.EncapsulateKey(If(User, RegistryHive.CurrentUser, RegistryHive.LocalMachine)))  ->  PolicyPlus/PolicySource.vb:151: ' Figure out which values have changed and commit only the changes [a comment]
link-23347978739075276988 (call) PolicyPlus/PolicyLoader.vb:130-130: pol.ApplyDifference(oldPol, RegistryPolicyProxy.EncapsulateKey(If(User, RegistryHive.CurrentUser, RegistryHive.LocalMachine)))  ->  PolicyPlus/PolicySource.vb:362: Public Shared Function EncapsulateKey(Key As RegistryHive) As RegistryPolicyProxy
link-13971050247727010749 (call) PolicyPlus/PolicyLoader.vb:131-131: PInvoke.SendNotifyMessageW(New IntPtr(&HFFFF), &H1A, UIntPtr.Zero, IntPtr.Zero) ' Broadcast WM_SETTINGCHANGE  ->  PolicyPlus/PInvoke.vb:13: Declare Unicode Function SendNotifyMessageW Lib "user32.dll" (Handle As IntPtr, Message As Integer, WParam As UIntPtr, LParam As IntPtr) As Boolean
link-93475824497511743885 (call) PolicyPlus/PolicyLoader.vb:141-141: CType(SourceObject, PolFile).Save(MainSourcePath)  ->  PolicyPlus/PolicySource.vb:64: Using fPol As New FileStream(File, FileMode.Create), binary As New BinaryWriter(fPol, Text.Encoding.Unicode)
link-51460826778616907193 (call) PolicyPlus/PolicyLoader.vb:144-144: CType(SourceObject, PolFile).Save(MainSourcePath)  ->  PolicyPlus/PolicySource.vb:64: Using fPol As New FileStream(File, FileMode.Create), binary As New BinaryWriter(fPol, Text.Encoding.Unicode)
link-10327162492179208834 (call) PolicyPlus/PolicyLoader.vb:145-145: UpdateGptIni()  ->  PolicyPlus/PolicyLoader.vb:174: ' Increment the version number in gpt.ini [a comment]
link-31230776390165231492 (call) PolicyPlus/PolicyLoader.vb:146-146: PInvoke.RefreshPolicyEx(False, 0)  ->  PolicyPlus/PInvoke.vb:4: Declare Function RefreshPolicyEx Lib "userenv.dll" (IsMachine As Boolean, Options As UInteger) As Boolean
link-39648458553428359625 (saves) PolicyPlus/PolicyLoader.vb:180-205: Using fGpt As New IO.StreamWriter(GptIniPath, False)  ->  external-75125161121246095518 GptIniPath
link-68598145354346411077 (call) PolicyPlus/PolicyPlus.vbproj:9-9: <StartupObject>PolicyPlus.My.MyApplication</StartupObject>  ->  no target: The project names PolicyPlus.My.MyApplication as the startup object; its source in My Project is not among the analysed files, so the form it opens first is not shown here.
link-75634264788748795551 (reads) PolicyPlus/OpenUserRegistry.vb:9-11: For Each folder In IO.Directory.EnumerateDirectories("C:\Users")  ->  external-75125161121246095518 C:\Users
link-61262702585508312216 (reads) PolicyPlus/PolicyLoader.vb:177-179: If IO.File.Exists(GptIniPath) Then  ->  external-75125161121246095518 GptIniPath
link-02502350730558781614 (call) PolicyPlus/PolicyLoader.vb:79-79: SourceObject = RegistryPolicyProxy.EncapsulateKey(MainSourceRegKey)  ->  PolicyPlus/PolicySource.vb:359: Public Shared Function EncapsulateKey(Key As RegistryKey) As RegistryPolicyProxy
link-82500255903800520866 (reads) PolicyPlus/PolicyLoader.vb:67-67: Using machHive = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Default)  ->  external-76952632453450489524 RegistryKey.OpenBaseKey
link-19700574552175938161 (reads) PolicyPlus/OpenUserRegistry.vb:8-8: Dim canMountHives As Boolean = New Security.Principal.WindowsPrincipal(Security.Principal.WindowsIdentity.GetCurrent).IsInRole(Security.Principal.WindowsBuiltIn  ->  external-29531700766871564844 WindowsPrincipal.IsInRole
