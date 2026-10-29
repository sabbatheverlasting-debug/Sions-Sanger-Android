package se.sionssanger.app;

import android.content.Context;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Enumeration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Lokal, läsbar TV-visning. Sångtexten lämnar aldrig hemmets Wi-Fi.
 * Endast Android-appen kan ändra aktuell vers.
 */
public final class SionsTvServer {
    private final Context context;
    private volatile SionsScore scores;
    public void setScores(SionsScore value) { this.scores = value; }
    private final String accessCode;
    private final ExecutorService clients = Executors.newFixedThreadPool(3);
    private volatile String state = "{\"title\":\"Sions Sånger\",\"lines\":[\"Välj en sång på mobilen\"],\"section\":\"\",\"total\":0,\"index\":0,\"theme\":\"navy\",\"blank\":false}";
    private volatile boolean running;
    private ServerSocket server;
    private Thread acceptThread;
    private static final int PORT = 8765;

    public SionsTvServer(Context context) {
        this.context = context.getApplicationContext();
        accessCode = Integer.toString(100000 + new SecureRandom().nextInt(900000));
    }
    public String getCode() { return accessCode; }
    public String getUrl() {
        String ip = findLocalAddress();
        return ip.isEmpty() ? "" : "http://" + ip + ":" + PORT + "/tv?code=" + accessCode;
    }
    public void update(String data) {
        if (data == null || data.length() > 65536) return;
        try {
            org.json.JSONObject obj = new org.json.JSONObject(data);
            if (!obj.has("lines") || !obj.has("title")) return;
            state = obj.toString();
        } catch (org.json.JSONException ignored) { }
    }
    public void start() {
        if (running) return;
        try {
            server = new ServerSocket();
            server.setReuseAddress(true);
            server.bind(new InetSocketAddress(PORT));
            running = true;
            acceptThread = new Thread(() -> {
                while (running) {
                    try {
                        final Socket client = server.accept();
                        clients.execute(() -> serve(client));
                    } catch (IOException | java.util.concurrent.RejectedExecutionException ex) {
                        if (running) android.util.Log.w("SionsTvServer", "TV-klient: " + ex.getMessage());
                    }
                }
            }, "sions-tv-accept");
            acceptThread.setDaemon(true);
            acceptThread.start();
        } catch (IOException ex) {
            running = false;
            android.util.Log.e("SionsTvServer", "Kunde inte starta lokal TV-server", ex);
        }
    }
    public void stop() {
        running = false;
        try { if (server != null) server.close(); } catch (IOException ignored) { }
        clients.shutdownNow();
    }
    private void serve(Socket client) {
        try (Socket socket = client) {
            socket.setSoTimeout(4000);
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String first = reader.readLine();
            if (first == null) return;
            String[] pieces = first.split(" ");
            if (pieces.length < 2 || !"GET".equals(pieces[0])) {
                send(socket, 405, "text/plain; charset=utf-8", "Endast GET".getBytes(StandardCharsets.UTF_8)); return;
            }
            String requestPath = pieces[1];
            while (true) {
                String header = reader.readLine();
                if (header == null || header.isEmpty()) break;
            }
            URI uri = new URI("http://localhost" + requestPath);
            String code = "";
            String q = uri.getRawQuery();
            if (q != null) for (String item : q.split("&")) {
                String[] pair = item.split("=", 2);
                if (pair.length == 2 && "code".equals(pair[0]))
                    code = URLDecoder.decode(pair[1], "UTF-8");
            }
            if (!accessCode.equals(code)) {
                send(socket, 403, "text/plain; charset=utf-8", "Fel anslutningskod".getBytes(StandardCharsets.UTF_8)); return;
            }
            if ("/tv".equals(uri.getPath())) {
                try (InputStream stream = context.getAssets().open("tv-display.html")) {
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] block = new byte[4096]; int n;
                    while ((n = stream.read(block)) != -1) buffer.write(block, 0, n);
                    send(socket, 200, "text/html; charset=utf-8", buffer.toByteArray());
                }
            } else if ("/state".equals(uri.getPath())) {
                send(socket, 200, "application/json; charset=utf-8", state.getBytes(StandardCharsets.UTF_8));
            } else if ("/score".equals(uri.getPath())) {
                String number = ""; int page = -1;
                if(q!=null)for(String pair:q.split("&")) {
                    String[] parts=pair.split("=",2);
                    if(parts.length!=2)continue;
                    if("number".equals(parts[0]))number=URLDecoder.decode(parts[1],"UTF-8");
                    if("page".equals(parts[0]))try{page=Integer.parseInt(parts[1]);}catch(NumberFormatException ignored){}
                }
                byte[] jpeg=scores==null?null:scores.pageBytes(number,page,2200);
                if(jpeg==null)send(socket,404,"text/plain; charset=utf-8","Notsidan saknas".getBytes(StandardCharsets.UTF_8));
                else send(socket,200,"image/jpeg",jpeg);
            } else {
                send(socket, 404, "text/plain; charset=utf-8", "Sidan finns inte".getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception ex) {
            android.util.Log.d("SionsTvServer", "Avbruten TV-klient: " + ex.getMessage());
        }
    }
    private static void send(Socket socket, int code, String type, byte[] body) throws IOException {
        String status = code == 200 ? "OK" : code == 403 ? "Forbidden" : code == 405 ? "Method Not Allowed" : "Not Found";
        String head = "HTTP/1.1 " + code + " " + status + "\r\n"
            + "Content-Type: " + type + "\r\n"
            + "Content-Length: " + body.length + "\r\n"
            + "Cache-Control: no-store\r\n"
            + "X-Content-Type-Options: nosniff\r\n"
            + "Access-Control-Allow-Origin: null\r\n"
            + "Connection: close\r\n\r\n";
        OutputStream out = socket.getOutputStream();
        out.write(head.getBytes(StandardCharsets.US_ASCII));
        out.write(body);
        out.flush();
    }
    private static String findLocalAddress() {
        try {
            String other = "";
            Enumeration<NetworkInterface> networks = NetworkInterface.getNetworkInterfaces();
            while (networks.hasMoreElements()) {
                NetworkInterface net = networks.nextElement();
                if (!net.isUp() || net.isLoopback() || net.isVirtual()) continue;
                Enumeration<InetAddress> addresses = net.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (!(addr instanceof Inet4Address) || !addr.isSiteLocalAddress()) continue;
                    if (net.getName().startsWith("wlan")) return addr.getHostAddress();
                    if (other.isEmpty()) other = addr.getHostAddress();
                }
            }
            return other;
        } catch (Exception ex) { return ""; }
    }
}
