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

## Android säger "Något gick fel. Appen har inte installerats."
Tidigare APK-filer kan vara signerade med en annan nyckel. Det går då inte att uppdatera samma Android-paket direkt.

**Rekommenderad säker lösning:** På GitHub Actions finns efter ett lyckat bygge artefakten Sions-Sanger-APK, som innehåller två filer:
- **Sions-Sanger-TV-v1.3.apk** (rekommenderad): separat app med annat paket-id, se.sionssanger.tv. Installera den bredvid tidigare Sions Sånger utan att avinstallera den gamla.
- **Sions-Sanger-v1.3.apk**: befintligt paket-id, se.sionssanger.app. Kan ge signaturkonflikt mot tidigare installationer.

Ladda ned ZIP-artefakten i Actions och packa upp den. Installera **Sions-Sanger-TV-v1.3.apk**. Din gamla app behålls orörd.

Vill du föra över importerade sånger: Öppna gamla Sions Sånger och exportera alla sånger till JSON. Öppna sedan den nya Sions Sånger TV och importera JSON-filen. Grundsångerna ingår redan i båda apparna.

Ta **inte** bort din gamla app innan du har kontrollerat att de importerade sångerna finns i den nya. Om den separata TV-APK:n också nekas installation, kontrollera i Android Inställningar att den aktuella filhanteraren/webbläsaren har rätt att installera okända appar och att nedladdningen är komplett.

Från detta bygge återanvänds Gradles debug-signeringsnyckel genom GitHub Actions cache när den finns kvar. För långsiktigt säkra uppdateringar behövs en permanent privat release-signeringsnyckel i GitHub Secrets. Debug-cache är inte en garanti för permanent signeringsidentitet.

## Utveckling
Originalprojektet finns i ZIP-arkivet i GitHub-repot. Under GitHub Actions-bygget integrerar tv/integrate.py filerna tv/SionsTvServer.java, tv/tv-display.html och tv/tv-controls.js före Gradle-kompilering. Appversionen blir 1.3.

Båda APK-filerna laddas ned i ZIP-artefakten Sions-Sanger-APK under GitHub Actions.
