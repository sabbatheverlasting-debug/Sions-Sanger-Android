# En gemensam LG-TV-mottagare

Sabbath TV är en gemensam visningsmottagare för dessa appar. Mobilen behåller styrningen. Personliga anteckningar skickas inte av läsadaptrarna.

## Första installationen
1. Hämta **Sabbath-TV-Mobilbrygga-APK** från ett lyckat [Church-Show Android-bygge](https://github.com/sabbatheverlasting-debug/Church-Show/actions/workflows/android.yml) och installera på Android-mobilen.
2. Uppdatera mobilapparna från deras senaste lyckade GitHub-byggen. Behåll befintliga appdata; avinstallera inte för att uppdatera.
3. Hämta **Church-Show-LG-webOS-Receiver-IPK** från ett lyckat [LG-bygge](https://github.com/sabbatheverlasting-debug/Church-Show/actions/workflows/webos.yml). Installera IPK med webOS Dev Manager som tidigare. Den uppdaterar samma LG-app-id, nu med namnet **Sabbath TV**.
4. Starta mobilbryggan och välj **Starta TV-visning**.
5. Öppna Sabbath TV på LG och välj **Sök min mobil automatiskt**. Välj mobilen och ange dess kod en gång. Använd reservadressen med port **8780** om nätverket blockerar automatisk sökning.
6. Gå tillbaka till läs-/sångappen. Tryck **TV → Visa läsinnehåll på TV**. Mobilbryggan kan öppnas; gå tillbaka med **Tillbaka till min app**.

## Nästa gång
Öppna mottagaren på TV:n och starta TV-visning i mobilen. TV:n sparar kopplingen och återansluter. Samma mobilbrygga används när du byter mobilapp. Aktivera TV-delning i den app som ska visas. På mobilen finns **TV → Nästa/Föregående TV-textsida**, svart bild och avsluta delning. Vanliga nästa-/föregående-knappar byter bok-/sång-/studiesida och uppdaterar TV:n.

Om mobilens adress ändras försöker LG-appen hitta samma parkopplade mobil med lokal UDP-upptäckt. Automatisk adressändring kräver att nätverket och LG:s JS-tjänst tillåter detta. Den sparade anslutningen fortsätter annars försöka på den tidigare adressen; reservadress finns kvar.

## Omfattning
- Church-Show och 3 Angels Hymnal skickar sin aktuella LIVE-bilds text, etikett och tema.
- Sions Sånger skickar vald sångvers från sitt TV-läge.
- Lilla Bibel Appen, Tiny Bible och Simple Bible skickar markerad/synlig bibeltext eller öppnad studietext.
- PDFbooks skickar lästext i textläge eller en JPEG av aktuell originalsida i bildläge. Originalbilden anpassas till TV-skärmen.
- REMNANT skickar aktuell studiefråga, synligt svar eller bibelkapitel/valda verser.
- Bibelappen Live och Church-Show Webapp får separata Android-TV-styrenheter, byggda från respektive befintlig HTML-kod. Deras vanliga webbplatser kan inte själva hålla en lokal Android-server igång. Webbkontrollernas lokala data importeras/återskapas separat.

## Teknik och verifieringsgräns
En Android-förgrundstjänst håller TV-sessionen igång mellan apparna. Den stoppas i bryggan eller via notisen. Inget internet eller konto behövs för själva visningsöverföringen. TV:n kan inte väcka mobilen eller starta bryggan efter omstart automatiskt.

HTTP använder port 8780 och autentiseras initialt med sexsiffrig kod. Efter första kopplingen sparas en slumpad längre nyckel på TV:n. Upptäckt på UDP 8781 skickar aldrig nyckeln; en HMAC-signatur verifierar den redan parkopplade mobilen vid adressbyte. Detta är lokal överföring utan TLS, avsedd för ett betrott lokalt nätverk. Det är ingen film-/ljudströmning eller generell skärmspegling.

LG-appens fysiska installation, UDP-upptäckt och användning mellan Pixel/LG C1 behöver provas på de verkliga enheterna. Ett godkänt bygge bekräftar inte att dessa enhetstester har gjorts. LG Developer Mode och dess tidsgräns gäller fortfarande; ingen publicering i LG Content Store har gjorts.
