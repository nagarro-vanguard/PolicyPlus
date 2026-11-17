import re, json, os
SRC="/Users/anupvasudeva/me/projects/PolicyPlus/"
K_HANDLER="codekind-86339746494978822948"
K_BUILD="codekind-26823861241532856039"
K_LAYOUT="codekind-15335552891188424656"
WF="external-29531700766871564844"
blocks=[];defs=[];spans=[];links=[]
def L(f,a,b=None): return {"file":f,"firstLine":a,"lastLine":b or a}
def blk(f,a,b,name,cont,kind,ep=None):
    r={"lines":L(f,a,b),"codeKind":kind,"container":cont}
    if name: r["writtenAs"]=name
    if ep:
        r["entryPoint"]={"reachedBy":ep[0],"startedBy":"person","purpose":ep[1],"evidence":[L(f,ep[2])]}
    blocks.append(r)
def span(f,a,b,says): spans.append({"lines":L(f,a,b),"says":says})
def link(f,line,kind,to,**kw):
    r={"kind":kind,"lines":L(f,line)}
    if isinstance(to,tuple): r["to"]={"file":to[0],"line":to[1]}
    elif to: r["to"]={"externalSystem":WF,"resource":to}
    r.update(kw); links.append(r)
def handler(f,a,b,name,cont,evline,what,event):
    blk(f,a,b,name,cont,K_HANDLER,(f"Windows Forms raises {event} on the {cont} window when a person acts on it",what,evline))
def helper(f,a,b,name,cont): blk(f,a,b,name,cont,K_HANDLER)

# ---- hand-written files
f="PolicyPlus/LoadedAdmx.vb"; c="LoadedAdmx"
span(f,1,2,"Class header and the field holding the loaded workspace")
helper(f,3,15,"PresentDialog",c)
handler(f,16,18,"LsvAdmx_DoubleClick",c,16,"Opens the details dialog for the ADMX file the person double-clicked","a double-click")
handler(f,19,21,"LoadedAdmx_SizeChanged",c,19,"Resizes the namespace column to fill the list when the window changes size","a size change")
handler(f,22,24,"LsvAdmx_KeyDown",c,22,"Treats the Enter key on a selected ADMX file as a double-click","a key press")
span(f,25,25,"End of the class")
link(f,11,"call",(f,20))
link(f,14,"call","ShowDialog")
link(f,17,"call",("PolicyPlus/DetailAdmx.vb",2))
link(f,23,"call",(f,17))

f="PolicyPlus/LoadedProducts.vb"; c="LoadedProducts"
span(f,1,1,"Class header")
helper(f,2,22,"PresentDialog",c)
handler(f,23,40,"UpdateMajorList",c,23,"Fills the major-versions list for the selected top-level product","a selection change")
handler(f,41,56,"UpdateMinorList",c,41,"Fills the minor-versions list for the selected major version","a selection change")
handler(f,57,62,"OpenProductDetails",c,57,"Opens the details dialog for the product the person double-clicked in any of the three lists","a double-click")
handler(f,63,68,"ListKeyPressed",c,63,"Opens product details when Enter is pressed in any of the three lists","a key press")
span(f,69,69,"End of the class")
link(f,12,"call",(f,23))
link(f,21,"call","ShowDialog")
link(f,39,"call",(f,41))
link(f,61,"call",("PolicyPlus/DetailProduct.vb",3))
link(f,65,"call",(f,57))

f="PolicyPlus/LoadedSupportDefinitions.vb"; c="LoadedSupportDefinitions"
span(f,1,2,"Class header and the field holding the support definitions being listed")
helper(f,3,9,"PresentDialog",c)
helper(f,10,19,"UpdateListing",c)
handler(f,20,22,"LsvSupport_DoubleClick",c,20,"Opens the details dialog for the support definition the person double-clicked","a double-click")
handler(f,23,26,"TextFilter_TextChanged",c,23,"Refreshes the support definitions list as the filter text changes","a text change")
handler(f,27,29,"LsvSupport_KeyDown",c,27,"Treats the Enter key on a selected support definition as a double-click","a key press")
span(f,30,30,"End of the class")
link(f,6,"call",(f,10))
link(f,8,"call","ShowDialog")
link(f,21,"call",("PolicyPlus/DetailSupport.vb",2))
link(f,25,"call",(f,10))
link(f,28,"call",(f,20))

# ---- designers
def unjoin(lines):
    out=[];i=0
    while i<len(lines):
        s=lines[i]
        while s.rstrip().endswith(("_","&")) and i+1<len(lines):
            i+=1; s=s.rstrip()[:-1].rstrip()+" "+lines[i].strip()
            s=s.replace('" & "','').replace('" &  "','')
        out.append((i,s)); i+=1
    return out
KEEP=["TabIndex","MaxLength","ReadOnly","Enabled","Visible","TabStop","MultiSelect","DropDownStyle","Width","Items","DialogResult","ShortcutKeys","CheckOnClick","FullRowSelect","View","Dock","Checked","TextAlign"]
def designer(name,libs):
    f=f"PolicyPlus/{name}.Designer.vb"
    lines=open(SRC+f,encoding="utf-8-sig").read().split("\n")
    n=len(lines)
    while lines[n-1].strip()=="": n-=1
    ix=lambda pat:[i+1 for i,l in enumerate(lines) if re.search(pat,l)]
    dispS=ix(r"Protected Overrides Sub Dispose")[0]-1  # attribute line
    dispE=ix(r"^    End Sub")[0]
    initS=ix(r"Private Sub InitializeComponent")[0]-1
    initE=ix(r"^    End Sub")[1]
    fr=ix(r"^    Friend WithEvents")
    cls=name
    span(f,1,dispS-1,"Generated class header and a comment")
    blk(f,dispS,dispE,"Dispose",cls,K_BUILD)
    comps=ix(r"Private components As")[0]
    span(f,dispE+1,initS-1,"Comments and the components field of the generated form")
    blk(f,initS,initE,"InitializeComponent",cls,K_BUILD)
    span(f,n,n,"End of the class")
    # fields
    ctrls=[]
    for i,l in enumerate(lines):
        m=re.match(r"\s+Dim (\w+) As System\.Windows\.Forms\.(\w+)",l)
        if m and m.group(1)!="resources": ctrls.append((m.group(1),m.group(2),"Dim"))
    for i in fr:
        m=re.match(r"\s+Friend WithEvents (\w+) As (\w+)",lines[i-1]); ctrls.append((m.group(1),m.group(2),"Friend WithEvents"))
    props={}
    for i,s in unjoin(lines[initS:initE]):
        m=re.match(r"\s+(?:Me\.)?(\w+)\.(\w+) = (.*)",s)
        if m: props.setdefault(m.group(1),{})[m.group(2)]=m.group(3)
    fields=[]
    for nm,ty,decl in ctrls:
        p=props.get(nm,{})
        parts=[f"{decl} {nm} As {ty}"]
        if "Text" in p: parts.append("Text = "+p["Text"])
        for k in KEEP:
            if k in p: parts.append(f"{k} = {p[k]}")
        fields.append({"writtenAs":nm,"declaredAs":"; ".join(parts)})
    formp=props.get("Me",{})
    fp=[f"Text = {formp['Text']}"] if False else []
    # form itself
    ff=[]
    for k in ["Name","Text","MinimumSize","FormBorderStyle","MaximizeBox","MinimizeBox","CancelButton","StartPosition"]:
        pass
    defs.append({"lines":L(f,fr[0],fr[-1]),"writtenAs":name,"codeKind":K_LAYOUT,"fields":fields})
    # links
    link(f,dispS+ [i for i,l in enumerate(lines[dispS-1:dispE]) if "MyBase.Dispose" in l][0],"call","Form.Dispose")
    ci=[i+1 for i,l in enumerate(lines) if "New System.Windows.Forms" in l and i+1>initS][0]
    link(f,ci,"call","Control construction and layout")
    return f,lines,initS
for nm in ["LoadedProducts","LoadedSupportDefinitions"]: designer(nm,None)
f,lines,initS=designer("Main",None)
gi=[i+1 for i,l in enumerate(lines) if "resources.GetObject" in l][0]
link(f,gi,"call","ComponentResourceManager.GetObject")
base="/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/jobs/job-3428489239352974/scratch-map-blocks-and-links/"
for nm,arr in [("Block",blocks),("DataDefinition",defs),("Span",spans),("Link",links)]:
    open(base+nm+".jsonl","w").write("\n".join(json.dumps(x) for x in arr)+"\n")
    print(nm,len(arr))
