# Sions Sånger TV för iPhone och iPad

Native iOS-app med UIKit och WKWebView. GitHub bygger med Xcode på en Mac i molnet; din dator behöver inte köra Xcode.

Biblioteket är tomt från början. Importera JSON-filer via Mer. Export sker via iOS delningsruta. JSON-validering, dubbletthantering, sökning, favoriter, textstorlek och teman återanvänder den befintliga läsaren.

Ljud importeras från Filer och spelas med AVAudioPlayer. MP3, M4A och WAV stöds när iOS kan avkoda filen. Flera filer kan väljas. Ett sångnummer i filnamnet kopplar ljudet automatiskt; musik kan också kopplas manuellt. Opus och ZIP ingår inte i första iOS-versionen: packa upp ZIP i Filer före import. Ljudbibliotek och versstarter sparas lokalt. AirPlay-ljud väljs i appen. Bildspegling startas i iPhones Kontrollcenter. TV-webbläsare på samma Wi-Fi kan visa verser via en lokal adress med en slumpad sessionskod; telefonappen måste vara öppen. Androids Sabbath TV-mobilbrygga används inte på iOS. Direkt Google Cast ingår inte.

## Provbygge

Arbetsflödet `Bygg iPhone och iPad` bygger simulatorappen, provstartar den och skapar ett osignerat iPhone-arkiv. Det arkivet är inte en installerbar IPA. En lyckad kompilering verifierar inte verklig AirPlay-uppspelning, TV-kompatibilitet eller TestFlight-godkännande.

## Signering och TestFlight utan lokal Xcode

Kräver aktivt Apple Developer Program-medlemskap och en App Store Connect-app med Bundle ID `se.sionssanger.tv`.

Lägg följande i repositoryts Settings → Secrets and variables → Actions. Lägg aldrig privata nycklar eller lösenord i källkoden eller i chatten:

| Secret | Innehåll |
|---|---|
| APPLE_TEAM_ID | Apple Developer Team ID |
| IOS_DISTRIBUTION_P12_BASE64 | Base64 av Apple Distribution-certifikat med privat nyckel i P12-format |
| IOS_DISTRIBUTION_PASSWORD | Lösenord för P12-filen |
| IOS_PROVISION_PROFILE_BASE64 | Base64 av App Store-provisioneringsprofil för rätt app-ID |
| ASC_KEY_ID | App Store Connect API Key ID |
| ASC_ISSUER_ID | App Store Connect Issuer ID |
| ASC_PRIVATE_KEY | Hela innehållet i tillhörande privata P8-nyckel |

Starta sedan arbetsflödet `Signera iOS och skicka till TestFlight`. Det arkiverar, signerar och laddar upp appen. Apple måste behandla bygget och eventuella krav i App Store Connect måste slutföras innan det kan testas. Extern betatestning kan kräva Apples betagranskning. Arbetsflödet skickar inga inbjudningar och publicerar inte på App Store.

Certifikat och profiler kan hanteras på Apples webbplats. För ett nytt certifikat går det att skapa CSR och privat nyckel med OpenSSL utan Xcode; den privata nyckeln måste sparas säkert och senare paras med det utfärdade certifikatet i P12-format. Återanvänd befintlig fungerande distributionssignering när den finns. Android-nyckeln fungerar inte för iOS.
