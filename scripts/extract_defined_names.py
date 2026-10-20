import sys,glob,os,json
from openpyxl import load_workbook
res={}
for p in sorted(glob.glob(sys.argv[1]+'/*.xlsx')):
    wb=load_workbook(p,data_only=True)
    names={}
    try: items=list(wb.defined_names.items())
    except Exception: items=[(n.name,n) for n in wb.defined_names.definedName]
    for n,d in items:
        val=None
        try:
            for t,c in d.destinations:
                c=c.replace('$','')
                val=wb[t][c].value if ':' not in c else c
        except Exception as e: val='?'
        names[n]={'ref':d.attr_text,'value':val}
    for ws in wb.worksheets:
        for n,d in getattr(ws,'defined_names',{}).items():
            names[ws.title+'!'+n]={'ref':d.attr_text}
    res[os.path.basename(p)[:-5]]=names
json.dump(res,open(sys.argv[2],'w'),indent=1,default=str)
for k,v in res.items(): print(k,len(v))
