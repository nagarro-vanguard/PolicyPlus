import json
T={"registry":"technologies","key":"technology-84822039951309122274"}
def ev(f,a,b,s): return {"lines":{"file":"PolicyPlus/"+f if not f.startswith(".") and f!="version.bat" else f,"firstLine":a,"lastLine":b},"shows":s}
def rec(asp,st,evs,id=None,risk=None,ext=None):
    r={"subject":T,"aspect":asp,"statement":st,"basis":{"observed":{"evidence":evs}}}
    if id:r["id"]="fact-"+id
    if risk:r["risk"]={"category":risk[0],"severity":risk[1]}
    if ext:r["externalSource"]=ext
    return r
R=[]
R.append(rec("anything-else","The application is built for .NET Framework 4.5.2, a target Microsoft ended support for in 2022. On current Windows, 4.x programs run on the installed 4.8 runtime, which is still supported, so the exposure is the old build target, not the runtime in use.",
 [ev("PolicyPlus.vbproj",14,14,"Target framework set to 4.5.2"),ev("App.config",4,4,"Runtime declared as 4.0 family with the 4.5.2 sku")],
 "04778930488503450393",("unsupported-technology","low"),{"source":"Microsoft support lifecycle for .NET Framework 4.5.2 (ended 2022-04-26); 4.x is an in-place update on Windows","asOf":"2026-11-12"}))
R.append(rec("anything-else","The ADMX download fetches an installer from Microsoft into a fixed, predictable folder under the user's local application data, then unpacks it with the Windows installer tool. No hash or signature is checked; only the HTTPS link protects it, and Tls 1.0 is allowed.",
 [ev("DownloadAdmx.vb",82,91,"Fixed temp folder, download, then msiexec unpack with no hash or signature check"),ev("Main.vb",19,20,"Same web requests permit Tls 1.0 and 1.1 as well as 1.2")],
 "02281209187153212575",("input-handling","low")))
R.append(rec("data-shapes","Data lives as plain in-memory classes filled by parsing the ADMX, ADML and comment files and the policy files; there is no database. Each dialog shows and edits its values in its own form controls.",
 [ev("AdmxFile.vb",14,14,"ADMX file parsed by a Load function"),ev("AdmlFile.vb",11,11,"ADML file parsed by a Load function"),ev("CmtxFile.vb",7,7,"Comment file parsed by a Load function"),ev("AdmxStructures.vb",2,55,"Raw definition classes"),ev("CompiledStructures.vb",2,29,"Merged policy, category and product classes"),ev("PolicyStructures.vb",2,17,"Registry value and list classes"),ev("EditSetting.vb",19,21,"A dialog fills its own controls from the setting")],
 "48835083324999731847"))
R.append(rec("integration-config","The only web address in the code is one constant: a Microsoft installer pinned to the Windows 11 Sep 2026 (26H2) release and its folder inside the package. It must be updated each Windows release. Other choices are saved in the per-user registry key.",
 [ev("DownloadAdmx.vb",3,4,"Link and unpack folder name the 26H2 release"),ev("DownloadAdmx.vb",84,91,"The constant is used only for this one download"),ev("Main.vb",25,28,"Policy sources read from saved registry values"),ev("Main.vb",55,60,"ADMX folder read from saved value"),ev("Main.vb",478,478,"Language read from saved value"),ev("Main.vb",517,517,"ADMX folder saved when chosen"),ev("Main.vb",809,809,"Language saved when changed"),ev("App.config",1,5,"Config file only names the runtime")],
 "67374956797143889814"))
R.append(rec("code-without-source","The program relies on Windows-only native calls for policy refresh, registry hive load and unload, privilege adjustment and change broadcast, plus one external program, the Windows installer tool, to unpack the download. It runs only on Windows.",
 [ev("PInvoke.vb",3,13,"Declares the native Windows functions called"),ev("PolicyLoader.vb",131,131,"Broadcasts a settings-changed message"),ev("DownloadAdmx.vb",88,90,"Starts the installer tool")],
 "99632587527307990724"))
R.append(rec("build-time-code","The project compiles every listed source and form resource into one executable, with only Debug and Release settings. A batch step writes the git version into a source file that is compiled in.",
 [ev("PolicyPlus.vbproj",18,18,"Debug settings group"),ev("PolicyPlus.vbproj",30,30,"Release settings group"),ev("PolicyPlus.vbproj",322,322,"Generated version file is compiled in"),ev("version.bat",1,8,"Script writes the git version into that file")],
 "42595514144781188630"))
R.append(rec("navigation-and-permissions","Navigation is in code: menus and buttons open dialogs. Permission is the Windows user's rights, with administrator checks in code that unlock hive mounting and file-security changes.",
 [ev("PolicyPlus.vbproj",9,9,"Startup object is the application class"),ev("OpenUserRegistry.vb",8,8,"Hive mounting depends on an administrator check"),ev("DownloadAdmx.vb",39,40,"Administrator membership checked in code")],
 "50067563093449208907"))
R.append(rec("user-state","State is held in memory for one session: loaded policy sources, the ADMX workspace and selections. Choices are kept in the per-user registry key. On start, the main window restores them, and falls back to local Group Policy sources with a warning if they fail.",
 [ev("Main.vb",8,8,"Policy loaders held in form fields"),ev("Main.vb",18,50,"Start sequence: open settings, restore ADMX folder and sources, fall back to local policy"),ev("ConfigurationStorage.vb",3,19,"Values read and written as registry values")],"17010206963848736479"))
R.append(rec("anything-else","When run as administrator, the download dialog changes ownership and permissions of a folder typed by the user, with no check it is an ADMX folder. It gives Administrators full control, deletes same-named files and resets permissions on moved files.",
 [ev("DownloadAdmx.vb",37,49,"Destination is the typed folder; owner set to Administrators with full control"),ev("DownloadAdmx.vb",67,72,"Same-named files deleted; moved files get reset permissions"),ev("DownloadAdmx.vb",96,99,"Take-ownership and restore privileges enabled before taking control")],
 "87976621935764415381",("access-control","medium")))
R.append(rec("anything-else","Every web request, including the installer download, permits the obsolete Tls 1.0 and 1.1 beside Tls 1.2. The code says this keeps Windows Vista working. A weaker protocol could be negotiated on the download.",
 [ev("Main.vb",19,20,"Tls, Tls11 and Tls12 all enabled for web requests")],
 None,("cryptography","low")))
R.append(rec("anything-else","As administrator, the program lists other users' profile folders under a fixed C:\\Users and can load a user's registry file into the machine registry, as can a policy source path chosen in a dialog. This is administrator-only and uses user-chosen paths.",
 [ev("OpenUserRegistry.vb",6,12,"Scans C:\\Users and checks for administrator"),ev("PolicyLoader.vb",63,70,"Enables backup and restore privileges, then loads the given file as a hive"),ev("PInvoke.vb",5,6,"Hive load and unload declared")],
 None,("input-handling","low")))
open("/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/how-it-runs/jobs/job-5768310990242016/scratch-study-how-it-runs/new.jsonl","w").write("\n".join(json.dumps(r) for r in R)+"\n")
