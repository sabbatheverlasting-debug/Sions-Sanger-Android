import UIKit
import WebKit
import AVKit
import UniformTypeIdentifiers
import MediaPlayer

final class ReaderController: UIViewController, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate, UIDocumentPickerDelegate, AVAudioPlayerDelegate {
    private var web: WKWebView!
    private let tv = LocalTVServer()
    private var player: AVAudioPlayer?
    private var playingNumber = ""
    private var importNumber: String?
    private var importingJSON = false
    private var audioError = ""
    private var audioMessage = ""
    private var timer: Timer?
    private var catalog: [String: [String: String]] = [:]
    private var cues: [String: [String: Double]] = [:]
    private var audioDirectory: URL {
        let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Audio", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.06, green: 0.17, blue: 0.29, alpha: 1)
        catalog = UserDefaults.standard.dictionary(forKey: "sions-audio-catalog") as? [String: [String: String]] ?? [:]
        cues = UserDefaults.standard.dictionary(forKey: "sions-audio-cues") as? [String: [String: Double]] ?? [:]
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.allowsAirPlayForMediaPlayback = true
        config.websiteDataStore = .default()
        config.userContentController.add(self, name: "sions")
        if let url = Bundle.main.url(forResource: "ios-bridge", withExtension: "js", subdirectory: "Web"), let js = try? String(contentsOf: url) {
            config.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self; web.navigationDelegate = self
        web.isOpaque = false; web.backgroundColor = view.backgroundColor
        web.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(web)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), web.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        if let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") { web.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent()) }
        tv.onReady = { [weak self] in self?.publish() }; tv.start()
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in self?.publish() }
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        MPRemoteCommandCenter.shared().playCommand.addTarget { [weak self] _ in self?.player?.play(); return .success }
        MPRemoteCommandCenter.shared().pauseCommand.addTarget { [weak self] _ in self?.player?.pause(); return .success }
        NotificationCenter.default.addObserver(self, selector: #selector(interruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
    }
    @objc private func interruption(_ note: Notification) {
        guard let type = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              type == AVAudioSession.InterruptionType.began.rawValue else { return }
        player?.pause(); publish()
    }
    private func json(_ object: Any) -> String {
        guard JSONSerialization.isValidJSONObject(object), let data = try? JSONSerialization.data(withJSONObject: object), let s = String(data: data, encoding: .utf8) else { return "{}" }
        return s
    }
    private func publish() {
        guard web != nil else { return }
        let status: [String: Any] = ["number": playingNumber, "playing": player?.isPlaying ?? false, "ready": player != nil,
            "position": player?.currentTime ?? 0, "duration": player?.duration ?? 0, "error": audioError,
            "busy": false, "importStatus": audioMessage, "targetTv": AVAudioSession.sharedInstance().currentRoute.outputs.contains { $0.portType == .airPlay }]
        let cache: [String: Any] = ["catalog": catalog, "cues": cues, "status": status, "address": tv.address()]
        web.evaluateJavaScript("window.SionsIOSReceive && window.SionsIOSReceive(\(json(cache)))", completionHandler: nil)
        if let player = player, player.isPlaying {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = [MPMediaItemPropertyTitle: catalog[playingNumber]?["title"] ?? "Sions Sånger",
                MPMediaItemPropertyPlaybackDuration: player.duration, MPNowPlayingInfoPropertyElapsedPlaybackTime: player.currentTime,
                MPNowPlayingInfoPropertyPlaybackRate: 1.0]
        }
    }
    private func persist() {
        UserDefaults.standard.set(catalog, forKey: "sions-audio-catalog")
        UserDefaults.standard.set(cues, forKey: "sions-audio-cues"); publish()
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
              let body = message.body as? [String: Any], let method = body["method"] as? String else { return }
        let args = body["args"] as? [Any] ?? []
        func text(_ n: Int) -> String { n < args.count ? String(describing: args[n]) : "" }
        func number(_ n: Int) -> Double { n < args.count ? (args[n] as? NSNumber)?.doubleValue ?? 0 : 0 }
        switch method {
        case "ready": publish()
        case "importJSON": chooseFiles(json: true)
        case "audioImport": importNumber = nil; chooseFiles(json: false)
        case "audioImportFor": importNumber = text(0); chooseFiles(json: false)
        case "audioPlay": play(text(0))
        case "audioPause": player?.pause(); publish()
        case "audioSeek": if playingNumber == text(0), let p = player { p.currentTime = min(p.duration, max(0, number(1))); publish() }
        case "audioAssign":
            if let track = catalog[text(1)] { catalog[text(0)] = track; cues[text(0)] = nil; persist() }
        case "audioCue":
            let time = number(2)
            if playingNumber == text(0), time.isFinite, time >= 0, let p = player, time <= p.duration {
                cues[text(0), default: [:]][text(1)] = time; persist()
            }
        case "audioClearCues": cues[text(0)] = nil; persist()
        case "tvUpdate": if let data = text(0).data(using: .utf8), (try? JSONSerialization.jsonObject(with: data)) is [String: Any] { tv.update(data) }
        case "tvCopy": UIPasteboard.general.string = text(0)
        case "tvKeepAwake": UIApplication.shared.isIdleTimerDisabled = (args.first as? Bool) ?? false
        case "tvFullscreen": UIApplication.shared.isIdleTimerDisabled = (args.first as? Bool) ?? false
        case "tvStop": player?.pause(); tv.stopDisplay(); UIApplication.shared.isIdleTimerDisabled = false; publish()
        case "tvConnect", "audioTargetTv": showAirPlay()
        case "saveJson": shareJSON(text(0))
        default: break
        }
    }
    private func play(_ number: String) {
        audioError = ""
        do {
            if number != playingNumber || player == nil {
                guard let file = catalog[number]?["file"], file == (file as NSString).lastPathComponent else { return }
                player = try AVAudioPlayer(contentsOf: audioDirectory.appendingPathComponent(file))
                player?.delegate = self; playingNumber = number
            }
            try AVAudioSession.sharedInstance().setActive(true)
            player?.prepareToPlay(); player?.play()
        } catch { player = nil; playingNumber = ""; audioError = "Ljudet kunde inte spelas: " + error.localizedDescription }
        publish()
    }
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) { publish() }
    private func chooseFiles(json: Bool) {
        guard presentedViewController == nil else { return }
        importingJSON = json
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: json ? [.json] : [.mp3, .mpeg4Audio, .wav, .aiff, .audio], asCopy: true)
        picker.allowsMultipleSelection = importNumber == nil || json
        picker.delegate = self; present(picker, animated: true)
    }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        if importingJSON {
            do {
                let files = try urls.map { url -> [String: String] in
                    let scope = url.startAccessingSecurityScopedResource(); defer { if scope { url.stopAccessingSecurityScopedResource() } }
                    return ["name": url.lastPathComponent, "text": try String(contentsOf: url, encoding: .utf8)]
                }
                web.evaluateJavaScript("window.SionsImportTexts(\(json(files)))", completionHandler: nil)
            } catch { alert("Kunde inte läsa JSON-filen. " + error.localizedDescription) }
            return
        }
        let assigned = importNumber; importNumber = nil
        var added = 0, rejected: [String] = []
        for url in urls {
            let scope = url.startAccessingSecurityScopedResource(); defer { if scope { url.stopAccessingSecurityScopedResource() } }
            do {
                // Validate codec support before altering the catalog.
                _ = try AVAudioPlayer(contentsOf: url)
                let filename = url.deletingPathExtension().lastPathComponent
                let match = filename.range(of: #"(?:^|[^0-9])([0-9]{1,3})(?:[^0-9]|$)"#, options: .regularExpression)
                let digits = match.map { String(filename[$0]).filter(\.isNumber) } ?? ""
                let key = assigned ?? (Int(digits).map(String.init) ?? "audio-" + UUID().uuidString)
                let file = UUID().uuidString + "." + url.pathExtension.lowercased()
                try FileManager.default.copyItem(at: url, to: audioDirectory.appendingPathComponent(file))
                catalog[key] = ["file": file, "title": filename]
                cues[key] = nil; added += 1
            } catch { rejected.append(url.lastPathComponent) }
        }
        audioError = ""; audioMessage = "\(added) ljud importerade."
        if !rejected.isEmpty { audioMessage += " Kunde inte läsa: " + rejected.joined(separator: ", ") }
        persist()
    }
    private func shareJSON(_ text: String) {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Sions_Sanger_Bibliotek.json")
        do {
            try text.write(to: url, atomically: true, encoding: .utf8)
            let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = view
            share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            present(share, animated: true)
        } catch { alert("Kunde inte exportera biblioteket.") }
    }
    private func showAirPlay() {
        let sheet = UIViewController(); sheet.preferredContentSize = CGSize(width: 320, height: 180)
        sheet.view.backgroundColor = .systemBackground
        let label = UILabel(frame: CGRect(x: 20, y: 15, width: 280, height: 55))
        label.text = "Tryck på AirPlay-symbolen för att välja ljudenhet. Bildspegling startas i Kontrollcenter."; label.font = .systemFont(ofSize: 14); label.numberOfLines = 3
        let picker = AVRoutePickerView(frame: CGRect(x: 115, y: 80, width: 90, height: 65)); picker.activeTintColor = .systemOrange
        sheet.view.addSubview(label); sheet.view.addSubview(picker)
        sheet.modalPresentationStyle = .popover; sheet.popoverPresentationController?.sourceView = view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        present(sheet, animated: true)
    }
    private func alert(_ message: String, completion: (() -> Void)? = nil) {
        let box = UIAlertController(title: "Sions Sånger", message: message, preferredStyle: .alert)
        box.addAction(UIAlertAction(title: "OK", style: .default) { _ in completion?() }); present(box, animated: true)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { publish() }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) { alert(message, completion: completionHandler) }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let box = UIAlertController(title: "Sions Sånger", message: message, preferredStyle: .alert)
        box.addAction(UIAlertAction(title: "Avbryt", style: .cancel) { _ in completionHandler(false) })
        box.addAction(UIAlertAction(title: "Fortsätt", style: .default) { _ in completionHandler(true) }); present(box, animated: true)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, url.isFileURL { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }
}
