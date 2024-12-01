import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;

public class SimpleServer {
    private static final String MENU_FILE = "menu.txt";
    private static final String TRANSACTION_FILE = "transaksi.txt";

    public static void main(String[] args) throws IOException {
        ServerSocket server = new ServerSocket(8080);
        System.out.println("Server berjalan di port 8080...");

        while (true) {
            Socket client = server.accept();
            BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
            PrintWriter out = new PrintWriter(client.getOutputStream(), true);

            String requestLine = in.readLine();
            if (requestLine == null) continue;

            if (requestLine.startsWith("GET /menu")) {
                List<String> menu = Files.readAllLines(Paths.get(MENU_FILE));
                out.println("HTTP/1.1 200 OK");
                out.println("Content-Type: application/json");
                out.println();
                out.println("[");
                for (String line : menu) {
                    String[] parts = line.split(";");
                    out.println(String.format("{\"name\":\"%s\",\"price\":%s},", parts[0], parts[1]));
                }
                out.println("]");
            } else if (requestLine.startsWith("POST /transact")) {
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null && !line.isEmpty()) {
                    body.append(line);
                }

                String[] parts = body.toString().split(",");
                String name = parts[0].split(":")[1].replaceAll("\"", "");
                int price = Integer.parseInt(parts[1].split(":")[1]);
                int quantity = Integer.parseInt(parts[2].split(":")[1]);
                int total = price * quantity;

                try (BufferedWriter writer = new BufferedWriter(new FileWriter(TRANSACTION_FILE, true))) {
                    writer.write(String.format("%s x%d = Rp%d\n", name, quantity, total));
                }

                out.println("HTTP/1.1 200 OK");
            } else if (requestLine.startsWith("GET /transactions")) {
                out.println("HTTP/1.1 200 OK");
                out.println("Content-Type: text/plain");
                out.println();
                out.println(new String(Files.readAllBytes(Paths.get(TRANSACTION_FILE))));
            } else {
                out.println("HTTP/1.1 404 Not Found");
            }
            client.close();
        }
    }
}
