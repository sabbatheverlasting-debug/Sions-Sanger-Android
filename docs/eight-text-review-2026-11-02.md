# Sions Sånger – kontroll av åtta textutkast, 2026-11-02

## Resultat
Tekniska rättningar är införda: Importera noter visas i sångens notvy och hjärtat hålls inom skärmbredden. Ingen offentlig publicering har skett. De åtta textutkasten är fortfarande granskningsmaterial. Ingen post i det separata publiceringsmanifestet har markerats som slutligt klarerad.

Appens importerade bibliotek kan ersätta inbyggda sånger med samma nummer. Telefonens 117 sparade sånger är därför inte bevis för vilket innehåll en nyinstallation innehåller. Användarens egen notbild till nr 9 lagras på telefonen och har inte byggts in i projektet.

## Kontroll per text
| Nr | Text | Kontrollerat underlag och resultat | Kvar före en utgåva som följer 1948 års bok |
|---|---|---|---|
| 7 | Nu tacken Gud, allt folk | Tre verser i Lutherförbundets Sångbok 1913 via Hymnary. Källan anger Public Domain men har OCR-felet ”sor”; utkastet har ”stor”. | Kontrollera korrekturet mot tryck och jämför ordalydelsen med 1948. Dokumentera svensk textversion och krediter. |
| 9 | Lova den Herre | Tre verser jämförda visuellt med användarens foto, s. 16. Tryckta krediter J. Neander / C. A. Torén. Runeberg anger Torén 1813–1904. Detta ger starkt stöd för att den attribuerade äldre textens ekonomiska skyddstid har löpt ut. | Dokumentera exakt utgåva och textens versionshistoria i publiceringsunderlaget. Fyrstämmigt arrangemang/notbild ingår inte i denna textbedömning. |
| 20 | Upp, min tunga | Fyra verser efter Wallins bearbetning 1816. Utkastet använder äldre orden menlöst och förer; källan beskriver byte till skuldlöst/leder 1986. | Jämför hela fyraversversionen med äldre tryck/1948; två återställda ord bevisar inte hela textens version. |
| 22 | Allena Gud i himmelrik | Fem verser stämmer med Wikisources avsnitt uttryckligen rubricerat 1819 års psalmbok. | Jämför med skannat äldre tryck/1948; fyll i Decius, översättare/bearbetare och deras belägg. |
| 31a | Jag lyfter mina händer | KONKRET VERSIONSSKILLNAD: nätutkastet har ”Mig Herren alltid leder” / ”Han hör mig när jag beder”. 1937 års tryck har ”Mig Herren hjälp bejakar” / ”Min bön han ej försakar”. Även tredje versen skiljer sig. Tidigare A4-export i användarens filer innehåller den äldre första versen. | Byt inte godtyckligt mellan versioner. Transkribera rätt 1948-text och fastställ vem som gjort ändringarna. Nuvarande utkast ska inte godkännas som exakt 1948-version. |
| 31b | Befall i Herrens händer | Sju verser efter Wallin 1816. Äldre tryck lokaliserat (1932, nr 224, s.164–165). Nätutkastet innehåller ett misstänkt extra kommatecken i ”bröd och, ära”. Appens tekniska nummer är 415. | Korrekturläs mot tryck/1948 och verifiera mappningen 31b→415. Senare bearbetningar av Hallqvist/Nivenius ska inte blandas in. |
| 46 | Den signade dag | Nio verser i nätkällan tillskrivs Wallins bearbetning 1812. | Jämför antal verser och ordalydelse med 1948 och ett äldre skannat tryck. |
| 50 | Din klara sol går åter opp | Alla fyra versernas ordalydelse stämmer med 1932 års tryck nr 420, s.285, bortsett från interpunktion och versaler. Trycket anger Wallin 1779–1839. Detta ger starkt stöd för fri äldre text. | Jämför med 1948 och för in exakt version, krediter och belägg i publiceringsmanifestet. |

## Vad bedömningen omfattar
Den gäller de medföljande texterna. Inga inspelningar eller noter har godkänts genom denna kontroll. En melodi, ett arrangemang och en inspelning kräver separata belägg om de senare ska distribueras i appen. Bokålder eller ett lyckat Android-bygge är inte tillräckligt underlag.

Svensk upphovsrättslag 43 § anger skydd till utgången av sjuttionde året efter dödsåret; 4 § behandlar bearbetningar och översättningar. Bedömningarna ovan är källbaserade arbetsbedömningar, inte ett myndighetsbeslut. Namn och exakt textversion ska dokumenteras även för äldre fria verk.

## Källor lästa 2026-11-02
- https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1960729-om-upphovsratt-till-litterara-och_sfs-1960-729/
- https://www.prv.se/sv/upphovsratt/om-upphovsratt/fragor-och-svar-om-upphovsratt/
- https://hymnary.org/hymn/LSAS1913/S19
- Användarens foto image-1793613482342.jpg, nr 9, s.16.
- https://runeberg.org/authors/torencar.html
- https://sv.wikisource.org/wiki/Upp,_min_tunga,_att_lovsjunga
- https://sv.wikisource.org/wiki/Allena_Gud_i_himmelrik
- https://sv.wikisource.org/wiki/Jag_lyfter_mina_händer
- https://runeberg.org/psalmbok/1937/0267.html
- https://runeberg.org/psalmbok/1937/0268.html
- Användarens tidigare A4-export Sions_Sanger_031_Jag_lyfter_mina_hander_Upp_till_A4.png. Detta är ett sekundärt jämförelseunderlag, inte ett originaltryck.
- https://sv.wikisource.org/wiki/Befall_i_Herrens_händer
- https://runeberg.org/psalmbok/1932/0162.html
- https://runeberg.org/psalmbok/1932/0163.html
- https://psalmerna.se/Wikiny/index.php?title=Befall_i_Herrens_h%C3%A4nder
- https://sv.wikisource.org/wiki/Den_signade_dag
- https://sv.wikisource.org/wiki/Din_klara_sol_går_åter_opp
- https://runeberg.org/psalmbok/1932/0283.html

## Teknisk verifiering
- Notimport: mobilbredd 360 px; knappen synlig efter smart-import-initiering och anropar scorePick("9").
- Läshuvud: alla knappar inom bredden vid 320, 360, 393, 412 och 688 px.
- Signerad release med båda rättningarna: GitHub Actions 41431823482, success.
- Android Studio-paketet använder samma två rättade skript. Wrapper 8.11.1, AGP 8.10.1, SDK 36. Lokal debug är separat paket .test.
