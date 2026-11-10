import json
d=json.load(open('red_sanjuan.json'))
drop={'veladero-rodelatranca','casposo-rouruguay','casposo-roblanco','vicuna-rosalado'}
d['estaciones']=[e for e in d['estaciones'] if e['id'] not in drop]
for e in d['estaciones']:
    if e['id']=='vicuna-arriba': e['nombre']='Cabecera del río de los Mogotes (aguas arriba de la zona minera)'; e['rio']='Río de los Mogotes'
    if e['id']=='casposo-rosanjuan': e['minas']=['casposo']
for f in d['afectados']['features']:
    p=f['properties']; ps=p['n'].split(' > ')
    for corte in ['Río Jáchal','Río Uruguay']:
        if corte in ps: ps=ps[:ps.index(corte)+1]
    if 'Río Uruguay' in ps: ps[ps.index('Río Uruguay')]='Río San Juan'
    p['n']=' > '.join(dict.fromkeys(ps))
json.dump(d,open('red_sanjuan.json','w'),ensure_ascii=False,separators=(',',':'))
for e in d['estaciones']: print(e['id'],e['nombre'],e['minas'])
for f in d['afectados']['features']: print(f['properties'])
