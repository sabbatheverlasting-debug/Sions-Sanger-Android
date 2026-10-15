# Sions Sånger 1.3 – TV-presentation

Utbyggnad av befintlig Android-app. De 62 grundsångerna och JSON-importen finns kvar.

## Nyheter
- TV-vy i liggande 16:9
- Nästa/föregående vers från mobilen
- Sökning på nummer, titel och sångtext; inkluderar JSON-importer
- Fyra bakgrunder, svart TV-bild och 16:9-skärmspegling

## Visa på LG-TV eller Google TV
1. Installera Sions Sånger 1.3 på Android.
2. Anslut mobilen och TV:n till samma Wi-Fi (inte isolerat gästnät).
3. Starta appen, tryck TV och läs av den lokala webbadressen.
4. Öppna adressen i TV:ns webbläsare, inklusive anslutningskoden.
5. Välj sång via sökrutan i mobilen och tryck Nästa/Föregående vers.

Låt appen vara öppen och mobilen vaken. Sångtexten skickas direkt över Wi-Fi. Inget internet behövs på det lokala nätverket.

## Chromecast utan webbläsare
1. Öppna TV-menyn och välj en sång.
2. Tryck Skärmspegling 16:9 i appen.
3. Börja skärmcasting från din Android/Pixels Cast-funktion till Chromecast.
4. Tryck i högerkanten på mobilens skärm för nästa vers, vänsterkanten för föregående.

Detta är skärmspegling, inte ett eget Cast Receiver-program. Mottagaren måste kunna ta emot Androids skärmcasting.

## Apple TV
Apple TV saknar en vanlig inbyggd webbläsare. Visa webbsidan via en kompatibel tvOS-webbläsarapp eller öppna TV-adressen på en Mac/iPhone och skicka med AirPlay till Apple TV. Direkt AirPlay från Android och en tvOS-app ingår inte i 1.3.

## Installation och befintliga importerade sånger
Om Android säger att APK inte kan installeras kan den gamla appen ha en annan signeringsnyckel. EXPORTERA då dina importerade sånger till JSON innan du avinstallerar något. Installera därefter den nya APK-filen och importera JSON-filen igen. Ta inte bort appen innan du har en säkerhetskopia på dina egna sånger.

## Utveckling
Originalprojektet finns i ZIP-arkivet i GitHub-repot. Under GitHub Actions-bygget integrerar tv/integrate.py filerna tv/SionsTvServer.java, tv/tv-display.html och tv/tv-controls.js före Gradle-kompilering. Appversionen blir 1.3.

APK laddas ned som artefakten Sions-Sanger-APK under Actions.
