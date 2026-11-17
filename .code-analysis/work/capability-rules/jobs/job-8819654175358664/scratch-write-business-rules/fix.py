import json
PL="PolicyPlus/PolicyLoader.vb"; PP="PolicyPlus/PolicyProcessing.vb"
def r(i,says,f,a,b,ev=None,gates=None):
    d={"id":i,"says":says,"decidedAt":{"file":f,"firstLine":a,"lastLine":b},"evidence":ev or []}
    if gates:d["gates"]=gates
    return d
L=lambda a,b:{"file":PL,"firstLine":a,"lastLine":b}
P=lambda a,b:{"file":PP,"firstLine":a,"lastLine":b}
recs=[
r("businessrule-59373243740450631318","A user hive file is opened by turning on the backup and restore privileges and mounting it under a temporary name in the machine registry. When the mount succeeds, the source is writable: edits go straight into the mounted hive and take effect when the source is closed. When it yields no key, the hive opens as an empty scratch policy store the person can edit, but nothing is written back to the hive file.",PL,64,77,[L(137,137),L(163,171)],"transition-86854366096710212700"),
r("businessrule-38749131863255466414","Closing a user hive source that mounted successfully unloads the hive and reports success only if Windows unloads it. Closing any other source, including a user hive that failed to mount and so holds an empty scratch store, reports success without any step.",PL,110,115,[L(71,74)]),
r("businessrule-28806393002757226213","Saving the local policy source writes the POL file and raises the gpt.ini version, then, on Windows editions with Group Policy support, asks Windows to refresh only the matching policy: user policy for a user source, computer policy for a computer source. It reports \"saved to disk and invoked policy refresh\".",PL,123,128,[{"file":"PolicyPlus/SystemInfo.vb","firstLine":3,"lastLine":11}]),
r("businessrule-87657486652904748150","Saving the local policy source on an edition without Group Policy support writes the POL file, raises the gpt.ini version, applies only the changed values to the registry (the current user's for a user source, the local machine's for a computer source), announces a settings change to all windows, and reports \"saved to disk and applied diff to Registry\".",PL,123,133,[{"file":"PolicyPlus/SystemInfo.vb","firstLine":3,"lastLine":11}]),
r("businessrule-35086460485241143052","Only saving the local policy source and saving a per-user policy source update a gpt.ini; POL file, registry, hive and scratch saves never touch one. The update raises Version by 65536 for a user source or by 1 for a computer source. A missing Version line is written as 65537 whatever the section, and missing machine and user Group Policy extension lines are added. A gpt.ini that exists keeps its other lines; a missing one is created with all three.",PL,173,206,[L(124,124),L(145,145)]),
r("businessrule-07587489877046572885","For a checkbox element queued for deletion counts as one disabled element. Otherwise each present value counts: every present off value or off-list value adds a tenth of a disabled element, and every present on value or on-list value adds one present element, so a list can add several.",PP,11,18,[P(50,61)]),
r("businessrule-31923566714616007060","A checkbox element reads as ticked by precedence: if an on value is defined, only its presence ticks it; else if an on value list is defined, only that list being fully present ticks it; else only a stored number equal to 1 ticks it. Off values and off lists never change the result, which is unticked otherwise.",PP,190,206),
r("businessrule-00751566620548008241","When exactly two policies in a category share a display name (three or more are left alone), they are merged into one for both sections if one is user and the other computer, with the same explanation and the same registry key. The first is removed and the second becomes the both-section policy; the number of merges is reported.",PP,114,132),
{"id":None,"says":"The registry values a policy is taken to reference are: its own value; every value of its on and off value lists and of checkbox and dropdown-item lists, each entry using its own key, else its list's key, else the element's or policy's key; each non-list element's value; and, for a list element, its key as an entry with no value name. A value named twice counts once. This set is listed on request and is what forgetting a policy removes.",}
]
recs[-1]=r(None,recs[-1]["says"],PP,207,263)
del recs[-1]["id"]
open("fix.jsonl","w").write("\n".join(json.dumps(x) for x in recs)+"\n")
