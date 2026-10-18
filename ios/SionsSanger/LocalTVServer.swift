import Foundation
import Network
import Darwin

// Local display-only endpoint. The random session code is required on every request.
final class LocalTVServer {
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "se.sionssanger.tv.http")
    private var state = Data("{}".utf8)
    private let lock = NSLock()
    let code = UUID().uuidString.replacingOccurrences(of: "-", with: "")
    private(set) var port: UInt16 = 0
    var onReady: (() -> Void)?
    func start() {
        do {
            let listener = try NWListener(using: .tcp, on: .any)
            self.listener = listener
            listener.stateUpdateHandler = { [weak self, weak listener] status in
                if case .ready = status, let port = listener?.port {
                    self?.port = port.rawValue
                    DispatchQueue.main.async { self?.onReady?() }
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                connection.start(queue: self?.queue ?? .global())
                self?.receive(connection, buffer: Data())
            }
            listener.start(queue: queue)
        } catch { print("TV server could not start: \(error.localizedDescription)") }
    }
    func update(_ data: Data) { lock.lock(); state = data; lock.unlock() }
    func stopDisplay() { update(Data("{\"blank\":true}".utf8)) }
    func address() -> String {
        guard port > 0, let ip = wifiAddress() else { return "" }
        return "http://\(ip):\(port)/?code=\(code)"
    }
    private func receive(_ connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] data, _, complete, error in
            guard let self = self else { connection.cancel(); return }
            var all = buffer; if let data = data { all.append(data) }
            guard all.count <= 16384 else { connection.cancel(); return }
            if all.range(of: Data("\r\n\r\n".utf8)) == nil {
                if !complete && error == nil { self.receive(connection, buffer: all) } else { connection.cancel() }
                return
            }
            let line = String(decoding: all, as: UTF8.self).components(separatedBy: "\r\n").first ?? ""
            let parts = line.split(separator: " ")
            guard parts.count >= 2, parts[0] == "GET",
                  let url = URLComponents(string: "http://localhost" + parts[1]),
                  url.queryItems?.first(where: { $0.name == "code" })?.value == self.code else {
                self.send(connection, body: Data("Forbidden".utf8), type: "text/plain", status: "403 Forbidden"); return
            }
            if url.path == "/state" {
                self.lock.lock(); let state = self.state; self.lock.unlock()
                self.send(connection, body: state, type: "application/json")
            } else if url.path == "/" {
                guard let file = Bundle.main.url(forResource: "tv-display", withExtension: "html", subdirectory: "Web"),
                      let contents = try? Data(contentsOf: file) else {
                    self.send(connection, body: Data(), type: "text/plain", status: "500 Internal Server Error"); return
                }
                self.send(connection, body: contents, type: "text/html; charset=utf-8")
            } else { self.send(connection, body: Data(), type: "text/plain", status: "404 Not Found") }
        }
    }
    private func send(_ connection: NWConnection, body: Data, type: String, status: String = "200 OK") {
        let header = "HTTP/1.1 \(status)\r\nContent-Type: \(type)\r\nContent-Length: \(body.count)\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
        connection.send(content: Data(header.utf8) + body, completion: .contentProcessed { _ in connection.cancel() })
    }
    private func wifiAddress() -> String? {
        var interfaces: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&interfaces) == 0, let first = interfaces else { return nil }
        defer { freeifaddrs(interfaces) }
        var ptr: UnsafeMutablePointer<ifaddrs>? = first
        while let current = ptr {
            defer { ptr = current.pointee.ifa_next }
            guard let address = current.pointee.ifa_addr else { continue }
            if String(cString: current.pointee.ifa_name) == "en0", address.pointee.sa_family == UInt8(AF_INET) {
                var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                if getnameinfo(address, socklen_t(address.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0 { return String(cString: host) }
            }
        }
        return nil
    }
}
