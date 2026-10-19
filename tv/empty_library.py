"""Remove bundled songs without changing manual-import storage or keys."""
import json
import re

def empty_library(html):
 pattern=r'(<script\b[^>]*\bid="initialSongs"[^>]*>)(.*?)(</script>)'
 matches=list(re.finditer(pattern,html,re.S))
 if len(matches)!=1:raise ValueError('Expected one embedded song library')
 match=matches[0];initial=json.loads(match.group(2))
 if not isinstance(initial.get('songs'),list) or len(initial['songs']) not in (0,62):
  raise ValueError('Unexpected embedded library; refusing to change imported content')
 initial['songs']=[]
 html=html[:match.start(2)]+json.dumps(initial,ensure_ascii=False)+html[match.end(2):]
 for old,new in [
  ('<strong>62</strong> sånger','<strong>0</strong> sånger'),
  ('id="allSongsCount">62</strong>','id="allSongsCount">0</strong>'),
  ('Ursprungsversionen innehåller 62 sånger från ditt Sions Sånger-material.','Biblioteket är tomt från början. Importera alla sånger manuellt via JSON-filer.'),
  ('Ta bort alla dina importerade JSON-sånger? De 62 ursprungliga sångerna finns kvar.','Ta bort alla dina importerade JSON-sånger? Biblioteket blir då tomt.'),
  ('<strong>Inga sånger hittades</strong><span>Prova ett annat sångnummer, ord eller en annan mening.</span>', '<strong>Inga sånger hittades</strong><span>'+"'+(library.length?'Prova ett annat sångnummer, ord eller en annan mening.':'Biblioteket är tomt. Välj Mer och sedan Importera JSON-filer för att lägga till sånger.')+'"+'</span>'),
 ]:
  if old in html:
   if html.count(old)!=1:raise ValueError('Ambiguous library message')
   html=html.replace(old,new,1)
  elif new not in html:raise ValueError('Missing expected library message: '+old)
 return html
