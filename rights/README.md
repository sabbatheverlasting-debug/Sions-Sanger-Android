# Sions Sånger – rättighetskontroll inför offentlig utgåva

Datum: 2026-10-29. Utgångsmaterial: 1948 års tredje reviderade notbok, sångnummer 1–53.

## Grundprincip
Alla sånger är blockerade från offentlig distribution tills rättigheterna för exakt svensk text, eventuell översättning, melodi och vald notsats/arrangemang är verifierade. Ljudinspelningar måste klareras separat. `rights/public-release-manifest.json` innehåller därför **inga godkända sånger** ännu.

De 20 `priorityCandidates` är undersökningskandidater, **inte godkända för publicering**.

Kända hinder: nr 3 (musik av Otto Olsson, död 1964, normalt fri 2035) och nr 48 (musik av Jacob Nyvall, död 1961, normalt fri 2032). Skydd kan även gälla 1948 års arrangerade fyrstämmiga noter. Särskilda undantag och olika rättigheter måste kontrolleras.

## Teknisk spärr
Kör `node rights/validate-public-release.cjs rights/public-release-manifest.json` i en byggprocess före publicering. Den ska returnera felkod så länge godkännanden saknas. Att valideraren passerar är **inte** en juridisk bedömning.

## Underlag
Svensk lag: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1960729-om-upphovsratt-till-litterara-och_sfs-1960-729/

Jacob Nyvall: https://levandemusikarv.se/tonsattare/nyvall-jacob/

Otto Olsson: https://www.ne.se/uppslagsverk/encyklopedi/l%C3%A5ng/otto-olsson

En separat gransknings-ZIP innehåller detaljerad tabell över 54 poster (31a/31b räknas separat) och arbetslistan med 20 kandidater. Fotografierna från notboken ska inte läggas i en publik release.
