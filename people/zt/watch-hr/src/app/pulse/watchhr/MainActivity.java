package app.pulse.watchhr;

import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * One screen: reads the wrist heart-rate sensor and sends the latest reading to the onboard
 * server (POST /live/heart-rate) once a second. Change the server with:
 * adb shell am start -n app.pulse.watchhr/.MainActivity --es server http://IP:8000
 */
public class MainActivity extends Activity implements SensorEventListener {
    private static final String DEFAULT_SERVER = "https://pulse-crew-health.onrender.com";
    private static final String[] PERMISSIONS = {
        "android.permission.BODY_SENSORS", "android.permission.health.READ_HEART_RATE"
    };
    /** Stop sending if the sensor has said nothing for this long. */
    private static final long STALE_MS = 60_000;

    private SensorManager sensors;
    private TextView bpmView;
    private TextView statusView;
    private String server;
    private volatile int latestBpm = 0;
    private volatile int latestAccuracy = 0;
    private volatile long latestAt = 0;
    private volatile boolean running = false;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback wifiCallback;
    private volatile String route = "default network";

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        SharedPreferences prefs = getSharedPreferences("watch-hr", MODE_PRIVATE);
        String fromIntent = getIntent().getStringExtra("server");
        if (fromIntent != null && !fromIntent.isEmpty()) prefs.edit().putString("server", fromIntent).apply();
        server = prefs.getString("server", DEFAULT_SERVER);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.BLACK);
        root.setPadding(28, 28, 28, 28);
        bpmView = text(56, Color.WHITE, "--");
        statusView = text(12, Color.GRAY, "Starting…");
        root.addView(bpmView);
        root.addView(text(16, Color.LTGRAY, "bpm"));
        root.addView(statusView);
        setContentView(root);

        useWifi();
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        if (hasPermission()) startReading();
        else requestPermissions(PERMISSIONS, 1);
    }

    /**
     * With the phone connected, Wear OS sends traffic over Bluetooth through the phone, which often
     * can't reach a laptop on the local network. Ask for Wi-Fi and send everything over it.
     */
    private void useWifi() {
        connectivity = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        wifiCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                connectivity.bindProcessToNetwork(network);
                route = "Wi-Fi";
            }

            @Override
            public void onLost(Network network) {
                connectivity.bindProcessToNetwork(null);
                route = "default network";
            }
        };
        NetworkRequest request = new NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build();
        try {
            connectivity.requestNetwork(request, wifiCallback);
        } catch (RuntimeException e) {
            wifiCallback = null;
            route = "default network (Wi-Fi request refused)";
        }
    }

    private TextView text(float sp, int color, String value) {
        TextView view = new TextView(this);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        view.setText(value);
        return view;
    }

    private boolean hasPermission() {
        for (String permission : PERMISSIONS) {
            if (checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) return true;
        }
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        if (hasPermission()) startReading();
        else status("Sensor permission denied. Allow it in Settings → Apps → Pulse HR.");
    }

    private void startReading() {
        Sensor heartRate = sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE);
        if (heartRate == null) {
            status("No heart-rate sensor available to apps on this watch.");
            return;
        }
        sensors.registerListener(this, heartRate, SensorManager.SENSOR_DELAY_NORMAL);
        status("Measuring… keep the watch snug.\n" + server);
        running = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                sendLoop();
            }
        }, "sender").start();
    }

    /** The heart-rate sensor only reports changes, so the last reading is re-sent every second. */
    private void sendLoop() {
        while (running) {
            int bpm = latestBpm;
            boolean fresh = SystemClock.elapsedRealtime() - latestAt < STALE_MS;
            if (bpm > 0 && fresh) {
                try {
                    post(bpm, latestAccuracy);
                    status("Live → " + server + "\nvia " + route);
                } catch (Exception e) {
                    String why = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                    status("Can't reach server via " + route + ": " + why);
                }
            } else if (bpm == 0) {
                status("Waiting for a reading…\n" + server);
            }
            SystemClock.sleep(1000);
        }
    }

    private void post(int bpm, int accuracy) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(server + "/live/heart-rate").openConnection();
        connection.setConnectTimeout(3000);
        connection.setReadTimeout(3000);
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        byte[] body = ("{\"bpm\":" + bpm + ",\"accuracy\":" + accuracy + "}").getBytes(StandardCharsets.UTF_8);
        try (OutputStream out = connection.getOutputStream()) {
            out.write(body);
        }
        int code = connection.getResponseCode();
        connection.disconnect();
        if (code != 200) throw new Exception("HTTP " + code);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        latestAccuracy = event.accuracy;
        boolean noContact = event.accuracy == SensorManager.SENSOR_STATUS_NO_CONTACT;
        latestBpm = noContact ? 0 : Math.round(event.values[0]);
        latestAt = SystemClock.elapsedRealtime();
        bpmView.setText(latestBpm > 0 ? String.valueOf(latestBpm) : "--");
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        latestAccuracy = accuracy;
        if (accuracy == SensorManager.SENSOR_STATUS_NO_CONTACT) latestBpm = 0;
    }

    private void status(final String message) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                statusView.setText(message);
            }
        });
    }

    @Override
    protected void onDestroy() {
        running = false;
        sensors.unregisterListener(this);
        if (wifiCallback != null) {
            connectivity.bindProcessToNetwork(null);
            connectivity.unregisterNetworkCallback(wifiCallback);
        }
        super.onDestroy();
    }
}
