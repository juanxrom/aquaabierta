import json,math,heapq,pickle,re,collections
pos,G,nname,nway=pickle.load(open('red.pkl','rb'))
comp={int(k):v for k,v in json.load(open('comp_prov.json')).items()}
rut=pickle.load(open('rutas.pkl','rb'))
d=json.load(open('rios_prov.json'));W=[e for e in d['elements'] if e['type']=='way']
def km(a,b): return math.hypot((a[0]-b[0])*111,(a[1]-b[1])*111*math.cos(math.radians(a[0])))
def dp(pts,tol):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1];dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy)
    im,dm=0,0
    for i in range(1,len(pts)-1):
        p=pts[i];dd=abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L if L>1e-12 else math.hypot(p[0]-a[0],p[1]-a[1])
        if dd>dm: im,dm=i,dd
    if dm>tol: return dp(pts[:im+1],tol)[:-1]+dp(pts[im:],tol)
    return [a,b]
def dij(src,dsts):
    dist={src:0};prev={};pq=[(0,src)];dsts=set(dsts)
    while pq:
        dd,u=heapq.heappop(pq)
        if u in dsts: return u,dist,prev
        if dd>dist[u]:continue
        for v,w in G.get(u,[]):
            if dd+w<dist.get(v,1e18): dist[v]=dd+w;prev[v]=u;heapq.heappush(pq,(dd+w,v))
    return None,dist,prev
def nn(lat,lon,name=None):
    b=min((n for n in pos if comp[n]==2 and (name is None or nname[n]==name)),key=lambda n:km(pos[n],(lat,lon)));return b

MINAS=[
 dict(id='veladero',n='Veladero',lat=-29.4092,lon=-69.8950,tipo='prod',dep='Iglesia',min='Oro y plata',emp='Barrick y Shandong Gold (50% cada una)',est='En producción',fuente='Wikipedia'),
 dict(id='pascua-lama',n='Pascua-Lama',lat=-29.3284,lon=-69.9793,tipo='latente',dep='Iglesia',min='Oro y plata',emp='Barrick',est='Proyecto latente (sin obras activas)',fuente='OpenStreetMap'),
 dict(id='gualcamayo',n='Gualcamayo',lat=-29.7188,lon=-68.5969,tipo='prod',dep='Jáchal',min='Oro',emp='Minas Argentinas',est='En producción',fuente='OpenStreetMap'),
 dict(id='casposo',n='Casposo',lat=-31.2033,lon=-69.6386,tipo='prod',dep='Calingasta',min='Oro',emp='Austral Gold',est='En producción (reabrió en octubre de 2025)',fuente='Mindat'),
 dict(id='el-pachon',n='El Pachón',lat=-31.7530,lon=-70.4266,tipo='pre',dep='Calingasta',min='Cobre',emp='Glencore',est='Preproducción',fuente='OpenStreetMap'),
 dict(id='vicuna',n='Vicuña (Filo del Sol)',lat=-28.4906,lon=-69.6572,tipo='pre',dep='Iglesia',min='Cobre, oro y plata',emp='BHP y Lundin Mining',est='Preproducción',fuente='Wikipedia'),
]
SIN_UBIC=[
 dict(n='Hualilán',dep='Ullum',min='Oro',emp='Challenger Gold',est='Estado discutido: producción comercial prevista para 2029'),
 dict(n='Los Azules',dep='Calingasta',min='Cobre',emp='McEwen Copper',est='Preproducción (producción prevista para 2030)'),
 dict(n='Altar',dep='Calingasta',min='Cobre y oro',emp='Aldebaran Resources',est='Exploración avanzada'),
]
KEY={'Veladero':'veladero','Pascua-Lama':'pascua-lama','Gualcamayo':'gualcamayo','Casposo':'casposo','El Pachón':'el-pachon','Filo del Sol':'vicuna'}
CUENCA={'jachal':'Cuenca del río Jáchal','ullum':'Cuenca del río San Juan','bermejo':'Cuenca del río Bermejo (vía Guandacol)'}
bermejo=[n for n in pos if comp[n]==2 and nname[n]=='Río Bermejo']
mayor=lambda nm: nm.startswith('Río ')
paths={}
for m,r in rut.items():
    mid=KEY[m]
    if mid=='gualcamayo':
        t,dist,prev=dij(r['start'],bermejo);path=[t]
        while path[-1]!=r['start']: path.append(prev[path[-1]])
        paths[mid]=('bermejo',path[::-1])
    else: paths[mid]=(r['target'],r['path'])
# sensores
EST=[];
def add(id,nombre,cuenca,rio,p,kmrio,mina=None,rol=None):
    for e in EST:
        if km((e['lat'],e['lon']),p)<8:
            if mina and mina not in e['minas']: e['minas'].append(mina)
            return e
    ce=round(min(1500,480+3.6*kmrio)/10)*10; ph=round(min(7.9,7.3+kmrio/400),1); q=round(min(30,1.2+kmrio/12),1)
    e=dict(id=id,nombre=nombre,cuenca=cuenca,rio=rio,lat=round(p[0],4),lon=round(p[1],4),base=dict(ph=ph,ce=ce,q=q),km_desde_mina=round(kmrio),minas=[mina] if mina else [],rol=rol)
    EST.append(e);return e
def upstream(start,excl,lim=5):
    dist={start:0};pq=[(0,start)];best=start
    while pq:
        dd,u=heapq.heappop(pq)
        if dd>dist[u]:continue
        if dd<=lim and dd>dist[best]: best=u
        for v,w in G.get(u,[]):
            if v==excl and u==start: continue
            if dd+w<dist.get(v,1e18) and dd+w<=lim+1: dist[v]=dd+w;heapq.heappush(pq,(dd+w,v))
    return best,dist[best]
afect=[]
SIMPLE=lambda nm:nm or 'río sin nombre'
for mid,(tg,path) in paths.items():
    M=next(x for x in MINAS if x['id']==mid); cu=tg
    M['cuenca']=CUENCA[cu]; M['dist_rio']=round(rut[[k for k,v in KEY.items() if v==mid][0]]['dist_rio'],1)
    # control aguas arriba
    up,du=upstream(path[0],path[1])
    if du>=2: add(mid+'-arriba',f"{SIMPLE(nname[up])} (aguas arriba de la zona minera)",cu,nname[up],pos[up],0,mid,'control')
    acc=0;cum=[0]
    for a,b in zip(path,path[1:]): acc+=km(pos[a],pos[b]);cum.append(acc)
    M['km_ruta']=round(acc)
    # aguas abajo ~8 km
    i8=next((i for i,c in enumerate(cum) if c>=8),len(path)-1)
    add(mid+'-abajo',f"{SIMPLE(nname[path[i8]])} (aguas abajo de la zona minera)",cu,nname[path[i8]],pos[path[i8]],cum[i8],mid,'abajo')
    # entradas a ríos mayores nuevos
    vistos={nname[path[i8]]}
    for i in range(i8+1,len(path)):
        nm=nname[path[i]]
        if mayor(nm) and nm not in vistos and cum[i]-cum[i8]>15:
            j=min(len(path)-1,i+3)
            add(mid+'-'+re.sub(r'[^a-z]','',nm.lower())[:14],nm,cu,nm,pos[path[j]],cum[j],mid,'confluencia');vistos.add(nm)
    # río afectado como línea
    coords=[[round(pos[n][1],4),round(pos[n][0],4)] for n in path]
    afect.append({'type':'Feature','properties':{'mina':mid,'n':' > '.join(dict.fromkeys(x for x in (nname[n] for n in path) if mayor(x)))},'geometry':{'type':'LineString','coordinates':dp(coords,0.0012)}})
# pueblos / tomas de agua
for id,nombre,cu,rio,p in [('angualasto','Río Blanco en Angualasto','jachal','Río Blanco',(-30.0533,-69.1688)),('rodeo','Río Jáchal cerca de Rodeo','jachal','Río Jáchal',(-30.1938,-69.0657)),('jachal','Río Jáchal en San José de Jáchal (toma de riego)','jachal','Río Jáchal',(-30.2208,-68.7571)),('barreal','Río de los Patos en Barreal','ullum','Río de los Patos',(-31.65,-69.4722)),('ullum','Río San Juan en el Dique de Ullum (agua para la ciudad)','ullum','Río San Juan',(-31.4634,-68.6529))]:
    e=add(id,nombre,cu,rio,p,250 if cu=='jachal' else 150,None,'pueblo')
    e['nombre']=nombre;e['id']=id;e['rol']='pueblo'
# minas que llegan a cada sensor pueblo (por cuenca)
for e in EST:
    if e['rol']=='pueblo':
        e['minas']=sorted({m['id'] for m in MINAS if m['cuenca']==CUENCA[e['cuenca']] and m['id'] in paths})
for e in EST: e['cuenca_txt']=CUENCA[e['cuenca']]
# contexto: ríos con nombre "Río ..." de la provincia
ctx=[]
for w in W:
    nm=w.get('tags',{}).get('name','')
    if not mayor(nm): continue
    pts=[[round(g['lon'],3),round(g['lat'],3)] for g in w['geometry']]
    pts=dp(pts,0.004)
    if len(pts)>=2: ctx.append({'type':'Feature','properties':{'n':nm},'geometry':{'type':'LineString','coordinates':pts}})
out=dict(minas=MINAS,sin_ubicacion=SIN_UBIC,estaciones=EST,afectados={'type':'FeatureCollection','features':afect},contexto={'type':'FeatureCollection','features':ctx})
s=json.dumps(out,ensure_ascii=False,separators=(',',':'))
open('red_sanjuan.json','w').write(s)
print(len(s),'bytes; afect',len(json.dumps(afect)),'ctx',len(json.dumps(ctx)))
for e in EST: print(e['id'],'|',e['nombre'],'|',e['cuenca'],e['km_desde_mina'],e['minas'],e['lat'],e['lon'])
for m in MINAS: print(m['n'],m.get('cuenca'),m.get('km_ruta'),m.get('dist_rio'))
for f in afect: print(f['properties'])
